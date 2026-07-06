import { HOUSE, BARN, STALL, type Rect } from "../world/zones";
import { shadow, oRect, outline, OUTLINE, OUTLINE_W } from "./shapes";
import { mulberry32 } from "../engine/rng";

/** Vertical plank striping for wall faces: alternating tones, thin seams,
 *  the odd knot — deterministic per wall so it never shimmers. */
function drawPlankWall(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  base: string, seed: number,
) {
  const rnd = mulberry32(seed);
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  const plank = Math.max(9, w / Math.round(w / 12));
  for (let px = 0; px < w - 1; px += plank) {
    const t = rnd();
    if (t < 0.35) { g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(x + px, y, plank, h); }
    else if (t > 0.7) { g.fillStyle = "rgba(255,235,200,.06)"; g.fillRect(x + px, y, plank, h); }
    g.fillStyle = "rgba(60,38,18,.28)";
    g.fillRect(x + px, y, 1.4, h);                 // seam
    if (rnd() < 0.3) {                             // knot
      g.fillStyle = "rgba(70,45,20,.5)";
      g.beginPath(); g.ellipse(x + px + plank * 0.5, y + h * (0.2 + rnd() * 0.6), 1.6, 2.2, 0, 0, 7); g.fill();
    }
  }
  g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W;
  g.strokeRect(x, y, w, h);                        // the wall's contour
}

/** Shingled roof for a triangular gable: overlapping rows, per-shingle tone
 *  jitter; weathered roofs get patchy discolored/missing shingles. */
function drawShingleRoof(
  g: CanvasRenderingContext2D,
  apexX: number, apexY: number, leftX: number, rightX: number, baseY: number,
  base: string, weathered: boolean, seed: number,
) {
  const rnd = mulberry32(seed);
  g.save();
  g.beginPath();
  g.moveTo(leftX, baseY); g.lineTo(apexX, apexY); g.lineTo(rightX, baseY); g.closePath();
  g.fillStyle = base; g.fill();
  g.clip();
  const rows = 6, rowH = (baseY - apexY) / rows;
  for (let r = 0; r < rows; r++) {
    const ry = apexY + r * rowH;
    const shingleW = 11;
    const offset = (r % 2) * (shingleW / 2);
    for (let sx = leftX - shingleW; sx < rightX + shingleW; sx += shingleW) {
      const v = rnd();
      if (weathered && v < 0.07) {                 // a missing shingle: dark gap
        g.fillStyle = "rgba(30,16,10,.75)";
        g.fillRect(sx + offset, ry, shingleW - 1, rowH);
        continue;
      }
      const jitter = weathered ? (v - 0.5) * 0.22 : (v - 0.5) * 0.1;
      g.fillStyle = `rgba(${jitter > 0 ? "255,230,210" : "40,10,5"},${Math.abs(jitter)})`;
      g.fillRect(sx + offset, ry, shingleW - 1, rowH - 1);
    }
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(leftX, ry + rowH); g.lineTo(rightX, ry + rowH); g.stroke();
  }
  g.restore();
  // the gable's contour (outside the clip so it stays crisp)
  g.beginPath();
  g.moveTo(leftX, baseY); g.lineTo(apexX, apexY); g.lineTo(rightX, baseY); g.closePath();
  g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W; g.stroke();
}

