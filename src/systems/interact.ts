import {
  POND, STALL, BUSK_SPOT, HOUSE, HOUSE_DOOR, R_HEARTH, R_BASIN, R_BED, R_REST, R_DOOR, FLOWER_BEDS,
  FISH_SPOTS, MARKET_STALLS, COTTAGES, WELL, OUTHOUSE, OLD_BUSK_SIGN, type Rect, type FishSpot,
} from "../world/zones";
import { REPAIR_COST, FEED_GAIN_ITEM, PLOT_EXPANSION_PRICES, NPC_REACH } from "../config";
import { nearPond, nearRect } from "../world/collision";
import { saveEconomy, type Economy } from "./economy";
import { saveFarm, repairsLeft, type FarmState, type FarmPart } from "./renovation";
import { startCast, type FishingState } from "./fishing";
import { startPick, type ForagingState, type Bush } from "./foraging";
import { startWork, type FarmWork, type PlotCell } from "./farming";
import { startBusk, type BuskingState } from "./busking";
import { startCook, cookableRecipes, type CookingState } from "./cooking";
import { saveGarden, type Garden } from "./gardening";
import { countItem, removeItem, ITEM_NAMES } from "./inventory";
import { skillValue, gainSkill, type Skills } from "./skills";
import {
  drink, wash, useOuthouse, rest, moodPerfMult, type NeedsState,
} from "./needs";
import { cropBySeed } from "../data/crops";
import type { Season } from "./calendar";
import type { Cow, Hen } from "../entities/animals";
import type { Npc } from "../entities/npc";
import { glowEllipse, glowRect } from "../art/highlight";
import type { Player } from "../entities/player";

/**
 * Registry of clickable world objects (UO-style). Each knows how to be
 * hit-tested by a pointer, whether the player is close enough to use it,
 * what actions it offers (context menu), and how to draw its hover glow.
 * New clickable things (bushes, shop counters, NPCs) get added here.
 */

export interface InteractCtx {
  economy: Economy;
  fishing: FishingState;
  foraging: ForagingState;
  farmwork: FarmWork;
  busking: BuskingState;
  cooking: CookingState;
  skills: Skills;
  farm: FarmState;
  garden: Garden;
  needs: NeedsState;
  player: Player;
  toast: (s: string) => void;
  openShop: () => void;
  enterHouse: () => void;
  leaveHouse: () => void;
  sleep: () => void;                             // "Sleep until morning" (main owns the fade + time skip)
  nap: () => void;                               // "Nap an hour"
  skillPopup: (id: string, amount: number) => void;
  memory: (key: string, text: string) => void;   // once-only Memory Book events
  expandFarm: () => void;                        // materialize a just-bought plot tier
}

/** True while any timed activity is running (they are mutually exclusive). */
function busy(c: InteractCtx): boolean {
  return c.fishing.casting || c.foraging.picking || c.farmwork.working || c.busking.playing || c.cooking.cooking;
}

export interface MenuAction { id: string; label: string; run: (c: InteractCtx) => void; }

export type InteractScene = "world" | "interior";

export interface Interactable {
  id: string;
  name: string;
  anchor: [number, number];                 // where the player walks to use it
  defaultActionId: string;                  // left-click / action-button action
  hit: (wx: number, wy: number) => boolean; // pointer is over the object
  inReach: (px: number, py: number) => boolean;
  actions: (c: InteractCtx) => MenuAction[];// available actions right now
  drawHover: (g: CanvasRenderingContext2D, time: number) => void;
  scene?: InteractScene;                    // where it lives (default: world)
}

const pond: Interactable = {
  id: "pond",
  name: "Pond",
  anchor: [POND.cx, POND.cy],
  defaultActionId: "fish",
  hit: (wx, wy) => {
    const dx = (wx - POND.cx) / POND.rx, dy = (wy - POND.cy) / POND.ry;
    return dx * dx + dy * dy <= 1;
  },
  inReach: (px, py) => nearPond(px, py),
  actions: () => [
    {
      id: "fish", label: "Fish",
      run: (c) => {
        if (busy(c)) return;
        // fishing is a hard tool gate (unlike bare-hand foraging) — no rod, no cast
        if (countItem(c.economy.inv, "rod") === 0) { c.toast("You need a fishing rod — the stall sells one."); return; }
        startCast(c.fishing, skillValue(c.skills, "fishing"), "pond");
        c.player.fishing = true;
      },
    },
    { id: "look", label: "Look", run: (c) => c.toast("A calm pond. Fish glint below the surface.") },
  ],
  drawHover: (g, t) => glowEllipse(g, POND.cx, POND.cy, POND.rx + 4, POND.ry + 4, t),
};

