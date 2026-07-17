import { T } from "../config";
import type { Rect } from "./zones";

/**
 * Furniture as DATA (HOME-1 groundwork for the Sims-style buy+place decorating
 * system — see docs/DECISIONS.md "Sims-home vision"). The player's home is a
 * LIST of placeable furniture INSTANCES, not hardcoded named rects. Everything
 * derives from this list:
 *   - the interior painter (art/interior.ts) draws each instance BY KIND at its
 *     position,
 *   - interior collision (world/collision.ts) generates blockers from the
 *     instances (per-kind footprint rules),
 *   - the interior interactions (systems/interact.ts, via the compat rects
 *     re-exported from world/zones.ts) BIND to a specific instance — sit targets
 *     THE chair, cook targets THE hearth, sleep targets THE bed…
 *
 * A future save-backed player layout can replace HOME_FURNITURE with a loaded
 * list WITHOUT any code change (that's the seam this block builds — the feature
 * itself, buying/placing, is a later block). Coordinates are ROOM-SPACE px
 * (the interior has its own small coordinate space; origin = the room's NW).
 */

export type FurnitureKind =
  | "hearth" | "counter" | "basin" | "crateTable"   // kitchen cluster
  | "bed" | "nightstand"                            // bedroom cluster
  | "chair" | "table" | "rug";                      // living cluster

export interface FurnitureInstance {
  id: string;                       // stable, unique — interactions bind by it
  kind: FurnitureKind;
  x: number; y: number;             // footprint top-left, room-space px
  w: number; h: number;             // footprint size, room-space px
  facing?: 0 | 1 | 2 | 3;           // up/right/down/left — orientation (future use)
}

/** The room's own coordinate space. Enlarged for HOME-1: a real cottage
 *  (16×11 tiles = 512×352 px) with a kitchen, a bedroom behind a divider, and
 *  a living/entry area — not the old bare 10×7 hall. */
export const HOME_ROOM = { w: 16 * T, h: 11 * T };

// --- Architecture (code-drawn — the room backdrop sprite is retired for the
//     big cottage; W2 regenerates proper interior art). Walls, the internal
//     divider (with a doorway gap), windows and the south door all live here so
//     the painter (draws them) and collision (blocks them) share one source. ---

/** Wall-band depths (room-space px). The north wall is DEEP (furniture mounts
 *  into it — hearth/counter/basin/bed headboard); the others are thin strips. */
export const WALL = {
  north: 1.6 * T,   // deep mount wall (y < this is solid)
  side: 0.5 * T,    // west/east strips
  south: 0.35 * T,  // south lip
} as const;

/** The internal divider: a vertical wall splitting the BEDROOM (east) from the
 *  kitchen/living (west), pierced by ONE doorway gap so it reads as two rooms,
 *  not a hall. Represented as its two solid segments (above + below the gap);
 *  the gap between them is walkable. */
export const DIVIDER_X = 9.7 * T;
export const DIVIDER_W = 0.5 * T;
export const DIVIDER_GAP = { y0: 4.8 * T, y1: 6.7 * T };   // walkable doorway
export const DIVIDER_SEGMENTS: Rect[] = [
  { x: DIVIDER_X, y: WALL.north, w: DIVIDER_W, h: DIVIDER_GAP.y0 - WALL.north },
  { x: DIVIDER_X, y: DIVIDER_GAP.y1, w: DIVIDER_W, h: HOME_ROOM.h - WALL.south - DIVIDER_GAP.y1 },
];

/** The south exit door opening + its worn mat (the interior's "Go outside"
 *  spot; zones.ts re-exports it as R_DOOR). Sits in the south wall, center-left
 *  in the living/entry area, clear of every furniture cluster. */
export const HOME_DOOR: Rect = { x: 4.5 * T, y: 9.9 * T, w: 1.5 * T, h: 0.85 * T };

