import {
  T,
  WORLD_W, FORAGE_BASE_YIELD, STARTER_SKILL_SEED, STARTING_COINS, COLLAPSE_FEE,
  DIALOGUE_FRIENDSHIP_BUMP, DIALOGUE_TOPIC_FLAG_DAYS, AUTOSAVE_SECONDS, NPC_SALE_FRIENDSHIP_BUMP,
  CAM_NORTH_SKY_MARGIN,
  CUSTOMER_MARKET_START, CUSTOMER_MARKET_END, CUSTOMER_MAX_CONCURRENT, CUSTOMER_SPAWN_GAP_MIN,
  CUSTOMER_SPAWN_CHANCE, CUSTOMER_PATIENCE_MIN, CUSTOMER_TEND_TILES, CUSTOMER_FRIENDSHIP_BUMP,
  REP_GAIN_SALE, REP_GAIN_QUEST, REP_GAIN_FESTIVAL, REP_GAIN_GIFT,
  TOWN_SHOP_OPEN_HOUR, TOWN_SHOP_CLOSE_HOUR,
} from "./config";
import {
  initInput, consumeAction, consumeLeftClick, consumeRightClick,
  getPointerScreen, setMoveTarget, clearMoveTarget, getMoveTarget,
} from "./engine/input";
import { applyCamera, screenToWorld, adjustZoom, getLastCam } from "./engine/camera";
import { paintGround, groundIsTiled, groundTilesAvailable } from "./world/ground";
import {
  HOUSE, BARN, STALL, WORLD_TREES, BUSK_SPOT, OLD_BUSK_SIGN, HOUSE_DOOR, ROOM, ROOM_ENTRY,
  FLOWER_BEDS, fieldBounds, NEIGHBOR, MARKET_STALLS, COTTAGES, WELL, HEDGES, OUTHOUSE, regionAt,
  FESTIVAL_LANTERN_SPOTS, FESTIVAL_HARVEST_CLUSTERS, WORLD_PROPS, type Rect,
  INN, TOWN_HOMES, TOWN_MERCHANTS, TOWN_DOCK, STABLE, type MerchantKind,
} from "./world/zones";
import { drawInterior } from "./art/interior";
import {
  drawTree, drawFence, drawHedge, drawBush, drawTilledTile, drawCropTile, drawWiltedTile,
  drawFlowerBed, drawBuskSpot, drawMusicNotes, drawWaterShimmer,
  drawOpenWaterShimmer, drawDock, drawBuskSign, drawProp,
} from "./art/props";
import { buildFoliageScatter, drawScatterItem } from "./art/scatter";
import { drawBunting, drawLanternPole, drawHarvestCluster } from "./art/festival";
import { activeFestival, isFestivalDay } from "./systems/festival";
import { FESTIVALS } from "./data/festivals";
import { drawHouse, drawBarn, drawStall, drawCottage, drawWell, drawOuthouse, drawInn, drawStable } from "./art/buildings";
import { drawFarmer, drawCow, drawHen, drawDuck, drawPig, drawSheep, drawNpc, drawMount, MOUNT_LIFT } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals, spawnCow, spawnHen, spawnDuck, spawnPig, spawnSheep } from "./entities/animals";
import { createWildlife, updateWildlife, type WildlifeInst } from "./entities/wildlife";
import { drawWildlife } from "./art/wildlife";
import { createNpcs, updateNpcs, initNpcPositions, startTalking, npcById, npcNeedComment, sendCustomer, clearVisit, customerWaiting, type Npc } from "./entities/npc";
import { loadLivestock, resetLivestock, saveLivestock } from "./systems/livestock";
import { loadEconomy, gainItem, saveEconomy, goodCount, sellGoodAt } from "./systems/economy";
import {
  loadCustomers, resetCustomers, rolloverDay, customersRemain, noteServed, rollCustomerWant,
} from "./systems/customers";
import {
  loadReputation, resetReputation, gainReputation, penalizeReputation, decayReputation,
  reputationTier, reputationPremium, reputationDailyCap, reputationSpawnBonus, reputationBuyDiscount,
} from "./systems/reputation";
import {
  loadDiscovery, resetDiscovery, discoverRegion, travelFare, travelMinutes,
  nodeForRegion, TRAVEL_NODES, type TravelNode,
} from "./systems/discovery";
import {
  loadTransport, resetTransport, ownsTransport, fareDiscount, mountSpeedMult, buyTransport,
} from "./systems/transport";
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
import { loadGarden, resetGarden, saveGarden, updateGarden, rollGardenDay } from "./systems/gardening";
import { loadStorage, resetStorage, type Storage } from "./systems/storage";
import { loadCollections, resetCollections, discover, discoveredName, saveCollections } from "./systems/collections";
import { sellableGoodIds } from "./systems/sellCategories";
import { NPC_STALL_TRADES, MERCHANT_STOCK, type NpcStallTrade } from "./systems/shop";
import { loadMemories, resetMemories, addMemory, saveMemories, attachMemoryFlavor } from "./systems/memories";
import { initMemoryBook, updateMemoryBook } from "./ui/memorybook";
import { initDebugPanel, updateDebugPanel } from "./ui/debugpanel";
import { removeItem, countItem, addItem, ITEM_NAMES } from "./systems/inventory";
import { loadSkills, gainSkill, skillValue, getSkill, saveSkills, decaySkills } from "./systems/skills";
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
import { loadMeta, saveMeta, characterForPath, DEFAULT_APPEARANCE, type Character, type Path } from "./systems/meta";
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
  markContact, relationshipSummary, dialogueBump, saveRelationships, readRelationship,
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
import { createQuestOffers, type TemplateInfo } from "./systems/ai/features/questOffers";
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
import { initQuestLog, updateQuestLog } from "./ui/questlog";
import { initMinimap, updateMinimap, setMinimapField, setTravelHooks } from "./ui/minimap";
import {
  initStableWindow, openStableWindow, closeStableWindow, isStableOpen, updateStableWindow,
} from "./ui/stablewindow";
import { initSkillsUI, updateSkillsUI, skillGainPopup, updateReputationUI } from "./ui/skills";
import {
  initShopWindow, openShopWindow, closeShopWindow, isShopOpen, updateShopWindow, openNpcStallWindow, openMerchantBuyWindow,
  refreshShopWindow, type CustomerRow,
} from "./ui/shopwindow";
import {
  initStorageWindow, openStorageWindow, closeStorageWindow, isStorageOpen, updateStorageWindow,
} from "./ui/storagewindow";
import { hideOpening } from "./ui/titlescreen";
import { showMainMenu, menuConfirm } from "./ui/mainmenu";
import { showSettings, showSettingsWindow } from "./ui/settingsscreen";
import { showPause } from "./ui/pausescreen";
import { showExitDialog } from "./ui/exitscreen";
import { applyGlobalPrefs, applyHudPrefs } from "./ui/uiPrefs";
import { setupWindows, isViewportActive, finishWindowSetup, escCloseTopWindow } from "./ui/windows/setup";
import { initSkin } from "./ui/skin";
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
import {
  loadQuests, resetQuests, saveQuests, notifyQuests, refreshQuests, turnInQuest,
  acceptQuest, abandonQuest, activeQuests, completedQuests,
  turnInReadyFor, offerableFor, aiOfferFor, eligibleAiTemplates, setAiOffer,
  type QuestLog, type QuestEvent, type QuestResult, type AvailCtx, type AiOffer,
} from "./systems/quests";
import { questById as questDefById } from "./data/quests";
import type { QuestDialogueOption } from "./ui/dialoguebox";
import { rigFromCharacter } from "./entities/player";
import type { RigParams } from "./art/rig";
import { nearRect, setCollisionScene, type Scene } from "./world/collision";
import { paintDayNightTint, shadowFactors } from "./art/daynight";
import { setSunFactors, getSunFactors } from "./art/shapes";
import { updateWeatherFx, drawWeatherFx } from "./art/weatherfx";
import { drawParallaxBand } from "./art/parallax";
import { updateParticles, drawParticles, burst, debugParticleCounts } from "./art/particles";
import { loadSprites, spriteLoadProgress, spritesReady } from "./art/sprites";
import { spriteCoversCharacter, setSpriteMode, spriteModeOn, setPlayerLook } from "./art/spriteChar";
import { setNpcSpriteMode, npcSpriteModeOn, npcHasSprite } from "./art/spriteNpc";
import { setAnimalSpriteMode, animalSpriteModeOn, animalHasSprite, type AnimalKind } from "./art/spriteAnimal";