/** River/lake fishing spots — like the pond, but the cast carries its water
 *  body so resolveCatch rolls the river/lake fish tables (data/fish.ts). */
function makeFishSpot(s: FishSpot): Interactable {
  const label = s.loc === "river" ? "the river" : "the lake";
  return {
    id: `fish-${s.id}`,
    name: s.loc === "river" ? "River" : "Lake",
    anchor: [s.ax, s.ay],
    defaultActionId: "fish",
    hit: (wx, wy) => Math.hypot(wx - s.wx, wy - s.wy) < 30,
    inReach: (px, py) => Math.hypot(px - s.ax, py - s.ay) < 48,
    actions: () => [
      {
        id: "fish", label: "Fish",
        run: (c) => {
          if (busy(c)) return;
          if (countItem(c.economy.inv, "rod") === 0) { c.toast("You need a fishing rod — the market sells one."); return; }
          startCast(c.fishing, skillValue(c.skills, "fishing"), s.loc);
          c.player.fishing = true;
        },
      },
      { id: "look", label: "Look", run: (c) => c.toast(`A good spot to cast into ${label}.`) },
    ],
    drawHover: (g, t) => glowEllipse(g, s.wx, s.wy, 16, 9, t),
  };
}
const fishSpots: Interactable[] = FISH_SPOTS.map(makeFishSpot);

/** A decorative world prop you can only Look at (market stalls, cottages, the
 *  well, the old busk sign) — no trading/entry yet, those are later blocks. */
function lookProp(id: string, name: string, box: Rect, anchor: [number, number], reach: Rect, look: string): Interactable {
  return {
    id, name, anchor, defaultActionId: "look",
    hit: (wx, wy) => wx >= box.x && wx <= box.x + box.w && wy >= box.y && wy <= box.y + box.h,
    inReach: (px, py) => nearRect(px, py, reach, 30),
    actions: () => [{ id: "look", label: "Look", run: (c) => c.toast(look) }],
    drawHover: (g, t) => glowRect(g, box.x - 2, box.y - 2, box.w + 4, box.h + 4, t),
  };
}

const STALL_LOOK: Record<string, string> = {
  fish: "A fish-buyer's stall. Nobody's tending it yet.",
  produce: "A produce stall, heaped with vegetables. Unattended for now.",
  goods: "A general-goods stall — crates and oddments. No trader here yet.",
  empty: "An empty stall, awning faded. Available, if anyone wanted it.",
};
const marketStalls: Interactable[] = MARKET_STALLS.map((s, i) =>
  lookProp(
    `mstall-${i}`, "Market stall",
    { x: s.x - 6, y: s.y - s.h * 0.4, w: s.w + 12, h: s.h * 1.45 },
    [s.x + s.w / 2, s.y + s.h + 22], s,
    STALL_LOOK[s.sign]!,
  ));
const cottages: Interactable[] = COTTAGES.map((c, i) =>
  lookProp(
    `cottage-${i}`, "Cottage",
    { x: c.x - 8, y: c.y - c.h * 0.3, w: c.w + 16, h: c.h * 1.3 },
    [c.x + c.w / 2, c.y + c.h + 18], c,
    "A snug little cottage. Its door is shut — someone may live here one day.",
  ));
const wellProp: Interactable = {
  id: "well", name: "Well",
  anchor: [WELL.cx, WELL.cy + WELL.r + 26],
  defaultActionId: "drink",
  hit: (wx, wy) => Math.hypot(wx - WELL.cx, (wy - WELL.cy) * 1.3) < WELL.r * 2,
  inReach: (px, py) => Math.hypot(px - WELL.cx, py - WELL.cy) < WELL.r + 40,
  actions: () => [
    { id: "drink", label: "Drink", run: (c) => { if (busy(c)) return; drink(c.needs); c.toast("Cold, clean water from the well. 💧"); } },
    { id: "look", label: "Look", run: (c) => c.toast("A stone well at the square's heart. The bucket still draws cold water.") },
  ],
  drawHover: (g, t) => glowEllipse(g, WELL.cx, WELL.cy, WELL.r + 6, WELL.r * 0.8 + 6, t),
};
const buskSign: Interactable = lookProp(
  "busk-sign", "Signpost",
  { x: OLD_BUSK_SIGN[0] - 14, y: OLD_BUSK_SIGN[1] - 28, w: 28, h: 32 },
  [OLD_BUSK_SIGN[0], OLD_BUSK_SIGN[1] + 20],
  { x: OLD_BUSK_SIGN[0] - 10, y: OLD_BUSK_SIGN[1] - 10, w: 20, h: 20 },
  "'Buskers play at the market now.' The square is the place to earn coin with a tune.",
);

