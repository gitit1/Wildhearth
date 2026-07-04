import { FORAGE_TIME, BUSH_RESPAWN } from "../config";
import { BUSHES } from "../world/zones";
import { FORAGE, type ForageLocation } from "../data/forage";
import type { Season } from "./calendar";

/**
 * Foraging: pick a full bush (short timer, like a fishing cast), the bush
 * empties and regrows after a delay. Mirrors systems/fishing.ts. What the
 * pick actually finds rolls against data/forage.ts (foraging-variety block).
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

/**
 * What the pick actually found: a weighted roll over the forage eligible for
 * the current season, location, and Foraging skill (higher skill reaches the
 * gated finds). Berries (floor 0, all seasons) keep this non-empty.
 */
export function resolveForage(skill: number, season: Season, location: ForageLocation = "forest"): string {
  const eligible = FORAGE.filter((e) =>
    e.locations.includes(location) &&
    skill >= e.skillFloor &&
    (!e.seasons || e.seasons.includes(season)));
  if (eligible.length === 0) return "berries";
  const total = eligible.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of eligible) { if ((r -= e.weight) <= 0) return e.id; }
  return eligible[eligible.length - 1]!.id;
}
