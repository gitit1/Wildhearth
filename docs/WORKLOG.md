# WORKLOG — Wildhearth

Purpose: a running, detailed record of every unit of work done on the game.
This is **not a roadmap and not an index** — it is the "what actually
happened" log. One block per completed task, newest at the top. Bring this
file to the design chat and it alone should tell you the exact state of the
project.

## How to write an entry (the agent MUST follow this)

- **One block = one task = one commit.** Never merge two tasks into one
  entry, and never split one task across two.
- Write the entry **after** the work is done and `npm run build` passes, and
  **before** the commit — updating this file is part of the commit (see
  `CLAUDE.md`).
- **Be specific.** Name every file created or changed, every system /
  function / data structure / save key added or touched, and the actual
  player-facing behavior that changed.
  - ✗ "Added fishing polish."
  - ✓ "Added quality tiers to catch resolution in `src/systems/fishing.ts`
    via `resolveCatch()`; new `Quality` enum + `rollQuality()`; sell price
    now multiplied by quality in `src/systems/economy.ts`."
- If anything was left unfinished, or a decision is still open, put it under
  **Follow-ups** so it is never lost. Do not silently drop it.

---

## Entries (newest first)

<!-- Copy the template below for each new block. Keep newest at the top. -->

<!--
## [BLOCK-ID] Short title
- **Date:** YYYY-MM-DD
- **Block given:** <paste the exact block/prompt that was handed to the agent>
- **Done:**
  - **Files:** <every file created/changed — one line each, what and why>
  - **Systems / functions:** <new or changed functions, types, save keys>
  - **Behavior:** <what a player can now see or do that they couldn't before>
- **Build:** `npm run build` — ✅ passing / ❌ failing (+ notes)
- **Commit:** <hash + message — fill in after committing>
- **Follow-ups:** <deferred items / TODOs / open decisions — "none" if none>
-->

## Fix: no free animals
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Fix: no free animals")
  The demo cow/hens contradict "nothing is free" — remove the default spawn;
  wire them into the MVP shop as buyable, with their own price and a coop/
  barn-repair prerequisite.
