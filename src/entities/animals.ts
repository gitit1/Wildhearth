import { T, COW_SPEED, HEN_SPEED } from "../config";

export interface Cow { x: number; y: number; tx: number; ty: number; t: number; flip: boolean }
export interface Hen { x: number; y: number; tx: number; ty: number; t: number; peck: number }

export function createAnimals() {
  const cows: Cow[] = [{ x: 16 * T, y: 14 * T, tx: 16 * T, ty: 14 * T, t: 0, flip: false }];
  const hens: Hen[] = [
    { x: 9 * T, y: 12 * T, tx: 9 * T, ty: 12 * T, t: 0, peck: 0 },
    { x: 10.5 * T, y: 13.2 * T, tx: 10.5 * T, ty: 13.2 * T, t: 1.2, peck: 0 },
  ];
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
