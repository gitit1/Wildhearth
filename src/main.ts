import { WORLD_W, FORAGE_BASE_YIELD, STARTER_SKILL_SEED } from "./config";
import {
  initInput, consumeAction, consumeLeftClick, consumeRightClick,
  getPointerScreen, setMoveTarget, clearMoveTarget,
} from "./engine/input";
import { applyCamera, screenToWorld, adjustZoom } from "./engine/camera";
import { paintGround } from "./world/ground";
import { HOUSE, BARN, STALL, TREES, BUSK_SPOT, HOUSE_DOOR, ROOM, ROOM_ENTRY, FLOWER_BEDS } from "./world/zones";
import { drawInterior } from "./art/interior";
import {
  drawTree, drawFence, drawBush, drawTilledTile, drawCropTile, drawWiltedTile,
  drawFlowerBed, drawBuskSpot, drawMusicNotes, drawWaterShimmer,
} from "./art/props";
import { drawHouse, drawBarn, drawStall } from "./art/buildings";
import { drawFarmer, drawCow, drawHen } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals, spawnCow, spawnHen } from "./entities/animals";
import { loadLivestock, resetLivestock } from "./systems/livestock";
import { loadEconomy, gainItem, saveEconomy } from "./systems/economy";
import { createFishing, updateFishing, cancelCast, resolveCatch } from "./systems/fishing";
import { createBushes, createForaging, updateForaging, resolveForage, cancelPick } from "./systems/foraging";
import {
  loadPlots, savePlots, resetPlots, createFarmWork, updateFarmWork, updatePlots,
  rollPlotsDay, cancelWork,
} from "./systems/farming";
import { cropById, cropBySeed } from "./data/crops";
import { createBusking, updateBusking, cancelBusk, rollTip } from "./systems/busking";
import { createCooking, updateCooking, cancelCook } from "./systems/cooking";
import { recipeById } from "./data/recipes";
import { loadGarden, resetGarden, saveGarden, updateGarden } from "./systems/gardening";
import { loadCollections, resetCollections, discover, discoveredName } from "./systems/collections";
import { loadMemories, resetMemories, addMemory } from "./systems/memories";
import { initMemoryBook, updateMemoryBook } from "./ui/memorybook";
import { initDebugPanel, updateDebugPanel } from "./ui/debugpanel";
import { removeItem, countItem, addItem, ITEM_NAMES } from "./systems/inventory";
import { loadSkills, gainSkill, skillValue, getSkill, saveSkills } from "./systems/skills";
import { saveSettings, isGuided, dayLengthSeconds } from "./systems/settings";
import { loadFarm, resetFarm } from "./systems/renovation";
import { loadCalendar, resetCalendar, advanceMinute, currentSeason, currentPhase, absoluteDay } from "./systems/calendar";
import { loadWeather, resetWeather, rollDailyWeather, isRaining } from "./systems/weather";
import { loadWorldFlags, resetWorldFlags, pruneExpired } from "./systems/worldFlags";
import { loadMeta, saveMeta } from "./systems/meta";
import { hasSavedGame, clearSavedGame } from "./systems/saves";
import { getWorldContext } from "./systems/worldContext";
import {
  hitTest, reachable, byId, runAction, runDefault, defaultActionLabel,
  registerBushes, registerPlots, registerAnimal, registerFlowerBeds,
  type Interactable, type InteractCtx,
} from "./systems/interact";
import { openContextMenu, closeContextMenu } from "./ui/contextmenu";
import { updateHud, setPrompt, toast, updateToast } from "./ui/hud";
import { initBackpack, updateBackpack } from "./ui/backpack";
import { initMinimap, updateMinimap } from "./ui/minimap";
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
const plots = loadPlots();     // the field persists: crops, watering, wilt
const farmwork = createFarmWork();
const busking = createBusking();
const cooking = createCooking();
const skills = loadSkills();
const farm = loadFarm();
const garden = loadGarden();
const collections = loadCollections();
const memories = loadMemories();
const calendar = loadCalendar();
const weather = loadWeather();
const worldFlags = loadWorldFlags();
const meta = loadMeta();
registerBushes(bushes);
registerPlots(plots, () => currentSeason(calendar));
registerFlowerBeds(garden);
for (const c of cows) registerAnimal("cow", c, cows);
for (const h of hens) registerAnimal("hen", h, hens);
initBackpack(economy);
initMinimap();
initSkillsUI(skills);
initMemoryBook(collections, memories);
initDebugPanel();

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
  clearMoveTarget(); closeContextMenu();
  pending = null;
}

function leaveHouse() {
  scene = "world";
  setCollisionScene(scene);
  player.x = HOUSE_DOOR.x + HOUSE_DOOR.w / 2;
  player.y = HOUSE.y + HOUSE.h + 16;
  player.moving = false; player.dir = 2;     // stepping out, facing the yard
  clearMoveTarget(); closeContextMenu();
  pending = null;
}

