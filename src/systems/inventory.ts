import { INVENTORY_SLOTS } from "../config";

/**
 * Slot-based item store. Pure state + operations, no persistence —
 * economy.ts owns saving/loading (SAVE_KEY pattern).
 */
export interface ItemStack { id: string; qty: number }
export interface Inventory { slots: (ItemStack | null)[] }

/** UI-facing item names. */
export const ITEM_NAMES: Record<string, string> = {
  fish: "Fish",
  berries: "Berries",
  hoe: "Hoe",
  seeds: "Seeds",
  corn: "Corn",
  rod: "Fishing rod",
  lute: "Lute",
  hen: "Hen",       // livestock: named for shop rows/toasts, never a bag item
  cow: "Cow",
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

/** Rebuilds an inventory from parsed save data, tolerating junk. */
export function reviveInventory(data: unknown): Inventory {
  const inv = createInventory();
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
