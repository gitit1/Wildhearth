import { WORLD_W, FORAGE_BASE_YIELD, STARTER_SKILL_SEED } from "./config";
import {
  initInput, consumeAction, consumeLeftClick, consumeRightClick,
  getPointerScreen, setMoveTarget, clearMoveTarget,
} from "./engine/input";
import { applyCamera, screenToWorld } from "./engine/camera";
import { paintGround } from "./world/ground";
import { HOUSE, BARN, STALL, TREES, BUSK_SPOT } from "./world/zones";
import {
  drawTree, drawFence, drawBush, drawTilledTile, drawCropTile,
  drawBuskSpot, drawMusicNotes, drawWaterShimmer,
} from "./art/props";
import { drawHouse, drawBarn, drawStall } from "./art/buildings";
import { drawFarmer, drawCow, drawHen } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals, spawnCow, spawnHen } from "./entities/animals";
import { loadLivestock, resetLivestock } from "./systems/livestock";
import { loadEconomy, gainItem, saveEconomy } from "./systems/economy";
import { createFishing, updateFishing, cancelCast } from "./systems/fishing";
import { createBushes, createForaging, updateForaging, cancelPick } from "./systems/foraging";
import {
  createPlots, createFarmWork, updateFarmWork, updatePlots, cancelWork,
} from "./systems/farming";
import { createBusking, updateBusking, cancelBusk, rollTip } from "./systems/busking";
import { removeItem, countItem, addItem } from "./systems/inventory";
import { loadSkills, gainSkill, skillValue, getSkill, saveSkills } from "./systems/skills";
import { saveSettings, isGuided, dayLengthSeconds } from "./systems/settings";
import { loadFarm, resetFarm } from "./systems/renovation";
import { loadCalendar, resetCalendar, advanceMinute, currentSeason, absoluteDay } from "./systems/calendar";
import { loadWeather, resetWeather, rollDailyWeather } from "./systems/weather";
import { loadWorldFlags, resetWorldFlags, pruneExpired } from "./systems/worldFlags";
import { loadMeta, saveMeta } from "./systems/meta";
import { hasSavedGame, clearSavedGame } from "./systems/saves";
import { getWorldContext } from "./systems/worldContext";
import {
  hitTest, reachable, byId, runAction, runDefault, defaultActionLabel, registerBushes, registerPlots,
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
import { nearRect } from "./world/collision";

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
const ground = paintGround();
const player = createPlayer();
const livestock = loadLivestock();
const { cows, hens } = createAnimals(livestock);   // only what's been bought — no free animals
const economy = loadEconomy();
const fishing = createFishing();
const foraging = createForaging();
const bushes = createBushes();
const plots = createPlots();
const farmwork = createFarmWork();
const busking = createBusking();
const skills = loadSkills();
const farm = loadFarm();
const calendar = loadCalendar();
const weather = loadWeather();
const worldFlags = loadWorldFlags();
const meta = loadMeta();
registerBushes(bushes);
registerPlots(plots);
initBackpack(economy);
initMinimap();
initSkillsUI(skills);
initShopWindow(economy, skills, farm, livestock,
  (kind) => { if (kind === "cow") cows.push(spawnCow()); else hens.push(spawnHen()); },
  toast);

interface Puff { x: number; y: number; a: number; r: number }
const smoke: Puff[] = [];

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
  for (const c of plots) { c.state = "wild"; c.growth = 0; }
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
    }
  }

  // interactions (UO-style: hover highlights, left = act/move, right = menu)
  const ictx: InteractCtx = { economy, fishing, foraging, farmwork, busking, skills, farm, player, toast, openShop: openShopWindow };

  // walking away from the stall closes the trade window
  if (isShopOpen() && !nearRect(player.x, player.y, STALL)) closeShopWindow();

  const ps = getPointerScreen();
  hovered = ps ? hitTest(...screenToWorld(ps[0], ps[1])) : null;
  cv.style.cursor = hovered ? "pointer" : "default";

  const near = reachable(player.x, player.y);
  if (fishing.casting) setPrompt("Waiting for a bite...");
  else if (foraging.picking) setPrompt("Picking berries...");
  else if (farmwork.working)
    setPrompt(farmwork.kind === "till" ? "Tilling the soil..." : farmwork.kind === "plant" ? "Planting seeds..." : "Harvesting...");
  else if (busking.playing) setPrompt("Playing a tune...");
  else if (near) setPrompt(defaultActionLabel(near, ictx));
  else setPrompt(null);

  // left-click: act on a clicked object (walking to it first), else walk to the point
  const lc = consumeLeftClick();
  if (lc) {
    const obj = hitTest(lc.wx, lc.wy);
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
    const obj = hitTest(rc.wx, rc.wy);
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
  if (consumeAction() && near && !fishing.casting && !foraging.picking && !farmwork.working && !busking.playing)
    runDefault(near, ictx);

  // a queued action fires once the player arrives in reach
  if (pending) {
    const obj = byId(pending.objId);
    if (obj && obj.inReach(player.x, player.y)) { runAction(obj, pending.actionId, ictx); pending = null; }
    else if (!player.moving) pending = null;   // stopped short (blocked / unreachable)
  }

  if (updateFishing(fishing, dt)) {
    player.fishing = false;
    if (gainItem(economy, "fish")) toast("Caught a fish! 🐟");
    else toast("Backpack full — no room for the fish!");
    const gained = gainSkill(skills, "fishing");
    if (gained > 0) skillGainPopup("fishing", gained);
    if (isGuided() && !hintSellShown) {
      hintSellShown = true;
      setTimeout(() => toast("Sell your catch: walk to the stall and Trade."), 2400);
    }
  }
  if (updateForaging(foraging, bushes, dt)) {
    // higher Foraging = a growing chance of an extra berry per pick
    const bonus = Math.random() < skillValue(skills, "foraging") / 100 ? 1 : 0;
    const n = FORAGE_BASE_YIELD + bonus;
    if (gainItem(economy, "berries", n)) toast(n > 1 ? `Picked ${n} berries!` : "Picked a berry!");
    else toast("Backpack full — no room for berries!");
    const gained = gainSkill(skills, "foraging");
    if (gained > 0) skillGainPopup("foraging", gained);
  }
  if (updateBusking(busking, dt)) {
    const tip = rollTip(skillValue(skills, "busking"));
    economy.coins += tip;
    saveEconomy(economy);
    toast(`Earned ${tip} coin${tip === 1 ? "" : "s"} busking! 🎶`);
    const gained = gainSkill(skills, "busking");
    if (gained > 0) skillGainPopup("busking", gained);
  }
  updatePlots(plots, dt, skillValue(skills, "farming"));
  const farmDone = updateFarmWork(farmwork, dt);
  if (farmDone) {
    const { cell, kind } = farmDone;
    if (kind === "till") {
      cell.state = "tilled";
      toast("The soil is ready for seeds.");
    } else if (kind === "plant") {
      if (countItem(economy.inv, "seeds") > 0 && removeItem(economy.inv, "seeds", 1)) {
        saveEconomy(economy);
        cell.state = "growing"; cell.growth = 0;
        toast("Seeds planted!");
      }
    } else {
      if (gainItem(economy, "corn")) {
        cell.state = "tilled"; cell.growth = 0;
        toast("Harvested corn! 🌽");
        const gained = gainSkill(skills, "farming");
        if (gained > 0) skillGainPopup("farming", gained);
      } else toast("Backpack full — no room for the corn!");
    }
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
  const wc = getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags });
  updateHud(economy, wc.calendar);
  updateBackpack();
  updateMinimap(player);
  updateSkillsUI();
  updateShopWindow();
  updateToast(dt);
  draw();
  requestAnimationFrame(tick);
}

function draw() {
  const { camx, camy, vw, vh } = applyCamera(ctx, cv, player.x, player.y);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(camx, camy, vw, vh);
  ctx.drawImage(ground, 0, 0);
  drawWaterShimmer(ctx, time);
  drawFence(ctx, farm.fence);

  // the farm plot inside the fenced field (ground-level, under entities)
  for (const c of plots) {
    if (c.state === "tilled") drawTilledTile(ctx, c.x, c.y);
    else if (c.state === "growing" || c.state === "ready") drawCropTile(ctx, c.x, c.y, c.growth, time);
  }
  drawBuskSpot(ctx, BUSK_SPOT[0], BUSK_SPOT[1], time);
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

  // warm daylight vignette (screen space)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const grd = ctx.createRadialGradient(
    cv.width / 2, cv.height / 2, cv.height * 0.35,
    cv.width / 2, cv.height / 2, cv.height * 0.95
  );
  grd.addColorStop(0, "rgba(255,240,200,0)");
  grd.addColorStop(1, "rgba(60,50,20,.18)");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, cv.width, cv.height);
}

void WORLD_W;
requestAnimationFrame(tick);
