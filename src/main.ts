import {
  WORLD_W, FORAGE_BASE_YIELD, STARTER_SKILL_SEED, STARTING_COINS, COLLAPSE_FEE,
  DIALOGUE_FRIENDSHIP_BUMP, DIALOGUE_TOPIC_FLAG_DAYS, AUTOSAVE_SECONDS, NPC_SALE_FRIENDSHIP_BUMP,
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
  FESTIVAL_LANTERN_SPOTS, FESTIVAL_HARVEST_CLUSTERS, type Rect,
} from "./world/zones";
import { drawInterior } from "./art/interior";
import {
  drawTree, drawFence, drawHedge, drawBush, drawTilledTile, drawCropTile, drawWiltedTile,
  drawFlowerBed, drawBuskSpot, drawMusicNotes, drawWaterShimmer,
  drawOpenWaterShimmer, drawDock, drawBuskSign,
} from "./art/props";
import { drawBunting, drawLanternPole, drawHarvestCluster } from "./art/festival";
import { activeFestival, isFestivalDay } from "./systems/festival";
import { FESTIVALS } from "./data/festivals";
import { drawHouse, drawBarn, drawStall, drawCottage, drawWell, drawOuthouse } from "./art/buildings";
import { drawFarmer, drawCow, drawHen, drawNpc } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals, spawnCow, spawnHen } from "./entities/animals";
import { createWildlife, updateWildlife, type WildlifeInst } from "./entities/wildlife";
import { drawWildlife } from "./art/wildlife";
import { createNpcs, updateNpcs, initNpcPositions, startTalking, npcById, npcNeedComment, type Npc } from "./entities/npc";
import { loadLivestock, resetLivestock, saveLivestock } from "./systems/livestock";
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
import { loadCollections, resetCollections, discover, discoveredName, saveCollections } from "./systems/collections";
import { sellableGoodIds } from "./systems/sellCategories";
import { NPC_STALL_TRADES, type NpcStallTrade } from "./systems/shop";
import { loadMemories, resetMemories, addMemory, saveMemories, attachMemoryFlavor } from "./systems/memories";
import { initMemoryBook, updateMemoryBook } from "./ui/memorybook";
import { initDebugPanel, updateDebugPanel } from "./ui/debugpanel";
import { removeItem, countItem, addItem, ITEM_NAMES } from "./systems/inventory";
import { loadSkills, gainSkill, skillValue, getSkill, saveSkills } from "./systems/skills";
import { saveSettings, guidanceMode, setGuidance, dayLengthSeconds, endOfDaySummaryMode, type Guidance } from "./systems/settings";
import { loadFarm, resetFarm, saveFarm } from "./systems/renovation";
import { loadCalendar, resetCalendar, saveCalendar, advanceMinute, currentSeason, currentPhase, absoluteDay } from "./systems/calendar";
import { loadWeather, resetWeather, rollDailyWeather, isRaining, saveWeather } from "./systems/weather";
import { loadWorldFlags, resetWorldFlags, pruneExpired, setFlag as setWorldFlag, saveWorldFlags } from "./systems/worldFlags";
import {
  loadNeeds, resetNeeds, decayNeeds, recomputeMood, moodPerfMult, applyExertion, applyWalk,
  socialContact, collectWarnings, criticalNeed, applyAccident, collapseRecover,
  restore, edibleHunger, needsRecord, drink, wash, useOuthouse, rest,
  PHYSICAL_NEEDS, type NeedId, saveNeeds,
} from "./systems/needs";
import { loadMeta, saveMeta, characterForPath, type Character, type Path } from "./systems/meta";
import { hasSavedGame, clearSavedGame } from "./systems/saves";
import { stampSave, loadSlot } from "./systems/saveSlots";
import {
  freshDayLog, resetDayLog, logCoinsEarned, logCoinsSpent, logItemsSold,
  logCatch, logHarvest, logForage, logDishCooked, logSkillGain, logDiscovery,
  logMemory, logRelationshipChange,
} from "./systems/daylog";
import {
  initDayEndPanel, showQuickSummary, showFullSummary, updateQuickSummary,
  isDayEndOpen, type DayEndSnapshot,
} from "./ui/dayendpanel";
import { getWorldContext } from "./systems/worldContext";
import {
  loadRelationships, resetRelationships, decayRelationships, giveGift, applyInteraction,
  markContact, relationshipSummary, dialogueBump, saveRelationships,
} from "./systems/relationships";
import { initDialogue, openDialogue, isDialogueOpen, closeDialogue, peekOpeningText } from "./ui/dialoguebox";
import type { ChoiceEffect } from "./systems/dialogue";
// AI features layer (Part D). The whole layer is inert with the master toggle
// off (aiSettings.enabled === false, the default) — every feature falls back to
// authored/template content. See docs/AI_ARCHITECTURE.md.
import {
  AI_PREFETCH_DWELL_SECONDS, AI_PREFETCH_COOLDOWN_MS,
  AI_THOUGHT_BUBBLE_CHANCE, AI_THOUGHT_BUBBLE_COOLDOWN,
} from "./config";
import { loadAiSettings, saveAiSettings } from "./systems/aiSettings";
import { createAiCtx } from "./systems/ai/aiCtx";
import { createAntiRepetition } from "./systems/ai/antiRepetition";
import { createBackstory } from "./systems/ai/features/backstory";
import { createThoughts } from "./systems/ai/features/thoughts";
import { createDialogueVariation } from "./systems/ai/features/dialogueVariation";
import { createNarration } from "./systems/ai/features/narration";
import { createArcs } from "./systems/ai/features/arcs";
import { createQuestStub } from "./systems/ai/features/questStub";
import { createDevNotes } from "./systems/ai/features/devNotes";
import type { NpcDef } from "./data/npcs";
import { isBirthday } from "./data/npcs";
import { heartEvent } from "./systems/heartEvents";
import { isGiftable } from "./data/traitPreferences";
import { INTERACTIONS, interactionLine, type InteractionDef } from "./data/interactions";
import { initGiftChooser, openGiftChooser, closeGiftChooser } from "./ui/giftchooser";
import type { GiftRating } from "./data/traitPreferences";
import type { ThresholdEvent } from "./systems/relationships";
import {
  hitTest, reachable, byId, runAction, runDefault, defaultActionLabel,
  registerBushes, registerPlots, registerAnimal, registerFlowerBeds, registerNpc, registerNpcStall,
  type Interactable, type InteractCtx,
} from "./systems/interact";
import { openContextMenu, closeContextMenu } from "./ui/contextmenu";
import { updateHud, updateNeedsStrip, setPrompt, toast, updateToast } from "./ui/hud";
import { initFade, fadeThrough } from "./ui/fade";
import { initBackpack, updateBackpack } from "./ui/backpack";
import { initMinimap, updateMinimap, setMinimapField } from "./ui/minimap";
import { initSkillsUI, updateSkillsUI, skillGainPopup } from "./ui/skills";
import {
  initShopWindow, openShopWindow, closeShopWindow, isShopOpen, updateShopWindow, openNpcStallWindow,
} from "./ui/shopwindow";
import { hideOpening } from "./ui/titlescreen";
import { showMainMenu, menuConfirm } from "./ui/mainmenu";
import { showSettings } from "./ui/settingsscreen";
import { showPause } from "./ui/pausescreen";
import { showExitDialog } from "./ui/exitscreen";
import { applyGlobalPrefs, applyHudPrefs } from "./ui/uiPrefs";
import { showIntro, showReveal } from "./ui/intro";
import { showPathAndGoal } from "./ui/newgame";
import { showCharacterCreation } from "./ui/charcreation";
import { STARTER_FOOD, pathById } from "./data/paths";
import { lifeGoalAspirationLine } from "./data/guidance";
import {
  loadGuidance, saveGuidance, resetGuidance, startTutorial, startAspiration, markLeftTutorial,
  tutorialInProgress, tutorialAvailable, notifyGuidance, tickGuidanceCoins, currentTutorialStep, currentAspiration,
  type GuidanceEvent, type GuidanceResult,
} from "./systems/guidance";
import {
  initGuidance, setTutorialBubble, setHelpVisible, tutorialBubbleShown, setAspirationPill,
  showGuidancePrompt, hideGuidancePrompt, isGuidancePromptOpen, showGuidancePicker,
} from "./ui/guidance";
import { rigFromCharacter } from "./entities/player";
import type { RigParams } from "./art/rig";
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
const wildlife: WildlifeInst[] = createWildlife();   // ambient, seasonal — not persisted, not player-owned
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
const dayLog = freshDayLog();   // End-of-day summary ledger — not persisted, reset every in-game day
const calendar = loadCalendar();
const weather = loadWeather();
const worldFlags = loadWorldFlags();
const needs = loadNeeds();
const relationships = loadRelationships();
const meta = loadMeta();
const guidance = loadGuidance();   // per-playthrough tutorial/aspiration progress
// the player's drawn look, built from her created Character (rebuilt on New
// Game). Old / pre-character saves fall back to the default farmer rig.
let playerRigParams: RigParams = rigFromCharacter(meta.character);
/** The Starting Path drives which guidance content applies. */
const curPath = (): Path => meta.character?.path ?? "fisher";
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