export function drawHouse(g: CanvasRenderingContext2D, roofOk = true, windowOk = true, r: Rect = HOUSE) {
  const { x, y, w, h } = r;
  shadow(g, x + w / 2 + 8, y + h + 8, w * 0.55, 12);
  drawPlankWall(g, x, y + h * 0.35, w, h * 0.65, "#c9a06a", 101);
  oRect(g, x + w * 0.44, y + h * 0.55, w * 0.13, h * 0.45, "#7a5230");
  g.fillStyle = "#5d3e22"; g.fillRect(x + w * 0.44, y + h * 0.55, w * 0.13, 4);
  g.fillStyle = "#e8c46a"; g.beginPath(); g.arc(x + w * 0.54, y + h * 0.8, 2.4, 0, 7); g.fill();
  for (const wx of [x + w * 0.14, x + w * 0.72]) {
    g.fillStyle = "#8fd0e8"; g.fillRect(wx, y + h * 0.52, w * 0.15, h * 0.22);
    g.strokeStyle = "#6b4a2b"; g.lineWidth = 3; g.strokeRect(wx, y + h * 0.52, w * 0.15, h * 0.22);
    g.beginPath(); g.moveTo(wx + w * 0.075, y + h * 0.52); g.lineTo(wx + w * 0.075, y + h * 0.74); g.stroke();
  }
  // the roof: neat shingles when repaired, patchy weathered ones when not
  drawShingleRoof(g, x + w / 2, y - h * 0.28, x - 10, x + w + 10, y + h * 0.38,
    "#a8433a", !roofOk, 202);
  oRect(g, x + w * 0.72, y - h * 0.16, w * 0.09, h * 0.3, "#8c8c94");
  g.fillStyle = "#6f6f78"; g.fillRect(x + w * 0.72, y - h * 0.16, w * 0.09, 5);

  if (!roofOk) {
    // hole in the roof, hastily patched with a mismatched plank
    g.fillStyle = "#3a2a1c";
    g.beginPath();
    g.moveTo(x + w * 0.3, y + h * 0.12);
    g.lineTo(x + w * 0.42, y + h * 0.05);
    g.lineTo(x + w * 0.46, y + h * 0.18);
    g.lineTo(x + w * 0.33, y + h * 0.22);
    g.closePath(); g.fill();
    g.save();
    g.translate(x + w * 0.38, y + h * 0.14); g.rotate(-0.35);
    g.fillStyle = "#a58254"; g.fillRect(-w * 0.09, -3, w * 0.18, 6);
    g.restore();
  }
  if (!windowOk) {
    // right window boarded shut (drawn over the normal glass pane above)
    const wx = x + w * 0.72, wy = y + h * 0.52, ww = w * 0.15, wh = h * 0.22;
    g.fillStyle = "#4a3a26"; g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = "#8a6a42"; g.lineWidth = 5; g.lineCap = "round";
    g.beginPath(); g.moveTo(wx - 3, wy + 3); g.lineTo(wx + ww + 3, wy + wh - 3); g.stroke();
    g.beginPath(); g.moveTo(wx + ww + 3, wy + 3); g.lineTo(wx - 3, wy + wh - 3); g.stroke();
  }
}

export function drawBarn(g: CanvasRenderingContext2D, barnOk = true, r: Rect = BARN) {
  const { x, y, w, h } = r;
  shadow(g, x + w / 2 + 6, y + h + 7, w * 0.55, 10);
  drawPlankWall(g, x, y + h * 0.3, w, h * 0.7, "#b24a3e", 303);
  // the barn roof shares the shingle treatment (weathered until mended)
  drawShingleRoof(g, x + w / 2, y - h * 0.18, x - 8, x + w + 8, y + h * 0.34,
    "#8a3830", !barnOk, 404);
  g.fillStyle = "#7a5230"; g.fillRect(x + w * 0.32, y + h * 0.45, w * 0.36, h * 0.55);
  g.strokeStyle = "#5d3e22"; g.lineWidth = 3;
  g.strokeRect(x + w * 0.32, y + h * 0.45, w * 0.36, h * 0.55);
  g.beginPath(); g.moveTo(x + w * 0.32, y + h * 0.45); g.lineTo(x + w * 0.68, y + h);
  g.moveTo(x + w * 0.68, y + h * 0.45); g.lineTo(x + w * 0.32, y + h); g.stroke();

  if (!barnOk) {
    // missing wall plank + a board hanging loose over the door
    g.fillStyle = "#3a1f1a";
    g.fillRect(x + w * 0.8, y + h * 0.42, w * 0.07, h * 0.5);
    g.save();
    g.translate(x + w * 0.5, y + h * 0.5); g.rotate(0.5);
    g.fillStyle = "#8a6a42"; g.fillRect(-w * 0.22, -3, w * 0.44, 6);
    g.restore();
  }
}

export type StallSign = "fish" | "produce" | "goods" | "empty";

/** The market/farm stall. Awning colour + goods vary by stall so the four
 *  market stalls read distinct (fish buyer / produce / general / empty). */
