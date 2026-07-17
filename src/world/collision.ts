import { T, WORLD_W, WORLD_H } from "../config";
import {
  HOUSE, BARN, COOP, STALL, POND, WORLD_TREES, ROOM,
  STRUCTURES, HEDGES, WELL, OUTHOUSE, PROP_BLOCKERS, inWater,
} from "./zones";
import {
  HOME_FURNITURE, DIVIDER_SEGMENTS, WALL, furnitureBlocker,
} from "./furniture";
import { type FarmManifest, LEGACY_FARM_MANIFEST } from "../data/farmStart";

/** Which collision map is active (world vs. the house interior). Module-level
 *  like camera.ts's lastCam — main.ts sets it on every scene switch. */
export type Scene = "world" | "interior";
let activeScene: Scene = "world";
export function setCollisionScene(s: Scene) { activeScene = s; }

// FARM-START-1: which farm structures physically exist (path-driven). main.ts
// syncs this from farm.manifest on boot + every New Game, exactly like
// setCollisionScene — so the barn/coop/established-prop blockers only collide
// when the farm actually has them. Defaults to LEGACY (barn + props) so a load
// before the first sync never lets the player walk through a legacy barn.
let farmManifest: FarmManifest = LEGACY_FARM_MANIFEST;
export function setFarmCollisionManifest(m: FarmManifest) { farmManifest = m; }

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }, pad = 0): boolean {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}

// HOME-1: interior blockers derived ONCE from the furniture instances (per-kind
// footprint rules in world/furniture.ts) — the source of truth. A future
// save-backed layout that swaps HOME_FURNITURE re-derives these for free.
const FURNITURE_BLOCKERS = HOME_FURNITURE
  .map((f) => furnitureBlocker(f))
  .filter((r): r is NonNullable<typeof r> => r !== null);

/** Interior: the cottage's outer walls (the north band is deep — the mount
 *  wall), the internal divider (with its walkable doorway gap), and the solid
 *  furniture — all generated from the furniture/architecture data. */
function blockedInterior(x: number, y: number): boolean {
  // outer walls: deep north mount band, thin west/east/south strips
  if (x < WALL.side || x > ROOM.w - WALL.side || y < WALL.north || y > ROOM.h - WALL.south) return true;
  // the internal divider (its two solid segments; the gap between is walkable)
  for (const d of DIVIDER_SEGMENTS) if (inRect(x, y, d)) return true;
  // solid furniture (chair + rug stay walkable — see furnitureBlocks)
  for (const b of FURNITURE_BLOCKERS) if (inRect(x, y, b)) return true;
  return false;
}

export function blocked(x: number, y: number): boolean {
  if (activeScene === "interior") return blockedInterior(x, y);
  if (x < T * 0.6 || y < T * 0.6 || x > WORLD_W - T * 0.6 || y > WORLD_H - T * 0.6) return true;
  // house-like structures block their lower ~75% (3/4-view rule): farm buildings,
  // the neighbour farm, cottages, and market stall counters all share it. The
  // player's own barn/coop are path-dependent (FARM-START-1) — only solid when
  // the farm manifest says they exist.
  for (const b of [HOUSE, STALL, OUTHOUSE, ...STRUCTURES,
    ...(farmManifest.barn ? [BARN] : []), ...(farmManifest.coop ? [COOP] : [])]) {
    if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y + b.h * 0.25 && y < b.y + b.h + 6) return true;
  }
  // hedges block their whole footprint (a full wall of leaves)
  for (const h of HEDGES) if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return true;
  const dx = (x - POND.cx) / (POND.rx + 8), dy = (y - POND.cy) / (POND.ry + 8);
  if (dx * dx + dy * dy < 1) return true;
  if ((x - WELL.cx) ** 2 + (y - WELL.cy) ** 2 < (WELL.r + 8) ** 2) return true;
  if (inWater(x, y)) return true;   // river + lake are impassable, except the dock
  for (const [tx, ty] of WORLD_TREES) if ((x - tx) ** 2 + (y - ty) ** 2 < 400) return true;
  // solid world props (barrels, crates, cart, bench, hay-bale, wheelbarrow…) —
  // the established-farm clutter only collides when the manifest includes it.
  for (const r of PROP_BLOCKERS) {
    if (r.establishedFarm && !farmManifest.establishedProps) continue;
    if (inRect(x, y, r)) return true;
  }
  return false;
}

/** Close enough to the pond edge to fish. */
export function nearPond(x: number, y: number): boolean {
  const dx = (x - POND.cx) / (POND.rx + 30), dy = (y - POND.cy) / (POND.ry + 30);
  return dx * dx + dy * dy < 1;
}

export function nearRect(
  x: number, y: number,
  r: { x: number; y: number; w: number; h: number }, pad = 26
): boolean {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}
