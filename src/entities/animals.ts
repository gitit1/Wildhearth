import { T, COW_SPEED, HEN_SPEED, DUCK_SPEED, PIG_SPEED, SHEEP_SPEED } from "../config";
import type { Livestock } from "../systems/livestock";

// dist/moving feed the rig's distance-keyed walk cycle (see art/animalRig.ts)
export interface Cow { x: number; y: number; tx: number; ty: number; t: number; flip: boolean; dist: number; moving: boolean }
export interface Hen { x: number; y: number; tx: number; ty: number; t: number; peck: number; flip: boolean; dist: number; moving: boolean }
// Part C content-library commit 2: duck/pig/sheep, wired exactly like cow/hen
// above — a flock counter (like hens), wandering ambient animals.
export interface Duck { x: number; y: number; tx: number; ty: number; t: number; peck: number; flip: boolean; dist: number; moving: boolean }
export interface Pig { x: number; y: number; tx: number; ty: number; t: number; flip: boolean; dist: number; moving: boolean }
export interface Sheep { x: number; y: number; tx: number; ty: number; t: number; flip: boolean; dist: number; moving: boolean }

/** One cow, wandering its barn-side patch of the yard. */
export function spawnCow(): Cow {
  return { x: 16 * T, y: 14 * T, tx: 16 * T, ty: 14 * T, t: 0, flip: false, dist: 0, moving: false };
}

/** One hen; a slight jitter so a flock doesn't stack on one tile. */
export function spawnHen(): Hen {
  const jx = (Math.random() - 0.5) * 2 * T, jy = (Math.random() - 0.5) * 1.5 * T;
  return { x: 9.5 * T + jx, y: 12.5 * T + jy, tx: 9.5 * T + jx, ty: 12.5 * T + jy, t: Math.random() * 2, peck: 0, flip: false, dist: 0, moving: false };
}

/** One duck; wanders the farm pond's edge, jittered like the hen flock. */
export function spawnDuck(): Duck {
  const jx = (Math.random() - 0.5) * 2.4 * T, jy = (Math.random() - 0.5) * 1.2 * T;
  return { x: 9 * T + jx, y: 17.5 * T + jy, tx: 9 * T + jx, ty: 17.5 * T + jy, t: Math.random() * 2, peck: 0, flip: false, dist: 0, moving: false };
}

/** One pig, wandering a barnside patch (like the cow, a touch slower). */
export function spawnPig(): Pig {
  const jx = (Math.random() - 0.5) * 2 * T;
  return { x: 15 * T + jx, y: 13 * T, tx: 15 * T + jx, ty: 13 * T, t: Math.random() * 2, flip: false, dist: 0, moving: false };
}

/** One sheep, wandering the yard alongside the cow/pig. */
export function spawnSheep(): Sheep {
  const jx = (Math.random() - 0.5) * 2 * T;
  return { x: 17.5 * T + jx, y: 13.5 * T, tx: 17.5 * T + jx, ty: 13.5 * T, t: Math.random() * 2, flip: false, dist: 0, moving: false };
}

/** Animals exist only once purchased (no free animals — earned-economy rule). */
export function createAnimals(owned: Livestock) {
  const cows: Cow[] = owned.cow ? [spawnCow()] : [];
  const hens: Hen[] = Array.from({ length: owned.hens }, () => spawnHen());
  const ducks: Duck[] = Array.from({ length: owned.ducks }, () => spawnDuck());
  const pigs: Pig[] = Array.from({ length: owned.pigs }, () => spawnPig());
  const sheep: Sheep[] = Array.from({ length: owned.sheep }, () => spawnSheep());
  return { cows, hens, ducks, pigs, sheep };
}

// Barn shelter point (R5): the yard just south of the BARN rect (14..17.6 x,
// 10.4..13.2 y in tiles). At night every animal heads here and settles, so the
// farmyard empties into the barn's lee after dark instead of wandering all night.
const BARN_SHELTER_X = 15.8 * T, BARN_SHELTER_Y = 13.6 * T;
function barnSpot(spread: number): [number, number] {
  return [
    BARN_SHELTER_X + (Math.random() - 0.5) * 2 * spread * T,
    BARN_SHELTER_Y + (Math.random() - 0.5) * spread * T,
  ];
}

/** `night` (R5): true after dark — animals steer to the barn and settle there
 *  instead of their daytime wander patch. */
