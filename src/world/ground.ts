import { T, WORLD_W, WORLD_H } from "../config";
import {
  FIELD, YARD, POND, HOUSE, BARN, COOP, STALL, BUSHES, FLOWER_BEDS, BUSK_SPOT, TOWN_BUSK_SPOT, OLD_BUSK_SIGN,
  fieldBounds, PLOT_EXPANSIONS,
  ROAD_SEGMENTS, RIVER, LAKE, DOCK, WELL, STRUCTURES, HEDGES, MARKET_STALLS, COTTAGES,
  FOREST_BUSHES, WORLD_TREES, regionAt, onRoad, inWater, type Rect,
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

  const img = g.getImageData(0, 0, WORLD_W, WORLD_H);
  const out = img.data;

  const texel = (sbuf: Uint8ClampedArray, x: number, y: number, ch: 0 | 1 | 2): number =>
    sbuf[(((y & 31) * T + (x & 31)) << 2) + ch]!;

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

      // --- SOIL: roads + farmyard + farm path (dithered edges into grass) ---
      let sa = 0;
      for (const rr of soilRegions) {
        const e = rectInsetTiles(x, y, rr);
        const a = e > 0.5 ? 1 : e > -1 ? (e + 1) / 1.5 : 0;
        if (a > sa) sa = a;
      }
      if (sa > 0 && (sa >= 1 || sa > thr)) {
        const si = pickTile(SOIL_PATH_BAG, cx, cy, 2);
        const sb = buf.soil![si]!;
        r = texel(sb, x, y, 0); gg = texel(sb, x, y, 1); b = texel(sb, x, y, 2);
      }

      // --- TILLED field: furrowed soil with a soft ragged edge ---
      {
        const e = rectInsetTiles(x, y, field);
        const a = e > 0.35 ? 1 : e > -0.8 ? (e + 0.8) / 1.15 : 0;
        if (a > 0 && (a >= 1 || a > thr)) {
          const ti = pickTile(SOIL_TILLED_BAG, cx, cy, 4);
          const tb = buf.soil![ti]!;
          r = texel(tb, x, y, 0); gg = texel(tb, x, y, 1); b = texel(tb, x, y, 2);
        }
      }

      // --- PLAZA: warm-grey cobble across the market square AND the town street ---
      for (const pz of [plaza, townPlaza]) {
        const e = rectInsetTiles(x, y, pz);
        const a = e > 0.5 ? 1 : e > -1.1 ? (e + 1.1) / 1.6 : 0;
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

/** Blend the ground under one building base toward compacted earth, edge
 *  dithered. Reads + writes the ground canvas in place (samples local terrain). */
function scuffOne(g: CanvasRenderingContext2D, f: FootPrint) {
  const rxC = f.halfW * 1.06, ryC = Math.max(7, f.halfW * 0.34);   // dark contact
  const rxW = f.halfW * 1.4,  ryW = Math.max(10, f.halfW * 0.6);   // warm worn ring
  const rx = f.worn ? rxW : rxC, ry = f.worn ? ryW : ryC;
  const cx = f.cx, cy = f.cy - ry * 0.15;
  const x0 = Math.max(0, Math.floor(cx - rx - 2)), x1 = Math.min(WORLD_W, Math.ceil(cx + rx + 2));
  const y0 = Math.max(0, Math.floor(cy - ry - 2)), y1 = Math.min(WORLD_H, Math.ceil(cy + ry + 2));
  if (x1 <= x0 || y1 <= y0) return;
  const img = g.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data, iw = x1 - x0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = ((y - y0) * iw + (x - x0)) * 4;
    const nz = scuffNoise(x, y);
    if (f.worn) {                                   // warm worn-dirt ring (farm)
      const nxW = (x - cx) / rxW, nyW = (y - cy) / ryW;
      const dW = Math.sqrt(nxW * nxW + nyW * nyW);
      if (dW < 1) {
        const fall = 1 - dW;
        let a = 0.42 * fall * fall;
        if (fall < 0.42 && nz > fall / 0.42) a = 0; // dither the outer boundary
        if (a > 0) {
          d[i]     = d[i]     * (1 - a) + 74 * a;
          d[i + 1] = d[i + 1] * (1 - a) + 58 * a;
          d[i + 2] = d[i + 2] * (1 - a) + 38 * a;
        }
      }
    }
    const nxC = (x - cx) / rxC, nyC = (y - cy) / ryC;   // dark contact compression
    const dC = Math.sqrt(nxC * nxC + nyC * nyC);
    if (dC < 1) {
      const fall = 1 - dC;
      let a = 0.4 * fall * fall;
      if (fall < 0.5 && nz > fall / 0.5) a = 0;
      if (a > 0) {
        d[i]     = d[i]     * (1 - a) + 26 * a;
        d[i + 1] = d[i + 1] * (1 - a) + 20 * a;
        d[i + 2] = d[i + 2] * (1 - a) + 13 * a;
      }
    }
  }
  g.putImageData(img, x0, y0);
}

/** Bake every building's base-blend decal into the ground canvas. */
function paintBuildingGrounding(g: CanvasRenderingContext2D) {
  for (const f of buildingFootprints()) scuffOne(g, f);
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
    d[i]     = d[i]     * (1 - a) + 60 * a;        // compacted warm earth
    d[i + 1] = d[i + 1] * (1 - a) + 47 * a;
    d[i + 2] = d[i + 2] * (1 - a) + 31 * a;
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
    scatterAmbientProps(g);
    paintBuildingGrounding(g);
    paintFarmWear(g, manifest);
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
  for (const wtr of [RIVER, LAKE]) {
    const n = Math.round((2 * (wtr.w + wtr.h) / 70) * AREA_K * 0.65);
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
