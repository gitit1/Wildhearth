import {
  WORLD_W, FORAGE_BASE_YIELD, STARTER_SKILL_SEED, STARTING_COINS, COLLAPSE_FEE,
  DIALOGUE_FRIENDSHIP_BUMP, DIALOGUE_TOPIC_FLAG_DAYS,
} from "./config";
import {
  initInput, consumeAction, consumeLeftClick, consumeRightClick,
  getPointerScreen, setMoveTarget, clearMoveTarget,
} from "./engine/input";
import { applyCamera, screenToWorld, adjustZoom } from "./engine/camera";
import { paintGround } from "./world/ground";
import {
  HOUSE, BARN, STALL, WORLD_TREES, BUSK_SPOT, OLD_BUSK_SIGN, HOUSE_DOOR, ROOM, ROOM_ENTRY,
  FLOWER_BEDS, fieldBounds, NEIGHBOR, MARKET_STALLS, COTTAGES, WELL, HEDGES, OUTHOUSE, regionAt,
} from "./world/zones";
import { drawInterior } from "./art/interior";
import {
  drawTree, drawFence, drawHedge, drawBush, drawTilledTile, drawCropTile, drawWiltedTile,
  drawFlowerBed, drawBuskSpot, drawMusicNotes, drawWaterShimmer,
  drawOpenWaterShimmer, drawDock, drawBuskSign,
} from "./art/props";
import { drawHouse, drawBarn, drawStall, drawCottage, drawWell, drawOuthouse } from "./art/buildings";
import { drawFarmer, drawCow, drawHen, drawNpc } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals, spawnCow, spawnHen } from "./entities/animals";
import { createNpcs, updateNpcs, initNpcPositions, startTalking, npcById, npcNeedComment, type Npc } from "./entities/npc";
import { loadLivestock, resetLivestock } from "./systems/livestock";
import { loadEconomy, gainItem, saveEconomy } from "./systems/economy";
import { createFishing, updateFishing, cancelCast, resolveCatch } from "./systems/fishing";
import { createBushes, createForaging, updateForaging, resolveForage, cancelPick } from "./systems/foraging";
import {
  loadPlots, savePlots, resetPlots, expansionCells, createFarmWork, updateFarmWork,
  updatePlots, rollPlotsDay, cancelWork,
} from "./systems/farming";
import { cropById, cropBySeed } from "./data/crops";
import { createBusking, updateBusking, cancelBusk, rollTip } from "./systems/busking";
import { createCooking, updateCooking, cancelCook } from "./systems/cooking";
import { recipeById } from "./data/recipes";
import { loadGarden, resetGarden, saveGarden, updateGarden } from "./systems/gardening";
import { loadCollections, resetCollections, discover, discoveredName } from "./systems/collections";
import { sellableGoodIds } from "./systems/sellCategories";
import { loadMemories, resetMemories, addMemory } from "./systems/memories";
import { initMemoryBook, updateMemoryBook } from "./ui/memorybook";
import { initDebugPanel, updateDebugPanel } from "./ui/debugpanel";
import { removeItem, countItem, addItem, ITEM_NAMES } from "./systems/inventory";
import { loadSkills, gainSkill, skillValue, getSkill, saveSkills } from "./systems/skills";
import { saveSettings, isGuided, dayLengthSeconds } from "./systems/settings";
import { loadFarm, resetFarm } from "./systems/renovation";
import { loadCalendar, resetCalendar, saveCalendar, advanceMinute, currentSeason, currentPhase, absoluteDay } from "./systems/calendar";
import { loadWeather, resetWeather, rollDailyWeather, isRaining } from "./systems/weather";
import { loadWorldFlags, resetWorldFlags, pruneExpired, setFlag as setWorldFlag } from "./systems/worldFlags";
import {
  loadNeeds, resetNeeds, decayNeeds, recomputeMood, moodPerfMult, applyExertion, applyWalk,
  socialContact, collectWarnings, criticalNeed, applyAccident, collapseRecover,
  restore, edibleHunger, needsRecord, drink, wash, useOuthouse, rest,
  PHYSICAL_NEEDS, type NeedId,
} from "./systems/needs";
import { loadMeta, saveMeta } from "./systems/meta";
import { hasSavedGame, clearSavedGame } from "./systems/saves";
import { getWorldContext } from "./systems/worldContext";
import {
  loadRelationships, resetRelationships, decayRelationships, giveGift, applyInteraction,
  markContact, relationshipSummary, dialogueBump,
} from "./systems/relationships";
import { initDialogue, openDialogue, isDialogueOpen, closeDialogue } from "./ui/dialoguebox";
import type { ChoiceEffect } from "./systems/dialogue";
import type { NpcDef } from "./data/npcs";
import { heartEvent } from "./systems/heartEvents";
import { isGiftable } from "./data/traitPreferences";
import { INTERACTIONS, interactionLine, type InteractionDef } from "./data/interactions";
import { initGiftChooser, openGiftChooser, closeGiftChooser } from "./ui/giftchooser";
import type { GiftRating } from "./data/traitPreferences";
import type { ThresholdEvent } from "./systems/relationships";
import {
  hitTest, reachable, byId, runAction, runDefault, defaultActionLabel,
  registerBushes, registerPlots, registerAnimal, registerFlowerBeds, registerNpc,
  type Interactable, type InteractCtx,
} from "./systems/interact";
import { openContextMenu, closeContextMenu } from "./ui/contextmenu";
import { updateHud, updateNeedsStrip, setPrompt, toast, updateToast } from "./ui/hud";
import { initFade, fadeThrough } from "./ui/fade";
import { initBackpack, updateBackpack } from "./ui/backpack";
import { initMinimap, updateMinimap, setMinimapField } from "./ui/minimap";
import { initSkillsUI, updateSkillsUI, skillGainPopup } from "./ui/skills";
import { initShopWindow, openShopWindow, closeShopWindow, isShopOpen, updateShopWindow } from "./ui/shopwindow";
import { showTitle, hideOpening } from "./ui/titlescreen";
import { showIntro, showReveal } from "./ui/intro";
import { showStarterChoice, showTutorialToggle, type StarterTool } from "./ui/newgame";
import { nearRect, setCollisionScene, type Scene } from "./world/collision";

