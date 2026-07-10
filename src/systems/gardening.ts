import { GARDEN_KEY } from "../config";
import { FLOWERS, flowerById } from "../data/flowers";

/**
 * Ornamental gardening (base-skill-set block, expanded in R3 to a species
 * system): decorative flower beds by the house, distinct from food crops. You
 * buy a flower species' seed packet (nothing is free), plant it in a bed, WATER
 * it, and it blooms over that species' watered growDays (active tending, like
 * crops — an unwatered bed just waits). A bloom can be CUT for a sellable cut
 * flower. Plant/water/harvest all train the Gardening skill (caller-side).
 * Persisted like every store; save-versioned (v2 adds the species field).
 */

export interface FlowerBed {
  species: string | null;   // planted flower species id (null = empty bed)
  growth: number;           // 0..1 across the species' watered growDays
  watered: boolean;         // watered (by hand or rain) today
  bloomed: boolean;         // fully open, ready to cut
}
export interface Garden { version: number; beds: FlowerBed[] }

export const BED_COUNT = 3;

/** A safe default species for migrating a legacy "planted" bed that carried no
 *  species (v1 saves) — the first floor-0 spring bloom. */
const DEFAULT_SPECIES = FLOWERS.find((f) => f.skillFloor === 0)?.id ?? FLOWERS[0]!.id;

function freshBed(): FlowerBed {
  return { species: null, growth: 0, watered: false, bloomed: false };
}

function fresh(): Garden {
  return { version: 2, beds: Array.from({ length: BED_COUNT }, freshBed) };
}

interface LegacyBed { planted?: boolean; growth?: number; bloomed?: boolean }
interface SavedBed { species?: string | null; growth?: number; watered?: boolean; bloomed?: boolean }

export function loadGarden(): Garden {
  try {
    const raw = localStorage.getItem(GARDEN_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as { version?: number; beds?: (SavedBed & LegacyBed)[] };
    const g = fresh();
    if (Array.isArray(p.beds)) {
      for (let i = 0; i < g.beds.length && i < p.beds.length; i++) {
        const b = p.beds[i];
        if (!b) continue;
        const growth = typeof b.growth === "number" ? Math.max(0, Math.min(1, b.growth)) : 0;
        // v2 shape: a species field. v1 shape: {planted,growth,bloomed} with no
        // species — a planted legacy bed adopts the default species so its
        // in-bloom state survives the migration.
        let species: string | null = null;
        if (typeof b.species === "string" && flowerById(b.species)) species = b.species;
        else if (b.planted) species = DEFAULT_SPECIES;
        g.beds[i] = {
          species,
          growth,
          watered: !!b.watered,
          bloomed: species ? !!b.bloomed : false,
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
  g.beds = fresh().beds;
  saveGarden(g);
}

/** Plant a species in a bed. `watered` seeds the first day's water (a rainy
 *  planting waters itself for free, like a crop). */
export function plantBed(bed: FlowerBed, speciesId: string, watered = false) {
  bed.species = speciesId;
  bed.growth = 0;
  bed.watered = watered;
  bed.bloomed = false;
}

/** Cut the bloom: returns the species id harvested (a sellable cut flower) and
 *  empties the bed. Null if the bed isn't in bloom. */
export function harvestBed(bed: FlowerBed): string | null {
  if (!bed.species || !bed.bloomed) return null;
  const id = bed.species;
  Object.assign(bed, freshBed());
  return id;
}

/**
 * Blooms WATERED, planted, un-bloomed beds over their species' growDays of
 * watered in-game time (unwatered beds simply wait — active tending). Returns
 * true if any bed just bloomed (caller persists + toasts).
 */
export function updateGarden(g: Garden, dt: number, daySeconds: number): boolean {
  let bloomedNow = false;
  for (const b of g.beds) {
    if (!b.species || b.bloomed || !b.watered) continue;
    const sp = flowerById(b.species);
    if (!sp) continue;
    b.growth += dt / (sp.growDays * daySeconds);
    if (b.growth >= 1) { b.growth = 1; b.bloomed = true; bloomedNow = true; }
  }
  return bloomedNow;
}

/**
 * The day turning over (call once per new in-game day, AFTER the weather
 * reroll, mirroring rollPlotsDay): rain waters every growing bed for free;
 * hand-watering is per-day, so yesterday's water drains. Flowers are forgiving
 * — an unwatered bed just pauses, it never wilts.
 */
export function rollGardenDay(g: Garden, raining: boolean) {
  for (const b of g.beds) {
    if (!b.species || b.bloomed) continue;
    b.watered = raining;
  }
  saveGarden(g);
}
