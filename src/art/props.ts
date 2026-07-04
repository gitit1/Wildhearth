import { T } from "../config";
import { FIELD, POND } from "../world/zones";
import { mulberry32 } from "../engine/rng";
import { shadow } from "./shapes";

export function drawTree(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  shadow(g, x + 4, y + 6, 20, 8);
  g.fillStyle = "#6b4a2b"; g.fillRect(x - 4, y - 14, 8, 20);
  const sway = Math.sin(t * 0.8 + x) * 2;
  const blobs: Array<[number, number, number, string]> = [
    [-10, -26, 16, "#3d6626"], [10, -24, 14, "#47732c"],
    [0, -38, 17, "#528034"], [-2, -28, 12, "#5d8f3c"],
  ];
  for (const [ox, oy, r, c] of blobs) {
    g.fillStyle = c;
    g.beginPath(); g.arc(x + ox + sway * 0.4, y + oy, r, 0, 7); g.fill();
  }
  g.fillStyle = "rgba(255,255,220,.14)";
  g.beginPath(); g.arc(x - 6 + sway * 0.4, y - 40, 9, 0, 7); g.fill();
}

export function drawFence(
  g: CanvasRenderingContext2D, fenceOk = true,
  bounds: { x0: number; y0: number; x1: number; y1: number } = FIELD,
) {
  const rundown = !fenceOk;   // broken until the field fence is mended (Step 8)
  g.strokeStyle = "#8a6a42"; g.lineWidth = 4; g.lineCap = "round";
  const fx0 = bounds.x0 * T - 14, fy0 = bounds.y0 * T - 14;
  const fx1 = bounds.x1 * T + 14, fy1 = bounds.y1 * T + 14;
  // a broken-plank gap in the top and bottom rails when rundown
  const gapAt = fx0 + (fx1 - fx0) * 0.38, gapW = T * 1.6;
  for (const yy of [fy0, fy1]) {
    if (rundown) {
      g.beginPath(); g.moveTo(fx0, yy); g.lineTo(gapAt, yy); g.stroke();
      g.beginPath(); g.moveTo(gapAt + gapW, yy); g.lineTo(fx1, yy); g.stroke();
      g.beginPath(); g.moveTo(fx0, yy + 7); g.lineTo(gapAt - T * 0.4, yy + 7); g.stroke();
      g.beginPath(); g.moveTo(gapAt + gapW + T * 0.4, yy + 7); g.lineTo(fx1, yy + 7); g.stroke();
      // the fallen plank, tilted into the grass
      g.save();
      g.translate(gapAt + gapW / 2, yy + 12); g.rotate(0.35);
      g.beginPath(); g.moveTo(-T * 0.7, 0); g.lineTo(T * 0.7, 0); g.stroke();
      g.restore();
    } else {
      g.beginPath(); g.moveTo(fx0, yy); g.lineTo(fx1, yy); g.stroke();
      g.beginPath(); g.moveTo(fx0, yy + 7); g.lineTo(fx1, yy + 7); g.stroke();
    }
  }
  for (const xx of [fx0, fx1]) {
    g.beginPath(); g.moveTo(xx, fy0); g.lineTo(xx, fy1); g.stroke();
    g.beginPath(); g.moveTo(xx + 7, fy0); g.lineTo(xx + 7, fy1); g.stroke();
  }
  g.fillStyle = "#6f5334";
  let post = 0;
  for (let xx = fx0; xx <= fx1; xx += T * 1.5, post++)
    for (const yy of [fy0, fy1]) {
      if (rundown && post % 5 === 3) {
        g.save(); g.translate(xx, yy + 2); g.rotate(0.3);
        g.fillRect(-3, -8, 6, 16); g.restore();   // leaning post
      } else g.fillRect(xx - 3, yy - 6, 6, 16);
    }
  for (let yy = fy0; yy <= fy1; yy += T * 1.5)
    for (const xx of [fx0, fx1]) g.fillRect(xx - 3, yy - 6, 6, 16);
}

export function drawCorn(g: CanvasRenderingContext2D, t: number) {
  const rnd = mulberry32(99);
  for (let cy = FIELD.y0 + 0.7; cy < FIELD.y1; cy += 1.15) {
    for (let cx = FIELD.x0 + 0.7; cx < FIELD.x1; cx += 0.85) {
      const x = cx * T + (rnd() * 6 - 3), y = cy * T + (rnd() * 6 - 3);
      const sway = Math.sin(t * 1.6 + x * 0.13 + y * 0.07) * 2.2;
      g.strokeStyle = "#3f6a22"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + sway * 0.5, y - 10, x + sway, y - 20); g.stroke();
      g.strokeStyle = "#528a2c"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x - 5 + sway * 0.4, y - 13); g.stroke();
      g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 5 + sway * 0.6, y - 17); g.stroke();
      g.fillStyle = "#e8c85a";
      g.beginPath(); g.ellipse(x + sway * 0.8, y - 18, 2.4, 4.6, sway * 0.05, 0, 7); g.fill();
    }
  }
}