const cv = document.getElementById("cv") as HTMLCanvasElement;
const ctx = cv.getContext("2d")!;
// the canvas fills #gameArea (the UO-style play window), not the whole screen
function fit() {
  const r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * devicePixelRatio);
  cv.height = Math.round(r.height * devicePixelRatio);
}
addEventListener("resize", fit); fit();

initInput(cv, document.getElementById("actBtn")!);

// camera zoom: mouse wheel over the play window, plus on-screen +/− (touch)
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  adjustZoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });
document.getElementById("zoomIn")!.addEventListener("click", () => adjustZoom(1));
document.getElementById("zoomOut")!.addEventListener("click", () => adjustZoom(-1));
const ground = paintGround();
const player = createPlayer();
const livestock = loadLivestock();
const { cows, hens } = createAnimals(livestock);   // only what's been bought — no free animals
const economy = loadEconomy();
const fishing = createFishing();
const foraging = createForaging();
const bushes = createBushes();
const farm = loadFarm();       // loaded before the plots — the field's size depends on plotTiers
const plots = loadPlots(farm.plotTiers);   // the field persists: crops, watering, wilt, expansions
const farmwork = createFarmWork();
const busking = createBusking();
const cooking = createCooking();
const skills = loadSkills();
const garden = loadGarden();
const collections = loadCollections();
const memories = loadMemories();
const calendar = loadCalendar();
const weather = loadWeather();
const worldFlags = loadWorldFlags();
const needs = loadNeeds();
const relationships = loadRelationships();
const meta = loadMeta();
registerBushes(bushes);
registerPlots(plots, plots, () => currentSeason(calendar));
registerFlowerBeds(garden);
setMinimapField(fieldBounds(farm.plotTiers));

/** A just-bought expansion tier becomes real, tillable field on the spot. */
function expandFarm() {
  const fresh = expansionCells(farm.plotTiers);   // plotTiers was already incremented
  plots.push(...fresh);
  registerPlots(fresh, plots, () => currentSeason(calendar));
  savePlots(plots);
  setMinimapField(fieldBounds(farm.plotTiers));
}
for (const c of cows) registerAnimal("cow", c, cows);
for (const h of hens) registerAnimal("hen", h, hens);

// The 10 townsfolk: deterministic from the clock (no persistence). Snap them to
// their scheduled spots for the loaded time, then register each as a "Talk to
// <name>" interactable routed through the single onTalk seam below.
const npcs = createNpcs();
initNpcPositions(npcs, calendar, weather);
for (const n of npcs) registerNpc(n, npcs, onTalk);

/** Talk seam: opens the dialogue bottom-box (condition-keyed opening line +
 *  shallow choice turns). The window drives the conversation; the Social-need
 *  bump + markContact fire once it ENDS (the onClose hook below), so they're not
 *  double-counted the way the old canned one-liner did per talk. */
function onTalk(npc: Npc) {
  openDialogue(npc.def);
}

/** The region the player is standing in — the dialogue key system reads this as
 *  "where the player is right now" (interior counts as the farm). */
function playerRegion() {
  return scene === "world" ? regionAt(player.x, player.y) : "farm";
}

/** Applies a dialogue choice's small effect. Kept in main because it owns the
 *  relationship / world-flag state and the heart-event presentation. */
function applyDialogueEffect(def: NpcDef, effect: ChoiceEffect) {
  const today = absoluteDay(calendar);
  switch (effect.kind) {
    case "friendship": {
      const thresholds = dialogueBump(relationships, def, effect.amount ?? DIALOGUE_FRIENDSHIP_BUMP, calendar);
      const npc = npcById(npcs, def.id);
      if (npc) for (const ev of thresholds) fireHeart(npc, ev);
      break;
    }
    case "contact":
      markContact(relationships, def.id, today);
      break;
    case "flag":
      setWorldFlag(worldFlags, effect.key, effect.days ?? DIALOGUE_TOPIC_FLAG_DAYS, today);
      break;
  }
}

// ---- Relationship engine: gift + interaction flows (main owns economy/memory)

const GIFT_REACTIONS: Record<GiftRating, (name: string) => string> = {
  loved: (n) => `${n}'s eyes light up! ♥`,
  liked: (n) => `${n} smiles warmly. A good gift.`,
  neutral: (n) => `${n} accepts it politely.`,
  disliked: (n) => `${n} seems unimpressed.`,
  hated: (n) => `${n} grimaces — bad idea.`,
};

/** Plays a crossed heart threshold: a toast + a once-only Memory Book entry. */
function fireHeart(npc: Npc, ev: ThresholdEvent) {
  const h = heartEvent(npc.def, ev);
  addMemory(memories, h.memoryKey, h.memoryText, calendar);   // once per (npc,axis,threshold)
  toast(h.toast);
}

/** Give one held item to an NPC: refusal (weekly cap) never consumes; an
 *  accepted gift consumes, moves Friendship by the tiered delta, reacts, and
 *  writes the first-gift memory + any heart events. */
function giveGiftFlow(npc: Npc, itemId: string) {
  if (countItem(economy.inv, itemId) === 0) return;
  const out = giveGift(relationships, npc.def, itemId, calendar);
  if (out.kind === "refused") { toast(out.line); return; }
  removeItem(economy.inv, itemId, 1);
  saveEconomy(economy);
  startTalking(npc);
  const line = GIFT_REACTIONS[out.rating](npc.def.name);
  toast(out.birthday ? `🎂 A birthday gift! ${line}` : line);
  if (out.firstEver) remember("first_gift", "You gave your first gift — a small kindness offered.");
  for (const ev of out.thresholds) fireHeart(npc, ev);
}