- **Done:**
  - **Files:**
    - `src/systems/livestock.ts` (NEW): `Livestock { version, cow, hens }`,
      load/save/reset on `wildhearth-livestock-v1` (added to config + `saves.ts`
      `GAME_KEYS`). New Game empties the yard.
    - `src/entities/animals.ts`: `createAnimals(owned)` spawns only purchased
      animals; new `spawnCow()`/`spawnHen()` (hens jitter so a flock spreads).
    - `src/systems/shop.ts`: `ShopEntry.livestock` kind; SHOP_STOCK adds Hen 45
      / Cow 175 (`HEN_PRICE`/`COW_PRICE` in config, per the price anchor table:
      first hen 40-50, first cow 150-200); new `tryBuyLivestock` — barn-gated
      ("no-barn"), coins-checked, never touches the backpack, one cow max
      (unique like the hoe), hens repeatable.
    - `src/ui/shopwindow.ts`: livestock buy rows (hen shows "(have N)"),
      barn-broken refusal toast ("Mend the barn first — animals need a sound
      home."), haggling discount + Haggling practice on success;
      `initShopWindow` now takes farm/livestock/onAnimalBought.
    - `src/main.ts`: loads livestock, spawns owned animals at boot, pushes a
      new cow/hen into the live arrays on purchase, clears both on New Game.
    - `src/art/icons.ts`: hen + cow shop icons. `ITEM_NAMES`: Hen/Cow.
  - **Behavior:** a new life starts with an empty yard. The stall sells hens
    (45) and one cow (175) — refused until the barn is mended; a purchase
    deducts coins, the animal appears in the yard immediately, and the flock
    survives reload. Prerequisite note: the block says "coop/barn-repair";
    no coop exists in the world yet (it arrives with the rundown detail pass,
    currently skipped for its missing WORLD_MAP.md source), so the mended barn
    — the named alternative — is the gate for both animals.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 10/10: new game has an empty
  livestock store and visibly empty yard (screenshot); shop lists Hen 45 / Cow
  175; barn-broken purchase refused with the right toast and no coin/store
  change; after barn repair a hen purchase deducts 45 and spawns (screenshot),
  a second hen grows the flock, the cow deducts 175 and leaves the shop row
  (unique); all of it persists across reload + Continue.
- **Commit:** Fix: no free animals
- **Follow-ups:** Animal Husbandry skill wiring (feeding) belongs to the
  "Complete the base skill set" block; eggs/milk production belongs to the
  animal-husbandry-expansion block (needs crafting).

## docs — reconcile stale ROADMAP_EXPANSION blocks with built work
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** autorun instruction — small corrections traceable to the docs.
  Two ROADMAP_EXPANSION.md blocks describe systems that were already built and
  verified during the World Context Infrastructure work but still read "not
  started".
- **Done (docs only):** ticked "The Season system itself" (satisfied by
  `systems/calendar.ts` + the day-length setting; noted the season-change-event
  convention) and "World Context Infrastructure — build these 4 together"
  (satisfied by WORLD_CONTEXT.md Blocks 1-6, commits 8c81d32…9e28515; noted the
  rain→crop effect intentionally waits for active tending).
- **Build:** `npm run build` — ✅ (no source change).
- **Commit:** docs — reconcile stale ROADMAP_EXPANSION blocks with built work
- **Follow-ups:** the older combined "HUD — Calendar & Weather indicator" block
  stays open until the weather-indicator half ships.

## HUD — season, day & time display (with real minutes + day-length setting)
- **Date:** 2026-07-04
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "HUD - season, day & time
  display") A small always-visible readout of season / day / time — the first
  real, visible consumer of `getWorldContext()`. Build one `WorldContext`
  snapshot per frame in `tick()` and feed `wc.calendar` into `hud.ts`'s existing
  `updateHud` pattern. **Amendment folded in before first commit:** (1) add real
  minutes to `calendar.ts` (`minute` field + `advanceMinute` replacing
  `advanceHour`, still firing weather/flag daily work once per day); (2) add a
  real `dayLengthSeconds` setting driving the tick pace instead of the fixed
  `GAME_HOUR_SECONDS` constant; (3) show `HH:MM`.
- **Done:**
  - **Files:**
    - `index.html`: a second `.pill` (`#calendar`) inside the existing `#hud`,
      plus one CSS line (`#calendar{font-size:13px;white-space:nowrap}`).
    - `src/ui/hud.ts`: extended the existing `updateHud` to take an optional
      `CalendarSlice` and render `Season · Day N · HH:MM` (zero-padded); no new
      update mechanism.
    - `src/main.ts`: builds one snapshot per frame where `updateHud` is called —
      `getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags })`
      — and passes `wc.calendar`. The world-time loop is renamed
      `hourAccum`→`minuteAccum`, its interval read from `dayLengthSeconds()/(24*60)`
      each frame, advancing via `advanceMinute`; weather reroll + flag prune fire
      on its `newDay` return.
    - `src/systems/calendar.ts`: added `minute` to `CalendarState`
      (`fresh`/`load`/`reset` extended the same way as `hour`/`day`); replaced
      `advanceHour` with `advanceMinute(c)` which rolls minute→hour→day→season and
      returns `true` only when a new day begins.
    - `src/systems/settings.ts`: `Settings` gained `dayLengthSeconds` (default
      1440 = 24 real min/day, matching the prior pace) + a clamped
      `dayLengthSeconds()` accessor (1s floor).
    - `src/config.ts`: removed the now-unused `GAME_HOUR_SECONDS`.
    - `src/systems/worldContext.ts`: `minute` added to `CalendarSlice` and its
      populate.
    - `docs/ROADMAP_EXPANSION.md`: block ticked `[x]` in the working tree, but
      **not staged into this commit** — the entire HUD-blocks section is part of
      the product owner's uncommitted edits to that file (HEAD is 214 lines vs
      1101 in the working tree), so staging it would have pulled in ~887 lines of
      their in-progress work. The tick rides along with their eventual
      `ROADMAP_EXPANSION.md` commit.
  - **Systems / functions:** `getWorldContext` gains its first permanent call
    site; `CalendarState`/`CalendarSlice` carry `minute`; `advanceMinute`
    replaces `advanceHour` (returns new-day, so daily work stays once/day, not
    once/minute); `dayLengthSeconds` is a live setting that controls the clock.
  - **Behavior:** the HUD always shows `Season · Day N · HH:MM`, updating every
    in-game minute (~1 real second at the default pace) with days and seasons
    rolling over live and surviving reload. The passage of time is now a real,
    changeable setting (no UI yet) rather than a hardcoded constant.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 9/9 (fast/slow runs seeded via the
  `dayLengthSeconds` setting — no source instrumentation): default day length is
  1440s when unset; the HUD shows `HH:MM` matching the calendar; minutes visibly
  move within a few real seconds (06:00→06:03 over 3s); 80/80 samples matched the
  live calendar including minutes; days rolled over live (14 distinct days) with
  hour/minute always in range; season also advanced spring→summer; the
  minute-precise calendar survived reload; and halving `dayLengthSeconds` ~doubled
  the pace (60s→73 min/3s vs 30s→144 min/3s, ratio 1.97).
