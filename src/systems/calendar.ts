import { CALENDAR_KEY } from "../config";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type DayPhase = "dawn" | "day" | "dusk" | "night";

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];
const DAYS_PER_SEASON = 10; // placeholder — tune during implementation

export interface CalendarState {
  version: 1;
  seasonIndex: number; // 0-3, index into SEASON_ORDER
  day: number;          // day-of-season counter, 1-based
  hour: number;         // 0-23
}

function fresh(): CalendarState {
  return { version: 1, seasonIndex: 0, day: 1, hour: 6 };
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
  c.seasonIndex = f.seasonIndex; c.day = f.day; c.hour = f.hour;
  saveCalendar(c);
}

export function currentSeason(c: CalendarState): Season {
  return SEASON_ORDER[c.seasonIndex]!;
}

export function currentPhase(c: CalendarState): DayPhase {
  if (c.hour < 6) return "night";
  if (c.hour < 8) return "dawn";
  if (c.hour < 19) return "day";
  if (c.hour < 21) return "dusk";
  return "night";
}

/** Advances the hour; rolls the day and (rarely) the season. Call once per
 *  in-game hour worth of elapsed time from main.ts's tick(). Returns true
 *  exactly on the tick the season changes, so weather (Block 4) can react. */
export function advanceHour(c: CalendarState): boolean {
  c.hour = (c.hour + 1) % 24;
  if (c.hour !== 0) { saveCalendar(c); return false; }
  c.day += 1;
  let seasonChanged = false;
  if (c.day > DAYS_PER_SEASON) {
    c.day = 1;
    c.seasonIndex = (c.seasonIndex + 1) % SEASON_ORDER.length;
    seasonChanged = true;
  }
  saveCalendar(c);
  return seasonChanged;
}