/** Open the gift chooser for an NPC, listing the giftable goods in the bag. */
function openGiftFor(npc: Npc) {
  const ids = [...new Set(
    economy.inv.slots.filter((s) => s && isGiftable(s.id)).map((s) => s!.id))];
  openGiftChooser(npc.def.name, ids, (id) => giveGiftFlow(npc, id));
}

/** Run a categorized social interaction: move the right axis (with per-day
 *  diminishing returns handled in relationships.ts), face the player, and pass
 *  a scripted line flavoured by personality. */
function doInteraction(npc: Npc, it: InteractionDef) {
  const res = applyInteraction(relationships, npc.def, it, calendar);
  if (res.kind === "blocked") { toast(res.line); return; }
  startTalking(npc);
  socialContact(needs, npc.def.id, absoluteDay(calendar));
  toast(`${npc.def.name}: ${interactionLine(it.category, npc.def.personality)}`);
  for (const ev of res.thresholds) fireHeart(npc, ev);
}

// Dev-only test bridge: exposes live state so automated verification can jump
// the clock, snap the townsfolk, and place the player without a fragile
// walk-the-whole-map script. `import.meta.env.DEV` is false in production, so
// this whole block is dead-code-eliminated from the shipped build.
if (import.meta.env.DEV)
  (window as unknown as { __wh: unknown }).__wh = {
    player, npcs, calendar, weather, needs, economy,
    snap: () => initNpcPositions(npcs, calendar, weather),
    // needs verification bridge — deterministic hooks so automated tests don't
    // have to wait on real time or synthesize canvas clicks:
    liveMinute,                                   // one live minute: decay + warnings + collapse
    warnings: () => collectWarnings(needs),       // newly-fired warning lines
    moodMult: () => moodPerfMult(needs),          // the skill/busk mood multiplier
    record: () => needsRecord(needs),
    eat: eatItem, drink: () => drink(needs), wash: () => wash(needs),
    outhouse: () => useOuthouse(needs), sitRest: () => rest(needs),
    sleep: sleepUntilMorning, nap: napAnHour,
    scene: () => scene, leave: () => leaveHouse(),
    give: (id: string, n = 1) => { addItem(economy.inv, id, n); saveEconomy(economy); },
    // relationship verification bridge — drive gifts/interactions/decay without UI
    relationships,
    relOf: (npcId: string) => relationshipSummary(npcs.find((n) => n.def.id === npcId)!.def, relationships),
    giftTo: (npcId: string, itemId: string) => giveGiftFlow(npcs.find((n) => n.def.id === npcId)!, itemId),
    openGift: (npcId: string) => openGiftFor(npcs.find((n) => n.def.id === npcId)!),
    interactWith: (npcId: string, interactionId: string) => {
      const npc = npcs.find((n) => n.def.id === npcId)!;
      const it = INTERACTIONS.find((i) => i.id === interactionId)!;
      doInteraction(npc, it);
    },
    // the NPC's menu action ids right now (only reads c.relationships) — lets a
    // test confirm Romantic options are hidden/shown without synthesizing clicks
    npcActions: (npcId: string) =>
      byId(`npc-${npcId}`)?.actions({ relationships } as unknown as InteractCtx).map((a) => a.id),
    // fast-forward one in-game day and run the neglect-decay hook (test helper)
    rollDay: () => {
      const ended = absoluteDay(calendar);
      calendar.day += 1;
      if (calendar.day > 10) { calendar.day = 1; calendar.seasonIndex = (calendar.seasonIndex + 1) % 4; }
      saveCalendar(calendar);
      decayRelationships(relationships, ended, absoluteDay(calendar));
    },
    // dialogue verification bridge — open/close the bottom-box + force conditions
    worldFlags,
    talk: (npcId: string) => { const n = npcById(npcs, npcId); if (n) onTalk(n); },
    endTalk: () => closeDialogue(),
    dlgOpen: () => isDialogueOpen(),
    setFriendship: (npcId: string, v: number) => {
      const def = npcs.find((n) => n.def.id === npcId)!.def;
      const cur = relationshipSummary(def, relationships).friendship;
      dialogueBump(relationships, def, v - cur, calendar);
    },
    flag: (key: string, days = 4) => setWorldFlag(worldFlags, key, days, absoluteDay(calendar)),
    repairFarm: () => { farm.roof = true; farm.window = true; farm.barn = true; farm.fence = true; },
    begin: () => beginPlay(),                     // skip the title screens into live play
    newGame: () => { newGameReset(meta.starterTool as StarterTool, isGuided()); beginPlay(); },
  };

initBackpack(economy, eatItem);
initGiftChooser(economy);
// the dialogue bottom-box: each turn reads ONE npc-scoped world snapshot, routes
// the line through renderNpcLine (the AI seam), and hands effects/close back here
initDialogue({
  worldFor: (npcId) => getWorldContext(
    { economy, skills, farm, calendar, weather, flags: worldFlags, needs, relationships, location: playerRegion() },
    { npcId },
  ),
  applyEffect: applyDialogueEffect,
  onOpen: (def) => { const n = npcById(npcs, def.id); if (n) startTalking(n, player.x, player.y); },
  onClose: (def) => {
    socialContact(needs, def.id, absoluteDay(calendar));   // company feeds the Social need
    markContact(relationships, def.id, absoluteDay(calendar));   // any contact holds off decay
  },
});
initMinimap();
initSkillsUI(skills);
initMemoryBook(collections, memories);
initDebugPanel();
initFade();