// NPC stalls of matching specialty (Selling paths #2): Maren's fish stall is
// the only ACTIVE row in `NPC_STALL_TRADES` — a future produce/etc. stall is
// one more row there, not new code here.
for (const trade of NPC_STALL_TRADES) {
  const tradeNpc = npcById(npcs, trade.npcId);
  const stallDef = MARKET_STALLS.find((s) => s.sign === trade.stallSign);
  if (tradeNpc && stallDef) registerNpcStall(trade, tradeNpc, stallDef);
}

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
      const amount = effect.amount ?? DIALOGUE_FRIENDSHIP_BUMP;
      const thresholds = dialogueBump(relationships, def, amount, calendar);
      logRelationshipChange(dayLog, def.id, "friendship", amount);
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
  if (addMemory(memories, h.memoryKey, h.memoryText, calendar)) logMemory(dayLog, h.memoryText);   // once per (npc,axis,threshold)
  toast(h.toast);
  // World-event narration (#5): enrich the scripted toast + attach a Memory Book
  // flavor line. No-op with the feature off (the toast above is unchanged).
  narration.enrich({
    key: `threshold:${npc.def.id}:${ev.axis}:${ev.threshold}`,
    prompt: `${npc.def.name}, the ${npc.def.profession}, and the player have grown closer — their ${ev.axis} just deepened past a milestone.`,
    memoryKey: h.memoryKey,
  });
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
  logRelationshipChange(dayLog, npc.def.id, "friendship", out.delta);   // gifts always move Friendship in v1
  if (out.firstEver) remember("first_gift", "You gave your first gift — a small kindness offered.");
  if (devNotesOn()) devNotes.observe("gift", absoluteDay(calendar));
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
  logRelationshipChange(dayLog, npc.def.id, res.axis, res.applied);
  for (const ev of res.thresholds) fireHeart(npc, ev);
}

// Dev-only test bridge: exposes live state so automated verification can jump
// the clock, snap the townsfolk, and place the player without a fragile
// walk-the-whole-map script. `import.meta.env.DEV` is false in production, so
// this whole block is dead-code-eliminated from the shipped build.
if (import.meta.env.DEV)
  (window as unknown as { __wh: unknown }).__wh = {
    player, npcs, calendar, weather, needs, economy, wildlife,
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
    newGame: () => { newGameReset(meta.character ?? characterForPath("fisher"), guidanceMode()); beginPlay(); startGuidanceForNewGame(guidanceMode()); },
    // start a fresh life on a chosen path + guidance mode without the creation screens
    newGameWith: (path: Path, mode: Guidance = "none") => { newGameReset(characterForPath(path), mode); beginPlay(); startGuidanceForNewGame(mode); },
    meta: () => meta,                             // read the live character/path/goal for verification
    skillOf: (id: string) => skillValue(skills, id),
    invOf: (id: string) => countItem(economy.inv, id),
    // guidance verification bridge — read progress/mode, drive real world spots
    guidance: () => ({ ...guidance }),
    guidanceMode: () => guidanceMode(),
    fireG: (ev: GuidanceEvent) => fireGuidance(ev),
    castPond: () => { const o = byId("pond"); if (o) { player.x = o.anchor[0]; player.y = o.anchor[1]; player.moving = false; clearMoveTarget(); runDefault(o, makeCtx()); } },
    openStallDev: () => { player.x = STALL.x + STALL.w / 2; player.y = STALL.y + STALL.h + 10; player.moving = false; clearMoveTarget(); openPlayerStall(); },
    // save-system verification bridge — force the two save paths and shrink
    // the autosave interval instead of waiting 10 real minutes
    saveNow: manualSave,
    autosaveNow: autosaveTick,
    setAutosaveSeconds: (s: number) => { autosaveSeconds = s; autosaveAccum = 0; },
    // end-of-day summary verification bridge — read/reset the live ledger,
    // set the setting without a Settings screen, and fast-forward a rollover
    // through the REAL minute loop (so daily hooks + the panel fire exactly
    // as in play) without waiting on the sleep fade.
    dayLog: () => ({ ...dayLog }),
    setEodMode: (m: "none" | "quick" | "full") => saveSettings({ endOfDaySummary: m }),
    dayEndOpen: () => isDayEndOpen(),
    advanceDay: () => {
      for (let i = 0; i < 24 * 60; i++) {
        const s = stepGameMinute(false);
        if (s) { presentDayEnd(s); break; }
      }
    },
    // festival-engine verification bridge — time-travel straight to the
    // festival's date/hour and re-snap the townsfolk, instead of fast-
    // forwarding real time through every intervening day
    gotoFestival: (hour = 10) => {
      const f = FESTIVALS[0]!;
      calendar.seasonIndex = f.seasonIndex; calendar.day = f.day; calendar.hour = hour; calendar.minute = 0;
      saveCalendar(calendar);
      setWorldFlag(worldFlags, "festival_today", 1, absoluteDay(calendar));
      initNpcPositions(npcs, calendar, weather);
    },
    isFestivalNow: () => !!activeFestival(calendar),
    // fish-stall NPC trade verification bridge — read the stall's current
    // action label (open "Trade with X" vs. the closed line) without a click,
    // and jump straight into the sell-only window the same way a real click
    // would (goes through the same closed-day/off-hours guard either way)
    stallActions: (npcId: string) =>
      byId(`npc-stall-${npcId}`)?.actions({} as unknown as InteractCtx).map((a) => ({ id: a.id, label: a.label })),
    tradeWith: (npcId: string) => {
      const t = NPC_STALL_TRADES.find((x) => x.npcId === npcId);
      if (t) openNpcStallTrade(t);
    },
  };

