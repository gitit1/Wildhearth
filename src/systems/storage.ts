import { STORAGE_KEY } from "../config";
import {
  Inventory, createInventory, reviveInventory, addItem, removeItem, countItem, type ItemStack,
} from "./inventory";
import { saveEconomy, type Economy } from "./economy";

/**
 * Barn storage (R5 — the barn's first real mechanic): a persistent chest that
 * holds items OUT of the backpack, so the 12-slot bag isn't the only container
 * (DECISIONS "Bank/storage v1: backpack only. v3+: house storage" — this is a
 * modest early step toward that). Its own versioned save key, independent of
 * the backpack. Deposit/withdraw move whole stacks between the two inventories,
 * reusing the backpack's own stacking ops so a deposit merges onto a same-id
 * stack already in the barn.
 */

export const STORAGE_SLOTS = 24;

export interface Storage { version: number; inv: Inventory }

export function createStorage(): Storage {
  return { version: 1, inv: createInventory(STORAGE_SLOTS) };
}

export function loadStorage(): Storage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStorage();
    const data = JSON.parse(raw) as { version?: number; inv?: unknown };
    return { version: 1, inv: reviveInventory(data.inv, STORAGE_SLOTS) };
  } catch {
    return createStorage();
  }
}

export function saveStorage(s: Storage) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, inv: s.inv })); }
  catch { /* private mode */ }
}

export function resetStorage(s: Storage) {
  s.inv = createStorage().inv;
  saveStorage(s);
}

/** Move a whole backpack stack (at slot index `i`) into the barn. Returns false
 *  if the slot is empty or the barn has no room for a new stack. */
export function deposit(s: Storage, e: Economy, i: number): boolean {
  const stack = e.inv.slots[i];
  if (!stack) return false;
  if (!addItem(s.inv, stack.id, stack.qty)) return false;   // barn full (no matching/free slot)
  removeItem(e.inv, stack.id, stack.qty);
  saveStorage(s);
  saveEconomy(e);
  return true;
}

/** Move a whole barn stack (at slot index `i`) back into the backpack. Returns
 *  false if the slot is empty or the backpack is full. */
export function withdraw(s: Storage, e: Economy, i: number): boolean {
  const stack = s.inv.slots[i];
  if (!stack) return false;
  if (!addItem(e.inv, stack.id, stack.qty)) return false;   // backpack full
  removeItem(s.inv, stack.id, stack.qty);
  saveStorage(s);
  saveEconomy(e);
  return true;
}

export function storageCount(s: Storage, id: string): number { return countItem(s.inv, id); }
export type { ItemStack };