// The drawn stall is bigger than the STALL logic rect: the awning rises above
// it (to y - 0.4h) and the legs drop below it (to ~y + 1.05h). Use those true
// visible bounds so hover + highlight cover the whole structure, not just the
// counter. (drawStall in art/buildings.ts is the source of these offsets.)
const stallBox = {
  x: STALL.x - 6,
  y: STALL.y - STALL.h * 0.4,
  w: STALL.w + 12,
  h: STALL.h * 1.45,
};

const stall: Interactable = {
  id: "stall",
  name: "Market stall",
  anchor: [STALL.x + STALL.w / 2, STALL.y + STALL.h + 22],
  defaultActionId: "trade",
  hit: (wx, wy) =>
    wx >= stallBox.x && wx <= stallBox.x + stallBox.w &&
    wy >= stallBox.y && wy <= stallBox.y + stallBox.h,
  inReach: (px, py) => nearRect(px, py, STALL),
  actions: () => [
    { id: "trade", label: "Trade", run: (c) => c.openShop() },
    { id: "look", label: "Look", run: (c) => c.toast("A weathered market stall. Buy tools, sell goods.") },
  ],
  drawHover: (g, t) => glowRect(g, stallBox.x - 2, stallBox.y - 2, stallBox.w + 4, stallBox.h + 4, t),
};

const buskSpot: Interactable = {
  id: "busk",
  name: "Busking spot",
  anchor: [BUSK_SPOT[0], BUSK_SPOT[1] + 6],
  defaultActionId: "busk",
  hit: (wx, wy) => {
    const dx = (wx - BUSK_SPOT[0]) / 24, dy = (wy - BUSK_SPOT[1]) / 17;
    return dx * dx + dy * dy <= 1;
  },
  inReach: (px, py) => Math.hypot(px - BUSK_SPOT[0], py - BUSK_SPOT[1]) < 42,
  actions: () => [
    { id: "busk", label: "Busk", run: (c) => { if (!busy(c)) startBusk(c.busking); } },
    { id: "look", label: "Look", run: (c) => c.toast("A cobbled corner — a good spot to play for passersby.") },
  ],
  drawHover: (g, t) => glowEllipse(g, BUSK_SPOT[0], BUSK_SPOT[1], 26, 19, t),
};

// The farmhouse is the renovation hub (Step 8): walk up to it and each still-
// broken part offers a paid repair that flips its rundown flag and swaps the
// painter output. Kept on the house (not per-structure) so the whole
// tillable field stays clickable — a fence hitbox would overlap the plots.
const REPAIRS: Array<{ part: FarmPart; label: string; done: string }> = [
  { part: "roof",   label: "Patch the roof",     done: "The roof is whole again." },
  { part: "window", label: "Reglaze the window", done: "Clean glass lets the light back in." },
  { part: "barn",   label: "Mend the barn",      done: "The barn stands square again." },
  { part: "fence",  label: "Mend the fence",     done: "The field fence is sound again." },
];

function doRepair(c: InteractCtx, part: FarmPart) {
  if (c.farm[part]) return;
  const cost = REPAIR_COST[part];
  if (c.economy.coins < cost) { c.toast(`Not enough coins — that repair costs ${cost}.`); return; }
  c.economy.coins -= cost;
  saveEconomy(c.economy);
  c.farm[part] = true;
  saveFarm(c.farm);
  c.toast(REPAIRS.find((r) => r.part === part)!.done);
  // every repair is Building practice (base-skill-set block)
  const gained = gainSkill(c.skills, "building", moodPerfMult(c.needs));
  if (gained > 0) c.skillPopup("building", gained);
  c.memory("first_repair", "The farm is a little less broken — first repair.");
  if (repairsLeft(c.farm) === 0)
    c.memory("farm_whole", "Every board mended — the farm stands whole again.");
}

// The drawn house rises above HOUSE.y (the roof) — cover that in the hitbox.
const houseBox = { x: HOUSE.x - 10, y: HOUSE.y - HOUSE.h * 0.3, w: HOUSE.w + 20, h: HOUSE.h * 1.3 };

