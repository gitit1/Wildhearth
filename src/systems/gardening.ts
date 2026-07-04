import { GARDEN_KEY, FLOWER_GROW_DAYS } from "../config";

/**
 * Ornamental gardening (base-skill-set block): decorative flower beds by the
 * house, distinct from food crops. Plant flower seeds (a stall purchase —
 * nothing is free), the bed blooms over a stretch of the day and stays in
 * bloom; planting trains the Gardening skill. Persisted like every store.
 */

export interface FlowerBed { planted: boolean; growth: number; bloomed: boolean }
export interface Garden { version: number; beds: FlowerBed[] }

export const BED_COUNT = 3;

function fresh(): Garden {
  return { version: 1, beds: Array.from({ length: BED_COUNT }, () => ({ planted: false, growth: 0, bloomed: false })) };
}

export function loadGarden(): Garden {
  try {
    const raw = localStorage.getItem(GARDEN_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Garden>;
    const g = fresh();
    if (Array.isArray(p.beds)) {
      for (let i = 0; i < g.beds.length && i < p.beds.length; i++) {
        const b = p.beds[i];
        if (!b) continue;
        g.beds[i] = {
          planted: !!b.planted,
          growth: typeof b.growth === "number" ? Math.max(0, Math.min(1, b.growth)) : 0,
          bloomed: !!b.bloomed,
        };
      }
    }
    return g;
  } catch {
    return fresh();
  }
}

export function saveGarden(g: Garden) {
  try { localStorage.setItem(GARDEN_KEY, JSON.stringify(g)); } catch { /* private mode */ }
}

export function resetGarden(g: Garden) {
  const f = fresh();
  g.beds = f.beds;
  saveGarden(g);
}

/** Blooms planted beds over FLOWER_GROW_DAYS of in-game time.
 *  Returns true if any bed just bloomed (caller persists + toasts). */
export function updateGarden(g: Garden, dt: number, daySeconds: number): boolean {
  let bloomedNow = false;
  for (const b of g.beds) {
    if (!b.planted || b.bloomed) continue;
    b.growth += dt / (FLOWER_GROW_DAYS * daySeconds);
    if (b.growth >= 1) { b.growth = 1; b.bloomed = true; bloomedNow = true; }
  }
  return bloomedNow;
}
