import { LIVESTOCK_KEY } from "../config";

/**
 * Owned animals — the "no free animals" fix (ROADMAP_EXPANSION). The MVP demo
 * spawned a cow and hens for free, contradicting the earned-economy pillar;
 * now animals exist only once purchased at the stall (with the barn mended
 * first — they need a sound home). Versioned + junk-tolerant like every store.
 */

export interface Livestock {
  version: number;
  cow: boolean;   // one milk cow (unique, like the hoe)
  hens: number;   // a flock grows one purchase at a time
}

function fresh(): Livestock {
  return { version: 1, cow: false, hens: 0 };
}

export function loadLivestock(): Livestock {
  try {
    const raw = localStorage.getItem(LIVESTOCK_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Livestock>;
    return {
      version: 1,
      cow: !!p.cow,
      hens: typeof p.hens === "number" && p.hens > 0 ? Math.floor(p.hens) : 0,
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
  saveLivestock(l);
}