initBackpack(economy, eatItem);
initGiftChooser(economy);
// ---- AI features layer (Part D) --------------------------------------------
// One facade + one instance of each feature, wired with explicit callbacks (no
// singletons). With the master toggle off every `enabled()` is false, so the
// hooks below resolve to authored/template content and no call is ever made.
const aiSettings = loadAiSettings();
const aiCtx = createAiCtx(aiSettings, { onToast: toast });
const antiRep = createAntiRepetition();       // feature #7 (per-playthrough, GAME_KEYS)
const backstory = createBackstory(aiCtx);      // feature #1
const thoughts = createThoughts(aiCtx);        // feature #4
// feature #6 story-arc notes are wired in commit 2; empty until then.
let arcNotesFor: (id: string) => string[] = () => [];
const dlgVar = createDialogueVariation({        // feature #2 (the flagship)
  ai: aiCtx,
  antiRep,
  sheetFor: (id) => {
    const n = npcById(npcs, id);
    return n ? {
      name: n.def.name, profession: n.def.profession,
      personality: n.def.personality, backstory: backstory.text(n.def),
    } : null;
  },
  thoughtHint: (id) => thoughts.peek(id),
  arcNotes: (id) => arcNotesFor(id),
});
const narration = createNarration({          // feature #5
  ai: aiCtx, toast,
  attachFlavor: (key, flavor) => { if (attachMemoryFlavor(memories, key, flavor)) logMemory(dayLog, flavor); },
});
const arcs = createArcs();                     // feature #6 (plain-code tracker)
const questStub = createQuestStub(aiCtx);      // feature #3 (validated stub, debug-only)
const devNotes = createDevNotes();             // feature #8 (dev observations)
// arc notes feed the dialogue-variation prompt — only when the arcs feature is on
// (with it off the notes are simply never read, so no scripted content changes).
arcNotesFor = (id) => aiCtx.enabled("arcs") ? arcs.notesFor(id) : [];
/** Dev observations are gated by their own checkbox (default off), token-free. */
const devNotesOn = () => loadAiSettings().features.improve === true;
let stormNarratedSeason = -1;   // seasonIndex whose first storm has been narrated

/** One npc-scoped world snapshot — shared by the dialogue box + the thought/
 *  prefetch hooks so they all read the same "what's true right now". */
function worldForNpc(npcId: string) {
  return getWorldContext(
    { economy, skills, farm, calendar, weather, flags: worldFlags, needs, relationships, location: playerRegion() },
    { npcId },
  );
}

// the dialogue bottom-box: each turn reads ONE npc-scoped world snapshot, routes
// the line through the AI variation seam (scripted verbatim when AI is off), and
// hands effects/close back here. The two meta choices (backstory/thought) resolve
// through the hooks below, with authored/template flat fallbacks.
initDialogue({
  worldFor: worldForNpc,
  applyEffect: applyDialogueEffect,
  renderLine: (req) => dlgVar.render(req),
  backstoryText: (def) => backstory.text(def),
  thoughtText: (def) => thoughts.current(def, worldForNpc(def.id)),
  // anti-repetition consumer (b): scripted variety persists across sessions, but
  // ONLY when the memory feature is on — with AI off this is exactly today's
  // session-only rotation (empty set / no-op record).
  recentScripted: (id) => aiCtx.enabled("memory") ? antiRep.recentScripted(id) : new Set<string>(),
  recordScripted: (id, text) => { if (aiCtx.enabled("memory")) antiRep.recordScripted(id, text); },
  onOpen: (def) => {
    const n = npcById(npcs, def.id);
    if (n) startTalking(n, player.x, player.y);
    backstory.ensureGenerated(def);   // first meaningful interaction → generate once (background)
    arcs.recordTalk(def.id, (absoluteDay(calendar) - 1) % 7);   // play-pattern tracker (#6)
    if (devNotesOn()) devNotes.observe("talk", absoluteDay(calendar));   // dev observations (#8)
  },
  onClose: (def) => {
    socialContact(needs, def.id, absoluteDay(calendar));   // company feeds the Social need
    markContact(relationships, def.id, absoluteDay(calendar));   // any contact holds off decay
  },
});

// Dev-only AI verification bridge — attached to the existing __wh object so the
// Playwright harness can drive the AI paths deterministically under ?aimock.
// Dead-code-eliminated from the shipped build (import.meta.env.DEV === false).
if (import.meta.env.DEV) {
  const wh = (window as unknown as { __wh: Record<string, unknown> }).__wh;
  if (wh) wh.ai = {
    provider: () => aiCtx.providerKind,
    enabled: (f: string) => aiCtx.enabled(f as never),
    setImprove: (on: boolean) => saveAiSettings({ features: { ...loadAiSettings().features, improve: on } }),
    antiRepSize: () => antiRep.size(),
    backstoryGenerated: (id: string) => backstory.isGenerated(id),
    backstoryText: (id: string) => { const n = npcById(npcs, id); return n ? backstory.text(n.def) : null; },
    ensureBackstory: (id: string) => { const n = npcById(npcs, id); if (n) backstory.ensureGenerated(n.def); },
    thought: (id: string) => { const n = npcById(npcs, id); return n ? thoughts.current(n.def, worldForNpc(id)) : null; },
    peekOpening: (id: string) => { const n = npcById(npcs, id); return n ? peekOpeningText(n.def, worldForNpc(id)) : null; },
    prefetchOpening: (id: string) => { const n = npcById(npcs, id); if (n) { const wc = worldForNpc(id); dlgVar.prefetch(id, "opening", peekOpeningText(n.def, wc), wc); } },
    varReady: (id: string, purpose: "opening" | "reply", scripted: string) => dlgVar.isReady(id, purpose, scripted, worldForNpc(id)),
    lastDialoguePrompt: () => dlgVar.lastPrompt(),
    dlgLine: () => document.getElementById("dlgText")?.textContent ?? null,
    dlgButtons: () => Array.from(document.querySelectorAll("#dlgChoices .dlg-choice")).map((b) => (b.textContent ?? "")),
    // commit 2 — narration / arcs / quest stub / dev notes
    setImproveOn: (on: boolean) => saveAiSettings({ features: { ...loadAiSettings().features, improve: on } }),
    fireThreshold: (id: string, axis: "friendship" | "romance", threshold: number) => { const n = npcById(npcs, id); if (n) fireHeart(n, { axis, threshold }); },
    memories: () => memories.entries.map((e) => ({ key: e.key, text: e.text, flavor: e.flavor ?? null })),
    arcRecordTalk: (id: string, dow: number) => arcs.recordTalk(id, dow),
    arcRecordActivity: (k: "cast" | "harvest" | "busk" | "forage" | "sale") => arcs.recordActivity(k),
    arcNotes: (id: string) => aiCtx.enabled("arcs") ? arcs.notesFor(id) : [],
    arcSnapshot: () => arcs.snapshot(),
    questGenerate: (day: number) => questStub.maybeGenerateDaily(worldForNpc("maren"), day),
    questLatest: () => questStub.latest(),
    devObserve: (k: string, day: number) => devNotes.observe(k, day),
    devNotes: (day: number) => devNotes.notes(day),
  };
}
initMinimap();
initSkillsUI(skills);
initMemoryBook(collections, memories);
initDebugPanel();
initFade();
initDayEndPanel();
initGuidance({ onSkipTutorial: skipTutorial });

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
  if (addMemory(memories, key, text, calendar)) { toast(`✒ ${text}`); logMemory(dayLog, text); }
}

