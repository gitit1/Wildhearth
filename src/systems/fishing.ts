import { FISH_TIME_MIN, FISH_TIME_MAX, FISHING_BITE_REDUCTION } from "../config";

/** Fishing: start near the pond, wait for a bite, land a fish. */
export interface FishingState { casting: boolean; timer: number }

export function createFishing(): FishingState {
  return { casting: false, timer: 0 };
}

/** Higher Fishing skill (0-100) shortens the wait for a bite. */
export function startCast(f: FishingState, fishingSkill = 0) {
  f.casting = true;
  const wait = FISH_TIME_MIN + Math.random() * (FISH_TIME_MAX - FISH_TIME_MIN);
  f.timer = wait * (1 - FISHING_BITE_REDUCTION * (fishingSkill / 100));
}

/** Returns true exactly on the tick a fish is caught. */
export function updateFishing(f: FishingState, dt: number): boolean {
  if (!f.casting) return false;
  f.timer -= dt;
  if (f.timer <= 0) { f.casting = false; return true; }
  return false;
}

export function cancelCast(f: FishingState) { f.casting = false; }