const cv = document.getElementById("cv") as HTMLCanvasElement;
const ctx = cv.getContext("2d")!;
// the canvas fills #gameArea, which is now the body of the GAME VIEWPORT WINDOW
// (src/ui/windows). fit() sizes the backing store to the live viewport-window
// content box (dpr-aware). It's the viewport window's onResize hook, so moving
// or resizing that window live-resizes the canvas; the camera refits each frame
// from cv.width. Guarded against a zero box (a minimized/hidden viewport).
function fit() {
  const r = cv.getBoundingClientRect();
  const w = Math.round(r.width * devicePixelRatio);
  const h = Math.round(r.height * devicePixelRatio);
  if (w > 0 && h > 0) { cv.width = w; cv.height = h; }
}
// Apply the UI kit skin (nine-slice panels + pixel font) BEFORE any window is
// built, so the very first chrome renders skinned. Strictly dual-path: with no
// ui PNGs it toggles nothing and the CSS chrome stands (see src/ui/skin.ts).
initSkin();
// Turn the screen into a desktop of windows (viewport + clock/coins/needs/dock)
// BEFORE the first fit(), so the canvas measures its real window body. The
// manager owns viewport-resize refits from here on (no separate resize listener).
setupWindows({ refitViewport: fit });
fit();

initInput(cv, document.getElementById("actBtn")!);

// camera zoom: mouse wheel over the play window, plus on-screen +/− (touch)
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  adjustZoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });
document.getElementById("zoomIn")!.addEventListener("click", () => adjustZoom(1));
document.getElementById("zoomOut")!.addEventListener("click", () => adjustZoom(-1));
// Kick off PixelLab sprite decoding at boot — NON-BLOCKING. Nothing awaits it;
// sprite() returns null (→ code-drawn painter) for any frame not yet decoded,
// so a slow or entirely-missing asset can never delay or break boot.
loadSprites();
// The ground bakes ONCE into an offscreen canvas, but the pixel-tile PNGs decode
// asynchronously after boot — so the first bake is the painterly fallback. We
// re-bake a SINGLE time in the loop once the ground tiles have decoded (dual-
// path: stays painterly forever if the ground folder is empty). See world/ground.
let ground = paintGround();
let groundRebaked = groundIsTiled();
// Ambient foliage scatter (foliage + props batch): built once, deterministic —
// pushed into the depth-sorted ents each frame (non-colliding decoration).
const foliageScatter = buildFoliageScatter();
const player = createPlayer();
const livestock = loadLivestock();
const { cows, hens, ducks, pigs, sheep } = createAnimals(livestock);   // only what's been bought — no free animals
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
const storage: Storage = loadStorage();   // R5: the barn's storage chest
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
const quests: QuestLog = loadQuests();   // R6: authored + AI quests, one quest log
// Set by the quest-log window so a progress tick / completion repaints it live.
// Declared here (before the boot-time initQuestLog wiring) to dodge a TDZ.
let onQuestsChanged: () => void = () => {};
// the player's drawn look, built from her created Character (rebuilt on New
// Game). Old / pre-character saves fall back to the default farmer rig.
let playerRigParams: RigParams = rigFromCharacter(meta.character);
// Does the heroine sprite cover this Character (default female look)? If not
// (male / customised), the code rig draws her — recomputed on New Game below.
let playerUsesSprite = spriteCoversCharacter(meta.character);
// the matrix sprite reads the live look from module state (RigParams can't carry
// the gender + matrix selection); keep it in sync on boot and every New Game.
setPlayerLook(meta.character?.gender ?? "female", meta.character?.appearance ?? DEFAULT_APPEARANCE);
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
for (const d of ducks) registerAnimal("duck", d, ducks);
for (const p of pigs) registerAnimal("pig", p, pigs);
for (const s of sheep) registerAnimal("sheep", s, sheep);

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

// Customers-to-your-stall (v2 economy block #1): the day's sales ledger (caps
// how many customers you serve per day) + a spawn-cadence accumulator. Old
// saves without the key simply start fresh (loadCustomers -> zeroed).
const customerLedger = loadCustomers();
let customerSpawnGapMin = 0;   // in-game minutes counted toward the next spawn attempt
// Town Reputation / Fame (v2 economy block #2): one town-wide 0-100 score that
// rises on good custom and modulates the customer economy. Old saves without the
// key start at Unknown (loadReputation -> zeroed).
const reputation = loadReputation();
// Discovery ledger (v2 block #4): which named locations she's reached on foot,
// i.e. which minimap nodes fast travel is unlocked for. Farm is seeded; every
// other node is earned by walking there once. Old saves start with just the farm
// and re-discover as she moves (the region-change seam below fires discovery).
const discovery = loadDiscovery();
// Owned transportation (v2 block #5): rowboat / horse / carriage bought at the
// town stable. Ownership persists; `mounted` is a live session flag (she starts
// each session on her own two feet — you never wake up already on a horse).
const transport = loadTransport();
let mounted = false;

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
  // v2 block #2: a warmly-received gift (loved/liked) is a small public kindness — a touch of Fame
  if (out.rating === "loved" || out.rating === "liked") awardReputation(REP_GAIN_GIFT);
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
    cows, hens, ducks, pigs, sheep,   // livestock — verification pokes moving/dist/x/y directly
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
    scene: () => scene, leave: () => leaveHouse(), enter: () => enterHouse(),
    particleCounts: () => debugParticleCounts(),
    // sprite-integration bridge: force the rig path for A/B alignment shots,
    // read whether this Character uses the sprite, and poll load progress.
    spriteMode: (on: boolean) => setSpriteMode(on),
    spriteModeOn: () => spriteModeOn(),
    // NPC sprite bridge: force the rig path for all NPCs (A/B), and read which
    // townsfolk are currently sprite-backed (a decoded sheet exists).
    npcSpriteMode: (on: boolean) => setNpcSpriteMode(on),
    npcSpriteModeOn: () => npcSpriteModeOn(),
    npcSprited: () => npcs.filter(npcHasSprite).map((n) => n.def.id),
    // farm-animal sprite bridge: force the rig path for all livestock (A/B),
    // and read which species are currently sprite-backed.
    animalSpriteMode: (on: boolean) => setAnimalSpriteMode(on),
    animalSpriteModeOn: () => animalSpriteModeOn(),
    animalSprited: () => (["cow", "pig", "sheep", "hen", "duck"] as const satisfies readonly AnimalKind[])
      .filter(animalHasSprite),
    usesSprite: () => playerUsesSprite,
    coversChar: (c: Character | null) => spriteCoversCharacter(c),
    spritesReady: () => spritesReady(),
    spriteProgress: () => spriteLoadProgress(),
    shadowFactorsNow: () => shadowFactors(calendar.hour, calendar.minute),
    sunFactorsRaw: () => getSunFactors(),
    worldToCanvasPx: (wx: number, wy: number) => {
      const { camx, camy, scale } = getLastCam();
      return [(wx - camx) * scale, (wy - camy) * scale];
    },
    playerXY: () => [player.x, player.y],   // verification: where the player is (world px)
    npcXY: () => npcs.map((n) => ({ id: n.def.id, x: n.x, y: n.y })),   // verification: NPC positions
    // window-system verification: exact client→world mapping (proves input stays
    // accurate after the viewport window moves/resizes — screenToWorld reads the
    // canvas' live getBoundingClientRect) + the walk target a click actually set.
    s2w: (clientX: number, clientY: number) => screenToWorld(clientX, clientY),
    moveTarget: () => getMoveTarget(),
    // Part B #10 verification bridge: force plot 0 ripe and harvest it, so the
    // leaf-puff burst can be exercised without a full till/plant/grow cycle.
    harvestPlot0: () => {
      const cell = plots[0]; if (!cell) return;
      cell.state = "ready"; cell.cropId = "corn"; cell.growth = 1; cell.watered = true; cell.dryDays = 0;
      player.x = cell.x; player.y = cell.y + 24; player.moving = false; clearMoveTarget();
      const obj = byId("plot-0");
      if (obj) runDefault(obj, makeCtx());
    },
    // content-library verification bridge (commit 1): force any plot to a given
    // crop/growth stage without a full till/plant/water cycle, so the three
    // growth-shape painters (tall-stalk/bushy/vine) can be screenshotted directly.
    forcePlot: (i: number, cropId: string, growth = 1) => {
      const cell = plots[i]; if (!cell) return;
      cell.state = growth >= 1 ? "ready" : "growing";
      cell.cropId = cropId; cell.growth = growth; cell.watered = true; cell.dryDays = 0;
    },
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
    // quest verification bridge — drive the whole lifecycle without UI/dialogue
    quests: () => ({ active: activeQuests(quests).map((s) => ({ ...s })), completed: completedQuests(quests).map((s) => ({ ...s })), aiOffer: quests.aiOffer }),
    acceptQuest: (id: string) => acceptQuestFlow(id),
    turnInQuest: (id: string) => turnInQuestFlow(id),
    abandonQuest: (id: string) => abandonQuestFlow(id),
    fireQuest: (ev: QuestEvent) => fireQuest(ev),
    heldCountOf: (id: string) => heldCount(id),
    castPond: () => { const o = byId("pond"); if (o) { player.x = o.anchor[0]; player.y = o.anchor[1]; player.moving = false; clearMoveTarget(); runDefault(o, makeCtx()); } },
    openStallDev: () => { player.x = STALL.x + STALL.w / 2; player.y = STALL.y + STALL.h + 10; player.moving = false; clearMoveTarget(); openPlayerStall(); },
    // town-merchant verification bridge (v2 BLOCK #3): stand at a merchant and
    // open its window (buy for the general store, sell for fishmonger/greengrocer,
    // "coming soon" for the tailor), the same path a real click takes.
    openTownMerchantDev: (kind: MerchantKind) => {
      const m = TOWN_MERCHANTS.find((x) => x.kind === kind); if (!m) return;
      player.x = m.x + m.w / 2; player.y = m.y + m.h + 10; player.moving = false; clearMoveTarget();
      openTownMerchant(kind);
    },
    // fast-travel verification bridge (v2 BLOCK #4): read the discovery ledger,
    // force a node discovered, and ride there through the REAL fade/minute loop.
    discovered: () => [...discovery.discovered],
    discoverAll: () => { for (const n of TRAVEL_NODES) discoverRegion(discovery, n.region); },
    travelTo: (id: string) => { const n = TRAVEL_NODES.find((x) => x.id === id); if (n) fastTravel(n); },
    travelQuote: (id: string) => {
      const n = TRAVEL_NODES.find((x) => x.id === id); if (!n) return null;
      return { fare: effectiveFare(n), baseFare: travelFare(player.x, player.y, n), mins: travelMinutes(player.x, player.y, n), reason: travelGuardReason(n, effectiveFare(n)) };
    },
    // transportation verification bridge (v2 BLOCK #5): the stable shop, owning
    // vehicles, the mount toggle, and the resulting fare discount.
    transport: () => ({ ...transport, mounted, fareDiscount: fareDiscount(transport) }),
    buyTransportDev: (id: "rowboat" | "horse" | "carriage") => buyTransport(economy, transport, id),
    openStableDev: () => { player.x = STABLE.x + STABLE.w / 2; player.y = STABLE.y + STABLE.h + 10; player.moving = false; clearMoveTarget(); openStable(); },
    toggleMountDev: () => { toggleMount(); return mounted; },
    isMountedDev: () => mounted,
    // general interactable inspector/runner (used to verify the dock rowboat +
    // stable via their REAL interactable path, not a shortcut).
    interactLabel: (id: string) => { const o = byId(id); return o ? defaultActionLabel(o, makeCtx()) : null; },
    runInteract: (id: string, actionId: string) => { const o = byId(id); if (o) runAction(o, actionId, makeCtx()); },
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
    // customers-to-your-stall verification bridge (v2): force a customer, read
    // the queue, serve one, and inspect the day's ledger — no timing/proximity
    // needed. `forceCustomer` ignores the market-hours/tending gate but still
    // routes through the same want-roll + send, so it exercises the real path.
    forceCustomer: () => trySpawnCustomer(npcs.reduce((k, n) => k + (n.visit ? 1 : 0), 0)),
    arriveCustomers: () => { for (const n of npcs) if (n.visit) { n.visit.arrived = true; n.moving = false; } refreshShopWindow(); },
    customers: () => customerRows(),
    serveCustomerDev: (npcId: string) => serveCustomer(npcId),
    customerLedger: () => ({ ...customerLedger }),
    // reputation verification bridge (v2 block #2): read Fame + its live effects,
    // or nudge Fame directly to inspect the premium/cap/spawn band without grinding.
    reputation: () => ({
      fame: reputation.fame, tier: reputationTier(reputation.fame).name,
      premium: reputationPremium(reputation.fame), dailyCap: reputationDailyCap(reputation.fame),
      spawnBonus: reputationSpawnBonus(reputation.fame),
    }),
    setReputation: (fame: number) => { awardReputation(fame - reputation.fame); return reputation.fame; },
    // step one live minute of stall custom (patience decay + spawn) so a timeout
    // — and its gentle Fame penalty — can be driven deterministically in tests.
    customerMinuteDev: () => customerLiveMinute(),
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
const questOffers = createQuestOffers(aiCtx, { onOffer: applyAiQuestOffer });   // feature #3 (D3 real offers)
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
    { economy, skills, farm, calendar, weather, flags: worldFlags, needs, relationships, reputation, location: playerRegion() },
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
  questOptions: questOptionsFor,   // R6: quest offers / turn-ins as dialogue choices
  onOpen: (def) => {
    const n = npcById(npcs, def.id);
    if (n) startTalking(n, player.x, player.y);
    backstory.ensureGenerated(def);   // first meaningful interaction → generate once (background)
    fireQuest({ kind: "talk", npcId: def.id });   // Quests: "talk to X" steps
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
    questGenerate: (day: number) => questOffers.maybeGenerateDaily(worldForNpc("maren"), day, eligibleTemplateInfos()),
    questLatest: () => questOffers.latest(),
    devObserve: (k: string, day: number) => devNotes.observe(k, day),
    devNotes: (day: number) => devNotes.notes(day),
  };
}
initMinimap();
// v2 block #4: hand the minimap the discovery ledger + travel plumbing so its
// pins/confirm card can offer paid fast travel between reached locations.
setTravelHooks({
  discovery,
  playerPos: () => ({ x: player.x, y: player.y }),
  fareOf: (node) => effectiveFare(node),   // v2 block #5: owned transport shaves/waives the fare
  guard: (node, fare) => travelGuardReason(node, fare),
  travel: (node) => fastTravel(node),
});
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

