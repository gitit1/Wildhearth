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

## HUD — weather indicator
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "HUD - weather
  indicator") A small weather indicator next to (or directly below) the
  calendar readout showing `wc.weather` — plain text label first pass,
  reusing the same per-frame snapshot (no second `getWorldContext()` call).
  Not the visual weather layer.
- **Done:** a `#weather` pill in the HUD (index.html) rendering
  "☀ Clear / 🌧 Rain / ⛈ Storm / 🌫 Fog" from the snapshot already built in
  `tick()`; `updateHud` gains the optional `WeatherSlice`. Layout: the HUD
  row now wraps so the weather pill sits directly below the calendar (the
  spec's "or directly below") and the minimap moved down 36px to clear it.
  Also ticks the older combined "HUD — Calendar & Weather indicator" block —
  both its halves now exist via the split blocks.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 4/4 (fast 6s days): the seeded
  Storm showed immediately; across ~15 in-game days the label always matched
  the live weather store; every label change coincided exactly with a day
  rollover (the daily reroll — the block's "changes at the correct point"
  criterion); multiple states observed. Screenshot reviewed (clean two-row
  HUD, minimap clear).
- **Commit:** HUD — weather indicator
- **Follow-ups:** the visual weather layer (rain particles, sky tint) remains
  its own future polish item, as the block states.

## Dev tool — World Context inspector
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Dev tool — World
  Context inspector") A toggle-able debug overlay dumping the full
  `getWorldContext()` snapshot as readable text — backtick key (confirmed
  free in `engine/input.ts`), monospace on a translucent box, refreshed every
  frame while visible, never player-reachable.
- **Done:** `src/ui/debugpanel.ts` (NEW) — a fixed `<pre>` created in code
  (no player-facing markup), Backquote toggles; `updateDebugPanel(wc)` is fed
  the SAME per-frame snapshot the HUD uses (never a second
  `getWorldContext()` call, honoring the weather-block rule). Two lines in
  `main.ts`.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 5/5: hidden by default;
  backtick shows a dump carrying the real seeded state (coins 77, fog with
  daysSinceChange 2, spring dawn, all six slices present); the dump advanced
  live (375 → 412 in-game minutes over 1.5 real seconds at a 60s day);
  backtick hides it again. Screenshots on/off reviewed.
- **Commit:** Dev tool — World Context inspector
- **Follow-ups:** future slices (relationships, needs) appear automatically —
  it prints whatever the snapshot carries.

## Cooking skill, extended
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Cooking skill,
  extended") The minimal one-recipe version exists; build it out — more
  recipes using 2+ inventory items → 1 cooked item, sellable for more than
  the raw ingredients.
- **Done:** `src/data/recipes.ts` only — five multi-ingredient recipes join
  the same table the hearth already reads: Root stew (potato+carrot → 14,
  floor 5), Corn chowder (corn+potato → 15, floor 10), Forest sauté
  (mushroom+wild garlic → 9, floor 15), Fisher's supper (carp+sorrel → 10,
  floor 20), Berry pie (2 berries+wheat → 13, floor 25). Every dish prices
  above its raw-ingredient total; prices/names/icons flow through the
  existing table-driven plumbing with zero code changes.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 6/6: at the hearth with mixed
  ingredients the compote cooked first; Root stew was offered once its floor
  (5 ≤ Cooking 6) and BOTH ingredients were held, consumed both and produced
  the dish; the floor-25 Berry pie stayed hidden at Cooking 6 despite its
  ingredients being present; the stew sold at 14 (> 10 raw) in the stall menu.
- **Commit:** Cooking skill, extended
- **Follow-ups:** none — new dishes are one table row each.

## The Memory Book system
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "The Memory Book
  system") `systems/collections.ts` — a generic tracked-category engine (add
  entry, X/Y discovered), never one-off code per category;
  `systems/memories.ts` — a life-event log (timestamp + flavor text);
  `ui/memorybook.ts` — one window, two tabs, opened via an on-screen icon.
