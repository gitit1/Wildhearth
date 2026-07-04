import { T } from "../config";

/** All world layout in one place. Rects are in px unless noted (tiles). */
export const FIELD = { x0: 20, y0: 5, x1: 31, y1: 15 };      // tiles
export const YARD  = { x0: 6,  y0: 4, x1: 18, y1: 15 };      // tiles
export const HOUSE = { x: 7.5 * T, y: 5 * T,    w: 5 * T,   h: 3.4 * T };
export const BARN  = { x: 14 * T,  y: 10.4 * T, w: 3.6 * T, h: 2.8 * T };
export const STALL = { x: 16.2 * T, y: 6.2 * T, w: 2.4 * T, h: 1.6 * T };
export const POND  = { cx: 9 * T, cy: 19.4 * T, rx: 3.6 * T, ry: 2.2 * T };
export const TREES: Array<[number, number]> = [
  [3 * T, 3 * T], [2.2 * T, 9 * T], [4 * T, 16 * T], [26 * T, 19 * T],
  [31 * T, 19.5 * T], [17 * T, 2.2 * T], [30 * T, 2.6 * T], [22.5 * T, 21 * T],
];
/** Berry bushes in the forest-edge cluster west of the farm. */
export const BUSHES: Array<[number, number]> = [
  [2.9 * T, 11.2 * T], [4.4 * T, 13.8 * T], [2.2 * T, 17.5 * T],
];
/** The whole fenced field is tillable (MVP farming, Step 5). Cells are T x T. */
export const PLOT = { x: FIELD.x0 * T, y: FIELD.y0 * T, cols: FIELD.x1 - FIELD.x0, rows: FIELD.y1 - FIELD.y0 };
/** Busking spot: a little plaza corner between the barn and the field gate. */
export const BUSK_SPOT: [number, number] = [18.3 * T, 10.4 * T];

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
