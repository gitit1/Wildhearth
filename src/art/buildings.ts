import { HOUSE, BARN, STALL } from "../world/zones";
import { shadow } from "./shapes";
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
}

export function drawHouse(g: CanvasRenderingContext2D, roofOk = true, windowOk = true) {
  const { x, y, w, h } = HOUSE;
  shadow(g, x + w / 2 + 8, y + h + 8, w * 0.55, 12);
  drawPlankWall(g, x, y + h * 0.35, w, h * 0.65, "#c9a06a", 101);
  g.fillStyle = "#7a5230"; g.fillRect(x + w * 0.44, y + h * 0.55, w * 0.13, h * 0.45);
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
  g.fillStyle = "#8c8c94"; g.fillRect(x + w * 0.72, y - h * 0.16, w * 0.09, h * 0.3);
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

export function drawBarn(g: CanvasRenderingContext2D, barnOk = true) {
  const { x, y, w, h } = BARN;
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

export function drawStall(g: CanvasRenderingContext2D, t: number) {
  const { x, y, w, h } = STALL;
  shadow(g, x + w / 2 + 4, y + h + 6, w * 0.55, 8);
  // counter
  g.fillStyle = "#9a7245"; g.fillRect(x, y + h * 0.45, w, h * 0.55);
  g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(x, y + h * 0.45, w, 4);
  // legs
  g.fillStyle = "#6f5334";
  g.fillRect(x + 3, y + h * 0.45, 5, h * 0.6);
  g.fillRect(x + w - 8, y + h * 0.45, 5, h * 0.6);
  // awning posts
  g.fillRect(x + 1, y - h * 0.35, 4, h * 0.8);
  g.fillRect(x + w - 5, y - h * 0.35, 4, h * 0.8);
  // striped awning with a soft flutter
  const fl = Math.sin(t * 2.2) * 1.5;
  const stripes = 5, sw = (w + 12) / stripes;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? "#e8ddca" : "#c05038";
    g.beginPath();
    g.moveTo(x - 6 + i * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.05 + fl);
    g.lineTo(x - 6 + i * sw, y - h * 0.05 + fl);
    g.closePath(); g.fill();
  }
  // goods: little fish crate
  g.fillStyle = "#b08a58"; g.fillRect(x + w * 0.2, y + h * 0.3, w * 0.28, h * 0.2);
  g.fillStyle = "#7fb0c8";
  g.beginPath(); g.ellipse(x + w * 0.34, y + h * 0.38, 6, 2.6, 0.3, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x + w * 0.28, y + h * 0.36, 6, 2.6, -0.2, 0, 7); g.fill();
}