/** Eat one edible item from the bag: consume it, restore hunger (Needs engine).
 *  Cooked dishes restore most, then crop produce, then wild forage; raw fish
 *  and junk aren't food. Returns false if the item isn't edible / not held. */
function eatItem(id: string): boolean {
  const amt = edibleHunger(id);
  if (amt <= 0 || countItem(economy.inv, id) === 0) return false;
  removeItem(economy.inv, id, 1);
  saveEconomy(economy);
  const gained = Math.round(restore(needs, "hunger", amt));
  toast(`You eat the ${(ITEM_NAMES[id] ?? id).toLowerCase()}. (+${gained} hunger) 🍽`);
  return true;
}

/** Writes a once-only life event into the Memory Book (+ a quiet toast). */
function remember(key: string, text: string) {
  if (addMemory(memories, key, text, calendar)) toast(`✒ ${text}`);
}

/** Records a species/find discovery; celebrates only the first time. */
function record(category: "fish" | "forage", id: string) {
  if (discover(collections, category, id)) toast(`New in your book: ${discoveredName(id)}.`);
}
initShopWindow(economy, skills, farm, livestock,
  (kind) => {
    if (kind === "cow") { const c = spawnCow(); cows.push(c); registerAnimal("cow", c, cows); }
    else { const h = spawnHen(); hens.push(h); registerAnimal("hen", h, hens); }
  },
  () => currentSeason(calendar),
  () => sellableGoodIds({ inv: economy.inv, collections }),
  toast, remember);

interface Puff { x: number; y: number; a: number; r: number }
const smoke: Puff[] = [];

// ---- scenes: the world, and the house interior (tier-1 bare/broken) ----
let scene: Scene = "world";

function enterHouse() {
  scene = "interior";
  setCollisionScene(scene);
  player.x = ROOM_ENTRY[0]; player.y = ROOM_ENTRY[1];
  player.moving = false; player.dir = 0;     // stepping in, facing the room
  clearMoveTarget(); closeContextMenu(); closeGiftChooser();
  pending = null;
}

function leaveHouse() {
  scene = "world";
  setCollisionScene(scene);
  player.x = HOUSE_DOOR.x + HOUSE_DOOR.w / 2;
  player.y = HOUSE.y + HOUSE.h + 16;
  player.moving = false; player.dir = 2;     // stepping out, facing the yard
  clearMoveTarget(); closeContextMenu(); closeGiftChooser();
  pending = null;
}

// ---- opening sequence (title -> intro -> reveal -> choice -> tutorial) ----
let openingActive = true;
let hintSellShown = false;
let minuteAccum = 0;   // real seconds banked toward the next in-game minute
let timeSkipping = false;   // true during a sleep/collapse fade — world time PAUSES (never teleports)
let lastDist = player.dist; // player travel last frame, for charging walking energy
const npcCommentDay: Record<string, number> = {};   // needId -> absoluteDay an NPC last remarked on it

/** One in-game minute: roll the clock, fire the daily hooks on a new day, drain
 *  needs. The single source of truth for time passing — both the live tick and
 *  the sleep/collapse skip call it, so a skipped night fires every daily hook
 *  exactly as a played-out one would (weather reroll, flag prune, crop aging). */
function stepGameMinute(sleeping: boolean) {
  const endedDay = absoluteDay(calendar);   // captured BEFORE the clock advances (year-wrap safe)
  if (advanceMinute(calendar)) {
    rollDailyWeather(weather, currentSeason(calendar));
    pruneExpired(worldFlags, absoluteDay(calendar));
    rollPlotsDay(plots, isRaining(weather));   // rain waters for free; dry crops bank a day toward wilting
    // neglect decay: any NPC not contacted during the day that just ended drifts
    // down (faster the shallower the bond); also expires a stale birthday flag
    decayRelationships(relationships, endedDay, absoluteDay(calendar));
  }
  decayNeeds(needs, { season: currentSeason(calendar), weather: weather.kind, sleeping });
}

/** One LIVE in-game minute (awake): advance time + needs, fire escalating
 *  warnings, and trigger a collapse/accident if a need bottomed out. Returns
 *  true if a collapse started (the caller stops advancing time for the fade). */
function liveMinute(): boolean {
  stepGameMinute(false);
  for (const line of collectWarnings(needs)) toast(line);   // escalating 25/10 warnings
  const crit = criticalNeed(needs);
  if (crit) {
    if (crit.kind === "collapse") { handleCollapse(crit.need); return true; }
    handleAccident();
  }
  return false;
}

/** In-game minutes from now until the next 06:00. */
function minutesUntilMorning(): number {
  const now = calendar.hour * 60 + calendar.minute;
  const target = 6 * 60;
  const d = now < target ? target - now : (24 * 60 - now) + target;
  return d <= 0 ? 24 * 60 : d;
}

/** Sleep in the bed until morning: fade to black, drive the REAL minute loop
 *  (energy recovers, other needs drain slowly), fade back at 06:00. */
function sleepUntilMorning() {
  if (timeSkipping) return;
  timeSkipping = true;
  const mins = minutesUntilMorning();
  fadeThrough(
    () => { for (let i = 0; i < mins; i++) stepGameMinute(true); },
    "You sleep until morning…",
    () => { timeSkipping = false; toast("A new day. You wake rested. ☀"); },
  );
}

/** A one-hour nap: the same skip, an hour long. */
function napAnHour() {
  if (timeSkipping) return;
  timeSkipping = true;
  fadeThrough(
    () => { for (let i = 0; i < 60; i++) stepGameMinute(true); },
    "You nap for an hour…",
    () => { timeSkipping = false; },
  );
}

/** Wake in the farmhouse (used by collapse — pulls the player home to the bed). */
function wakeAtBed() {
  if (scene !== "interior") enterHouse();
  else { player.moving = false; clearMoveTarget(); }
}

