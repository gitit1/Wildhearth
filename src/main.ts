import { WORLD_W } from "./config";
import { initInput, consumeAction } from "./engine/input";
import { applyCamera } from "./engine/camera";
import { paintGround } from "./world/ground";
import { HOUSE, BARN, STALL, TREES } from "./world/zones";
import { nearPond, nearRect } from "./world/collision";
import { drawTree, drawFence, drawCorn, drawWaterShimmer } from "./art/props";
import { drawHouse, drawBarn, drawStall } from "./art/buildings";
import { drawFarmer, drawCow, drawHen } from "./art/characters";
import { createPlayer, updatePlayer } from "./entities/player";
import { createAnimals, updateAnimals } from "./entities/animals";
import { loadEconomy, addFish, sellFish } from "./systems/economy";
import { createFishing, startCast, updateFishing, cancelCast } from "./systems/fishing";
import { updateHud, setPrompt, toast, updateToast } from "./ui/hud";

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

interface Puff { x: number; y: number; a: number; r: number }
const smoke: Puff[] = [];

let last = performance.now(), time = 0;

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;

  const wasMoving = player.moving;
  updatePlayer(player, dt);
  if (player.moving && !wasMoving && fishing.casting) { cancelCast(fishing); player.fishing = false; }
  updateAnimals(cows, hens, dt);

  // interactions
  const atPond = nearPond(player.x, player.y);
  const atStall = nearRect(player.x, player.y, STALL);
  if (fishing.casting) setPrompt("...מחכה שדג יינשך");
  else if (atStall && economy.fish > 0) setPrompt("E — למכור את הדגים");
  else if (atPond) setPrompt("E — לדוג");
  else setPrompt(null);

  if (consumeAction()) {
    if (atStall && economy.fish > 0) {
      const earned = sellFish(economy);
      toast(`נמכרו דגים תמורת ${earned} מטבעות!`);
    } else if (atPond && !fishing.casting) {
      startCast(fishing);
      player.fishing = true;
    }
  }
  if (updateFishing(fishing, dt)) {
    player.fishing = false;
    addFish(economy);
    toast("דג נתפס! 🐟");
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