const house: Interactable = {
  id: "house",
  name: "Farmhouse",
  anchor: [HOUSE.x + HOUSE.w / 2, HOUSE.y + HOUSE.h + 20],
  defaultActionId: "repair-next",   // no action owns this id -> resolves to the first repair (or Look)
  hit: (wx, wy) =>
    wx >= houseBox.x && wx <= houseBox.x + houseBox.w &&
    wy >= houseBox.y && wy <= houseBox.y + houseBox.h,
  inReach: (px, py) => nearRect(px, py, HOUSE),
  actions: (c) => {
    const list: MenuAction[] = [];
    for (const r of REPAIRS)
      if (!c.farm[r.part])
        list.push({
          id: `repair-${r.part}`,
          label: `${r.label} (${REPAIR_COST[r.part]})`,
          run: (c) => doRepair(c, r.part),
        });
    // farm plot expansion (money-gated block): the next tier, while one exists
    const nextTier = c.farm.plotTiers;   // 0-based index of the tier on offer
    const price = PLOT_EXPANSION_PRICES[nextTier];
    if (price !== undefined)
      list.push({
        id: "expand-plot",
        label: `Expand the field (${price})`,
        run: (c) => {
          if (c.economy.coins < price) { c.toast(`Not enough coins — the land costs ${price}.`); return; }
          c.economy.coins -= price;
          saveEconomy(c.economy);
          c.farm.plotTiers += 1;
          saveFarm(c.farm);
          c.expandFarm();   // main materializes the new strip of tillable cells
          c.toast("The fence leaps outward — more field to work!");
          c.memory("first_expansion", "The farm grew beyond its first fence.");
        },
      });
    list.push({
      id: "look", label: "Look",
      run: (c) => {
        const left = REPAIRS.filter((r) => !c.farm[r.part]).length;
        c.toast(left === 0
          ? "Your farmhouse — mended, warm, and wholly yours."
          : `Your farmhouse. ${left} repair${left === 1 ? "" : "s"} left before it's whole.`);
      },
    });
    return list;
  },
  drawHover: (g, t) => glowRect(g, houseBox.x - 2, houseBox.y - 2, houseBox.w + 4, houseBox.h + 4, t),
};

// The front door: a small hotspot inside the house's larger hit box —
// registered BEFORE the house so its area wins the hit test.
const houseDoor: Interactable = {
  id: "house-door",
  name: "Front door",
  anchor: [HOUSE_DOOR.x + HOUSE_DOOR.w / 2, HOUSE.y + HOUSE.h + 18],
  defaultActionId: "enter",
  hit: (wx, wy) =>
    wx >= HOUSE_DOOR.x && wx <= HOUSE_DOOR.x + HOUSE_DOOR.w &&
    wy >= HOUSE_DOOR.y && wy <= HOUSE_DOOR.y + HOUSE_DOOR.h,
  // reach only the strip in front of the door — elsewhere around the house
  // the repair hub keeps its prompt (clicking the door still works anywhere)
  inReach: (px, py) =>
    nearRect(px, py, { x: HOUSE_DOOR.x, y: HOUSE.y + HOUSE.h - 8, w: HOUSE_DOOR.w, h: 16 }, 30),
  actions: () => [
    { id: "enter", label: "Go inside", run: (c) => { if (!busy(c)) c.enterHouse(); } },
    { id: "look", label: "Look", run: (c) => c.toast("The front door. It still opens, at least.") },
  ],
  drawHover: (g, t) => glowRect(g, HOUSE_DOOR.x - 2, HOUSE_DOOR.y - 2, HOUSE_DOOR.w + 4, HOUSE_DOOR.h + 4, t),
};

