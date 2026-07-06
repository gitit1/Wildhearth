import { T } from "../config";

/** All world layout in one place. Rects are in px unless noted (tiles). */
export const FIELD = { x0: 20, y0: 5, x1: 31, y1: 15 };      // tiles
export const YARD  = { x0: 6,  y0: 4, x1: 18, y1: 15 };      // tiles
export const HOUSE = { x: 7.5 * T, y: 5 * T,    w: 5 * T,   h: 3.4 * T };
export const BARN  = { x: 14 * T,  y: 10.4 * T, w: 3.6 * T, h: 2.8 * T };
export const STALL = { x: 16.2 * T, y: 6.2 * T, w: 2.4 * T, h: 1.6 * T };
export const POND  = { cx: 9 * T, cy: 19.4 * T, rx: 3.6 * T, ry: 2.2 * T };
// The two trees south of the field sit below tile row 20.5 so the tier-2
// plot expansion's fence (bottom row 19) never swallows them.
export const TREES: Array<[number, number]> = [
  [3 * T, 3 * T], [2.2 * T, 9 * T], [4 * T, 16 * T], [26 * T, 20.8 * T],
  [31.5 * T, 21 * T], [17 * T, 2.2 * T], [30 * T, 2.6 * T], [22.5 * T, 21 * T],
];
/** Berry bushes in the forest-edge cluster west of the farm. */
export const BUSHES: Array<[number, number]> = [
  [2.9 * T, 11.2 * T], [4.4 * T, 13.8 * T], [2.2 * T, 17.5 * T],
];
/** The whole fenced field is tillable (MVP farming, Step 5). Cells are T x T. */
export const PLOT = { x: FIELD.x0 * T, y: FIELD.y0 * T, cols: FIELD.x1 - FIELD.x0, rows: FIELD.y1 - FIELD.y0 };

/**
 * Farm plot expansions (money-gated block): discrete full-width strips south
 * of the field, so each purchase keeps the fenced area one clean rectangle
 * and the fence visibly leaps outward the moment it's bought.
 */
export const PLOT_EXPANSIONS = [
  { x: FIELD.x0 * T, y: FIELD.y1 * T, cols: FIELD.x1 - FIELD.x0, rows: 2 },        // tier 1: rows 15-16
  { x: FIELD.x0 * T, y: (FIELD.y1 + 2) * T, cols: FIELD.x1 - FIELD.x0, rows: 2 },  // tier 2: rows 17-18
] as const;

/** The fenced field's tile bounds for the current expansion tier. */
export function fieldBounds(tiers: number): { x0: number; y0: number; x1: number; y1: number } {
  const t = Math.max(0, Math.min(PLOT_EXPANSIONS.length, tiers));
  return { x0: FIELD.x0, y0: FIELD.y0, x1: FIELD.x1, y1: FIELD.y1 + 2 * t };
}
/** Busking spot — relocated to the market square (DECISIONS: "Music income v1:
 *  only at stall-area"). The old farm corner keeps a sign pointing here. */
export const BUSK_SPOT: [number, number] = [72.5 * T, 22.5 * T];
/** Where buskers used to play on the farm — now just a little painted sign. */
export const OLD_BUSK_SIGN: [number, number] = [18.3 * T, 10.4 * T];

/** The farmhouse's front door (matches drawHouse's drawn door rect). */
export const HOUSE_DOOR = {
  x: HOUSE.x + HOUSE.w * 0.44, y: HOUSE.y + HOUSE.h * 0.55,
  w: HOUSE.w * 0.13, h: HOUSE.h * 0.45,
};

/** House interior (tier-1, bare/broken): its own small coordinate space. */
export const ROOM = { w: 10 * T, h: 7 * T };
export const R_HEARTH = { x: 3.2 * T, y: 0.5 * T, w: 2.0 * T, h: 1.5 * T }; // north wall: hearth + pot + shelf
export const R_BASIN  = { x: 8.0 * T, y: 2.3 * T, w: 1.4 * T, h: 1.5 * T }; // east wall: basin + bucket
export const R_BED    = { x: 0.6 * T, y: 2.2 * T, w: 1.7 * T, h: 2.7 * T }; // west wall: straw bed
export const R_REST   = { x: 4.6 * T, y: 4.3 * T, w: 2.4 * T, h: 1.5 * T }; // chair + crate table
export const R_DOOR   = { x: 4.3 * T, y: 6.1 * T, w: 1.4 * T, h: 0.9 * T }; // exit mat, south wall
/** Where the player stands after walking in / before walking out. */
export const ROOM_ENTRY: [number, number] = [5 * T, 5.7 * T];

