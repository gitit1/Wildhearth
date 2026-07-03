import { T, WORLD_W, WORLD_H } from "../config";
import { HOUSE, BARN, STALL, POND, TREES } from "./zones";

export function blocked(x: number, y: number): boolean {
  if (x < T * 0.6 || y < T * 0.6 || x > WORLD_W - T * 0.6 || y > WORLD_H - T * 0.6) return true;
  for (const b of [HOUSE, BARN, STALL]) {
    if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y + b.h * 0.25 && y < b.y + b.h + 6) return true;
  }
  const dx = (x - POND.cx) / (POND.rx + 8), dy = (y - POND.cy) / (POND.ry + 8);
  if (dx * dx + dy * dy < 1) return true;
  for (const [tx, ty] of TREES) if ((x - tx) ** 2 + (y - ty) ** 2 < 400) return true;
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