export interface WindowDef extends Rect { wall: "north" | "east" | "west" | "south" }
/** Code-drawn windows — 1 on the north wall (over the living area, WELL CLEAR of
 *  the NW hearth — the COMPOSITION_RULES interiors addendum forbids a hearth on
 *  a window) and 1 on the east wall of the bedroom (below the bed). Nothing
 *  overlaps either. */
export const HOME_WINDOWS: WindowDef[] = [
  { wall: "north", x: 7.9 * T, y: 0.15 * T, w: 1.2 * T, h: 1.05 * T },
  { wall: "east", x: 15.42 * T, y: 4.3 * T, w: 0.5 * T, h: 1.4 * T },
];

/**
 * The DEFAULT home layout — the source of truth. Placement obeys the
 * COMPOSITION_RULES interiors addendum: functional clusters co-located
 * (kitchen: hearth+counter+basin+crate; bedroom: bed+nightstand; living:
 * chair+table on a rug), nothing over a window/door, clear circulation to every
 * interactable, one focal point per room (kitchen = hearth, bedroom = bed).
 */
export const HOME_FURNITURE: FurnitureInstance[] = [
  // --- KITCHEN (north-west wall cluster) ---
  { id: "hearth", kind: "hearth", x: 1.0 * T, y: 0.4 * T, w: 2.0 * T, h: 1.5 * T, facing: 2 },
  { id: "counter", kind: "counter", x: 3.5 * T, y: 0.55 * T, w: 2.3 * T, h: 1.15 * T, facing: 2 },
  { id: "basin", kind: "basin", x: 6.2 * T, y: 0.55 * T, w: 1.4 * T, h: 1.4 * T, facing: 2 },
  { id: "crate-table", kind: "crateTable", x: 2.4 * T, y: 3.0 * T, w: 1.5 * T, h: 1.4 * T },
  // --- LIVING / entry (south-west, on a rug near the door) ---
  { id: "rug", kind: "rug", x: 1.5 * T, y: 5.7 * T, w: 3.6 * T, h: 2.6 * T },
  { id: "chair", kind: "chair", x: 2.0 * T, y: 6.3 * T, w: 1.0 * T, h: 1.2 * T, facing: 1 },
  { id: "table", kind: "table", x: 3.3 * T, y: 6.5 * T, w: 1.3 * T, h: 1.2 * T },
  // --- BEDROOM (east of the divider) ---
  { id: "bed", kind: "bed", x: 12.2 * T, y: 0.5 * T, w: 1.7 * T, h: 2.7 * T, facing: 2 },
  { id: "nightstand", kind: "nightstand", x: 10.9 * T, y: 1.5 * T, w: 0.9 * T, h: 1.0 * T },
];

/** Instance lookup by id (interactions/anchors bind by id). Throws in dev if a
 *  wired id is missing, so a layout edit that drops a bound piece fails loudly
 *  rather than silently breaking cook/sit/sleep. */
export function furnitureById(id: string): FurnitureInstance {
  const f = HOME_FURNITURE.find((i) => i.id === id);
  if (!f) throw new Error(`furniture instance "${id}" not found in HOME_FURNITURE`);
  return f;
}

/** An instance's footprint as a plain rect (for painters, anchors, hitboxes). */
export function furnitureRect(inst: FurnitureInstance): Rect {
  return { x: inst.x, y: inst.y, w: inst.w, h: inst.h };
}

/** Per-kind: does this piece block movement? Rugs are floor decals and the
 *  chair stays walkable (the player GLIDES onto its seat when she sits, exactly
 *  as GF-1 established) — everything else is solid. */
export function furnitureBlocks(kind: FurnitureKind): boolean {
  return kind !== "rug" && kind !== "chair";
}

/** Collision blocker for an instance, or null if it's walkable. A small pad
 *  matches the old inRect(...,2) feel so approaches stay tight. */
export function furnitureBlocker(inst: FurnitureInstance, pad = 2): Rect | null {
  if (!furnitureBlocks(inst.kind)) return null;
  return { x: inst.x - pad, y: inst.y - pad, w: inst.w + pad * 2, h: inst.h + pad * 2 };
}