- **Commit:** HUD — season, day & time display (real minutes + day-length setting)
- **Follow-ups:** no settings UI yet — `dayLengthSeconds` is real and controls the
  pace but can only be changed by editing the saved setting; a settings screen is
  a later UI block. Next agreed work: the HUD weather indicator block (not started
  yet).

## World Context Block 6 — recipe closed; Infrastructure (Blocks 1-6) complete
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 6 — the "add a new data
  source" recipe) Block 6 has no code of its own; it's the reusable three-edit
  pattern (`worldContext.ts` + `main.ts` + `saves.ts`, plus the per-NPC
  `query.npcId` scoping note) that future subsystems follow to join World
  Context. Close it out: re-check the recipe against what Blocks 3-5 actually
  did and fix any drift, mark Calendar/Weather/World-event-flags as Built in the
  data-owner table, and tick Block 6.
- **Done (docs only — no code change):**
  - **Files:**
    - `docs/WORLD_CONTEXT.md`: data-owner table now lists Calendar, Weather, and
      World event flags as **Built** (with their real files/shapes) instead of
      "being built in this file"; Block 6 ticked `[x]`; and the recipe text was
      corrected for drift found against the shipped code (see below).
    - `docs/WORKLOG.md`: this entry.
  - **Doc drift fixed:**
    - Recipe step 2 claimed the new source is passed "at whatever call site
      currently calls `getWorldContext(...)`" — but there is **no permanent call
      site**: Blocks 1-5 ship no consumer (the debug calls used to verify each
      were removed). Reworded to say the first real call will be the dialogue
      system's, and to add the field to that literal when it exists.
    - The per-NPC scoping note showed the second parameter as `query`; the
      shipped signature is `_query` (underscored, unused). Noted that the
      underscore is dropped when the first consumer reads it.
    - Recipe step 1 now records that a slice may be optional (as
      `calendar`/`weather`) or required-with-default (as `flags`, `{}` when no
      source) — matching what actually shipped.
    - Recipe step 3 now mentions hooking daily-rollover work (weather reroll,
      flag prune) into the `calendar.hour === 0` block, which Blocks 4-5 did.
  - **Behavior:** none — documentation only. `getWorldContext()` and its five
    live slices (coins, skills, farm, calendar, weather, flags) are unchanged.
  - **Milestone:** the World Context Infrastructure package (Blocks 1-6) in
    `docs/WORLD_CONTEXT.md` is now **complete** — every block built, verified,
    and committed; the doc is closed out. World Context is a working data layer
    any future system can read via one `getWorldContext(sources)` call.
- **Build:** `npm run build` — ✅ passing (no source changed).
- **Commit:** World Context Block 6 — recipe closed; Infrastructure complete
- **Follow-ups:** none for World Context. Next agreed work is **UI** (not the
  dialogue system or any ROADMAP_EXPANSION block yet).

## Block 5 follow-up — absolute day counter for flag expiry
- **Date:** 2026-07-04
- **Resolves:** the Follow-up recorded on the "World Context Block 5 — World
  event flags" entry (flag durations were keyed on `calendar.day`, the
  day-of-season 1–10 counter, so a duration crossing a season boundary was
  imprecise — a flag could effectively never expire because `day` resets 10→1).
- **Block given:** (product-owner instruction) Add `absoluteDay(c)` to
  `calendar.ts` returning `seasonIndex * DAYS_PER_SEASON + day`, and pass it
  instead of `calendar.day` at the world-flags call sites in `main.ts` and
  `worldContext.ts`. `worldFlags.ts` internals (a plain-number `expiresOnDay`)
  don't change. Verify a season-spanning duration expires at the right absolute
  day.