// ---- the interior's spots (tier-1: present and honest about their state) ----
// the hearth cooks (minimal Cooking, base-skill-set block): one action per
// recipe whose ingredients are in the bag and whose skill floor is met
const hearthSpot: Interactable = {
  id: "hearth", name: "Hearth", scene: "interior",
  anchor: [R_HEARTH.x + R_HEARTH.w / 2, R_HEARTH.y + R_HEARTH.h + 26],
  defaultActionId: "cook",
  hit: (wx, wy) => wx >= R_HEARTH.x - 4 && wx <= R_HEARTH.x + R_HEARTH.w + 4 &&
    wy >= R_HEARTH.y - 12 && wy <= R_HEARTH.y + R_HEARTH.h + 4,
  inReach: (px, py) => nearRect(px, py, R_HEARTH, 34),
  actions: (c) => {
    const list: MenuAction[] = [];
    const cookable = cookableRecipes(c.economy.inv, skillValue(c.skills, "cooking"));
    cookable.forEach((r, i) => {
      list.push({
        id: i === 0 ? "cook" : `cook-${r.id}`,
        label: `Cook ${r.name.toLowerCase()}`,
        run: (c) => { if (!busy(c)) startCook(c.cooking, r.id); },
      });
    });
    list.push({
      id: "look", label: "Look",
      run: (c) => c.toast(cookable.length
        ? "The old pot's ready — something in the bag could become a meal."
        : "A soot-blackened hearth and one rusty pot. It could cook a meal — with the right ingredients."),
    });
    return list;
  },
  drawHover: (g, t) => glowRect(g, R_HEARTH.x - 3, R_HEARTH.y - 3, R_HEARTH.w + 6, R_HEARTH.h + 6, t),
};
// the basin (Needs engine): wash (hygiene) + drink from its bucket (thirst)
const basinSpot: Interactable = {
  id: "basin", name: "Wash basin", scene: "interior",
  anchor: [R_BASIN.x + R_BASIN.w / 2, R_BASIN.y + R_BASIN.h + 20],
  defaultActionId: "wash",
  hit: (wx, wy) => wx >= R_BASIN.x - 4 && wx <= R_BASIN.x + R_BASIN.w + 4 && wy >= R_BASIN.y - 12 && wy <= R_BASIN.y + R_BASIN.h + 4,
  inReach: (px, py) => nearRect(px, py, R_BASIN, 34),
  actions: () => [
    { id: "wash", label: "Wash", run: (c) => { if (busy(c)) return; wash(c.needs); c.toast("You scrub up in cold basin water. Better. 🫧"); } },
    { id: "drink", label: "Drink from the bucket", run: (c) => { if (busy(c)) return; drink(c.needs); c.toast("You drink from the well-bucket. 💧"); } },
    { id: "look", label: "Look", run: (c) => c.toast("A cracked clay basin on a wobbly stand. Water comes from the well, bucket by bucket.") },
  ],
  drawHover: (g, t) => glowRect(g, R_BASIN.x - 3, R_BASIN.y - 3, R_BASIN.w + 6, R_BASIN.h + 6, t),
};
// the bed (Needs engine): sleep until morning / nap — main runs the fade + the
// REAL advanceMinute loop so the clock never teleports (daily hooks all fire)
const bedSpot: Interactable = {
  id: "bed", name: "Bed", scene: "interior",
  anchor: [R_BED.x + R_BED.w / 2, R_BED.y + R_BED.h + 20],
  defaultActionId: "sleep",
  hit: (wx, wy) => wx >= R_BED.x - 4 && wx <= R_BED.x + R_BED.w + 4 && wy >= R_BED.y - 12 && wy <= R_BED.y + R_BED.h + 4,
  inReach: (px, py) => nearRect(px, py, R_BED, 34),
  actions: () => [
    { id: "sleep", label: "Sleep until morning", run: (c) => { if (!busy(c)) c.sleep(); } },
    { id: "nap", label: "Nap an hour", run: (c) => { if (!busy(c)) c.nap(); } },
    { id: "look", label: "Look", run: (c) => c.toast("A straw mattress, a creaky frame, one threadbare blanket. No pillow.") },
  ],
  drawHover: (g, t) => glowRect(g, R_BED.x - 3, R_BED.y - 3, R_BED.w + 6, R_BED.h + 6, t),
};
// tight reach: the rest corner sits beside the door mat and must not swallow it
const restSpot: Interactable = {
  id: "rest", name: "Rest corner", scene: "interior",
  anchor: [R_REST.x + R_REST.w / 2, R_REST.y + R_REST.h + 20],
  defaultActionId: "sit",
  hit: (wx, wy) => wx >= R_REST.x - 4 && wx <= R_REST.x + R_REST.w + 4 && wy >= R_REST.y - 12 && wy <= R_REST.y + R_REST.h + 4,
  inReach: (px, py) => nearRect(px, py, R_REST, 18),
  actions: () => [
    { id: "sit", label: "Sit and rest", run: (c) => { if (busy(c)) return; rest(c.needs); c.toast("You sink into the wobbly chair a while. A small comfort."); } },
    { id: "look", label: "Look", run: (c) => c.toast("A chair with one short leg and a crate standing in for a table.") },
  ],
  drawHover: (g, t) => glowRect(g, R_REST.x - 3, R_REST.y - 3, R_REST.w + 6, R_REST.h + 6, t),
};

// the outhouse behind the farmhouse (Needs engine): the bathroom need's spot
const outhouseSpot: Interactable = {
  id: "outhouse", name: "Outhouse",
  anchor: [OUTHOUSE.x + OUTHOUSE.w / 2, OUTHOUSE.y + OUTHOUSE.h + 18],
  defaultActionId: "use",
  hit: (wx, wy) =>
    wx >= OUTHOUSE.x - 4 && wx <= OUTHOUSE.x + OUTHOUSE.w + 4 &&
    wy >= OUTHOUSE.y - OUTHOUSE.h * 0.2 && wy <= OUTHOUSE.y + OUTHOUSE.h + 4,
  inReach: (px, py) => nearRect(px, py, OUTHOUSE, 30),
  actions: () => [
    { id: "use", label: "Use the outhouse", run: (c) => { if (busy(c)) return; useOuthouse(c.needs); c.toast("Ah. Much better."); } },
    { id: "look", label: "Look", run: (c) => c.toast("A rickety wooden privy, crescent moon on the door. It does the job.") },
  ],
  drawHover: (g, t) => glowRect(g, OUTHOUSE.x - 3, OUTHOUSE.y - 3, OUTHOUSE.w + 6, OUTHOUSE.h + 6, t),
};

