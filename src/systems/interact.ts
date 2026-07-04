import { POND, STALL, BUSK_SPOT, HOUSE, HOUSE_DOOR, R_HEARTH, R_BASIN, R_BED, R_REST, R_DOOR } from "../world/zones";
import { REPAIR_COST } from "../config";
import { nearPond, nearRect } from "../world/collision";
import { saveEconomy, type Economy } from "./economy";
import { saveFarm, type FarmState, type FarmPart } from "./renovation";
import { startCast, type FishingState } from "./fishing";
import { startPick, type ForagingState, type Bush } from "./foraging";
import { startWork, type FarmWork, type PlotCell } from "./farming";
import { startBusk, type BuskingState } from "./busking";
import { countItem, ITEM_NAMES } from "./inventory";
import { skillValue, type Skills } from "./skills";
import { cropBySeed } from "../data/crops";
import type { Season } from "./calendar";
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
  skills: Skills;
  farm: FarmState;
  player: Player;
  toast: (s: string) => void;
  openShop: () => void;
  enterHouse: () => void;
  leaveHouse: () => void;
}

/** True while any timed activity is running (they are mutually exclusive). */
function busy(c: InteractCtx): boolean {
  return c.fishing.casting || c.foraging.picking || c.farmwork.working || c.busking.playing;
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
        startCast(c.fishing, skillValue(c.skills, "fishing"));
        c.player.fishing = true;
      },
    },
    { id: "look", label: "Look", run: (c) => c.toast("A calm pond. Fish glint below the surface.") },
  ],
  drawHover: (g, t) => glowEllipse(g, POND.cx, POND.cy, POND.rx + 4, POND.ry + 4, t),
};

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
  inReach: (px, py) => nearRect(px, py, HOUSE),
  actions: () => [
    { id: "enter", label: "Go inside", run: (c) => { if (!busy(c)) c.enterHouse(); } },
    { id: "look", label: "Look", run: (c) => c.toast("The front door. It still opens, at least.") },
  ],
  drawHover: (g, t) => glowRect(g, HOUSE_DOOR.x - 2, HOUSE_DOOR.y - 2, HOUSE_DOOR.w + 4, HOUSE_DOOR.h + 4, t),
};

// ---- the interior's spots (tier-1: present and honest about their state;
// cooking/sleeping mechanics arrive with their own systems) ----
function spot(
  id: string, name: string, r: { x: number; y: number; w: number; h: number },
  look: string, anchorDy = 20, reachPad = 34,
): Interactable {
  return {
    id, name, scene: "interior",
    anchor: [r.x + r.w / 2, r.y + r.h + anchorDy],
    defaultActionId: "look",
    hit: (wx, wy) => wx >= r.x - 4 && wx <= r.x + r.w + 4 && wy >= r.y - 12 && wy <= r.y + r.h + 4,
    inReach: (px, py) => nearRect(px, py, r, reachPad),
    actions: () => [{ id: "look", label: "Look", run: (c) => c.toast(look) }],
    drawHover: (g, t) => glowRect(g, r.x - 3, r.y - 3, r.w + 6, r.h + 6, t),
  };
}

const hearthSpot = spot("hearth", "Hearth", R_HEARTH,
  "A soot-blackened hearth and one rusty pot. It could cook a meal — barely.", 26);
const basinSpot = spot("basin", "Wash basin", R_BASIN,
  "A cracked clay basin on a wobbly stand. Water comes from the well, bucket by bucket.");
const bedSpot = spot("bed", "Bed", R_BED,
  "A straw mattress, a creaky frame, one threadbare blanket. No pillow.");
// tight reach: the rest corner sits beside the door mat and must not swallow it
const restSpot = spot("rest", "Rest corner", R_REST,
  "A chair with one short leg and a crate standing in for a table.", 20, 18);

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
  pond, stall, buskSpot, houseDoor, house,
  hearthSpot, basinSpot, bedSpot, doorMat, restSpot,   // door before rest: it wins the overlap by the mat
];

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
 *  harvest; wilted crops get cleared. Active tending per the crop block. */
export function registerPlots(cells: PlotCell[], currentSeason: () => Season) {
  cells.forEach((cell, i) => {
    INTERACTABLES.push({
      id: `plot-${i}`,
      name: "Plot",
      anchor: [cell.x, cell.y + 24],
      defaultActionId: "work",
      hit: (wx, wy) => Math.abs(wx - cell.x) <= 16 && Math.abs(wy - cell.y) <= 16,
      inReach: (px, py) => Math.hypot(px - cell.x, py - cell.y) < 46,
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