/** Approximate world point for the fishing bobber (Part B #10 splash burst):
 *  FishingState doesn't track the exact cast point, so this reaches out from
 *  the player in her facing direction, echoing the rod's own reach in rig.ts. */
function bobberSpot(): [number, number] {
  const d = 26;
  switch (player.dir) {
    case 0: return [player.x, player.y - d];
    case 1: return [player.x + d, player.y];
    case 2: return [player.x, player.y + d];
    default: return [player.x - d, player.y];
  }
}

/** A skill gain's tiny gold glint at the player, alongside the existing DOM
 *  popup + day-log entry (Part B #10) — one seam replacing 5 duplicated
 *  `skillGainPopup + logSkillGain` pairs across the action handlers below. */
function onSkillGain(id: string, gained: number) {
  skillGainPopup(id, gained);
  logSkillGain(dayLog, id, gained);
  burst("glint", player.x, player.y - 10);
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
    else if (kind === "duck") { const d = spawnDuck(); ducks.push(d); registerAnimal("duck", d, ducks); }
    else if (kind === "pig") { const p = spawnPig(); pigs.push(p); registerAnimal("pig", p, pigs); }
    else if (kind === "sheep") { const s = spawnSheep(); sheep.push(s); registerAnimal("sheep", s, sheep); }
    else { const h = spawnHen(); hens.push(h); registerAnimal("hen", h, hens); }
  },
  () => currentSeason(calendar),
  () => sellableGoodIds({ inv: economy.inv, collections }),
  toast, remember,
  logSale,
  (coins) => { logCoinsSpent(dayLog, coins); fireGuidance({ kind: "buy" }); },
  customerRows, serveCustomer);
initStorageWindow(storage, economy, toast);   // R5: the barn's storage chest
// v2 block #5: the town stable's transport shop (rowboat / horse / carriage).
initStableWindow({
  economy, transport,
  toast, memory: remember,
  logPurchase: (coins) => { logCoinsSpent(dayLog, coins); fireGuidance({ kind: "buy" }); },
  isMounted: () => mounted,
  canMount: () => canMountNow(),
  toggleMount,
});
// R6: the quest-log window (a window-system citizen like the backpack). Its
// "Getting Started" panel mirrors the live Guidance layer so tutorial/aspiration
// and quests read coherently in one place. Wire the change hook so a step tick
// or completion repaints it live.
initQuestLog(quests, {
  heldCount,
  onAbandon: abandonQuestFlow,
  gettingStarted: questGettingStarted,
});
onQuestsChanged = updateQuestLog;

// Every migrated panel window (backpack/skills/minimap/memory book/shop/gift)
// now exists — restore the saved desktop layout (or lay out Classic), per
// docs/WINDOW_SYSTEM.md's boot-order note ("create the window before the
// first layout restore").
finishWindowSetup();

interface Puff { x: number; y: number; a: number; r: number }
const smoke: Puff[] = [];

// ---- scenes: the world, and the house interior (tier-1 bare/broken) ----
let scene: Scene = "world";