/** Collapse (hunger/thirst/energy hit 0): no death — fade out, skip to 06:00 via
 *  the same sleep path, restore some, charge a helper's fee, wake at the bed. */
function handleCollapse(need: NeedId) {
  if (timeSkipping) return;
  timeSkipping = true;
  const label = need === "energy" ? "exhaustion" : need === "hunger" ? "hunger" : "thirst";
  const mins = minutesUntilMorning();
  let fee = 0;
  fadeThrough(
    () => {
      for (let i = 0; i < mins; i++) stepGameMinute(true);
      collapseRecover(needs);
      fee = Math.min(COLLAPSE_FEE, Math.max(0, economy.coins));   // never go negative
      economy.coins -= fee;
      saveEconomy(economy);
      wakeAtBed();
    },
    "You collapse…",
    () => {
      timeSkipping = false;
      toast(fee > 0
        ? `You collapsed from ${label}. A neighbour found you and helped you home. (−${fee} coins)`
        : `You collapsed from ${label}. A neighbour helped you home — you'll owe them a favour.`);
    },
  );
}

/** Bathroom hit 0: an embarrassing accident — a small hygiene/mood hit, no
 *  faint, no coin cost (DECISIONS). */
function handleAccident() {
  applyAccident(needs);
  toast("Oh no — an accident. Mortifying. You'll want to clean up.");
}

/** When the player lingers by an NPC with a low need, the NPC may remark on it
 *  (once per need per day, occasional). Reuses the proximity from the tick. */
function maybeNpcComment(npcTagId: string) {
  const id = npcTagId.slice("npc-".length);
  const npc = npcs.find((n) => n.def.id === id);
  if (!npc) return;
  const rec = needsRecord(needs);
  let target: NeedId | null = null, low = 25;
  for (const nid of PHYSICAL_NEEDS) {
    const v = rec[nid] ?? 100;
    if (v < low) { low = v; target = nid; }
  }
  if (!target) return;
  const day = absoluteDay(calendar);
  if (npcCommentDay[target] === day) return;   // already remarked on this need today
  if (Math.random() > 0.005) return;           // occasional, not every frame
  npcCommentDay[target] = day;
  toast(`${npc.def.name}: “${npcNeedComment(npc.def, target)}”`);
}

// The guided first-tip points at the livelihood the starter tool unlocks, so
// the very first thing the game suggests matches what the player just chose.
function firstTip(): string {
  switch (meta.starterTool) {
    case "rod":  return "Tip: click the pond to cast — your rod's ready. First coins await!";
    case "lute": return "Tip: click the busking spot and play a tune for your first coins!";
    case "hoe":  return "Tip: forage a bush or fish the pond for first coins — then buy seeds for your hoe.";
    default:     return "Tip: click the pond to fish or a bush to forage — first coins!";
  }
}

function beginPlay() {
  hideOpening();
  openingActive = false;
  consumeAction(); consumeLeftClick(); consumeRightClick(); clearMoveTarget();
  if (isGuided())
    setTimeout(() => toast(firstTip()), 500);
}

function newGameReset(tool: StarterTool, guided: boolean) {
  clearSavedGame();                 // wipe every game-state key first, then re-seed fresh
  economy.coins = STARTING_COINS;   // "enough for exactly one starter-tool choice" — anchor table: 50
  economy.inv.slots.fill(null);
  addItem(economy.inv, tool);
  saveEconomy(economy);
  for (const s of skills.list) { s.value = 0; s.lock = "up"; }
  const seeded = getSkill(skills, tool === "hoe" ? "farming" : tool === "rod" ? "fishing" : "busking");
  if (seeded) seeded.value = STARTER_SKILL_SEED;
  saveSkills(skills);
  resetPlots(plots);                        // also drops purchased expansion cells
  setMinimapField(fieldBounds(0));
  resetGarden(garden);
  resetCollections(collections);
  resetMemories(memories);
  for (const b of bushes) { b.full = true; b.regrow = 0; }
  resetFarm(farm);
  resetCalendar(calendar);
  resetWeather(weather);
  resetWorldFlags(worldFlags);
  resetNeeds(needs);                  // a new life starts rested, fed, content
  resetRelationships(relationships);  // a new life knows no one yet
  resetLivestock(livestock);
  cows.length = 0; hens.length = 0;   // the yard empties with the new life
  initNpcPositions(npcs, calendar, weather);   // re-snap townsfolk to fresh day-1 morning
  meta.starterTool = tool;
  saveMeta(meta);
  saveSettings({ guided });         // settings are not game state — kept across a New Game
}

showTitle(
  hasSavedGame(),
  () => showIntro(() => showReveal(() => showStarterChoice((tool) =>
    showTutorialToggle((guided) => { newGameReset(tool, guided); beginPlay(); })))),
  beginPlay,
);

let hovered: Interactable | null = null;              // object under the cursor (for the glow)
let nearReach: Interactable | null = null;            // object in reach (drives NPC name labels)
let pending: { objId: string; actionId: string } | null = null;  // action to run once in reach

