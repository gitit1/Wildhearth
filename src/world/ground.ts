import { T, WORLD_W, WORLD_H } from "../config";
import {
  FIELD, YARD, POND, HOUSE, BARN, STALL, BUSHES, FLOWER_BEDS, BUSK_SPOT, TOWN_BUSK_SPOT, OLD_BUSK_SIGN,
  fieldBounds, PLOT_EXPANSIONS,
  ROAD_SEGMENTS, RIVER, LAKE, DOCK, WELL, STRUCTURES, HEDGES, MARKET_STALLS, COTTAGES,
  FOREST_BUSHES, WORLD_TREES, regionAt, onRoad, inWater, type Rect,
  TOWN_STREET, TOWN_SEA, TOWN_DOCK,
} from "./zones";
import { mulberry32 } from "../engine/rng";
import { roundR } from "../art/shapes";
import { sprite } from "../art/sprites";

// Density scales with area so the world stays evenly textured at ~4x the old
// size (the original counts were tuned for a 1088x768 map).
const AREA_K = (WORLD_W * WORLD_H) / (1088 * 768);

// ===========================================================================
//  Pixel-tile ground (the owner's "everything pixels" order — R2). The static
//  ground canvas is rendered from the generated 32px tile sets
//  (src/assets/pixellab/ground/{grass,soil,water,plaza}/) with a position-
//  seeded weighted scatter per terrain + code Bayer-dither alpha edges between
//  terrains (ported from the proven scratchpad/ground-prod/final_mock.js). This
//  is DUAL-PATH (CLAUDE.md rule #1): if the tile PNGs aren't loaded, paintGround
//  falls back to the painterly region painters below, so the game boots with
//  the ground folder empty. Because the ground bakes ONCE but tiles decode
//  async after boot, main.ts re-bakes a single time once groundTilesAvailable().
// ===========================================================================

/** 4x4 Bayer matrix, normalised to (0,1) thresholds — the dither edge kernel. */
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
  .map((r) => r.map((v) => (v + 0.5) / 16));

/** Expand a weighted spec [[tileIndex, weight], ...] into a flat pick bag. */
function bag(spec: Array<[number, number]>): number[] {
  const b: number[] = [];
  for (const [i, n] of spec) for (let k = 0; k < n; k++) b.push(i);
  return b;
}
// Weighted bags (tile roles + weights from ground-prod/LEDGER.md; plain-dominant
// ~75% so the field never reads as a repeating lattice).
const GRASS_BAG   = bag([[0, 20], [1, 16], [2, 18], [3, 16], [15, 14], [7, 8], [4, 4], [5, 4], [6, 4], [11, 4], [8, 3], [9, 3], [10, 2], [14, 2], [12, 2], [13, 1]]);
const SOIL_PATH_BAG = bag([[6, 10], [7, 10], [14, 10], [12, 3]]);   // smooth packed dirt
/** Furrowed tilled-soil tiles (the plot + freshly-hoed cells). Exported so the
 *  per-cell tilled painter (art/props.ts drawTilledTile) draws the SAME soil
 *  base as the baked field — seamless, no tone clash. */
