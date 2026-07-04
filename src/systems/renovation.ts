import { RENOVATION_KEY } from "../config";

/**
 * Farm renovation state — which rundown parts have been repaired. Each flag is
 * false while broken (the farm starts fully rundown) and flips to true once the
 * player pays to fix it at the farmhouse. Persisted on its own versioned key so
 * the visible farm survives reloads (Step 8; folded into save hardening in
 * Step 9). Repairs are one-way: there is no re-breaking in the MVP.
 */

export type FarmPart = "roof" | "window" | "barn" | "fence";

export interface FarmState {
  version: number;
  roof: boolean;
  window: boolean;
  barn: boolean;
  fence: boolean;
}

function fresh(): FarmState {
  return { version: 1, roof: false, window: false, barn: false, fence: false };
}

export function loadFarm(): FarmState {
  try {
    const raw = localStorage.getItem(RENOVATION_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<FarmState>;
    return { version: 1, roof: !!p.roof, window: !!p.window, barn: !!p.barn, fence: !!p.fence };
  } catch {
    return fresh();
  }
}

export function saveFarm(f: FarmState) {
  localStorage.setItem(RENOVATION_KEY, JSON.stringify(f));
}

/** New Game: the whole farm falls back to rundown. */
export function resetFarm(f: FarmState) {
  f.roof = f.window = f.barn = f.fence = false;
  saveFarm(f);
}

/** How many parts are still broken. */
export function repairsLeft(f: FarmState): number {
  return (f.roof ? 0 : 1) + (f.window ? 0 : 1) + (f.barn ? 0 : 1) + (f.fence ? 0 : 1);
}