const doorMat: Interactable = {
  id: "room-door",
  name: "Door",
  scene: "interior",
  anchor: [R_DOOR.x + R_DOOR.w / 2, R_DOOR.y + R_DOOR.h * 0.35],
  defaultActionId: "leave",
  hit: (wx, wy) =>
    wx >= R_DOOR.x && wx <= R_DOOR.x + R_DOOR.w && wy >= R_DOOR.y - 8 && wy <= R_DOOR.y + R_DOOR.h,
  inReach: (px, py) => nearRect(px, py, R_DOOR, 30),
  actions: () => [
    { id: "leave", label: "Go outside", run: (c) => { if (!busy(c)) c.leaveHouse(); } },
  ],
  drawHover: (g, t) => glowRect(g, R_DOOR.x - 2, R_DOOR.y - 2, R_DOOR.w + 4, R_DOOR.h + 4, t),
};

export const INTERACTABLES: Interactable[] = [
  pond, stall, buskSpot, houseDoor, house, outhouseSpot,
  ...fishSpots, ...marketStalls, ...cottages, wellProp, buskSign,   // new-world clickables
  hearthSpot, basinSpot, bedSpot, doorMat, restSpot,   // door before rest: it wins the overlap by the mat
];

/**
 * Owned animals are feedable (Animal Husbandry, base-skill-set block).
 * They wander, so hit/reach read their live position; membership in the live
 * array guards against animals cleared by a New Game.
 */
export function registerAnimal(kind: "cow" | "hen", a: Cow | Hen, arr: Array<Cow | Hen>) {
  const rx = kind === "cow" ? 22 : 12, ry = kind === "cow" ? 16 : 10;
  const label = kind === "cow" ? "the cow" : "the hen";
  INTERACTABLES.push({
    id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    name: kind === "cow" ? "Cow" : "Hen",
    get anchor(): [number, number] { return [a.x, a.y + ry + 12]; },
    defaultActionId: "feed",
    hit: (wx, wy) => {
      if (!arr.includes(a)) return false;
      const dx = (wx - a.x) / rx, dy = (wy - (a.y - 2)) / ry;
      return dx * dx + dy * dy <= 1;
    },
    inReach: (px, py) => arr.includes(a) && Math.hypot(px - a.x, py - a.y) < 40,
    actions: () => [
      {
        id: "feed", label: "Feed",
        run: (c) => {
          if (busy(c)) return;
          if (countItem(c.economy.inv, FEED_GAIN_ITEM) === 0) {
            c.toast(`${kind === "cow" ? "She" : "It"} eyes your empty hands. ${ITEM_NAMES[FEED_GAIN_ITEM]} would do.`);
            return;
          }
          removeItem(c.economy.inv, FEED_GAIN_ITEM, 1);
          saveEconomy(c.economy);
          c.toast(kind === "cow" ? "The cow munches happily. 🐄" : "The hen pecks it up. 🐔");
          const gained = gainSkill(c.skills, "husbandry", moodPerfMult(c.needs));
          if (gained > 0) c.skillPopup("husbandry", gained);
        },
      },
      { id: "look", label: "Look", run: (c) => c.toast(`Your own ${label.replace("the ", "")} — bought, not given.`) },
    ],
    drawHover: (g, t) => glowEllipse(g, a.x, a.y - 2, rx + 4, ry + 4, t),
  });
}

/**
 * The 10 townsfolk are interactables: a proximity "Talk to <name>" prompt.
 * hit/reach read the NPC's LIVE position and go inert while the NPC is indoors
 * (asleep / at home). Talking is the single `onTalk` SEAM — this block shows a
 * canned personality line; the next block swaps `onTalk` for the real dialogue
 * engine without touching anything here. main.ts owns the npc list and passes
 * it in (explicit-passing, no singleton), same as animals/plots.
 */