export function updateAnimals(
  cows: Cow[], hens: Hen[], ducks: Duck[], pigs: Pig[], sheep: Sheep[], dt: number, night = false,
) {
  for (const c of cows) {
    c.t -= dt;
    if (c.t <= 0) {
      c.t = 3 + Math.random() * 4;
      if (night) [c.tx, c.ty] = barnSpot(1.2);
      else { c.tx = (14 + Math.random() * 5) * T; c.ty = (12 + Math.random() * 4) * T; }
    }
    const dx = c.tx - c.x, dy = c.ty - c.y, m = Math.hypot(dx, dy);
    c.moving = m > 4;
    if (c.moving) {
      const sx = (dx / m) * COW_SPEED * dt, sy = (dy / m) * COW_SPEED * dt;
      c.x += sx; c.y += sy; c.flip = dx < 0; c.dist += Math.hypot(sx, sy);
    }
  }
  for (const h of hens) {
    h.t -= dt; h.peck = Math.max(0, h.peck - dt);
    if (h.t <= 0) {
      h.t = 2 + Math.random() * 3;
      if (night) { h.peck = 0; [h.tx, h.ty] = barnSpot(0.9); }
      else if (Math.random() < 0.45) h.peck = 0.6;
      else { h.tx = (8 + Math.random() * 4) * T; h.ty = (11 + Math.random() * 4) * T; }
    }
    const dx = h.tx - h.x, dy = h.ty - h.y, m = Math.hypot(dx, dy);
    h.moving = m > 3 && h.peck <= 0;
    if (h.moving) {
      const sx = (dx / m) * HEN_SPEED * dt, sy = (dy / m) * HEN_SPEED * dt;
      h.x += sx; h.y += sy; h.flip = dx < 0; h.dist += Math.hypot(sx, sy);
    }
  }
  // ducks: same peck/wander pattern as hens, around the pond's edge instead
  for (const d of ducks) {
    d.t -= dt; d.peck = Math.max(0, d.peck - dt);
    if (d.t <= 0) {
      d.t = 2 + Math.random() * 3;
      if (night) { d.peck = 0; [d.tx, d.ty] = barnSpot(0.9); }
      else if (Math.random() < 0.45) d.peck = 0.6;
      else { d.tx = (7.5 + Math.random() * 4) * T; d.ty = (16.5 + Math.random() * 3) * T; }
    }
    const dx = d.tx - d.x, dy = d.ty - d.y, m = Math.hypot(dx, dy);
    d.moving = m > 3 && d.peck <= 0;
    if (d.moving) {
      const sx = (dx / m) * DUCK_SPEED * dt, sy = (dy / m) * DUCK_SPEED * dt;
      d.x += sx; d.y += sy; d.flip = dx < 0; d.dist += Math.hypot(sx, sy);
    }
  }
  // pigs: same wander pattern as the cow, a barnside patch just north of it
  for (const p of pigs) {
    p.t -= dt;
    if (p.t <= 0) {
      p.t = 4 + Math.random() * 5;
      if (night) [p.tx, p.ty] = barnSpot(1.1);
      else { p.tx = (14 + Math.random() * 4) * T; p.ty = (11 + Math.random() * 3) * T; }
    }
    const dx = p.tx - p.x, dy = p.ty - p.y, m = Math.hypot(dx, dy);
    p.moving = m > 4;
    if (p.moving) {
      const sx = (dx / m) * PIG_SPEED * dt, sy = (dy / m) * PIG_SPEED * dt;
      p.x += sx; p.y += sy; p.flip = dx < 0; p.dist += Math.hypot(sx, sy);
    }
  }
  // sheep: same wander pattern, a patch alongside the pigs/cow
  for (const s of sheep) {
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 3 + Math.random() * 5;
      if (night) [s.tx, s.ty] = barnSpot(1.1);
      else { s.tx = (16 + Math.random() * 4) * T; s.ty = (12 + Math.random() * 3) * T; }
    }
    const dx = s.tx - s.x, dy = s.ty - s.y, m = Math.hypot(dx, dy);
    s.moving = m > 4;
    if (s.moving) {
      const sx = (dx / m) * SHEEP_SPEED * dt, sy = (dy / m) * SHEEP_SPEED * dt;
      s.x += sx; s.y += sy; s.flip = dx < 0; s.dist += Math.hypot(sx, sy);
    }
  }
}
