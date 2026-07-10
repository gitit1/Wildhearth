/**
 * Ambient foliage scatter (foliage + props batch) — a deterministic, position-
 * seeded sprinkle of small foliage sprites (grass tufts, the odd wildflower or
 * fern, forest mushrooms/moss, shore reeds + lake lily-pads) across the world's
 * appropriate zones. It needs NO hand placement: a fixed grid is sampled once at
 * boot, each cell seeded from its own coordinates so the layout is identical
 * every run/frame. Every item is NON-colliding and depth-sorted (main.ts pushes
 * each into the entity list at its own y). Zone rules keep it natural — reeds
 * only at water edges, mushrooms/moss only in the forest, flowers biased toward
 * the farm — and it stays OFF paths, tilled soil, building footprints, the dock
 * and interaction spots. DUAL-PATH: a missing sprite simply doesn't draw (the
 * item is skipped at draw time), so the whole system is inert with zero PNGs.
 */
import {
  T, WORLD_W, WORLD_H, FOLIAGE_SCATTER_DENSITY, FOLIAGE_SCATTER_GRID,
  SPRITE_SCATTER_SCALE, SPRITE_SCATTER_JITTER,
} from "../config";
import { mulberry32 } from "../engine/rng";
import { sprite, spriteBaseAnchor } from "./sprites";
import {
  regionAt, onRoad, inWater, fieldBounds, HOUSE, BARN, STALL, OUTHOUSE, WELL, DOCK,
  STRUCTURES, HOUSE_DOOR, FLOWER_BEDS, BUSK_SPOT, FISH_SPOTS, WORLD_TREES, WORLD_PROPS, POND,
  type Rect,
} from "../world/zones";

export interface ScatterItem { x: number; y: number; id: string; scale: number; flip: boolean }

function inRect(x: number, y: number, r: Rect, pad = 0): boolean {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}

/** Inside the farm pond ellipse (collision.ts uses the same shape). */
function inPond(x: number, y: number): boolean {
  const dx = (x - POND.cx) / POND.rx, dy = (y - POND.cy) / POND.ry;
  return dx * dx + dy * dy < 1;
}
function isWater(x: number, y: number): boolean { return inWater(x, y) || inPond(x, y); }

/** True when a LAND point has water within ~one tile (a shore point — reeds). */
function nearWater(x: number, y: number): boolean {
  const d = 30;
  return isWater(x + d, y) || isWater(x - d, y) || isWater(x, y + d) || isWater(x, y - d);
}

/** True when a WATER point has LAND within ~one tile (the shore ring — the only
 *  place a lily-pad sits, never mid-lake). */
function waterEdge(x: number, y: number): boolean {
  const d = 34;
  return !isWater(x + d, y) || !isWater(x - d, y) || !isWater(x, y + d) || !isWater(x, y - d);
}

/** Points the scatter must keep clear of (interaction spots + fishing points). */
function nearInteraction(x: number, y: number): boolean {
  const door = { x: HOUSE_DOOR.x + HOUSE_DOOR.w / 2, y: HOUSE_DOOR.y + HOUSE_DOOR.h };
  const pts: Array<[number, number]> = [
    [door.x, door.y], BUSK_SPOT,
    ...FLOWER_BEDS,
    ...FISH_SPOTS.flatMap((s) => [[s.ax, s.ay], [s.wx, s.wy]] as Array<[number, number]>),
  ];
  for (const [px, py] of pts) if ((x - px) ** 2 + (y - py) ** 2 < 26 * 26) return true;
  return false;
}

/** Land points where a scatter item must NOT sit (paths / soil / footprints /
 *  the dock / interaction spots / on top of a tree trunk or an existing prop). */
function blockedLand(x: number, y: number): boolean {
  if (x < T * 1.5 || y < T * 1.5 || x > WORLD_W - T * 1.5 || y > WORLD_H - T * 1.5) return true;
  const fb = fieldBounds(2);   // keep out of the (max-expansion) tilled field
  if (x > fb.x0 * T - 6 && x < fb.x1 * T + 6 && y > fb.y0 * T - 6 && y < fb.y1 * T + 6) return true;
  if (onRoad(x, y)) return true;
  for (const b of [HOUSE, BARN, STALL, OUTHOUSE, ...STRUCTURES]) if (inRect(x, y, b, 10)) return true;
  if (inRect(x, y, DOCK, 12)) return true;
  if ((x - WELL.cx) ** 2 + (y - WELL.cy) ** 2 < (WELL.r + 14) ** 2) return true;
  if (nearInteraction(x, y)) return true;
  for (const [tx, ty] of WORLD_TREES) if ((x - tx) ** 2 + (y - ty) ** 2 < 20 * 20) return true;
  for (const p of WORLD_PROPS) if ((x - p.x) ** 2 + (y - p.y) ** 2 < 22 * 22) return true;
  return false;
}