/** Records a species/find discovery; celebrates only the first time. Returns true
 *  when it was newly discovered (so callers can narrate the first-ever catch). */
function record(category: "fish" | "forage", id: string): boolean {
  if (discover(collections, category, id)) {
    const name = discoveredName(id);
    toast(`New in your book: ${name}.`);
    logDiscovery(dayLog, name);
    return true;
  }
  return false;
}
initShopWindow(economy, skills, farm, livestock,
  (kind) => {
    if (kind === "cow") { const c = spawnCow(); cows.push(c); registerAnimal("cow", c, cows); }
    else { const h = spawnHen(); hens.push(h); registerAnimal("hen", h, hens); }
  },
  () => currentSeason(calendar),
  () => sellableGoodIds({ inv: economy.inv, collections }),
  toast, remember,
  (coins, qty) => {
    logCoinsEarned(dayLog, coins); logItemsSold(dayLog, qty); fireGuidance({ kind: "sale" });
    arcs.recordActivity("sale");
    if (devNotesOn()) devNotes.observe("sell", absoluteDay(calendar));
  },
  (coins) => { logCoinsSpent(dayLog, coins); fireGuidance({ kind: "buy" }); });

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

// ---- stall trade windows: which rect the player must stay near to keep the
// window open (the farm stall, or whichever NPC-specialty stall is open) ----
let openStallRect: Rect | null = null;

function openPlayerStall() {
  openStallRect = STALL;
  openShopWindow();
}

/** Fish-stall NPC buying (Selling paths #2): opens Maren's sell-only window
 *  while she's manning the stall; otherwise just repeats the closed line (the
 *  stall's own action already gates this, this is belt-and-braces). */
function openNpcStallTrade(trade: NpcStallTrade) {
  const tradeNpc = npcById(npcs, trade.npcId);
  if (!tradeNpc || tradeNpc.state !== "atWork") { toast(trade.closedLine); return; }
  const stallDef = MARKET_STALLS.find((s) => s.sign === trade.stallSign);
  openStallRect = stallDef ?? STALL;
  openNpcStallWindow(tradeNpc.def.name, trade.categoryId, () => onNpcSale(trade.npcId));
}

/** First sale to an NPC-specialty stall: a small Friendship bump (dialogueBump
 *  marks contact too) + a toast reaction, gated by the Memory Book entry's
 *  once-only semantics — safe to call on every sale, like the farm stall's
 *  own "first_sale" memory call. */
function onNpcSale(npcId: string) {
  const seller = npcById(npcs, npcId);
  if (!seller) return;
  const text = `Your first sale to ${seller.def.name}, at the stall.`;
  if (addMemory(memories, `first_sale_${npcId}`, text, calendar)) {
    logMemory(dayLog, text);
    const thresholds = dialogueBump(relationships, seller.def, NPC_SALE_FRIENDSHIP_BUMP, calendar);
    logRelationshipChange(dayLog, npcId, "friendship", NPC_SALE_FRIENDSHIP_BUMP);
    toast(`${seller.def.name} gives a small approving nod. (+${NPC_SALE_FRIENDSHIP_BUMP} ♥)`);
    for (const ev of thresholds) fireHeart(seller, ev);
  }
}

// ---- opening sequence (title -> creation -> intro -> reveal -> path -> guidance) ----
let openingActive = true;
let menuOpen = false;  // an in-game top-level menu (Settings/Pause/Exit) is open — pauses time
let minuteAccum = 0;   // real seconds banked toward the next in-game minute
let timeSkipping = false;   // true during a sleep/collapse fade — world time PAUSES (never teleports)
let lastDist = player.dist; // player travel last frame, for charging walking energy
const npcCommentDay: Record<string, number> = {};   // needId -> absoluteDay an NPC last remarked on it
// AI dialogue prefetch + ambient thought bookkeeping (Part D #2, #4).
let dwellNpcId: string | null = null;                // the NPC the player is currently lingering by
let dwellSeconds = 0;                                 // how long she's lingered (drives opening prefetch)
const npcPrefetchAt: Record<string, number> = {};    // ms of the last opening prefetch per NPC
const npcThoughtDay: Record<string, number> = {};    // absoluteDay an NPC last voiced an ambient thought
let festivalGreetedDay = -1;   // absoluteDay the market-entry festival toast last fired

/** One in-game minute: roll the clock, fire the daily hooks on a new day, drain
 *  needs. The single source of truth for time passing — both the live tick and
 *  the sleep/collapse skip call it, so a skipped night fires every daily hook
 *  exactly as a played-out one would (weather reroll, flag prune, crop aging).
 *  Returns a day-end snapshot exactly on the tick a day rolls over (End-of-day
 *  summary engine) — the caller decides WHEN to actually show it (immediately
 *  for the live tick, after the fade completes for sleep/nap/collapse), so a
 *  night slept through never flashes a panel behind the black screen. */
function stepGameMinute(sleeping: boolean): DayEndSnapshot | null {
  const endedDay = absoluteDay(calendar);   // captured BEFORE the clock advances (year-wrap safe)
  const endedSeason = currentSeason(calendar);
  const endedDayNum = calendar.day;
  let snapshot: DayEndSnapshot | null = null;
  if (advanceMinute(calendar)) {
    rollDailyWeather(weather, currentSeason(calendar));
    pruneExpired(worldFlags, absoluteDay(calendar));
    rollPlotsDay(plots, isRaining(weather));   // rain waters for free; dry crops bank a day toward wilting
    // neglect decay: any NPC not contacted during the day that just ended drifts
    // down (faster the shallower the bond); also expires a stale birthday flag
    decayRelationships(relationships, endedDay, absoluteDay(calendar));
    // Festival engine: on the morning a festival falls, raise the world flag
    // dialogue's condition system reads (data/dialogue/shared.ts's shared
    // festival opening line) — a 1-day flag, self-clearing the day after.
    if (isFestivalDay(calendar)) setWorldFlag(worldFlags, "festival_today", 1, absoluteDay(calendar));
    // ---- AI daily hooks (Part D) — all no-ops with their features off --------
    const abs = absoluteDay(calendar);
    // Quest-generation stub (#3): build one validated offer for the debug panel.
    questStub.maybeGenerateDaily(
      getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags, needs, relationships }),
      abs,
    );
    // Event narration (#5): the season's first storm.
    if (weather.kind === "storm" && stormNarratedSeason !== calendar.seasonIndex) {
      stormNarratedSeason = calendar.seasonIndex;
      const s = currentSeason(calendar);
      narration.announce({ key: `storm:${abs}`, fallback: `The first storm of ${s} rolls in.`, prompt: `The first storm of ${s} rolls over Wildhearth.` });
    }
    // Event narration (#5): any NPC whose birthday is today.
    for (const n of npcs)
      if (isBirthday(n.def, calendar.seasonIndex, calendar.day))
        narration.announce({ key: `birthday:${n.def.id}:${calendar.seasonIndex}:${calendar.day}`, fallback: `It's ${n.def.name}'s birthday today.`, prompt: `Today is ${n.def.name}'s (${n.def.profession}) birthday in the village.` });
    // a shallow copy is enough: resetDayLog() REASSIGNS dayLog's nested
    // objects/arrays to fresh ones rather than mutating them in place, so the
    // snapshot's references stay untouched by the reset below.
    snapshot = { season: endedSeason, day: endedDayNum, log: { ...dayLog } };
    resetDayLog(dayLog);   // a fresh ledger for the day that just began
  }
  decayNeeds(needs, { season: currentSeason(calendar), weather: weather.kind, sleeping });
  return snapshot;
}