// Plain furrows (0,1,2 — clean vertical furrows) dominate ~86%; the feature
// variants (8/15 green-sprout, 3 wet-clumpy) stay a sparse minority so the
// field reads as evenly tilled soil, not a patchwork of sprouted/wet cells.
export const SOIL_TILLED_BAG = bag([[0, 8], [1, 8], [2, 8], [8, 2], [3, 1], [15, 1]]);
const WATER_DEEP_BAG    = bag([[10, 7], [11, 7], [14, 7], [1, 3], [7, 2], [5, 2], [9, 1]]);
const WATER_SHALLOW_BAG = bag([[15, 5], [8, 4], [4, 2]]);          // muted shallow only (bright teal dropped — LEDGER)
const WATER_SHORE_BAG   = bag([[12, 3], [2, 2], [0, 1]]);          // mud/sand shore, mud-dominant (supervisor note)
const PLAZA_BAG = bag([[0, 6], [2, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [12, 6], [14, 6], [15, 6], [3, 3], [13, 2], [1, 2], [4, 2]]);

/** Position + salt seeded pick from a bag — deterministic, iteration-order
 *  independent (so two terrains never correlate at a shared cell). */
export function pickTile(b: number[], cx: number, cy: number, salt: number): number {
  const r = mulberry32((((cx * 73856093) ^ (cy * 19349663) ^ (salt * 83492791)) >>> 0))();
  return b[(r * b.length) | 0]!;
}

// Cached 32x32 RGBA pixel buffers per tile ("<set><idx>"), read once off a
// shared scratch canvas. Null until the sprite has decoded (dual-path gate).
const tilePxCache = new Map<string, Uint8ClampedArray>();
let tileScratch: CanvasRenderingContext2D | null = null;
function tilePx(set: string, idx: number): Uint8ClampedArray | null {
  const key = set + idx;
  const cached = tilePxCache.get(key);
  if (cached) return cached;
  const img = sprite(`ground/${set}/tile_${idx}`);
  if (!img) return null;
  if (!tileScratch) {
    const c = document.createElement("canvas"); c.width = T; c.height = T;
    tileScratch = c.getContext("2d", { willReadFrequently: true });
    if (!tileScratch) return null;
    tileScratch.imageSmoothingEnabled = false;
  }
  tileScratch.clearRect(0, 0, T, T);
  tileScratch.drawImage(img, 0, 0);
  let data: Uint8ClampedArray;
  try { data = tileScratch.getImageData(0, 0, T, T).data; }
  catch { return null; }
  tilePxCache.set(key, data);
  return data;
}

/** True once EVERY ground tile PNG (all 16 of all 4 sets) has decoded — the
 *  re-bake gate (main.ts). Checks the whole set so the first bake that passes
 *  this gate is guaranteed to render (paintTerrainTiles never half-fails). */
export function groundTilesAvailable(): boolean {
  for (const set of ["grass", "soil", "water", "plaza"])
    for (let i = 0; i < 16; i++)
      if (!sprite(`ground/${set}/tile_${i}`)) return false;
  return true;
}

let lastTiled = false;
/** Did the most recent paintGround() render from tiles (vs the painterly
 *  fallback)? main.ts uses this to know whether a re-bake is still pending. */
export function groundIsTiled(): boolean { return lastTiled; }

/** The furrowed soil sprite the tiled ground would place at a given tile CENTRE
 *  (world px), or null when the ground isn't tiled — so art/props.ts's
 *  drawTilledTile draws a soil tile matching the baked field, and falls back to
 *  its code furrow painter with zero PNGs. */
export function groundSoilTileFor(cx: number, cy: number): HTMLImageElement | null {
  if (!sprite("ground/soil/tile_0")) return null;
  const col = ((cx - T / 2) / T) | 0, row = ((cy - T / 2) / T) | 0;
  const idx = pickTile(SOIL_TILLED_BAG, col, row, 4);
  return sprite(`ground/soil/tile_${idx}`) ?? sprite("ground/soil/tile_0");
}

/** Signed inset of (x,y) within a rect, in TILE units (positive inside, 0 on the
 *  edge, negative outside) — the raw distance the terrain dither ramps over. */
function rectInsetTiles(x: number, y: number, r: { x: number; y: number; w: number; h: number }): number {
  const lx = x - r.x, ly = y - r.y;
  return Math.min(lx, ly, r.w - lx, r.h - ly) / T;
}

/**
 * Render the whole static ground from the pixel tile sets, with weighted per-
 * cell variant scatter and Bayer-dither terrain edges. Returns false (→ the
 * caller runs the painterly fallback) if any tile hasn't decoded yet.
 */
function paintTerrainTiles(g: CanvasRenderingContext2D): boolean {
  // Preload all 64 tile buffers up front — bail to the painterly path if any is
  // still decoding (a later re-bake will succeed once they're all in).
  const buf: Record<string, Uint8ClampedArray[]> = { grass: [], soil: [], water: [], plaza: [] };
  for (const set of ["grass", "soil", "water", "plaza"]) {
    for (let i = 0; i < 16; i++) {
      const p = tilePx(set, i);
      if (!p) return false;
      buf[set]!.push(p);
    }
  }
  // Terrain regions (world px). Soil = packed-dirt paths + farmyard; the field is
  // furrowed tilled soil; the market square is cobble; pond/river/lake are water.
  const yard = { x: 6 * T, y: 4 * T, w: 12 * T, h: 11 * T };
  const farmPath = { x: 12.4 * T, y: 8.6 * T, w: 7.8 * T, h: 1.3 * T };
  const field = { x: FIELD.x0 * T, y: FIELD.y0 * T, w: (FIELD.x1 - FIELD.x0) * T, h: (FIELD.y1 - FIELD.y0) * T };
  const plaza = { x: 59.5 * T, y: 14.5 * T, w: 21 * T, h: 13.5 * T };
  const townPlaza = { x: TOWN_STREET.x, y: TOWN_STREET.y, w: TOWN_STREET.w, h: TOWN_STREET.h };
  const forest = { x: 46 * T, y: 0, w: 18 * T, h: 17.5 * T };
  const soilRegions = [...ROAD_SEGMENTS, yard, farmPath];

  const img = g.getImageData(0, 0, WORLD_W, WORLD_H);
  const out = img.data;

  const texel = (sbuf: Uint8ClampedArray, x: number, y: number, ch: 0 | 1 | 2): number =>
    sbuf[(((y & 31) * T + (x & 31)) << 2) + ch]!;

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const cx = (x / T) | 0, cy = (y / T) | 0;
      const thr = BAYER[y & 3]![x & 3]!;

      // --- grass base (+ darker, greener forest-floor tint, dithered edge so
      //     the shaded floor blends into the open meadow instead of a hard line) ---
      const gi = pickTile(GRASS_BAG, cx, cy, 1);
      const gb = buf.grass![gi]!;
      let r = texel(gb, x, y, 0), gg = texel(gb, x, y, 1), b = texel(gb, x, y, 2);
      {
        const e = rectInsetTiles(x, y, forest);
        const fa = e > 0.5 ? 1 : e > -0.5 ? e + 0.5 : 0;
        if (fa > 0 && (fa >= 1 || fa > thr)) {
          r = (r * 0.78) | 0; gg = (gg * 0.86) | 0; b = (b * 0.70) | 0;
        }
      }

      // --- SOIL: roads + farmyard + farm path (dithered edges into grass) ---
      let sa = 0;
      for (const rr of soilRegions) {
        const e = rectInsetTiles(x, y, rr);
        const a = e > 0.28 ? 1 : e > -0.5 ? (e + 0.5) / 0.78 : 0;
        if (a > sa) sa = a;
      }
      if (sa > 0 && (sa >= 1 || sa > thr)) {
        const si = pickTile(SOIL_PATH_BAG, cx, cy, 2);
        const sb = buf.soil![si]!;
        r = texel(sb, x, y, 0); gg = texel(sb, x, y, 1); b = texel(sb, x, y, 2);
      }

      // --- TILLED field: furrowed soil with a ragged edge ---
      {
        const e = rectInsetTiles(x, y, field);
        if (e > -0.15 && (e > 0.12 || e > thr - 0.5)) {
          const ti = pickTile(SOIL_TILLED_BAG, cx, cy, 4);
          const tb = buf.soil![ti]!;
          r = texel(tb, x, y, 0); gg = texel(tb, x, y, 1); b = texel(tb, x, y, 2);
        }
      }

      // --- PLAZA: warm-grey cobble across the market square AND the town street ---
      for (const pz of [plaza, townPlaza]) {
        const e = rectInsetTiles(x, y, pz);
        const a = e > 0.28 ? 1 : e > -0.6 ? (e + 0.6) / 0.88 : 0;
        if (a > 0 && (a >= 1 || a > thr)) {
          const zi = pickTile(PLAZA_BAG, cx, cy, 5);
          const zb = buf.plaza![zi]!;
          r = texel(zb, x, y, 0); gg = texel(zb, x, y, 1); b = texel(zb, x, y, 2);
        }
      }

      // --- WATER: pond (ellipse) + river/lake (rects). Deep interior, muted
      //     shallow ring, mud shore ring dithered into grass (mud-dominant). ---
      // pond
      {
        const dx = (x - POND.cx) / POND.rx, dy = (y - POND.cy) / POND.ry;
        const nd = Math.sqrt(dx * dx + dy * dy);
        if (nd < 1.12) {
          let wbag: number[], a = 1;
          if (nd < 0.82) wbag = WATER_DEEP_BAG;
          else if (nd < 0.94) wbag = WATER_SHALLOW_BAG;
          else { wbag = WATER_SHORE_BAG; a = nd < 1.03 ? 1 : (1.12 - nd) / 0.09; }
          if (a >= 1 || a > thr) {
            const wi = pickTile(wbag, cx, cy, 6);
            const wb = buf.water![wi]!;
            r = texel(wb, x, y, 0); gg = texel(wb, x, y, 1); b = texel(wb, x, y, 2);
          }
        }
      }
      // river + lake + coastal sea (the sea's grass-side shore reads as beach)
      for (const wtr of [RIVER, LAKE, TOWN_SEA]) {
        const e = rectInsetTiles(x, y, wtr);
        if (e <= -0.35) continue;
        let wbag: number[], a = 1;
        if (e > 1.1) wbag = WATER_DEEP_BAG;
        else if (e > 0.45) wbag = WATER_SHALLOW_BAG;
        else { wbag = WATER_SHORE_BAG; a = e > 0 ? 1 : (e + 0.35) / 0.35; }
        if (a >= 1 || a > thr) {
          const wi = pickTile(wbag, cx, cy, 7);
          const wb = buf.water![wi]!;
          r = texel(wb, x, y, 0); gg = texel(wb, x, y, 1); b = texel(wb, x, y, 2);
        }
      }

      const o = ((y * WORLD_W + x) << 2);
      out[o] = r; out[o + 1] = gg; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return true;
}

/** Paints the entire static ground once into an offscreen canvas.
 *  Measured 3456x960 (both sides < 4096) — one canvas is fine, no chunking.
 *  Tile-primary (pixel tiles + dither edges) when the ground PNGs are loaded;
 *  the painterly region painters below are the zero-PNG fallback. */
export function paintGround(): HTMLCanvasElement {
  const ground = document.createElement("canvas");
  ground.width = WORLD_W; ground.height = WORLD_H;
  const g = ground.getContext("2d")!;
  g.imageSmoothingEnabled = false;

  lastTiled = paintTerrainTiles(g);
  if (lastTiled) {
    // Small organic decorations (stones, leaves, wildflowers, forest litter)
    // stay code-drawn on TOP of the tiles — they break up any tile repetition
    // and add life; their rejection zones keep them off water/plaza/paths.
    scatterAmbientProps(g);
    return ground;
  }

  // ---- painterly fallback (zero-PNG): the original code-drawn ground ----
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
  paintTownGround(g);
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

/** The coastal town street: a broad cobbled square (painterly fallback), the
 *  same warm packed-earth-and-cobble technique as the market ground. */
function paintTownGround(g: CanvasRenderingContext2D) {
  const { x, y, w, h } = TOWN_STREET;
  const rnd = mulberry32(2424);
  g.save();
  roundR(g, x, y, w, h, 40); g.clip();
  g.fillStyle = "#b19670"; g.fillRect(x, y, w, h);
  for (let i = 0; i < (w * h) / 240; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    g.fillStyle = ["#a3865e", "#bda37c", "#997c54", "#b39a72"][(rnd() * 4) | 0]!;
    g.beginPath(); g.ellipse(px, py, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd(), 0, 7); g.fill();
  }
  // paler cobble stones scattered like the market's well ring, but street-wide
  for (let i = 0; i < (w * h) / 900; i++) {
    const px = x + rnd() * w, py = y + rnd() * h;
    g.fillStyle = ["#8f8a80", "#a29a8c", "#7f786c"][(rnd() * 3) | 0]!;
    g.beginPath(); g.ellipse(px, py, 3, 2.2, rnd() * 3, 0, 7); g.fill();
  }
  g.restore();
}

/** River + lake + coastal sea: a sandy/rocky bank around impassable water. */
function paintWater(g: CanvasRenderingContext2D) {
  const rnd = mulberry32(3131);
  for (const wtr of [RIVER, LAKE, TOWN_SEA]) {
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
  for (const wtr of [RIVER, LAKE, TOWN_SEA]) { roundR(g, wtr.x, wtr.y, wtr.w, wtr.h, 26); g.stroke(); }
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
  // The market plaza cobble (same rect the tiled ground cobbles). Flowers/weeds/
  // clover growing out of paved stone read wrong — floral & grass scatter skips
  // it (stones/pebbles/leaves are fine and still land). Matches paintTerrainTiles.
  const plazaCobble = { x: 59.5 * T, y: 14.5 * T, w: 21 * T, h: 13.5 * T };
  const onPlaza = (x: number, y: number) =>
    (x > plazaCobble.x && x < plazaCobble.x + plazaCobble.w &&
      y > plazaCobble.y && y < plazaCobble.y + plazaCobble.h) ||
    (x > TOWN_STREET.x && x < TOWN_STREET.x + TOWN_STREET.w &&
      y > TOWN_STREET.y && y < TOWN_STREET.y + TOWN_STREET.h);
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
    if (inRect(x, y, RIVER, 14) || inRect(x, y, LAKE, 14) || inRect(x, y, TOWN_SEA, 14)) return true;
    if (inRect(x, y, DOCK, 8) || inRect(x, y, TOWN_DOCK, 8)) return true;
    if ((x - WELL.cx) ** 2 + (y - WELL.cy) ** 2 < (WELL.r + 40) ** 2) return true;
    // the road
    if (onRoad(x, y)) return true;
    for (const s of ROAD_SEGMENTS) if (inRect(x, y, s, 6)) return true;
    // every building / hedge / stall / cottage
    for (const b of [HOUSE, BARN, STALL, ...STRUCTURES, ...HEDGES, ...MARKET_STALLS, ...COTTAGES]) if (inRect(x, y, b, 16)) return true;
    // trees + interactable point-props
    for (const [tx, ty] of WORLD_TREES) if (Math.hypot(x - tx, y - ty) < 30) return true;
    for (const [bx, by] of [...BUSHES, ...FOREST_BUSHES, ...FLOWER_BEDS, BUSK_SPOT, TOWN_BUSK_SPOT, OLD_BUSK_SIGN]) if (Math.hypot(x - bx, y - by) < 34) return true;
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

  // ---- content-library commit 1: ~18 more kinds, region-appropriate, same
  // deterministic-seed + rejection-zone technique as the three kinds above ----

  // logs: a mossy fallen trunk section, mostly in the forest
  for (let i = 0; i < 10 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest" && rnd() < 0.65) continue;
    g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI);
    g.fillStyle = "rgba(20,16,10,.3)"; g.fillRect(-9, 2.5, 18, 3);
    g.fillStyle = "#6f5334";
    g.beginPath(); g.ellipse(0, 0, 9, 3.2, 0, 0, 7); g.fill();
    g.fillStyle = "#8a6c42";
    g.beginPath(); g.ellipse(-7.6, 0, 2.6, 2.9, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(60,42,22,.5)"; g.lineWidth = 0.8;
    g.beginPath(); g.arc(-7.6, 0, 1.4, 0, 7); g.stroke();
    g.fillStyle = "#4a6a34";
    g.beginPath(); g.ellipse(2, -1.4, 3.2, 1.5, 0.3, 0, 7); g.fill();
    g.restore();
  }
  // stumps: a short cut trunk, growth rings on top
  for (let i = 0; i < 8 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest" && rnd() < 0.75) continue;
    g.fillStyle = "rgba(20,16,10,.28)";
    g.beginPath(); g.ellipse(x + 1.4, y + 2, 6.2, 2.8, 0, 0, 7); g.fill();
    g.fillStyle = "#6f5334";
    g.beginPath(); g.ellipse(x, y, 5.8, 4.2, 0, 0, 7); g.fill();
    g.fillStyle = "#9a7a4e";
    g.beginPath(); g.ellipse(x, y - 0.5, 4.4, 3.1, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(120,90,55,.6)"; g.lineWidth = 0.8;
    for (const rr of [1.2, 2.3, 3.3]) { g.beginPath(); g.ellipse(x, y - 0.5, rr, rr * 0.72, 0, 0, 7); g.stroke(); }
  }
  // twigs: a couple of crossed fallen branches
  for (let i = 0; i < 24 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "market") continue;
    g.strokeStyle = "#6f5334"; g.lineWidth = 1; g.lineCap = "round";
    g.beginPath(); g.moveTo(x - 4, y + 1); g.lineTo(x + 4, y - 1); g.stroke();
    g.beginPath(); g.moveTo(x - 2, y - 2 + rnd()); g.lineTo(x + 2.5, y + 1.5); g.stroke();
  }
  // weed tufts: taller, scraggly, seed-headed grass clumps (distinct from the
  // baked ground-texture blades — a sparser, coarser accent)
  for (let i = 0; i < 40 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || onPlaza(x, y)) continue;
    g.strokeStyle = "rgba(120,110,60,.8)"; g.lineWidth = 1.1;
    for (let b = 0; b < 3; b++) {
      const lean = (b - 1) * 3, h = 6 + rnd() * 4;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.5, y - h * 0.6, x + lean, y - h); g.stroke();
      g.fillStyle = "#c9b25a";
      g.beginPath(); g.arc(x + lean, y - h, 0.9, 0, 7); g.fill();
    }
  }
  // clover patches: low three-leaf clusters, the odd tiny white bloom
  for (let i = 0; i < 34 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || onPlaza(x, y)) continue;
    g.fillStyle = "#3f7a3a";
    for (const [ox, oy] of [[-2.2, -1], [2.2, -1], [0, 1.6]] as const) {
      g.beginPath(); g.arc(x + ox, y + oy, 1.6, 0, 7); g.fill();
    }
    if (rnd() < 0.25) { g.fillStyle = "#f0ece0"; g.beginPath(); g.arc(x, y - 3.5, 1, 0, 7); g.fill(); }
  }
  // pebble clusters: a tight group of many tiny pebbles (distinct from the
  // larger faceted stone-pair painter above)
  for (let i = 0; i < 26 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    for (let n = 0; n < 5; n++) {
      const px = x + (rnd() - 0.5) * 8, py = y + (rnd() - 0.5) * 5;
      g.fillStyle = ["#9a938a", "#8a8378", "#a8a196"][(rnd() * 3) | 0]!;
      g.beginPath(); g.ellipse(px, py, 1.1 + rnd() * 0.8, 0.9 + rnd() * 0.6, rnd(), 0, 7); g.fill();
    }
  }
  // daisies / poppies / bluebells / dandelions: small wildflowers through
  // the grass, thicker along the road/market edges
  for (let i = 0; i < 46 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (onPlaza(x, y)) continue;
    if (regionAt(x, y) === "forest" && rnd() < 0.7) continue;
    const kind = rnd();
    if (kind < 0.3) drawTinyFlower(g, x, y, rnd, 6, "#f2f2ea", 2.6, "#e8c34f");         // daisy
    else if (kind < 0.55) drawTinyFlower(g, x, y, rnd, 4, "#c9302e", 3, "#2a2018");     // poppy
    else if (kind < 0.8) drawBluebell(g, x, y, rnd);
    else drawDandelion(g, x, y, rnd);
  }
  // thistle: a spiky purple tuft, road/farm edges
  for (let i = 0; i < 14 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || onPlaza(x, y)) continue;
    g.strokeStyle = "#5f8a4a"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y - 5); g.stroke();
    g.fillStyle = "#3f7a3a";
    for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + Math.sin(a) * 4, y - 3 + Math.cos(a) * -1); g.lineTo(x, y - 4); g.closePath(); g.fill(); }
    g.fillStyle = "#8a5ec2";
    g.beginPath(); g.ellipse(x, y - 6, 2, 2.6, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(180,140,220,.7)";
    for (let f = 0; f < 5; f++) { g.beginPath(); g.arc(x - 1.6 + f * 0.8, y - 7.4, 0.6, 0, 7); g.fill(); }
  }
  // wildflower clumps: a mixed 3-stem cluster, dense along the market square
  for (let i = 0; i < 20 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    // (was biased toward the market square; now the square is paved cobble, so
    // clumps just avoid the cobble and land on the surrounding grass instead)
    if (onPlaza(x, y)) continue;
    const colors = ["#d16a9a", "#e8c34f", "#8a7ac2", "#e0e6f0"];
    for (const [ox, oy] of [[-4, 1], [3, -1], [0, 2]] as const) {
      drawTinyFlower(g, x + ox, y + oy, rnd, 5, colors[(rnd() * colors.length) | 0]!, 2.2, "#e8c34f");
    }
  }
  // pinecones + ferns + acorns + moss patches: forest-floor accents
  for (let i = 0; i < 22 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest") continue;
    const kind = rnd();
    if (kind < 0.3) drawPinecone(g, x, y, rnd);
    else if (kind < 0.6) drawFern(g, x, y, rnd);
    else if (kind < 0.8) drawAcorn(g, x, y);
    else { g.fillStyle = "rgba(74,106,52,.4)"; g.beginPath(); g.ellipse(x, y, 5 + rnd() * 3, 2.6 + rnd(), rnd(), 0, 7); g.fill(); }
  }
  // hay wisps: loose straw strands, farm/road only
  for (let i = 0; i < 18 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || regionAt(x, y) === "market") continue;
    g.strokeStyle = "#d8b25a"; g.lineWidth = 1;
    for (const [dx, dy] of [[-3, -5], [0, -6], [3, -4.5]] as const) {
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx * 0.5, y + dy * 0.5, x + dx, y + dy); g.stroke();
    }
    g.strokeStyle = "#a9885a"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x - 2, y - 1); g.lineTo(x + 2, y - 1); g.stroke();
  }
  scatterWaterEdgeDecor(g, rnd);
}

