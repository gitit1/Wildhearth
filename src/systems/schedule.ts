/**
 * The clock-driven schedule engine: given the calendar and a day-of-week, it
 * decides which STATE each NPC should be in and WHERE that state happens. It
 * owns no entity state — `entities/npc.ts` asks it "what should this NPC be
 * doing right now?" each tick and moves the rig accordingly.
 *
 * Week model (DECISIONS "Day-in-game & needs"): a 7-day week, Sunday–Saturday,
 * derived from the calendar's monotonic `absoluteDay`. Schedules VARY by day:
 *  - Sunday: everyone gathers at the square/well in the morning (and evening),
 *    with a lighter afternoon shift — clearly not a work day.
 *  - Each stall has its own closed day (Maren Tue, Tobin Thu, Sera Sat…): on it
 *    that keeper wanders the market / socializes instead of manning the stall.
 *  - Ada works a different forest corner each day; Jonas alternates his patrol
 *    direction; Finn is at the dock only after "school" on weekdays, all day on
 *    weekends. Everyone sleeps at home ~22:00–06:00, personality-jittered ±1h.
 *  - Festival engine override (Part A #6): while a festival is on (systems/
 *    festival.ts's `activeFestival()`, 09:00-21:00 its date), `resolveState`
 *    swaps in the `"festival"` state for everyone still awake, regardless of
 *    what they'd normally be doing — the whole roster gathers at the square.
 */
import { absoluteDay, type CalendarState } from "./calendar";
import type { WeatherState } from "./weather";
import { T } from "../config";
import { WELL, BUSK_SPOT, TOWN_SQUARE } from "../world/zones";
import {
  FOREST_CORNERS, ADA_FOREST_REST, BRAM_FARM_SPOT, BRAM_MARKET_SPOT, RIVERSIDE_REST, type NpcDef,
} from "../data/npcs";

export type NpcState = "atHome" | "atWork" | "atMarket" | "socializing" | "asleep" | "festival" | "town";

export interface ScheduleEntry { startHour: number; state: NpcState; }

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/** 0 = Sunday … 6 = Saturday. `absoluteDay` is 1-based (day 1 of spring = 1). */
export function dayOfWeek(c: CalendarState): number {
  return (absoluteDay(c) - 1) % 7;
}
export function dayName(c: CalendarState): string {
  return DAY_NAMES[dayOfWeek(c)]!;
}

const OUTDOOR = new Set<NpcState>(["atWork", "atMarket", "socializing", "town"]);
const clampHour = (h: number) => Math.max(0, Math.min(23, h));
const isWeekend = (dow: number) => dow === 0 || dow === 6;

/** Which townsfolk pay the coastal TOWN a visit, and on which weekdays (v2
 *  BLOCK #3 — so the town isn't a ghost street; broadened when the player's own
 *  stall moved into the town, so her counter has a real afternoon crowd to sell
 *  to — see the customer pool in main.ts). A rotating handful of non-stall roles
 *  wander down to the seafront each afternoon; stallkeepers stay put so the
 *  market keeps trading. Deterministic from role + day-of-week — no state. */
function townVisitsToday(def: NpcDef, dow: number): boolean {
  if (dow === 0) return false;   // Sunday gathering stays at the market well
  switch (def.role) {
    case "fisher-kid": return true;                 // Finn loves the harbour, any weekday
    case "peddler": return true;                    // Jonas carries his wares down every road
    case "handyman": return dow === 2 || dow === 4; // Bram: odd jobs in town Tue/Thu
    case "musician": return dow === 2 || dow === 4; // Liora plays the seafront Tue/Thu
    case "farmer": return dow === 3;                // Henrik brings surplus to the seafront Wed
    default: return false;
  }
}

/** Deterministic ±1h personality jitter on wake/bedtime, stable per NPC. */
function jitter(def: NpcDef): number {
  let h = 0;
  for (const ch of def.id) h = (h * 31 + ch.charCodeAt(0)) & 255;
  return (h % 3) - 1;
}

function workHours(def: NpcDef, dow: number): { start: number; end: number } {
  if (def.role === "fisher-kid")
    return isWeekend(dow) ? { start: 8, end: 18 } : { start: 14, end: 18 };
  return { start: def.workStart, end: def.workEnd };
}

/** Sunday's lighter afternoon: most roles do a short shift; the peddler just
 *  keeps gossiping at the square. */
function sundayAfternoon(role: NpcDef["role"]): NpcState {
  return role === "peddler" ? "socializing" : "atWork";
}

/**
 * The day's timeline as a sorted list of {startHour, state}. This IS the
 * per-(NPC, day-of-week) schedule table — computed rather than hand-written so
 * ten NPCs across seven days stay consistent and easy to reason about.
 */
