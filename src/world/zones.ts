import { T } from "../config";

/** All world layout in one place. Rects are in px unless noted (tiles). */
export const FIELD = { x0: 20, y0: 5, x1: 31, y1: 15 };      // tiles
export const YARD  = { x0: 6,  y0: 4, x1: 18, y1: 15 };      // tiles
export const HOUSE = { x: 7.5 * T, y: 5 * T,    w: 5 * T,   h: 3.4 * T };
export const BARN  = { x: 14 * T,  y: 10.4 * T, w: 3.6 * T, h: 2.8 * T };
// The player's OWN buy/sell stall. Relocated into the coastal TOWN — the game's
// commercial heart, where VISION has NPCs come to her shop (owner directive
// "move the farm-side stall to the town"; supersedes the earlier market-WEST-
// edge home). Stands free on the TOWN_STREET plaza a short step east of
// TOWN_SQUARE, its counter facing south into the open street so townsfolk have
// clear room to queue in front. Placed in the gap between TOWN_HOMES[1] (ends
// x 62.8) and the town spur (west edge x 65.8), and dropped to y 33.4 so its
// body/awning clear the spur mouth (spur ends y 33.2) — no clip of home, spur,
// dock or sea. The buy-tools + sell-goods + customers mechanic is unchanged;
// only the location moved (collision/ground/minimap/interact/customers all
// derive from this rect, so they follow it). */
export const STALL = { x: 63.5 * T, y: 33.4 * T, w: 2.4 * T, h: 1.6 * T };
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

/** A rickety little outhouse just west of the farmhouse (Needs engine): the
 *  bathroom need's restore spot. Small, charming, code-drawn, collidable. */
export const OUTHOUSE = { x: 5.2 * T, y: 5.5 * T, w: 1.1 * T, h: 1.7 * T };

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

export type Region = "farm" | "road" | "market" | "forest" | "river" | "town";

export interface Rect { x: number; y: number; w: number; h: number }
const rect = (xT: number, yT: number, wT: number, hT: number): Rect =>
  ({ x: xT * T, y: yT * T, w: wT * T, h: hT * T });

/** The dirt road as a set of axis-aligned strips (walkable, painted packed
 *  dirt). Main east-west run + the forest branch north + a spur to the dock +
 *  the town spur running SOUTH out of the market square into the coastal town. */
export const ROAD_SEGMENTS: Rect[] = [
  rect(16, 21.3, 46, 2.4),    // main run: farm gate -> market entrance
  rect(53.8, 3, 2.4, 18.7),   // forest passage branching north off the road
  rect(73.5, 22.9, 10, 1.9),  // market -> lakeside dock spur
  rect(65.8, 27.6, 2.4, 5.6), // v2 BLOCK #3: market square -> coastal town spur
];

/** A leafy hedge line sealing the farm's east side, broken by the road gap —
 *  the "natural bound" that replaces the old world-edge wall. */
export const HEDGES: Rect[] = [
  rect(34, 0, 1.4, 20),       // north of the road gap
  rect(34, 24.5, 1.4, 5.5),   // south of the road gap (gap = y 20..24.5)
];

/** The established neighbour farm along the road — cared-for house + barn
 *  (visual contrast to the player's rundown start). Decorative, no interactions.
 *  The house draws with its OWN sprite ("buildings/farmhouse-neighbor" — the
 *  whitewash/slate variant, building-variety batch) so it doesn't look like a
 *  copy of the player's farmhouse; the barn reuses the player's barn sprite
 *  as-is (no distinct "established" barn art this wave). */
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

/** Festival engine (Part A #6) decoration anchors — code-drawn, only painted
 *  on the festival's date. Lantern poles ring the well; harvest clusters
 *  (pumpkins + sheaves) sit just outside that ring, clear of interactables. */
export const FESTIVAL_LANTERN_SPOTS: Array<[number, number]> = [
  [WELL.cx - 3.4 * T, WELL.cy - 1.6 * T], [WELL.cx + 3.4 * T, WELL.cy - 1.6 * T],
  [WELL.cx - 3.4 * T, WELL.cy + 2.4 * T], [WELL.cx + 3.4 * T, WELL.cy + 2.4 * T],
];
export const FESTIVAL_HARVEST_CLUSTERS: Array<[number, number]> = [
  [WELL.cx - 2 * T, WELL.cy + 3.2 * T], [WELL.cx + 2.2 * T, WELL.cy + 3.4 * T],
  [WELL.cx - 4.6 * T, WELL.cy + 0.6 * T],
];

