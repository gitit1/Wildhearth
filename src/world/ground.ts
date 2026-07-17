import { T, WORLD_W, WORLD_H } from "../config";
import {
  FIELD, YARD, POND, HOUSE, BARN, COOP, STALL, BUSHES, FLOWER_BEDS, BUSK_SPOT, TOWN_BUSK_SPOT, OLD_BUSK_SIGN,
  fieldBounds, PLOT_EXPANSIONS,
  ROAD_SEGMENTS, RIVER, LAKE, DOCK, WELL, STRUCTURES, HEDGES, MARKET_STALLS, COTTAGES,
  FOREST_BUSHES, WORLD_TREES, WORLD_PROPS, regionAt, onRoad, inWater, type Rect,
  TOWN_STREET, TOWN_SEA, TOWN_DOCK,
  OUTHOUSE, NEIGHBOR, INN, STABLE, TOWN_HOMES, TOWN_MERCHANTS,
} from "./zones";
import type { FarmManifest } from "../data/farmStart";
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

/** Deterministic per-pixel hash noise in (0,1) — one octave of the edge kernel. */
function noise01(x: number, y: number, salt: number): number {
  let h = ((x * 374761393) ^ (y * 668265263) ^ (salt * 1274126177)) >>> 0;
  h ^= h >>> 13; h = (h * 1274126177) >>> 0; h ^= h >>> 16;
  return h / 4294967296;
}
/** Multi-octave organic dither threshold (W1.1 — replaces the 4x4 Bayer).
 *  The ordered Bayer read as a mechanical dot lattice at gameplay zoom
 *  (coordinator review); three octaves of positional hash noise (4px / 2px /
 *  1px features) give an irregular torn-paper edge instead, still fully
 *  deterministic per world pixel. */
function edgeThr(x: number, y: number): number {
  return 0.45 * noise01(x >> 2, y >> 2, 11) + 0.35 * noise01(x >> 1, y >> 1, 22) + 0.2 * noise01(x, y, 33);
}

// ===========================================================================
//  COHESION-1 — SMOOTH value noise + signed-distance FINGER transitions.
//  The shipped terrain edges used a per-pixel edgeThr threshold (a mechanical
//  speckle the owner rejected as "pushed in"). These replace it with a domain-
//  warped signed-distance edge: sd = distanceToBoundary + (fbm-0.5)*amp; fill
//  when sd<0 → interlocking organic fingers, no checkerboard. Ported from the
//  owner-approved probe (scratchpad/cohesion/lib.mjs + scene2-5). Deterministic.
// ===========================================================================
function smstep(t: number): number { return t * t * (3 - 2 * t); }
/** Bilinear-interpolated value noise in (0,1); feature size = `cell` px. */
function vnoise(x: number, y: number, cell: number, salt: number): number {
  const gx = x / cell, gy = y / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = smstep(gx - ix), fy = smstep(gy - iy);
  const a = noise01(ix, iy, salt), b = noise01(ix + 1, iy, salt);
  const c = noise01(ix, iy + 1, salt), d = noise01(ix + 1, iy + 1, salt);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
/** Fractal (2-octave) value noise in (0,1) — the organic-finger engine. */
function fbm(x: number, y: number, cell: number, salt: number): number {
  return 0.65 * vnoise(x, y, cell, salt) + 0.35 * vnoise(x, y, cell / 2, salt + 7);
}
/** Signed distance (px) to an axis-aligned rect boundary — NEGATIVE inside. */
function sdRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): number {
  return -Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y);
}
// Finger-warp amplitudes shared by the fill (paintTerrainTiles) and the edge
// detail scatter (paintTransitionScatter) so tufts land on the SAME boundary.
const FING = 0.60 * T;        // soil / plaza / water finger amplitude
const FING_FIELD = 0.5 * T;   // gentler ragged edge at the fenced field

/** Expand a weighted spec [[tileIndex, weight], ...] into a flat pick bag. */
function bag(spec: Array<[number, number]>): number[] {
  const b: number[] = [];
  for (const [i, n] of spec) for (let k = 0; k < n; k++) b.push(i);
  return b;
}
// Weighted bags (tile roles + weights from ground-prod/LEDGER.md; plain-dominant
// ~85% so the field never reads as a repeating lattice).
// --- W1 UO-mood sets (outline-mode tiles_pro, border-eroded; roles re-mapped
//     from the new sheets — see docs/PIXELLAB_ASSETS.md generation ledger). ---
// GRASS: plain mid-olive turf dominates ~85% (rule 23); the darker(2)/lighter
// (3,13) tone variants stay sparse and the features (9 wildflowers, 11 pebble,
// 15 twig) rare, so tiling reads as soft mottled meadow, not a patchwork.
// Dominant pool is the tight same-tone cluster (tiles 0,1,4,5,6,7,8,12 all
// sit within ~4 of the set mean rgb 127,128,88 — measured); the off-tone tiles
// 10/14 (darker) and 2/3/13 (dark/light) are demoted to sparse accents so no
// tone jump reads as a checkerboard (W1 checker fix — measure, don't guess).
const GRASS_BAG   = bag([[0, 12], [1, 12], [4, 12], [5, 11], [6, 12], [7, 11], [8, 12], [12, 11], [9, 4], [11, 3], [15, 3], [10, 3], [14, 2], [13, 2], [3, 1], [2, 1]]);
// SOIL smooth packed dirt — roads + farmyard + path. Uses ONLY the smooth
// dirt tiles (0-7,12-14); the furrow tiles are excluded so no plank/furrow
// ever leaks into the yard (the "dark vertical bars" root cause, W1 audit).
const SOIL_PATH_BAG = bag([[0, 10], [1, 10], [2, 9], [3, 8], [5, 9], [6, 10], [7, 9], [12, 9], [13, 8], [4, 4], [14, 2]]);
/** Tilled-soil furrow tiles (the plot + freshly-hoed cells). Exported so the
 *  per-cell tilled painter (art/props.ts drawTilledTile) draws the SAME soil
 *  base as the baked field — seamless, no tone clash. */