- **Done:**
  - **Files:**
    - `src/systems/collections.ts` (NEW): the generic engine — a `CATEGORIES`
      table + `discover()` (returns true only on FIRST discovery),
      `discoveredCount`, persisted on `wildhearth-collections-v1`.
      **Adaptation, documented:** the spec's first three categories
      (birds/animals/flowers) have no content source until the
      binoculars-sighting mechanic (Riverside Fisherwoman block, skipped this
      run) — so the first LIVE categories are fish (12) and wild finds (11),
      which the spec explicitly says plug into the same engine; the bird/
      animal/flower categories are one table row each when sightings land.
    - `src/systems/memories.ts` (NEW): curated once-per-key life events with
      an in-game date stamp (season + day), on `wildhearth-memories-v1`.
      Deliberately curated, per the spec's anti-Sims-3-log warning.
    - `src/ui/memorybook.ts` + index.html (NEW): a draggable/resizable gump
      (makePanel, like skills/backpack) with Collections/Memories tabs,
      opened from a new 📖 tool icon or key M; re-renders at most 1×/sec
      while open.
    - Event wiring: ten curated firsts — first catch/forage/harvest/busk/
      cook (main.ts), first repair + farm-made-whole (doRepair via a new
      `InteractCtx.memory` hook), first flowers (flower beds), first sale +
      first animal (`initShopWindow` gains a memory callback). Fish/forage
      discoveries log from the catch/pick handlers with a "New in your book"
      toast on first sighting only.
    - Both keys in `GAME_KEYS`; New Game wipes the book.
  - **Behavior:** a 📖 Memory Book opens anywhere: Collections shows "Fish
    2/12"-style progress with named, icon'd entries per discovery; Memories
    reads like a diary — "Spring, Day 4 — Your first catch…" — each moment
    recorded exactly once with its in-game date, surviving reload.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 8/8: empty book shows 0/12 +
  0/11 with empty states; four casts recorded 2 distinct species (junk
  correctly excluded) and exactly one first_catch memory stamped Spring Day
  4; both tabs render the real content; everything persists across reload.
  Screenshot reviewed (gump, tabs, dated entry, active tool icon).
- **Commit:** The Memory Book system
- **Follow-ups:** birds/animals/flowers categories + the diegetic "book sits
  at the rest corner" flavor arrive with the binoculars/sighting mechanic;
  minerals with mining (both blocked on skipped blocks).

## Camera zoom
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Camera zoom")
  `engine/camera.ts` gets zoom in/out — a mouse scroll-wheel handler on the
  game canvas and an on-screen button pair for touch, adjusting the existing
  scale within reasonable min/max bounds.
- **Done:**
  - `src/engine/camera.ts`: a player `userZoom` factor multiplies the
    automatic fit; `adjustZoom(steps)` clamps it to
    `CAM_USER_ZOOM_MIN/MAX` (0.6–2.4, step 0.15 — knobs in config).
  - `src/main.ts`: wheel listener on the canvas (preventDefault, notch = one
    step) + `#zoomIn`/`#zoomOut` click wiring.
  - `index.html`: a stacked ＋/− button pair bottom-right of the play area,
    styled like the existing tool buttons.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 5/5, measured by counting the
  farmer's exact shirt-tone pixels on the live canvas (sprite area scales
  with zoom²): baseline 398px → 1326px after five wheel-ups → 128px zoomed
  out → unchanged after 20 more wheel-downs (min clamp holds) → 982px after
  six ＋-button presses (touch path). Screenshot reviewed at max zoom-in.
- **Commit:** Camera zoom
- **Follow-ups:** zoom level is session-only (not persisted) — the spec
  doesn't ask for persistence; noted in case it's wanted later.

## Toast/notification queue
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Toast/notification
  queue") Toasts share one slot with no queueing — simultaneous events
  visually collide. Add a simple queue: one at a time, short delay between.
- **Done:** `src/ui/hud.ts` only — `toast()` enqueues instead of overwriting;
  `updateToast` shows each for 2.2s with a 0.3s gap before the next. A soft
  cap (4 waiting) drops the oldest message so an event burst (rapid fishing)
  can't leave minutes-stale toasts playing. No caller changes — same API.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 4/4: two back-to-back repairs
  fired two toasts that played in order ("roof is whole" → "light back in")
  with a visible gap and no clobbering. Bonus proof: on the first run the
  guided tip toast — which the old single-slot code would have clobbered —
  correctly queued and played first.
- **Commit:** Toast/notification queue
- **Follow-ups:** none.