/** A tilled plot tile; watered soil reads visibly darker and damp. */
export function drawTilledTile(g: CanvasRenderingContext2D, cx: number, cy: number, watered = false) {
  const x = cx - T / 2, y = cy - T / 2;
  g.fillStyle = watered ? "#3f2e1e" : "#57402a";
  g.fillRect(x + 2, y + 2, T - 4, T - 4);
  g.fillStyle = watered ? "rgba(25,16,9,.65)" : "rgba(40,26,14,.6)";
  for (let i = 0; i < 3; i++) g.fillRect(x + 4, y + 6 + i * 9, T - 8, 3);
  g.strokeStyle = "rgba(150,110,70,.45)"; g.lineWidth = 1.5;
  g.strokeRect(x + 2, y + 2, T - 4, T - 4);
  if (watered) {                                   // damp sheen
    g.fillStyle = "rgba(140,170,200,.12)";
    g.fillRect(x + 3, y + 3, T - 6, T - 6);
  }
}

const CROP_DEFAULT = { stalk: "#3f6a22", leaf: "#528a2c", fruit: "#e8c85a" };

/**
 * A crop on a tilled tile, drawn by growth stage (0..1): sprout -> young
 * stalk -> tall stalk -> ripe color when ready. Tinted per crop type from
 * data/crops.ts so every species reads differently in the field.
 */
export function drawCropTile(
  g: CanvasRenderingContext2D, cx: number, cy: number, stage: number, t: number,
  pal: { stalk: string; leaf: string; fruit: string } = CROP_DEFAULT, watered = false,
) {
  drawTilledTile(g, cx, cy, watered);
  const sway = Math.sin(t * 1.6 + cx * 0.13) * 1.6;
  for (const ox of [-8, 0, 8]) {
    const x = cx + ox, y = cy + 10;
    if (stage < 0.25) {
      // sprout
      g.strokeStyle = pal.leaf; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 4); g.stroke();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 4); g.stroke();
    } else {
      const h = 8 + stage * 16;                    // stalk height grows with stage
      g.strokeStyle = pal.stalk; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + sway * 0.5, y - h * 0.5, x + sway, y - h); g.stroke();
      g.strokeStyle = pal.leaf; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - h * 0.4); g.lineTo(x - 4 + sway * 0.4, y - h * 0.6); g.stroke();
      if (stage > 0.6) {
        g.beginPath(); g.moveTo(x, y - h * 0.6); g.lineTo(x + 4 + sway * 0.6, y - h * 0.8); g.stroke();
      }
      if (stage >= 1) {
        g.fillStyle = pal.fruit;
        g.beginPath(); g.ellipse(x + sway * 0.8, y - h + 2, 2.6, 5, sway * 0.05, 0, 7); g.fill();
      }
    }
  }
}

/** A wilted crop: grey-brown, drooped over dry soil — clear it and replant. */
export function drawWiltedTile(g: CanvasRenderingContext2D, cx: number, cy: number) {
  drawTilledTile(g, cx, cy, false);
  for (const ox of [-8, 0, 8]) {
    const x = cx + ox, y = cy + 10;
    g.strokeStyle = "#7a6a4a"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + 3, y - 9, x + 8, y - 6); g.stroke();   // stalk bent over
    g.strokeStyle = "#8a795a"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + 4, y - 8); g.lineTo(x + 8, y - 3); g.stroke();
  }
}

/** Berry bush: leafy mound, dotted with berries while full; bare when picked. */
export function drawBush(g: CanvasRenderingContext2D, x: number, y: number, full: boolean, t: number) {
  shadow(g, x + 2, y + 8, 16, 6);
  const sway = Math.sin(t * 1.1 + x * 0.3) * 0.8;
  const blobs: Array<[number, number, number, string]> = full
    ? [[-8, -2, 10, "#3d6626"], [8, -2, 9, "#47732c"], [0, -8, 11, "#528034"]]
    : [[-8, -2, 9, "#4a5c33"], [8, -2, 8, "#55683a"], [0, -7, 10, "#5f7342"]];
  for (const [ox, oy, r, c] of blobs) {
    g.fillStyle = c;
    g.beginPath(); g.arc(x + ox + sway, y + oy, r, 0, 7); g.fill();
  }
  if (full) {
    g.fillStyle = "#c2385a";
    const berries: Array<[number, number]> = [[-9, -4], [-2, -11], [6, -6], [1, -3], [9, -11]];
    for (const [ox, oy] of berries) {
      g.beginPath(); g.arc(x + ox + sway, y + oy, 2.2, 0, 7); g.fill();
    }
    g.fillStyle = "rgba(255,255,255,.5)";
    for (const [ox, oy] of berries) {
      g.beginPath(); g.arc(x + ox + sway - 0.7, y + oy - 0.7, 0.7, 0, 7); g.fill();
    }
  }
}