export function drawStall(
  g: CanvasRenderingContext2D, t: number, r: Rect = STALL,
  awning = "#c05038", accent = "#7fb0c8", sign: StallSign = "fish",
) {
  const { x, y, w, h } = r;
  shadow(g, x + w / 2 + 4, y + h + 6, w * 0.55, 8);
  // counter
  oRect(g, x, y + h * 0.45, w, h * 0.55, "#9a7245");
  g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(x, y + h * 0.45, w, 4);
  // legs
  g.fillStyle = "#6f5334";
  g.fillRect(x + 3, y + h * 0.45, 5, h * 0.6);
  g.fillRect(x + w - 8, y + h * 0.45, 5, h * 0.6);
  // awning posts
  g.fillRect(x + 1, y - h * 0.35, 4, h * 0.8);
  g.fillRect(x + w - 5, y - h * 0.35, 4, h * 0.8);
  // striped awning with a soft flutter
  const fl = Math.sin(t * 2.2 + x) * 1.5;
  const stripes = 5, sw = (w + 12) / stripes;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? "#e8ddca" : awning;
    g.beginPath();
    g.moveTo(x - 6 + i * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.05 + fl);
    g.lineTo(x - 6 + i * sw, y - h * 0.05 + fl);
    g.closePath(); g.fill();
  }
  // the awning's contour as one shape
  g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W;
  g.strokeRect(x - 6, y - h * 0.4, w + 12, h * 0.35 + fl);

  // goods on the counter — a little different per stall type
  if (sign === "fish") {
    g.fillStyle = "#b08a58"; g.fillRect(x + w * 0.2, y + h * 0.3, w * 0.28, h * 0.2);
    g.fillStyle = accent;
    g.beginPath(); g.ellipse(x + w * 0.34, y + h * 0.38, 6, 2.6, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x + w * 0.28, y + h * 0.36, 6, 2.6, -0.2, 0, 7); g.fill();
  } else if (sign === "produce") {
    g.fillStyle = "#8a6a42"; g.fillRect(x + w * 0.18, y + h * 0.34, w * 0.3, h * 0.18);
    for (const [dx, c] of [[0.24, accent], [0.34, "#c94f3a"], [0.44, "#5f9a38"]] as const) {
      g.fillStyle = c; g.beginPath(); g.arc(x + w * dx, y + h * 0.36, 3, 0, 7); g.fill();
    }
  } else if (sign === "goods") {
    g.fillStyle = accent; g.fillRect(x + w * 0.2, y + h * 0.28, w * 0.22, h * 0.22);
    g.strokeStyle = "rgba(60,40,20,.5)"; g.lineWidth = 1.2;
    g.strokeRect(x + w * 0.2, y + h * 0.28, w * 0.22, h * 0.22);
    g.fillStyle = "#9a7245"; g.beginPath();
    g.ellipse(x + w * 0.6, y + h * 0.4, 5, 4, 0, 0, 7); g.fill();
  } else {
    // empty / available: a small "vacant" placard, no goods
    g.fillStyle = "#d9cfb4"; g.fillRect(x + w * 0.36, y + h * 0.26, w * 0.28, h * 0.16);
    g.strokeStyle = "rgba(60,40,20,.45)"; g.lineWidth = 1;
    g.strokeRect(x + w * 0.36, y + h * 0.26, w * 0.28, h * 0.16);
    g.fillStyle = "rgba(90,70,40,.6)";
    g.fillRect(x + w * 0.4, y + h * 0.32, w * 0.2, 1.6);
  }
}

/** A small cottage — a compact house variant for the market's NPC homes.
 *  Warm plaster wall, shingle gable, a plank door (a would-be entry point). */
export function drawCottage(g: CanvasRenderingContext2D, r: Rect, seed: number) {
  const { x, y, w, h } = r;
  const rnd = mulberry32(seed);
  const wall = ["#d8b483", "#cca878", "#c9b98f", "#d3a06e"][(rnd() * 4) | 0]!;
  shadow(g, x + w / 2 + 6, y + h + 7, w * 0.55, 10);
  drawPlankWall(g, x, y + h * 0.36, w, h * 0.64, wall, (seed * 7) | 0);
  // door
  oRect(g, x + w * 0.4, y + h * 0.58, w * 0.2, h * 0.42, "#7a5230");
  g.fillStyle = "#e8c46a"; g.beginPath(); g.arc(x + w * 0.55, y + h * 0.8, 2, 0, 7); g.fill();
  // one small window
  g.fillStyle = "#8fd0e8"; g.fillRect(x + w * 0.15, y + h * 0.56, w * 0.16, h * 0.2);
  g.strokeStyle = "#6b4a2b"; g.lineWidth = 2.5; g.strokeRect(x + w * 0.15, y + h * 0.56, w * 0.16, h * 0.2);
  // roof
  const roof = ["#8a5a4a", "#7a6a52", "#9a6a54"][(rnd() * 3) | 0]!;
  drawShingleRoof(g, x + w / 2, y - h * 0.18, x - 7, x + w + 7, y + h * 0.4, roof, false, (seed * 13) | 0);
  // a little chimney
  oRect(g, x + w * 0.68, y - h * 0.1, w * 0.1, h * 0.28, "#8c8c94");
}

