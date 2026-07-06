/**
 * Relationship engine (Part A #3) — TWO independent axes per NPC (Friendship
 * 0-100, Romance 0-100), never one combined score. Versioned, tolerant store,
 * explicit-passing (main.ts owns the live object and hands it around, exactly
 * like Economy / Skills / NeedsState). No singletons, nothing at import time.
 *
 * Kid safety is structural: a "kid" NpcDef narrows `isRomantic()` to false, so
 * romance is never written for a kid (every romance write is guarded) and never
 * shown. Gifts always move Friendship in v1 (a logged judgment call — see the
 * WORKLOG); the Romantic interaction category is what moves Romance.
 *
 * Forward-compat (v5): heart-event thresholds, per-NPC records, and the fired-
 * threshold ledger are all here already, so scripted Heart Events / NPC-to-NPC
 * relations bolt on without a schema break.
 */
import {
  RELATIONSHIPS_KEY, GIFT_DELTAS, BIRTHDAY_GIFT_MULT, GIFTS_PER_WEEK,
  ROMANCE_UNLOCK_FRIENDSHIP, RELATIONSHIP_DECAY_LOW, RELATIONSHIP_DECAY_MID,
  RELATIONSHIP_DECAY_HIGH, RELATIONSHIP_DECAY_MID_FLOOR, RELATIONSHIP_DECAY_HIGH_FLOOR,
  RELATIONSHIP_THRESHOLDS, INTERACT_DIMINISH,
} from "../config";
import { absoluteDay, type CalendarState } from "./calendar";
import { isRomantic, isBirthday, type NpcDef } from "../data/npcs";
import { giftTier, type GiftRating } from "../data/traitPreferences";
import type { InteractionDef } from "../data/interactions";

export type Axis = "friendship" | "romance";

/** A threshold crossed upward — the seed a heart event grows from (see
 *  heartEvents.ts). Kept here (the lower module) so relationships doesn't
 *  depend on the presentation layer. */
export interface ThresholdEvent { axis: Axis; threshold: number }

export interface Relationship {
  friendship: number;        // 0-100
  romance: number;           // 0-100 (always 0 for kids — never written)
  giftsThisWeek: number;     // non-birthday gifts accepted in `giftWeek`
  giftWeek: number;          // Sun-Sat week index the count applies to
  birthdayGiftDay: number;   // day-of-year a cap-exempt birthday gift was given (-1 = none)
  lastInteractDay: number;   // day-of-year of last contact (gift/talk/interaction) — drives decay
  catDay: number;            // day-of-year `catCounts` applies to
  catCounts: Record<string, number>;   // interaction category id -> uses today (diminishing)
  fired: string[];           // heart thresholds already crossed, e.g. "friendship:25"
  gaveGiftEver: boolean;     // for the first-ever-gift Memory Book entry
}

export interface Relationships { version: 1; byId: Record<string, Relationship> }

function freshRel(): Relationship {
  return {
    friendship: 0, romance: 0, giftsThisWeek: 0, giftWeek: -1,
    birthdayGiftDay: -1, lastInteractDay: -1, catDay: -1, catCounts: {},
    fired: [], gaveGiftEver: false,
  };
}

function fresh(): Relationships { return { version: 1, byId: {} }; }

// ---- persistence (renovation.ts shape: versioned, tolerant, private-mode safe)
const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function normalize(r: Partial<Relationship>): Relationship {
  const f = freshRel();
  return {
    friendship: clamp100(num(r.friendship, 0)),
    romance: clamp100(num(r.romance, 0)),
    giftsThisWeek: Math.max(0, Math.floor(num(r.giftsThisWeek, 0))),
    giftWeek: Math.floor(num(r.giftWeek, -1)),
    birthdayGiftDay: Math.floor(num(r.birthdayGiftDay, -1)),
    lastInteractDay: Math.floor(num(r.lastInteractDay, -1)),
    catDay: Math.floor(num(r.catDay, -1)),
    catCounts: r.catCounts && typeof r.catCounts === "object"
      ? Object.fromEntries(Object.entries(r.catCounts).filter(([, v]) => typeof v === "number"))
      : {},
    fired: Array.isArray(r.fired) ? r.fired.filter((x): x is string => typeof x === "string") : f.fired,
    gaveGiftEver: !!r.gaveGiftEver,
  };
}