export interface CottageDef extends Rect { variant: number }
/** Small cottages ringing the square — future NPC homes, decorative for now,
 *  each with a door that could later be an entry point. `variant` (1-8) picks
 *  one of the 8 approved cottage sprites (art/buildings.ts COTTAGE_SPRITES) —
 *  a different variant per cottage, deterministic, so "no two neighbors alike"
 *  (building-variety batch; variants 6 and 8 sit unused/spare, see
 *  docs/PIXELLAB_ASSETS.md). Falls back to the code painter's own random wall/
 *  roof tone (keyed off `seed` at the call site) when no sprite is present. */
export const COTTAGES: CottageDef[] = [
  { ...rect(61, 19.5, 2.8, 2.3), variant: 2 },
  { ...rect(60.5, 24, 2.8, 2.3), variant: 4 },
  { ...rect(64.5, 25.5, 2.8, 2.3), variant: 6 },   // R4: newly-wired spare variant
  { ...rect(69, 25.8, 2.8, 2.3), variant: 3 },
  { ...rect(73.5, 25.3, 2.8, 2.3), variant: 8 },   // R4: newly-wired spare variant
  { ...rect(76, 19, 2.8, 2.3), variant: 7 },
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
/** True inside the river, lake or coastal sea (both docks are walkable, so
 *  they're excluded). */
export function inWater(x: number, y: number): boolean {
  if (onDock(x, y) || onTownDock(x, y)) return false;
  return inRectPx(x, y, RIVER) || inRectPx(x, y, LAKE) || inRectPx(x, y, TOWN_SEA);
}

export interface FishSpot { id: string; loc: "river" | "lake"; wx: number; wy: number; ax: number; ay: number; }
/** Designated shore/dock fishing spots. `wx,wy` = the water point you click,
 *  `ax,ay` = the walkable shore/dock point you stand at. */
export const FISH_SPOTS: FishSpot[] = [
  { id: "river-n", loc: "river", wx: 98 * T, wy: 5 * T,  ax: 95 * T, ay: 5 * T },
  { id: "river-s", loc: "river", wx: 98 * T, wy: 13 * T, ax: 95 * T, ay: 13 * T },
  { id: "lake",    loc: "lake",  wx: 84 * T, wy: 27.5 * T, ax: 83.5 * T, ay: 24.3 * T },
];

// ===========================================================================
//  Coastal TOWN region (v2 BLOCK #3). The road spur (above) drops south out of
//  the market square into a cobbled town street lined with an inn, specialised
//  merchants and NPC homes, opening onto a seafront with a town dock. All layout
//  lives here; ground/collision/minimap/interact/schedule read from it. Sits in
//  the map's new southern band (y 31.5 .. 46), disjoint from the market plaza
//  above it (y 14.5 .. 28) so the two commerce hubs never overlap.
// ===========================================================================

/** The cobbled town street/square (plaza tiles) — the walkable heart of town. */
export const TOWN_STREET = rect(41, 31.5, 50, 9);
/** The seafront: coastal water along the map's south edge (impassable, fished
 *  later like the lake). A sandy beach dithers in where it meets the street. */
export const TOWN_SEA = rect(33, 41, 66, 5);
/** The town dock — the one walkable finger of decking reaching into the sea. */
export const TOWN_DOCK = rect(63.5, 39.6, 3, 6);
/** Where visiting townsfolk gather (schedule "town" stop) — mid-street, clear
 *  of every building front, the dock mouth and the merchant counters. */
export const TOWN_SQUARE: [number, number] = [58 * T, 35.4 * T];

/** The inn — the town's largest building (VISION: "Inn, town square"). Code-
 *  drawn (drawInn) for now; a dedicated PixelLab sprite is a logged follow-up. */
export const INN = rect(43.5, 31.7, 6, 3.4);

/** The stable — the transport vendor (v2 BLOCK #5). Sits at the quiet east end
 *  of the town street, clear of the merchant fronts and homes, with a little
 *  paddock rail. Code-drawn (drawStable) for now; a PixelLab stable sprite is a
 *  logged wanted follow-up. Sells the rowboat / horse / carriage (VISION §9). */
export const STABLE = rect(86.5, 32, 3.8, 2.9);

export interface TownHomeDef extends Rect { variant?: number; seed: number }
/** NPC homes ringing the street. `variant` (1-8) picks a cottage sprite when
 *  set — only the two market-UNUSED variants (1, 5) are used here so no town
 *  home duplicates a market cottage; the rest are the seed-driven code painter
 *  (drawCottage fallback), each seed distinct so no two homes read alike (the
 *  owner's hard "no two buildings alike" rule). */
export const TOWN_HOMES: TownHomeDef[] = [
  { ...rect(51.5, 32, 2.8, 2.3), variant: 1, seed: 5101 },
  { ...rect(60, 32, 2.8, 2.3), variant: 5, seed: 5205 },
  { ...rect(70.5, 32, 2.8, 2.3), seed: 5303 },   // code painter, unique seed
  { ...rect(80, 32, 2.8, 2.3), seed: 5407 },     // code painter, unique seed
  { ...rect(84.5, 37.4, 2.8, 2.3), seed: 5509 }, // code painter, unique seed
];

export type MerchantKind = "general" | "fishmonger" | "greengrocer" | "tailor";
export interface MerchantDef extends Rect {
  kind: MerchantKind;
  spriteId: string;            // a distinct banked SPARE stall sprite (drawStall override)
  sign: StallDef["sign"];      // goods overlay theme (fish/produce/goods/empty)
  awning: string; accent: string;
}
/** The town's specialised merchant stalls — each a DISTINCT banked spare-stall
 *  sprite (never a market-stall duplicate), staffed by trade wiring in
 *  systems/shop.ts. General store sells (tools/seeds); fishmonger + greengrocer
 *  BUY their speciality at a reputation-scaled premium; the tailor is a
 *  "wardrobe coming soon" counter (open owner question — see the handoff). */
export const TOWN_MERCHANTS: MerchantDef[] = [
  { ...rect(55.5, 32.3, 2.4, 1.6), kind: "general", spriteId: "buildings/spare/stall-general-01", sign: "goods", awning: "#b5843c", accent: "#cbb28a" },
  { ...rect(47.5, 37.6, 2.4, 1.6), kind: "fishmonger", spriteId: "buildings/spare/stall-fish-02", sign: "fish", awning: "#3f86a0", accent: "#7fb0c8" },
  { ...rect(52.5, 37.6, 2.4, 1.6), kind: "greengrocer", spriteId: "buildings/spare/stall-produce-02", sign: "produce", awning: "#5a9a48", accent: "#e2c24a" },
  { ...rect(75, 32, 2.4, 1.6), kind: "tailor", spriteId: "buildings/spare/stall-empty-01", sign: "empty", awning: "#a07ab0", accent: "#d8c4e0" },
];

export function onTownDock(x: number, y: number): boolean {
  return x >= TOWN_DOCK.x && x <= TOWN_DOCK.x + TOWN_DOCK.w && y >= TOWN_DOCK.y && y <= TOWN_DOCK.y + TOWN_DOCK.h;
}

/** House-like structures that block their lower ~75% (same 3/4 rule the farm
 *  buildings use): neighbour buildings, cottages, market stall counters, and
 *  the coastal town's inn / homes / merchant counters. */
export const STRUCTURES: Rect[] = [
  NEIGHBOR.house, NEIGHBOR.barn, ...COTTAGES,
  ...MARKET_STALLS.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })),
  INN, STABLE, ...TOWN_HOMES.map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h })),
  ...TOWN_MERCHANTS.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h })),
];

