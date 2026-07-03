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

export function drawFence(g: CanvasRenderingContext2D) {
  g.strokeStyle = "#8a6a42"; g.lineWidth = 4; g.lineCap = "round";
  const fx0 = FIELD.x0 * T - 14, fy0 = FIELD.y0 * T - 14;
  const fx1 = FIELD.x1 * T + 14, fy1 = FIELD.y1 * T + 14;
  for (const yy of [fy0, fy1]) {
    g.beginPath(); g.moveTo(fx0, yy); g.lineTo(fx1, yy); g.stroke();
    g.beginPath(); g.moveTo(fx0, yy + 7); g.lineTo(fx1, yy + 7); g.stroke();
  }
  for (const xx of [fx0, fx1]) {
    g.beginPath(); g.moveTo(xx, fy0); g.lineTo(xx, fy1); g.stroke();
    g.beginPath(); g.moveTo(xx + 7, fy0); g.lineTo(xx + 7, fy1); g.stroke();
  }
  g.fillStyle = "#6f5334";
  for (let xx = fx0; xx <= fx1; xx += T * 1.5)
    for (const yy of [fy0, fy1]) g.fillRect(xx - 3, yy - 6, 6, 16);
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

export function drawWaterShimmer(g: CanvasRenderingContext2D, t: number) {
  g.fillStyle = "rgba(255,255,255,.22)";
  for (let i = 0; i < 7; i++) {
    const px = POND.cx + Math.sin(t * 0.9 + i * 2.2) * POND.rx * 0.55;
    const py = POND.cy + Math.cos(t * 0.7 + i * 1.7) * POND.ry * 0.5;
    g.beginPath(); g.ellipse(px, py, 7, 1.7, 0, 0, 7); g.fill();
  }
}