/** Shared tiny-wildflower painter: stem + a ring of petals + a center dot.
 *  Used by daisies/poppies/wildflower clumps above. */
function drawTinyFlower(
  g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number,
  petals: number, petalColor: string, petalR: number, centerColor: string,
) {
  g.strokeStyle = "#4a7a2a"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y - 1); g.stroke();
  g.fillStyle = petalColor;
  for (let p = 0; p < petals; p++) {
    const a = (p / petals) * Math.PI * 2 + rnd() * 0.3;
    g.beginPath(); g.ellipse(x + Math.cos(a) * petalR, y - 1 + Math.sin(a) * petalR, petalR * 0.7, petalR * 0.42, a, 0, 7); g.fill();
  }
  g.fillStyle = centerColor;
  g.beginPath(); g.arc(x, y - 1, petalR * 0.4, 0, 7); g.fill();
}

/** Bluebell: 2-3 drooping bell-shaped blooms off one stem (forest-leaning). */
function drawBluebell(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  const lean = (rnd() - 0.5) * 2;
  g.strokeStyle = "#4a7a2a"; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x, y + 3); g.quadraticCurveTo(x + 1, y - 2, x - 1 + lean, y - 6); g.stroke();
  g.fillStyle = "#5a6ec9";
  for (const [ox, oy] of [[-2.4, -5.4], [0.4, -7], [2.6, -5]] as const) {
    g.beginPath(); g.ellipse(x + ox + lean, y + oy, 1.5, 2.2, 0.3, 0, 7); g.fill();
  }
}

