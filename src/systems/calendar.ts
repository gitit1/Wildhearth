import { CALENDAR_KEY } from "../config";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type DayPhase = "dawn" | "day" | "dusk" | "night";

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];
export const DAYS_PER_SEASON = 10; // placeholder — tune during implementation

export interface CalendarState {
  version: 1;
  seasonIndex: number; // 0-3, index into SEASON_ORDER
  day: number;          // day-of-season counter, 1-based
  hour: number;         // 0-23
  minute: number;       // 0-59
}

function fresh(): CalendarState {
  return { version: 1, seasonIndex: 0, day: 1, hour: 6, minute: 0 };
}

export function loadCalendar(): CalendarState {
  try {
    const raw = localStorage.getItem(CALENDAR_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<CalendarState>;
    return {
      version: 1,
      seasonIndex: typeof p.seasonIndex === "number" ? p.seasonIndex : 0,
      day: typeof p.day === "number" ? p.day : 1,
      hour: typeof p.hour === "number" ? p.hour : 6,
      minute: typeof p.minute === "number" ? p.minute : 0,
    };
  } catch {
    return fresh();
  }
}

export function saveCalendar(c: CalendarState) {
  try { localStorage.setItem(CALENDAR_KEY, JSON.stringify(c)); }
  catch { /* private mode */ }
}

/** New Game: back to day 1 of spring, morning. */
export function resetCalendar(c: CalendarState) {
  const f = fresh();
  c.seasonIndex = f.seasonIndex; c.day = f.day; c.hour = f.hour; c.minute = f.minute;
  saveCalendar(c);
}

export function currentSeason(c: CalendarState): Season {
  return SEASON_ORDER[c.seasonIndex]!;
}

/** A monotonic day count across seasons (unlike `day`, which resets 10→1 each
 *  season). Use this as the clock for anything measuring a span of days, e.g.
 *  world-flag expiry, so durations that cross a season boundary stay correct. */
export function absoluteDay(c: CalendarState): number {
  return c.seasonIndex * DAYS_PER_SEASON + c.day;
}

export function currentPhase(c: CalendarState): DayPhase {
  if (c.hour < 6) return "night";
  if (c.hour < 8) return "dawn";
  if (c.hour < 19) return "day";
  if (c.hour < 21) return "dusk";
  return "night";
}

/** Advances one in-game minute, rolling minute → hour → day → season. Call
 *  once per in-game minute worth of elapsed time from main.ts's tick().
 *  Returns true exactly on the tick a NEW DAY begins (minute+hour both wrap to
 *  0), so weather's daily reroll and the world-flag prune fire once per day —
 *  not once per minute. */
export function advanceMinute(c: CalendarState): boolean {
  c.minute = (c.minute + 1) % 60;
  if (c.minute !== 0) { saveCalendar(c); return false; }
  c.hour = (c.hour + 1) % 24;
  if (c.hour !== 0) { saveCalendar(c); return false; }
  // hour wrapped past midnight → a new day
  c.day += 1;
  if (c.day > DAYS_PER_SEASON) {
    c.day = 1;
    c.seasonIndex = (c.seasonIndex + 1) % SEASON_ORDER.length;
  }
  saveCalendar(c);
  return true;
}