/** Ornamental flower beds along the house front (Gardening skill). */
export const FLOWER_BEDS: Array<[number, number]> = [
  [8.2 * T, 9.2 * T], [9.1 * T, 9.6 * T], [11.8 * T, 9.2 * T],
];

// ===========================================================================
//  World expansion v1 — the farm is the west corner of a larger open scene:
//  farm -> road (past a neighbour farm) -> market square, a forest passage
//  branching north, and a river running the east edge into a south-east lake.
//  All layout lives here; collision/ground/minimap/interact read from it.
// ===========================================================================

export type Region = "farm" | "road" | "market" | "forest" | "river";

export interface Rect { x: number; y: number; w: number; h: number }
const rect = (xT: number, yT: number, wT: number, hT: number): Rect =>
  ({ x: xT * T, y: yT * T, w: wT * T, h: hT * T });

/** The dirt road as a set of axis-aligned strips (walkable, painted packed
 *  dirt). Main east-west run + the forest branch north + a spur to the dock. */
export const ROAD_SEGMENTS: Rect[] = [
  rect(16, 21.3, 46, 2.4),    // main run: farm gate -> market entrance
  rect(53.8, 3, 2.4, 18.7),   // forest passage branching north off the road
  rect(73.5, 22.9, 10, 1.9),  // market -> lakeside dock spur
];

/** A leafy hedge line sealing the farm's east side, broken by the road gap —
 *  the "natural bound" that replaces the old world-edge wall. */
export const HEDGES: Rect[] = [
  rect(34, 0, 1.4, 20),       // north of the road gap
  rect(34, 24.5, 1.4, 5.5),   // south of the road gap (gap = y 20..24.5)
];

/** The established neighbour farm along the road — cared-for house + barn
 *  (visual contrast to the player's rundown start). Decorative, no interactions. */
export const NEIGHBOR = {
  house: rect(39, 15, 5, 3.4),
  barn: rect(45.2, 17.4, 3.6, 2.8),
};

export interface StallDef extends Rect { awning: string; accent: string; sign: "fish" | "produce" | "goods" | "empty"; }
/** Four distinct market stalls (variants of the farm stall painter). No trading
 *  here yet — decorative until the NPC/shop blocks land. */
export const MARKET_STALLS: StallDef[] = [
  { ...rect(62.5, 16, 2.4, 1.6), awning: "#3f86a0", accent: "#7fb0c8", sign: "fish" },
  { ...rect(66.5, 16, 2.4, 1.6), awning: "#5a9a48", accent: "#e2c24a", sign: "produce" },
  { ...rect(70.5, 16, 2.4, 1.6), awning: "#b5843c", accent: "#cbb28a", sign: "goods" },
  { ...rect(74.5, 16, 2.4, 1.6), awning: "#a89e8a", accent: "#8a8172", sign: "empty" },
];

/** The square's stone-well centrepiece. */
export const WELL = { cx: 69 * T, cy: 20.5 * T, r: 0.9 * T };

/** Small cottages ringing the square — future NPC homes, decorative for now,
 *  each with a door that could later be an entry point. */
export const COTTAGES: Rect[] = [
  rect(61, 19.5, 2.8, 2.3),
  rect(60.5, 24, 2.8, 2.3),
  rect(64.5, 25.5, 2.8, 2.3),
  rect(69, 25.8, 2.8, 2.3),
  rect(73.5, 25.3, 2.8, 2.3),
  rect(76, 19, 2.8, 2.3),
];

