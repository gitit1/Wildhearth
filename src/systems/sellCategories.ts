import { FISH } from "../data/fish";
import { JUNK } from "../data/junk";
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
  /** Does this player currently have the capability? */
  applies: (ctx: SellContext) => boolean;
  /** The good ids this category claims at the stall. */
  itemIds: string[];
}

const fishing: SellCategory = {
  id: "fishing",
  // capability: owns a rod, has ever recorded a catch, or is holding fish
  // from an older save — any of these makes the fish counter theirs
  applies: (ctx) =>
    countItem(ctx.inv, "rod") > 0 ||
    discoveredCount(ctx.collections, "fish") > 0 ||
    countItem(ctx.inv, "fish") > 0,
  itemIds: [...FISH.map((f) => f.id), ...JUNK.map((j) => j.id), "fish"],
};

export const SELL_CATEGORIES: SellCategory[] = [fishing];

const claimed = new Set(SELL_CATEGORIES.flatMap((c) => c.itemIds));

/** The good ids this player's stall sells right now: everything unclaimed
 *  (categories not built yet) plus each applying category's goods — in
 *  GOOD_PRICES order, so active-category rows render exactly as before. */
export function sellableGoodIds(ctx: SellContext): string[] {
  const active = new Set(
    SELL_CATEGORIES.filter((c) => c.applies(ctx)).flatMap((c) => c.itemIds));
  return Object.keys(GOOD_PRICES).filter((id) => !claimed.has(id) || active.has(id));
}