// The soft HORIZONTAL crumbly-furrow tiles (8,9,10,11,15) — NOT the old
// vertical-plank read the owner rejected. W1.1: the furrow tiles were
// post-processed to share ONE y-aligned 8px band profile + a common warm-earth
// mean (62,53,37), so furrow rows continue seamlessly across every tile border
// and the field reads as a calm horizontal rhythm instead of a dark noisy
// mass; the smooth bare-patch tile (12) was dropped — it broke the rhythm.
export const SOIL_TILLED_BAG = bag([[8, 10], [9, 9], [10, 9], [11, 9], [15, 9]]);
// WATER deep cold interior: tiles 0 & 12 are near-identical dark cold water
// (bright ~44, measured) and carry the field; 1/14 (bright ~58) are mild
// secondaries and 2/5 (darkest) rare accents. The green/light outliers
// (3,4,6,7 — bright 67-78) are kept OUT of the deep pool: mixing them in was
// the lake checkerboard (a 38-point brightness jump). Shallow ring uses the
// lighter tiles, shore ring the muddy/sandy ones.
const WATER_DEEP_BAG    = bag([[0, 13], [12, 13], [14, 3], [2, 2], [5, 2], [1, 1]]);
const WATER_SHALLOW_BAG = bag([[8, 6], [13, 5], [6, 3], [3, 3]]);   // lighter muted shallow (no bright teal)
const WATER_SHORE_BAG   = bag([[9, 5], [11, 5], [15, 4], [10, 3]]); // mud-dominant, sand accent
// PLAZA cobble — tight muted grey cobble dominant; the flagstone(4,15) and
// dirt-patch(9,13) variants stay sparse so the square reads as one paving.
const PLAZA_BAG = bag([[0, 8], [1, 8], [2, 8], [3, 7], [5, 7], [7, 8], [10, 7], [11, 7], [14, 7], [12, 6], [6, 4], [9, 3], [13, 3], [4, 2], [8, 2], [15, 2]]);

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
  // W2c: the farm YARD is no longer a flat all-dirt field (the owner's
  // "featureless dirt" — a path can't read on uniform dirt). The farmstead now
  // sits on GRASS; the DIRT is the circulation — the house↔field farm path (kept
  // below), the worn trails + doorstep aprons baked by paintFarmWear, and the
  // warm worn-dirt rings scuffOne bakes around each farm building. Reads as a
  // lived-in farmstead with real paths instead of a brown void.
  const farmPath = { x: 12.4 * T, y: 8.6 * T, w: 7.8 * T, h: 1.3 * T };
  const field = { x: FIELD.x0 * T, y: FIELD.y0 * T, w: (FIELD.x1 - FIELD.x0) * T, h: (FIELD.y1 - FIELD.y0) * T };
  const plaza = { x: 59.5 * T, y: 14.5 * T, w: 21 * T, h: 13.5 * T };
  const townPlaza = { x: TOWN_STREET.x, y: TOWN_STREET.y, w: TOWN_STREET.w, h: TOWN_STREET.h };
  const forest = { x: 46 * T, y: 0, w: 18 * T, h: 17.5 * T };
  const soilRegions = [...ROAD_SEGMENTS, farmPath];
  const waterRects = [RIVER, LAKE, TOWN_SEA];

  // COHESION-1 (B/C/D) tuning — wear/bank palettes (FING/FING_FIELD module-level).
  const BARE = [78, 65, 44];    // barer packed earth toward path traffic centre
  const SEAM = [74, 64, 48];    // worn-dirt seam under the plaza edge cobbles
  const MOSS = [63, 90, 44];    // moss grown into the plaza grout near grass
  const WETMUD = [43, 40, 32], DAMP = [61, 54, 38];   // water bank: wet mud -> damp earth

  const img = g.getImageData(0, 0, WORLD_W, WORLD_H);
  const out = img.data;

  const texel = (sbuf: Uint8ClampedArray, x: number, y: number, ch: 0 | 1 | 2): number =>
    sbuf[(((y & 31) * T + (x & 31)) << 2) + ch]!;
  const soilTexel = (x: number, y: number): [number, number, number] => {
    const sb = buf.soil![pickTile(SOIL_PATH_BAG, (x / T) | 0, (y / T) | 0, 2)]!;
    return [texel(sb, x, y, 0), texel(sb, x, y, 1), texel(sb, x, y, 2)];
  };

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const cx = (x / T) | 0, cy = (y / T) | 0;
      // W1.1: organic noise threshold + WIDER fades (~1.5 tiles) — the old
      // 4x4 Bayer + ~0.8-tile ramps read as a mechanical dot lattice.
      const thr = edgeThr(x, y);

      // --- grass base (+ darker, greener forest-floor tint, dithered edge so
      //     the shaded floor blends into the open meadow instead of a hard line) ---
      const gi = pickTile(GRASS_BAG, cx, cy, 1);
      const gb = buf.grass![gi]!;
      let r = texel(gb, x, y, 0), gg = texel(gb, x, y, 1), b = texel(gb, x, y, 2);
      {
        const e = rectInsetTiles(x, y, forest);
        const fa = e > 0.75 ? 1 : e > -0.75 ? (e + 0.75) / 1.5 : 0;
        if (fa > 0 && (fa >= 1 || fa > thr)) {
          r = (r * 0.78) | 0; gg = (gg * 0.86) | 0; b = (b * 0.70) | 0;
        }
      }

      // --- SOIL: roads + farmyard + farm path. COHESION-1(B/C): interlocking
      //     organic FINGERS (domain-warped signed distance, not the speckle
      //     threshold) + a wear gradient (darker + barer toward the traffic
      //     centre, grassier at the shoulders). ---
      {
        let depthPx = -1;   // deepest inset into the soil union (px), <0 = outside
        for (const rr of soilRegions) {
          const sd = sdRect(x, y, rr) + (fbm(x, y, 7, 3) - 0.5) * 2 * FING;
          if (-sd > depthPx) depthPx = -sd;
        }
        if (depthPx > 0) {
          let [pr, pg, pb] = soilTexel(x, y);
          const depth = Math.min(1, depthPx / (1.3 * T));
          const dk = 1 - 0.12 * depth, toBare = 0.10 * depth;   // gentle: packed dust, not mud
          pr = pr * dk * (1 - toBare) + BARE[0]! * toBare;
          pg = pg * dk * (1 - toBare) + BARE[1]! * toBare;
          pb = pb * dk * (1 - toBare) + BARE[2]! * toBare;
          r = pr; gg = pg; b = pb;
        }
      }

      // --- TILLED field: furrowed soil, organic finger edge into the grass ---
      {
        const sd = sdRect(x, y, field) + (fbm(x, y, 7, 13) - 0.5) * 2 * FING_FIELD;
        if (sd < 0) {
          const tb = buf.soil![pickTile(SOIL_TILLED_BAG, cx, cy, 4)]!;
          r = texel(tb, x, y, 0); gg = texel(tb, x, y, 1); b = texel(tb, x, y, 2);
        }
      }

      // --- PLAZA cobble (market + town street). COHESION-1(C): organic finger
      //     edge, moss grown into the grout near grass, a worn-dirt seam at the
      //     edge, and a dirt seam bleeding onto the grass side. ---
      for (const pz of [plaza, townPlaza]) {
        const sd = sdRect(x, y, pz) + (fbm(x, y, 7, 23) - 0.5) * 2 * FING;
        if (sd < 0) {
          const zb = buf.plaza![pickTile(PLAZA_BAG, cx, cy, 5)]!;
          let pr = texel(zb, x, y, 0), pg = texel(zb, x, y, 1), pb = texel(zb, x, y, 2);
          const luma = 0.299 * pr + 0.587 * pg + 0.114 * pb;
          const nearEdge = Math.max(0, 1 + sd / (2.6 * T));   // 1 at edge .. 0 deep
          if (luma < 118 && nearEdge > 0 && fbm(x, y, 9, 31) < nearEdge * 0.95) {
            const k = (0.55 * nearEdge + 0.18) * (luma < 96 ? 1 : 0.7);   // moss into grout (strongest in dark grout)
            pr = pr * (1 - k) + MOSS[0]! * k; pg = pg * (1 - k) + MOSS[1]! * k; pb = pb * (1 - k) + MOSS[2]! * k;
          }
          if (-sd < 0.7 * T) {                                 // packed-dirt seam
            const k = 0.38 * (1 - (-sd) / (0.7 * T));
            pr = pr * (1 - k) + SEAM[0]! * k; pg = pg * (1 - k) + SEAM[1]! * k; pb = pb * (1 - k) + SEAM[2]! * k;
          }
          r = pr; gg = pg; b = pb;
        } else if (sd < 0.55 * T) {                            // dirt seam onto grass
          const [sr, sg, sb] = soilTexel(x, y);
          const k = 0.55 * (1 - sd / (0.55 * T));
          r = r * (1 - k) + sr * k; gg = gg * (1 - k) + sg * k; b = b * (1 - k) + sb * k;
        }
      }

      // --- WATER: pond (ellipse) + river/lake/sea (rects). COHESION-1(D):
      //     organic finger shoreline, a wet-earth BANK above the waterline
      //     (wet mud -> damp earth gradient) + a 1px wet-contact sheen row. ---
      {
        const ndx = (x - POND.cx) / POND.rx, ndy = (y - POND.cy) / POND.ry;
        const nd = Math.sqrt(ndx * ndx + ndy * ndy) + (fbm(x, y, 7, 43) - 0.5) * 0.16;
        const bankNd = 1 + (1.15 * T) / POND.ry;
        if (nd < 1) {
          const depth = (1 - nd) * POND.ry;
          const wbag = depth > 1.6 * T ? WATER_DEEP_BAG : depth > 0.55 * T ? WATER_SHALLOW_BAG : WATER_SHORE_BAG;
          const wb = buf.water![pickTile(wbag, cx, cy, 6)]!;
          let wr = texel(wb, x, y, 0), wgc = texel(wb, x, y, 1), wbc = texel(wb, x, y, 2);
          if (depth < 5) { wr = wr * 0.7 + 45; wgc = wgc * 0.7 + 49.5; wbc = wbc * 0.7 + 51; }
          r = wr; gg = wgc; b = wbc;
        } else if (nd < bankNd) {
          const wet = 1 - (nd - 1) / (bankNd - 1);
          let [sr, sg, sb] = soilTexel(x, y);
          const tgt = wet > 0.55 ? WETMUD : DAMP, k = 0.35 + 0.5 * wet;
          sr = sr * (1 - k) + tgt[0]! * k; sg = sg * (1 - k) + tgt[1]! * k; sb = sb * (1 - k) + tgt[2]! * k;
          if (wet > 0.8) { sr *= 1.12; sg *= 1.14; sb *= 1.18; }
          r = sr; gg = sg; b = sb;
        }
      }
      for (const wtr of waterRects) {
        const sd = sdRect(x, y, wtr) + (fbm(x, y, 7, 33) - 0.5) * 2 * FING;
        if (sd < 0) {                                         // ---- WATER ----
          const depth = -sd;
          const wbag = depth > 1.6 * T ? WATER_DEEP_BAG : depth > 0.55 * T ? WATER_SHALLOW_BAG : WATER_SHORE_BAG;
          const wb = buf.water![pickTile(wbag, cx, cy, 7)]!;
          let wr = texel(wb, x, y, 0), wgc = texel(wb, x, y, 1), wbc = texel(wb, x, y, 2);
          if (depth < 5) { wr = wr * 0.7 + 45; wgc = wgc * 0.7 + 49.5; wbc = wbc * 0.7 + 51; }
          r = wr; gg = wgc; b = wbc;
        } else if (sd < 1.15 * T) {                           // ---- LAND BANK ----
          const wet = 1 - sd / (1.15 * T);
          let [sr, sg, sb] = soilTexel(x, y);
          const tgt = wet > 0.55 ? WETMUD : DAMP, k = 0.35 + 0.5 * wet;
          sr = sr * (1 - k) + tgt[0]! * k; sg = sg * (1 - k) + tgt[1]! * k; sb = sb * (1 - k) + tgt[2]! * k;
          if (wet > 0.8) { sr *= 1.12; sg *= 1.14; sb *= 1.18; }
          r = sr; gg = sg; b = sb;
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
// ===========================================================================
//  W2a — building base-blend grounding decals. Clean-cut building sprites (no
//  baked apron) need a runtime ground blend so they sit IN the terrain, not on
//  it. Baked ONCE into the ground canvas (so it sits UNDER every depth-sorted
//  building sprite and adapts to whatever ground the building sits on): each
//  footprint SAMPLES the local ground pixels and blends them toward a darker
//  compacted-earth contact under the base, with an organic multi-octave noise
//  dither at the edge (same idea as the terrain edges, per PIXELLAB_ASSETS
//  "grounding split"). Farm buildings additionally get a wider WARM worn-dirt
//  yard — the trampled "lived-in yard" the old baked apron gave. Contact
//  SHADOWS stay dynamic (castShadow, drawn per-frame in art/buildings.ts).
// ===========================================================================
interface FootPrint { cx: number; cy: number; halfW: number; worn: boolean }
function buildingFootprints(): FootPrint[] {
  const fp: FootPrint[] = [];
  const B = (r: Rect, worn: boolean, k = 0.55) =>
    fp.push({ cx: r.x + r.w / 2, cy: r.y + r.h, halfW: r.w * k, worn });
  // Farm buildings/farmsteads — a worn trampled-dirt yard.
  B(HOUSE, true); B(BARN, true); B(OUTHOUSE, true, 0.6);
  B(NEIGHBOR.house, true); B(NEIGHBOR.barn, true);
  // Market/town buildings — subtle contact only (they sit on plaza/street/grass,
  // where a warm dirt patch would clash with cobble).
  for (const c of COTTAGES) B(c, false);
  for (const h of TOWN_HOMES) B(h, false);
  B(INN, false); B(STABLE, false);
  B(STALL, false, 0.5);
  for (const s of MARKET_STALLS) B(s, false, 0.5);
  for (const m of TOWN_MERCHANTS) B(m, false, 0.5);
  fp.push({ cx: WELL.cx, cy: WELL.cy + WELL.r, halfW: WELL.r * 1.3, worn: false });
  return fp;
}

/** Two-octave organic value in (0,1) for dithering a decal boundary. */
function scuffNoise(x: number, y: number): number {
  return noise01(x, y, 91) * 0.6 + noise01(x >> 1, y >> 1, 47) * 0.4;
}

/** COHESION-1(E): a LIGHT, organic worn-GRASS field in front of a FARM building
 *  base — replaces the shipped dark worn-dirt oval (a "pasted patch") + the dark
 *  contact ellipse (contact now hugs the base chevron per-frame in baseGrounding).
 *  Tints the grass toward a worn-grass mid-tone (~#766c4e), max α~0.4 so the grass
 *  texture bleeds through heavily, boundary finger-warped (no contained shape).
 *  Non-farm buildings bake nothing (their per-frame hug AO + base tufts ground
 *  them without a dirt patch clashing on cobble). Reads + writes in place. */
const WORN_GRASS: [number, number, number] = [118, 108, 78];
function scuffOne(g: CanvasRenderingContext2D, f: FootPrint) {
  if (!f.worn) return;
  const rx = f.halfW * 1.55, ry = Math.max(12, f.halfW * 0.72);
  const cx = f.cx, cy = f.cy + ry * 0.30;                            // worn area sits IN FRONT (south) of the base
  const x0 = Math.max(0, Math.floor(cx - rx - 3)), x1 = Math.min(WORLD_W, Math.ceil(cx + rx + 3));
  const y0 = Math.max(0, Math.floor(cy - ry - 3)), y1 = Math.min(WORLD_H, Math.ceil(cy + ry + 3));
  if (x1 <= x0 || y1 <= y0) return;
  const img = g.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data, iw = x1 - x0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    const v = (1 - Math.sqrt(nx * nx + ny * ny)) + (fbm(x, y, 9, 3) - 0.5) * 0.5;   // finger-warped radial field
    if (v <= 0.12) continue;
    const a = Math.min(0.40, Math.min(1, v / 0.9) * 0.5);           // heavy grass bleed-through
    const i = ((y - y0) * iw + (x - x0)) * 4;
    d[i]     = d[i]     * (1 - a) + WORN_GRASS[0] * a;
    d[i + 1] = d[i + 1] * (1 - a) + WORN_GRASS[1] * a;
    d[i + 2] = d[i + 2] * (1 - a) + WORN_GRASS[2] * a;
  }
  g.putImageData(img, x0, y0);
}

/** Bake every building's base-blend decal into the ground canvas. */
function paintBuildingGrounding(g: CanvasRenderingContext2D) {
  for (const f of buildingFootprints()) scuffOne(g, f);
}

// ===========================================================================
//  COHESION-1 (A) — NATURE GROUNDING. The clean-cut (apron-stripped) tree /
//  boulder / bush sprites need the object to sit IN the meadow, WORN — not on a
//  patch of sand (the shipped baked apron, now removed by strip-nature-apron.mjs).
//  Baked ONCE into the ground (under the depth-sorted sprite), mirroring
//  paintBuildingGrounding: per object a darker/desaturated SAME-grass worn ring
//  + a short contact AO + a dense IRREGULAR cluster of tufts/leaf-litter and a
//  few tiny dark scuff specks overlapping the base and spilling asymmetrically.
//  Ported faithfully from the owner-approved probe (scratchpad/cohesion/scene1).
//  Runs on BOTH ground paths (tiled + painterly). Zero sprite dependency → the
//  fixed per-category radii keep it dual-path safe.
// ===========================================================================
const TUFT_G: [number, number, number][] = [[71, 99, 46], [92, 125, 56], [51, 68, 29]];
const TUFT_DRY: [number, number, number][] = [[111, 122, 52], [138, 138, 74], [74, 83, 35]];
const LITTER: [number, number, number][] = [[106, 84, 58], [122, 106, 48], [90, 74, 44], [74, 61, 41]];
const SCUFF_C: [number, number, number][] = [[46, 38, 29], [50, 42, 31], [54, 45, 33]];
const PEBBLE: [number, number, number][] = [[108, 96, 89], [91, 94, 100], [115, 98, 79], [132, 122, 106]];
const CRACK_C: [number, number, number] = [42, 34, 22];
const BARE_C: [number, number, number][] = [[58, 49, 32], [51, 42, 28], [46, 38, 29]];

/** Alpha pixel dab (rgba fillRect), rounded to integer coords. */
function dabA(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: [number, number, number], a: number) {
  g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(a / 255).toFixed(3)})`;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
/** One grass tuft: 3-5 upright blades in two greens + a darker root pixel. */
function tuftDraw(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number, pal: [number, number, number][]) {
  const blades = 3 + ((rnd() * 3) | 0);
  for (let b = 0; b < blades; b++) {
    const lean = Math.round((b - (blades - 1) / 2) * 1.6);
    const hh = 3 + ((rnd() * 5) | 0);
    const col = rnd() < 0.5 ? pal[0]! : pal[1]!;
    for (let k = 0; k < hh; k++) dabA(g, x + lean + Math.round((k / hh) * lean * 0.2), y - k, 1, 1, col, 235);
  }
  dabA(g, x, y, 1, 1, pal[2]!, 200);
}

interface NatureSpot { x: number; y: number; baseR: number }
function natureSpots(): NatureSpot[] {
  const s: NatureSpot[] = [];
  for (const [x, y] of WORLD_TREES) s.push({ x, y, baseR: 23 });
  for (const [x, y] of [...BUSHES, ...FOREST_BUSHES]) s.push({ x, y, baseR: 11 });
  for (const p of WORLD_PROPS) {
    if (!p.id.startsWith("props/boulder")) continue;
    const w = p.id.endsWith("small") ? 66 : p.id.endsWith("med") ? 90 : 115;
    s.push({ x: p.x, y: p.y, baseR: Math.round(w * (p.scale ?? 0.5) * 0.34) });
  }
  return s;
}

/** Worn ring (darker/desaturated warm-olive, dithered — NOT dirt) + short
 *  contact AO for one nature object, read+written on the ground in place. */
function natureWornAndAO(g: CanvasRenderingContext2D, s: NatureSpot) {
  const { x: fx, y: fy, baseR } = s;
  const rx = baseR * 1.5, ry = baseR * 0.64;
  const axr = baseR * 1.18, ayr = Math.max(5, baseR * 0.44);
  const x0 = Math.max(0, Math.floor(fx - rx - 3)), x1 = Math.min(WORLD_W, Math.ceil(fx + rx + 3));
  const y0 = Math.max(0, Math.floor(fy - ry - 3)), y1 = Math.min(WORLD_H, Math.ceil(fy + ry + 4));
  if (x1 <= x0 || y1 <= y0) return;
  const img = g.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data, iw = x1 - x0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = ((y - y0) * iw + (x - x0)) * 4;
    // worn ring — trampled meadow (toward warm-olive 74,70,42), never bright
    const nx = (x - fx) / rx, ny = (y - (fy - 1)) / ry, dist = Math.sqrt(nx * nx + ny * ny);
    if (dist < 1) {
      const fall = 1 - dist, nz = fbm(x, y, 5, 71);
      let t = fall * 0.5;
      if (fall < 0.5 && nz > fall / 0.5) t = 0;
      if (t > 0) {
        const k = t * 0.52;
        d[i] = d[i]! * (1 - k) + 74 * k; d[i + 1] = d[i + 1]! * (1 - k) + 70 * k; d[i + 2] = d[i + 2]! * (1 - k) + 42 * k;
      }
    }
    // short contact AO — multiply darken, tight ellipse hugging the base
    const nxa = (x - fx) / axr, nya = (y - (fy - 2)) / ayr, da = nxa * nxa + nya * nya;
    if (da < 1) {
      const ta = Math.pow(1 - da, 1.7) * 0.46;
      d[i] = d[i]! * (1 - ta); d[i + 1] = d[i + 1]! * (1 - ta); d[i + 2] = d[i + 2]! * (1 - ta);
    }
  }
  g.putImageData(img, x0, y0);
}

/** The tuft/leaf-litter/scuff cluster overlapping one nature object's base,
 *  spilling asymmetrically front/left (canvas draws, over the worn ring/AO). */
function natureCluster(g: CanvasRenderingContext2D, s: NatureSpot) {
  const { x: fx, y: fy, baseR } = s;
  const rnd = mulberry32((((s.x | 0) * 73856093) ^ ((s.y | 0) * 19349663)) >>> 0);
  // tiny dark scuff specks tight at the contact (never a bright oval)
  for (let i = 0; i < Math.round(baseR * 0.5); i++) {
    const a = rnd() * Math.PI * 2, rr = rnd() * baseR * 0.55;
    dabA(g, fx + Math.cos(a) * rr, fy + Math.sin(a) * rr * 0.44 - 1, 1 + (rnd() < 0.4 ? 1 : 0), 1, SCUFF_C[(rnd() * 3) | 0]!, 140 + rnd() * 70);
  }
  // leaf litter dabs, biased front/left
  for (let i = 0; i < Math.round(baseR * 0.85); i++) {
    const a = -Math.PI * 0.15 + rnd() * Math.PI * 1.3, rr = baseR * (0.35 + rnd() * 1.05);
    dabA(g, fx - Math.cos(a) * rr * 0.85, fy - Math.sin(a) * rr * 0.42 + rnd() * 3, 1 + (rnd() < 0.3 ? 1 : 0), 1, LITTER[(rnd() * LITTER.length) | 0]!, 210);
  }
  // tufts — elliptical band hugging the base, denser front + left (asymmetric spill)
  const N = Math.round(baseR * 2.3);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2;
    const front = Math.sin(a) > 0 ? 1 : 0.6, left = Math.cos(a) < 0 ? 1 : 0.75;
    if (rnd() > 0.5 * front * left + 0.28) continue;
    const rr = baseR * (0.35 + rnd() * 1.05);
    tuftDraw(g, fx + Math.cos(a) * rr, fy + Math.sin(a) * rr * 0.46, rnd, rnd() < 0.16 ? TUFT_DRY : TUFT_G);
  }
  // a few undergrowth clumps overlapping the base directly (front)
  for (let i = 0; i < Math.round(baseR * 0.4); i++) {
    tuftDraw(g, fx + (rnd() - 0.5) * baseR * 1.2, fy - rnd() * 5, rnd, TUFT_G);
  }
}

/** Bake worn ground under every tree / boulder / bush (both ground paths). */
function paintNatureGrounding(g: CanvasRenderingContext2D) {
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  for (const s of natureSpots()) { natureWornAndAO(g, s); natureCluster(g, s); }
  g.imageSmoothingEnabled = prev;
}

// ===========================================================================
//  COHESION-1 (C) — WORN-PATH / PLAZA / FIELD EDGE detail scatter. The per-pixel
//  wear gradient, moss-grout and seam are baked in paintTerrainTiles; this adds
//  the vegetation + grit that read hand-authored: grass tufts breaking BOTH
//  edges in fbm CLUSTERS (not polka-dots), bare specks where grass loses hold,
//  pebbles + hairline cracks in the barer path centres, faint twin cart-ruts
//  along the road segments, and a few half-buried muted cobbles in the plaza
//  seam. All gated by the SAME warped signed-distance field the fill uses.
// ===========================================================================
function scatterEdge(
  g: CanvasRenderingContext2D, region: Rect, warpSalt: number, fing: number, seed: number,
  opts: { pebbles?: boolean; cobbles?: boolean; density?: number } = {},
) {
  const rnd = mulberry32(seed >>> 0);
  const pad = 2.2 * T;
  const x0 = region.x - pad, y0 = region.y - pad;
  const w = region.w + pad * 2, h = region.h + pad * 2;
  const density = opts.density ?? 1;
  const n = Math.round((w * h) / 1500 * density);
  const sdAt = (x: number, y: number) => sdRect(x, y, region) + (fbm(x, y, 7, warpSalt) - 0.5) * 2 * fing;
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * w, y = y0 + rnd() * h;
    if (x < 1 || y < 1 || x > WORLD_W - 1 || y > WORLD_H - 1) continue;
    const sd = sdAt(x, y);
    const cluster = fbm(x, y, 12, warpSalt + 5);
    if (sd > 0.15 * T && sd < 2.0 * T) {                 // grass shoulder — thinning tufts
      const p = (1 - sd / (2.0 * T)) * 0.9;
      if (cluster < p && rnd() < 0.6) tuftDraw(g, x, y, rnd, TUFT_G);
      else if (rnd() < 0.28 && sd < 1.4 * T) dabA(g, x, y, 1, 1, BARE_C[(rnd() * 3) | 0]!, 110);
    } else if (sd < 0 && sd > -0.7 * T) {                // survivor tuft on the shoulder
      if (cluster < 0.4 && rnd() < 0.28) tuftDraw(g, x, y, rnd, TUFT_G);
    } else if (opts.pebbles && sd < -6) {                // pebbles + cracks in the bare centre
      if (rnd() < 0.10) { const c = PEBBLE[(rnd() * PEBBLE.length) | 0]!; dabA(g, x, y, 1 + (rnd() < 0.4 ? 1 : 0), 1, c, 235); dabA(g, x, y - 1, 1, 1, [c[0] + 16, c[1] + 16, c[2] + 16], 110); }
      else if (rnd() < 0.03) { const len = 2 + ((rnd() * 4) | 0); for (let k = 0; k < len; k++) dabA(g, x + Math.round(Math.sin(k * 1.3)), y + k, 1, 1, CRACK_C, 150); }
    }
    if (opts.cobbles && sd > 0 && sd < 0.9 * T && fbm(x, y, 10, warpSalt + 8) < 0.5 && rnd() < 0.05) {
      const sz = 2 + ((rnd() * 2) | 0);
      const col: [number, number, number] = [118 - 8 + rnd() * 16, 116 - 8 + rnd() * 16, 106 - 8 + rnd() * 16];
      dabA(g, x - 1, y + sz - 1, sz + 2, 1, [36, 34, 28], 130);       // grout/contact
      dabA(g, x, y, sz, sz - 1, col, 235);
      dabA(g, x, y - 1, sz - 1, 1, [col[0] + 12, col[1] + 12, col[2] + 12], 150);
      if (rnd() < 0.5) dabA(g, x + 1, y + 1, 1, 1, MOSS_C[(rnd() * 3) | 0]!, 150);
    }
  }
}
const MOSS_C: [number, number, number][] = [[63, 90, 44], [74, 106, 52], [51, 72, 31]];

/** Faint twin cart-ruts along each road segment's long axis (over the bare
 *  centre, inside the warped soil boundary). */
function paintRuts(g: CanvasRenderingContext2D) {
  const img = g.getImageData(0, 0, WORLD_W, WORLD_H);
  const d = img.data;
  for (const s of ROAD_SEGMENTS) {
    const horiz = s.w >= s.h;
    for (const f of [0.40, 0.60]) {
      if (horiz) {
        const ry = s.y + s.h * f;
        for (let x = Math.floor(s.x + s.w * 0.08); x < s.x + s.w * 0.92; x++) {
          const sd = sdRect(x, ry, s) + (fbm(x, ry, 7, 3) - 0.5) * 2 * FING;
          if (sd > -6) continue;
          for (let yy = -1; yy <= 1; yy++) { const o = (((ry | 0) + yy) * WORLD_W + x) * 4; const k = yy === 0 ? 0.16 : 0.08; d[o] = d[o]! * (1 - k); d[o + 1] = d[o + 1]! * (1 - k); d[o + 2] = d[o + 2]! * (1 - k); }
        }
      } else {
        const rx = s.x + s.w * f;
        for (let y = Math.floor(s.y + s.h * 0.08); y < s.y + s.h * 0.92; y++) {
          const sd = sdRect(rx, y, s) + (fbm(rx, y, 7, 3) - 0.5) * 2 * FING;
          if (sd > -6) continue;
          for (let xx = -1; xx <= 1; xx++) { const o = (y * WORLD_W + ((rx | 0) + xx)) * 4; const k = xx === 0 ? 0.16 : 0.08; d[o] = d[o]! * (1 - k); d[o + 1] = d[o + 1]! * (1 - k); d[o + 2] = d[o + 2]! * (1 - k); }
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
}

/** Bake all COHESION-1 transition detail (paths, field, plaza edges). */
function paintTransitionScatter(g: CanvasRenderingContext2D) {
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  const farmPath = { x: 12.4 * T, y: 8.6 * T, w: 7.8 * T, h: 1.3 * T };
  const field = { x: FIELD.x0 * T, y: FIELD.y0 * T, w: (FIELD.x1 - FIELD.x0) * T, h: (FIELD.y1 - FIELD.y0) * T };
  const plaza = { x: 59.5 * T, y: 14.5 * T, w: 21 * T, h: 13.5 * T };
  const townPlaza = { x: TOWN_STREET.x, y: TOWN_STREET.y, w: TOWN_STREET.w, h: TOWN_STREET.h };
  paintRuts(g);
  let seed = 91117;
  for (const s of ROAD_SEGMENTS) scatterEdge(g, s, 3, FING, seed++, { pebbles: true });
  scatterEdge(g, farmPath, 3, FING, seed++, { pebbles: true });
  scatterEdge(g, field, 13, FING_FIELD, seed++, { density: 0.7 });
  for (const pz of [plaza, townPlaza]) scatterEdge(g, pz, 23, FING, seed++, { cobbles: true });
  g.imageSmoothingEnabled = prev;
}

// ===========================================================================
//  W2c farm CIRCULATION wear — the scene-grammar fix for "the house stands in
//  featureless dirt with no circulation" (COMPOSITION_RULES rules 9-11). A worn,
//  compacted, dithered-edged dirt trail links the farm's meaningful endpoints:
//  the world/road entry → the farmhouse door (with a widened doorstep apron),
//  a spur to the pond (the farm's water), and — PER MANIFEST — spurs to the barn,
//  the coop, and the garden beds when the chosen path has them. Baked into the
//  ground (re-baked on every New Game via syncFarmManifest, so path switches +
//  legacy all get the right trails). Reuses the scuff dither idea, on a segment.
// ===========================================================================

/** Darken the ground along a segment A→B (a worn trail) or, when A==B, a round
 *  apron — toward compacted warm earth, with a dithered outer edge so it blends
 *  into the yard instead of a hard cut. Reads+writes the ground in place. */
function wearSeg(
  g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number,
  hw: number, strength: number,
) {
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - hw - 2));
  const x1 = Math.min(WORLD_W, Math.ceil(Math.max(ax, bx) + hw + 2));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - hw - 2));
  const y1 = Math.min(WORLD_H, Math.ceil(Math.max(ay, by) + hw + 2));
  if (x1 <= x0 || y1 <= y0) return;
  const img = g.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data, iw = x1 - x0;
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let t = ((x - ax) * dx + (y - ay) * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t, py = ay + dy * t;
    const dist = Math.hypot(x - px, y - py);
    if (dist > hw) continue;
    const fall = 1 - dist / hw;
    let a = strength * fall * fall;
    const nz = scuffNoise(x, y);
    if (fall < 0.55 && nz > fall / 0.55) a = 0;   // dither the outer edge
    if (a <= 0) continue;
    const i = ((y - y0) * iw + (x - x0)) * 4;
    d[i]     = d[i]     * (1 - a) + 96 * a;         // COHESION-1(E): lightened worn track (was dark 60,47,31)
    d[i + 1] = d[i + 1] * (1 - a) + 84 * a;
    d[i + 2] = d[i + 2] * (1 - a) + 58 * a;
  }
  g.putImageData(img, x0, y0);
}
const wearApron = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, s: number) =>
  wearSeg(g, cx, cy, cx, cy, r, s);

/** Bake the farm's worn circulation into the ground (manifest-driven). */
function paintFarmWear(g: CanvasRenderingContext2D, m: FarmManifest) {
  const doorX = HOUSE.x + HOUSE.w * 0.5, doorY = HOUSE.y + HOUSE.h;   // farmhouse door foot
  const yardSx = 11 * T, yardSy = 14.5 * T;                            // yard's south "you walk in here"
  // main trail: world/road entry → yard → doorstep, + a stub reaching toward the road
  wearSeg(g, 13 * T, 19.4 * T, yardSx, yardSy, 0.55 * T, 0.34);
  wearSeg(g, yardSx, yardSy, doorX, doorY, 0.62 * T, 0.42);
  wearApron(g, doorX, doorY + 4, 1.35 * T, 0.5);                       // widened doorstep apron
  // spur to the pond (the farm's water source)
  wearSeg(g, doorX, 13.5 * T, POND.cx, POND.cy - POND.ry - 6, 0.5 * T, 0.3);
  wearApron(g, POND.cx, POND.cy - POND.ry - 4, 0.9 * T, 0.3);
  // --- manifest-driven spurs (no path to a structure the farm doesn't have) ---
  if (m.barn) {
    const bx = BARN.x + BARN.w * 0.5, by = BARN.y + BARN.h;
    wearSeg(g, 11.6 * T, 9.1 * T, bx, 9.3 * T, 0.55 * T, 0.36);
    wearSeg(g, bx, 9.3 * T, bx, by, 0.6 * T, 0.4);
    wearApron(g, bx, by + 2, 1.3 * T, 0.46);
  }
  if (m.coop) {
    const cx = COOP.x + COOP.w * 0.5, cy = COOP.y + COOP.h;
    wearSeg(g, 11.6 * T, 9.4 * T, cx, cy, 0.5 * T, 0.34);
    wearApron(g, cx, cy + 1, 0.95 * T, 0.4);
  }
  if (m.beds > 0) {
    for (let i = 0; i < Math.min(m.beds, FLOWER_BEDS.length); i++) {
      const [bx, by] = FLOWER_BEDS[i]!;
      wearApron(g, bx, by + 6, 0.7 * T, 0.28);
    }
  }
}

export function paintGround(manifest: FarmManifest): HTMLCanvasElement {
  const ground = document.createElement("canvas");
  ground.width = WORLD_W; ground.height = WORLD_H;
  const g = ground.getContext("2d")!;
  g.imageSmoothingEnabled = false;

  lastTiled = paintTerrainTiles(g);
  if (lastTiled) {
    // Small organic decorations (stones, leaves, wildflowers, forest litter)
    // stay code-drawn on TOP of the tiles — they break up any tile repetition
    // and add life; their rejection zones keep them off water/plaza/paths.
    paintTransitionScatter(g);   // COHESION-1(C): worn-path/plaza edge detail
    scatterAmbientProps(g);
    paintBuildingGrounding(g);
    paintFarmWear(g, manifest);
    paintNatureGrounding(g);     // COHESION-1(A): worn ground under trees/rocks/bushes
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

  // ---- the farm ----
  // W2c: no all-dirt yard here either (see the tiled path) — the farmstead sits
  // on the grass painted above; paintFarmWear + scuffOne supply the dirt paths
  // and building rings. Only the house↔field farm path stays baked dirt.
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
  paintBuildingGrounding(g);
  paintFarmWear(g, manifest);
  paintNatureGrounding(g);       // COHESION-1(A): dual-path — worn ground under nature
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

/** Places a single hard-edged pixel block at ROUNDED integer coordinates —
 *  the shared primitive every scatter prop below is built from (UO-mood pixel
 *  restyle: no ellipses/arcs/curves/rotation in ambient props, just fillRect
 *  blocks in 1-2px units so everything reads as pixel art on the pixel tiles). */
function pxDot(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), w, h);
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

  // small stones: a pixel cluster with one lighter top-facet block
  for (let i = 0; i < 27 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    const c = ["#6c6059", "#5b5e64", "#73624f"][(rnd() * 3) | 0]!;
    pxDot(g, x - 1, y - 1, 3, 2, c);
    pxDot(g, x + 1, y, 2, 2, c);
    if (rnd() < 0.5) pxDot(g, x + 3, y + 1, 2, 2, ["#6c6059", "#4a4d52"][(rnd() * 2) | 0]!);
    pxDot(g, x - 1, y - 2, 2, 1, "#8a857a");   // top facet highlight (no pure white)
  }
  // fallen leaves: 1-2px pixel blades with a 1px darker midrib (denser in the forest)
  for (let i = 0; i < 36 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    const forest = regionAt(x, y) === "forest";
    const c = forest
      ? ["#4a6a34", "#303f24", "#66693b"][(rnd() * 3) | 0]!
      : ["#6a543a", "#8a7a3a", "#9a8a4a"][(rnd() * 3) | 0]!;
    pxDot(g, x - 1, y - 1, 2, 2, c);
    pxDot(g, x + (rnd() < 0.5 ? -2 : 1), y, 1, 1, c);
    pxDot(g, x, y - 1, 1, 2, "#3a2c1c");   // midrib
  }
  // mushrooms — concentrated toward the forest, the odd one elsewhere
  for (let i = 0; i < 20 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest" && rnd() < 0.7) continue;   // mostly forest
    pxDot(g, x - 1, y - 2, 2, 3, "#b0a488");   // stem (bone, not white)
    const cap = rnd() < 0.5 ? "#7a4a3a" : "#8a6a4a";
    pxDot(g, x - 2, y - 4, 4, 2, cap);
    pxDot(g, x - 1, y - 5, 2, 1, cap);
    pxDot(g, x - 1, y - 4, 1, 1, "#9a8f78");   // tiny spot (muted, not bright white)
  }

  // ---- content-library commit 1: ~18 more kinds, region-appropriate, same
  // deterministic-seed + rejection-zone technique as the three kinds above ----

  // logs: a fallen trunk section — axis-aligned pixel blocks (no rotation, so
  // no anti-aliased edge), a mossy patch on top, one lighter end-cap facet
  for (let i = 0; i < 7 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest" && rnd() < 0.65) continue;
    const c = rnd() < 0.5 ? "#4a3d29" : "#6a543a";
    if (rnd() < 0.5) {
      pxDot(g, x - 9, y - 1, 18, 3, c);
      pxDot(g, x - 9, y - 2, 18, 1, "#2e261d");
      pxDot(g, x - 9, y - 1, 3, 3, "#8a7a3a");   // end-cap facet
      pxDot(g, x + 1, y, 3, 1, "#4a6a34");        // moss patch
    } else {
      pxDot(g, x - 1, y - 9, 3, 18, c);
      pxDot(g, x - 2, y - 9, 1, 18, "#2e261d");
      pxDot(g, x - 1, y - 9, 3, 3, "#8a7a3a");
      pxDot(g, x, y + 1, 1, 3, "#4a6a34");
    }
  }
  // stumps: a blocky cut trunk with a lighter cut-top facet and an inner ring
  for (let i = 0; i < 5 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest" && rnd() < 0.75) continue;
    pxDot(g, x - 3, y - 3, 6, 6, "#4a3d29");
    pxDot(g, x - 2, y - 2, 4, 4, "#9a8a4a");
    pxDot(g, x - 1, y - 1, 2, 2, "#6a543a");
  }
  // twigs: a couple of crossed fallen branches — two short pixel bars
  for (let i = 0; i < 16 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "market") continue;
    pxDot(g, x - 4, y, 8, 1, "#4a3d29");
    pxDot(g, x - 1, y - 3, 1, 6, "#2e261d");
  }
  // weed tufts: taller, scraggly, seed-headed grass clumps — 1px-wide pixel
  // blade columns (distinct from the baked ground-texture blades — a
  // sparser, coarser accent)
  for (let i = 0; i < 26 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || onPlaza(x, y)) continue;
    const dry = rnd() < 0.5 ? "#8a7a3a" : "#9a8a4a";
    for (let b = 0; b < 3; b++) {
      const lean = (b - 1) * 2;
      const h = 5 + ((rnd() * 3) | 0);
      pxDot(g, x + lean, y - h, 1, h, dry);
      pxDot(g, x + lean, y - h - 1, 1, 1, "#7a6a30");   // seed head
    }
  }
  // clover patches: low three-leaf clusters, the odd tiny muted bloom
  for (let i = 0; i < 22 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || onPlaza(x, y)) continue;
    const c = rnd() < 0.5 ? "#4a6a34" : "#3f5a3a";
    pxDot(g, x - 2, y - 1, 2, 2, c);
    pxDot(g, x + 1, y - 1, 2, 2, c);
    pxDot(g, x - 1, y + 1, 2, 2, c);
    if (rnd() < 0.25) pxDot(g, x - 1, y - 4, 1, 1, "#a8a08c");   // bone bloom, not white
  }
  // pebble clusters: a tight group of many tiny pixel pebbles (distinct from
  // the larger faceted stone-pair painter above)
  for (let i = 0; i < 17 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    for (let n = 0; n < 5; n++) {
      const px = x + (rnd() - 0.5) * 8, py = y + (rnd() - 0.5) * 5;
      const c = ["#6c6059", "#5b5e64", "#73624f", "#4a4d52"][(rnd() * 4) | 0]!;
      pxDot(g, px, py, 1 + ((rnd() * 2) | 0), 1, c);
    }
  }
  // daisies / poppies / bluebells / dandelions: small muted wildflowers
  // through the grass, thicker along the road/market edges
  for (let i = 0; i < 30 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (onPlaza(x, y)) continue;
    if (regionAt(x, y) === "forest" && rnd() < 0.7) continue;
    const kind = rnd();
    if (kind < 0.3) drawTinyFlower(g, x, y, rnd, 4, "#a8a08c", 2.6, "#7a6a30");         // bone daisy
    else if (kind < 0.55) drawTinyFlower(g, x, y, rnd, 4, "#7e5150", 3, "#7a6a30");     // dusty-rose poppy
    else if (kind < 0.8) drawBluebell(g, x, y, rnd);
    else drawDandelion(g, x, y, rnd);
  }
  // thistle: a spiky muted-plum tuft, road/farm edges
  for (let i = 0; i < 9 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || onPlaza(x, y)) continue;
    pxDot(g, x, y - 6, 1, 6, "#3f5a3a");
    pxDot(g, x - 2, y - 7, 1, 1, "#3f5a3a");
    pxDot(g, x + 2, y - 7, 1, 1, "#3f5a3a");
    pxDot(g, x - 1, y - 9, 3, 2, "#6a5a70");
    pxDot(g, x, y - 10, 1, 1, "#6a5a70");
  }
  // wildflower clumps: a mixed 3-stem cluster, dense along the market square
  for (let i = 0; i < 13 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    // (was biased toward the market square; now the square is paved cobble, so
    // clumps just avoid the cobble and land on the surrounding grass instead)
    if (onPlaza(x, y)) continue;
    const colors = ["#7e5150", "#9a8a4a", "#6a5a70", "#a8a08c"];
    for (const [ox, oy] of [[-4, 1], [3, -1], [0, 2]] as const) {
      drawTinyFlower(g, x + ox, y + oy, rnd, 4, colors[(rnd() * colors.length) | 0]!, 2.2, "#7a6a30");
    }
  }
  // pinecones + ferns + acorns + moss patches: forest-floor accents
  for (let i = 0; i < 14 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) !== "forest") continue;
    const kind = rnd();
    if (kind < 0.3) drawPinecone(g, x, y, rnd);
    else if (kind < 0.6) drawFern(g, x, y, rnd);
    else if (kind < 0.8) drawAcorn(g, x, y);
    else {
      const c = rnd() < 0.5 ? "#4a6a34" : "#303f24";
      pxDot(g, x - 3, y - 1, 3, 2, c);
      pxDot(g, x, y - 2, 3, 2, c);
      pxDot(g, x - 1, y, 3, 2, c);
    }
  }
  // hay wisps: loose straw strands, farm/road only
  for (let i = 0; i < 12 * AREA_K; i++) {
    const p = spot(); if (!p) continue;
    const [x, y] = p;
    if (regionAt(x, y) === "forest" || regionAt(x, y) === "market") continue;
    const c = rnd() < 0.5 ? "#8a7a3a" : "#9a8a4a";
    pxDot(g, x - 3, y - 5, 1, 5, c);
    pxDot(g, x, y - 6, 1, 6, c);
    pxDot(g, x + 3, y - 4, 1, 4, c);
    pxDot(g, x - 2, y - 1, 4, 1, "#6f6230");
  }
  scatterWaterEdgeDecor(g, rnd);
}

/** Shared tiny-wildflower painter: 1px stem + a small pixel-block petal
 *  cluster + a center dot. Used by daisies/poppies/wildflower clumps above.
 *  Pixel-block style (no ellipse petals) — size scales with the old petalR. */
function drawTinyFlower(
  g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number,
  petals: number, petalColor: string, petalR: number, centerColor: string,
) {
  const s = petalR >= 2.8 ? 2 : 1;
  pxDot(g, x, y - 2, 1, 3, "#4a6a34");   // stem
  const offs: Array<[number, number]> = [[-s, -s - 1], [s, -s - 1], [-s, 1 - s], [s, 1 - s]];
  const n = Math.min(petals, offs.length);
  for (let p = 0; p < n; p++) {
    const [ox, oy] = offs[p]!;
    pxDot(g, x + ox, y - 2 + oy, s, s, petalColor);
  }
  pxDot(g, x, y - 2, 1, 1, centerColor);
}

/** Bluebell: 2-3 drooping bell-shaped blooms off one stem (forest-leaning),
 *  built from small dull-blue-grey pixel blocks along a leaning stem. */
function drawBluebell(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  const lean = rnd() < 0.5 ? -1 : 1;
  pxDot(g, x, y - 5, 1, 5, "#4a6a34");
  pxDot(g, x - 2 + lean, y - 6, 2, 2, "#5a6270");
  pxDot(g, x + 1 + lean, y - 7, 2, 2, "#5a6270");
  pxDot(g, x - 1 + lean, y - 8, 2, 2, "#5a6270");
}

/** Dandelion: either a faded-gold bloom or a bone-toned seed-head puff
 *  (never bright white), stacked pixel blocks on a 1px stem. */
function drawDandelion(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  pxDot(g, x, y - 4, 1, 4, "#4a6a34");
  if (rnd() < 0.5) {
    pxDot(g, x - 1, y - 6, 3, 3, "#9a8a4a");
    pxDot(g, x, y - 6, 1, 1, "#7a6a30");
  } else {
    pxDot(g, x - 1, y - 6, 3, 3, "#a8a08c");
    pxDot(g, x - 2, y - 5, 1, 1, "#a8a08c");
    pxDot(g, x + 2, y - 5, 1, 1, "#a8a08c");
  }
}

/** Pinecone: a small vertical bark-brown pixel body with lighter scale dots
 *  (axis-aligned, no rotation). */
function drawPinecone(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  pxDot(g, x - 1, y - 4, 2, 8, "#4a3d29");
  pxDot(g, x - 1, y - 3, 1, 1, "#6a543a");
  pxDot(g, x, y - 1, 1, 1, "#6a543a");
  pxDot(g, x - 1, y + 1, 1, 1, "#6a543a");
  if (rnd() < 0.5) pxDot(g, x, y - 4, 1, 1, "#3a2c1c");
}

/** Fern: a 1px stalk with stair-stepped leaflet pixel blocks alternating
 *  either side (axis-aligned, no rotation). */
function drawFern(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  const h = 8 + ((rnd() * 3) | 0);
  pxDot(g, x, y - h, 1, h, "#3f5a3a");
  for (let i = 0; i < 4; i++) {
    const fy = y - h + i * 2 + 1;
    pxDot(g, x - 3, fy, 2, 1, "#3f5a3a");
    pxDot(g, x + 1, fy, 2, 1, "#4a6a34");
  }
}

/** Acorn: a tiny pixel-block nut with a darker cap. */
function drawAcorn(g: CanvasRenderingContext2D, x: number, y: number) {
  pxDot(g, x - 1, y - 1, 2, 3, "#8a6a4a");
  pxDot(g, x - 1, y - 3, 2, 2, "#4a3d29");
  pxDot(g, x - 2, y - 3, 1, 1, "#2e261d");
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
  // COHESION-1(D): reeds/rocks in a few tight CLUSTERS along the shore (not an
  // even fringe) — each cluster with reeds pushed into the wet bank, a couple of
  // wet rocks at the waterline, bank grass tufts fanning back, and pebbles.
  for (const wtr of [RIVER, LAKE]) {
    const perim = 2 * (wtr.w + wtr.h);
    const clusters = Math.max(3, Math.round(perim / (16 * T) * AREA_K));
    for (let c = 0; c < clusters; c++) {
      const side = rnd() * 4 | 0;
      let bx: number, by: number, nx: number, ny: number;   // shore point + outward (bank) normal
      if (side === 0) { bx = wtr.x + rnd() * wtr.w; by = wtr.y; nx = 0; ny = -1; }
      else if (side === 1) { bx = wtr.x + rnd() * wtr.w; by = wtr.y + wtr.h; nx = 0; ny = 1; }
      else if (side === 2) { bx = wtr.x; by = wtr.y + rnd() * wtr.h; nx = -1; ny = 0; }
      else { bx = wtr.x + wtr.w; by = wtr.y + rnd() * wtr.h; nx = 1; ny = 0; }
      const along = (span: number) => (rnd() - 0.5) * span;                  // spread ALONG the shore
      const at = (aSpan: number, into: number): [number, number] => {
        const s = along(aSpan);
        return [bx + (ny !== 0 ? s : 0) + nx * into, by + (nx !== 0 ? s : 0) + ny * into];
      };
      const cnt = 2 + (rnd() * 4 | 0);                                       // reeds pushed into the bank
      for (let k = 0; k < cnt; k++) { const [ax, ay] = at(3 * T, 4 + rnd() * 9); if (rnd() < 0.55) drawReedClump(g, ax, ay, rnd); else drawCattail(g, ax, ay); }
      if (rnd() < 0.75) for (let k = 0; k < 1 + (rnd() * 2 | 0); k++) { const [rx, ry] = at(2 * T, rnd() * 3); drawWetRock(g, rx, ry, rnd); }
      for (let k = 0; k < 5; k++) { const [gx, gy] = at(3 * T, 6 + rnd() * 14); tuftDraw(g, gx, gy, rnd, TUFT_G); }
      for (let k = 0; k < 4; k++) { const [px, py] = at(3 * T, rnd() * 3); dabA(g, px, py, 1 + (rnd() < 0.3 ? 1 : 0), 1, PEBBLE[(rnd() * PEBBLE.length) | 0]!, 200); }
    }
  }
  // lily pads at the LAKE's still-water edge (river excluded — it flows)
  {
    const n = Math.round(6 * AREA_K * 0.65);
    for (let i = 0; i < n; i++) {
      const px = LAKE.x + 10 + rnd() * Math.max(4, LAKE.w - 20), py = LAKE.y + 10 + rnd() * Math.max(4, LAKE.h - 20);
      drawLilyPad(g, px, py, rnd);
    }
  }
  // ...and the pond (an ELLIPSE, not a rect — sample within it by angle/radius
  // so pads never land past the shoreline into the surrounding grass).
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2, r = 0.25 + rnd() * 0.55;
    drawLilyPad(g, POND.cx + Math.cos(a) * POND.rx * r, POND.cy + Math.sin(a) * POND.ry * r, rnd);
  }
  // shells: bone-toned pixel shapes on the LAKE shore specifically
  for (let i = 0; i < 7; i++) {
    const bx = LAKE.x - 6 + rnd() * (LAKE.w + 12), by = LAKE.y + LAKE.h + 4 + rnd() * 8;
    pxDot(g, bx - 2, by - 1, 4, 2, "#a89a80");
    pxDot(g, bx - 1, by - 2, 2, 1, "#a89a80");
  }
}

/** A small wet shore rock: grey pixel block, a darker waterline base + lighter
 *  top facet, an odd moss dab — the baked cousin of the boulder sprites. */
function drawWetRock(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  const w = 3 + ((rnd() * 3) | 0), h = 2 + ((rnd() * 2) | 0);
  dabA(g, x - w / 2, y - h, w, h, [92, 96, 102], 255);
  dabA(g, x - w / 2, y - 1, w, 1, [52, 54, 58], 210);           // wet base
  dabA(g, x - w / 2, y - h, Math.max(1, w - 1), 1, [128, 130, 134], 200);
  if (rnd() < 0.5) dabA(g, x - w / 2 + 1, y - h + 1, 1, 1, MOSS_C[(rnd() * 3) | 0]!, 170);
}

/** Lily pad: a flat green pixel-block disc with a lighter center facet. */
function drawLilyPad(g: CanvasRenderingContext2D, px: number, py: number, rnd: () => number) {
  const s = 4 + ((rnd() * 2) | 0);
  pxDot(g, px - s, py - s, s * 2, s * 2, "#3a5a3a");
  pxDot(g, px - 1, py - 1, 2, 2, "#47694a");
}

/** Cattail: a brown pixel-block seed head on a thin 1px green stem. */
function drawCattail(g: CanvasRenderingContext2D, x: number, y: number) {
  pxDot(g, x, y - 12, 1, 12, "#3f5a3a");
  pxDot(g, x - 1, y - 13, 2, 5, "#4a3a24");
}

/** Reed clump: 3-4 tall thin 1px-wide pixel blades fanning from a base
 *  (axis-aligned columns, offset per blade instead of a curved fan). */
function drawReedClump(g: CanvasRenderingContext2D, x: number, y: number, rnd: () => number) {
  for (let b = 0; b < 4; b++) {
    const lean = Math.round((b - 1.5) * 2);
    const h = 8 + ((rnd() * 5) | 0);
    pxDot(g, x + lean, y - h, 1, h, "#3f5a3a");
  }
}