const FLOWERS = ["foliage/flowers-red", "foliage/flowers-yellow", "foliage/flowers-purple", "foliage/flowers-mixed"] as const;

/** Pick the sprite id appropriate for this point, or null to place nothing. */
function pickKind(x: number, y: number, roll: number, flowerRoll: number): string | null {
  // water: a sparse lily-pad, but only near the shore (never mid-lake)
  if (isWater(x, y)) {
    if (inRect(x, y, DOCK, 14)) return null;
    return waterEdge(x, y) && roll < 0.5 ? "foliage/lily-pad" : null;
  }
  // shore band: reeds (and a little grass) fringing the water
  if (nearWater(x, y)) return roll < 0.75 ? "foliage/reeds" : "foliage/grass-tuft";
  // land, by region
  const region = regionAt(x, y);
  if (region === "forest") {
    return roll < 0.30 ? "foliage/mushrooms"
      : roll < 0.55 ? "foliage/fern"
      : roll < 0.72 ? "foliage/mossy-rock"
      : "foliage/grass-tuft";
  }
  if (region === "farm") {
    return roll < 0.62 ? "foliage/grass-tuft"
      : roll < 0.78 ? "foliage/fern"
      : FLOWERS[(flowerRoll * FLOWERS.length) | 0]!;   // ~22% flowers near the farm
  }
  // market / road / river-bank grass — grass with the occasional flower/fern
  return roll < 0.82 ? "foliage/grass-tuft"
    : roll < 0.90 ? "foliage/fern"
    : FLOWERS[(flowerRoll * FLOWERS.length) | 0]!;
}

/**
 * Build the (deterministic) scatter list once. Samples a fixed grid over the
 * world; each cell rolls FOLIAGE_SCATTER_DENSITY to spawn, then jitters within
 * the cell, chooses a zone-appropriate sprite, and validates the exclusions.
 */
export function buildFoliageScatter(): ScatterItem[] {
  const items: ScatterItem[] = [];
  const step = FOLIAGE_SCATTER_GRID;
  for (let gy = step; gy < WORLD_H; gy += step) {
    for (let gx = step; gx < WORLD_W; gx += step) {
      const rnd = mulberry32(((gx * 73856093) ^ (gy * 19349663)) | 0);
      if (rnd() > FOLIAGE_SCATTER_DENSITY) continue;
      const x = gx + (rnd() - 0.5) * step * 0.8;
      const y = gy + (rnd() - 0.5) * step * 0.8;
      const kindRoll = rnd(), flowerRoll = rnd();
      const id = pickKind(x, y, kindRoll, flowerRoll);
      if (!id) continue;
      if (!isWater(x, y) && blockedLand(x, y)) continue;
      const flip = rnd() < 0.5;
      const scale = SPRITE_SCATTER_SCALE * (1 - SPRITE_SCATTER_JITTER + rnd() * SPRITE_SCATTER_JITTER * 2);
      items.push({ x, y, id, scale, flip });
    }
  }
  return items;
}

/** Draw one scatter item base-on-ground on its (x,y), with its per-item flip +
 *  scale. No sprite -> draws nothing (dual-path). Nearest-neighbour, no shadow
 *  (tiny ground foliage — a shadow per tuft would only clutter). */
export function drawScatterItem(g: CanvasRenderingContext2D, it: ScatterItem) {
  const img = sprite(it.id);
  if (!img) return;
  const a = spriteBaseAnchor(it.id, img);
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.save();
  g.translate(it.x, it.y);
  g.scale(it.scale * (it.flip ? -1 : 1), it.scale);
  g.drawImage(img, -a.cx, -a.foot, img.naturalWidth, img.naturalHeight);
  g.restore();
  g.imageSmoothingEnabled = prev;
}