export function daySchedule(def: NpcDef, dow: number): ScheduleEntry[] {
  const j = jitter(def);
  const wake = clampHour(def.wake + j);
  const sleep = clampHour(def.sleep + j);
  const e: ScheduleEntry[] = [
    { startHour: 0, state: "asleep" },
    { startHour: wake, state: "atHome" },
  ];

  if (dow === 0) {
    // Sunday: gather at the square, light afternoon shift, gather again at dusk
    e.push({ startHour: wake + 1, state: "socializing" });
    e.push({ startHour: 14, state: sundayAfternoon(def.role) });
    e.push({ startHour: 18, state: "socializing" });
  } else if (def.closedDay === dow) {
    // stall/trade shut: run errands and mingle instead of working
    e.push({ startHour: wake + 1, state: "atMarket" });
    e.push({ startHour: 13, state: "socializing" });
    e.push({ startHour: 16, state: "atMarket" });
  } else {
    const { start, end } = workHours(def, dow);
    if (def.role === "baker") {
      // Petra bakes at her cottage, then works the square mid-day, then back
      e.push({ startHour: start, state: "atWork" });
      e.push({ startHour: 11, state: "atMarket" });
      e.push({ startHour: 14, state: "atWork" });
      e.push({ startHour: end, state: "socializing" });
      e.push({ startHour: clampHour(end + 2), state: "atHome" });
    } else if (townVisitsToday(def, dow)) {
      // work the morning, then head down to the coastal town for the afternoon
      e.push({ startHour: start, state: "atWork" });
      e.push({ startHour: 15, state: "town" });
      e.push({ startHour: 18, state: "socializing" });
      e.push({ startHour: clampHour(end + 2), state: "atHome" });
    } else {
      e.push({ startHour: start, state: "atWork" });
      e.push({ startHour: end, state: "socializing" });
      e.push({ startHour: clampHour(end + 2), state: "atHome" });
    }
  }

  e.push({ startHour: sleep, state: "asleep" });
  return e.sort((a, b) => a.startHour - b.startHour);
}

/** The scheduled state for a given day-of-week + whole hour. `festival` (from
 *  systems/festival.ts's `activeFestival()`) overrides everything except
 *  sleep — the normal wake/bedtime schedule still governs when everyone turns
 *  in, but any awake hour during the festival becomes the `"festival"` state. */
export function resolveState(def: NpcDef, dow: number, hour: number, festival = false): NpcState {
  const sched = daySchedule(def, dow);
  let s: NpcState = "asleep";
  for (const entry of sched) {
    if (hour >= entry.startHour) s = entry.state;
    else break;
  }
  if (festival && s !== "asleep") return "festival";
  return s;
}

// ---- where a state happens -------------------------------------------------

const TAU = Math.PI * 2;

/** Work location, resolved per NPC + day (foragers roam corners, the handyman
 *  splits farm/market, everyone else has a fixed spot; the peddler's real work
 *  is a patrol handled in npc.ts, this is only a fallback). */
function workPlace(def: NpcDef, dow: number): [number, number] {
  switch (def.role) {
    case "forager": {
      const c = FOREST_CORNERS[dow % FOREST_CORNERS.length]!;
      return [c[0], c[1]];
    }
    case "handyman":
      return dow === 1 ? [BRAM_FARM_SPOT[0], BRAM_FARM_SPOT[1]]
                       : [BRAM_MARKET_SPOT[0], BRAM_MARKET_SPOT[1]];
    default:
      return [def.work[0], def.work[1]];
  }
}

/** A browsing spot in the market plaza — mid-plaza (below the stall counters,
 *  clear of the well), spread by roster index so wanderers don't stack on the
 *  stallkeepers or each other. */
function marketWander(idx: number): [number, number] {
  return [(62 + (idx % 6) * 2.3) * T, (20.6 + (idx % 2) * 0.8) * T];
}

/** A place in the ring around the well — small standing groups, not a pile. */
function socialSpot(idx: number): [number, number] {
  const a = (idx / 10) * TAU;
  return [WELL.cx + Math.cos(a) * 2.3 * T, WELL.cy + 1.3 * T + Math.sin(a) * 1.5 * T];
}

/** A spot along the coastal town street, spread by roster index so town
 *  visitors mill along the promenade rather than stacking on one tile. */
function townSpot(idx: number): [number, number] {
  return [TOWN_SQUARE[0] + ((idx % 4) - 1.5) * 2.6 * T, TOWN_SQUARE[1] + ((idx % 2) - 0.5) * 1.6 * T];
}

/** The world point an NPC should head to for a given state. */
export function placeFor(def: NpcDef, state: NpcState, dow: number, idx: number): [number, number] {
  switch (state) {
    case "asleep":
    case "atHome":
      return [def.home[0], def.home[1]];
    case "atWork":
      return workPlace(def, dow);
    case "atMarket":
      return marketWander(idx);
    case "socializing":
      // Ada keeps to the trees even when "gathering" — she's shy of the square;
      // Nerys keeps to her river bend, a recluse of the water (never the well).
      if (def.role === "forager") return [ADA_FOREST_REST[0], ADA_FOREST_REST[1]];
      if (def.role === "fisherwoman") return [RIVERSIDE_REST[0], RIVERSIDE_REST[1]];
      return socialSpot(idx);
    case "festival":
      // festival day pulls EVERYONE to the square, Ada included — Liora takes
      // the busking spot to perform, everyone else spreads around the well
      return def.role === "musician" ? [BUSK_SPOT[0], BUSK_SPOT[1]] : socialSpot(idx);
    case "town":
      return townSpot(idx);
  }
}

/**
 * Weather hook (v5-forward stub). For now the ONLY effect is that a storm
 * drives any NPC whose state is outdoors back home. It expands at v5 (rain
 * moods, seasonal shifts, cancelled market days, indoor visits, festival
 * exceptions) — kept deliberately tiny until then. Takes the NPC def so v5 can
 * branch on personality/role without a signature change.
 */
export function scheduleWeatherTweak(_def: NpcDef, state: NpcState, weather: WeatherState): NpcState {
  if (weather.kind === "storm" && OUTDOOR.has(state)) return "atHome";
  return state;
}
