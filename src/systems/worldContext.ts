import type { Economy } from "./economy";
import type { Skills } from "./skills";
import type { FarmState } from "./renovation";
// import type { CalendarState } from "./calendar";   // added in Block 3
// import type { WeatherState } from "./weather";      // added in Block 4
// import type { WorldFlags } from "./worldFlags";     // added in Block 5

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
  // calendar?: CalendarState;   // uncomment when Block 3 lands
  // weather?: WeatherState;     // uncomment when Block 4 lands
  // flags?: WorldFlags;         // uncomment when Block 5 lands
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

export interface WorldContext {
  version: 1;
  coins: number;
  skills: Readonly<Record<string, number>>;
  farm: FarmSlice;
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
  };
}