/** Dandelion: either a dense yellow bloom or a fluffy white seed-head puff. */
function drawDandelion(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  g.strokeStyle = "#4a7a2a"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x, y - 4); g.stroke();
  if (rnd() < 0.5) {
    g.fillStyle = "#e8c34f";
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      g.beginPath(); g.ellipse(x + Math.cos(a) * 2.2, y - 4 + Math.sin(a) * 2.2, 1, 0.5, a, 0, 7); g.fill();
    }
  } else {
    g.fillStyle = "rgba(240,240,235,.75)";
    g.beginPath(); g.arc(x, y - 4, 2.4, 0, 7); g.fill();
    g.strokeStyle = "rgba(200,200,190,.6)"; g.lineWidth = 0.5;
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + Math.cos(a) * 2.6, y - 4 + Math.sin(a) * 2.6); g.stroke();
    }
  }
}

/** Pinecone: a small brown oval with diamond-scale texture lines. */
function drawPinecone(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  g.save(); g.translate(x, y); g.rotate(rnd() * 0.6 - 0.3);
  g.fillStyle = "#6f5334";
  g.beginPath(); g.ellipse(0, 0, 2.4, 4, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(50,36,20,.6)"; g.lineWidth = 0.6;
  for (let row = -2.5; row <= 2.5; row += 1.6) {
    g.beginPath(); g.moveTo(-2, row); g.lineTo(0, row + 0.8); g.lineTo(2, row); g.stroke();
  }
  g.restore();
}

/** Fern: a fanning frond of 5 leaflet pairs from a base point. */
function drawFern(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  const rot = rnd() * 0.5 - 0.25;
  g.strokeStyle = "#3f7a3a"; g.lineWidth = 1;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, 4); g.lineTo(0, -9); g.stroke();
  for (let i = 0; i < 5; i++) {
    const fy = -8 + i * 2.2, len = 3.4 - Math.abs(i - 2) * 0.4;
    g.beginPath(); g.moveTo(0, fy); g.lineTo(-len, fy + 1.4); g.stroke();
    g.beginPath(); g.moveTo(0, fy); g.lineTo(len, fy + 1.4); g.stroke();
  }
  g.restore();
}

