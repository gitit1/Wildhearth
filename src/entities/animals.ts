import { T, COW_SPEED, HEN_SPEED } from "../config";
import type { Livestock } from "../systems/livestock";

export interface Cow { x: number; y: number; tx: number; ty: number; t: number; flip: boolean }
export interface Hen { x: number; y: number; tx: number; ty: number; t: number; peck: number }

/** One cow, wandering its barn-side patch of the yard. */
export function spawnCow(): Cow {
  return { x: 16 * T, y: 14 * T, tx: 16 * T, ty: 14 * T, t: 0, flip: false };
}

/** One hen; a slight jitter so a flock doesn't stack on one tile. */
export function spawnHen(): Hen {
  const jx = (Math.random() - 0.5) * 2 * T, jy = (Math.random() - 0.5) * 1.5 * T;
  return { x: 9.5 * T + jx, y: 12.5 * T + jy, tx: 9.5 * T + jx, ty: 12.5 * T + jy, t: Math.random() * 2, peck: 0 };
}

/** Animals exist only once purchased (no free animals — earned-economy rule). */
export function createAnimals(owned: Livestock) {
  const cows: Cow[] = owned.cow ? [spawnCow()] : [];
  const hens: Hen[] = Array.from({ length: owned.hens }, () => spawnHen());
  return { cows, hens };
}

export function updateAnimals(cows: Cow[], hens: Hen[], dt: number) {
  for (const c of cows) {
    c.t -= dt;
    if (c.t <= 0) {
      c.t = 3 + Math.random() * 4;
      c.tx = (14 + Math.random() * 5) * T;
      c.ty = (12 + Math.random() * 4) * T;
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, m = Math.hypot(dx, dy);
    if (m > 4) { c.x += (dx / m) * COW_SPEED * dt; c.y += (dy / m) * COW_SPEED * dt; c.flip = dx < 0; }
  }
  for (const h of hens) {
    h.t -= dt; h.peck = Math.max(0, h.peck - dt);
    if (h.t <= 0) {
      h.t = 2 + Math.random() * 3;
      if (Math.random() < 0.45) h.peck = 0.6;
      else { h.tx = (8 + Math.random() * 4) * T; h.ty = (11 + Math.random() * 4) * T; }
    }
    const dx = h.tx - h.x, dy = h.ty - h.y, m = Math.hypot(dx, dy);
    if (m > 3 && h.peck <= 0) { h.x += (dx / m) * HEN_SPEED * dt; h.y += (dy / m) * HEN_SPEED * dt; }
  }
}
