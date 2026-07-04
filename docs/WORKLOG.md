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