function enterHouse() {
  scene = "interior";
  setCollisionScene(scene);
  setMounted(false);                         // you leave the horse outside (v2 block #5)
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

/** R5: open the barn's storage chest (the barn's own interactable gates this on
 *  the barn being mended). Walking away from the barn closes it (see tick). */
function openBarnStorage() {
  openStorageWindow();
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

/** Coastal-town merchants (v2 BLOCK #3). Opens the right trade window by kind:
 *  the general store SELLS tools/seeds (year-round stock) at a reputation
 *  discount; the fishmonger + greengrocer BUY their speciality at a reputation
 *  premium (the same band customers pay); the tailor is a "coming soon" counter.
 *  Shops keep daytime hours. The merchant's rect becomes `openStallRect` so
 *  walking away closes the window (same as the farm stall / NPC stalls). */
function openTownMerchant(kind: MerchantKind) {
  const m = TOWN_MERCHANTS.find((x) => x.kind === kind);
  if (!m) return;
  if (calendar.hour < TOWN_SHOP_OPEN_HOUR || calendar.hour >= TOWN_SHOP_CLOSE_HOUR) {
    toast("The town's shops are shut — come back in daylight hours.");
    return;
  }
  openStallRect = m;
  if (kind === "tailor") {
    toast("The tailor's counter is bare — wardrobe fittings are coming soon.");
    openStallRect = null;
    return;
  }
  if (kind === "general") {
    openMerchantBuyWindow("General Store", MERCHANT_STOCK, reputationBuyDiscount(reputation.fame));
    return;
  }
  // fishmonger / greengrocer: sell-only, reputation premium on the price paid
  const premium = reputationPremium(reputation.fame);
  if (kind === "fishmonger") openNpcStallWindow("The Fishmonger", "fishing", () => onMerchantSale("fishmonger"), premium);
  else openNpcStallWindow("The Greengrocer", "produce", () => onMerchantSale("greengrocer"), premium);
}

/** A sale to a town buying-merchant: the same sell seam (guidance/quests/day
 *  log/arcs, via logSale) already fires through the shop window's logSaleFn; the
 *  merchant sale additionally nudges town Fame, like serving a customer, and
 *  drops a one-time Memory Book note the first time. */
function onMerchantSale(kind: "fishmonger" | "greengrocer") {
  awardReputation(REP_GAIN_SALE);
  const text = kind === "fishmonger"
    ? "Your first sale to the town fishmonger."
    : "Your first sale to the town greengrocer.";
  if (addMemory(memories, `first_town_${kind}`, text, calendar)) logMemory(dayLog, text);
}

// ---- transportation vendors (v2 BLOCK #5) ----------------------------------
// The town STABLE sells old-world transport (rowboat / horse / carriage), money-
// gated like everything else (VISION §9). Owning them has REAL effects: the horse
// mounts for faster/stamina-free overland travel + a cheaper fare; the carriage
// waives the fast-travel fare; the rowboat unlocks the dock "row out" interaction
// (the Fisherwoman epic's entry point). Shop keeps the town's daytime hours.
function openStable() {
  if (calendar.hour < TOWN_SHOP_OPEN_HOUR || calendar.hour >= TOWN_SHOP_CLOSE_HOUR) {
    toast("The stable's shut for the night — come back in daylight hours.");
    return;
  }
  openStableWindow();
}

/** True when she could swing up right now: owns a horse, is outdoors, and isn't
 *  mid-activity/fade. Used by both the R-key toggle and the stable window button. */
function canMountNow(): boolean {
  return ownsTransport(transport, "horse") && scene === "world" && !timeSkipping
    && !fishing.casting && !foraging.picking && !farmwork.working && !busking.playing && !cooking.cooking;
}

/** Force-set the mount flag (dismount on going indoors / collapse / new game). */
function setMounted(on: boolean) { mounted = on; }

/** Mount ⇄ dismount the horse (R key / stable button). Guarded: no horse, or
 *  indoors, or busy, each explains itself. Mounting cancels a held fishing pose. */
function toggleMount() {
  if (mounted) { setMounted(false); toast("You swing down off your horse."); return; }
  if (!ownsTransport(transport, "horse")) { toast("You don't own a horse — the town stable sells one."); return; }
  if (scene !== "world") { toast("You can't ride indoors."); return; }
  if (!canMountNow()) { toast("Finish what you're doing first."); return; }
  player.fishing = false;
  setMounted(true);
  toast("You swing up onto your horse. 🐴 Press R to dismount.");
}

/** The fast-travel fare she ACTUALLY pays after any owned-transport discount: a
 *  horse shaves it, her own carriage waives it entirely (still costs clock time
 *  — no teleport). One source of truth so the confirm card shows what's charged. */
function effectiveFare(node: TravelNode): number {
  const base = travelFare(player.x, player.y, node);
  return Math.max(0, Math.round(base * (1 - fareDiscount(transport))));
}

// ---- town reputation / fame (v2 economy block #2) --------------------------
// One town-wide 0-100 number (UO fame). Good custom raises it; it then shifts
// the customer economy (premium band + daily cap + spawn odds, read live below)
// and colours AI dialogue. This helper applies a gain and celebrates a tier
// crossing with a warm toast; the raw penalty/decay go straight through.
function awardReputation(amount: number) {
  const change = gainReputation(reputation, amount, absoluteDay(calendar));
  if (change.crossedUp) {
    toast(`🏛️ The town is warming to you — you're now a ${change.crossedUp.name}!`);
    remember(`fame_${change.crossedUp.name.toLowerCase().replace(/\s+/g, "_")}`,
      `The whole town has come to see you as a ${change.crossedUp.name}.`);
  }
  return change;
}

// ---- customers come to your stall (v2 economy block #1) --------------------
// The single sell seam every sale fires — the FLAT-price stall sale (shop
// window's own Sell button) AND premium customer sales both route through this,
// so guidance/quests/day-log/story-arcs advance identically for either path.
function logSale(coins: number, qty: number) {
  logCoinsEarned(dayLog, coins);
  logItemsSold(dayLog, qty);
  fireGuidance({ kind: "sale" });            // Guidance: "sell" progress
  fireQuest({ kind: "sell", count: qty });   // Quests: "sell N goods" activity steps
  arcs.recordActivity("sale");
  if (devNotesOn()) devNotes.observe("sell", absoluteDay(calendar));
}

/** True when the player is minding her own stall (close enough to serve). */
function nearStall(): boolean {
  const m = CUSTOMER_TEND_TILES * T;
  return player.x > STALL.x - m && player.x < STALL.x + STALL.w + m
      && player.y > STALL.y - m && player.y < STALL.y + STALL.h + m;
}

/** A waiting spot just in front of her counter, offset by slot so two customers
 *  don't stand on top of one another. */
function customerSpot(slot: number): readonly [number, number] {
  const cx = STALL.x + STALL.w / 2;
  const y = STALL.y + STALL.h + 0.9 * T;
  return [cx + (slot === 0 ? -0.7 : 0.7) * T, y];
}

/** The customers currently waiting AT the counter (arrived), for the window. */
function customerRows(): CustomerRow[] {
  const out: CustomerRow[] = [];
  for (const n of npcs) {
    if (!customerWaiting(n) || !n.visit) continue;
    const w = n.visit.want;
    out.push({ npcId: n.def.id, npcName: n.def.name, itemId: w.itemId, qty: w.qty, unitPrice: w.unitPrice, total: w.total });
  }
  return out;
}

/** Serve a waiting customer: sell them (up to) what they asked at the premium
 *  price, fire the same sell seam a flat sale does, nudge Friendship a touch,
 *  then send them on their way. Clamps to current stock — she may have sold some
 *  of it elsewhere since they queued. */
function serveCustomer(npcId: string) {
  const n = npcById(npcs, npcId);
  if (!n || !n.visit) return;
  const w = n.visit.want;
  const qty = Math.min(w.qty, goodCount(economy, w.itemId));
  if (qty <= 0) {
    toast(`${n.def.name} sighs — you've none of that left to sell.`);
    clearVisit(n, calendar, weather);
    refreshShopWindow();
    return;
  }
  const earned = sellGoodAt(economy, w.itemId, qty, w.unitPrice);
  if (earned > 0) {
    logSale(earned, qty);
    noteServed(customerLedger);
    awardReputation(REP_GAIN_SALE);   // v2 block #2: a served customer spreads the word
    const thresholds = dialogueBump(relationships, n.def, CUSTOMER_FRIENDSHIP_BUMP, calendar);
    logRelationshipChange(dayLog, npcId, "friendship", CUSTOMER_FRIENDSHIP_BUMP);
    const itemName = (ITEM_NAMES[w.itemId] ?? w.itemId).toLowerCase();
    toast(`${n.def.name} buys ${qty} ${itemName} for ${earned} coins! (+${CUSTOMER_FRIENDSHIP_BUMP} ♥)`);
    remember("first_customer", "Your very first customer, come to YOUR own stall.");
    for (const ev of thresholds) fireHeart(n, ev);
  }
  clearVisit(n, calendar, weather);
  refreshShopWindow();
}

/** Send one eligible plaza-dweller to the stall wanting something she holds.
 *  `slot` is the queue position (drives the standing spot). */
function trySpawnCustomer(slot: number): boolean {
  const pool = npcs.filter((n) =>
    !n.visit && !n.indoors && n.talkTimer <= 0 &&
    (n.state === "atMarket" || n.state === "socializing") &&
    n.x > 44 * T);   // in the market/road belt, not off at the lake or deep forest
  const premium = reputationPremium(reputation.fame);   // v2 block #2: fame lifts the price band
  for (const n of pool.sort(() => Math.random() - 0.5)) {
    const want = rollCustomerWant(n.def, economy.inv, premium);
    if (want) {
      sendCustomer(n, customerSpot(slot), want, CUSTOMER_PATIENCE_MIN);
      refreshShopWindow();
      return true;
    }
  }
  return false;
}

/** One live in-game minute of stall custom: age out the bored, then maybe send
 *  a fresh customer while she's minding the stall in market hours. */
function customerLiveMinute() {
  if (scene !== "world") return;
  // patience: cull anyone who has waited too long. v2 block #2 wires the penalty
  // block #1 deferred — a customer left to give up costs a gentle sliver of Fame
  // (smaller than a sale's gain, so serving always nets ahead).
  for (const n of npcs) {
    if (!n.visit) continue;
    n.visit.patience -= 1;
    if (n.visit.patience <= 0) {
      const name = n.def.name;
      const wasWaiting = n.visit.arrived;
      clearVisit(n, calendar, weather);
      penalizeReputation(reputation);
      if (wasWaiting && nearStall()) toast(`${name} gives up waiting and drifts off. (word travels — a little Fame lost)`);
      refreshShopWindow();
    }
  }
  const h = calendar.hour;
  if (h < CUSTOMER_MARKET_START || h >= CUSTOMER_MARKET_END) return;
  if (!nearStall()) { customerSpawnGapMin = 0; return; }   // only when she's minding it
  if (!customersRemain(customerLedger, reputationDailyCap(reputation.fame))) return;  // v2 block #2: fame widens the daily cap
  const active = npcs.reduce((k, n) => k + (n.visit ? 1 : 0), 0);
  if (active >= CUSTOMER_MAX_CONCURRENT) return;
  customerSpawnGapMin += 1;
  if (customerSpawnGapMin < CUSTOMER_SPAWN_GAP_MIN) return;
  customerSpawnGapMin = 0;
  if (Math.random() > CUSTOMER_SPAWN_CHANCE + reputationSpawnBonus(reputation.fame)) return;  // v2 block #2: fame lifts the odds
  trySpawnCustomer(active);
}

/** Clear every active visit (a night's sleep / a collapse ends the market day). */
function clearAllCustomers() {
  let any = false;
  for (const n of npcs) if (n.visit) { clearVisit(n, calendar, weather); any = true; }
  if (any) refreshShopWindow();
}

/** A little bobbing 🛒 disc above a customer's head, world-space. */
function drawCustomerBubble(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const by = y - 34 + Math.sin(t * 2.5) * 1.5;
  g.save();
  g.fillStyle = "rgba(40,32,18,.82)";
  g.beginPath(); g.arc(x, by, 11, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(230,190,80,.9)"; g.lineWidth = 1.5; g.stroke();
  g.font = "15px system-ui"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("🛒", x, by + 1);
  g.restore();
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
let lastQuestRegion: string | null = null;   // last region the player was in (drives quest "reach" steps)

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
    rollGardenDay(garden, isRaining(weather)); // flower beds: rain waters, hand-water drains (flowers don't wilt)
    // neglect decay: any NPC not contacted during the day that just ended drifts
    // down (faster the shallower the bond); also expires a stale birthday flag
    decayRelationships(relationships, endedDay, absoluteDay(calendar));
    // neglect decay: a skill unused past its grace window slowly sheds points,
    // floored at the tier it's reached (DECISIONS "unused skills decay slowly")
    decaySkills(skills);
    // Festival engine: on the morning a festival falls, raise the world flag
    // dialogue's condition system reads (data/dialogue/shared.ts's shared
    // festival opening line) — a 1-day flag, self-clearing the day after.
    if (isFestivalDay(calendar)) setWorldFlag(worldFlags, "festival_today", 1, absoluteDay(calendar));
    // ---- AI daily hooks (Part D) — all no-ops with their features off --------
    const abs = absoluteDay(calendar);
    rolloverDay(customerLedger, abs);   // v2: reset the day's customer-sales count
    decayReputation(reputation, abs);   // v2 block #2: gentle Fame drift after long inactivity (floored at tier)
    // Quest offers (#3, D3): maybe surface one validated AI offer (scripted
    // fallback on any failure; inert with the feature off).
    questOffers.maybeGenerateDaily(
      getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags, needs, relationships }),
      abs, eligibleTemplateInfos(),
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
  customerLiveMinute();   // v2: townsfolk come to the player's stall to buy
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
  clearAllCustomers();   // v2: no one waits at the stall overnight
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
  clearAllCustomers();   // v2: she steps away from the stall to nap
  let pendingDayEnd: DayEndSnapshot | null = null;
  fadeThrough(
    () => { for (let i = 0; i < 60; i++) { const s = stepGameMinute(true); if (s) pendingDayEnd = s; } },
    "You nap for an hour…",
    () => { timeSkipping = false; if (pendingDayEnd) presentDayEnd(pendingDayEnd); },
  );
}

// ---- fast travel (v2 BLOCK #4) ----------------------------------------------

/** First-arrival flavour for a newly discovered node. The town keeps block #3's
 *  bespoke greeting; the others get a short "you can travel here now" note. Each
 *  lands in the Memory Book once, ever (addMemory de-dupes by key). */
function celebrateDiscovery(node: TravelNode) {
  if (node.id === "farm") return;
  if (node.id === "town") {
    if (addMemory(memories, "first_town", "You followed the road to its end and found the coastal town.", calendar))
      logMemory(dayLog, "You followed the road to its end and found the coastal town.");
    toast("The road opens onto a coastal town — an inn, merchants, and the sea beyond. 🌊");
    return;
  }
  const text = `You discovered the ${node.label} — you can now travel here from the map.`;
  if (addMemory(memories, `discover_${node.id}`, text, calendar)) logMemory(dayLog, text);
  toast(`${node.icon} ${node.label} discovered — fast travel here is now unlocked on the map.`);
}

/** Why a fast-travel hop can't happen right now (null = go). Guards the owner's
 *  rails: never mid-fade, mid-menu, mid-dialogue/transaction, from indoors, to
 *  where she already stands, or beyond her purse. Festivals are a convenience,
 *  not a lockout, so they don't block (see WORKLOG judgment note). */
function travelGuardReason(node: TravelNode, fare: number): string | null {
  if (timeSkipping) return "You're already on your way.";
  if (openingActive || menuOpen) return "Not right now.";
  if (scene !== "world") return "Step outside before you set off.";
  if (isDialogueOpen() || isDayEndOpen() || isGuidancePromptOpen() || isShopOpen() || isStorageOpen())
    return "Finish what you're doing first.";
  if (nodeForRegion(regionAt(player.x, player.y))?.id === node.id) return "You're already here.";
  if (economy.coins < fare) return `You need ${fare} coins for the carriage fare.`;
  return null;
}

/** Pay the coachman and ride: fade out, drive the REAL minute loop (needs drain
 *  as if she'd walked — no clock teleport), reposition at full black, fade in at
 *  the destination. Mirrors sleepUntilMorning's skip pattern. */
function fastTravel(node: TravelNode) {
  const fare = effectiveFare(node);   // v2 block #5: owned transport shaves/waives the fare
  const reason = travelGuardReason(node, fare);
  if (reason) { toast(reason); return; }
  const mins = travelMinutes(player.x, player.y, node);
  economy.coins -= fare;
  saveEconomy(economy);
  timeSkipping = true;
  clearAllCustomers();   // she leaves her stall to travel
  let pendingDayEnd: DayEndSnapshot | null = null;
  fadeThrough(
    () => {
      for (let i = 0; i < mins; i++) { const s = stepGameMinute(false); if (s) pendingDayEnd = s; }
      player.x = node.x; player.y = node.y;
      player.moving = false; clearMoveTarget();
      lastQuestRegion = null;   // re-fire the region seam so arrival counts as "reached"
    },
    `Travelling to ${node.label}…`,
    () => {
      timeSkipping = false;
      if (pendingDayEnd) presentDayEnd(pendingDayEnd);
      toast(`${node.icon} You arrive at ${node.label}.`);
    },
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
  clearAllCustomers();   // v2: a collapse ends the market day
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

/** The debug panel's read of the latest AI quest offer (D3). */
function questOfferDebugLines(): string[] {
  const q = questOffers.latest();
  if (!q) return aiCtx.enabled("quests") ? ["(none generated yet — waits for a day rollover)"] : ["(quests feature off)"];
  return [`"${q.title}" — ${q.description}`, `questId=${q.questId}  reward=${q.rewardCoins}  source=${q.source}  (day ${q.day})`];
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

/** The live Guidance summary the quest log's "Getting Started" panel mirrors —
 *  the tutorial's current step or the aspiration objective — so the how-to-play
 *  layer and the goal layer read coherently in one place (never duplicated;
 *  this is a read of the guidance engine, not a second copy of it). */
function questGettingStarted(): { kicker: string; title: string; body: string } | null {
  const mode = guidanceMode();
  if (mode === "tutorial" && !guidance.tutorialDone) {
    const step = currentTutorialStep(guidance, curPath());
    if (step) return { kicker: "Tutorial", title: step.title, body: step.body };
  } else if (mode === "aspiration" && !guidance.aspirationDone) {
    const obj = currentAspiration(guidance, curPath(), economy.coins);
    if (obj) return { kicker: "Your aspiration", title: "Current goal", body: obj };
  }
  return null;
}

/** A world event advances guidance — called from the real action handlers. */
function fireGuidance(ev: GuidanceEvent) {
  if (guidanceMode() === "none") return;
  applyGuidanceResult(notifyGuidance(guidance, guidanceMode(), curPath(), ev));
}

// ---- Quest system orchestration (R6) --------------------------------------
// The engine (systems/quests.ts) owns quest state + progress and returns
// effects; this layer feeds it the world's real events (the same seams
// Guidance already hooks), applies granted rewards to economy/relationships,
// consumes delivered items, and refreshes the quest-log window. Possession
// steps ("bring me 5 fish") are re-checked live against the bag each frame.

/** How many of an item the player is holding — drives possession steps.
 *  A function declaration (hoisted) so the boot-time initQuestLog wiring can
 *  pass it before this point in the file. */
function heldCount(id: string): number { return countItem(economy.inv, id); }

/** Apply a QuestResult: consume delivered items, grant rewards, toasts,
 *  memories, and (on a change) refresh the log window. */
function applyQuestResult(res: QuestResult) {
  if (!res.changed && res.toasts.length === 0 && res.grants.length === 0) return;
  for (const c of res.consume) removeItem(economy.inv, c.id, c.qty);
  if (res.consume.length) saveEconomy(economy);
  for (const g of res.grants) grantQuestReward(g);
  for (const t of res.toasts) toast(t);
  for (const [k, txt] of res.memories) remember(k, txt);
  if (res.changed) onQuestsChanged();
}

/** Pay out one completed quest's reward (coins / items / Friendship with the
 *  giver), logging to the day ledger + firing any heart threshold crossed. */
function grantQuestReward(g: QuestResult["grants"][number]) {
  awardReputation(REP_GAIN_QUEST);   // v2 block #2: a finished quest raises your standing in town
  const r = g.reward;
  if (r.coins) {
    economy.coins += r.coins;
    saveEconomy(economy);
    logCoinsEarned(dayLog, r.coins);
  }
  if (r.items) for (const it of r.items) gainItem(economy, it.id, it.qty);
  if (r.friendship) {
    const npc = npcById(npcs, g.giver);
    if (npc) {
      const thresholds = dialogueBump(relationships, npc.def, r.friendship, calendar);
      logRelationshipChange(dayLog, npc.def.id, "friendship", r.friendship);
      for (const ev of thresholds) fireHeart(npc, ev);
    }
  }
}

/** A world event advances quests — called from the real action handlers, right
 *  beside the matching `fireGuidance` calls. */
function fireQuest(ev: QuestEvent) {
  if (activeQuests(quests).length === 0) return;   // nothing to advance
  applyQuestResult(notifyQuests(quests, ev, heldCount));
}

/** Per-frame: live-check possession steps against the bag (cheap no-op when
 *  nothing changed). */
function tickQuests() {
  if (activeQuests(quests).length === 0) return;
  const res = refreshQuests(quests, heldCount);
  if (res.changed) applyQuestResult(res);
}

/** Accept an offered quest (dialogue / AI offer). Returns whether it took. */
function acceptQuestFlow(id: string): boolean {
  const took = acceptQuest(quests, id, absoluteDay(calendar));
  if (took) { onQuestsChanged(); refreshQuests(quests, heldCount); }
  return took;
}

/** Turn a ready quest in at its giver (dialogue). */
function turnInQuestFlow(id: string): boolean {
  const res = turnInQuest(quests, id, heldCount);
  if (!res) return false;
  applyQuestResult(res);
  return true;
}

/** Abandon an active side quest (quest-log window). */
function abandonQuestFlow(id: string): boolean {
  const done = abandonQuest(quests, id);
  if (done) { toast("Quest abandoned."); onQuestsChanged(); }
  return done;
}

/** The availability context for offering (day/season/skill/relationship). */
function questAvailCtx(): AvailCtx {
  return {
    absoluteDay: absoluteDay(calendar),
    season: currentSeason(calendar),
    skillValue: (id) => skillValue(skills, id),
    friendship: (id) => readRelationship(relationships, id).friendship,
  };
}

/** Quest offer / turn-in choices for a giver, shown on their opening dialogue
 *  turn (R6 dialogue integration). Any READY quest to hand in, plus ONE new
 *  offer (a validated AI offer if the giver has one, else the first authored
 *  offerable). The AI offer only flavours the giver's WORDS — the accepted
 *  quest's steps + reward are always the authored template's (balance-safe). */
function questOptionsFor(npcId: string): QuestDialogueOption[] {
  const opts: QuestDialogueOption[] = [];

  for (const st of turnInReadyFor(quests, npcId, heldCount)) {
    const def = questDefById(st.id);
    if (!def) continue;
    opts.push({
      label: `Here's what you asked for — “${def.title}”`,
      pick: () => { turnInQuestFlow(st.id); return { line: "“That's the lot — much obliged! Here's your due.”" }; },
    });
  }

  const ai = aiOfferFor(quests, npcId);
  if (ai) {
    const def = questDefById(ai.questId);
    if (def) opts.push(offerOption(def.id, ai.title, ai.description));
  } else {
    const authored = offerableFor(quests, npcId, questAvailCtx());
    if (authored.length) opts.push(offerOption(authored[0]!.id, authored[0]!.title, authored[0]!.description));
  }
  return opts;
}

/** D3: surface a validated (or scripted-fallback) AI offer — store it so its
 *  giver offers it in dialogue, and drop a subtle nudge. Only ever called with
 *  the AI feature on (the generator is gated); with AI off nothing calls this. */
function applyAiQuestOffer(offer: AiOffer) {
  setAiOffer(quests, offer);
  const giver = npcById(npcs, offer.questId ? (questDefById(offer.questId)?.giver ?? "") : "");
  toast(giver ? `${giver.def.name} has a favour to ask, next time you pass by.` : "Someone in the village could use a hand.");
  onQuestsChanged();
}

/** The AI generator's "menu" of surfaceable templates right now (D3). */
function eligibleTemplateInfos(): TemplateInfo[] {
  return eligibleAiTemplates(quests, questAvailCtx()).map((def) => ({
    id: def.id, giver: def.giver, title: def.title, description: def.description,
    rewardCoins: def.reward.coins ?? 0,
  }));
}

/** One "will you take this?" option: the giver states the ask, then Accept /
 *  Not now. Accepting takes the AUTHORED quest (its steps + reward). */
function offerOption(questId: string, title: string, ask: string): QuestDialogueOption {
  return {
    label: `You look like you could use a hand — “${title}”`,
    pick: () => ({
      line: ask,
      options: [
        { label: "I'll do it.", pick: () => { acceptQuestFlow(questId); return { line: "“Bless you. I'll be right here when it's done.”" }; } },
        { label: "Not just now.", pick: () => ({ line: "“No matter — another time, perhaps.”" }) },
      ],
    }),
  };
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
    openTownMerchant,
    openStable,
    ownsRowboat: () => ownsTransport(transport, "rowboat"),
    openStorage: openBarnStorage,
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
  resetStorage(storage);              // R5: a new life starts with an empty barn
  resetCustomers(customerLedger);     // v2: a new life has served no customers
  resetReputation(reputation);        // v2 block #2: an unknown newcomer again
  resetDiscovery(discovery);          // v2 block #4: the world is unknown again — only the farm
  resetTransport(transport);          // v2 block #5: back on her own two feet — no boat/horse/carriage
  setMounted(false);
  for (const n of npcs) n.visit = null;   // no one is queued at the stall in a fresh world
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
  questOffers.reset();
  devNotes.reset();
  stormNarratedSeason = -1;
  resetLivestock(livestock);
  cows.length = 0; hens.length = 0; ducks.length = 0; pigs.length = 0; sheep.length = 0;   // the yard empties with the new life
  initNpcPositions(npcs, calendar, weather);   // re-snap townsfolk to fresh day-1 morning
  meta.character = character;
  meta.starterTool = path.tool;       // kept in sync for the systems that still read it
  saveMeta(meta);
  playerRigParams = rigFromCharacter(character);   // she now looks like the person she made
  playerUsesSprite = spriteCoversCharacter(character);   // matrix sprite for a covered look, else the rig
  setPlayerLook(character.gender, character.appearance);
  setGuidance(mode);                  // the Guidance Mode is a setting (kept across a New Game)
  resetGuidance(guidance);            // per-playthrough tutorial/aspiration progress starts fresh
  resetQuests(quests);                // R6: a new life carries no quests
  lastQuestRegion = null;
  onQuestsChanged();
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
  saveQuests(quests);
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
 *  while it's open (a window now — Windows migration II — so the paused game
 *  view stays visible behind it), and drains any queued world input on close. */
function openSettingsInGame() {
  if (openingActive) return;      // the menu/creation overlays own their own flow
  menuOpen = true;
  showSettingsWindow(inGameSettingsCtx(closeInGameMenu));
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
    // Pause is a full-screen overlay (#opening, z-index above the wm desktop)
    // — hide it first so the Settings WINDOW (Windows migration II, living on
    // the desktop underneath) is actually visible/clickable; closing Settings
    // re-shows Pause (showPauseScreen as its onBack), same round-trip the old
    // screenShell-based Settings did.
    onSettings: () => { hideOpening(); showSettingsWindow(inGameSettingsCtx(showPauseScreen)); },
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
  if (isDialogueOpen() || isDayEndOpen() || isGuidancePromptOpen() || isShopOpen() || isStorageOpen()) return;
  menuOpen = true;
  showPauseScreen();
}
document.getElementById("pauseBtn")!.addEventListener("click", openPause);

// The Esc cascade (Windows migration II — "polish sweep"): the topmost open
// utility window (backpack/skills/minimap/memory book/shop/gift/dialogue/
// debug/day-end/settings — anything that isn't the permanent desktop chrome)
// closes first; only once none of those are open does Esc fall through to
// Pause. A capture-phase interceptor with its own higher-priority Escape use
// (currently just the right-click context menu) still wins over both.
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (escCloseTopWindow()) return;
  openPause();
});

// v2 block #5: R mounts / dismounts the horse (guards live in toggleMount). Not
// while a menu / opening is up, and never when typing into a field.
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "r") return;
  if (menuOpen || openingActive) return;
  const tgt = e.target as HTMLElement | null;
  if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
  toggleMount();
});

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

  // R5: after dark the animals steer to the barn and settle in its lee
  const animalsNight = calendar.hour >= 20 || calendar.hour < 6;
  updateAnimals(cows, hens, ducks, pigs, sheep, dt, animalsNight);   // ambience runs even behind the opening screens
  updateWildlife(wildlife, currentSeason(calendar), weather.kind, player, dt);   // seasonal ambient critters
  // Weather visual layer (Part B #8): screen-space rain/fog/lightning keeps
  // drifting through dialogue/menu pauses too — it's ambient atmosphere, not
  // simulated game-time (a look-and-feel call, not a game-state one).
  updateWeatherFx(dt, weather.kind);
  updateQuickSummary(dt);          // the "quick" end-of-day pill fades on its own, even while paused
  // auto-pause: a conversation OR the full end-of-day panel freezes game-time
  // AND the townsfolk (they're "in conversation" / the day is officially over)
  // — the same gating pattern the title screen uses below. A minimized or closed
  // game-viewport window also pauses time (same gating as Pause): the player
  // stepped away from the world.
  const timePaused = isDialogueOpen() || isDayEndOpen() || isGuidancePromptOpen() || menuOpen || !isViewportActive();
  if (!timePaused) updateNpcs(npcs, calendar, weather, player, dt);

  if (!openingActive && !timePaused) {
  // autosave: counts real seconds of actual play (paused whenever the block
  // above is skipped — title screen / dialogue), fires + resets on the knob.
  autosaveAccum += dt;
  if (autosaveAccum >= autosaveSeconds) { autosaveAccum = 0; autosaveTick(); }

  const wasMoving = player.moving;
  updatePlayer(player, dt, mountSpeedMult(mounted));   // v2 block #5: faster while mounted
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
    // a little energy for the ground covered — but riding is stamina-free (v2 block #5)
    if (!mounted) applyWalk(needs, Math.max(0, player.dist - lastDist));
  }
  lastDist = player.dist;

  // interactions (UO-style: hover highlights, left = act/move, right = menu)
  const ictx: InteractCtx = makeCtx();

  // walking away from whichever stall is open closes the trade window
  if (isShopOpen() && openStallRect && !nearRect(player.x, player.y, openStallRect)) closeShopWindow();
  // walking away from the barn closes the storage chest (R5)
  if (isStorageOpen() && !nearRect(player.x, player.y, BARN)) closeStorageWindow();
  // walking away from the stable closes its transport shop (v2 block #5)
  if (isStableOpen() && !nearRect(player.x, player.y, STABLE)) closeStableWindow();

  // A queued "walk there, then act" click fires once the player arrives in
  // reach. MUST run before this frame's left/right-click handling below: a
  // click that just queued a fresh `pending` hasn't had a chance to move the
  // player yet (updatePlayer() already ran earlier this tick with the OLD
  // moveTarget), so checking it here — using last frame's already-settled
  // player.moving/position — never mistakes a brand-new pending for one that
  // "stopped short" before it ever got to walk anywhere.
  if (pending) {
    const obj = byId(pending.objId);
    if (obj && obj.inReach(player.x, player.y)) { runAction(obj, pending.actionId, ictx); pending = null; }
    else if (!player.moving) pending = null;   // stopped short (blocked / unreachable)
  }

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

  if (updateFishing(fishing, dt)) {
    player.fishing = false;
    // Ambient particle feedback (Part B #10): a splash-sparkle at the bobber.
    // FishingState doesn't track the exact cast point, so this approximates
    // it from the player's facing (matching the rod's own reach in rig.ts).
    burst("splash", ...bobberSpot());
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
        fireQuest({ kind: "catch" });      // Quests: "catch N fish" activity steps
        // World-event narration (#5): the first catch of a NEW species.
        if (firstOfKind) narration.enrich({ key: `species:${haul.id}`, prompt: `The player just landed their first ${haulName.toLowerCase()} — a new species for their book.` });
      }
    } else toast("Backpack full — the catch slips away!");
    arcs.recordActivity("cast");   // play-pattern tracker (#6)
    if (devNotesOn()) devNotes.observe("fish", absoluteDay(calendar));
    applyExertion(needs, "fishing");
    const gained = gainSkill(skills, "fishing", moodPerfMult(needs));
    if (gained > 0) onSkillGain("fishing", gained);
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
      fireQuest({ kind: "forage" });   // Quests: "forage N" activity steps
    } else toast("Backpack full — no room for the find!");
    arcs.recordActivity("forage");
    if (devNotesOn()) devNotes.observe("forage", absoluteDay(calendar));
    applyExertion(needs, "foraging");
    const gained = gainSkill(skills, "foraging", moodPerfMult(needs));
    if (gained > 0) onSkillGain("foraging", gained);
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
    fireQuest({ kind: "busk" });           // Quests: "busk N times" activity steps
    arcs.recordActivity("busk");
    if (devNotesOn()) devNotes.observe("busk", absoluteDay(calendar));
    applyExertion(needs, "busking");
    const gained = gainSkill(skills, "busking", moodPerfMult(needs));
    if (gained > 0) onSkillGain("busking", gained);
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
        fireQuest({ kind: "cook" });      // Quests: "cook N dishes" activity steps
        if (devNotesOn()) devNotes.observe("cook", absoluteDay(calendar));
      } else toast("Backpack full — the dish burns while you rummage!");
      const gained = gainSkill(skills, "cooking", moodPerfMult(needs));
      if (gained > 0) onSkillGain("cooking", gained);
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
        burst("leafpuff", cell.x, cell.y);   // Ambient particle feedback (Part B #10)
        remember("first_harvest", "The first harvest from your own soil.");
        logHarvest(dayLog);
        fireGuidance({ kind: "harvest" });   // Guidance: farmer aspiration progress
        fireQuest({ kind: "harvest" });      // Quests: "harvest N crops" activity steps
        arcs.recordActivity("harvest");
        if (devNotesOn()) devNotes.observe("farm", absoluteDay(calendar));
        const gained = gainSkill(skills, "farming", moodPerfMult(needs));
        if (gained > 0) onSkillGain("farming", gained);
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
  // Quests: crossing into a new region advances any "reach <region>" step.
  if (region !== lastQuestRegion) {
    lastQuestRegion = region;
    fireQuest({ kind: "reach", region });
    // v2 BLOCK #4: reaching a named location on foot unlocks it as a fast-travel
    // node. block #3's bespoke first-town greeting is now one case of the general
    // discovery ledger (discoverRegion celebrates each node once, ever).
    const found = discoverRegion(discovery, region);
    if (found) celebrateDiscovery(found);
  }
  // Festival engine: first time entering the market during festival hours
  // TODAY, greet it with a toast; the very first time EVER, that's also the
  // Memory Book entry (remember() only celebrates it once, ever).
  if (region === "market" && activeFestival(calendar) && festivalGreetedDay !== absoluteDay(calendar)) {
    festivalGreetedDay = absoluteDay(calendar);
    remember("first_harvest_festival", "Your first Harvest Festival — banners over the square, music in the air.");
    toast("The square is alive with the Harvest Festival! 🎉");
    awardReputation(REP_GAIN_FESTIVAL);   // v2 block #2: turning up at the festival raises your standing (once/day)
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
  updateReputationUI(reputation.fame, reputationTier(reputation.fame).name);   // v2 block #2: town Fame line
  updateShopWindow();
  updateStorageWindow();
  updateStableWindow();
  updateMemoryBook();
  updateQuestLog();
  if (!openingActive) { tickGuidance(); tickQuests(); }   // guidance bubble/pill + live quest possession checks
  updateToast(dt);
  // One-time ground re-bake once the pixel tiles have decoded (see boot note).
  if (!groundRebaked && groundTilesAvailable()) {
    ground = paintGround();
    groundRebaked = groundIsTiled();
  }
  // skip the world render when the viewport window is minimized/closed (its
  // canvas is hidden) — the game is paused anyway; nothing to show.
  if (isViewportActive()) draw(dt);
  requestAnimationFrame(tick);
}

