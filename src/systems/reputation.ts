/**
 * Town Reputation / Fame (v2 economy block #2, ROADMAP_TO_V5 §v2 —
 * "`systems/reputation.ts` — town-wide Fame, independent of any one NPC and of
 * Haggling"). VISION §Economy borrows UO's fame/karma: ONE town-facing 0-100
 * number that shifts how the town at large treats the player, distinct from any
 * single NPC's Friendship (relationships.ts) and from the Haggling skill — all
 * three move independently.
 *
 * This module is the pure RULES half: the store, the tier ladder, the earn/lose
 * math, and the read-only helpers that turn Fame into concrete economy effects
 * (the customer price premium, the daily-sales cap, the spawn-odds bonus).
 * main.ts owns the live object and calls in at the seams block #1 left waiting:
 * a served customer and a completed quest and festival turnout RAISE Fame; a
 * customer left to time out LOWERS it — gently (DECISIONS' forgiving tone: the
 * timeout loss is smaller than a sale's gain, so engaging always nets positive).
 *
 * Store convention matches relationships.ts / customers.ts: versioned, tolerant
 * of corrupt/partial saves, private-mode safe, nothing at import time.
 */
import {
  REPUTATION_KEY, REP_LOSS_TIMEOUT, REP_DECAY_IDLE_DAYS, REP_DECAY_PER_DAY,
  REP_PREMIUM_MIN, REP_PREMIUM_MAX, REP_DAILY_CAP_BONUS_MAX, REP_SPAWN_CHANCE_BONUS_MAX,
  CUSTOMER_DAILY_CAP, REP_BUY_DISCOUNT_MAX,
} from "../config";

export interface Reputation {
  version: 1;
  fame: number;         // 0-100, town-wide
  lastGainDay: number;  // absoluteDay of the last fame-earning act (drives idle decay); -1 = never
}

/** A named band of Fame, warm-worded (Unknown → … → Beloved). The lowest whose
 *  `min` the current Fame clears is the active tier. */
export interface RepTier { name: string; min: number }

/** The tier ladder. Five warm steps across the 0-100 range — the "town respects
 *  you" scale VISION asks for. Kept here so UI + AI + decay all read one source. */
export const REP_TIERS: readonly RepTier[] = [
  { name: "Unknown", min: 0 },
  { name: "Familiar Face", min: 20 },
  { name: "Well-Liked", min: 40 },
  { name: "Respected", min: 60 },
  { name: "Beloved", min: 80 },
] as const;

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function fresh(): Reputation { return { version: 1, fame: 0, lastGainDay: -1 }; }

// ---- persistence ------------------------------------------------------------

export function loadReputation(): Reputation {
  try {
    const raw = localStorage.getItem(REPUTATION_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Reputation>;
    return {
      version: 1,
      fame: clamp100(round1(num(p.fame, 0))),
      lastGainDay: Math.floor(num(p.lastGainDay, -1)),
    };
  } catch {
    return fresh();
  }
}

export function saveReputation(r: Reputation) {
  try { localStorage.setItem(REPUTATION_KEY, JSON.stringify(r)); } catch { /* private mode */ }
}

/** New Game: the town forgets you — back to Unknown. */
export function resetReputation(r: Reputation) {
  r.fame = 0; r.lastGainDay = -1;
  saveReputation(r);
}

// ---- reads ------------------------------------------------------------------

/** The active tier for a Fame value (the highest whose `min` it clears). */
export function reputationTier(fame: number): RepTier {
  let t = REP_TIERS[0]!;
  for (const tier of REP_TIERS) if (fame >= tier.min) t = tier;
  return t;
}

/** Customer price multiplier for the current Fame: a band from REP_PREMIUM_MIN
 *  (fame 0) up to REP_PREMIUM_MAX (fame 100), replacing block #1's flat premium. */
export function reputationPremium(fame: number): number {
  return REP_PREMIUM_MIN + (REP_PREMIUM_MAX - REP_PREMIUM_MIN) * (clamp100(fame) / 100);
}

/** How many customer sales the day allows: the base cap plus a Fame-scaled
 *  bonus (a busier stall the better-known she is). */
export function reputationDailyCap(fame: number): number {
  return CUSTOMER_DAILY_CAP + Math.round(REP_DAILY_CAP_BONUS_MAX * (clamp100(fame) / 100));
}

/** Extra spawn odds added to the base per-attempt chance, scaling with Fame. */
export function reputationSpawnBonus(fame: number): number {
  return REP_SPAWN_CHANCE_BONUS_MAX * (clamp100(fame) / 100);
}

/** A town MERCHANT's purchase discount for the current Fame (v2 BLOCK #3):
 *  0 at fame 0 up to REP_BUY_DISCOUNT_MAX at fame 100 — VISION's "the better
 *  known you are, the better your opening prices". Applied on TOP of the
 *  passive Haggling discount at the general store's buy counter. */
export function reputationBuyDiscount(fame: number): number {
  return REP_BUY_DISCOUNT_MAX * (clamp100(fame) / 100);
}

// ---- writes -----------------------------------------------------------------

/** The outcome of a Fame change — the delta actually applied (after clamping)
 *  and, when Fame rose across a tier boundary, the tier newly reached (for a
 *  warm toast). `crossedUp` is null on a drop or a same-tier move. */
export interface RepChange { fame: number; delta: number; crossedUp: RepTier | null }

/** Award Fame (a good deed the town notices). Positive amounts refresh the
 *  idle-decay clock. Reports any tier newly reached so the caller can celebrate. */
export function gainReputation(r: Reputation, amount: number, absDay: number): RepChange {
  const before = r.fame;
  const beforeTier = reputationTier(before);
  r.fame = clamp100(round1(before + amount));
  if (amount > 0) r.lastGainDay = absDay;
  const afterTier = reputationTier(r.fame);
  saveReputation(r);
  const crossedUp = r.fame > before && afterTier.min > beforeTier.min ? afterTier : null;
  return { fame: r.fame, delta: round1(r.fame - before), crossedUp };
}

/** A gentle Fame dip when a customer gives up waiting — the ignored-customer
 *  penalty block #1 deliberately deferred to here. Smaller than a sale's gain
 *  (forgiving), floored at 0. Does NOT touch the idle-decay clock. */
export function penalizeReputation(r: Reputation): RepChange {
  const before = r.fame;
  r.fame = clamp100(round1(before - REP_LOSS_TIMEOUT));
  saveReputation(r);
  return { fame: r.fame, delta: round1(r.fame - before), crossedUp: null };
}

/**
 * Daily rollover: after REP_DECAY_IDLE_DAYS with no fame-earning act, Fame
 * sheds a trickle per idle day — but FLOORED at the current tier's `min`, so
 * neglect can trim within-tier gains yet NEVER demote a tier the player earned
 * (mirrors skills/relationships neglect-decay, kept forgiving). Idempotent-ish:
 * call once per day rollover with the absolute day just started.
 */
export function decayReputation(r: Reputation, absDay: number) {
  if (r.fame <= 0) return;
  if (r.lastGainDay < 0) { r.lastGainDay = absDay; saveReputation(r); return; }
  if (absDay - r.lastGainDay <= REP_DECAY_IDLE_DAYS) return;
  const floor = reputationTier(r.fame).min;
  const next = Math.max(floor, round1(r.fame - REP_DECAY_PER_DAY));
  if (next !== r.fame) { r.fame = next; saveReputation(r); }
}