// ---- opening sequence (title -> intro -> reveal -> choice -> tutorial) ----
let openingActive = true;
let hintSellShown = false;
let minuteAccum = 0;   // real seconds banked toward the next in-game minute

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
  economy.coins = 0;
  economy.inv.slots.fill(null);
  addItem(economy.inv, tool);
  saveEconomy(economy);
  for (const s of skills.list) { s.value = 0; s.lock = "up"; }
  const seeded = getSkill(skills, tool === "hoe" ? "farming" : tool === "rod" ? "fishing" : "busking");
  if (seeded) seeded.value = STARTER_SKILL_SEED;
  saveSkills(skills);
  resetPlots(plots);
  resetGarden(garden);
  resetCollections(collections);
  resetMemories(memories);
  for (const b of bushes) { b.full = true; b.regrow = 0; }
  resetFarm(farm);
  resetCalendar(calendar);
  resetWeather(weather);
  resetWorldFlags(worldFlags);
  resetLivestock(livestock);
  cows.length = 0; hens.length = 0;   // the yard empties with the new life
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
let pending: { objId: string; actionId: string } | null = null;  // action to run once in reach

let last = performance.now(), time = 0;

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;

  updateAnimals(cows, hens, dt);   // ambience runs even behind the opening screens

  if (!openingActive) {
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
  // dayLengthSeconds of actual play, so one minute is that over 24*60. Each new
  // day (advanceMinute returns true) rerolls the weather and prunes flags once.
  const minuteSeconds = dayLengthSeconds() / (24 * 60);
  minuteAccum += dt;
  while (minuteAccum >= minuteSeconds) {
    minuteAccum -= minuteSeconds;
    if (advanceMinute(calendar)) {
      rollDailyWeather(weather, currentSeason(calendar));
      pruneExpired(worldFlags, absoluteDay(calendar));
      rollPlotsDay(plots, isRaining(weather));   // rain waters for free; dry crops bank a day toward wilting
    }
  }

  // interactions (UO-style: hover highlights, left = act/move, right = menu)
  const ictx: InteractCtx = {
    economy, fishing, foraging, farmwork, busking, cooking, skills, farm, garden, player,
    toast, openShop: openShopWindow, enterHouse, leaveHouse, skillPopup: skillGainPopup,
    memory: remember,
  };

  // walking away from the stall closes the trade window
  if (isShopOpen() && !nearRect(player.x, player.y, STALL)) closeShopWindow();

  const ps = getPointerScreen();
  hovered = ps ? hitTest(...screenToWorld(ps[0], ps[1]), scene) : null;
  cv.style.cursor = hovered ? "pointer" : "default";

  const near = reachable(player.x, player.y, scene);
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
    // what actually bit: species/junk table roll against skill, season, weather
    const haul = resolveCatch(skillValue(skills, "fishing"), currentSeason(calendar), weather.kind);
    const haulName = ITEM_NAMES[haul.id] ?? haul.id;
    if (gainItem(economy, haul.id)) {
      toast(haul.kind === "junk" ? `You fished up... ${haulName.toLowerCase()}.` : `Caught a ${haulName}! 🐟`);
      if (haul.kind === "fish") {
        record("fish", haul.id);
        remember("first_catch", "Your first catch — the pond gave something back.");
      }
    } else toast("Backpack full — the catch slips away!");
    const gained = gainSkill(skills, "fishing");
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
    const gained = gainSkill(skills, "foraging");
    if (gained > 0) skillGainPopup("foraging", gained);
  }
  if (updateBusking(busking, dt)) {
    const tip = rollTip(skillValue(skills, "busking"));
    economy.coins += tip;
    saveEconomy(economy);
    toast(`Earned ${tip} coin${tip === 1 ? "" : "s"} busking! 🎶`);
    remember("first_busk", "You played for strangers, and they paid — first tips.");
    const gained = gainSkill(skills, "busking");
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
      const gained = gainSkill(skills, "cooking");
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
        const gained = gainSkill(skills, "farming");
        if (gained > 0) skillGainPopup("farming", gained);
      } else if (crop) toast(`Backpack full — no room for the ${crop.name.toLowerCase()}!`);
    }
    savePlots(plots);
  }
  } else {
    setPrompt(null);
    hovered = null;
  }

  // chimney smoke
  if (Math.random() < dt * 3)
    smoke.push({ x: HOUSE.x + HOUSE.w * 0.765, y: HOUSE.y - HOUSE.h * 0.16, a: 0.5, r: 3 });
  for (const s of smoke) {
    s.y -= 14 * dt; s.x += Math.sin(time * 2 + s.y * 0.1) * 6 * dt;
    s.a -= dt * 0.16; s.r += dt * 5;
  }
  for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i]!.a <= 0) smoke.splice(i, 1);

  // one World Context snapshot per frame, feeding the always-visible HUD
  // and (when toggled) the dev inspector — never a second call per frame
  const wc = getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags });
  updateHud(economy, wc.calendar);
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
  drawFence(ctx, farm.fence);

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
    { y: BARN.y + BARN.h, f: () => drawBarn(ctx, farm.barn) },
    { y: STALL.y + STALL.h, f: () => drawStall(ctx, time) },
    { y: player.y + 13, f: () => drawFarmer(ctx, player, time) },
  ];
  for (const [tx, ty] of TREES) ents.push({ y: ty + 6, f: () => drawTree(ctx, tx, ty, time) });
  for (const b of bushes) ents.push({ y: b.y + 8, f: () => drawBush(ctx, b.x, b.y, b.full, time) });
  for (const c of cows) ents.push({ y: c.y + 14, f: () => drawCow(ctx, c, time) });
  for (const h of hens) ents.push({ y: h.y + 6, f: () => drawHen(ctx, h, time) });
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
