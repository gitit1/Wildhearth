# World Context System — full build spec

This is a **standalone technical design document**, separate from
`ROADMAP_EXPANSION.md`. It specifies the World Context system in full,
before handing it to a coding agent block by block. Read `docs/VISION.md`
for *why* this needs to exist (the "reality-simulation state check"
skills rule): Wildhearth simulates a real, connected world, so almost any
system can be affected by season, weather, relationships, and more — this
file is the one piece of infrastructure that lets every future system ask
"what's true right now?" in one call, instead of each re-deriving it.

**Architecture note — read this before anything else.** An earlier draft
of this file specified a provider-*registry* pattern (`registerProvider`
calls scattered across subsystem files), based on generic game-dev
research. That was WRONG for this codebase and has been discarded. The
actual code (`skills.ts`, `economy.ts`, `renovation.ts`, `inventory.ts`,
etc.) has **zero module-level singletons or self-registration** — every
system is a pure-function module operating on an explicit state object
(`Skills`, `Economy`, `FarmState`) that `main.ts` creates once and passes
around, exactly like `InteractCtx` is assembled fresh in `main.ts`'s
`tick()` today. World Context follows the *same* convention: a pure
function that takes an explicit `sources` object. No registry, no
self-registration, nothing that runs at module-import time. This keeps
the entire codebase's one consistent style intact.

**How to use this file:** same convention as `ROADMAP_EXPANSION.md` — each
block below is self-contained with a checkbox. These blocks carry an
explicit sequence number because, unlike most of `ROADMAP_EXPANSION.md`,
**they must be built in this order** — each is a real dependency of the
next. Mark a block `[x]` once built, verified (`npm run build` passes),
and committed, per the standing WORKLOG/commit rule.

---

## The full data-owner inventory

Every row is a piece of persistent game state that already exists, or
will soon. World Context never duplicates this data — it only ever reads
it via the live objects `main.ts` already holds. Keep this table updated
whenever a new state-owning system is added to the game.

