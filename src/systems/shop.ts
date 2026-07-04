import { HOE_PRICE, SEEDS_PRICE, HAGGLE_MAX_DISCOUNT } from "../config";
import { addItem, countItem } from "./inventory";
import { saveEconomy, type Economy } from "./economy";

/**
 * The stall's buy side: a small fixed price list, just enough for Step 5
 * (farming needs a hoe + seeds). Buying removes coins and adds an inventory
 * item; tools are unique (you own one hoe, not a stack).
 */

export interface ShopEntry { id: string; price: number; unique?: boolean }

export const SHOP_STOCK: ShopEntry[] = [
  { id: "hoe", price: HOE_PRICE, unique: true },
  { id: "seeds", price: SEEDS_PRICE },
];

export type BuyResult = "ok" | "no-coins" | "owned" | "bag-full";

export function owned(e: Economy, entry: ShopEntry): boolean {
  return !!entry.unique && countItem(e.inv, entry.id) > 0;
}

/** Haggling shaves prices linearly, up to HAGGLE_MAX_DISCOUNT at skill 100. */
export function discountedPrice(price: number, hagglingSkill: number): number {
  return Math.max(1, Math.round(price * (1 - HAGGLE_MAX_DISCOUNT * (hagglingSkill / 100))));
}

export function tryBuy(e: Economy, entry: ShopEntry, hagglingSkill = 0): BuyResult {
  if (owned(e, entry)) return "owned";
  const price = discountedPrice(entry.price, hagglingSkill);
  if (e.coins < price) return "no-coins";
  if (!addItem(e.inv, entry.id, 1)) return "bag-full";
  e.coins -= price;
  saveEconomy(e);
  return "ok";
}