function draw(dt: number) {
  if (scene === "interior") { drawInteriorScene(); return; }
  // North sky margin (Part B #7): lets the camera pull back past the world's
  // y=0 edge near the top of the map, revealing the parallax band's sky gap.
  const { camx, camy, vw, vh } = applyCamera(ctx, cv, player.x, player.y, undefined, CAM_NORTH_SKY_MARGIN);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(camx, camy, vw, vh);
  drawParallaxBand(ctx, camx);   // beyond-the-world backdrop, drawn BEFORE the (opaque) ground clips its seam
  ctx.drawImage(ground, 0, 0);
  // Diagonal cast shadows (Part B #3): the "sun position" for this frame,
  // read by every drawFn's castShadow() call below via shapes.ts's tiny
  // module-level setter (same pattern camera.ts uses for `lastCam`) — set
  // once here rather than threading hour/minute through dozens of painters.
  { const sf = shadowFactors(calendar.hour, calendar.minute); setSunFactors(sf.lenMult, sf.alphaMult); }
  // Ambient particle system (Part B #10): advance before drawing, using the
  // just-computed viewport so seasonal drift spawns/recycles within view.
  updateParticles(dt, currentSeason(calendar), currentPhase(calendar), { camx, camy, vw, vh });
  drawWaterShimmer(ctx, time);
  drawOpenWaterShimmer(ctx, time);       // river + lake surface + fishing-spot ripples
  drawDock(ctx, time);                    // walkable, drawn at ground level under entities
  drawDock(ctx, time, TOWN_DOCK);         // the coastal town's dock (v2 BLOCK #3)
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
      drawCropTile(ctx, c.x, c.y, c.growth, time, cropById(c.cropId ?? "")?.palette, c.watered,
        cropById(c.cropId ?? "")?.growth, c.cropId ?? "");
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
    { y: player.y + 13, f: () => {
      // v2 block #5: a code-drawn horse under her when mounted; she rides lifted
      // onto its back (drawn after, so she sits on top).
      if (mounted) {
        drawMount(ctx, player, time);
        ctx.save(); ctx.translate(0, -MOUNT_LIFT);
        drawFarmer(ctx, player, time, playerRigParams, playerUsesSprite);
        ctx.restore();
      } else {
        drawFarmer(ctx, player, time, playerRigParams, playerUsesSprite);
      }
    } },
    // the neighbour farm (cared-for: repaired roof/window/barn) — decorative;
    // its own established/prosperous farmhouse sprite (building-variety batch),
    // barn reuses the player's barn sprite as-is.
    { y: NEIGHBOR.house.y + NEIGHBOR.house.h, f: () => drawHouse(ctx, true, true, NEIGHBOR.house, "buildings/farmhouse-neighbor") },
    { y: NEIGHBOR.barn.y + NEIGHBOR.barn.h, f: () => drawBarn(ctx, true, NEIGHBOR.barn) },
    { y: WELL.cy + WELL.r, f: () => drawWell(ctx, WELL.cx, WELL.cy, WELL.r) },
    { y: OLD_BUSK_SIGN[1], f: () => drawBuskSign(ctx, OLD_BUSK_SIGN[0], OLD_BUSK_SIGN[1]) },
  ];
  // Each market stall now draws with its OWN themed sprite (fish/produce/
  // goods/empty — building-variety batch), not the generic recolored one.
  MARKET_STALLS.forEach((s) => ents.push({ y: s.y + s.h, f: () => drawStall(ctx, time, s, s.awning, s.accent, s.sign, true) }));
  // Each cottage gets its own approved variant (zones.ts CottageDef.variant) —
  // "no two neighbors alike" (building-variety batch).
  COTTAGES.forEach((c, i) => ents.push({ y: c.y + c.h, f: () => drawCottage(ctx, c, 700 + i * 37, c.variant) }));
  // Coastal town (v2 BLOCK #3): the inn (largest, code-drawn), NPC homes (unused
  // cottage variants 1/5 + seed-distinct code cottages — no two alike), and the
  // specialised merchant stalls (each a DISTINCT banked spare-stall sprite).
  ents.push({ y: INN.y + INN.h, f: () => drawInn(ctx, INN) });
  ents.push({ y: STABLE.y + STABLE.h, f: () => drawStable(ctx, STABLE) });   // v2 block #5 transport vendor
  TOWN_HOMES.forEach((home) => ents.push({ y: home.y + home.h, f: () => drawCottage(ctx, home, home.seed, home.variant) }));
  TOWN_MERCHANTS.forEach((m) => ents.push({ y: m.y + m.h, f: () => drawStall(ctx, time, m, m.awning, m.accent, m.sign, true, m.spriteId) }));
  if (festival) {
    FESTIVAL_LANTERN_SPOTS.forEach(([lx, ly]) => ents.push({ y: ly, f: () => drawLanternPole(ctx, lx, ly, time) }));
    FESTIVAL_HARVEST_CLUSTERS.forEach(([hx, hy]) => ents.push({ y: hy + 6, f: () => drawHarvestCluster(ctx, hx, hy) }));
  }
  // ambient foliage scatter + curated world props (both non-interactive, base-
  // on-ground, depth-sorted alongside trees/bushes/entities)
  for (const it of foliageScatter) ents.push({ y: it.y, f: () => drawScatterItem(ctx, it) });
  for (const p of WORLD_PROPS) ents.push({ y: p.y, f: () => drawProp(ctx, p.x, p.y, p.id, p.scale) });
  for (const [tx, ty] of WORLD_TREES) ents.push({ y: ty + 6, f: () => drawTree(ctx, tx, ty, time, currentSeason(calendar)) });
  for (const b of bushes) ents.push({ y: b.y + 8, f: () => drawBush(ctx, b.x, b.y, b.full, time, currentSeason(calendar)) });
  for (const c of cows) ents.push({ y: c.y + 14, f: () => drawCow(ctx, c, time) });
  for (const h of hens) ents.push({ y: h.y + 6, f: () => drawHen(ctx, h, time) });
  for (const d of ducks) ents.push({ y: d.y + 6, f: () => drawDuck(ctx, d, time) });
  for (const p of pigs) ents.push({ y: p.y + 10, f: () => drawPig(ctx, p, time) });
  for (const s of sheep) ents.push({ y: s.y + 12, f: () => drawSheep(ctx, s, time) });
  for (const w of wildlife) ents.push({ y: w.y + 6, f: () => drawWildlife(ctx, w, time) });
  // townsfolk, unless indoors (asleep / at home). Name label shows only when
  // this NPC is hovered or in reach — same "only when relevant" rule as prompts.
  for (const n of npcs) {
    if (n.indoors) continue;
    const tag = `npc-${n.def.id}`;
    const showLabel = hovered?.id === tag || nearReach?.id === tag;
    // subtle ♥ Friendship / ⚭ Romance readout on the pill, only when labelled
    const rel = showLabel ? relationshipSummary(n.def, relationships) : undefined;
    // v2 customers: a customer heading to / waiting at the stall always shows a
    // name label and a little 🛒 bubble, so she can see who's come to buy.
    const customer = !!n.visit;
    ents.push({ y: n.y + 13, f: () => {
      drawNpc(ctx, n, time, showLabel || customer, rel);
      if (customer) drawCustomerBubble(ctx, n.x, n.y, time);
    } });
  }
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.f();

  if (hovered) hovered.drawHover(ctx, time);

  drawParticles(ctx);   // world-space, depth-agnostic: above every entity, below the tint/vignette

  for (const s of smoke) {
    ctx.fillStyle = `rgba(230,230,235,${s.a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  }

  // Day/night tint (Part B #9) + weather visual layer (Part B #8): both are
  // screen-space composite passes over the finished world render, BEFORE the
  // HUD (the HUD is DOM, outside this canvas, so it's unaffected either way).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintDayNightTint(ctx, cv.width, cv.height, calendar.hour, calendar.minute);
  drawWeatherFx(ctx, cv.width, cv.height, weather.kind);

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
  drawFarmer(ctx, player, time, playerRigParams, playerUsesSprite);
  if (hovered) hovered.drawHover(ctx, time);
  // Day/night tint indoors: the same continuous clock, milder (DECISIONS-
  // grounded call: a room with a fire/lamp shouldn't go as dark as the yard).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  paintDayNightTint(ctx, cv.width, cv.height, calendar.hour, calendar.minute, true);
  drawVignette("rgba(60,45,25,0)", "rgba(15,10,5,.42)");   // dimmer indoors
}

void WORLD_W;
requestAnimationFrame(tick);
