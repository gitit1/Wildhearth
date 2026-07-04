import { T, WORLD_W, WORLD_H } from "../config";
import { HOUSE, BARN, STALL, POND, TREES, ROOM, R_BED, R_BASIN, R_REST } from "./zones";

/** Which collision map is active (world vs. the house interior). Module-level
 *  like camera.ts's lastCam — main.ts sets it on every scene switch. */
export type Scene = "world" | "interior";
let activeScene: Scene = "world";
export function setCollisionScene(s: Scene) { activeScene = s; }

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }, pad = 0): boolean {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}

/** Interior: room walls (the north band is deep — the hearth wall) + the
 *  furniture the player shouldn't walk through. */
function blockedInterior(x: number, y: number): boolean {
  if (x < T * 0.5 || x > ROOM.w - T * 0.5 || y < T * 1.7 || y > ROOM.h - T * 0.35) return true;
  if (inRect(x, y, R_BED, 2)) return true;
  if (inRect(x, y, R_BASIN, 2)) return true;
  // the crate table blocks; the chair beside it stays walkable
  if (x > R_REST.x + R_REST.w * 0.45 && x < R_REST.x + R_REST.w && y > R_REST.y && y < R_REST.y + R_REST.h) return true;
  return false;
}

export function blocked(x: number, y: number): boolean {
  if (activeScene === "interior") return blockedInterior(x, y);
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
