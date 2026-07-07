import { DAYS_PER_SEASON } from "../systems/calendar";

/**
 * Festival roster (Festival engine, Part A #6). v1 ships exactly one:
 * the Harvest Festival, autumn, mid-season. FABLE_PROMPT's source spec said
 * "day 15 of a season", but DECISIONS.md's default season length is 10 days —
 * resolved as `festivalDay = min(15, ceil(DAYS_PER_SEASON / 2))`, which lands
 * on day 5 with today's 10-day seasons and would honor day 15 outright if
 * seasons are ever tuned to 15+ days. Logged as a product decision in
 * docs/WORKLOG.md. The framework (this table + systems/festival.ts) is built
 * so a second/third festival (Solstice, Moon — DECISIONS' open v5 list) is
 * just another entry, not a rewrite.
 */
export interface FestivalDef {
  id: string;
  name: string;
  seasonIndex: number;   // 0=spring 1=summer 2=autumn 3=winter
  day: number;            // day-of-season it falls on
  theme: string;
}

const HARVEST_FESTIVAL_DAY = Math.min(15, Math.ceil(DAYS_PER_SEASON / 2));

export const FESTIVALS: FestivalDef[] = [
  { id: "harvest", name: "Harvest Festival", seasonIndex: 2, day: HARVEST_FESTIVAL_DAY, theme: "harvest" },
];
