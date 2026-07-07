/**
 * Parallax background band (Part B #7) — a distant strip painted ONCE to an
 * offscreen canvas (same pre-bake technique world/ground.ts uses for the
 * main ground), then blitted every frame with a horizontal offset that lags
 * the camera (`PARALLAX_FACTOR` < 1) so it reads as "beyond the world", not a
 * sticker pasted on top of it. It only ever shows in the sky/horizon gap the
 * camera reveals north of the world's y=0 edge (camera.ts's `northMargin`) —
 * for most play the player is well south of that edge and the band simply
 * doesn't appear.
 *
 * Placement (a judgment call, grounded in docs): WORLD_MAP.md's intended-feel
 * notes say "the mine entrance is visible on the horizon from the farm" — so
 * the mountain hint clusters over the farm's stretch (the band's west side),
 * echoing that future landmark without committing to the still-open mine
 * location decision.
 */
import { WORLD_W, CAM_NORTH_SKY_MARGIN, PARALLAX_FACTOR } from "../config";
import { mulberry32 } from "../engine/rng";

// Exactly the revealed margin, so the band's own bottom edge sits flush at
// world y=0 — a clean seam against the ground with no separate overlap
// bookkeeping (content near the bottom is drawn a few px shy of BAND_H so
// nothing needs the ground to clip it; the canvas's own edge silently trims
// anything that pokes past BAND_H regardless).
const BAND_H = CAM_NORTH_SKY_MARGIN;

let band: HTMLCanvasElement | null = null;

function drawMountainRange(
  g: CanvasRenderingContext2D, x0: number, w: number, baseY: number, color: string, rnd: () => number,
) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x0, BAND_H);
  g.lineTo(x0, baseY + 30);
  let x = x0;
  while (x < x0 + w) {
    const step = 55 + rnd() * 40;
    const peakX = x + step / 2, peakY = baseY - rnd() * baseY * 0.62;
    x += step;
    g.lineTo(peakX, peakY);
    g.lineTo(x, baseY + rnd() * 18);
  }
  g.lineTo(x0 + w, BAND_H);
  g.closePath();
  g.fill();
}

function drawHillLayer(g: CanvasRenderingContext2D, baseY: number, amp: number, color: string, rnd: () => number) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, BAND_H);
  g.lineTo(0, baseY);
  let x = 0;
  while (x < WORLD_W) {
    const nx = Math.min(WORLD_W, x + 70 + rnd() * 50);
    const cy = baseY - rnd() * amp;
    g.quadraticCurveTo(x + (nx - x) / 2, cy, nx, baseY + (rnd() - 0.5) * amp * 0.5);
    x = nx;
  }
  g.lineTo(WORLD_W, BAND_H);
  g.closePath();
  g.fill();
}

function drawTreeLine(g: CanvasRenderingContext2D, baseY: number, rnd: () => number) {
  g.fillStyle = "#3d5a2e";
  for (let x = -10; x < WORLD_W + 10; x += 15 + rnd() * 9) {
    const h = 13 + rnd() * 9;
    g.beginPath(); g.arc(x, baseY - h * 0.35, h * 0.58, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = "#2f4a24";
  for (let x = -10; x < WORLD_W + 10; x += 22 + rnd() * 14) {
    const h = 9 + rnd() * 6;
    g.beginPath(); g.arc(x, baseY - h * 0.3, h * 0.5, 0, Math.PI * 2); g.fill();
  }
}

function paintBand(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = WORLD_W; cv.height = BAND_H;
  const g = cv.getContext("2d")!;
  const rnd = mulberry32(9001);

  const sky = g.createLinearGradient(0, 0, 0, BAND_H);
  sky.addColorStop(0, "#bcd9e8");
  sky.addColorStop(0.55, "#cfe6da");
  sky.addColorStop(1, "#a3c98d");
  g.fillStyle = sky; g.fillRect(0, 0, WORLD_W, BAND_H);

  // distant mountains, hazy blue-grey, clustered over the farm's stretch
  // (west side) — "visible on the horizon from the farm" per WORLD_MAP.md
  drawMountainRange(g, -20, WORLD_W * 0.30, BAND_H * 0.5, "#93a7b2", rnd);
  drawMountainRange(g, WORLD_W * 0.1, WORLD_W * 0.22, BAND_H * 0.58, "#a7b9c1", rnd);

  // rolling hills silhouette, nearer + warmer, spanning the full width
  drawHillLayer(g, BAND_H * 0.72, 15, "#7fae5e", rnd);
  drawHillLayer(g, BAND_H * 0.85, 11, "#6a9950", rnd);

  // a distant tree line right at the seam where the real ground begins
  drawTreeLine(g, BAND_H - 8, rnd);

  return cv;
}

/** Blits the pre-baked band, offset so it scrolls at `PARALLAX_FACTOR` of the
 *  camera's own speed (< 1 = reads as farther away). Call in world space,
 *  right after the viewport clear and BEFORE the ground image, so the ground
 *  (opaque) clips the band's lower overlap to a clean horizon seam. */
export function drawParallaxBand(g: CanvasRenderingContext2D, camx: number) {
  if (!band) band = paintBand();
  const drawX = camx * (1 - PARALLAX_FACTOR);
  g.drawImage(band, drawX, -CAM_NORTH_SKY_MARGIN);
}
