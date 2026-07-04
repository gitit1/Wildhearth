import { T, WORLD_W, WORLD_H } from "../config";
import { FIELD, YARD, POND, HOUSE, BARN, STALL, BUSHES, FLOWER_BEDS, BUSK_SPOT, fieldBounds, PLOT_EXPANSIONS } from "./zones";
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

  scatterAmbientProps(g);
  return ground;
}

/**
 * Ambient decorative props (environment detail pass): fallen leaves, small
 * stones, the odd mushroom — purely visual, baked into the static ground so
 * they cost nothing per frame and can't block movement or interactables.
 * Placement is deterministic (fixed seed) with rejection zones around the
 * field (at its maximum expanded size), pond, buildings, and clickables.
 */
function scatterAmbientProps(g: CanvasRenderingContext2D) {
  const rnd = mulberry32(4242);
  const fb = fieldBounds(PLOT_EXPANSIONS.length);   // widest the field can get
  const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }, pad: number) =>
    x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;

  const blocked = (x: number, y: number): boolean => {
    if (x > fb.x0 * T - 20 && x < fb.x1 * T + 20 && y > fb.y0 * T - 20 && y < fb.y1 * T + 20) return true;
    const pdx = (x - POND.cx) / (POND.rx + 20), pdy = (y - POND.cy) / (POND.ry + 20);
    if (pdx * pdx + pdy * pdy < 1) return true;
    for (const b of [HOUSE, BARN, STALL]) if (inRect(x, y, b, 16)) return true;
    for (const [bx, by] of [...BUSHES, ...FLOWER_BEDS, BUSK_SPOT]) if (Math.hypot(x - bx, y - by) < 34) return true;
    if (inRect(x, y, { x: 12.4 * T, y: 8.6 * T, w: 7.8 * T, h: 1.3 * T }, 6)) return true;   // the path
    return false;
  };
  const spot = (): [number, number] | null => {
    for (let tries = 0; tries < 8; tries++) {
      const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
      if (!blocked(x, y)) return [x, y];
    }
    return null;
  };

  // small stones: a grey pair with a light top facet
  for (let i = 0; i < 42; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p; const s = 2.2 + rnd() * 2.6;
    g.fillStyle = ["#8f8a80", "#9a958a", "#7f7a70"][(rnd() * 3) | 0]!;
    g.beginPath(); g.ellipse(x, y, s, s * 0.7, rnd() * 0.6, 0, 7); g.fill();
    if (rnd() < 0.5) { g.beginPath(); g.ellipse(x + s, y + 1, s * 0.55, s * 0.4, 0, 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,255,255,.22)";
    g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.3, s * 0.4, s * 0.22, 0, 0, 7); g.fill();
  }
  // fallen leaves: tiny tinted ovals with a midrib
  for (let i = 0; i < 56; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p; const rot = rnd() * Math.PI;
    g.fillStyle = ["#a8823c", "#b5713a", "#8f7a34", "#a06a30"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(x, y, 3.2, 1.7, rot, 0, 7); g.fill();
    g.strokeStyle = "rgba(70,50,20,.5)"; g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x - Math.cos(rot) * 3, y - Math.sin(rot) * 3);
    g.lineTo(x + Math.cos(rot) * 3, y + Math.sin(rot) * 3);
    g.stroke();
  }
  // the odd mushroom, tucked toward the forest edge (west) when possible
  for (let i = 0; i < 7; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    g.fillStyle = "#e8e0cc";
    g.fillRect(x - 1, y - 2.5, 2, 3.5);
    g.fillStyle = rnd() < 0.5 ? "#b5543a" : "#a97b4a";
    g.beginPath(); g.ellipse(x, y - 3, 3.4, 2, 0, Math.PI, 0); g.fill();
    g.fillStyle = "rgba(255,255,255,.4)";
    g.beginPath(); g.arc(x - 1.2, y - 3.6, 0.7, 0, 7); g.fill();
  }
}
