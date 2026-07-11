import { PRODUCE_KEY } from "../config";
import { ANIMAL_PRODUCE, PRODUCE_SPECIES, type ProduceSpecies } from "../data/produce";
import { addItem } from "./inventory";
import { saveStorage, type Storage } from "./storage";
import type { Livestock } from "./livestock";

/**
 * Animal-produce state — the barn's daily collection loop (VISION §122). Feeding
 * an owned animal marks its SPECIES "fed today"; on the next day rollover every
 * fed, owned species leaves its base produce in the barn storage, and the fed
 * flags clear. Its own versioned, junk-tolerant save (like livestock.ts):
 *  - `fed`: which species were fed during the current day.
 *  - `pending`: produce that couldn't fit (barn shelves full) — held over, never
 *    lost, retried on the next rollover.
 *  - `delivered`: what actually landed in the barn since the player last opened
 *    it — surfaces the barn window's "your animals left …" note, then clears.
 *
 * Old saves (no key) load as unfed / nothing pending — exactly as if the loop
 * had never run.
 */

export interface AnimalProduce {
  version: number;
  fed: Record<ProduceSpecies, boolean>;
  pending: Record<string, number>;    // itemId -> qty held (barn was full overnight)
  delivered: Record<string, number>;  // itemId -> qty delivered since the barn was last opened
}

function noneFed(): Record<ProduceSpecies, boolean> {
  return { cow: false, hen: false, duck: false, pig: false, sheep: false };
}

function fresh(): AnimalProduce {
  return { version: 1, fed: noneFed(), pending: {}, delivered: {} };
}

/** Coerces a parsed record into { itemId: positive-int-qty }, dropping junk. */
function counts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object") {
    for (const [k, n] of Object.entries(v as Record<string, unknown>))
      if (typeof n === "number" && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

export function loadAnimalProduce(): AnimalProduce {
  try {
    const raw = localStorage.getItem(PRODUCE_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<AnimalProduce>;
    const fed = noneFed();
    if (p.fed && typeof p.fed === "object")
      for (const s of PRODUCE_SPECIES) fed[s] = !!(p.fed as Record<string, unknown>)[s];
    return { version: 1, fed, pending: counts(p.pending), delivered: counts(p.delivered) };
  } catch {
    return fresh();
  }
}

export function saveAnimalProduce(a: AnimalProduce) {
  try { localStorage.setItem(PRODUCE_KEY, JSON.stringify(a)); }
  catch { /* private mode */ }
}

/** New Game: unfed, nothing pending, nothing to announce. */
export function resetAnimalProduce(a: AnimalProduce) {
  a.fed = noneFed();
  a.pending = {};
  a.delivered = {};
  saveAnimalProduce(a);
}

/** How many of a species the player owns (the cow is unique; the rest flocks). */
function ownedCount(l: Livestock, species: ProduceSpecies): number {
  switch (species) {
    case "cow":   return l.cow ? 1 : 0;
    case "hen":   return l.hens;
    case "duck":  return l.ducks;
    case "pig":   return l.pigs;
    case "sheep": return l.sheep;
  }
}

/** Feeding an animal marks its whole species fed for today (only fed species
 *  produce on the next rollover). Idempotent within a day. */
export function markFed(a: AnimalProduce, species: ProduceSpecies) {
  if (a.fed[species]) return;
  a.fed[species] = true;
  saveAnimalProduce(a);
}

/**
 * Day rollover: deposit each fed, owned species' base produce (one per animal;
 * the cow gives one milk) into the barn storage, plus any pending overflow from
 * before. Anything that won't fit stays pending (honest, never silently lost).
 * Clears the fed flags for the fresh day and accumulates a `delivered` tally for
 * the barn window's note. Returns what actually landed this rollover.
 */
export function collectMorningProduce(
  a: AnimalProduce, livestock: Livestock, storage: Storage,
): Record<string, number> {
  // this morning's yield, merged onto any produce held over from a full barn
  const queue: Record<string, number> = { ...a.pending };
  for (const def of ANIMAL_PRODUCE) {
    if (!a.fed[def.species]) continue;
    const n = ownedCount(livestock, def.species);
    if (n > 0) queue[def.id] = (queue[def.id] ?? 0) + n;
  }

  const delivered: Record<string, number> = {};
  const stillPending: Record<string, number> = {};
  for (const [id, qty] of Object.entries(queue)) {
    if (qty <= 0) continue;
    if (addItem(storage.inv, id, qty)) delivered[id] = qty;   // stacks onto an existing slot or takes a free one
    else stillPending[id] = qty;                              // barn shelves full — hold it over
  }

  a.pending = stillPending;
  a.fed = noneFed();                                          // a new day: nobody's been fed yet
  for (const [id, qty] of Object.entries(delivered))
    a.delivered[id] = (a.delivered[id] ?? 0) + qty;           // accumulate across un-opened days

  if (Object.keys(delivered).length) saveStorage(storage);
  saveAnimalProduce(a);
  return delivered;
}

/** True while produce is waiting to be announced in the barn window. */
export function hasDelivered(a: AnimalProduce): boolean {
  return Object.keys(a.delivered).length > 0;
}

/** Reads and CLEARS the pending "your animals left …" tally (call when the barn
 *  window shows it), so the note appears once per batch of overnight produce. */
export function takeDelivered(a: AnimalProduce): Record<string, number> {
  const d = a.delivered;
  a.delivered = {};
  saveAnimalProduce(a);
  return d;
}
