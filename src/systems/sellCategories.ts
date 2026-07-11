import { FISH } from "../data/fish";
import { JUNK } from "../data/junk";
import { CROPS } from "../data/crops";
import { FORAGE } from "../data/forage";
import { FLOWERS } from "../data/flowers";
import { NEW_PRODUCE } from "../data/produce";
import { GOOD_PRICES } from "./economy";
import { countItem, type Inventory } from "./inventory";
import { discoveredCount, type Collections } from "./collections";

/**
 * Path-aware stall selling (stall-selling block, Fishing scope). The sell
 * surface shows categories the player actually HAS, gated on capability —
 * owns the tool / has done the thing — never on a frozen day-one path label.
 * Goods no category claims yet (crops, forage, dishes...) pass through
 * untouched until their own category block lands; adding one is a single
 * entry in SELL_CATEGORIES, not a change to this dispatch.
 */

export interface SellContext {
  inv: Inventory;
  collections: Collections;
}

export interface SellCategory {
  id: string;
  /** Plural noun for stall UI ("fish", "produce") — button/empty-state text. */
  label: string;
  /** Does this player currently have the capability? */
  applies: (ctx: SellContext) => boolean;
  /** The good ids this category claims at the stall. */
  itemIds: string[];
}

const fishing: SellCategory = {
  id: "fishing",
  label: "fish",
  // capability: owns a rod, has ever recorded a catch, or is holding fish
  // from an older save — any of these makes the fish counter theirs
  applies: (ctx) =>
    countItem(ctx.inv, "rod") > 0 ||
    discoveredCount(ctx.collections, "fish") > 0 ||
    countItem(ctx.inv, "fish") > 0,
  itemIds: [...FISH.map((f) => f.id), ...JUNK.map((j) => j.id), "fish"],
};

// The town greengrocer's basket (v2 BLOCK #3): everything the land yields —
// crops, wild forage and cut flowers. `applies: () => true` keeps these freely
// sellable at the PLAYER'S own stall exactly as before (they were previously
// "unclaimed" pass-through goods); the category exists so the greengrocer can
// buy the whole produce basket at a reputation-scaled premium via categoryItemIds.
const produce: SellCategory = {
  id: "produce",
  label: "produce",
  applies: () => true,
  // crops, wild forage, cut flowers, and now the barn's animal produce (milk,
  // eggs, wool) — the whole farmyard basket the greengrocer buys. The pig's
  // truffle is already a FORAGE id above, so NEW_PRODUCE (which excludes it)
  // avoids listing it twice.
  itemIds: [...CROPS.map((c) => c.id), ...FORAGE.map((f) => f.id), ...FLOWERS.map((f) => f.id),
    ...NEW_PRODUCE.map((p) => p.id)],
};

export const SELL_CATEGORIES: SellCategory[] = [fishing, produce];

/** Looks up a category by id (e.g. an NPC-stall trade's `categoryId`). */
export function categoryById(id: string): SellCategory | undefined {
  return SELL_CATEGORIES.find((c) => c.id === id);
}

/** The good ids ONE category claims, regardless of whether the player's OWN
 *  stall currently surfaces it — an NPC-specialty stall (Maren's fish stall)
 *  buys its category's goods independent of the player's own capability gate. */
export function categoryItemIds(id: string): string[] {
  return categoryById(id)?.itemIds ?? [];
}

const claimed = new Set(SELL_CATEGORIES.flatMap((c) => c.itemIds));

/** The good ids this player's stall sells right now: everything unclaimed
 *  (categories not built yet) plus each applying category's goods — in
 *  GOOD_PRICES order, so active-category rows render exactly as before. */
export function sellableGoodIds(ctx: SellContext): string[] {
  const active = new Set(
    SELL_CATEGORIES.filter((c) => c.applies(ctx)).flatMap((c) => c.itemIds));
  return Object.keys(GOOD_PRICES).filter((id) => !claimed.has(id) || active.has(id));
}