/** Dense tree-lined trunks flanking the forest passage + filling the grove. */
export const FOREST_TREES: Array<[number, number]> = [
  [52 * T, 20 * T], [58 * T, 20 * T], [51.5 * T, 16.5 * T], [58.5 * T, 16.8 * T],
  [50 * T, 13 * T], [60 * T, 13.5 * T], [51 * T, 9.5 * T], [59.5 * T, 9.8 * T],
  [49 * T, 6.5 * T], [61 * T, 6.8 * T], [52.5 * T, 4 * T], [58 * T, 3.8 * T],
  [55 * T, 1.8 * T], [47 * T, 10.5 * T], [62.5 * T, 10 * T], [48 * T, 3.5 * T],
  [62 * T, 3.4 * T], [54.5 * T, 12 * T], [56.5 * T, 7 * T],
];

/** Scattered roadside / boundary trees (natural bounds along the open world). */
export const ROADSIDE_TREES: Array<[number, number]> = [
  [35.5 * T, 6 * T], [35.5 * T, 12 * T], [35.5 * T, 17 * T], [37 * T, 26 * T],
  [43 * T, 26.5 * T], [50 * T, 27 * T], [66 * T, 28 * T], [58 * T, 27.5 * T],
  [82 * T, 5 * T], [88 * T, 9 * T], [90 * T, 15 * T], [86 * T, 2.5 * T],
  [79.5 * T, 6.5 * T],
];

/** Every drawable/collidable tree in the world (farm + forest + roadside). */
export const WORLD_TREES: Array<[number, number]> = [...TREES, ...FOREST_TREES, ...ROADSIDE_TREES];

/** Forage bushes in the forest passage (foraged with location "forest", like
 *  the farm-edge cluster). */
export const FOREST_BUSHES: Array<[number, number]> = [
  [51.5 * T, 8 * T], [58.5 * T, 6.5 * T], [50.5 * T, 14.5 * T],
  [59.5 * T, 13 * T], [55 * T, 18 * T],
];

/** Freshwater: a river down the east edge widening into a south-east lake,
 *  plus the wooden dock that reaches into it (the one walkable spot on water). */
export const RIVER = rect(96, 0, 7, 20);
export const LAKE = rect(80, 20, 28, 10);
export const DOCK = rect(82, 19.5, 3, 6);

export function onDock(x: number, y: number): boolean {
  return x >= DOCK.x && x <= DOCK.x + DOCK.w && y >= DOCK.y && y <= DOCK.y + DOCK.h;
}
function inRectPx(x: number, y: number, r: Rect, pad = 0): boolean {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}
/** True inside the river or lake (the dock is walkable, so it's excluded). */
export function inWater(x: number, y: number): boolean {
  if (onDock(x, y)) return false;
  return inRectPx(x, y, RIVER) || inRectPx(x, y, LAKE);
}

export interface FishSpot { id: string; loc: "river" | "lake"; wx: number; wy: number; ax: number; ay: number; }
/** Designated shore/dock fishing spots. `wx,wy` = the water point you click,
 *  `ax,ay` = the walkable shore/dock point you stand at. */
export const FISH_SPOTS: FishSpot[] = [
  { id: "river-n", loc: "river", wx: 98 * T, wy: 5 * T,  ax: 95 * T, ay: 5 * T },
  { id: "river-s", loc: "river", wx: 98 * T, wy: 13 * T, ax: 95 * T, ay: 13 * T },
  { id: "lake",    loc: "lake",  wx: 84 * T, wy: 27.5 * T, ax: 83.5 * T, ay: 24.3 * T },
];

/** House-like structures that block their lower ~75% (same 3/4 rule the farm
 *  buildings use): neighbour buildings, cottages, market stall counters. */
export const STRUCTURES: Rect[] = [
  NEIGHBOR.house, NEIGHBOR.barn, ...COTTAGES,
  ...MARKET_STALLS.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })),
];

export function onRoad(x: number, y: number): boolean {
  for (const s of ROAD_SEGMENTS) if (inRectPx(x, y, s)) return true;
  return false;
}

/** Which region a world point sits in (containing rect, farm/water first). */
export function regionAt(x: number, y: number): Region {
  if (x < 35 * T) return "farm";
  if (x >= 92 * T || (x >= 78 * T && y >= 19.5 * T)) return "river";  // river strip + lake
  if (x >= 48 * T && x < 64 * T && y < 17 * T) return "forest";
  if (x >= 58 * T && x < 92 * T && y >= 13 * T) return "market";
  return "road";
}