export function loadRelationships(): Relationships {
  try {
    const raw = localStorage.getItem(RELATIONSHIPS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Relationships>;
    const out = fresh();
    if (p.byId && typeof p.byId === "object") {
      for (const [id, r] of Object.entries(p.byId as Record<string, Partial<Relationship>>))
        if (r && typeof r === "object") out.byId[id] = normalize(r);
    }
    return out;
  } catch {
    return fresh();
  }
}

export function saveRelationships(r: Relationships) {
  try { localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(r)); } catch { /* private mode */ }
}

/** New Game: forget every bond. */
export function resetRelationships(r: Relationships) {
  r.byId = {};
  saveRelationships(r);
}

// ---- reads ------------------------------------------------------------------

/** Non-mutating read — returns zeros for an NPC never interacted with (does NOT
 *  create a record). Used by World Context and the on-screen readout. */
export function readRelationship(r: Relationships, id: string): { friendship: number; romance: number } {
  const rel = r.byId[id];
  return rel ? { friendship: rel.friendship, romance: rel.romance } : { friendship: 0, romance: 0 };
}

/** The on-pill readout data: numbers plus whether Romance should ever be shown
 *  (kids and non-candidates: never). */
export function relationshipSummary(def: NpcDef, r: Relationships): { friendship: number; romance: number; showRomance: boolean } {
  const v = readRelationship(r, def.id);
  return { friendship: v.friendship, romance: v.romance, showRomance: isRomantic(def) };
}

// ---- internals --------------------------------------------------------------

function ensure(r: Relationships, id: string): Relationship {
  return (r.byId[id] ??= freshRel());
}

const weekOf = (cal: CalendarState) => Math.floor((absoluteDay(cal) - 1) / 7);

/** Applies a delta to one axis (clamped 0-100) and returns any heart thresholds
 *  crossed UPWARD for the first time (recorded so they never re-fire). */
function applyDelta(rel: Relationship, axis: Axis, delta: number): ThresholdEvent[] {
  const before = rel[axis];
  const after = clamp100(round1(before + delta));
  rel[axis] = after;
  const events: ThresholdEvent[] = [];
  if (delta > 0)
    for (const t of RELATIONSHIP_THRESHOLDS) {
      const key = `${axis}:${t}`;
      if (before < t && after >= t && !rel.fired.includes(key)) {
        rel.fired.push(key);
        events.push({ axis, threshold: t });
      }
    }
  return events;
}

// ---- gifts ------------------------------------------------------------------

export type GiftOutcome =
  | { kind: "refused"; line: string }
  | {
      kind: "given"; rating: GiftRating; delta: number; birthday: boolean;
      thresholds: ThresholdEvent[]; firstEver: boolean;
    };

/**
 * Decides + applies a gift. Refusal (weekly cap reached, no birthday exemption)
 * happens BEFORE anything is consumed — the caller must NOT remove the item on
 * a "refused" outcome. Gifts always move Friendship in v1. Birthday: the tier
 * delta is doubled AND the gift is exempt from the weekly cap (once per birthday).
 */
export function giveGift(r: Relationships, def: NpcDef, itemId: string, cal: CalendarState): GiftOutcome {
  const rel = ensure(r, def.id);
  const today = absoluteDay(cal);
  const wk = weekOf(cal);
  if (rel.giftWeek !== wk) { rel.giftWeek = wk; rel.giftsThisWeek = 0; }

  const birthdayToday = isBirthday(def, cal.seasonIndex, cal.day);
  const exempt = birthdayToday && rel.birthdayGiftDay !== today;   // one exempt gift per birthday
  if (!exempt && rel.giftsThisWeek >= GIFTS_PER_WEEK) {
    saveRelationships(r);   // persist the week reset even on refusal
    return {
      kind: "refused",
      line: `${def.name} has had gifts enough this week — best to space them out.`,
    };
  }

  // accepted — book the gift against the cap (or the birthday exemption)
  if (exempt) rel.birthdayGiftDay = today;
  else rel.giftsThisWeek += 1;

  const rating = giftTier(def, itemId);
  const delta = GIFT_DELTAS[rating] * (exempt ? BIRTHDAY_GIFT_MULT : 1);
  const thresholds = applyDelta(rel, "friendship", delta);
  rel.lastInteractDay = today;   // giving is contact — no decay today
  const firstEver = !rel.gaveGiftEver;
  rel.gaveGiftEver = true;
  saveRelationships(r);
  return { kind: "given", rating, delta, birthday: exempt, thresholds, firstEver };
}

