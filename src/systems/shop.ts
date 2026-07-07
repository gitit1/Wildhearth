import { HOE_PRICE, ROD_PRICE, HEN_PRICE, COW_PRICE, FLOWER_SEEDS_PRICE, HAGGLE_MAX_DISCOUNT } from "../config";
import { CROPS } from "../data/crops";
import { addItem, countItem } from "./inventory";
import { saveEconomy, type Economy } from "./economy";
import { saveLivestock, type Livestock } from "./livestock";
import type { FarmState } from "./renovation";
import type { Season } from "./calendar";
import type { StallDef } from "../world/zones";

/**
 * The stall's buy side: a small fixed price list. Buying removes coins and
 * adds an inventory item; tools are unique (you own one hoe, not a stack).
 * Livestock entries are special: they don't enter the backpack — a purchased
 * animal joins the farmyard — and they require the barn mended first
 * (animals need a sound home; the no-free-animals fix).
 */

export interface ShopEntry {
  id: string;
  price: number;
  unique?: boolean;
  livestock?: "hen" | "cow";
  seasons?: Season[];        // stocked only in these seasons (seed packets)
}

export const SHOP_STOCK: ShopEntry[] = [
  { id: "hoe", price: HOE_PRICE, unique: true },
  { id: "rod", price: ROD_PRICE, unique: true },   // fishing is a hard tool gate — the rod must be buyable
  // one packet per crop, stocked in the seasons it can actually be planted —
  // the stall doesn't sell what would only wilt in the bag
  ...CROPS.map((c): ShopEntry => ({ id: c.seedId, price: c.seedPrice, seasons: c.seasons })),
  { id: "flower-seeds", price: FLOWER_SEEDS_PRICE },   // ornamental gardening
  { id: "hen", price: HEN_PRICE, livestock: "hen" },
  { id: "cow", price: COW_PRICE, livestock: "cow", unique: true },
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

/**
 * NPC stalls of matching specialty (DECISIONS "Selling paths" #2) — a small,
 * data-driven table of {stall, npc, category} rows. Maren's fish stall is the
 * only ACTIVE row in v1; adding Tobin's produce stall later (once a `farming`
 * SellCategory exists) is one more row here, not new dispatch code.
 */
export interface NpcStallTrade {
  npcId: string;              // whose presence (schedule.ts's "atWork") gates the window
  stallSign: StallDef["sign"];// which MARKET_STALLS entry the trade sits on
  categoryId: string;         // the SellCategory (sellCategories.ts) this stall buys
  closedLine: string;         // shown (as prompt + toast) when the npc isn't manning the stall
}

export const NPC_STALL_TRADES: NpcStallTrade[] = [
  {
    npcId: "maren", stallSign: "fish", categoryId: "fishing",
    closedLine: "Maren's off today — the market square misses her.",
  },
];

export type LivestockBuyResult = "ok" | "no-coins" | "no-barn" | "owned";

/** Buys an animal: needs the barn mended, doesn't touch the backpack. */
export function tryBuyLivestock(
  e: Economy, entry: ShopEntry, farm: FarmState, ls: Livestock, hagglingSkill = 0,
): LivestockBuyResult {
  if (entry.livestock === "cow" && ls.cow) return "owned";
  if (!farm.barn) return "no-barn";
  const price = discountedPrice(entry.price, hagglingSkill);
  if (e.coins < price) return "no-coins";
  e.coins -= price;
  saveEconomy(e);
  if (entry.livestock === "cow") ls.cow = true;
  else ls.hens += 1;
  saveLivestock(ls);
  return "ok";
}
