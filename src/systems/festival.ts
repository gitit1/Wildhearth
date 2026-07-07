import { FESTIVAL_START_HOUR, FESTIVAL_END_HOUR } from "../config";
import { FESTIVALS, type FestivalDef } from "../data/festivals";
import type { CalendarState } from "./calendar";

/**
 * Festival engine (Part A #6) — reads the calendar, answers "is a festival
 * on, right now / today?". No state of its own (like schedule.ts): a pure
 * lookup against the fixed FESTIVALS table, so it never needs saving/loading.
 */

function festivalOn(cal: CalendarState): FestivalDef | undefined {
  return FESTIVALS.find((f) => f.seasonIndex === cal.seasonIndex && f.day === cal.day);
}

/** The festival happening RIGHT NOW (09:00-21:00 the day it falls), or null
 *  outside those hours / on any other day. Drives NPC gathering + decorations. */
export function activeFestival(cal: CalendarState): FestivalDef | null {
  const def = festivalOn(cal);
  if (!def) return null;
  return cal.hour >= FESTIVAL_START_HOUR && cal.hour < FESTIVAL_END_HOUR ? def : null;
}

/** True all day on a festival's date, regardless of the hour — for the HUD
 *  calendar pill and flavor text that should read "festival day" from dawn. */
export function isFestivalDay(cal: CalendarState): FestivalDef | null {
  return festivalOn(cal) ?? null;
}