/** Shows the just-ended day's ledger per the player's endOfDaySummary setting
 *  ("none" is silent). "full" pauses game-time until dismissed — see isDayEndOpen(). */
function presentDayEnd(snap: DayEndSnapshot) {
  const mode = endOfDaySummaryMode();
  if (mode === "none") return;
  if (mode === "quick") showQuickSummary(snap);
  else showFullSummary(snap, () => {});
}

/** One LIVE in-game minute (awake): advance time + needs, fire escalating
 *  warnings, and trigger a collapse/accident if a need bottomed out. Returns
 *  true if a collapse started (the caller stops advancing time for the fade). */
function liveMinute(): boolean {
  const snap = stepGameMinute(false);
  if (snap) presentDayEnd(snap);
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
  let pendingDayEnd: DayEndSnapshot | null = null;
  fadeThrough(
    () => { for (let i = 0; i < mins; i++) { const s = stepGameMinute(true); if (s) pendingDayEnd = s; } },
    "You sleep until morning…",
    () => {
      timeSkipping = false;
      toast("A new day. You wake rested. ☀");
      if (pendingDayEnd) presentDayEnd(pendingDayEnd);   // shown AFTER the fade — never behind the black screen
    },
  );
}

/** A one-hour nap: the same skip, an hour long. */
function napAnHour() {
  if (timeSkipping) return;
  timeSkipping = true;
  let pendingDayEnd: DayEndSnapshot | null = null;
  fadeThrough(
    () => { for (let i = 0; i < 60; i++) { const s = stepGameMinute(true); if (s) pendingDayEnd = s; } },
    "You nap for an hour…",
    () => { timeSkipping = false; if (pendingDayEnd) presentDayEnd(pendingDayEnd); },
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
  let pendingDayEnd: DayEndSnapshot | null = null;
  fadeThrough(
    () => {
      for (let i = 0; i < mins; i++) { const s = stepGameMinute(true); if (s) pendingDayEnd = s; }
      collapseRecover(needs);
      fee = Math.min(COLLAPSE_FEE, Math.max(0, economy.coins));   // never go negative
      economy.coins -= fee;
      saveEconomy(economy);
      logCoinsSpent(dayLog, fee);   // charged on waking — the new day's ledger, not the one that ended
      wakeAtBed();
    },
    "You collapse…",
    () => {
      timeSkipping = false;
      toast(fee > 0
        ? `You collapsed from ${label}. A neighbour found you and helped you home. (−${fee} coins)`
        : `You collapsed from ${label}. A neighbour helped you home — you'll owe them a favour.`);
      if (pendingDayEnd) presentDayEnd(pendingDayEnd);
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

/** Proximity prefetch (Part D #2): when the player lingers ~2s within talk range,
 *  prefetch a variation of this NPC's most-likely opening for the current moment,
 *  so the NEXT conversation opens already varied. Non-blocking, per-NPC cooldown. */
function maybeNpcPrefetch(npcTagId: string, dt: number) {
  const id = npcTagId.slice("npc-".length);
  if (!aiCtx.enabled("dialogue")) { dwellNpcId = null; dwellSeconds = 0; return; }
  if (dwellNpcId !== id) { dwellNpcId = id; dwellSeconds = 0; }
  dwellSeconds += dt;
  if (dwellSeconds < AI_PREFETCH_DWELL_SECONDS) return;
  const nowMs = performance.now();
  if (nowMs - (npcPrefetchAt[id] ?? -Infinity) < AI_PREFETCH_COOLDOWN_MS) return;
  const n = npcById(npcs, id);
  if (!n) return;
  npcPrefetchAt[id] = nowMs;
  const wc = worldForNpc(id);
  dlgVar.prefetch(id, "opening", peekOpeningText(n.def, wc), wc);
}

/** The debug panel's read of the latest AI quest offer (never shown to the player). */
function questOfferDebugLines(): string[] {
  const q = questStub.latest();
  if (!q) return aiCtx.enabled("quests") ? ["(none generated yet — waits for a day rollover)"] : ["(quests feature off)"];
  return [`"${q.title}" — ${q.text}`, `questId=${q.questId}  reward=${q.reward}  (day ${q.day})`];
}

/** Ambient thought bubble (Part D #4): occasionally, when the player walks close
 *  to an NPC idling at work/socializing, they voice their current thought — at
 *  most once per NPC per day. Flat fallback thoughts still apply with AI off, but
 *  the ambient bubble itself is an AI-thoughts-feature flourish (gated). */
function maybeNpcThought(npcTagId: string) {
  if (!aiCtx.enabled("thoughts")) return;
  const id = npcTagId.slice("npc-".length);
  const npc = npcs.find((n) => n.def.id === id);
  if (!npc || npc.moving || npc.talkTimer > 0) return;
  if (!(npc.state === "atWork" || npc.state === "socializing" || npc.state === "festival")) return;
  const day = absoluteDay(calendar);
  if (npcThoughtDay[id] === day) return;                 // one ambient thought per NPC per day
  if (Math.random() > AI_THOUGHT_BUBBLE_COOLDOWN) return; // occasional per-frame trigger
  if (Math.random() > AI_THOUGHT_BUBBLE_CHANCE) return;   // ~15% of those actually speak
  npcThoughtDay[id] = day;
  toast(`${npc.def.name}: “${thoughts.current(npc.def, worldForNpc(id))}”`);
}

function beginPlay() {
  hideOpening();
  openingActive = false;
  consumeAction(); consumeLeftClick(); consumeRightClick(); clearMoveTarget();
  refreshGuidanceUI(true);   // show the tutorial bubble / aspiration pill for the loaded mode
}

// ---- Guidance Mode orchestration (Part A #5) ------------------------------
// The engine (systems/guidance.ts) owns progress + logic and returns effects;
// this layer wires the world's real action handlers to it, drives the bubble/
// pill/help DOM, and freezes the in-game clock while a tutorial step is up.
let lastTutStep = -1;

/** True while a tutorial step bubble is showing — the in-game clock pauses. */
function guidanceClockFrozen(): boolean {
  return guidanceMode() === "tutorial" && !guidance.tutorialDone && tutorialBubbleShown();
}

/** Refresh the bubble / pill / help from the live mode + progress. `force`
 *  re-opens a dismissed bubble (used the frame a step advances). */
function refreshGuidanceUI(force = false) {
  const mode = guidanceMode();
  if (mode === "tutorial" && !guidance.tutorialDone) {
    const advanced = force || guidance.tutorialStep !== lastTutStep;
    setTutorialBubble(currentTutorialStep(guidance, curPath()), advanced);
    setHelpVisible(true);
    setAspirationPill(null);
  } else if (mode === "aspiration" && !guidance.aspirationDone) {
    setTutorialBubble(null, false);
    setHelpVisible(false);
    setAspirationPill(currentAspiration(guidance, curPath(), economy.coins));
  } else {
    setTutorialBubble(null, false);
    setHelpVisible(false);
    setAspirationPill(null);
  }
  lastTutStep = guidance.tutorialStep;
}

/** Apply an engine result: toasts, Memory Book entries, and — on the last
 *  tutorial step — the silent switch to None + the farewell line (ask nothing). */
function applyGuidanceResult(res: GuidanceResult) {
  for (const t of res.toasts) toast(t);
  for (const [k, txt] of res.memories) remember(k, txt);
  if (res.finishedTutorial) {
    setGuidance("none");
    markLeftTutorial(guidance);
    toast("The farm is yours. Make of it what you will.");
  }
  refreshGuidanceUI(res.advanced);
}

/** A world event advances guidance — called from the real action handlers. */
function fireGuidance(ev: GuidanceEvent) {
  if (guidanceMode() === "none") return;
  applyGuidanceResult(notifyGuidance(guidance, guidanceMode(), curPath(), ev));
}

/** Builds the interaction context (used by the tick and the dev bridge). The
 *  `guidanceEvent` seam lets interactables (repair / expand) advance guidance. */
function makeCtx(): InteractCtx {
  return {
    economy, fishing, foraging, farmwork, busking, cooking, skills, farm, garden, needs,
    relationships, calendar, player,
    toast, openShop: openPlayerStall, enterHouse, leaveHouse,
    sleep: sleepUntilMorning, nap: napAnHour,
    skillPopup: skillGainPopup,
    memory: remember,
    expandFarm, openGiftFor, doInteraction,
    openNpcTrade: openNpcStallTrade,
    guidanceEvent: fireGuidance,
  };
}

/** Per-frame: coins-threshold aspiration steps + the pill's live counter. */
function tickGuidance() {
  const mode = guidanceMode();
  if (mode === "aspiration" && !guidance.aspirationDone) {
    const res = tickGuidanceCoins(guidance, mode, curPath(), economy.coins);
    if (res.advanced || res.toasts.length) applyGuidanceResult(res);
  }
  refreshGuidanceUI(false);
}

/** New Game: start the chosen mode (progress already reset in newGameReset). */
function startGuidanceForNewGame(mode: Guidance) {
  if (mode === "tutorial") startTutorial(guidance);
  else if (mode === "aspiration") {
    startAspiration(guidance);
    if (meta.character) toast(lifeGoalAspirationLine(meta.character.lifeGoal));
  }
  refreshGuidanceUI(true);
}

/** Skip Tutorial: confirm first, then a ONE-WAY switch to None (per DECISIONS —
 *  can't return to the tutorial afterwards). */
function skipTutorial() {
  showGuidancePrompt("Skip the tutorial? You won't be able to return to it.", [
    { label: "Skip tutorial", id: "gpSkipYes", onClick: () => {
        hideGuidancePrompt();
        setGuidance("none");
        markLeftTutorial(guidance);
        toast("On your own from here. The farm is yours to make.");
        refreshGuidanceUI(true);
      } },
    { label: "Keep learning", id: "gpSkipNo", onClick: () => hideGuidancePrompt() },
  ]);
}

/** Continue: if a tutorial was mid-progress, ask before resuming (DECISIONS —
 *  "continue Tutorial?" or switch to Aspiration / None). */
function continueGame() {
  if (tutorialInProgress(guidanceMode(), guidance)) {
    showGuidancePrompt("Continue the tutorial where you left off?", [
      { label: "Continue the tutorial", id: "gpContYes", onClick: () => { hideGuidancePrompt(); beginPlay(); } },
      { label: "Switch to Aspiration", id: "gpContAsp", onClick: () => {
          hideGuidancePrompt();
          setGuidance("aspiration"); markLeftTutorial(guidance); startAspiration(guidance);
          if (meta.character) toast(lifeGoalAspirationLine(meta.character.lifeGoal));
          beginPlay();
        } },
      { label: "Switch to None", id: "gpContNone", onClick: () => {
          hideGuidancePrompt();
          setGuidance("none"); markLeftTutorial(guidance);
          beginPlay();
        } },
    ]);
  } else beginPlay();
}

function newGameReset(character: Character, mode: Guidance) {
  clearSavedGame();                 // wipe every game-state key first, then re-seed fresh
  const path = pathById(character.path);
  economy.coins = STARTING_COINS;   // 50 — the anchor-table purse, "enough for one starter choice"
  economy.inv.slots.fill(null);
  for (const [id, n] of path.kit) addItem(economy.inv, id, n);        // path kit (tool + specifics)
  for (const [id, n] of STARTER_FOOD) addItem(economy.inv, id, n);    // + 2-3 days of food (all paths)
  saveEconomy(economy);
  for (const s of skills.list) { s.value = 0; s.lock = "up"; }
  const seeded = getSkill(skills, path.skill);                        // seed the path's preferred skill
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
  // AI feature stores are per-playthrough: a new life meets everyone fresh, with
  // no said-history, no generated backstories, no current thoughts.
  antiRep.reset();
  backstory.reset();
  thoughts.reset();
  narration.reset();
  arcs.reset();
  questStub.reset();
  devNotes.reset();
  stormNarratedSeason = -1;
  resetLivestock(livestock);
  cows.length = 0; hens.length = 0;   // the yard empties with the new life
  initNpcPositions(npcs, calendar, weather);   // re-snap townsfolk to fresh day-1 morning
  meta.character = character;
  meta.starterTool = path.tool;       // kept in sync for the systems that still read it
  saveMeta(meta);
  playerRigParams = rigFromCharacter(character);   // she now looks like the person she made
  setGuidance(mode);                  // the Guidance Mode is a setting (kept across a New Game)
  resetGuidance(guidance);            // per-playthrough tutorial/aspiration progress starts fresh
}

// ---- Save system (Part A #11): every store already saves itself on every
// mutation (the codebase's continuous-save convention) — this is the belt-
// and-braces "force everything to disk right now" path used by the manual
// save icon and the periodic autosave, plus the slot manifest that stamps
// WHEN and records a glance-able summary (season/day/coins) for a future
// Continue screen. `autosaveSeconds` is a `let`, not the raw config constant,
// so the dev bridge can shrink it for automated verification without editing
// config.ts.
function saveAllStores() {
  saveEconomy(economy);
  saveSkills(skills);
  saveFarm(farm);
  savePlots(plots);
  saveGarden(garden);
  saveLivestock(livestock);
  saveCalendar(calendar);
  saveWeather(weather);
  saveWorldFlags(worldFlags);
  saveNeeds(needs);
  saveRelationships(relationships);
  saveCollections(collections);
  saveMemories(memories);
}

function manualSave() {
  saveAllStores();
  saveGuidance(guidance);
  stampSave(calendar, economy.coins, guidanceMode());
  toast("Game saved. 💾");
}

let autosaveSeconds = AUTOSAVE_SECONDS;
let autosaveAccum = 0;
function autosaveTick() {
  saveAllStores();
  saveGuidance(guidance);
  stampSave(calendar, economy.coins, guidanceMode());
  toast("Autosaved.");
}

document.getElementById("saveBtn")!.addEventListener("click", manualSave);

// New Game flow (DECISIONS "Opening flow" + VISION "Opening sequence"):
// character creation (identity/appearance) → intro story → farm reveal →
// starting path + life-goal → guidance → play. Identity is collected first,
// then carried through the intro/reveal in this closure and joined with the
// path/goal chosen AFTER seeing the place.
function startNewGameFlow() {
  showCharacterCreation((identity) =>
    showIntro(() => showReveal(() =>
      showPathAndGoal((path, lifeGoal) => {
        const character: Character = { ...identity, path, lifeGoal };
        showGuidancePicker((mode) => {
          newGameReset(character, mode);
          beginPlay();
          startGuidanceForNewGame(mode);
        });
      }))));
}

/** Wipe the saved game and return to a fresh title screen. A reload guarantees
 *  a clean teardown of the in-memory play session (no dangling stores/loops). */
function deleteSaveToTitle() {
  clearSavedGame();
  location.reload();
}

/** Close whichever in-game top-level menu (Settings/Pause/Exit) is up and hand
 *  control back to live play, draining any input queued behind the overlay. */
function closeInGameMenu() {
  menuOpen = false;
  hideOpening();
  consumeAction(); consumeLeftClick(); consumeRightClick();
}

/** The SettingsCtx used for the two in-game entry points (⚙ button, Pause →
 *  Settings) — only the `onBack` differs (resume play vs. return to Pause). */
function inGameSettingsCtx(onBack: () => void) {
  return {
    onBack, onSaveNow: manualSave, onDeleteSave: deleteSaveToTitle,
    slot: loadSlot(), hasSave: hasSavedGame(),
    tutorialAvailable: tutorialAvailable(guidance), inGame: true,
  };
}

/** Settings from the title menu — returns to the menu, no play session to pause. */
function openSettingsFromMenu() {
  showSettings({
    onBack: openMainMenu,
    onSaveNow: manualSave,
    onDeleteSave: deleteSaveToTitle,
    slot: loadSlot(),
    hasSave: hasSavedGame(),
    tutorialAvailable: tutorialAvailable(guidance),
    inGame: false,
  });
}

/** Settings from the ⚙ HUD button in-game — pauses game-time (like dialogue)
 *  while it's open, and drains any queued world input on close. */
function openSettingsInGame() {
  if (openingActive) return;      // the menu/creation overlays own their own flow
  menuOpen = true;
  showSettings(inGameSettingsCtx(closeInGameMenu));
}
document.getElementById("settingsBtn")!.addEventListener("click", openSettingsInGame);

/** Return to Main Menu (Pause / Exit dialog): confirm, autosave, then reload —
 *  the reload is the guaranteed-clean teardown; re-entry is via Continue. The
 *  cancel path just drops the confirm scrim, revealing Pause underneath. */
function returnToMainMenu() {
  menuConfirm(
    "Return to the main menu?",
    "Your game will be saved first — you can pick up right where you left off.",
    "Return to menu",
    () => { manualSave(); location.reload(); },
    () => {},
  );
}

/** The pause screen (Esc / ⏸). Re-renders itself as the return target for the
 *  in-game Settings and Exit sub-screens. */
function showPauseScreen() {
  showPause({
    onResume: closeInGameMenu,
    onSave: manualSave,
    onSettings: () => showSettings(inGameSettingsCtx(showPauseScreen)),
    onReturnToMenu: returnToMainMenu,
    onExit: () => showExitDialog({
      fromGame: true,
      onExitToMenu: returnToMainMenu,
      onSaveBeforeExit: () => { saveAllStores(); saveGuidance(guidance); stampSave(calendar, economy.coins, guidanceMode()); },
      onBack: showPauseScreen,
    }),
  });
}

/** Open Pause in-game — only during live free play (never over another overlay,
 *  a time-skip fade, or the opening flow). */
function openPause() {
  if (openingActive || menuOpen || timeSkipping) return;
  if (isDialogueOpen() || isDayEndOpen() || isGuidancePromptOpen() || isShopOpen()) return;
  menuOpen = true;
  showPauseScreen();
}
document.getElementById("pauseBtn")!.addEventListener("click", openPause);

// Esc opens Pause during play. In-game overlays that own Esc (dialogue, shop,
// the day-end panel, the guidance prompt) consume it on the capture phase and
// stop propagation, so this bubble-phase handler only ever fires in free play.
addEventListener("keydown", (e) => { if (e.key === "Escape") openPause(); });

/** The boot title screen (and the screen returned to from its sub-screens). */
function openMainMenu() {
  showMainMenu({
    hasSave: hasSavedGame(),
    slot: loadSlot(),
    onContinue: continueGame,
    onNewGame: startNewGameFlow,
    onSettings: openSettingsFromMenu,
    onExit: () => showExitDialog({
      fromGame: false,
      onExitToMenu: () => {},          // no in-game session to return from at the title
      onSaveBeforeExit: () => {},      // nothing to flush before the farewell here
      onBack: openMainMenu,
    }),
  });
}

// apply the persisted Interface preferences (font scale / contrast / colorblind
// hook, and which HUD widgets show) once at boot; the Settings screen re-applies
// them live on change.
applyGlobalPrefs();
applyHudPrefs();

openMainMenu();

let hovered: Interactable | null = null;              // object under the cursor (for the glow)
let nearReach: Interactable | null = null;            // object in reach (drives NPC name labels)
let pending: { objId: string; actionId: string } | null = null;  // action to run once in reach

let last = performance.now(), time = 0;

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;

  updateAnimals(cows, hens, dt);   // ambience runs even behind the opening screens
  updateWildlife(wildlife, currentSeason(calendar), weather.kind, player, dt);   // seasonal ambient critters
  updateQuickSummary(dt);          // the "quick" end-of-day pill fades on its own, even while paused
  // auto-pause: a conversation OR the full end-of-day panel freezes game-time
  // AND the townsfolk (they're "in conversation" / the day is officially over)
  // — the same gating pattern the title screen uses below.
  const timePaused = isDialogueOpen() || isDayEndOpen() || isGuidancePromptOpen() || menuOpen;
  if (!timePaused) updateNpcs(npcs, calendar, weather, player, dt);

  if (!openingActive && !timePaused) {
  // autosave: counts real seconds of actual play (paused whenever the block
  // above is skipped — title screen / dialogue), fires + resets on the knob.
  autosaveAccum += dt;
  if (autosaveAccum >= autosaveSeconds) { autosaveAccum = 0; autosaveTick(); }

  const wasMoving = player.moving;
  updatePlayer(player, dt);
  // Guidance (Tutorial step 0 only): clears on ~3s of real walking
  if (player.moving && guidanceMode() === "tutorial" && !guidance.tutorialDone && guidance.tutorialStep === 0)
    fireGuidance({ kind: "move", seconds: dt });
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
  // minute. Paused while a sleep/collapse fade drives the same loop itself, and
  // while a Tutorial step bubble is up (DECISIONS: "in Tutorial time pauses per step").
  if (!timeSkipping && !guidanceClockFrozen()) {
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
  const ictx: InteractCtx = makeCtx();

  // walking away from whichever stall is open closes the trade window
  if (isShopOpen() && openStallRect && !nearRect(player.x, player.y, openStallRect)) closeShopWindow();

  const ps = getPointerScreen();
  hovered = ps ? hitTest(...screenToWorld(ps[0], ps[1]), scene) : null;
  cv.style.cursor = hovered ? "pointer" : "default";

  const near = reachable(player.x, player.y, scene);
  nearReach = near;
  if (near && near.id.startsWith("npc-")) {
    maybeNpcComment(near.id);    // "you look tired" (needs)
    maybeNpcThought(near.id);    // ambient current-thought bubble (AI #4)
    maybeNpcPrefetch(near.id, dt);   // linger → prefetch opening variation (AI #2)
  } else { dwellNpcId = null; dwellSeconds = 0; }
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
        const firstOfKind = record("fish", haul.id);
        remember("first_catch", "Your first catch — the water gave something back.");
        logCatch(dayLog);
        fireGuidance({ kind: "catch" });   // Guidance: fisher tutorial/aspiration progress
        // World-event narration (#5): the first catch of a NEW species.
        if (firstOfKind) narration.enrich({ key: `species:${haul.id}`, prompt: `The player just landed their first ${haulName.toLowerCase()} — a new species for their book.` });
      }
    } else toast("Backpack full — the catch slips away!");
    arcs.recordActivity("cast");   // play-pattern tracker (#6)
    if (devNotesOn()) devNotes.observe("fish", absoluteDay(calendar));
    applyExertion(needs, "fishing");
    const gained = gainSkill(skills, "fishing", moodPerfMult(needs));
    if (gained > 0) { skillGainPopup("fishing", gained); logSkillGain(dayLog, "fishing", gained); }
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
      logForage(dayLog);
    } else toast("Backpack full — no room for the find!");
    arcs.recordActivity("forage");
    if (devNotesOn()) devNotes.observe("forage", absoluteDay(calendar));
    applyExertion(needs, "foraging");
    const gained = gainSkill(skills, "foraging", moodPerfMult(needs));
    if (gained > 0) { skillGainPopup("foraging", gained); logSkillGain(dayLog, "foraging", gained); }
  }
  if (updateBusking(busking, dt)) {
    // mood colours a performance: a low spirit plays flat, a high one shines
    const tip = Math.max(1, Math.round(rollTip(skillValue(skills, "busking")) * moodPerfMult(needs)));
    economy.coins += tip;
    saveEconomy(economy);
    toast(`Earned ${tip} coin${tip === 1 ? "" : "s"} busking! 🎶`);
    logCoinsEarned(dayLog, tip);
    remember("first_busk", "You played for strangers, and they paid — first tips.");
    fireGuidance({ kind: "busk", tip });   // Guidance: musician tutorial/aspiration progress
    arcs.recordActivity("busk");
    if (devNotesOn()) devNotes.observe("busk", absoluteDay(calendar));
    applyExertion(needs, "busking");
    const gained = gainSkill(skills, "busking", moodPerfMult(needs));
    if (gained > 0) { skillGainPopup("busking", gained); logSkillGain(dayLog, "busking", gained); }
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
        logDishCooked(dayLog);
        fireGuidance({ kind: "cook" });   // Guidance: keeper tutorial/aspiration progress
        if (devNotesOn()) devNotes.observe("cook", absoluteDay(calendar));
      } else toast("Backpack full — the dish burns while you rummage!");
      const gained = gainSkill(skills, "cooking", moodPerfMult(needs));
      if (gained > 0) { skillGainPopup("cooking", gained); logSkillGain(dayLog, "cooking", gained); }
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
        fireGuidance({ kind: "plant" });   // Guidance: farmer tutorial/aspiration progress
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
        logHarvest(dayLog);
        fireGuidance({ kind: "harvest" });   // Guidance: farmer aspiration progress
        arcs.recordActivity("harvest");
        if (devNotesOn()) devNotes.observe("farm", absoluteDay(calendar));
        const gained = gainSkill(skills, "farming", moodPerfMult(needs));
        if (gained > 0) { skillGainPopup("farming", gained); logSkillGain(dayLog, "farming", gained); }
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
  // Festival engine: first time entering the market during festival hours
  // TODAY, greet it with a toast; the very first time EVER, that's also the
  // Memory Book entry (remember() only celebrates it once, ever).
  if (region === "market" && activeFestival(calendar) && festivalGreetedDay !== absoluteDay(calendar)) {
    festivalGreetedDay = absoluteDay(calendar);
    remember("first_harvest_festival", "Your first Harvest Festival — banners over the square, music in the air.");
    toast("The square is alive with the Harvest Festival! 🎉");
  }
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

  updateHud(economy, wc.calendar, wc.weather, isFestivalDay(calendar)?.name);
  updateNeedsStrip(wc.needs, time);
  updateDebugPanel(wc, [
    { title: "Latest AI quest offer (v2 preview)", lines: questOfferDebugLines() },
    { title: "Dev observations", lines: devNotesOn() ? devNotes.notes(absoluteDay(calendar)) : ["(off — enable the Improvement notes checkbox)"] },
  ]);
  updateBackpack();
  if (scene === "world") updateMinimap(player);   // inside, the dot would be room coords
  updateSkillsUI();
  updateShopWindow();
  updateMemoryBook();
  if (!openingActive) tickGuidance();   // keep the tutorial bubble / aspiration pill live
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

  // Festival engine: decorations only paint on the festival's date, 09:00-21:00.
  // Bunting reads as an overhead layer (like the fence/hedges, not depth-sorted —
  // it sits well above head height); lantern poles + harvest clusters are
  // ground-level props, so they join the depth-sorted ents below instead.
  const festival = activeFestival(calendar);
  if (festival) drawBunting(ctx, time);

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
    { y: player.y + 13, f: () => drawFarmer(ctx, player, time, playerRigParams) },
    // the neighbour farm (cared-for: repaired roof/window/barn) — decorative
    { y: NEIGHBOR.house.y + NEIGHBOR.house.h, f: () => drawHouse(ctx, true, true, NEIGHBOR.house) },
    { y: NEIGHBOR.barn.y + NEIGHBOR.barn.h, f: () => drawBarn(ctx, true, NEIGHBOR.barn) },
    { y: WELL.cy + WELL.r, f: () => drawWell(ctx, WELL.cx, WELL.cy, WELL.r) },
    { y: OLD_BUSK_SIGN[1], f: () => drawBuskSign(ctx, OLD_BUSK_SIGN[0], OLD_BUSK_SIGN[1]) },
  ];
  MARKET_STALLS.forEach((s) => ents.push({ y: s.y + s.h, f: () => drawStall(ctx, time, s, s.awning, s.accent, s.sign) }));
  COTTAGES.forEach((c, i) => ents.push({ y: c.y + c.h, f: () => drawCottage(ctx, c, 700 + i * 37) }));
  if (festival) {
    FESTIVAL_LANTERN_SPOTS.forEach(([lx, ly]) => ents.push({ y: ly, f: () => drawLanternPole(ctx, lx, ly, time) }));
    FESTIVAL_HARVEST_CLUSTERS.forEach(([hx, hy]) => ents.push({ y: hy + 6, f: () => drawHarvestCluster(ctx, hx, hy) }));
  }
  for (const [tx, ty] of WORLD_TREES) ents.push({ y: ty + 6, f: () => drawTree(ctx, tx, ty, time) });
  for (const b of bushes) ents.push({ y: b.y + 8, f: () => drawBush(ctx, b.x, b.y, b.full, time) });
  for (const c of cows) ents.push({ y: c.y + 14, f: () => drawCow(ctx, c, time) });
  for (const h of hens) ents.push({ y: h.y + 6, f: () => drawHen(ctx, h, time) });
  for (const w of wildlife) ents.push({ y: w.y + 6, f: () => drawWildlife(ctx, w, time) });
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
  drawFarmer(ctx, player, time, playerRigParams);
  if (hovered) hovered.drawHover(ctx, time);
  drawVignette("rgba(60,45,25,0)", "rgba(15,10,5,.42)");   // dimmer indoors
}

void WORLD_W;
requestAnimationFrame(tick);
