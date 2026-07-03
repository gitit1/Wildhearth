import { T, WORLD_W, WORLD_H } from "../config";
import { FIELD, YARD, POND } from "./zones";
import { mulberry32 } from "../engine/rng";
import { roundR } from "../art/shapes";

/** Paints the entire static ground once into an offscreen canvas. */
export function paintGround(): HTMLCanvasElement {
  const ground = document.createElement("canvas");
  ground.width = WORLD_W; ground.height = WORLD_H;
  const g = ground.getContext("2d")!;
  const rnd = mulberry32(7);

  g.fillStyle = "#5d8a3c"; g.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H, r = 2 + rnd() * 7;
    g.fillStyle = ["#557f36", "#649441", "#6ba047", "#528034"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(40,70,25,.35)"; g.lineWidth = 1;
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H, h = 3 + rnd() * 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() * 2 - 1), y - h); g.stroke();
  }
  for (let i = 0; i < 130; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
    if (x > YARD.x0 * T && x < FIELD.x1 * T && y > 4 * T && y < 16 * T) continue;
    g.fillStyle = ["#e8e0f0", "#f2d857", "#e89ab0"][(rnd() * 3) | 0]!;
    for (let p = 0; p < 4; p++) {
      g.beginPath();
      g.ellipse(x + Math.cos(p * 1.57) * 2, y + Math.sin(p * 1.57) * 2, 1.6, 1.6, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = "#caa53a"; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill();
  }
  // dirt yard
  roundR(g, YARD.x0 * T, YARD.y0 * T, (YARD.x1 - YARD.x0) * T, (YARD.y1 - YARD.y0) * T, 26);
  g.fillStyle = "#a58254"; g.fill();
  const rnd2 = mulberry32(21);
  g.save(); g.clip();
  for (let i = 0; i < 900; i++) {
    const x = YARD.x0 * T + rnd2() * (YARD.x1 - YARD.x0) * T;
    const y = YARD.y0 * T + rnd2() * (YARD.y1 - YARD.y0) * T;
    g.fillStyle = ["#9a7749", "#b08a58", "#8f6f44", "#ab8355"][(rnd2() * 4) | 0]!;
    g.beginPath(); g.ellipse(x, y, 2 + rnd2() * 5, 1.5 + rnd2() * 3, 0, 0, 7); g.fill();
  }
  g.restore();
  // path
  g.fillStyle = "#b3926a";
  roundR(g, 12.4 * T, 8.6 * T, 7.8 * T, 1.3 * T, 18); g.fill();
  // tilled field
  roundR(g, FIELD.x0 * T, FIELD.y0 * T, (FIELD.x1 - FIELD.x0) * T, (FIELD.y1 - FIELD.y0) * T, 14);
  g.fillStyle = "#6e4f33"; g.fill();
  g.save(); g.clip();
  for (let ry = FIELD.y0 * T + 10; ry < FIELD.y1 * T; ry += 16) {
    g.fillStyle = "rgba(60,40,24,.55)"; g.fillRect(FIELD.x0 * T, ry, (FIELD.x1 - FIELD.x0) * T, 5);
    g.fillStyle = "rgba(140,105,70,.5)"; g.fillRect(FIELD.x0 * T, ry + 5, (FIELD.x1 - FIELD.x0) * T, 3);
  }
  g.restore();
  // pond
  g.fillStyle = "#3d6f8e";
  g.beginPath(); g.ellipse(POND.cx, POND.cy, POND.rx, POND.ry, 0, 0, 7); g.fill();
  g.fillStyle = "#4a83a6";
  g.beginPath(); g.ellipse(POND.cx, POND.cy, POND.rx * 0.82, POND.ry * 0.8, 0, 0, 7); g.fill();
  g.strokeStyle = "#8a7a5a"; g.lineWidth = 3;
  g.beginPath(); g.ellipse(POND.cx, POND.cy, POND.rx, POND.ry, 0, 0, 7); g.stroke();
  return ground;
}