/** Acorn: a tiny oval nut with a cross-hatched cap. */
function drawAcorn(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = "#a97b4a";
  g.beginPath(); g.ellipse(x, y + 1, 1.8, 2.3, 0, 0, 7); g.fill();
  g.fillStyle = "#6f5334";
  g.beginPath(); g.ellipse(x, y - 1.4, 2, 1.3, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "rgba(40,28,14,.6)"; g.lineWidth = 0.5;
  g.beginPath(); g.moveTo(x - 1.6, y - 1.6); g.lineTo(x + 1.6, y - 1.2); g.stroke();
}

/**
 * Water-edge decorations (cattails, reeds along river/lake banks; lily pads
 * at the lake/pond's still-water edge; shells on the lake shore specifically)
 * — a dedicated pass (not the generic spot()/blocked() sampler above) so
 * placement hugs the actual shoreline, the same technique paintWater() already
 * uses for its bank pebbles. Baked (zero per-frame cost) like every other
 * ambient decoration here; a live swaying version was judged not worth the
 * extra per-frame ents for how small these read at world scale (see WORKLOG).
 */
function scatterWaterEdgeDecor(g: CanvasRenderingContext2D, rnd: () => number) {
  for (const wtr of [RIVER, LAKE]) {
    const n = Math.round((2 * (wtr.w + wtr.h) / 70) * AREA_K);
    for (let i = 0; i < n; i++) {
      const side = rnd() * 4 | 0;
      let bx: number, by: number;
      if (side === 0) { bx = wtr.x + rnd() * wtr.w; by = wtr.y - 8 - rnd() * 6; }
      else if (side === 1) { bx = wtr.x + rnd() * wtr.w; by = wtr.y + wtr.h + 8 + rnd() * 6; }
      else if (side === 2) { bx = wtr.x - 8 - rnd() * 6; by = wtr.y + rnd() * wtr.h; }
      else { bx = wtr.x + wtr.w + 8 + rnd() * 6; by = wtr.y + rnd() * wtr.h; }
      if (rnd() < 0.5) drawCattail(g, bx, by); else drawReedClump(g, bx, by, rnd);
    }
  }
  // lily pads at the LAKE's still-water edge (river excluded — it flows)
  {
    const n = Math.round(6 * AREA_K);
    for (let i = 0; i < n; i++) {
      const px = LAKE.x + 10 + rnd() * Math.max(4, LAKE.w - 20), py = LAKE.y + 10 + rnd() * Math.max(4, LAKE.h - 20);
      drawLilyPad(g, px, py, rnd);
    }
  }
  // ...and the pond (an ELLIPSE, not a rect — sample within it by angle/radius
  // so pads never land past the shoreline into the surrounding grass).
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2, r = 0.25 + rnd() * 0.55;
    drawLilyPad(g, POND.cx + Math.cos(a) * POND.rx * r, POND.cy + Math.sin(a) * POND.ry * r, rnd);
  }
  // shells: bleached pale shapes on the LAKE shore specifically
  for (let i = 0; i < 10; i++) {
    const bx = LAKE.x - 6 + rnd() * (LAKE.w + 12), by = LAKE.y + LAKE.h + 4 + rnd() * 8;
    g.fillStyle = ["#ece2cf", "#e0d4bc", "#d8cbb0"][(rnd() * 3) | 0]!;
    g.beginPath(); g.arc(bx, by, 2.2, Math.PI, 0); g.fill();
    g.strokeStyle = "rgba(150,130,100,.5)"; g.lineWidth = 0.5;
    for (const a of [0.7, 1.6, 2.4]) { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(Math.PI + a * 0.4) * 2, by - Math.sin(a * 0.4) * 2); g.stroke(); }
  }
}