## Complete the base skill set — 4 new skills + the Gain Guard
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Complete the base skill
  set") Add Animal Husbandry, Cooking, Building/Renovation, and Ornamental
  Gardening — each wired to a real mechanic — and patch the gain algorithm
  with a UO-style Gain Guard (consecutive failed gain-rolls force a success
  past a threshold), applied to all 9 skills uniformly.
- **Done:**
  - **Files:**
    - `src/systems/skills.ts`: SKILL_NAMES grows to 9; `Skill` gains a
      persisted `fails` counter; **gainSkill is now chance-based** — success
      chance `1 - value/100`, flat `SKILL_GAIN_BASE` (0.3) on success. The old
      code always gained a shrinking amount, so "failed gain-rolls" didn't
      exist; this conversion preserves the expected pace exactly (chance ×
      flat ≡ old shrinking gain) while giving the Guard something to guard.
      Past `GAIN_GUARD_FAILS` (4) consecutive misses the next roll is forced.
      Cap-draining unchanged, applied on success.
    - **Building**: `doRepair` in `interact.ts` rolls a Building gain per
      repair (the gap the block names). `InteractCtx` gains `skillPopup` so
      systems-level actions can float the "+0.3" without importing UI.
    - **Cooking (minimal)**: `src/data/recipes.ts` (berry compote: 2 berries
      → dish selling 6 > raw 4) + `src/systems/cooking.ts` (timed activity
      mirroring fishing; `COOK_TIME` 1.2s) + the interior hearth now offers
      "Cook X" per cookable recipe; completion consumes ingredients, adds the
      dish, rolls Cooking. Dish prices/names/icons table-driven (steaming-bowl
      painter). This unblocks the Keeper path's forage→cook→sell loop.
    - **Animal Husbandry**: owned cow/hens are interactables now
      (`registerAnimal` — live-position hit/reach, guarded against New-Game
      cleared arrays); Feed consumes 1 corn (`FEED_GAIN_ITEM`) and rolls
      Husbandry.
    - **Ornamental Gardening**: `src/systems/gardening.ts` (3 flower beds by
      the house on `wildhearth-garden-v1`, `FLOWER_BEDS` in zones), flower
      seeds at the stall (3), planting rolls Gardening; beds bloom over
      `FLOWER_GROW_DAYS` (0.5 day) and stay in bloom; `drawFlowerBed` paints
      earth → seedlings → swaying wildflowers.
    - `saves.ts`: `GARDEN_KEY` **and `PLOTS_KEY`** added to `GAME_KEYS`
      (plots key was missed in the crop unit — caught here).
    - **Fix found by verification:** the interior unit had left the front
      door's reach as the whole house rect, so "Go inside" shadowed the repair
      hub's E-prompt everywhere near the house. Door reach is now only the
      strip in front of the door; repairs prompt normally elsewhere.
  - **Behavior:** nine skills, all real: repairs train Building, the hearth
    cooks (and sells) a first dish, bought animals are fed your own corn for
    Husbandry, and flower beds bloom by the house for Gardening. Skill gains
    are rolls now — but a dry streak self-corrects within 5 uses at any level.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 14/14: all nine names in the
  skills window; a repair took Building 0→0.3 (deterministic at value 0);
  cooking consumed 2 berries → compote in bag + Cooking 0→0.3; feeding the hen
  consumed corn + Husbandry 0→0.3; planting flowers Gardening 0→0.3, the bed
  bloomed in its half-day and the bloom survived reload; and the Gain Guard
  held — 6 casts at Fishing 99 (1% chance) still gained ≥0.3. The interior
  suite re-ran green (7/7) after the door-reach fix.
- **Commit:** Complete the base skill set — 4 new skills + the Gain Guard
- **Follow-ups:** the gain-model conversion makes near-100 progress faster
  than the old guaranteed-but-tiny gains (a forced 0.3 every ≤5 uses vs 0.01
  per use) — flagged for tuning review; the block's spec demanded the Guard,
  which requires chance-based rolls. Cooking depth continues in "Cooking
  skill, extended".

## Foraging variety pass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Foraging variety pass")
  Many more wild fruit/vegetable types (not just one generic berry), each with
  rarity/location/season tags in `data/forage.ts`, following `data/fish.ts`.
