import {
  CUSTOMERS_KEY, CUSTOMER_PREMIUM, CUSTOMER_QTY_MAX, CUSTOMER_DAILY_CAP,
} from "../config";
import { FISH } from "../data/fish";
import { CROPS } from "../data/crops";
import { FORAGE } from "../data/forage";
import { RECIPES } from "../data/recipes";
import { FLOWERS } from "../data/flowers";
import type { NpcDef, Role } from "../data/npcs";
import { GOOD_PRICES } from "./economy";
import { countItem, type Inventory } from "./inventory";

/**
 * Customers-to-your-stall (v2 economy block #1). Townsfolk don't just let the
 * player dump goods at a flat-price stall — some of them WALK UP to her own
 * market stall wanting to buy, and pay a premium over the flat rate. This
 * module is the pure RULES half: what each role wants to buy, and rolling a
 * concrete want against what she's actually holding. The physical visit lives
 * on the NPC entity (entities/npc.ts `visit`), and main.ts orchestrates the
 * spawn cadence + the serve transaction (routed through the same sell seam a
 * flat-stall sale fires). Reputation — which will SHIFT these prices and who
 * shows up — is the NEXT block and deliberately absent here.
 */

/** A good-category tag. Membership is derived straight from the data tables, so
 *  a new fish/crop/flower row is a customer-buyable good with zero code here. */
export type GoodCategory = "fish" | "crop" | "forage" | "dish" | "flower";

const CATEGORY_ITEMS: Record<GoodCategory, string[]> = {
  fish: FISH.map((f) => f.id),          // junk deliberately excluded — nobody buys a boot
  crop: CROPS.map((c) => c.id),
  forage: FORAGE.map((f) => f.id),
  dish: RECIPES.map((r) => r.id),
  flower: FLOWERS.map((f) => f.id),
};

/**
 * What each role will buy from the player's stall, in rough preference order.
 * Kept flavour-true (the baker wants ingredients + a posy for the counter; the
 * herbalist wants wild finds; the peddler trades in anything). A role absent
 * here simply never customers — but every plaza-dwelling role is covered.
 */
const CUSTOMER_WANTS: Record<Role, GoodCategory[]> = {
  "stall-fish": ["dish", "flower"],                    // Maren buys fish at her OWN stall; as a customer, a treat
  "stall-produce": ["fish", "dish"],                   // Tobin sells produce, buys the rest
  "stall-goods": ["flower", "dish", "crop", "forage"], // Sera keeps a bit of everything
  farmer: ["fish", "dish", "flower"],                  // Henrik grows his own crops
  baker: ["crop", "forage", "flower"],                 // Petra wants ingredients + a counter posy
  musician: ["flower", "dish"],
  handyman: ["dish", "crop"],
  forager: ["flower", "dish"],                         // Ada rarely leaves the trees, but when she does
  "fisher-kid": ["dish", "flower"],
  peddler: ["fish", "crop", "forage", "dish", "flower"], // Jonas trades in everything
};

/** A concrete thing a customer wants to buy right now. */
export interface CustomerWant {
  itemId: string;
  qty: number;
  unitPrice: number;   // GOOD_PRICES rate marked up by CUSTOMER_PREMIUM
  total: number;       // unitPrice * qty (precomputed for the UI)
}

function priceFor(itemId: string): number {
  return Math.max(1, Math.round((GOOD_PRICES[itemId] ?? 0) * CUSTOMER_PREMIUM));
}

/**
 * Roll a want for one NPC against the player's current backpack: pick a
 * preferred category she actually has stock in, then a held item within it, a
 * quantity capped by both the knob and her stock, at the premium price.
 * Returns null when she's holding nothing this NPC would buy — the caller then
 * simply doesn't send that customer.
 */
export function rollCustomerWant(def: NpcDef, inv: Inventory): CustomerWant | null {
  const prefs = CUSTOMER_WANTS[def.role] ?? [];
  // categories this NPC likes AND the player currently has at least one of
  const stocked = prefs
    .map((cat) => CATEGORY_ITEMS[cat].filter((id) => countItem(inv, id) > 0))
    .filter((ids) => ids.length > 0);
  if (stocked.length === 0) return null;

  const bucket = stocked[Math.floor(Math.random() * stocked.length)]!;
  const itemId = bucket[Math.floor(Math.random() * bucket.length)]!;
  const have = countItem(inv, itemId);
  const qty = Math.max(1, Math.min(have, 1 + Math.floor(Math.random() * CUSTOMER_QTY_MAX)));
  const unitPrice = priceFor(itemId);
  return { itemId, qty, unitPrice, total: unitPrice * qty };
}

// ---- daily ledger (persisted): caps how many sales customers bring per day ----

export interface CustomerLedger { day: number; served: number }

function fresh(): CustomerLedger { return { day: 0, served: 0 }; }

export function loadCustomers(): CustomerLedger {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<CustomerLedger>;
      if (typeof d.day === "number" && typeof d.served === "number")
        return { day: d.day, served: d.served };
    }
  } catch { /* corrupt -> fresh */ }
  return fresh();
}

export function saveCustomers(l: CustomerLedger) {
  try { localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(l)); } catch { /* private mode */ }
}

/** New Game: forget the day's customers. */
export function resetCustomers(l: CustomerLedger) {
  l.day = 0; l.served = 0;
  saveCustomers(l);
}

/** Roll the ledger onto a new day (resets the served count). Idempotent. */
export function rolloverDay(l: CustomerLedger, absDay: number) {
  if (l.day !== absDay) { l.day = absDay; l.served = 0; saveCustomers(l); }
}

/** True while the day still has customer sales left in it. */
export function customersRemain(l: CustomerLedger): boolean {
  return l.served < CUSTOMER_DAILY_CAP;
}

/** Record one served customer. */
export function noteServed(l: CustomerLedger) {
  l.served += 1; saveCustomers(l);
}
