import {
  NEEDS_KEY, NEED_START, NEED_DECAY, NEED_SLEEP_DECAY_MULT, NEED_SLEEP_FLOOR,
  ENERGY_SLEEP_RECOVER, NEED_WINTER_ENERGY_MULT, NEED_WINTER_HUNGER_MULT,
  NEED_SUMMER_THIRST_MULT, NEED_STORM_ENERGY_MULT, NEED_STORM_HUNGER_MULT,
  MOOD_WORST_WEIGHT, MOOD_SOCIAL_BONUS, MOOD_GLOW_MINUTES, MOOD_WEATHER_DRAG,
  MOOD_PENALTY_DECAY, REST_GLOW, MOOD_LOW_THRESH, MOOD_HIGH_THRESH, MOOD_LOW_MULT,
  MOOD_HIGH_MULT, EXERTION, WALK_ENERGY_PER_1000PX, EAT_DISH, EAT_CROP, EAT_FORAGE,
  DRINK_RESTORE, WASH_RESTORE, OUTHOUSE_RESTORE, REST_ENERGY, SOCIAL_TALK_BASE,
  SOCIAL_TALK_DIMINISH, ACCIDENT_HYGIENE_HIT, ACCIDENT_MOOD_HIT, ACCIDENT_BATHROOM_RESET,
  COLLAPSE_RECOVER,
} from "../config";
import type { Season } from "./calendar";
import type { WeatherKind } from "./weather";
import { RECIPES } from "../data/recipes";
import { CROPS } from "../data/crops";
import { FORAGE } from "../data/forage";

/**
 * Needs engine (Part A #2 / DECISIONS "Day-in-game & needs"): 7 needs, each
 * 0-100 — hunger, thirst, energy, hygiene, bathroom, mood, social.
 *
 * Six of them decay over time (rate modified by action, season and weather).
 * **Mood is DERIVED**, never decayed independently: it is recomputed from the
 * other six plus a recent-good-moment bonus and a weather drag, so a single
 * critical need drags the whole mood down (Sims-style interaction).
 *
 * Follows the codebase's versioned-store convention exactly (calendar.ts /
 * weather.ts): a plain state object main.ts owns and passes around — no
 * singletons, tolerant load/save/reset. Nothing runs at import time.
 */

export type NeedId =
  | "hunger" | "thirst" | "energy" | "hygiene" | "bathroom" | "mood" | "social";

/** The six that decay on their own. Mood is derived from these + glow. */
export const PHYSICAL_NEEDS: NeedId[] = [
  "hunger", "thirst", "energy", "hygiene", "bathroom", "social",
];
/** All seven, in the order the HUD strip shows them (mood last, it's derived). */
export const ALL_NEEDS: NeedId[] = [
  "hunger", "thirst", "energy", "hygiene", "bathroom", "social", "mood",
];

/** UI-facing labels (HUD strip tooltip, warnings, debug). */
export const NEED_LABELS: Record<NeedId, string> = {
  hunger: "Hunger", thirst: "Thirst", energy: "Energy", hygiene: "Hygiene",
  bathroom: "Bathroom", mood: "Mood", social: "Social",
};