- **Done:**
  - **Files:**
    - `src/data/forage.ts` (NEW): 11 finds — berries (legacy id kept, floor-0
      all-season fallback), wild garlic, brown mushroom, sorrel, hazelnuts,
      wild strawberries, elderflower, wintergreens, rosehips, chanterelle,
      truffle (floor 60, weight 2 — the rare prize). Each: price, weight,
      skill floor, "forest" location tag, season tags, icon descriptor.
    - `src/systems/foraging.ts`: `resolveForage(skill, season, location)` —
      weighted roll over the eligible finds.
    - `src/main.ts`: the pick handler rolls the table (season + skill aware);
      the Foraging extra-find bonus stays on top; toasts name the find.
    - `src/systems/economy.ts`/`inventory.ts`: prices/names from the table
      (`BERRY_PRICE` retired from config).
    - `src/art/icons.ts`: four tinted forage silhouettes (cluster/cap/sprig/
      nut) shared across the table; berries keep their classic icon.
    - `src/systems/interact.ts`: bushes renamed "Forage bush" / action
      "Forage" with season-neutral flavor.
  - **Behavior:** every pick is a real find now — spring gives garlic and
    mushrooms alongside berries, autumn adds hazelnuts/rosehips/chanterelles,
    winter has wintergreens and (at high skill) truffles, and each sells at
    its own table price. Skill floors keep the rich finds gated.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 9/9: skill-0 spring picks stay
  in the floor-0 in-season set; autumn at skill 90 excludes spring/summer/
  winter-only finds and reaches gated ones (chanterelle observed); winter
  yields only winter-eligible finds and more than berries; forage sells at
  table prices in the stall menu (Chanterelle 8, Rosehips 5 verified rows).
- **Commit:** Foraging variety pass
- **Follow-ups:** the wild-fruit→farmable-seed bridge belongs to the Riverside
  Fisherwoman block (skipped this run); the table's location tags are ready
  for it and for new regions.

## Crop/farming variety pass — active tending
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Crop/farming variety
  pass") Two changes together: crop variety (a good number of types, fruits and
  vegetables, gated by Farming skill and season) and **active tending replacing
  passive timer growth** — planted crops need watering to progress; neglected
  crops grow slower or wilt outright. Also fulfils WORLD_CONTEXT Block 4's
  standing follow-up: rain now auto-waters outdoor plots.
- **Done:**
  - **Files:**
    - `src/data/crops.ts` (NEW): 9 crops (corn, carrot, potato, wheat, tomato,
      strawberry, winter root, pumpkin, melon) — each with seed id/name/price,
      produce price, `growDays` (watered in-game days to ripen), Farming skill
      floor (0–40), planting seasons, and a field/icon palette. Legacy generic
      "seeds" resolve to corn via `cropBySeed` (compat shim).
    - `src/systems/farming.ts` (rewritten): `PlotCell` gains `cropId`,
      `watered`, `dryDays`; new states incl. `wilted`; new work kinds `water` +
      `clear`; **the field persists** on `wildhearth-plots-v1`
      (`loadPlots`/`savePlots`/`resetPlots`, in `GAME_KEYS`) — also closing the
      MVP gap where crops vanished on reload; `updatePlots` advances **watered
      cells only** (growth = growDays × dayLengthSeconds, Farming still
      shortens it); `rollPlotsDay` (once per in-game day, after the weather
      reroll): hand-water drains, dry days bank, `WILT_DRY_DAYS`=3 wilts the
      crop, and **rain waters every growing cell for free**.
    - `src/systems/interact.ts`: plot menus rebuilt — Till; one "Plant X seeds"
      entry per distinct packet held (skill-floor + season refusals with clear
      toasts); Water (only when thirsty); Harvest; Clear for wilted; Look shows
      crop, %, and watered/thirsty.
    - `src/systems/shop.ts`: generic seed packet replaced by per-crop packets,
      **stocked only in their planting seasons**; `ShopEntry.seasons` +
      `initShopWindow` gets a season getter. `SEEDS_PRICE`/`CORN_PRICE`/
      `CROP_GROW_TIME` retired from config (data-table driven); `WATER_TIME`/
      `CLEAR_TIME`/`WILT_DRY_DAYS`/`PLOTS_KEY` added.
    - `src/art/props.ts`: watered soil reads darker/damp; `drawCropTile` tinted
      per crop palette; new `drawWiltedTile` (grey-brown drooped stalks).
    - `src/art/icons.ts`: tinted seed packets + a generic produce painter per
      crop (corn keeps its bespoke icon).
    - `src/systems/economy.ts`/`inventory.ts`: produce prices/names from the
      table (seeds deliberately not sellable back).
    - `src/main.ts`: plots load/persist; the five work completions (till/plant/
      water/harvest/clear) with rain-aware planting; `rollPlotsDay` on the
      day rollover; palette/watered/wilted-aware field drawing.
  - **Behavior:** nine crops with real seasonal identity — the stall stocks
    only what can be planted now, planting checks your Farming skill and the
    season, a fresh planting on a rainy day starts watered, hand-watering is a
    daily chore that visibly darkens the soil, three dry days kill the crop
    (Clear and start over), and the whole field — crops, watering, wilt —
    survives a reload.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 19/19 across 7 scenarios: the
  full till→plant→water→ripen→harvest arc with a mid-growth reload preserving
  crop+watered state; rainy-day planting auto-watered with no Water action
  offered; skill-floor refusal (melon at Farming 0); season refusal (pumpkin in
  spring); 3 consecutive dry days wilting the crop (through random rain days —
  observed rain-waterings en route, which is the system working) and Clear
  resetting the tile; spring vs winter stall stock; legacy "seeds" planting
  corn.