- **Done:**
  - **Files:**
    - `src/systems/calendar.ts`: added `absoluteDay(c: CalendarState): number`
      (`seasonIndex * DAYS_PER_SEASON + day`) — a monotonic day count across
      seasons.
    - `src/main.ts`: the daily-rollover prune now passes
      `pruneExpired(worldFlags, absoluteDay(calendar))`; imports `absoluteDay`.
    - `src/systems/worldContext.ts`: the `flags` slice now uses
      `activeFlagsRecord(sources.flags, absoluteDay(sources.calendar))` (0 when
      no calendar); imports `absoluteDay`.
    - `docs/WORKLOG.md`: marked the Block 5 follow-up resolved.
  - **Systems / functions:** new `absoluteDay` accessor; no change to
    `worldFlags.ts` (its `expiresOnDay`/comparisons stay plain numbers — they're
    just now fed an absolute day). No save-shape change; existing flag saves
    remain readable (numbers compare fine, only the reference frame widened).
  - **Behavior:** world-flag expiry is now measured on a continuous day count,
    so a flag set late in a season with a multi-day duration stays active across
    the season boundary and expires on the correct day instead of lingering
    forever.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright (5/5, temporary fast cadence + a
  `window.__wf` hook keyed on `absoluteDay`, both since reverted): a flag set on
  spring day 8 (absolute day 8) with a 5-day duration was active exactly while
  absoluteDay < 13 (hasFlag and the World Context slice agreeing on every
  sample), stayed active into summer after the season rolled over (absolute days
  11–12), was sampled across the spring→summer boundary, and expired precisely
  at absolute day 13 (summer day 3) — not early, not never.
- **Commit:** Block 5 follow-up — absolute day counter for flag expiry
- **Follow-ups:** none. Next: Block 6 (the "add a data source" recipe — no code
  of its own), pending your go-ahead.

## World Context Block 5 — World event flags
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 5 — World event flags)
  A generic, expiring "something just happened" mechanism. Create
  `systems/worldFlags.ts` (a versioned *set* of entries), add `WORLD_FLAGS_KEY`
  to config + `saves.ts`'s `GAME_KEYS`, instantiate/reset it in `main.ts` and
  `pruneExpired` on the daily rollover, and add a `flags` slice to World
  Context. Done when setting a flag makes it appear in
  `getWorldContext(...).flags`, it disappears on its own after the given number
  of in-game days (via `hasFlag`), and it survives save/reload.
