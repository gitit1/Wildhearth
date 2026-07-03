import { WORLD_W } from "./config";
import {
  initInput, consumeAction, consumeLeftClick, consumeRightClick,
  getPointerScreen, setMoveTarget,
} from "./engine/input";
import { applyCamera, screenToWorld } from "./engine/camera";
import { paintGround } from "./world/ground";
import { HOUSE, BARN, STALL, TREES } from "./world/zones";
import { drawTree, drawFence, drawCorn, drawWaterShimmer } from "./art/props";
import { drawHouse, drawBarn, drawStall } from "./art/buildings";
import { drawFarmer, drawCow, drawHen } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals } from "./entities/animals";
import { loadEconomy, gainItem } from "./systems/economy";
import { createFishing, updateFishing, cancelCast } from "./systems/fishing";
import { loadSkills, gainSkill } from "./systems/skills";
import {
  hitTest, reachable, byId, runAction, runDefault, defaultActionLabel,
  type Interactable, type InteractCtx,
} from "./systems/interact";
import { openContextMenu, closeContextMenu } from "./ui/contextmenu";
import { updateHud, setPrompt, toast, updateToast } from "./ui/hud";
import { initBackpack, updateBackpack } from "./ui/backpack";
import { initMinimap, updateMinimap } from "./ui/minimap";
import { initSkillsUI, updateSkillsUI, skillGainPopup } from "./ui/skills";

const cv = document.getElementById("cv") as HTMLCanvasElement;
const ctx = cv.getContext("2d")!;
function fit() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener("resize", fit); fit();

initInput(cv, document.getElementById("actBtn")!);
const ground = paintGround();
const player = createPlayer();
const { cows, hens } = createAnimals();
const economy = loadEconomy();
const fishing = createFishing();
const skills = loadSkills();
initBackpack(economy);
initMinimap();
initSkillsUI(skills);

interface Puff { x: number; y: number; a: number; r: number }
const smoke: Puff[] = [];

let hovered: Interactable | null = null;              // object under the cursor (for the glow)
let pending: { objId: string; actionId: string } | null = null;  // action to run once in reach

let last = performance.now(), time = 0;

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;

  const wasMoving = player.moving;
  updatePlayer(player, dt);
  if (player.moving && !wasMoving && fishing.casting) { cancelCast(fishing); player.fishing = false; }
  updateAnimals(cows, hens, dt);

  // interactions (UO-style: hover highlights, left = act/move, right = menu)
  const ictx: InteractCtx = { economy, fishing, skills, player, toast };

  const ps = getPointerScreen();
  hovered = ps ? hitTest(...screenToWorld(ps[0], ps[1])) : null;
  cv.style.cursor = hovered ? "pointer" : "default";

  const near = reachable(player.x, player.y);
  if (fishing.casting) setPrompt("Waiting for a bite...");
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
  if (consumeAction() && near && !fishing.casting) runDefault(near, ictx);

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
  }

  // chimney smoke
  if (Math.random() < dt * 3)
    smoke.push({ x: HOUSE.x + HOUSE.w * 0.765, y: HOUSE.y - HOUSE.h * 0.16, a: 0.5, r: 3 });
  for (const s of smoke) {
    s.y -= 14 * dt; s.x += Math.sin(time * 2 + s.y * 0.1) * 6 * dt;
    s.a -= dt * 0.16; s.r += dt * 5;
  }
  for (let i = smoke.length - 1; i >= 0; i--) if (smoke[i]!.a <= 0) smoke.splice(i, 1);

  updateHud(economy);
  updateBackpack();
  updateMinimap(player);
  updateSkillsUI();
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
  drawFence(ctx);
  drawCorn(ctx, time);

  // depth-sorted world objects + entities
  const ents: Array<{ y: number; f: () => void }> = [
    { y: HOUSE.y + HOUSE.h, f: () => drawHouse(ctx) },
    { y: BARN.y + BARN.h, f: () => drawBarn(ctx) },
    { y: STALL.y + STALL.h, f: () => drawStall(ctx, time) },
    { y: player.y + 13, f: () => drawFarmer(ctx, player, time) },
  ];
  for (const [tx, ty] of TREES) ents.push({ y: ty + 6, f: () => drawTree(ctx, tx, ty, time) });
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
