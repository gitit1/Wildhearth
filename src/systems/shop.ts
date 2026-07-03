import { HOE_PRICE, SEEDS_PRICE } from "../config";
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

export function tryBuy(e: Economy, entry: ShopEntry): BuyResult {
  if (owned(e, entry)) return "owned";
  if (e.coins < entry.price) return "no-coins";
  if (!addItem(e.inv, entry.id, 1)) return "bag-full";
  e.coins -= entry.price;
  saveEconomy(e);
  return "ok";
}