- **Done:**
  - **Files:**
    - `src/systems/worldFlags.ts` (NEW): `WorldFlags { version, entries[] }`
      with `load/save/resetWorldFlags`, `setFlag` (expiry = currentDay +
      durationDays), `hasFlag`, `pruneExpired` (drops entries past their day),
      and `activeFlagsRecord` (→ `Record<string, boolean>` of still-active
      flags). Exactly the spec's code.
    - `src/config.ts`: added `WORLD_FLAGS_KEY = "wildhearth-flags-v1"` (matching
      the existing key convention).
    - `src/systems/saves.ts`: added `WORLD_FLAGS_KEY` to `GAME_KEYS`.
    - `src/main.ts`: `const worldFlags = loadWorldFlags()` beside the other
      stores; `resetWorldFlags(worldFlags)` in `newGameReset()`; and
      `pruneExpired(worldFlags, calendar.day)` on the daily rollover (same
      `calendar.hour === 0` call site as Block 4's weather reroll).
    - `src/systems/worldContext.ts`: imported `activeFlagsRecord`/`WorldFlags`,
      enabled the `flags?: WorldFlags` source, added a required
      `flags: Record<string, boolean>` to `WorldContext`, and populated it via
      `sources.flags ? activeFlagsRecord(sources.flags, sources.calendar?.day ?? 0) : {}`.
    - `docs/WORLD_CONTEXT.md`: Block 5 ticked `[x]`.
  - **Systems / functions:** new save key `wildhearth-flags-v1`; a reusable
    expiring-flag store (`setFlag`/`hasFlag`/`pruneExpired`/`activeFlagsRecord`);
    World Context now always carries a `flags` record (`{}` when no source).
    `setFlag`/`hasFlag` are exported for future callers (dialogue, quests, NPC
    reactions) but have no in-game caller yet.
  - **Behavior:** no player-facing change — infrastructure. Any future system
    can mark a transient world fact (e.g. `setFlag(worldFlags, "fixed_bridge",
    4, calendar.day)`) and read it back through World Context until it expires;
    the daily prune keeps the saved list from growing forever.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 7/7 (temporary fast cadence + a
  `window.__wf` hook over the app's live `worldFlags`, both since reverted): a
  new game had no active flags; setting one made it appear in
  `getWorldContext().flags` and in localStorage; a 2-day flag (set on day 1)
  vanished from the slice and reported `hasFlag=false` by day 3 while a
  100-day flag stayed; `pruneExpired` removed the expired entry from storage;
  and the live flag survived a reload + Continue.
- **Commit:** World Context Block 5 — World event flags
- **Follow-ups:** ~~flag durations use `calendar.day` (day-of-season, 1–10) as
  the clock, so a duration crossing a season boundary is imprecise~~ **RESOLVED
  by "Block 5 follow-up — absolute day counter for flag expiry" (below/newer).**
  Also: Block 6 is the reusable "add a data source" recipe (no code of its
  own), pending your go-ahead.

## World Context Block 4 — Weather
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 4 — Weather) Create
  `systems/weather.ts` in the same shape as `calendar.ts`; add `WEATHER_KEY` to
  config, add it to `saves.ts`'s `GAME_KEYS`, instantiate + reset in `main.ts`
  and reroll it on each new in-game day (season-weighted), and expose a
  `weather` slice from World Context. The spec also notes a real mechanical
  effect (skip manual watering on rainy days) — per the product-owner
  instruction it is NOT wired yet (its farming.ts active-tending host block
  hasn't landed) and is recorded under Follow-ups instead.
- **Done:**
  - **Files:**
    - `src/systems/weather.ts` (NEW): `WeatherState { version, kind,
      daysSinceChange }` with `loadWeather/saveWeather/resetWeather`, a
      per-season weighted `WEATHER_TABLE`, `rollWeather`, `rollDailyWeather`
      (reroll for the day; `daysSinceChange` climbs on a repeat, resets to 0 on
      a change), and `isRaining`. Exactly the spec's code.
    - `src/config.ts`: added `WEATHER_KEY = "wildhearth-weather-v1"` (matching
      the existing key convention).
    - `src/systems/saves.ts`: added `WEATHER_KEY` to `GAME_KEYS`.
    - `src/main.ts`: `const weather = loadWeather()` beside the other stores;
      `resetWeather(weather)` in `newGameReset()`; the `tick()` hour loop now
      calls `rollDailyWeather(weather, currentSeason(calendar))` whenever
      `advanceHour` rolls the hour to 0 (a new day) — the "check
      `calendar.hour === 0` at the call site" option, leaving Block 3's
      `advanceHour` untouched. Also imports `currentSeason` from calendar.
    - `src/systems/worldContext.ts`: imported the weather types, enabled the
      `weather?: WeatherState` source, added a `WeatherSlice` (`state`,
      `daysSinceChange`) to `WorldContext`, and populated it in
      `getWorldContext()` (mapping `kind` → `state`, per the data-owner table).
    - `docs/WORLD_CONTEXT.md`: Block 4 ticked `[x]`.
  - **Systems / functions:** new save key `wildhearth-weather-v1`; new
    `WeatherState` + `WeatherKind`; season-weighted daily reroll; World Context
    now surfaces a live `weather` slice. `isRaining` is exported but not yet
    consumed (see Follow-ups).
  - **Behavior:** each new in-game day the weather rerolls, weighted by the
    current season (spring/summer lean clear with some rain, autumn adds fog,
    winter adds storm + fog). Persisted, and reset to clear on New Game. No
    visible/mechanical effect yet — it feeds World Context for now.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, two phases (both green). Variety
  (temporary fast cadence + a calendar/weather debug log, since reverted, 7/7):
  93 days across all four seasons produced no impossible season/weather pair,
  all four kinds appeared, storm only ever occurred in winter, `clear` was the
  modal kind (66/20/5/2 clear/rain/fog/storm) matching the weightings, and
  `daysSinceChange` both reset to 0 and climbed. Persistence (shipping build,
  3/3): a seeded storm/5 loaded unchanged on Continue, survived a reload, and
  New Game reset it to clear/0.
- **Commit:** World Context Block 4 — Weather
- **Follow-ups:** the real mechanical effect is deferred — when the crop
  active-tending block from `ROADMAP_EXPANSION.md` lands in `farming.ts`, use
  `isRaining(weather)` to skip the manual watering step for outdoor plots on
  rainy/stormy days. Not built now because its host system doesn't exist yet.
  Next: Block 5 (World event flags), pending your go-ahead.

## World Context Block 3 — Calendar & time
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 3 — Calendar & time)
  Create `systems/calendar.ts` in the same shape as `renovation.ts` (versioned
  state, `fresh()`, load/save/reset on a new key, tolerant of junk); add
  `CALENDAR_KEY` to config, add it to `saves.ts`'s `GAME_KEYS`, instantiate +
  reset it in `main.ts` and advance it once per in-game hour from `tick()`, and
  expose a `calendar` slice from World Context. Done when hour/day/season
  advance, survive save/reload, and `getWorldContext(...).calendar` reflects
  season/day/hour/phase.
- **Done:**
  - **Files:**
    - `src/systems/calendar.ts` (NEW): `CalendarState { version, seasonIndex,
      day, hour }` with `loadCalendar/saveCalendar/resetCalendar`,
      `currentSeason`, `currentPhase`, and `advanceHour` (rolls the day at hour
      0 and the season after `DAYS_PER_SEASON=10`, returning `seasonChanged` for
      Block 4). Exactly the spec's code.
    - `src/config.ts`: added `CALENDAR_KEY = "wildhearth-calendar-v1"` (matching
      the existing key convention) and `GAME_HOUR_SECONDS = 60` (real seconds
      per in-game hour — the tick cadence; placeholder pace, kept in config per
      the no-inline-tuning rule).
    - `src/systems/saves.ts`: added `CALENDAR_KEY` to `GAME_KEYS`, so New Game
      clears it.
    - `src/main.ts`: `const calendar = loadCalendar()` next to the other
      stores; `resetCalendar(calendar)` in `newGameReset()`; a `hourAccum`
      accumulator in `tick()` calls `advanceHour(calendar)` once per
      `GAME_HOUR_SECONDS` of actual play (inside the not-opening gate, so time
      only passes in-game).
    - `src/systems/worldContext.ts`: imported the calendar accessors/types,
      enabled the `calendar?: CalendarState` source, added a `CalendarSlice`
      (`season/day/hour/phase`) to `WorldContext`, and populated it in
      `getWorldContext()`.
    - `docs/WORLD_CONTEXT.md`: Block 3 ticked `[x]`.
  - **Systems / functions:** new save key `wildhearth-calendar-v1`; new
    `CalendarState` + `Season`/`DayPhase` unions; `advanceHour` day/season
    rollover; World Context now surfaces a live `calendar` slice.
  - **Behavior:** in-game time now runs during play — an hour every 60s, a day
    every 10 days into the next season — persisted and reset on New Game. No
    visible UI yet (that's a later block); it exists to feed World Context and,
    next, Weather.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via a temporary fast cadence + calendar debug
  log driven by Playwright (10/10): a new game started in spring; hour advanced
  through the day (phase mapping correct on every snapshot); the day rolled and
  the season changed spring→summer after 10 days; the advanced calendar (457
  in-game hours) was byte-identical after a reload and Continue was offered.
  Cadence restored to 60 and the debug log removed; clean build re-confirmed.
- **Commit:** World Context Block 3 — Calendar & time
- **Follow-ups:** none. Next: Block 4 (Weather), pending your go-ahead.

## World Context Block 2 — getWorldContext()
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 2 — `getWorldContext()`,
  the working-system milestone) Add the function below the Block 1 types; a
  pure snapshot builder over the live `sources`. Wire a temporary debug log in
  `main.ts` to confirm real coins/skills/farm flow and update, then remove it.
  Done when the logged context is real and accurate and updates as you earn
  coins / gain a skill / pay for a repair.
- **Done:**
  - **Files:**
    - `src/systems/worldContext.ts`: added `getWorldContext(sources, query)`
      below the Block 1 types — builds a `WorldContext` snapshot (version, coins
      from `economy.coins`, a `skills` id→value record from `skills.list`, and
      the four-flag `farm` slice). Pure, no stored state, no caching.
    - `docs/WORLD_CONTEXT.md`: Block 2 ticked `[x]`.
  - **Systems / functions:** `getWorldContext()` — the single "what's true
    right now?" read. The `_query` param (the Block 6 per-NPC hook) is present
    but unused for now. No permanent call site yet and no save keys; the
    temporary `main.ts` debug log used to verify it was removed, so `main.ts`
    is unchanged by this block.
  - **Behavior:** no player-facing change — infrastructure. The first real
    consumer will be the dialogue system in `ROADMAP_EXPANSION.md`; until then
    the function is exported and unused (still tree-shaken from the bundle).
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via a temporary debug log driven by Playwright:
  baseline snapshot matched seeded state (coins 200, fishing 5, farm all
  false); after walking to the farmhouse and patching the roof the next
  snapshot read coins 175 + farm.roof true; 5 snapshots confirmed it recomputes
  each call. Debug log then removed and the clean build re-confirmed.
- **Commit:** World Context Block 2 — getWorldContext()
- **Follow-ups:** none. Next: Block 3 (Calendar & time), pending your go-ahead.

## World Context Block 1 — shared types
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 1 — Shared types)
  Create `src/systems/worldContext.ts` with the World Context types at the top
  of the same file that will implement `getWorldContext()` (this codebase keeps
  types and functions together, e.g. `renovation.ts`). Done when it compiles
  with no runtime code yet (just the interfaces) and nothing else imports it.
