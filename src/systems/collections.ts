import { COLLECTIONS_KEY } from "../config";
import { FISH } from "../data/fish";
import { FORAGE } from "../data/forage";
import { ITEM_NAMES } from "./inventory";

/**
 * Collections — the tracked-discovery half of the Memory Book. A generic
 * per-category engine (add entry, X/Y discovered), never one-off code per
 * category. Fish and wild forage are the first live categories (their data
 * tables exist); birds/animals/flowers join through the same engine when the
 * binoculars sighting mechanic arrives (Riverside Fisherwoman block).
 */

export interface CollectionCategory {
  id: string;
  name: string;
  itemIds: string[];          // the full discoverable set (the "/Y")
}

export const CATEGORIES: CollectionCategory[] = [
  { id: "fish",   name: "Fish",        itemIds: FISH.map((f) => f.id) },
  { id: "forage", name: "Wild finds",  itemIds: FORAGE.map((f) => f.id) },
];

export interface Collections { version: number; discovered: Record<string, string[]> }

function fresh(): Collections {
  return { version: 1, discovered: {} };
}

export function loadCollections(): Collections {
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Collections>;
    const c = fresh();
    if (p.discovered && typeof p.discovered === "object") {
      for (const cat of CATEGORIES) {
        const list = (p.discovered as Record<string, unknown>)[cat.id];
        if (Array.isArray(list))
          c.discovered[cat.id] = list.filter((id): id is string => typeof id === "string" && cat.itemIds.includes(id));
      }
    }
    return c;
  } catch {
    return fresh();
  }
}

export function saveCollections(c: Collections) {
  try { localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(c)); } catch { /* private mode */ }
}

export function resetCollections(c: Collections) {
  c.discovered = {};
  saveCollections(c);
}

/** Records a discovery. Returns true only the FIRST time an item is seen —
 *  the caller can celebrate (toast) without double-counting. */
export function discover(c: Collections, categoryId: string, itemId: string): boolean {
  const cat = CATEGORIES.find((x) => x.id === categoryId);
  if (!cat || !cat.itemIds.includes(itemId)) return false;
  const list = c.discovered[categoryId] ?? (c.discovered[categoryId] = []);
  if (list.includes(itemId)) return false;
  list.push(itemId);
  saveCollections(c);
  return true;
}

export function discoveredCount(c: Collections, categoryId: string): number {
  return (c.discovered[categoryId] ?? []).length;
}

export function discoveredName(itemId: string): string {
  return ITEM_NAMES[itemId] ?? itemId;
}
