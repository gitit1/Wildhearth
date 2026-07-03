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