// ---- categorized interactions ----------------------------------------------

export type InteractResult =
  | { kind: "blocked"; line: string }
  | { kind: "done"; axis: Axis; applied: number; thresholds: ThresholdEvent[]; diminished: boolean };

/**
 * Applies one categorized interaction. Romantic ones are gated (candidate adult
 * + Friendship >= unlock) — the menu hides them, this is the belt-and-braces
 * guard. Per-day diminishing returns per category per NPC: 1st full, 2nd ~half,
 * 3rd a trickle, 4th+ nothing (still counts as contact, so decay is held off).
 */
export function applyInteraction(r: Relationships, def: NpcDef, it: InteractionDef, cal: CalendarState): InteractResult {
  const rel = ensure(r, def.id);
  const today = absoluteDay(cal);

  if (it.axis === "romance" && !(isRomantic(def) && rel.friendship >= ROMANCE_UNLOCK_FRIENDSHIP))
    return { kind: "blocked", line: `${def.name} isn't ready for that.` };

  if (rel.catDay !== today) { rel.catDay = today; rel.catCounts = {}; }
  const prior = rel.catCounts[it.category] ?? 0;
  const mult = (INTERACT_DIMINISH as readonly number[])[prior] ?? 0;
  rel.catCounts[it.category] = prior + 1;

  const applied = round1(it.base * mult);
  const thresholds = applied !== 0 ? applyDelta(rel, it.axis, applied) : [];
  rel.lastInteractDay = today;   // contact regardless of a diminished (even zero) delta
  saveRelationships(r);
  return { kind: "done", axis: it.axis, applied, thresholds, diminished: prior > 0 };
}

/** Any contact (e.g. a plain Talk) marks the day so decay is held off, without
 *  moving either axis. */
export function markContact(r: Relationships, id: string, day: number) {
  const rel = ensure(r, id);
  rel.lastInteractDay = day;
  saveRelationships(r);
}

// ---- depth-dependent neglect decay -----------------------------------------

function decayAxis(rel: Relationship, axis: Axis): boolean {
  const v = rel[axis];
  if (v <= 0) return false;
  const rate = v < RELATIONSHIP_DECAY_MID_FLOOR ? RELATIONSHIP_DECAY_LOW
    : v <= RELATIONSHIP_DECAY_HIGH_FLOOR ? RELATIONSHIP_DECAY_MID
      : RELATIONSHIP_DECAY_HIGH;
  rel[axis] = Math.max(0, round1(v - rate));
  return true;
}

/**
 * Daily rollover: any NPC not contacted during the day that just ended drifts
 * down on BOTH axes, faster the shallower the bond. `endedDay` is the day-of-
 * year that just finished (captured before the clock advanced, so a year wrap
 * doesn't spuriously decay a bond you fed yesterday). `newDay` expires a stale
 * birthday-exemption flag. Never drops below 0.
 */
export function decayRelationships(r: Relationships, endedDay: number, newDay: number) {
  let changed = false;
  for (const id in r.byId) {
    const rel = r.byId[id]!;
    if (rel.lastInteractDay !== endedDay) {
      if (decayAxis(rel, "friendship")) changed = true;
      if (decayAxis(rel, "romance")) changed = true;
    }
    if (rel.birthdayGiftDay !== -1 && rel.birthdayGiftDay !== newDay) { rel.birthdayGiftDay = -1; changed = true; }
  }
  if (changed) saveRelationships(r);
}
