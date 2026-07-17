import { RENOVATION_KEY } from "../config";

/**
 * Farm renovation state — which rundown parts have been repaired. Each flag is
 * false while broken (the farm starts fully rundown) and flips to true once the
 * player pays to fix it at the farmhouse. Persisted on its own versioned key so
 * the visible farm survives reloads (Step 8; folded into save hardening in
 * Step 9). Repairs are one-way: there is no re-breaking in the MVP.
 *
 * FENCE-1: the field "fence" part was removed — her farm no longer ships with a
 * pre-placed fence to mend (fencing becomes something she builds later). Old
 * saves that still carry a `fence` flag load cleanly: loadFarm simply doesn't
 * read it, so the stale flag is ignored (no key bump, no crash).
 */

export type FarmPart = "roof" | "window" | "barn";

export interface FarmState {
  version: number;
  roof: boolean;
  window: boolean;
  barn: boolean;
  plotTiers: number;   // purchased farm-plot expansions (money-gated block)
}

function fresh(): FarmState {
  return { version: 1, roof: false, window: false, barn: false, plotTiers: 0 };
}

export function loadFarm(): FarmState {
  try {
    const raw = localStorage.getItem(RENOVATION_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<FarmState>;
    // A pre-FENCE-1 save may still carry a `fence` key — it is intentionally
    // NOT read here (stale flag ignored), so the field just loads open.
    return {
      version: 1, roof: !!p.roof, window: !!p.window, barn: !!p.barn,
      plotTiers: typeof p.plotTiers === "number" ? Math.max(0, Math.floor(p.plotTiers)) : 0,
    };
  } catch {
    return fresh();
  }
}

export function saveFarm(f: FarmState) {
  localStorage.setItem(RENOVATION_KEY, JSON.stringify(f));
}

/** New Game: the whole farm falls back to rundown, expansions included. */
export function resetFarm(f: FarmState) {
  f.roof = f.window = f.barn = false;
  f.plotTiers = 0;
  saveFarm(f);
}

/** How many parts are still broken. */
export function repairsLeft(f: FarmState): number {
  return (f.roof ? 0 : 1) + (f.window ? 0 : 1) + (f.barn ? 0 : 1);
}