- **Done:**
  - **Files:**
    - `src/systems/worldContext.ts` (NEW): the World Context type layer only —
      no runtime code yet.
    - `docs/WORLD_CONTEXT.md` (NEW to git): the standalone build spec, renamed
      from the mistyped `World.md`; Block 1 ticked `[x]`.
  - **Systems / functions:** interfaces `WorldContextSources` (economy, skills,
    farm now; calendar/weather/flags commented in for Blocks 3-5),
    `WorldContextQuery` (the `npcId` scoping hook for Block 6), `FarmSlice`, and
    `WorldContext`. No functions, no save keys, no module-level state — pure
    types following the explicit-`sources` convention (no registry).
  - **Behavior:** none yet — this is infrastructure. Nothing imports it, so it
    is tree-shaken out of the bundle; it exists for Block 2's function and the
    future systems that will read a world snapshot.
- **Build:** `npm run build` — ✅ passing.
- **Commit:** World Context Block 1 — shared types
- **Follow-ups:** none — Block 2 adds `getWorldContext()` to the same file.

## Step 9 — Save/load hardening
- **Date:** 2026-07-04
- **Block given:** (from `docs/ROADMAP_MVP.md`, Step 9 — Save/load hardening)
  - Version the save schema (`SAVE_KEY` + a `version` field already scaffolded
    in `economy.ts` — extend the same pattern to inventory, skills, farm-repair
    state, starter choice).
  - One explicit "new game" vs "continue" entry point.
  - Checkpoint: this is the MVP finish line. Closing and reopening the browser
    preserves everything above.
