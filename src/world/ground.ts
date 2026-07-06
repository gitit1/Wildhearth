import { T, WORLD_W, WORLD_H } from "../config";
import {
  FIELD, YARD, POND, HOUSE, BARN, STALL, BUSHES, FLOWER_BEDS, BUSK_SPOT, OLD_BUSK_SIGN,
  fieldBounds, PLOT_EXPANSIONS,
  ROAD_SEGMENTS, RIVER, LAKE, DOCK, WELL, STRUCTURES, HEDGES, MARKET_STALLS, COTTAGES,
  FOREST_BUSHES, WORLD_TREES, regionAt, onRoad, inWater, type Rect,
} from "./zones";
import { mulberry32 } from "../engine/rng";
import { roundR } from "../art/shapes";

// Density scales with area so the world stays evenly textured at ~4x the old
// size (the original counts were tuned for a 1088x768 map).
const AREA_K = (WORLD_W * WORLD_H) / (1088 * 768);

/** Paints the entire static ground once into an offscreen canvas.
 *  Measured 3456x960 (both sides < 4096) — one canvas is fine, no chunking. */
export function paintGround(): HTMLCanvasElement {
  const ground = document.createElement("canvas");
  ground.width = WORLD_W; ground.height = WORLD_H;
  const g = ground.getContext("2d")!;
  const rnd = mulberry32(7);

  g.fillStyle = "#5d8a3c"; g.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 2600 * AREA_K; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H, r = 2 + rnd() * 7;
    g.fillStyle = ["#557f36", "#649441", "#6ba047", "#528034"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(40,70,25,.35)"; g.lineWidth = 1;
  for (let i = 0; i < 1600 * AREA_K; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H, h = 3 + rnd() * 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() * 2 - 1), y - h); g.stroke();
  }
  // grass-blade tufts: 3-5 blades fanning from a base, two greens (visual
  // pass, batch 3) — painted before the yard/field/pond so those cover them
  for (let i = 0; i < 240 * AREA_K; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
    const blades = 3 + (rnd() * 3 | 0);
    g.strokeStyle = rnd() < 0.5 ? "rgba(52,92,32,.75)" : "rgba(84,130,52,.75)";
    g.lineWidth = 1.2;
    for (let b = 0; b < blades; b++) {
      const lean = (b / (blades - 1) - 0.5) * 5;
      const h = 4 + rnd() * 4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
      g.stroke();
    }
  }
  // tiny flower dots sprinkled through the grass
  for (let i = 0; i < 320 * AREA_K; i++) {
    const x = rnd() * WORLD_W, y = rnd() * WORLD_H;
    g.fillStyle = ["#f2e8b8", "#f2d857", "#e89ab0", "#c9d8f0", "#e8b4d0"][(rnd() * 5) | 0]!;
    g.beginPath(); g.arc(x, y, 1 + rnd() * 0.8, 0, 7); g.fill();
  }
  for (let i = 0; i < 130 * AREA_K; i++) {
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

  // ---- new-world regions (disjoint from the farm, west of x=35) ----
  paintForestFloor(g);
  paintRoad(g);
  paintMarketGround(g);
  paintWater(g);

  // ---- the farm (unchanged) ----
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

/** A darker, mossier floor with leaf litter under the forest passage. */
function paintForestFloor(g: CanvasRenderingContext2D) {
  const x = 46 * T, y = 0, w = 18 * T, h = 17.5 * T;
  const rnd = mulberry32(555);
  g.save();
  roundR(g, x, y, w, h, 40); g.clip();
  g.fillStyle = "#476b2e"; g.fillRect(x, y, w, h);
  for (let i = 0; i < 900; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    g.fillStyle = ["#3f6128", "#517a34", "#3a5824", "#48682c"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(px, py, 3 + rnd() * 8, 2 + rnd() * 4, rnd(), 0, 7); g.fill();
  }
  // dappled leaf litter on the forest floor
  for (let i = 0; i < 360; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    g.fillStyle = ["#8f7a34", "#a06a30", "#7a6a2a", "#96803a"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(px, py, 2.6, 1.4, rnd() * Math.PI, 0, 7); g.fill();
  }
  g.restore();
}

/** Packed-dirt road strips along every road segment, with wheel ruts. */
function paintRoad(g: CanvasRenderingContext2D) {
  const rnd = mulberry32(808);
  for (const s of ROAD_SEGMENTS) {
    g.save();
    roundR(g, s.x, s.y, s.w, s.h, 18); g.clip();
    g.fillStyle = "#9c7c50"; g.fillRect(s.x, s.y, s.w, s.h);
    // speckled grit
    for (let i = 0; i < (s.w * s.h) / 260; i++) {
      const px = s.x + rnd() * s.w, py = s.y + rnd() * s.h;
      g.fillStyle = ["#8a6c42", "#ab8a5a", "#7e6238", "#a17c4c"][(rnd() * 4) | 0]!;
      g.beginPath(); g.ellipse(px, py, 1.5 + rnd() * 3, 1 + rnd() * 2, rnd(), 0, 7); g.fill();
    }
    // wheel ruts along the long axis
    g.strokeStyle = "rgba(70,48,26,.4)"; g.lineWidth = 3;
    if (s.w >= s.h) {
      for (const fy of [0.36, 0.64]) {
        g.beginPath(); g.moveTo(s.x, s.y + s.h * fy); g.lineTo(s.x + s.w, s.y + s.h * fy); g.stroke();
      }
    } else {
      for (const fx of [0.36, 0.64]) {
        g.beginPath(); g.moveTo(s.x + s.w * fx, s.y); g.lineTo(s.x + s.w * fx, s.y + s.h); g.stroke();
      }
    }
    g.restore();
  }
}

/** The market square: a broad packed-earth apron with a cobble ring at the well. */
function paintMarketGround(g: CanvasRenderingContext2D) {
  const x = 59.5 * T, y = 14.5 * T, w = 21 * T, h = 13.5 * T;
  const rnd = mulberry32(1212);
  g.save();
  roundR(g, x, y, w, h, 46); g.clip();
  g.fillStyle = "#b19670"; g.fillRect(x, y, w, h);
  for (let i = 0; i < 1400; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    g.fillStyle = ["#a3865e", "#bda37c", "#997c54", "#b39a72"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(px, py, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd(), 0, 7); g.fill();
  }
  // a ring of paler cobbles around the well
  for (let a = 0; a < Math.PI * 2; a += 0.5) {
    for (const rr of [1.7, 2.4]) {
      const px = WELL.cx + Math.cos(a) * rr * T, py = WELL.cy + Math.sin(a) * rr * T * 0.8;
      g.fillStyle = ["#8f8a80", "#a29a8c", "#7f786c"][(rnd() * 3) | 0]!;
      g.beginPath(); g.ellipse(px, py, 4, 3, a, 0, 7); g.fill();
    }
  }
  g.restore();
}

/** River + lake: a sandy/rocky bank around impassable water (pond technique). */
function paintWater(g: CanvasRenderingContext2D) {
  const rnd = mulberry32(3131);
  for (const wtr of [RIVER, LAKE]) {
    // sandy bank ring (walkable grass margin just outside the water)
    g.fillStyle = "#c7b184";
    roundR(g, wtr.x - 11, wtr.y - 11, wtr.w + 22, wtr.h + 22, 34); g.fill();
    // water body, filling the collision rect
    g.fillStyle = "#3d6f8e";
    roundR(g, wtr.x, wtr.y, wtr.w, wtr.h, 26); g.fill();
    g.fillStyle = "#4a83a6";
    roundR(g, wtr.x + 8, wtr.y + 8, wtr.w - 16, wtr.h - 16, 22); g.fill();
    g.fillStyle = "#5a95b6";
    roundR(g, wtr.x + 20, wtr.y + 20, Math.max(4, wtr.w - 40), Math.max(4, wtr.h - 40), 18); g.fill();
    // pebbles scattered on the bank
    for (let i = 0; i < wtr.w / 6; i++) {
      const px = wtr.x - 8 + rnd() * (wtr.w + 16);
      const py = rnd() < 0.5 ? wtr.y - 6 - rnd() * 6 : wtr.y + wtr.h + rnd() * 6;
      g.fillStyle = ["#9a938a", "#8a8378", "#a8a196"][(rnd() * 3) | 0]!;
      g.beginPath(); g.ellipse(px, py, 2 + rnd() * 2, 1.4 + rnd(), rnd(), 0, 7); g.fill();
    }
  }
  // rocky rim outline where the water sits
  g.strokeStyle = "#8a7a5a"; g.lineWidth = 3;
  for (const wtr of [RIVER, LAKE]) { roundR(g, wtr.x, wtr.y, wtr.w, wtr.h, 26); g.stroke(); }
}

/**
 * Ambient decorative props (environment detail pass): fallen leaves, small
 * stones, mushrooms, pebbles — purely visual, baked into the static ground so
 * they cost nothing per frame and can't block movement or interactables.
 * Placement is deterministic (fixed seed) with rejection zones around every
 * region's field/water/road/buildings/clickables, and a per-region palette.
 */
function scatterAmbientProps(g: CanvasRenderingContext2D) {
  const rnd = mulberry32(4242);
  const fb = fieldBounds(PLOT_EXPANSIONS.length);   // widest the field can get
  const inRect = (x: number, y: number, r: Rect, pad: number) =>
    x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;

  const blocked = (x: number, y: number): boolean => {
    // farm field (at max expansion), pond, farm path
    if (x > fb.x0 * T - 20 && x < fb.x1 * T + 20 && y > fb.y0 * T - 20 && y < fb.y1 * T + 20) return true;
    const pdx = (x - POND.cx) / (POND.rx + 20), pdy = (y - POND.cy) / (POND.ry + 20);
    if (pdx * pdx + pdy * pdy < 1) return true;
    if (inRect(x, y, { x: 12.4 * T, y: 8.6 * T, w: 7.8 * T, h: 1.3 * T }, 6)) return true;   // the path
    // water (+ its bank), the dock, the well
    if (inWater(x, y)) return true;
    if (inRect(x, y, RIVER, 14) || inRect(x, y, LAKE, 14)) return true;
    if (inRect(x, y, DOCK, 8)) return true;
    if ((x - WELL.cx) ** 2 + (y - WELL.cy) ** 2 < (WELL.r + 40) ** 2) return true;
    // the road
    if (onRoad(x, y)) return true;
    for (const s of ROAD_SEGMENTS) if (inRect(x, y, s, 6)) return true;
    // every building / hedge / stall / cottage
    for (const b of [HOUSE, BARN, STALL, ...STRUCTURES, ...HEDGES, ...MARKET_STALLS, ...COTTAGES]) if (inRect(x, y, b, 16)) return true;
    // trees + interactable point-props
    for (const [tx, ty] of WORLD_TREES) if (Math.hypot(x - tx, y - ty) < 30) return true;
    for (const [bx, by] of [...BUSHES, ...FOREST_BUSHES, ...FLOWER_BEDS, BUSK_SPOT, OLD_BUSK_SIGN]) if (Math.hypot(x - bx, y - by) < 34) return true;
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
  for (let i = 0; i < 42 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p; const s = 2.2 + rnd() * 2.6;
    g.fillStyle = ["#8f8a80", "#9a958a", "#7f7a70"][(rnd() * 3) | 0]!;
    g.beginPath(); g.ellipse(x, y, s, s * 0.7, rnd() * 0.6, 0, 7); g.fill();
    if (rnd() < 0.5) { g.beginPath(); g.ellipse(x + s, y + 1, s * 0.55, s * 0.4, 0, 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,255,255,.22)";
    g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.3, s * 0.4, s * 0.22, 0, 0, 7); g.fill();
  }
  // fallen leaves: tiny tinted ovals with a midrib (denser in the forest)
  for (let i = 0; i < 56 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p; const rot = rnd() * Math.PI;
    const forest = regionAt(x, y) === "forest";
    g.fillStyle = forest
      ? ["#7a8f34", "#8f7a34", "#96803a", "#6f7a2a"][(rnd() * 4) | 0]!
      : ["#a8823c", "#b5713a", "#8f7a34", "#a06a30"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(x, y, 3.2, 1.7, rot, 0, 7); g.fill();
    g.strokeStyle = "rgba(70,50,20,.5)"; g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x - Math.cos(rot) * 3, y - Math.sin(rot) * 3);
    g.lineTo(x + Math.cos(rot) * 3, y + Math.sin(rot) * 3);
    g.stroke();
  }
  // mushrooms — concentrated toward the forest, the odd one elsewhere
  for (let i = 0; i < 30 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest" && rnd() < 0.7) continue;   // mostly forest
    g.fillStyle = "#e8e0cc";
    g.fillRect(x - 1, y - 2.5, 2, 3.5);
    g.fillStyle = rnd() < 0.5 ? "#b5543a" : "#a97b4a";
    g.beginPath(); g.ellipse(x, y - 3, 3.4, 2, 0, Math.PI, 0); g.fill();
    g.fillStyle = "rgba(255,255,255,.4)";
    g.beginPath(); g.arc(x - 1.2, y - 3.6, 0.7, 0, 7); g.fill();
  }
}