- **Commit:** Crop/farming variety pass — active tending
- **Follow-ups:** resolves the WORLD_CONTEXT Block 4 / Weather-block follow-up
  (rain→watering is now a real mechanical effect). Weeding/fertilizing depth
  and yield-scaling are future extensions the block names but doesn't require.

## House interior — first pass, deliberately bare and broken
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "House interior — first
  pass, deliberately bare and broken") The house becomes enterable; minimum
  viable rooms, each functional but rundown: soot-blackened hearth + rusty pot
  + empty shelf, cracked basin on a wobbly stand + empty bucket, straw bed with
  one threadbare blanket and no pillow, a short-legged chair + crate table,
  bare walls with a crack letting in a line of light at certain times of day,
  creaky/rotten floorboards.
- **Done:**
  - **Files:**
    - `src/world/zones.ts`: `HOUSE_DOOR` (matches drawHouse's door), `ROOM`
      (10×7-tile interior coordinate space), spot rects `R_HEARTH`/`R_BASIN`/
      `R_BED`/`R_REST`/`R_DOOR`, `ROOM_ENTRY`.
    - `src/world/collision.ts`: scene-aware collision — `Scene` type,
      `setCollisionScene()` (module-level, camera.ts precedent), interior walls
      + bed/basin/crate blocking; the world path unchanged.
    - `src/engine/camera.ts`: `applyCamera` takes optional bounds; a scene
      smaller than the viewport (the room) is centred instead of corner-pinned.
    - `src/art/interior.ts` (NEW): the whole room painter — plank floor with two
      split rotten boards, bare walls, the wall crack with a **day/dawn-gated
      light shaft** (reads day-phase), sooty hearth + rusty pot + empty shelf,
      cracked clay basin on a splay-legged stand + bucket, straw mattress +
      threadbare blanket (worn patch, no pillow), tilted short-leg chair +
      crate table, worn exit mat.
    - `src/systems/interact.ts`: `scene` field on Interactable + scene-filtered
      `hitTest`/`reachable`; new interactables — front door ("Go inside",
      registered before the house hub so the small hotspot wins), four interior
      Look spots with flavor text, and the exit mat ("Go outside", ordered
      before the rest corner so it wins their overlap; rest corner reach
      tightened). `InteractCtx` gains `enterHouse`/`leaveHouse`.
    - `src/main.ts`: scene state + `enterHouse()`/`leaveHouse()` (position
      swap, collision-scene switch, pending/menu cleanup), scene passed to all
      hit/reach lookups, `drawInteriorScene()` (centred room on darkness,
      dimmer vignette), minimap update paused indoors, shared `drawVignette`.
  - **Behavior:** clicking the farmhouse door (or E beside it) steps inside a
    small, centred room containing exactly the five specced spots, each
    inspectable with honest tier-1 flavor; the wall crack visibly leaks light
    during day/dawn; the exit mat walks you back out at the front door. World
    objects (pond/stall/plots) are unreachable indoors and vice versa. The
    interior is the future home of Cooking (hearth — next unit) and the Needs
    system (skipped this run; see AUTORUN notes).
  - **Not persisted:** which scene you're in — a reload starts outside (the
    spec doesn't ask for indoor save-position; noted here for honesty).
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 7/7: door offers "Go inside";
  all four spots found and Look-ed (exact flavor lines asserted); no world
  interactable leaks into the interior; exit via the mat returns to the yard
  with the door prompt back. Screenshots reviewed: centred room, hearth/bed/
  basin/chair/crate/mat all render, light shaft visible at noon.
- **Commit:** House interior — first pass, deliberately bare and broken
- **Follow-ups:** hearth Cook action lands with the base-skill-set unit; needs
  restoration at these spots waits on the Needs system (skipped — social need
  has no restoration path until NPCs exist).

## Fish variety (rich tier — 10+ species) + junk catches + the rod gate
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Fish variety (rich tier —
  10+ species) + junk catches") `data/fish.ts` species table (rarity weight,
  Fishing-skill floor, where/when tags), `data/junk.ts`, `systems/fishing.ts`
  rolls both tables; plus the fix: fishing must hard-require an owned rod.