| Data owner | Status today | Real file / shape | Feeds World Context as |
|---|---|---|---|
| Skills | **Built** | `systems/skills.ts` — `Skills { list: Skill[] }`, `Skill { id, value, lock }` | `skills: Record<string, number>` (id → value), built from `.list` |
| Economy (coins) | **Built** | `systems/economy.ts` — `Economy { coins, inv }` | `coins: number`, read directly from `economy.coins` |
| Inventory | **Built** | `systems/inventory.ts` — `Inventory { slots }` | not surfaced yet — add a slice only when a consumer actually needs "does the player hold X" as world state (dialogue doesn't need this yet) |
| Farm repair state | **Built** | `systems/renovation.ts` — `FarmState { roof, window, barn, fence }` | `farm: { roof, window, barn, fence }`, read directly |
| Farm plot expansions | Speced in `ROADMAP_EXPANSION.md`, **not in code yet** | would live in `renovation.ts` or a new file | add a `plotExpansions: number` field to the farm slice once it exists — don't stub it now |
| Calendar & time | Speced, being built **in this file** (Block 3) | new: `systems/calendar.ts` | `calendar: { season, day, hour, phase }` |
| Weather | Speced, being built **in this file** (Block 4) | new: `systems/weather.ts` | `weather: { state, daysSinceChange }` |
| World event flags | Speced, being built **in this file** (Block 5) | new: `systems/worldFlags.ts` | `flags: Record<string, boolean>` |
| Relationships | Speced in `ROADMAP_EXPANSION.md`, not built | future: `systems/relationships.ts` | `relationship?: { npcId, friendship, romance }`, only when a query names an `npcId` (see Block 6) |
| Needs | Speced in `ROADMAP_EXPANSION.md`, not built | future: `systems/needs.ts` | `needs?: Record<string, number>` |
| Collections & Memories | Speced in `ROADMAP_EXPANSION.md`, not built | future: `systems/collections.ts`, `systems/memories.ts` | `collections?: {...}` — shape TBD when built |
| Town Reputation/Fame | Speced in `ROADMAP_EXPANSION.md`, not built | future: `systems/reputation.ts` | `reputation: number` |
| Transportation | Speced in `ROADMAP_EXPANSION.md`, not built | future (part of fast-travel work) | `transportation?: {...}` — shape TBD when built |
| NPC location/schedule | Speced in `ROADMAP_EXPANSION.md`, not built | future: `systems/schedule.ts`, `entities/npc.ts` | not modeled yet — see note below |
| Location / region | **Does not exist as a concept at all today** — the whole game is one scene | n/a until Phase 1's world-expansion work | do not build this now; add only once regions are real |
| Character creation choices | Speced in `ROADMAP_EXPANSION.md`, not built | future: `systems/startingPath.ts` | `startingPath?: string` — low priority, rarely queried |

This list will grow. See Block 6 for the exact 3-edit recipe every future
row follows.

---

## Why this build order

Goal: **a working, real system as fast as possible**, using only what's
already built (Skills, Economy, Farm) — not waiting on relationships,
needs, or anything else that doesn't exist in code yet. Blocks 1-2 get
`getWorldContext()` returning real, live data. Blocks 3-5 add the three
genuinely new subsystems this needs (calendar, weather, flags). Block 6
is the reusable recipe for everything that comes after.

---

## Block 1 — Shared types
- [x] built, verified (`npm run build`), committed — 2026-07-04

Create `src/systems/worldContext.ts` (types live at the top of the same
file that implements `getWorldContext()` — this codebase doesn't split
types into their own file anywhere else, e.g. `renovation.ts` defines
`FarmState` and its functions together, so don't introduce a new
convention here).

```ts
// src/systems/worldContext.ts (top section)
import type { Economy } from "./economy";
import type { Skills } from "./skills";
import type { FarmState } from "./renovation";
// import type { CalendarState } from "./calendar";   // added in Block 3
// import type { WeatherState } from "./weather";      // added in Block 4
// import type { WorldFlags } from "./worldFlags";     // added in Block 5

/** Everything getWorldContext() is allowed to read from. main.ts builds
 *  one of these each time it needs a snapshot, from the live instances
 *  it already holds — the same convention as InteractCtx in interact.ts. */
export interface WorldContextSources {
  economy: Economy;
  skills: Skills;
  farm: FarmState;
  // calendar?: CalendarState;   // uncomment when Block 3 lands
  // weather?: WeatherState;     // uncomment when Block 4 lands
  // flags?: WorldFlags;         // uncomment when Block 5 lands
}

/** Optional narrowing for a specific question, e.g. "for this NPC". Only
 *  relevant once a source (like relationships) needs to be scoped to one
 *  NPC rather than the whole game — see Block 6. Unused until then. */
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
```

**Done when:** this compiles with no runtime code yet (just the
interfaces above) and nothing else imports it.

---

## Block 2 — `getWorldContext()` — the working-system milestone
- [x] built, verified (in-browser: live data updates), committed — 2026-07-04

Add the function itself to the same file, below the types:

```ts
// src/systems/worldContext.ts (below the types from Block 1)

/** Builds a read-only snapshot of "what's true right now" from the live
 *  state objects main.ts already holds. Pure function, no stored state of
 *  its own — call it fresh whenever a consumer needs it. Recomputing is
 *  cheap (a handful of small objects); do not add caching pre-emptively,
 *  see the performance note at the end of this file. */
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
```

Wire it into `main.ts` as a temporary debug check, right next to where
`InteractCtx` is already assembled inside `tick()`:

```ts
// inside main.ts's tick(), near where `ictx` is built — temporary only
import { getWorldContext } from "./systems/worldContext";
// ...
if (time % 5 < dt) console.log(getWorldContext({ economy, skills, farm }));
```

**Done when:** the console log shows real, accurate coins/skill-values/
farm-repair-state during play, and updates correctly as you earn coins,
gain a skill point, or pay for a repair. Remove the debug `console.log`
line once confirmed — this block doesn't ship a UI or a permanent call
site; Block 6 (and later, the dialogue system in `ROADMAP_EXPANSION.md`)
is where a *real* consumer will call this function.

---

## Block 3 — Calendar & time
- [ ] not started — **depends on Block 2. Hard prerequisite for Block 4.**

This is "The Season system itself" already named in `ROADMAP_EXPANSION.md`
— build it now since Weather (Block 4) needs it and World Context should
expose it. Create `src/systems/calendar.ts`, following the **exact same
shape as `renovation.ts`** (versioned interface, `fresh()`, `loadX()`/
`saveX()` via a new key, tolerant of corrupt/missing saves):

```ts
// src/systems/calendar.ts
import { CALENDAR_KEY } from "../config"; // add this constant to config.ts,
                                           // next to SAVE_KEY/SKILLS_KEY/etc.

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
```

Wire into the rest of the codebase, following existing patterns exactly:
- **`config.ts`**: add `export const CALENDAR_KEY = "wildhearth_calendar";`
  (match whatever naming convention the existing keys use).
- **`saves.ts`**: add `CALENDAR_KEY` to the `GAME_KEYS` array so New Game
  clears it: `const GAME_KEYS = [SAVE_KEY, SKILLS_KEY, RENOVATION_KEY, META_KEY, CALENDAR_KEY];`
- **`main.ts`**: `const calendar = loadCalendar();` next to `const farm = loadFarm();`;
  call `resetCalendar(calendar)` inside `newGameReset()` next to `resetFarm(farm)`;
  call `advanceHour(calendar)` from inside `tick()` on whatever cadence
  represents one in-game hour (reuse/extend the existing `time` accumulator).
- **`systems/worldContext.ts`**: uncomment the `calendar?` line in
  `WorldContextSources`, add a `calendar` slice to `WorldContext`, and
  populate it in `getWorldContext()`:
  ```ts
  calendar: sources.calendar
    ? { season: currentSeason(sources.calendar), day: sources.calendar.day,
        hour: sources.calendar.hour, phase: currentPhase(sources.calendar) }
    : undefined,
  ```

**Done when:** the in-game hour advances, a day rolls over, the season
changes after `DAYS_PER_SEASON` days, all three survive a save/reload, and
`getWorldContext({ economy, skills, farm, calendar }).calendar` reflects
the current season/day/hour/phase.

---

## Block 4 — Weather
- [ ] not started — **depends on Block 3 (reads the current season to weight its roll)**

Weather doesn't exist anywhere in the code yet — only mentioned as a
concept in `VISION.md`. Build it exactly like Block 3, same shape as
`renovation.ts`/`calendar.ts`. Create `src/systems/weather.ts`:

```ts
// src/systems/weather.ts
import { WEATHER_KEY } from "../config"; // add this constant
import { type Season } from "./calendar";

export type WeatherKind = "clear" | "rain" | "storm" | "fog"; // extend later

export interface WeatherState {
  version: 1;
  kind: WeatherKind;
  daysSinceChange: number;
}

function fresh(): WeatherState {
  return { version: 1, kind: "clear", daysSinceChange: 0 };
}

export function loadWeather(): WeatherState {
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<WeatherState>;
    const validKinds: WeatherKind[] = ["clear", "rain", "storm", "fog"];
    return {
      version: 1,
      kind: validKinds.includes(p.kind as WeatherKind) ? (p.kind as WeatherKind) : "clear",
      daysSinceChange: typeof p.daysSinceChange === "number" ? p.daysSinceChange : 0,
    };
  } catch {
    return fresh();
  }
}

export function saveWeather(w: WeatherState) {
  try { localStorage.setItem(WEATHER_KEY, JSON.stringify(w)); }
  catch { /* private mode */ }
}

export function resetWeather(w: WeatherState) {
  const f = fresh();
  w.kind = f.kind; w.daysSinceChange = f.daysSinceChange;
  saveWeather(w);
}

// Placeholder table — tune during implementation. Each season maps to a
// weighted list of [kind, weight] pairs.
const WEATHER_TABLE: Record<Season, Array<[WeatherKind, number]>> = {
  spring: [["clear", 6], ["rain", 4]],
  summer: [["clear", 8], ["rain", 2]],
  autumn: [["clear", 5], ["rain", 4], ["fog", 1]],
  winter: [["clear", 6], ["storm", 2], ["fog", 2]],
};

function rollWeather(season: Season): WeatherKind {
  const table = WEATHER_TABLE[season];
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [kind, weight] of table) { if ((r -= weight) <= 0) return kind; }
  return "clear";
}

/** Call once per new in-game day (when calendar's advanceHour() rolls a
 *  day). Rerolls weather for the day using the current season. */
export function rollDailyWeather(w: WeatherState, season: Season) {
  const next = rollWeather(season);
  w.daysSinceChange = next === w.kind ? w.daysSinceChange + 1 : 0;
  w.kind = next;
  saveWeather(w);
}

export function isRaining(w: WeatherState): boolean {
  return w.kind === "rain" || w.kind === "storm";
}
```

**Real mechanical effect, not just cosmetic** — wire this into the crop
system (`farming.ts`'s active-tending, per `ROADMAP_EXPANSION.md`'s
crop-variety block, once that lands): if `isRaining(weather)` is true,
skip requiring the manual watering step for outdoor plots that day.

Wire into the rest of the codebase:
- **`config.ts`**: add `export const WEATHER_KEY = "wildhearth_weather";`
- **`saves.ts`**: add `WEATHER_KEY` to `GAME_KEYS`.
- **`main.ts`**: `const weather = loadWeather();` next to `calendar`; call
  `resetWeather(weather)` in `newGameReset()`; call
  `rollDailyWeather(weather, currentSeason(calendar))` whenever
  `advanceHour(calendar)` returns "a new day started" (extend
  `advanceHour`'s return value, or check `calendar.hour === 0` at the
  `tick()` call site — either is fine, pick whichever reads cleaner
  alongside the existing season-change check from Block 3).
- **`systems/worldContext.ts`**: uncomment `weather?` in
  `WorldContextSources`, add a `weather` slice to `WorldContext`, populate
  it the same way calendar was wired in Block 3.

**Done when:** weather visibly changes day to day, is weighted correctly
by season, survives save/reload, and `getWorldContext(...).weather`
reflects it.

---

## Block 5 — World event flags
- [ ] not started — **depends on Block 2 only; independent of Blocks 3-4**

A generic "something just happened" mechanism any future system can use
(dialogue, quests, NPC reactions) instead of each inventing its own
one-off flag storage. This one differs slightly from Blocks 3-4's shape
because it's a *set* of entries, not a single record — still versioned
and persisted the same way. Create `src/systems/worldFlags.ts`:

```ts
// src/systems/worldFlags.ts
import { WORLD_FLAGS_KEY } from "../config"; // add this constant

interface FlagEntry { key: string; expiresOnDay: number }
export interface WorldFlags { version: 1; entries: FlagEntry[] }

function fresh(): WorldFlags { return { version: 1, entries: [] }; }

export function loadWorldFlags(): WorldFlags {
  try {
    const raw = localStorage.getItem(WORLD_FLAGS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<WorldFlags>;
    const entries = Array.isArray(p.entries)
      ? p.entries.filter((e): e is FlagEntry =>
          !!e && typeof e.key === "string" && typeof e.expiresOnDay === "number")
      : [];
    return { version: 1, entries };
  } catch {
    return fresh();
  }
}

export function saveWorldFlags(f: WorldFlags) {
  try { localStorage.setItem(WORLD_FLAGS_KEY, JSON.stringify(f)); }
  catch { /* private mode */ }
}

export function resetWorldFlags(f: WorldFlags) {
  f.entries = [];
  saveWorldFlags(f);
}

/** Sets a flag true for durationDays in-game days from currentDay. */
export function setFlag(f: WorldFlags, key: string, durationDays: number, currentDay: number) {
  const existing = f.entries.find((e) => e.key === key);
  const expiresOnDay = currentDay + durationDays;
  if (existing) existing.expiresOnDay = expiresOnDay;
  else f.entries.push({ key, expiresOnDay });
  saveWorldFlags(f);
}

export function hasFlag(f: WorldFlags, key: string, currentDay: number): boolean {
  const e = f.entries.find((x) => x.key === key);
  return !!e && e.expiresOnDay > currentDay;
}

/** Call occasionally (e.g. once per in-game day) to drop expired entries
 *  so the saved list doesn't grow forever. */
export function pruneExpired(f: WorldFlags, currentDay: number) {
  const before = f.entries.length;
  f.entries = f.entries.filter((e) => e.expiresOnDay > currentDay);
  if (f.entries.length !== before) saveWorldFlags(f);
}

export function activeFlagsRecord(f: WorldFlags, currentDay: number): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const e of f.entries) if (e.expiresOnDay > currentDay) out[e.key] = true;
  return out;
}
```

Wire into the rest of the codebase:
- **`config.ts`**: add `export const WORLD_FLAGS_KEY = "wildhearth_flags";`
- **`saves.ts`**: add `WORLD_FLAGS_KEY` to `GAME_KEYS`.
- **`main.ts`**: `const worldFlags = loadWorldFlags();` next to the others;
  `resetWorldFlags(worldFlags)` in `newGameReset()`; call
  `pruneExpired(worldFlags, calendar.day)` once per new in-game day
  (same call site as Block 4's daily weather roll).
- **`systems/worldContext.ts`**: uncomment `flags?` in
  `WorldContextSources`, add `flags: Record<string, boolean>` to
  `WorldContext`, populate via
  `sources.flags ? activeFlagsRecord(sources.flags, sources.calendar?.day ?? 0) : {}`.

Example usage from any future system: `setFlag(worldFlags, "fixed_bridge", 4, calendar.day)`.

**Done when:** setting a flag makes it appear in `getWorldContext(...).flags`,
it disappears on its own after the given number of in-game days (checked
via `hasFlag`), and it survives a save/reload.

---

## Block 6 — The "add a new data source" recipe
- [ ] not started — **this block has no code of its own; it's the pattern every future subsystem follows**

This is how Relationships, Needs, Collections, Reputation, Transportation,
and anything else added later plugs into World Context, once its own
subsystem is built (each already has its full design elsewhere in
`ROADMAP_EXPANSION.md` — this is only the wiring step, three small edits,
no registry, no ceremony):

1. **`systems/worldContext.ts`** — add the new optional field to
   `WorldContextSources` (e.g. `needs?: NeedsState`) and the matching
   slice to `WorldContext` (e.g. `needs?: Record<string, number>`), then
   populate it inside `getWorldContext()`, following the exact pattern
   Blocks 3-5 already used for calendar/weather/flags.
2. **`main.ts`** — add the live instance next to the others already there
   (`const needs = loadNeeds();`), pass it into the `sources` object at
   whatever call site currently calls `getWorldContext({ economy, skills,
   farm, calendar, weather, flags })` (extend the object literal by one
   field), and add its reset call to `newGameReset()`.
3. **`saves.ts`** — add its key to `GAME_KEYS`, exactly like every
   previous store.

**Per-NPC scoping (relationships specifically):** relationships are the
one data source that isn't global — a dialogue check needs "friendship
with THIS npc," not every NPC's relationship at once. When
`relationships.ts` is eventually built, `getWorldContext()`'s signature
already has a `query: WorldContextQuery` parameter for exactly this
(unused until now):
```ts
export function getWorldContext(
  sources: WorldContextSources,
  query: WorldContextQuery = {},
): WorldContext {
  // ...existing slices...
  const relationship = query.npcId && sources.relationships
    ? getRelationship(sources.relationships, query.npcId) // existing relationships.ts accessor
    : undefined;
  return { /* ...existing fields..., */ relationship };
}
```
This mirrors how a real interaction is actually scoped (this dialogue,
with this NPC, right now) rather than dumping every NPC's relationship
into every query regardless of relevance.

**No "done when" for this block** — it stays open-ended and gets reused
every time a new subsystem needs to join World Context. Update the data-
owner inventory table at the top of this file each time.

---

## What deliberately isn't here yet

- **The dialogue rule-matcher** (picking the most-specific line given a
  `WorldContext`) is its own block in `ROADMAP_EXPANSION.md` ("Dialogue
  authoring — condition-keyed, not flat pools") and depends on Blocks 1-2
  here at minimum. Not built in this file — this file is only the data
  layer it reads from.
- **The LLM-context/validation layer** (turning a `WorldContext` into a
  bounded payload for the future NPC-brain phase) is a later concern in
  `ROADMAP_EXPANSION.md`. Nothing here needs to anticipate it beyond the
  fact that `WorldContext` is already a plain, serializable object by
  construction.
- **Location/region tracking** — the game is a single scene today; there
  is nothing to track. Add a location slice only once Phase 1's world-
  expansion work actually introduces regions — don't build it speculatively.
- **Caching/memoization** — `getWorldContext()` recomputes on every call,
  which is correct for how small and cheap these sources are. Only add
  caching later if profiling actually shows this function as a hot path
  (e.g. many NPCs each calling it several times per frame, once NPCs
  exist) — not before.