- **Done:**
  - **Files:**
    - `src/systems/meta.ts` (NEW): the playthrough-origin store — records the
      starter choice (the roadmap's one missing store), versioned and
      junk-tolerant. Now owns the `StarterTool` type.
    - `src/systems/saves.ts` (NEW): the persistence hub — knows the whole set
      of game-state keys; `hasSavedGame()` and `clearSavedGame()`.
    - `src/config.ts`: added `META_KEY = "wildhearth-meta-v1"`.
    - `src/ui/newgame.ts`: imports `StarterTool` from `systems/meta` and
      re-exports it (the type is persisted game origin, not a UI concept), so
      existing importers are unchanged.
    - `src/systems/settings.ts`: added a `version` field and a non-object
      parse guard (a bare/junk value now falls back to defaults instead of
      being spread over them).
    - `src/main.ts`: loads meta (`const meta = loadMeta()`); the title screen
      is gated on `hasSavedGame()` instead of raw key presence; `newGameReset`
      calls `clearSavedGame()` first, then re-seeds and stamps
      `meta.starterTool` + `saveMeta`; the guided first-tip (`firstTip()`) is
      tailored to the chosen starter tool; dropped the now-unused `SAVE_KEY`
      import.
    - `docs/ROADMAP_MVP.md`: Step 9 marked (DONE) with the dated note.
  - **Systems / functions:**
    - New save key `wildhearth-meta-v1` (`META_KEY`).
    - New type `Meta { version, starterTool }`; `StarterTool` union relocated
      to `systems/meta`. New fns `loadMeta()`, `saveMeta()`.
    - `saves.ts`: `hasSavedGame()` (present-and-parseable check), and
      `clearSavedGame()` over the `GAME_KEYS` set (economy, skills, renovation,
      meta — deliberately excludes settings + UI layout).
    - `settings.ts`: `Settings` now carries `version`.
    - `main.ts`: `firstTip()`; `newGameReset` now wipes-then-seeds and persists
      the starter choice.
  - **Behavior:** Continue is offered only when a real, parseable save exists —
    a corrupt save now falls back to New Game rather than a broken Continue.
    Closing and reopening restores coins, backpack, skills, farm repairs, and
    the remembered starter choice exactly. New Game wipes all game state (via
    one `clearSavedGame()` call) yet keeps player settings and panel layout;
    the guided first-tip now points at the livelihood the chosen tool unlocks.
    A fully corrupt localStorage boots cleanly to the title with no errors.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright, 14/14 checks + a corrupt-boot probe:
  corrupt-save gating, a full new-game → fish → reload → Continue round-trip
  restoring Fishing 10.3 and the caught fish exactly, starter-choice
  persistence + tailored tip surviving Continue, New Game wiping
  coins/bag/skills/farm while preserving UI panel layout, and a clean boot
  with every key corrupted (zero page errors).
- **Commit:** `3947c66` — Step 9 — save/load hardening
- **Follow-ups:** none. This is the MVP finish line — every ROADMAP_MVP.md
  checkpoint is now complete; next work is `docs/ROADMAP_EXPANSION.md`.

## Step 8 — Farm repair (tier-1 visible renovation)
- **Date:** 2026-07-04
- **Block given:** (from `docs/ROADMAP_MVP.md`, Step 8 — Farm repair
  (visible renovation, tier 1 only))
  - `src/art/buildings.ts`: add a "rundown" paint variant for the house
    (patched roof hole, boarded window, broken-plank fence) alongside the
    existing normal state.
  - `src/systems/renovation.ts`: 3–4 fixed repair actions (fix fence, patch
    roof, fix door), each costs coins + requires being near the farmhouse,
    flips one rundown flag to fixed and swaps the painter output.
  - Checkpoint: the farm visibly changes as a direct result of money earned
    — the renovation arc from VISION.md is now real, not just described.
- **Done:**
  - **Files:**
    - `src/systems/renovation.ts` (NEW): the farm-repair state module — four
      per-part flags, load/save/reset, persisted on its own versioned key.
    - `src/config.ts`: added `REPAIR_COST = { roof: 25, window: 15, barn: 30,
      fence: 10 }` (tuning for the four repairs) and `RENOVATION_KEY =
      "wildhearth-farm-v1"` (the new save key).
    - `src/art/buildings.ts`: `drawHouse` signature changed from a single
      `rundown` bool to per-part `(g, roofOk = true, windowOk = true)` — the
      roof-hole-and-patch is gated by `!roofOk`, the boarded window by
      `!windowOk`, so each defect can clear independently. `drawBarn` changed
      to `(g, barnOk = true)` (missing plank + loose door board gated by
      `!barnOk`).
    - `src/art/props.ts`: `drawFence` changed to `(g, fenceOk = true)` with an
      internal `const rundown = !fenceOk` (broken-plank gap + leaning posts
      now clear when the field fence is mended).
    - `src/systems/interact.ts`: added the farmhouse as a clickable
      renovation hub — `REPAIRS` table, `doRepair()`, the `house`
      `Interactable`, and `farm` on `InteractCtx`; imports `saveEconomy`,
      `saveFarm`, `REPAIR_COST`, and `HOUSE`.
    - `src/main.ts`: loads the farm state (`const farm = loadFarm()`), passes
      `farm` into the interaction context, resets it on New Game
      (`resetFarm(farm)`), and drives the three painters from the flags
      (`drawFence(ctx, farm.fence)`, `drawHouse(ctx, farm.roof, farm.window)`,
      `drawBarn(ctx, farm.barn)`); the old blanket `FARM_RUNDOWN` const is
      removed.
    - `docs/ROADMAP_MVP.md`: Step 8 marked (DONE) with the dated completion
      note (carried over from the build session).
  - **Systems / functions:**
    - New save key `wildhearth-farm-v1` (`RENOVATION_KEY`).
    - New type `FarmState { version, roof, window, barn, fence }` and the
      `FarmPart = "roof" | "window" | "barn" | "fence"` union.
    - New functions in `renovation.ts`: `loadFarm()`, `saveFarm()`,
      `resetFarm()` (New Game → all broken), `repairsLeft()`.
    - `interact.ts`: `doRepair(c, part)` — checks coins against
      `REPAIR_COST[part]`, deducts + `saveEconomy`, flips the flag +
      `saveFarm`, toasts the result; new `farm: FarmState` field on
      `InteractCtx`; the `house` interactable's `actions()` lists only the
      still-broken repairs (priority roof → window → barn → fence) plus Look.
    - Painter signatures changed to read per-part flags (see Files).
  - **Behavior:** The farm starts fully rundown (roof hole + patch, boarded
    window, missing barn plank + crooked door board, broken-plank fence +
    leaning posts). Walking up to the farmhouse offers a paid repair for each
    still-broken part — left-click / E does the next one, right-click lists
    them all (Patch the roof 25 / Reglaze the window 15 / Mend the barn 30 /
    Mend the fence 10). Each repair deducts coins, flips its flag, and swaps
    the art on that structure instantly. Too few coins → a "Not enough coins
    — that repair costs N." refusal with no flag change. Once every part is
    mended the house only offers Look. Repairs (and the spent coins) persist
    across reload; New Game wipes the farm back to fully rundown.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright drove the real game (11/11 checks):
  rundown start, all four repairs with correct coin deductions (200 → 120)
  and live visual swaps, the broke-player refusal, Look-only once whole, and
  persistence across reload; New Game reset to rundown.
- **Commit:** `c420f8c` — Step 8 — Farm repair (tier-1 renovation)
- **Follow-ups:** The Building/Renovation *skill* is not yet wired to these
  repair actions — repairing currently trains no skill and applies no
  skill-based discount. Deferred to the "Complete the base skill set" block
  in `docs/ROADMAP_EXPANSION.md`.