let last = performance.now(), time = 0;

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;

  updateAnimals(cows, hens, dt);   // ambience runs even behind the opening screens
  // auto-pause: a conversation freezes game-time AND the townsfolk (they're "in
  // conversation") — the same gating pattern the title screen uses below.
  const dialoguePaused = isDialogueOpen();
  if (!dialoguePaused) updateNpcs(npcs, calendar, weather, player, dt);

  if (!openingActive && !dialoguePaused) {
  const wasMoving = player.moving;
  updatePlayer(player, dt);
  if (player.moving && !wasMoving) {
    if (fishing.casting) { cancelCast(fishing); player.fishing = false; }
    if (foraging.picking) cancelPick(foraging);
    if (farmwork.working) cancelWork(farmwork);
    if (busking.playing) cancelBusk(busking);
    if (cooking.cooking) cancelCook(cooking);
  }

  // world time: the day-length setting sets the pace; a full in-game day takes
  // dayLengthSeconds of actual play, so one minute is that over 24*60. Each
  // minute drains needs (stepGameMinute); warnings + collapse are checked per
  // minute. Paused while a sleep/collapse fade drives the same loop itself.
  if (!timeSkipping) {
    const minuteSeconds = dayLengthSeconds() / (24 * 60);
    minuteAccum += dt;
    while (minuteAccum >= minuteSeconds) {
      minuteAccum -= minuteSeconds;
      if (liveMinute()) break;   // a collapse pauses time while the fade takes over
    }
    applyWalk(needs, Math.max(0, player.dist - lastDist));   // a little energy for the ground covered
  }
  lastDist = player.dist;

  // interactions (UO-style: hover highlights, left = act/move, right = menu)
  const ictx: InteractCtx = {
    economy, fishing, foraging, farmwork, busking, cooking, skills, farm, garden, needs,
    relationships, calendar, player,
    toast, openShop: openShopWindow, enterHouse, leaveHouse,
    sleep: sleepUntilMorning, nap: napAnHour,
    skillPopup: skillGainPopup,
    memory: remember,
    expandFarm, openGiftFor, doInteraction,
  };

  // walking away from the stall closes the trade window
  if (isShopOpen() && !nearRect(player.x, player.y, STALL)) closeShopWindow();

  const ps = getPointerScreen();
  hovered = ps ? hitTest(...screenToWorld(ps[0], ps[1]), scene) : null;
  cv.style.cursor = hovered ? "pointer" : "default";

  const near = reachable(player.x, player.y, scene);
  nearReach = near;
  if (near && near.id.startsWith("npc-")) maybeNpcComment(near.id);   // "you look tired"
  if (fishing.casting) setPrompt("Waiting for a bite...");
  else if (foraging.picking) setPrompt("Picking berries...");
  else if (farmwork.working)
    setPrompt(farmwork.kind === "till" ? "Tilling the soil..." : farmwork.kind === "plant" ? "Planting seeds..." : "Harvesting...");
  else if (busking.playing) setPrompt("Playing a tune...");
  else if (cooking.cooking) setPrompt("Cooking...");
  else if (near) setPrompt(defaultActionLabel(near, ictx));
  else setPrompt(null);

  // left-click: act on a clicked object (walking to it first), else walk to the point
  const lc = consumeLeftClick();
  if (lc) {
    const obj = hitTest(lc.wx, lc.wy, scene);
    if (obj) {
      if (obj.inReach(player.x, player.y)) { runDefault(obj, ictx); pending = null; }
      else { setMoveTarget(obj.anchor[0], obj.anchor[1]); pending = { objId: obj.id, actionId: obj.defaultActionId }; }
    } else {
      setMoveTarget(lc.wx, lc.wy);
      pending = null;
    }
  }

  // right-click: open a context menu of the object's actions
  const rc = consumeRightClick();
  if (rc) {
    const obj = hitTest(rc.wx, rc.wy, scene);
    if (obj) {
      const items = obj.actions(ictx).map((a) => ({
        label: a.label,
        onClick: () => {
          if (obj.inReach(player.x, player.y)) runAction(obj, a.id, ictx);
          else { setMoveTarget(obj.anchor[0], obj.anchor[1]); pending = { objId: obj.id, actionId: a.id }; }
        },
      }));
      openContextMenu(rc.sx, rc.sy, items);
    } else closeContextMenu();
  }

  // action button / E key: use whatever is in reach
  if (consumeAction() && near && !fishing.casting && !foraging.picking && !farmwork.working && !busking.playing && !cooking.cooking)
    runDefault(near, ictx);

  // a queued action fires once the player arrives in reach
  if (pending) {
    const obj = byId(pending.objId);
    if (obj && obj.inReach(player.x, player.y)) { runAction(obj, pending.actionId, ictx); pending = null; }
    else if (!player.moving) pending = null;   // stopped short (blocked / unreachable)
  }

  if (updateFishing(fishing, dt)) {
    player.fishing = false;
    // what actually bit: species/junk table roll against skill, season, weather,
    // and WHERE the line was cast (pond / river / lake — set by the fishing spot)
    const haul = resolveCatch(skillValue(skills, "fishing"), currentSeason(calendar), weather.kind, fishing.location);
    const haulName = ITEM_NAMES[haul.id] ?? haul.id;
    if (gainItem(economy, haul.id)) {
      toast(haul.kind === "junk" ? `You fished up... ${haulName.toLowerCase()}.` : `Caught a ${haulName}! 🐟`);
      if (haul.kind === "fish") {
        record("fish", haul.id);
        remember("first_catch", "Your first catch — the water gave something back.");
      }
    } else toast("Backpack full — the catch slips away!");
    applyExertion(needs, "fishing");
    const gained = gainSkill(skills, "fishing", moodPerfMult(needs));
    if (gained > 0) skillGainPopup("fishing", gained);
    if (isGuided() && !hintSellShown) {
      hintSellShown = true;
      setTimeout(() => toast("Sell your catch: walk to the stall and Trade."), 2400);
    }
  }
  if (updateForaging(foraging, bushes, dt)) {
    // what the pick found rolls against the forage table for this season+skill;
    // higher Foraging keeps its extra-find chance on top
    const found = resolveForage(skillValue(skills, "foraging"), currentSeason(calendar));
    const bonus = Math.random() < skillValue(skills, "foraging") / 100 ? 1 : 0;
    const n = FORAGE_BASE_YIELD + bonus;
    const foundName = (ITEM_NAMES[found] ?? found).toLowerCase();
    if (gainItem(economy, found, n)) {
      toast(n > 1 ? `Picked ${n} ${foundName}!` : `Picked ${foundName}!`);
      record("forage", found);
      remember("first_forage", "The forest fed you today — first wild pickings.");
    } else toast("Backpack full — no room for the find!");
    applyExertion(needs, "foraging");
    const gained = gainSkill(skills, "foraging", moodPerfMult(needs));
    if (gained > 0) skillGainPopup("foraging", gained);
  }
  if (updateBusking(busking, dt)) {
    // mood colours a performance: a low spirit plays flat, a high one shines
    const tip = Math.max(1, Math.round(rollTip(skillValue(skills, "busking")) * moodPerfMult(needs)));
    economy.coins += tip;
    saveEconomy(economy);
    toast(`Earned ${tip} coin${tip === 1 ? "" : "s"} busking! 🎶`);
    remember("first_busk", "You played for strangers, and they paid — first tips.");
    applyExertion(needs, "busking");
    const gained = gainSkill(skills, "busking", moodPerfMult(needs));
    if (gained > 0) skillGainPopup("busking", gained);
  }
  const cooked = updateCooking(cooking, dt);
  if (cooked) {
    const r = recipeById(cooked);
    if (r) {
      // consume the ingredients, serve the dish (worked-in value)
      for (const [id, n] of Object.entries(r.inputs)) removeItem(economy.inv, id, n);
      if (gainItem(economy, r.id)) {
        toast(`Cooked ${r.name.toLowerCase()}! 🍲`);
        remember("first_cook", "A warm meal from your own hearth — first dish.");
      } else toast("Backpack full — the dish burns while you rummage!");
      const gained = gainSkill(skills, "cooking", moodPerfMult(needs));
      if (gained > 0) skillGainPopup("cooking", gained);
    }
  }
  if (updateGarden(garden, dt, dayLengthSeconds())) {
    saveGarden(garden);
    toast("The flower bed is in bloom! 🌸");
  }
  if (updatePlots(plots, dt, skillValue(skills, "farming"), dayLengthSeconds())) savePlots(plots);
  const farmDone = updateFarmWork(farmwork, dt);
  if (farmDone) {
    applyExertion(needs, "farmwork");   // field work is tiring, grubby work
    const { cell, kind, seedId } = farmDone;
    if (kind === "till") {
      cell.state = "tilled";
      toast("The soil is ready for seeds.");
    } else if (kind === "plant") {
      const crop = seedId ? cropBySeed(seedId) : null;
      if (crop && seedId && countItem(economy.inv, seedId) > 0 && removeItem(economy.inv, seedId, 1)) {
        saveEconomy(economy);
        cell.state = "growing"; cell.growth = 0; cell.cropId = crop.id; cell.dryDays = 0;
        cell.watered = isRaining(weather);   // a rainy day waters the fresh planting for free
        toast(cell.watered ? `${crop.name} planted — the rain's already on it!` : `${crop.name} planted — it'll want water.`);
      }
    } else if (kind === "water") {
      cell.watered = true;
      toast("Watered for today.");
    } else if (kind === "clear") {
      cell.state = "tilled"; cell.growth = 0; cell.cropId = null; cell.dryDays = 0; cell.watered = false;
      toast("Cleared the wilted crop.");
    } else {
      const crop = cell.cropId ? cropById(cell.cropId) : null;
      if (crop && gainItem(economy, crop.id)) {
        cell.state = "tilled"; cell.growth = 0; cell.cropId = null; cell.watered = false; cell.dryDays = 0;
        toast(`Harvested ${crop.name.toLowerCase()}! 🌽`);
        remember("first_harvest", "The first harvest from your own soil.");
        const gained = gainSkill(skills, "farming", moodPerfMult(needs));
        if (gained > 0) skillGainPopup("farming", gained);
      } else if (crop) toast(`Backpack full — no room for the ${crop.name.toLowerCase()}!`);
    }
    savePlots(plots);
  }
  } else {
    setPrompt(null);
    hovered = null;
    nearReach = null;
    // drain any queued world input so a click behind the dialogue box / title
    // screen doesn't fire the instant play resumes
    consumeLeftClick(); consumeRightClick(); consumeAction();
  }

  // chimney smoke
  if (Math.random() < dt * 3)
    smoke.push({ x: HOUSE.x + HOUSE.w * 0.765, y: HOUSE.y - HOUSE.h * 0.16, a: 0.5, r: 3 });
  for (const s of smoke) {
    s.y -= 14 * dt; s.x += Math.sin(time * 2 + s.y * 0.1) * 6 * dt;
    s.a -= dt * 0.16; s.r += dt * 5;
  }
  for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i]!.a <= 0) smoke.splice(i, 1);

  // mood is DERIVED — recompute it every frame (cheap) so the HUD stays snappy
  // as needs are restored, independent of the per-minute decay tick.
  recomputeMood(needs, weather.kind);

  // one World Context snapshot per frame, feeding the always-visible HUD
  // and (when toggled) the dev inspector — never a second call per frame.
  // location: the player's current region (interior counts as the farm).
  const region = scene === "world" ? regionAt(player.x, player.y) : "farm";
  // scope the relationship slice to the NPC in reach (if any), so the dev
  // inspector shows "this bond, right now" the way a dialogue check would ask
  const nearNpcId = nearReach?.id.startsWith("npc-") ? nearReach.id.slice("npc-".length) : undefined;
  const wc = getWorldContext(
    { economy, skills, farm, calendar, weather, flags: worldFlags, needs, relationships, location: region },
    { npcId: nearNpcId },
  );
  // the player's action-pose for this frame, derived from the live activity
  // flags (no separate state machine) — the rig paints whatever it reads here
  player.pose =
    fishing.casting  ? "fishing" :
    foraging.picking ? "foraging" :
    farmwork.working ? "hoeing" :
    busking.playing  ? "busking" :
    player.moving    ? "walking" : "idle";

  updateHud(economy, wc.calendar, wc.weather);
  updateNeedsStrip(wc.needs, time);
  updateDebugPanel(wc);
  updateBackpack();
  if (scene === "world") updateMinimap(player);   // inside, the dot would be room coords
  updateSkillsUI();
  updateShopWindow();
  updateMemoryBook();
  updateToast(dt);
  draw();
  requestAnimationFrame(tick);
}