// ===========================================================================
//  World props (foliage + props batch) — a CURATED, sparse set of PixelLab prop
//  sprites placed around the world, additive to the existing layout. Each is
//  anchored base-on-ground on (x,y) and depth-sorted in main.ts. `solid` props
//  get a small collision blocker (below) so the player can't walk through them;
//  decorative props (pots, sacks, firewood, signs, birdhouses) don't block —
//  and NONE sit on a door / path / interaction spot. `id` keys the sprite
//  (props/<name>); a missing PNG simply doesn't draw (dual-path, zero-PNG safe).
// ===========================================================================
export interface PropDef {
  x: number; y: number; id: string;
  scale?: number;          // world px per sprite px override (else SPRITE_PROP_SCALE)
  solid?: boolean;         // gets a collision blocker
  cw?: number;             // collision half-width (px) when solid
}
export const WORLD_PROPS: PropDef[] = [
  // --- Farmhouse yard (west): firewood + wheelbarrow + bucket + a pot, tucked
  //     around the house front, clear of the door, flower beds and the pond.
  { x: 6.6 * T, y: 8.4 * T, id: "props/firewood" },
  { x: 6.4 * T, y: 9.4 * T, id: "props/wheelbarrow", solid: true, cw: 20 },
  { x: 7.2 * T, y: 9.3 * T, id: "props/bucket" },
  { x: 7.8 * T, y: 8.3 * T, id: "props/flower-pot" },
  { x: 12.8 * T, y: 8.6 * T, id: "props/birdhouse" },     // on its post, SE of the house
  // --- Barn (crates, a barrel, a sack) + field edge (hay-bale, scarecrow).
  { x: 13.1 * T, y: 12.8 * T, id: "props/crate", solid: true, cw: 12 },
  { x: 13.4 * T, y: 13.4 * T, id: "props/barrel", solid: true, cw: 12 },
  { x: 12.7 * T, y: 13.2 * T, id: "props/sack" },
  { x: 19.0 * T, y: 12.25 * T, id: "props/hay-bale", solid: true, cw: 17 },
  { x: 19.4 * T, y: 14.0 * T, id: "props/scarecrow", solid: true, cw: 8 },
  // --- Market square: lanterns flanking the well, a bench, a cart, a signpost.
  { x: 66.5 * T, y: 19.2 * T, id: "props/lantern", solid: true, cw: 6 },
  { x: 71.5 * T, y: 19.2 * T, id: "props/lantern", solid: true, cw: 6 },
  { x: 68.0 * T, y: 21.6 * T, id: "props/bench", solid: true, cw: 22 },
  { x: 63.5 * T, y: 18.6 * T, id: "props/cart", solid: true, cw: 24 },
  { x: 58.5 * T, y: 20.6 * T, id: "props/signpost" },     // market entrance marker
  // Where the player's stall used to stand (now moved to the town): a delivery
  // cart + a crate keep the market's west entrance from reading empty. Neutral
  // clutter, not a building — clear of the road (y 21.3+) and the signpost below.
  { x: 58.4 * T, y: 18.0 * T, id: "props/cart", solid: true, cw: 24 },
  { x: 57.3 * T, y: 18.5 * T, id: "props/crate", solid: true, cw: 12 },
  // --- Forest / road junction: a signpost + a birdhouse on the forest edge.
  { x: 56.8 * T, y: 20.7 * T, id: "props/signpost" },
  { x: 50.0 * T, y: 15.0 * T, id: "props/birdhouse" },
  // --- Coastal town (v2 BLOCK #3): a signpost where the spur meets the street,
  //     lanterns flanking the dock mouth + along the promenade, seafront benches,
  //     and a cart/crate/barrel giving the merchant end some life. All clear of
  //     building fronts, the dock decking and the merchant counters.
  { x: 67.4 * T, y: 33.1 * T, id: "props/signpost" },       // "Tidewater" town marker
  { x: 62.4 * T, y: 39.3 * T, id: "props/lantern", solid: true, cw: 6 },  // dock mouth W
  { x: 67.6 * T, y: 39.3 * T, id: "props/lantern", solid: true, cw: 6 },  // dock mouth E
  { x: 54.0 * T, y: 34.4 * T, id: "props/lantern", solid: true, cw: 6 },  // street lamp
  { x: 78.0 * T, y: 34.4 * T, id: "props/lantern", solid: true, cw: 6 },  // street lamp
  { x: 57.5 * T, y: 38.4 * T, id: "props/bench", solid: true, cw: 22 },   // seafront bench W
  { x: 72.5 * T, y: 38.4 * T, id: "props/bench", solid: true, cw: 22 },   // seafront bench E
  { x: 50.6 * T, y: 34.6 * T, id: "props/cart", solid: true, cw: 24 },    // by the inn
  { x: 58.8 * T, y: 33.2 * T, id: "props/crate", solid: true, cw: 12 },   // by the general store
  { x: 50.4 * T, y: 38.5 * T, id: "props/barrel", solid: true, cw: 12 },  // by the fishmonger
];

/** Collision blockers for the SOLID props (small base boxes) — read by
 *  world/collision.ts, never blocking a door/path/interaction spot. */
export const PROP_BLOCKERS: Rect[] = WORLD_PROPS
  .filter((p) => p.solid)
  .map((p) => { const cw = p.cw ?? 12; return { x: p.x - cw, y: p.y - 13, w: cw * 2, h: 16 }; });

export function onRoad(x: number, y: number): boolean {
  for (const s of ROAD_SEGMENTS) if (inRectPx(x, y, s)) return true;
  return false;
}

/** Which region a world point sits in (containing rect, farm/water first). */
export function regionAt(x: number, y: number): Region {
  if (y >= 31 * T) return "town";   // the whole new southern band is the coastal town
  if (x < 35 * T) return "farm";
  if (x >= 92 * T || (x >= 78 * T && y >= 19.5 * T)) return "river";  // river strip + lake
  if (x >= 48 * T && x < 64 * T && y < 17 * T) return "forest";
  if (x >= 58 * T && x < 92 * T && y >= 13 * T) return "market";
  return "road";
}