/** A rickety wooden outhouse (Needs engine): weathered planks, a mono-pitch
 *  shingle roof, and a door with the classic crescent-moon cutout. Tasteful
 *  and small — the farm's bathroom spot before any plumbing exists. */
export function drawOuthouse(g: CanvasRenderingContext2D, r: Rect) {
  const { x, y, w, h } = r;
  shadow(g, x + w / 2 + 4, y + h + 5, w * 0.5, 7);
  // slightly leaning body (it IS rickety)
  g.save();
  g.translate(x + w / 2, y + h);
  g.rotate(0.015);
  g.translate(-(x + w / 2), -(y + h));
  drawPlankWall(g, x, y + h * 0.16, w, h * 0.84, "#8a6a42", 515);
  // door: a darker recessed panel with the crescent moon
  oRect(g, x + w * 0.22, y + h * 0.3, w * 0.56, h * 0.62, "#6b4e30");
  g.fillStyle = "#e9dcb0";
  g.beginPath(); g.arc(x + w * 0.5, y + h * 0.44, w * 0.13, 0.4, Math.PI * 1.6); g.fill();
  g.fillStyle = "#6b4e30";
  g.beginPath(); g.arc(x + w * 0.56, y + h * 0.44, w * 0.11, 0.4, Math.PI * 1.6); g.fill();
  // door latch
  g.fillStyle = "#3d2c18";
  g.beginPath(); g.arc(x + w * 0.7, y + h * 0.64, 1.6, 0, 7); g.fill();
  g.restore();
  // mono-pitch roof, a plank tilted over the top (drawn upright, over the lean)
  g.save();
  g.fillStyle = "#5d4630";
  g.beginPath();
  g.moveTo(x - 3, y + h * 0.2);
  g.lineTo(x + w + 3, y + h * 0.08);
  g.lineTo(x + w + 3, y + h * 0.2);
  g.lineTo(x - 3, y + h * 0.32);
  g.closePath(); g.fill(); outline(g);
  g.restore();
}

/** The market square's stone well: a round wall, a little peaked roof on posts,
 *  a rope and bucket. Purely decorative. */
export function drawWell(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  shadow(g, cx + 4, cy + r + 4, r * 1.1, r * 0.4);
  // stone rim
  g.fillStyle = "#9a938a";
  g.beginPath(); g.ellipse(cx, cy, r, r * 0.7, 0, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#7a7268";
  g.beginPath(); g.ellipse(cx, cy, r * 0.72, r * 0.5, 0, 0, 7); g.fill();
  g.fillStyle = "#2a3a42";
  g.beginPath(); g.ellipse(cx, cy, r * 0.5, r * 0.34, 0, 0, 7); g.fill();
  // stone courses on the rim front
  g.strokeStyle = "rgba(40,36,30,.4)"; g.lineWidth = 1;
  for (let a = -0.9; a < 0.9; a += 0.45) {
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.6);
    g.lineTo(cx + Math.cos(a) * r * 0.9, cy + r * 0.5); g.stroke();
  }
  // two posts + a peaked roof
  g.fillStyle = "#6f5334";
  g.fillRect(cx - r * 0.9, cy - r * 1.7, 4, r * 1.7);
  g.fillRect(cx + r * 0.9 - 4, cy - r * 1.7, 4, r * 1.7);
  g.fillStyle = "#8a5a4a";
  g.beginPath();
  g.moveTo(cx - r * 1.15, cy - r * 1.5); g.lineTo(cx, cy - r * 2.2);
  g.lineTo(cx + r * 1.15, cy - r * 1.5); g.closePath(); g.fill(); outline(g);
  // rope + bucket
  g.strokeStyle = "#8a7a5a"; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(cx, cy - r * 1.5); g.lineTo(cx, cy - r * 0.2); g.stroke();
  oRect(g, cx - 3, cy - r * 0.2, 6, 6, "#7a5230");
}
