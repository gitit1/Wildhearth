import { LIVESTOCK_KEY } from "../config";

/**
 * Owned animals — the "no free animals" fix (ROADMAP_EXPANSION). The MVP demo
 * spawned a cow and hens for free, contradicting the earned-economy pillar;
 * now animals exist only once purchased at the stall (with the barn mended
 * first — they need a sound home). Versioned + junk-tolerant like every store.
 *
 * Part C content-library commit 2 adds duck/pig/sheep as three more flock
 * counters (same shape as `hens` — no per-species uniqueness, unlike the
 * cow). Extended TOLERANTLY: an old save missing these keys just loads as
 * zero of each, same as `hens` always has for a save from before livestock
 * existed at all.
 */

export interface Livestock {
  version: number;
  cow: boolean;   // one milk cow (unique, like the hoe)
  hens: number;   // a flock grows one purchase at a time
  ducks: number;
  pigs: number;
  sheep: number;
}

function fresh(): Livestock {
  return { version: 1, cow: false, hens: 0, ducks: 0, pigs: 0, sheep: 0 };
}

function count(v: unknown): number {
  return typeof v === "number" && v > 0 ? Math.floor(v) : 0;
}

export function loadLivestock(): Livestock {
  try {
    const raw = localStorage.getItem(LIVESTOCK_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Livestock>;
    return {
      version: 1,
      cow: !!p.cow,
      hens: count(p.hens),
      ducks: count(p.ducks),
      pigs: count(p.pigs),
      sheep: count(p.sheep),
    };
  } catch {
    return fresh();
  }
}

export function saveLivestock(l: Livestock) {
  try { localStorage.setItem(LIVESTOCK_KEY, JSON.stringify(l)); }
  catch { /* private mode */ }
}

/** New Game: back to no animals — nothing is free. */
export function resetLivestock(l: Livestock) {
  l.cow = false;
  l.hens = 0;
  l.ducks = 0;
  l.pigs = 0;
  l.sheep = 0;
  saveLivestock(l);
}
