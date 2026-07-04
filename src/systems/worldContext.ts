import type { Economy } from "./economy";
import type { Skills } from "./skills";
import type { FarmState } from "./renovation";
import { currentSeason, currentPhase, absoluteDay, type CalendarState, type Season, type DayPhase } from "./calendar";
import type { WeatherState, WeatherKind } from "./weather";
import { activeFlagsRecord, type WorldFlags } from "./worldFlags";

/**
 * World Context — the one place any future system asks "what's true right
 * now?" instead of re-deriving it. It never owns or duplicates state; it only
 * reads the live objects main.ts already holds, via an explicit `sources`
 * object built fresh at the call site (the same convention as InteractCtx in
 * interact.ts — no registry, no module-level singletons, nothing at import
 * time). See docs/WORLD_CONTEXT.md for the full design.
 */

/** Everything getWorldContext() is allowed to read from. main.ts builds one
 *  of these each time it needs a snapshot, from the live instances it already
 *  holds. Optional fields turn on as their subsystems land (Blocks 3-5). */
export interface WorldContextSources {
  economy: Economy;
  skills: Skills;
  farm: FarmState;
  calendar?: CalendarState;   // Block 3
  weather?: WeatherState;     // Block 4
  flags?: WorldFlags;         // Block 5
}

/** Optional narrowing for a specific question, e.g. "for this NPC". Only
 *  relevant once a source (like relationships) needs to be scoped to one NPC
 *  rather than the whole game — see Block 6. Unused until then. */
export interface WorldContextQuery {
  npcId?: string;
}

export interface FarmSlice {
  roof: boolean;
  window: boolean;
  barn: boolean;
  fence: boolean;
}

export interface CalendarSlice {
  season: Season;
  day: number;
  hour: number;
  phase: DayPhase;
}

export interface WeatherSlice {
  state: WeatherKind;
  daysSinceChange: number;
}

export interface WorldContext {
  version: 1;
  coins: number;
  skills: Readonly<Record<string, number>>;
  farm: FarmSlice;
  calendar?: CalendarSlice;
  weather?: WeatherSlice;
  flags: Record<string, boolean>;
}

/** Builds a read-only snapshot of "what's true right now" from the live state
 *  objects main.ts already holds. Pure function, no stored state of its own —
 *  call it fresh whenever a consumer needs it. Recomputing is cheap (a handful
 *  of small objects); do not add caching pre-emptively (see docs/WORLD_CONTEXT.md). */
export function getWorldContext(
  sources: WorldContextSources,
  _query: WorldContextQuery = {},
): WorldContext {
  const skillsSnapshot: Record<string, number> = {};
  for (const s of sources.skills.list) skillsSnapshot[s.id] = s.value;

  return {
    version: 1,
    coins: sources.economy.coins,
    skills: skillsSnapshot,
    farm: {
      roof: sources.farm.roof,
      window: sources.farm.window,
      barn: sources.farm.barn,
      fence: sources.farm.fence,
    },
    calendar: sources.calendar
      ? { season: currentSeason(sources.calendar), day: sources.calendar.day,
          hour: sources.calendar.hour, phase: currentPhase(sources.calendar) }
      : undefined,
    weather: sources.weather
      ? { state: sources.weather.kind, daysSinceChange: sources.weather.daysSinceChange }
      : undefined,
    flags: sources.flags ? activeFlagsRecord(sources.flags, sources.calendar ? absoluteDay(sources.calendar) : 0) : {},
  };
}
