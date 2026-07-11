/**
 * Owned transportation (v2 BLOCK #5, ROADMAP_TO_V5 §v2 — "boats (Fisherwoman),
 * then horses/carriages tied to a town stable"; VISION §9 Transportation). The
 * town STABLE sells old-world transport, money-gated like everything else. This
 * module is the pure RULES half: the catalogue, the ownership store, and the
 * read helpers that turn ownership into concrete effects (overland mount speed,
 * fast-travel fare discount, the boat's dock unlock). main.ts owns the live
 * object, the mount toggle, and the render; the stable window (ui/stablewindow)
 * is pure presentation over `TRANSPORT_ITEMS` + `buyTransport`.
 *
 * Store convention matches discovery.ts / reputation.ts: versioned, tolerant of
 * corrupt/partial saves, private-mode safe, nothing runs at import time. Only
 * OWNERSHIP is persisted — whether she is currently mounted is a live session
 * flag main.ts holds (she dismounts on reload; you never wake up on a horse).
 */
import {
  TRANSPORT_KEY, ROWBOAT_PRICE, HORSE_PRICE, CARRIAGE_PRICE,
  MOUNT_SPEED_MULT, HORSE_FARE_DISCOUNT, CARRIAGE_FARE_DISCOUNT,
} from "../config";
import { saveEconomy, type Economy } from "./economy";

export type TransportId = "rowboat" | "horse" | "carriage";

export interface Transport {
  version: 1;
  rowboat: boolean;
  horse: boolean;
  carriage: boolean;
}

/** A sale row for the stable window: what it is, what it does, what it costs. */
export interface TransportItem {
  id: TransportId;
  name: string;
  icon: string;
  price: number;
  blurb: string;     // shop line — what owning it does for her
  boughtLine: string;// toast on purchase
}

/** The stable's stock, in the order a poor newcomer grows into it: the boat is
 *  the entry buy, the horse a solid saving, the carriage the luxury top. */
export const TRANSPORT_ITEMS: readonly TransportItem[] = [
  {
    id: "rowboat", name: "Rowboat", icon: "🛶", price: ROWBOAT_PRICE,
    blurb: "A little boat of your own — take it out from any dock.",
    boughtLine: "A rowboat of your own! It's moored and waiting at the dock.",
  },
  {
    id: "horse", name: "Horse", icon: "🐴", price: HORSE_PRICE,
    blurb: "Ride overland far faster — and never tire on the road. Press R to mount.",
    boughtLine: "A horse of your own! Press R to swing up and ride.",
  },
  {
    id: "carriage", name: "Carriage", icon: "🎠", price: CARRIAGE_PRICE,
    blurb: "Your own coach — fast travel between known places costs no fare.",
    boughtLine: "A carriage of your own! No coachman to pay from now on.",
  },
] as const;

export function transportItem(id: TransportId): TransportItem {
  return TRANSPORT_ITEMS.find((t) => t.id === id)!;
}

const asBool = (v: unknown): boolean => v === true;

function fresh(): Transport {
  return { version: 1, rowboat: false, horse: false, carriage: false };
}

// ---- persistence ------------------------------------------------------------

export function loadTransport(): Transport {
  try {
    const raw = localStorage.getItem(TRANSPORT_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Transport>;
    return {
      version: 1,
      rowboat: asBool(p.rowboat),
      horse: asBool(p.horse),
      carriage: asBool(p.carriage),
    };
  } catch {
    return fresh();
  }
}

export function saveTransport(t: Transport) {
  try { localStorage.setItem(TRANSPORT_KEY, JSON.stringify(t)); } catch { /* private mode */ }
}

/** New Game: she owns nothing again — back on her own two feet. */
export function resetTransport(t: Transport) {
  t.rowboat = false; t.horse = false; t.carriage = false;
  saveTransport(t);
}

// ---- reads ------------------------------------------------------------------

export function ownsTransport(t: Transport, id: TransportId): boolean {
  return t[id];
}

/** Overland walk-speed multiplier while the flag says she's mounted (only the
 *  horse grants it; caller passes whether she's currently riding). */
export function mountSpeedMult(mounted: boolean): number {
  return mounted ? MOUNT_SPEED_MULT : 1;
}

/** The best fast-travel fare discount she owns (0..1): the carriage (her own
 *  coach — free) beats the horse (she rides part-way herself). Applied to the
 *  block #4 fare in main.ts, so one number modulates the whole travel economy. */
export function fareDiscount(t: Transport): number {
  return Math.max(
    t.carriage ? CARRIAGE_FARE_DISCOUNT : 0,
    t.horse ? HORSE_FARE_DISCOUNT : 0,
  );
}

// ---- writes -----------------------------------------------------------------

export type TransportBuyResult = "ok" | "owned" | "no-coins";

/** Buy a vehicle: money-gated, one of each. Deducts coins + saves both stores. */
export function buyTransport(e: Economy, t: Transport, id: TransportId): TransportBuyResult {
  if (t[id]) return "owned";
  const price = transportItem(id).price;
  if (e.coins < price) return "no-coins";
  e.coins -= price;
  saveEconomy(e);
  t[id] = true;
  saveTransport(t);
  return "ok";
}