export function registerNpc(npc: Npc, all: Npc[], onTalk: (n: Npc) => void) {
  const rx = 13, ry = 22;
  const live = () => all.includes(npc) && !npc.indoors;
  INTERACTABLES.push({
    id: `npc-${npc.def.id}`,
    name: npc.def.name,
    get anchor(): [number, number] { return [npc.x, npc.y + 24]; },
    defaultActionId: "talk",
    hit: (wx, wy) => {
      if (!live()) return false;
      const dx = (wx - npc.x) / rx, dy = (wy - (npc.y - 14)) / ry;
      return dx * dx + dy * dy <= 1;
    },
    inReach: (px, py) => live() && Math.hypot(px - npc.x, py - npc.y) < NPC_REACH,
    actions: () => [
      { id: "talk", label: `Talk to ${npc.def.name}`, run: () => onTalk(npc) },
      { id: "look", label: "Look", run: (c) => c.toast(npc.def.blurb) },
    ],
    drawHover: (g, t) => glowEllipse(g, npc.x, npc.y - 14, rx + 7, ry + 4, t),
  });
}

/** Flower beds by the house (Ornamental Gardening, base-skill-set block). */
export function registerFlowerBeds(garden: Garden) {
  FLOWER_BEDS.forEach(([bx, by], i) => {
    INTERACTABLES.push({
      id: `flowerbed-${i}`,
      name: "Flower bed",
      anchor: [bx, by + 20],
      defaultActionId: "plantflowers",
      hit: (wx, wy) => Math.abs(wx - bx) <= 15 && Math.abs(wy - by) <= 12,
      inReach: (px, py) => Math.hypot(px - bx, py - by) < 42,
      actions: (c) => {
        const bed = c.garden.beds[i]!;
        const list: MenuAction[] = [];
        if (!bed.planted)
          list.push({
            id: "plantflowers", label: "Plant flowers",
            run: (c) => {
              if (busy(c)) return;
              if (countItem(c.economy.inv, "flower-seeds") === 0) {
                c.toast("You need flower seeds — the stall sells them."); return;
              }
              removeItem(c.economy.inv, "flower-seeds", 1);
              saveEconomy(c.economy);
              bed.planted = true; bed.growth = 0; bed.bloomed = false;
              saveGarden(c.garden);
              c.toast("Flowers planted — they'll open soon.");
              c.memory("first_flowers", "You planted something just because it's pretty.");
              const gained = gainSkill(c.skills, "gardening", moodPerfMult(c.needs));
              if (gained > 0) c.skillPopup("gardening", gained);
            },
          });
        list.push({
          id: "look", label: "Look",
          run: (c) => c.toast(
            !bed.planted ? "A patch of turned earth by the house, waiting for something pretty."
            : bed.bloomed ? "Wildflowers in full bloom. The house looks less lonely for it."
            : "Seedlings pushing up — give them a little time."),
        });
        return list;
      },
      drawHover: (g, t) => glowEllipse(g, bx, by, 18, 14, t),
    });
  });
}

/** Berry bushes are runtime state, so they join the registry at game init. */
export function registerBushes(bushes: Bush[]) {
  bushes.forEach((b, i) => {
    INTERACTABLES.push({
      id: `bush-${i}`,
      name: "Forage bush",
      anchor: [b.x, b.y + 22],
      defaultActionId: "pick",
      hit: (wx, wy) => {
        const dx = (wx - b.x) / 22, dy = (wy - (b.y - 4)) / 18;
        return dx * dx + dy * dy <= 1;
      },
      inReach: (px, py) => Math.hypot(px - b.x, py - b.y) < 42,
      actions: (c) => {
        const list: MenuAction[] = [];
        if (b.full)
          list.push({
            id: "pick", label: "Forage",
            run: (c) => { if (!busy(c)) startPick(c.foraging, b); },
          });
        list.push({
          id: "look", label: "Look",
          run: (c) => c.toast(b.full
            ? "Something worth picking hides in the leaves."
            : "Picked clean — give it time to regrow."),
        });
        return list;
      },
      drawHover: (g, t) => glowEllipse(g, b.x, b.y - 4, 22, 18, t),
    });
  });
}

/** Plot tiles: till (hoe) -> plant (a held, in-season seed) -> water daily ->
 *  harvest; wilted crops get cleared. Active tending per the crop block.
 *  Callable again for newly-purchased expansion cells: ids come from a module
 *  counter, and hit/reach guard on live-array membership so cells dropped by
 *  a New Game go inert (the same pattern as animals). */
