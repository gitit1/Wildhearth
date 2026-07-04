import { BUSK_TIME, BUSK_TIP_MIN, BUSK_TIP_BASE_MAX, BUSK_TIP_SKILL_BONUS } from "../config";

/**
 * Busking: play a short performance at the busking spot, earn a
 * skill-weighted random tip in coins (no inventory item). Mirrors the
 * fishing/foraging/farm-work state machines.
 */

export interface BuskingState { playing: boolean; timer: number }

export function createBusking(): BuskingState {
  return { playing: false, timer: 0 };
}

export function startBusk(b: BuskingState) {
  if (b.playing) return;
  b.playing = true;
  b.timer = BUSK_TIME;
}

export function cancelBusk(b: BuskingState) { b.playing = false; }

/** Returns true exactly on the tick a performance finishes. */
export function updateBusking(b: BuskingState, dt: number): boolean {
  if (!b.playing) return false;
  b.timer -= dt;
  if (b.timer > 0) return false;
  b.playing = false;
  return true;
}

/** Tip roll: 1-3 coins at skill 0; up to +5 more unlocked toward skill 100. */
export function rollTip(buskingSkill: number): number {
  const base = BUSK_TIP_MIN + Math.floor(Math.random() * (BUSK_TIP_BASE_MAX - BUSK_TIP_MIN + 1));
  const bonusRange = Math.floor(BUSK_TIP_SKILL_BONUS * (buskingSkill / 100));
  const bonus = bonusRange > 0 ? Math.floor(Math.random() * (bonusRange + 1)) : 0;
  return base + bonus;
}