export interface NeedsState {
  version: 1;
  hunger: number; thirst: number; energy: number;
  hygiene: number; bathroom: number; social: number;
  mood: number;                          // DERIVED — recomputed, never decayed on its own
  socialGlow: number;                    // 0..1 recent-good-moment bonus (a chat / a rest), fades
  moodPenalty: number;                   // transient mood dip (an accident), fades to 0
  warn: Record<string, number>;          // per-need warning band already announced (0 / 1=25 / 2=10)
  socialDay: number;                     // absolute day the socialCounts below belong to
  socialCounts: Record<string, number>;  // per-NPC chats today (diminishing social returns)
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function fresh(): NeedsState {
  return {
    version: 1,
    hunger: NEED_START, thirst: NEED_START, energy: NEED_START,
    hygiene: NEED_START, bathroom: NEED_START, social: NEED_START,
    mood: NEED_START, socialGlow: 0, moodPenalty: 0,
    warn: {}, socialDay: 0, socialCounts: {},
  };
}

function num(v: unknown, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

export function loadNeeds(): NeedsState {
  try {
    const raw = localStorage.getItem(NEEDS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<NeedsState>;
    const f = fresh();
    return {
      version: 1,
      hunger: clamp(num(p.hunger, f.hunger)),
      thirst: clamp(num(p.thirst, f.thirst)),
      energy: clamp(num(p.energy, f.energy)),
      hygiene: clamp(num(p.hygiene, f.hygiene)),
      bathroom: clamp(num(p.bathroom, f.bathroom)),
      social: clamp(num(p.social, f.social)),
      mood: clamp(num(p.mood, f.mood)),
      socialGlow: clamp(num(p.socialGlow, 0), 0, 1),
      moodPenalty: Math.max(0, num(p.moodPenalty, 0)),
      warn: p.warn && typeof p.warn === "object" ? { ...p.warn } : {},
      socialDay: num(p.socialDay, 0),
      socialCounts: p.socialCounts && typeof p.socialCounts === "object" ? { ...p.socialCounts } : {},
    };
  } catch {
    return fresh();
  }
}

export function saveNeeds(n: NeedsState) {
  try { localStorage.setItem(NEEDS_KEY, JSON.stringify(n)); }
  catch { /* private mode */ }
}

/** New Game: every need back to comfortable. */
export function resetNeeds(n: NeedsState) {
  const f = fresh();
  Object.assign(n, f);
  saveNeeds(n);
}

// --------------------------------------------------------------------------
//  Readback helpers (World Context, HUD, NPC comments)
// --------------------------------------------------------------------------

export function needValue(n: NeedsState, id: NeedId): number {
  return n[id];
}

/** The `needs?: Record<string, number>` slice for World Context (Block-6). */
export function needsRecord(n: NeedsState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ALL_NEEDS) out[id] = Math.round(n[id]);
  return out;
}

// --------------------------------------------------------------------------
//  Decay + mood derivation (called once per in-game minute from main.ts)
// --------------------------------------------------------------------------

/** Which need each season/weather condition drains faster. Structure lives
 *  here (needs.ts); every magnitude is a knob in config.ts. */
function seasonWeatherMult(id: NeedId, season: Season, weather: WeatherKind): number {
  let m = 1;
  if (season === "winter") {
    if (id === "energy") m *= NEED_WINTER_ENERGY_MULT;
    if (id === "hunger") m *= NEED_WINTER_HUNGER_MULT;
  }
  if (season === "summer" && id === "thirst") m *= NEED_SUMMER_THIRST_MULT;
  if (weather === "storm") {
    if (id === "energy") m *= NEED_STORM_ENERGY_MULT;
    if (id === "hunger") m *= NEED_STORM_HUNGER_MULT;
  }
  return m;
}

/** Drain one need by `amt`, honoring the sleep floor (asleep, a need never
 *  drops below NEED_SLEEP_FLOOR, and never gets pushed UP by the floor). */
function drain(v: number, amt: number, sleeping: boolean): number {
  const floor = sleeping ? Math.min(v, NEED_SLEEP_FLOOR) : 0;
  return Math.max(floor, v - amt);
}

export interface DecayEnv { season: Season; weather: WeatherKind; sleeping: boolean }

/** One in-game minute of drain. During sleep, physical needs drain slower and
 *  energy RECOVERS instead. Also fades the good-moment glow + any mood penalty.
 *  Mood itself is recomputed here (and again each frame for HUD snappiness). */
export function decayNeeds(n: NeedsState, env: DecayEnv) {
  const sMult = env.sleeping ? NEED_SLEEP_DECAY_MULT : 1;
  const dr = (id: Exclude<NeedId, "mood" | "energy">) => {
    n[id] = drain(n[id], NEED_DECAY[id] * seasonWeatherMult(id, env.season, env.weather) * sMult, env.sleeping);
  };
  dr("hunger"); dr("thirst"); dr("hygiene"); dr("bathroom"); dr("social");

  if (env.sleeping) n.energy = clamp(n.energy + ENERGY_SLEEP_RECOVER);
  else n.energy = clamp(n.energy - NEED_DECAY.energy * seasonWeatherMult("energy", env.season, env.weather));

  if (n.socialGlow > 0) n.socialGlow = Math.max(0, n.socialGlow - 1 / MOOD_GLOW_MINUTES);
  if (n.moodPenalty > 0) n.moodPenalty = Math.max(0, n.moodPenalty - MOOD_PENALTY_DECAY);

  recomputeMood(n, env.weather);
  saveNeeds(n);
}

/** Mood = a blend of the six needs' average and their single worst value (so
 *  one critical need drags mood down), lifted by a recent good moment and
 *  dragged by dreary weather / a recent accident. Never decays on its own. */
export function recomputeMood(n: NeedsState, weather: WeatherKind) {
  const vals = [n.hunger, n.thirst, n.energy, n.hygiene, n.bathroom, n.social];
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const worst = Math.min(...vals);
  let m = avg * (1 - MOOD_WORST_WEIGHT) + worst * MOOD_WORST_WEIGHT;
  m += n.socialGlow * MOOD_SOCIAL_BONUS;
  m -= MOOD_WEATHER_DRAG[weather] ?? 0;
  m -= n.moodPenalty;
  n.mood = clamp(m);
}

/** Mood multiplier for skill-gain chance and busking payout: worse mood = less
 *  reward, great mood = a little more (VISION #13 "mood affects work"). */
export function moodPerfMult(n: NeedsState): number {
  if (n.mood < MOOD_LOW_THRESH) return MOOD_LOW_MULT;
  if (n.mood > MOOD_HIGH_THRESH) return MOOD_HIGH_MULT;
  return 1;
}

// --------------------------------------------------------------------------
//  Action-driven drain
// --------------------------------------------------------------------------

/** Extra energy + hygiene drain the moment a physical action completes. */
export function applyExertion(n: NeedsState, kind: keyof typeof EXERTION) {
  const e = EXERTION[kind];
  n.energy = clamp(n.energy - e.energy);
  n.hygiene = clamp(n.hygiene - e.hygiene);
  saveNeeds(n);
}

/** A slight energy cost for covering ground. Called every frame with the
 *  distance walked since the last frame — deliberately does NOT save (the
 *  per-minute decay persists it) to avoid a localStorage write per frame. */
export function applyWalk(n: NeedsState, distancePx: number) {
  if (distancePx <= 0) return;
  n.energy = clamp(n.energy - (distancePx / 1000) * WALK_ENERGY_PER_1000PX);
}

// --------------------------------------------------------------------------
//  Restoration
// --------------------------------------------------------------------------

/** Restores a need by `amount` (clamped) and persists. Returns points gained. */
export function restore(n: NeedsState, id: NeedId, amount: number): number {
  const before = n[id];
  n[id] = clamp(n[id] + amount);
  saveNeeds(n);
  return n[id] - before;
}

export const drink = (n: NeedsState) => restore(n, "thirst", DRINK_RESTORE);
export const wash = (n: NeedsState) => restore(n, "hygiene", WASH_RESTORE);
export const useOuthouse = (n: NeedsState) => restore(n, "bathroom", OUTHOUSE_RESTORE);

/** A short sit: a little energy back and a small lift to the good-moment glow. */
export function rest(n: NeedsState) {
  n.energy = clamp(n.energy + REST_ENERGY);
  n.socialGlow = Math.max(n.socialGlow, REST_GLOW);
  saveNeeds(n);
}

// -- edible table: cooked dishes (best) > crop produce > wild forage. Raw fish
//    and junk are deliberately NOT food (VISION: "raw fish isn't food"). ------
const EDIBLE: Record<string, number> = {
  ...Object.fromEntries(RECIPES.map((r) => [r.id, EAT_DISH])),
  ...Object.fromEntries(CROPS.map((c) => [c.id, EAT_CROP])),
  ...Object.fromEntries(FORAGE.map((f) => [f.id, EAT_FORAGE])),
};

/** Hunger restored by eating one of this item (0 if it isn't food). */
export function edibleHunger(id: string): number { return EDIBLE[id] ?? 0; }
export function isEdible(id: string): boolean { return edibleHunger(id) > 0; }

/** Talking to an NPC. Diminishing per-NPC per-day so one friend can't top the
 *  bar forever. Also refreshes the good-moment glow (feeds derived mood). */
export function socialContact(n: NeedsState, npcId: string, absoluteDay: number): number {
  if (n.socialDay !== absoluteDay) { n.socialDay = absoluteDay; n.socialCounts = {}; }
  const prior = n.socialCounts[npcId] ?? 0;
  const gain = SOCIAL_TALK_BASE * Math.pow(SOCIAL_TALK_DIMINISH, prior);
  n.socialCounts[npcId] = prior + 1;
  n.socialGlow = 1;
  const g = restore(n, "social", gain);   // restore() saves
  return g;
}

// --------------------------------------------------------------------------
//  Warnings + collapse
// --------------------------------------------------------------------------

// escalating warning copy per need: [band 1 = <=25, band 2 = <=10]
const WARN: Record<string, [string, string]> = {
  hunger: ["You're getting hungry.", "You feel faint with hunger."],
  thirst: ["Your throat is dry.", "You're parched — you need a drink."],
  energy: ["You're getting tired.", "You can barely keep your eyes open."],
  hygiene: ["You're feeling grubby.", "You badly need to wash."],
  bathroom: ["You need the outhouse soon.", "You really need the outhouse!"],
  social: ["You're feeling lonely.", "The solitude is wearing on you."],
};

/** Escalating threshold warnings with per-need hysteresis (a warning fires
 *  once per band as a need drops past 25 then 10; the band clears once it
 *  climbs back above 30, so recovering and dropping again re-warns — but a
 *  need hovering near the line never spams). Returns freshly-fired lines. */
export function collectWarnings(n: NeedsState): string[] {
  const out: string[] = [];
  for (const id of PHYSICAL_NEEDS) {
    const v = n[id];
    if (v >= 30) { n.warn[id] = 0; continue; }   // clear (a gap above the warn line = hysteresis)
    if (v > 25) continue;                        // 25-30 dead-band: no new warn, no reset
    const band = v <= 10 ? 2 : 1;
    if (band > (n.warn[id] ?? 0)) { out.push(WARN[id]![band - 1]!); n.warn[id] = band; }
  }
  if (out.length) saveNeeds(n);
  return out;
}

export type Critical = { kind: "collapse"; need: NeedId } | { kind: "accident"; need: NeedId } | null;

/** A physical need at 0 = collapse (hunger/thirst/energy). Bathroom at 0 = an
 *  embarrassing accident instead (no faint, no coin cost). */
export function criticalNeed(n: NeedsState): Critical {
  for (const id of ["energy", "hunger", "thirst"] as NeedId[])
    if (n[id] <= 0) return { kind: "collapse", need: id };
  if (n.bathroom <= 0) return { kind: "accident", need: "bathroom" };
  return null;
}

/** Bathroom accident: a small hygiene + mood hit, bathroom part-relieved. */
export function applyAccident(n: NeedsState) {
  n.hygiene = clamp(n.hygiene - ACCIDENT_HYGIENE_HIT);
  n.moodPenalty += ACCIDENT_MOOD_HIT;
  n.bathroom = ACCIDENT_BATHROOM_RESET;
  n.socialGlow = 0;
  saveNeeds(n);
}

/** After a collapse's forced sleep, bump every physical need up so the player
 *  wakes with breathing room instead of collapsing again next minute. */
export function collapseRecover(n: NeedsState) {
  for (const id of ["hunger", "thirst", "energy", "hygiene", "bathroom"] as NeedId[])
    n[id] = Math.max(n[id], COLLAPSE_RECOVER);
  n.warn = {};   // a fresh start — re-warn from scratch as they drop again
  saveNeeds(n);
}