/** Ornamental flower bed by the house: turned earth -> seedlings -> bloom. */
export function drawFlowerBed(
  g: CanvasRenderingContext2D, x: number, y: number,
  bed: { planted: boolean; growth: number; bloomed: boolean }, t: number,
) {
  // the bed itself: an oval of turned earth
  g.fillStyle = "#57402a";
  g.beginPath(); g.ellipse(x, y, 15, 10, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(150,110,70,.5)"; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(x, y, 15, 10, 0, 0, 7); g.stroke();
  if (!bed.planted) return;
  const rnd = mulberry32((x * 7 + y) | 0);
  if (!bed.bloomed) {
    // seedlings
    g.strokeStyle = "#6fae3e"; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const px = x - 10 + rnd() * 20, py = y - 4 + rnd() * 8;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px - 1.5, py - 3 - bed.growth * 3); g.stroke();
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + 1.5, py - 3 - bed.growth * 3); g.stroke();
    }
  } else {
    // wildflowers in bloom, gently swaying
    const colors = ["#d16a9a", "#e8c34f", "#8a7ac2", "#e07830", "#e0e6f0"];
    for (let i = 0; i < 7; i++) {
      const px = x - 11 + rnd() * 22, py = y - 5 + rnd() * 10;
      const sway = Math.sin(t * 1.3 + px * 0.4) * 0.8;
      g.strokeStyle = "#4a7a2a"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px, py + 3); g.lineTo(px + sway, py - 4); g.stroke();
      g.fillStyle = colors[i % colors.length]!;
      for (let pt = 0; pt < 5; pt++) {
        const a = (pt / 5) * Math.PI * 2;
        g.beginPath(); g.arc(px + sway + Math.cos(a) * 2.2, py - 5 + Math.sin(a) * 2.2, 1.4, 0, 7); g.fill();
      }
      g.fillStyle = "#e8c34f";
      g.beginPath(); g.arc(px + sway, py - 5, 1.2, 0, 7); g.fill();
    }
  }
}

/** Busking spot: a cobbled corner with an upturned hat waiting for coins. */
export function drawBuskSpot(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  // cobblestones
  const rnd = mulberry32(x | 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 12 + rnd() * 8;
    g.fillStyle = ["#9a938a", "#8a8378", "#a8a196"][(rnd() * 3) | 0]!;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 5 + rnd() * 2, 3.5 + rnd() * 1.5, a, 0, 7);
    g.fill();
  }
  // upturned hat
  g.fillStyle = "#7a5230";
  g.beginPath(); g.ellipse(x, y + 2, 9, 5, 0, 0, 7); g.fill();
  g.fillStyle = "#5d3e22";
  g.beginPath(); g.ellipse(x, y, 6.5, 3.5, 0, 0, 7); g.fill();
  // a coin glinting inside
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(x + Math.sin(t * 2) * 1.5, y, 1.8, 0, 7); g.fill();
}

/** Floating music notes above a performer. */
export function drawMusicNotes(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  g.fillStyle = "#2b2b33";
  g.strokeStyle = "#2b2b33";
  g.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.9 + i * 0.33) % 1;
    const nx = x + Math.sin((t + i * 2.1) * 3) * 7 + (i - 1) * 10;
    const ny = y - 18 - phase * 22;
    g.globalAlpha = 1 - phase;
    g.beginPath(); g.ellipse(nx, ny, 2.6, 2, -0.4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(nx + 2.4, ny - 0.8); g.lineTo(nx + 2.4, ny - 9); g.stroke();
    g.beginPath(); g.ellipse(nx + 4.4, ny - 9, 2.4, 1.6, -0.3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

export function drawWaterShimmer(g: CanvasRenderingContext2D, t: number) {
  g.fillStyle = "rgba(255,255,255,.22)";
  for (let i = 0; i < 7; i++) {
    const px = POND.cx + Math.sin(t * 0.9 + i * 2.2) * POND.rx * 0.55;
    const py = POND.cy + Math.cos(t * 0.7 + i * 1.7) * POND.ry * 0.5;
    g.beginPath(); g.ellipse(px, py, 7, 1.7, 0, 0, 7); g.fill();
  }
}