let plotIdSeq = 0;
export function registerPlots(cells: PlotCell[], all: PlotCell[], currentSeason: () => Season) {
  cells.forEach((cell) => {
    INTERACTABLES.push({
      id: `plot-${plotIdSeq++}`,
      name: "Plot",
      anchor: [cell.x, cell.y + 24],
      defaultActionId: "work",
      hit: (wx, wy) => all.includes(cell) && Math.abs(wx - cell.x) <= 16 && Math.abs(wy - cell.y) <= 16,
      inReach: (px, py) => all.includes(cell) && Math.hypot(px - cell.x, py - cell.y) < 46,
      actions: (c) => {
        const list: MenuAction[] = [];
        if (cell.state === "wild")
          list.push({
            id: "work", label: "Till",
            run: (c) => {
              if (busy(c)) return;
              if (countItem(c.economy.inv, "hoe") === 0) { c.toast("You need a hoe — the stall sells one."); return; }
              startWork(c.farmwork, cell, "till");
            },
          });
        else if (cell.state === "tilled") {
          // one entry per distinct seed packet in the bag ("Plant corn seeds", ...)
          const seedIds = [...new Set(
            c.economy.inv.slots.filter((s) => s && cropBySeed(s.id)).map((s) => s!.id))];
          for (const seedId of seedIds) {
            const crop = cropBySeed(seedId)!;
            list.push({
              id: seedIds[0] === seedId ? "work" : `plant-${seedId}`,
              label: `Plant ${(ITEM_NAMES[seedId] ?? seedId).toLowerCase()}`,
              run: (c) => {
                if (busy(c)) return;
                if (skillValue(c.skills, "farming") < crop.skillFloor) {
                  c.toast(`${crop.name} needs Farming ${crop.skillFloor} — not there yet.`); return;
                }
                if (!crop.seasons.includes(currentSeason())) {
                  c.toast(`${crop.name} won't take in ${currentSeason()} — wrong season.`); return;
                }
                startWork(c.farmwork, cell, "plant", seedId);
              },
            });
          }
          if (seedIds.length === 0)
            list.push({
              id: "work", label: "Plant seeds",
              run: (c) => c.toast("You need seeds — the stall sells what's in season."),
            });
        } else if (cell.state === "growing" && !cell.watered)
          list.push({
            id: "work", label: "Water",
            run: (c) => { if (!busy(c)) startWork(c.farmwork, cell, "water"); },
          });
        else if (cell.state === "ready")
          list.push({
            id: "work", label: "Harvest",
            run: (c) => { if (!busy(c)) startWork(c.farmwork, cell, "harvest"); },
          });
        else if (cell.state === "wilted")
          list.push({
            id: "work", label: "Clear",
            run: (c) => { if (!busy(c)) startWork(c.farmwork, cell, "clear"); },
          });
        const cropName = cell.cropId ? (ITEM_NAMES[cell.cropId] ?? cell.cropId) : "";
        list.push({
          id: "look", label: "Look",
          run: (c) => c.toast(
            cell.state === "wild" ? "A patch of ground fit for tilling."
            : cell.state === "tilled" ? "Tilled soil, waiting for seeds."
            : cell.state === "ready" ? `Ripe ${cropName.toLowerCase()}, ready to harvest!`
            : cell.state === "wilted" ? `Wilted ${cropName.toLowerCase()} — clear it and start over.`
            : `${cropName} growing — ${Math.round(cell.growth * 100)}% there, ${cell.watered ? "watered for today" : "thirsty"}.`
          ),
        });
        return list;
      },
      drawHover: (g, t) => glowRect(g, cell.x - 16, cell.y - 16, 32, 32, t),
    });
  });
}

export function hitTest(wx: number, wy: number, scene: InteractScene = "world"): Interactable | null {
  for (const it of INTERACTABLES) if ((it.scene ?? "world") === scene && it.hit(wx, wy)) return it;
  return null;
}

export function reachable(px: number, py: number, scene: InteractScene = "world"): Interactable | null {
  for (const it of INTERACTABLES) if ((it.scene ?? "world") === scene && it.inReach(px, py)) return it;
  return null;
}

export function byId(id: string): Interactable | null {
  return INTERACTABLES.find((it) => it.id === id) ?? null;
}

/** Resolves an object's default action, falling back to its first available one. */
function resolveDefault(it: Interactable, c: InteractCtx): MenuAction | undefined {
  const acts = it.actions(c);
  return acts.find((a) => a.id === it.defaultActionId) ?? acts[0];
}

export function runAction(it: Interactable, actionId: string, c: InteractCtx) {
  const a = it.actions(c).find((x) => x.id === actionId);
  if (a) a.run(c);
}

export function runDefault(it: Interactable, c: InteractCtx) {
  resolveDefault(it, c)?.run(c);
}

export function defaultActionLabel(it: Interactable, c: InteractCtx): string {
  return resolveDefault(it, c)?.label ?? it.name;
}
