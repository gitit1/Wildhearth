import { FORAGE_TIME, BUSH_RESPAWN } from "../config";
import { BUSHES } from "../world/zones";

/**
 * Foraging: pick a full berry bush (short timer, like a fishing cast), the
 * bush empties and regrows after a delay. Mirrors systems/fishing.ts.
 */

export interface Bush { x: number; y: number; full: boolean; regrow: number }
export interface ForagingState { picking: boolean; timer: number; bush: Bush | null }

export function createBushes(): Bush[] {
  return BUSHES.map(([x, y]) => ({ x, y, full: true, regrow: 0 }));
}

export function createForaging(): ForagingState {
  return { picking: false, timer: 0, bush: null };
}

export function startPick(f: ForagingState, bush: Bush) {
  if (f.picking || !bush.full) return;
  f.picking = true;
  f.timer = FORAGE_TIME;
  f.bush = bush;
}

export function cancelPick(f: ForagingState) { f.picking = false; f.bush = null; }

/**
 * Ticks pick timer + bush regrowth. Returns the bush exactly on the tick a
 * pick completes (the caller rolls yield / grants skill), else null.
 */
export function updateForaging(f: ForagingState, bushes: Bush[], dt: number): Bush | null {
  for (const b of bushes) {
    if (!b.full) { b.regrow -= dt; if (b.regrow <= 0) b.full = true; }
  }
  if (!f.picking || !f.bush) return null;
  f.timer -= dt;
  if (f.timer > 0) return null;
  const b = f.bush;
  f.picking = false; f.bush = null;
  b.full = false;
  b.regrow = BUSH_RESPAWN;
  return b;
}