- **Done:**
  - **Files:**
    - `src/data/fish.ts` (NEW): 12 species — Common Carp, Perch, Bluegill,
      Sunfish, Crucian Carp, Weather Loach (rain/storm-only), Pike, Silver Eel
      (autumn), Golden Koi, Moonfish (fog-only), Sturgeon (lake/boat — tagged
      for future zones, unreachable from the pond), Elder Carp (floor 90 pond
      legend). Each: price, weight, skillFloor, location tags
      (pond/river/lake/boat), optional season/weather tags, icon palette.
    - `src/data/junk.ts` (NEW): old boot / empty tin / tangled rope, token
      1-coin value (the spec's "no sell value (or a token amount)" — token
      chosen so junk never permanently clogs the bag).
    - `src/systems/fishing.ts`: `resolveCatch(skill, season, weather, location)`
      — junk odds `JUNK_CHANCE_BASE` 0.35 → `JUNK_CHANCE_MIN` 0.05 at skill 100,
      then a weighted roll over species filtered by location/floor/season/
      weather. Bite speed was already skill-scaled (slow bites at low skill).
    - `src/systems/interact.ts`: the rod gate — the pond's Fish action refuses
      without an owned rod ("You need a fishing rod — the stall sells one.").
    - `src/systems/shop.ts` + config: rod added to stall stock (`ROD_PRICE` 12,
      unique — same basic-tool tier as the hoe) so the hard gate never
      dead-ends a non-rod start; VISION's "everyone can fish a little" then
      holds via purchase.
    - `src/systems/economy.ts` / `inventory.ts`: `GOOD_PRICES`/`ITEM_NAMES` now
      build from the data tables (legacy generic "fish" stays priced for old
      saves).
    - `src/art/icons.ts`: parameterized fish-silhouette painter tinted per
      species palette; boot/tin/rope painters.
    - `src/main.ts`: the catch handler resolves against the tables using live
      skill + season + weather and toasts the actual species/junk by name.
  - **Behavior:** casting without a rod is refused with a shop hint; the stall
    sells a rod for 12. Catches are real species now — low skill sees junk
    (~35%) and commons; high skill sees junk rarely and reaches Pike/Koi/Elder;
    season and weather genuinely matter (Bluegill vanishes in winter, Crucian
    appears; Weather Loach only bites in rain; Moonfish only in fog). Every
    species sells at its own table price.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 20/20 across 7 scenarios: the
  rod gate refusal; buying the rod (20→8 coins) then landing a real catch;
  20 catches at skill 0 spring/clear → only Carp/Perch/Bluegill + 6 junk;
  25 catches at skill 95 → no out-of-season/weather species, high-floor
  species present, 1 junk; winter → Bluegill/Koi gone + Crucian present; rain
  → Weather Loach caught; species sell rows show table prices (Carp 3, Koi 14).
- **Commit:** Fish variety (rich tier) + junk catches + the rod gate
- **Follow-ups:** catch quality tiers, bait, and rod tiers belong to the
  Riverside Fisherwoman block (skipped this run — needs the river/NPC systems).
  River/lake/boat location tags are already in the table for when zones grow.

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
- **Follow-ups:** ~~the real mechanical effect is deferred — when the crop
  active-tending block lands, use `isRaining(weather)` to skip manual
  watering~~ **RESOLVED by "Crop/farming variety pass — active tending"
  (newer entry): rain now auto-waters growing plots each day.**

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