/** Lily pad: a flat green disc with a wedge notch, a slightly darker rim. */
function drawLilyPad(g: CanvasRenderingContext2D, px: number, py: number, rnd: () => number) {
  g.fillStyle = "#3a6a4a";
  g.beginPath(); g.arc(px, py, 4.5 + rnd() * 2, 0.4, Math.PI * 2 - 0.4); g.fill();
  g.fillStyle = "#4f8a5f";
  g.beginPath(); g.arc(px - 0.6, py - 0.6, 2.6, 0, 7); g.fill();
}

/** Cattail: a brown corndog-shaped seed head on a thin green stem. */
function drawCattail(g: CanvasRenderingContext2D, x: number, y: number) {
  g.strokeStyle = "#4a7a3a"; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y - 12); g.stroke();
  g.fillStyle = "#5a4020";
  g.beginPath(); g.ellipse(x, y - 12, 1.6, 4.2, 0, 0, 7); g.fill();
}

/** Reed clump: 3-4 tall thin green blades fanning from a base. */
function drawReedClump(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  g.strokeStyle = "#3f7a3a"; g.lineWidth = 1.3;
  for (let b = 0; b < 4; b++) {
    const lean = (b - 1.5) * 2.4, h = 10 + rnd() * 6;
    g.beginPath(); g.moveTo(x, y + 3); g.quadraticCurveTo(x + lean * 0.5, y - h * 0.5, x + lean, y - h); g.stroke();
  }
}