function draw() {
  if (scene === "interior") { drawInteriorScene(); return; }
  const { camx, camy, vw, vh } = applyCamera(ctx, cv, player.x, player.y);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(camx, camy, vw, vh);
  ctx.drawImage(ground, 0, 0);
  drawWaterShimmer(ctx, time);
  drawOpenWaterShimmer(ctx, time);       // river + lake surface + fishing-spot ripples
  drawDock(ctx, time);                    // walkable, drawn at ground level under entities
  drawFence(ctx, farm.fence, fieldBounds(farm.plotTiers));
  for (const h of HEDGES) drawHedge(ctx, h, time);   // farm's east natural bound

  // the farm plot inside the fenced field (ground-level, under entities)
  for (const c of plots) {
    if (c.state === "tilled") drawTilledTile(ctx, c.x, c.y);
    else if (c.state === "wilted") drawWiltedTile(ctx, c.x, c.y);
    else if (c.state === "growing" || c.state === "ready")
      drawCropTile(ctx, c.x, c.y, c.growth, time, cropById(c.cropId ?? "")?.palette, c.watered);
  }
  drawBuskSpot(ctx, BUSK_SPOT[0], BUSK_SPOT[1], time);
  FLOWER_BEDS.forEach(([fx, fy], i) => drawFlowerBed(ctx, fx, fy, garden.beds[i]!, time));
  if (busking.playing) drawMusicNotes(ctx, player.x, player.y - 8, time);

  // depth-sorted world objects + entities
  const ents: Array<{ y: number; f: () => void }> = [
    { y: HOUSE.y + HOUSE.h, f: () => drawHouse(ctx, farm.roof, farm.window) },
    { y: OUTHOUSE.y + OUTHOUSE.h, f: () => drawOuthouse(ctx, OUTHOUSE) },
    { y: BARN.y + BARN.h, f: () => drawBarn(ctx, farm.barn) },
    { y: STALL.y + STALL.h, f: () => drawStall(ctx, time) },
    { y: player.y + 13, f: () => drawFarmer(ctx, player, time) },
    // the neighbour farm (cared-for: repaired roof/window/barn) — decorative
    { y: NEIGHBOR.house.y + NEIGHBOR.house.h, f: () => drawHouse(ctx, true, true, NEIGHBOR.house) },
    { y: NEIGHBOR.barn.y + NEIGHBOR.barn.h, f: () => drawBarn(ctx, true, NEIGHBOR.barn) },
    { y: WELL.cy + WELL.r, f: () => drawWell(ctx, WELL.cx, WELL.cy, WELL.r) },
    { y: OLD_BUSK_SIGN[1], f: () => drawBuskSign(ctx, OLD_BUSK_SIGN[0], OLD_BUSK_SIGN[1]) },
  ];
  MARKET_STALLS.forEach((s) => ents.push({ y: s.y + s.h, f: () => drawStall(ctx, time, s, s.awning, s.accent, s.sign) }));
  COTTAGES.forEach((c, i) => ents.push({ y: c.y + c.h, f: () => drawCottage(ctx, c, 700 + i * 37) }));
  for (const [tx, ty] of WORLD_TREES) ents.push({ y: ty + 6, f: () => drawTree(ctx, tx, ty, time) });
  for (const b of bushes) ents.push({ y: b.y + 8, f: () => drawBush(ctx, b.x, b.y, b.full, time) });
  for (const c of cows) ents.push({ y: c.y + 14, f: () => drawCow(ctx, c, time) });
  for (const h of hens) ents.push({ y: h.y + 6, f: () => drawHen(ctx, h, time) });
  // townsfolk, unless indoors (asleep / at home). Name label shows only when
  // this NPC is hovered or in reach — same "only when relevant" rule as prompts.
  for (const n of npcs) {
    if (n.indoors) continue;
    const tag = `npc-${n.def.id}`;
    const showLabel = hovered?.id === tag || nearReach?.id === tag;
    // subtle ♥ Friendship / ⚭ Romance readout on the pill, only when labelled
    const rel = showLabel ? relationshipSummary(n.def, relationships) : undefined;
    ents.push({ y: n.y + 13, f: () => drawNpc(ctx, n, time, showLabel, rel) });
  }
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.f();

  if (hovered) hovered.drawHover(ctx, time);

  for (const s of smoke) {
    ctx.fillStyle = `rgba(230,230,235,${s.a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }

  drawVignette();
}

/** Warm daylight vignette (screen space) — shared by both scenes. */
function drawVignette(inner = "rgba(255,240,200,0)", outer = "rgba(60,50,20,.18)") {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const grd = ctx.createRadialGradient(
    cv.width / 2, cv.height / 2, cv.height * 0.35,
    cv.width / 2, cv.height / 2, cv.height * 0.95
  );
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, cv.width, cv.height);
}

/** The house interior: the small room, centred, on a dark surround. */
function drawInteriorScene() {
  const { camx, camy, vw, vh } = applyCamera(ctx, cv, player.x, player.y, ROOM);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#171209";                     // beyond-the-walls darkness
  ctx.fillRect(camx, camy, vw, vh);
  drawInterior(ctx, time, currentPhase(calendar));
  drawFarmer(ctx, player, time);
  if (hovered) hovered.drawHover(ctx, time);
  drawVignette("rgba(60,45,25,0)", "rgba(15,10,5,.42)");   // dimmer indoors
}

void WORLD_W;
requestAnimationFrame(tick);
