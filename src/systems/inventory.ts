import { INVENTORY_SLOTS } from "../config";
import { FISH } from "../data/fish";
import { JUNK } from "../data/junk";
import { CROPS } from "../data/crops";
import { FORAGE } from "../data/forage";
import { RECIPES } from "../data/recipes";
import { FLOWERS } from "../data/flowers";
import { ROD_TIERS, BAITS } from "../data/fishinggear";

/**
 * Slot-based item store. Pure state + operations, no persistence —
 * economy.ts owns saving/loading (SAVE_KEY pattern).
 */
export interface ItemStack { id: string; qty: number }
export interface Inventory { slots: (ItemStack | null)[] }

/** UI-facing item names. Table-driven goods (fish species, junk) name
 *  themselves from their data tables. */
export const ITEM_NAMES: Record<string, string> = {
  fish: "Fish",             // legacy generic fish from pre-variety saves
  seeds: "Corn seeds (old)", // legacy generic seeds — they plant corn
  hoe: "Hoe",
  rod: "Fishing rod",
  lute: "Lute",
  pot: "Cooking pot",       // Animal-Keeper kit — enables the hearth loop from day one
  pail: "Feed pail",        // Animal-Keeper kit — inert until you own an animal to feed
  hen: "Hen",       // livestock: named for shop rows/toasts, never a bag item
  cow: "Cow",
  duck: "Duck",     // Part C content-library commit 2: three more livestock rows
  pig: "Pig",
  sheep: "Sheep",
  // Part C content-library commit 2: forward-content tool/accessory icons —
  // no mechanic yet, named now so a future gear system has names ready.
  "watering-can": "Watering can",
  basket: "Basket",
  "seed-pouch": "Seed pouch",
  sickle: "Sickle",
  axe: "Axe",
  pickaxe: "Pickaxe",
  sack: "Sack",
  lantern: "Lantern",
  "fishing-net": "Fishing net",
  binoculars: "Binoculars",
  "bait-tin": "Bait tin",
  bucket: "Bucket",
  "straw-hat": "Straw hat",
  boots: "Boots",
  "gift-box": "Gift box",
  "flower-seeds": "Flower seeds",
  ...Object.fromEntries(FISH.map((s) => [s.id, s.name])),
  ...Object.fromEntries(JUNK.map((j) => [j.id, j.name])),
  ...Object.fromEntries(CROPS.map((c) => [c.id, c.name])),
  ...Object.fromEntries(CROPS.map((c) => [c.seedId, c.seedName])),
  ...Object.fromEntries(FORAGE.map((f) => [f.id, f.name])),
  ...Object.fromEntries(RECIPES.map((r) => [r.id, r.name])),
  ...Object.fromEntries(FLOWERS.map((f) => [f.id, f.name])),         // cut flowers
  ...Object.fromEntries(FLOWERS.map((f) => [f.seedId, f.seedName])), // flower seed packets
  ...Object.fromEntries(ROD_TIERS.map((r) => [r.id, r.name])),       // rod tiers (v2 BLOCK #6)
  ...Object.fromEntries(BAITS.map((b) => [b.id, b.name])),           // bait
};

export function createInventory(size = INVENTORY_SLOTS): Inventory {
  return { slots: Array.from({ length: size }, () => null) };
}

function findStack(inv: Inventory, id: string): ItemStack | null {
  for (const s of inv.slots) if (s && s.id === id) return s;
  return null;
}

/** Adds qty of an item, stacking onto an existing slot first. False if the bag is full. */
export function addItem(inv: Inventory, id: string, qty = 1): boolean {
  const stack = findStack(inv, id);
  if (stack) { stack.qty += qty; return true; }
  const free = inv.slots.indexOf(null);
  if (free === -1) return false;
  inv.slots[free] = { id, qty };
  return true;
}

/** Removes qty of an item (clearing emptied slots). False if not enough held. */
export function removeItem(inv: Inventory, id: string, qty = 1): boolean {
  if (countItem(inv, id) < qty) return false;
  for (let i = 0; i < inv.slots.length && qty > 0; i++) {
    const s = inv.slots[i];
    if (!s || s.id !== id) continue;
    const take = Math.min(s.qty, qty);
    s.qty -= take; qty -= take;
    if (s.qty === 0) inv.slots[i] = null;
  }
  return true;
}

export function countItem(inv: Inventory, id: string): number {
  let n = 0;
  for (const s of inv.slots) if (s && s.id === id) n += s.qty;
  return n;
}

/** Rebuilds an inventory from parsed save data, tolerating junk. `size` lets a
 *  larger container (e.g. the barn's 24-slot storage) revive at its own size. */
export function reviveInventory(data: unknown, size = INVENTORY_SLOTS): Inventory {
  const inv = createInventory(size);
  if (data && typeof data === "object" && Array.isArray((data as Inventory).slots)) {
    const slots = (data as Inventory).slots;
    for (let i = 0; i < inv.slots.length && i < slots.length; i++) {
      const s = slots[i];
      if (s && typeof s.id === "string" && typeof s.qty === "number" && s.qty > 0)
        inv.slots[i] = { id: s.id, qty: Math.floor(s.qty) };
    }
  }
  return inv;
}
