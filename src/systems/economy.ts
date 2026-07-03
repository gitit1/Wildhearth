import { FISH_PRICE, BERRY_PRICE, SAVE_KEY } from "../config";
import {
  Inventory, createInventory, reviveInventory, addItem, removeItem, countItem,
} from "./inventory";

/** What the market stall pays per unit. Grows as new goods are introduced. */
export const GOOD_PRICES: Record<string, number> = {
  fish: FISH_PRICE,
  berries: BERRY_PRICE,
};

/** Player wallet + backpack. Coins are currency (not a slot item). */
export interface Economy { coins: number; inv: Inventory }

interface SaveV2 { version: 2; coins: number; inv: Inventory }
interface SaveV1 { coins?: number; fish?: number }

export function loadEconomy(): Economy {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as SaveV2 | SaveV1;
      if ((data as SaveV2).version === 2) {
        const v2 = data as SaveV2;
        return { coins: v2.coins || 0, inv: reviveInventory(v2.inv) };
      }
      // legacy v1 shape: {coins, fish} — fish becomes an inventory item
      const v1 = data as SaveV1;
      const e: Economy = { coins: v1.coins || 0, inv: createInventory() };
      if (v1.fish && v1.fish > 0) addItem(e.inv, "fish", v1.fish);
      saveEconomy(e);
      return e;
    }
  } catch { /* corrupted save -> fresh start */ }
  return { coins: 0, inv: createInventory() };
}

export function saveEconomy(e: Economy) {
  const data: SaveV2 = { version: 2, coins: e.coins, inv: e.inv };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
}

/** Adds an item to the backpack and saves. False if the bag is full. */
export function gainItem(e: Economy, id: string, qty = 1): boolean {
  const ok = addItem(e.inv, id, qty);
  if (ok) saveEconomy(e);
  return ok;
}

export function fishCount(e: Economy): number { return countItem(e.inv, "fish"); }

export function goodCount(e: Economy, id: string): number { return countItem(e.inv, id); }

/** Sells the whole held stock of one priced good; returns coins earned. */
export function sellGood(e: Economy, id: string): number {
  const price = GOOD_PRICES[id];
  const n = countItem(e.inv, id);
  if (!price || n === 0) return 0;
  removeItem(e.inv, id, n);
  const earned = n * price;
  e.coins += earned;
  saveEconomy(e);
  return earned;
}

/** Sells everything with a price; returns total coins earned. */
export function sellAllGoods(e: Economy): number {
  let earned = 0;
  for (const id of Object.keys(GOOD_PRICES)) earned += sellGood(e, id);
  return earned;
}
