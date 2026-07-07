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

## Seasonal wildlife — butterflies, songbirds, rabbits, deer by season & weather
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** ROADMAP_EXPANSION's "Wild animals along the road/river"
  block — ambient, non-interactive-except-fleeing critters, migratory per
  DECISIONS' World section ("spring butterflies, summer birds, winter
  mammals"), changing with season AND weather.
- **Done:**
  - **Files:**
    - `src/data/wildlife.ts` (new) — `WildlifeKind` = `"butterfly" |
      "songbird" | "rabbit" | "deer" | "duck" | "hare"`; `WildlifeDef {id,
      kind, regions, seasons, weather, maxCount, speed}`; `WILDLIFE` table,
      one row per kind: butterfly (spring+summer, farm/road/market,
      clear/fog), songbird (spring–autumn, forest/road/farm,
      clear/fog/rain), rabbit (spring only, farm/road), duck (summer only,
      river — on the water itself), deer (autumn+winter, forest/road), hare
      (winter only, farm/road). "Storm" is never in any row's weather list —
      nothing is out in a storm. `maxCount`/`speed` are read from `config.ts`
      (see below) so the WHEN/WHERE data stays separate from the numeric
      tuning, matching the fish/crop/forage table convention.
    - `src/config.ts` — new "Seasonal wildlife" section:
      `WILDLIFE_MAX_COUNT`/`WILDLIFE_SPEED` (per-kind records),
      `WILDLIFE_RAIN_BIRD_MULT` (0.4 — "fewer birds" in rain, scales
      songbird/duck caps without a separate table column),
      `WILDLIFE_SPAWN_CHANCE` (0.05/sec — gradual repopulation, never a
      burst), `WILDLIFE_FLEE_RADIUS` (85px), `WILDLIFE_DESPAWN_RANGE`
      (240px), `WILDLIFE_FLEE_SPEED_MULT` (2.4×), `WILDLIFE_WANDER_RADIUS`
      (60px), `WILDLIFE_DESPAWN_SECONDS` (0.5s fade/fly-off).
    - `src/entities/wildlife.ts` (new) — `WildlifeInst` (position, home
      point, wander target, dist for the rig's walk cycle, fleeing/
      despawning flags, per-instance color/antler-flag). `createWildlife()`,
      `updateWildlife(list, season, weather, player, dt)`: population
      maintenance (fades out any instance whose kind fell out of season/
      weather, or is over a just-shrunk cap), gradual repopulation (each
      eligible def occasionally tries to fill an empty slot via
      `pickSpawnPoint()`, which reuses `world/collision.ts`'s `blocked()`
      for land creatures and `inWater()` for ducks — no separate rejection-
      zone table), then per-instance movement: butterflies/ducks are pure
      ambient wander (recentred on their spawn point, never drifting across
      the map); songbirds "fly off" (a quick despawn) when the player closes
      within `WILDLIFE_FLEE_RADIUS`; rabbits/hares/deer run directly away
      (recomputed every frame) and despawn once they've put
      `WILDLIFE_DESPAWN_RANGE` between themselves and their spawn point.
      `activeDefs(season, weather)` (storm always returns `[]`) exported for
      reuse/testing.
    - `src/art/wildlife.ts` (new) — `drawWildlife(g, inst, time)`, the
      depth-sort dispatcher: butterflies get a bespoke `drawButterfly` (2
      wing ellipses flapping on a fast sine + a thin body + a tiny ground
      shadow); songbird/duck reuse `animalRig.ts`'s `drawBird` with new
      `SONGBIRD_RIG`/`DUCK_RIG` presets; rabbit/hare/deer reuse
      `drawQuadruped` with new `RABBIT_RIG`/`HARE_RIG`/`DEER_RIG` (+
      `DEER_BUCK_RIG`, antlers on roughly half of spawned deer) presets —
      never a new rendering engine, per that file's own header comment.
      Despawning instances fade (alpha from `despawnT`) and, for airborne
      kinds, visibly lift as they fade (a stand-in for "flying away").
    - `src/art/animalRig.ts` — `QuadrupedParams` gains an `antlers?: boolean`
      field; `drawQuadruped` draws a simple branching main-beam + one tine
      per side when set (deer bucks only) — a small additive variant, the
      existing `horns` rendering (cow) is untouched.
    - `src/main.ts` — `const wildlife: WildlifeInst[] = createWildlife();`
      (module-level, not persisted — purely ambient, regenerates each
      session like the townsfolk's positions do); `updateWildlife(...)`
      called unconditionally alongside `updateAnimals` (ambience runs even
      behind the opening screens); each instance pushed into the depth-
      sorted `ents` array in `draw()`, same pattern as cows/hens. Dev bridge:
      `wildlife` (the live array) exposed on `window.__wh` for inspection.
  - **Behavior:** in spring, butterflies flutter over the farm/road/market
    and songbirds + rabbits appear; in summer, butterflies + songbirds +
    ducks on the river; in autumn, songbirds + deer near the forest/road; in
    winter, hares + deer only (no insects/birds). Rain despawns insects and
    thins bird counts; storm empties the sky entirely. Getting close to a
    rabbit/hare/deer sends it running away until it's out of sight; getting
    close to a songbird makes it fly off. None of it is collectible or
    tied to any skill yet.
  - **Systems / functions:** no new save keys — wildlife is intentionally
    ephemeral (not part of any save), same non-persistence choice as the
    townsfolk's live positions.
- **Verify (Playwright, headless Chromium + the dev `__wh` bridge, polling
  `window.__wh.wildlife` rather than fixed sleeps since spawn timing is
  probabilistic):** forced spring+clear and waited for population — got
  butterflies, songbirds, AND rabbits together, matching the spring mix;
  forcing rain despawned every butterfly within its ~0.5s fade while
  songbirds/rabbits remained; forcing winter (a separate run, ~90s of live
  ticking) produced BOTH hares and deer with no butterfly/rabbit/duck
  leaking in; walking the player next to a spawned rabbit set its `fleeing`
  flag true and it despawned within a few seconds of running; forcing storm
  brought the live (non-despawning) count to 0. No console/page errors in
  any run. A screenshot with the player teleported next to a spawned deer
  (winter forest) confirms the visual: a tall, thin-legged quadruped with
  the shared outline/shadow, reading clearly against the tree-lined
  forest floor.
- **Build:** `npm run build` — ✅ passing
- **Commit:** `577f242` — "Seasonal wildlife — butterflies, songbirds, rabbits, deer by season & weather"
- **Follow-ups:** binoculars-gated sighting/Collections wiring (deliberately
  NOT built here, per the block's own scope note — that's the Riverside
  Fisherwoman block) would turn these sightings into Memory Book entries.
  Rough edge: the `WILDLIFE_MAX_COUNT`/`WILDLIFE_SPEED` config constants
  were added to `src/config.ts` a commit early (alongside the fish-stall
  block's own config addition, before this block's files existed) — a minor
  commit-hygiene slip, not a functional one; nothing in that earlier commit
  referenced them, so the build was green throughout.

## Fish-stall NPC — Maren buys fish at the market
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** DECISIONS' "Selling paths" #2 (NPC stalls of matching
  specialty) — build the FIRST one: Maren's fish stall at the market buys
  fish. Structure the wiring so a second path (Tobin/produce) is additive.
- **Done:**
  - **Files:**
    - `src/systems/shop.ts` — new `NpcStallTrade` interface `{ npcId,
      stallSign, categoryId, closedLine }` + `NPC_STALL_TRADES` table, one
      ACTIVE row: `{ npcId: "maren", stallSign: "fish", categoryId:
      "fishing", closedLine: "Maren's off today — the market square misses
      her." }`. This IS the "per-stall {stallId, npcId, buysCategory} table"
      the block asked for — a produce-stall row later is one more entry here.
    - `src/systems/sellCategories.ts` — `SellCategory` gains a `label` field
      (plural noun for stall UI, e.g. "fish"; `fishing`'s is `"fish"`); new
      `categoryById(id)` and `categoryItemIds(id)` exports — the latter is
      what Maren's window reads (the category's raw item list), independent
      of `sellableGoodIds`'s player-capability gate, since Maren buys fish
      whether or not the player is on a "fishing path".
    - `src/systems/interact.ts` — `MARKET_STALLS` entries covered by
      `NPC_STALL_TRADES` are excluded from the old decorative Look-only
      `marketStalls` array; new `registerNpcStall(trade, npc, stallDef)`
      registers the stall as a live interactable: `hit`/`inReach` on the
      stall's rect (same box math the old lookProp used), `actions()` reads
      `npc.state` LIVE each call — `"atWork"` → `{id:"trade", label:"Trade
      with <Name>", run: c.openNpcTrade(trade)}`; anything else (closed day,
      off hours, festival) → `{id:"trade", label: trade.closedLine, run: c.toast(...)}`
      — so the HUD prompt itself reads as the closed line when she's off, no
      separate UI path needed. `InteractCtx` gains `openNpcTrade(trade)`.
    - `src/ui/shopwindow.ts` — parameterized rather than forked: a module
      `mode: {kind:"player"} | {kind:"npc", npcName, categoryId, onSale}`.
      New `openNpcStallWindow(npcName, categoryId, onSale)` sets npc mode;
      `render()` branches on it — title becomes "🐟 <Name>'s stall", the Buy
      section (`#shopBuyLabel`/`#shopBuy`) hides entirely, the sell list
      reads `categoryItemIds(categoryId)` instead of the union
      `sellableIds()`, the empty-bag message and the bulk-sell button's label
      ("Sell all fish" vs "Sell everything") are mode-aware. The per-row Sell
      button and "Sell all X" both call `onSale()` in npc mode instead of the
      farm stall's `memoryFn("first_sale", ...)` — everything else (price
      lookup via `GOOD_PRICES`, `sellGood()`, daylog logging) is byte-for-byte
      the same code path as the farm stall.
    - `index.html` — `#shopWindow`'s `<h2>` gets `id="shopTitle"`; the "Buy"
      `.shop-section` div gets `id="shopBuyLabel"` (both needed so
      shopwindow.ts can toggle them).
    - `src/config.ts` — `NPC_SALE_FRIENDSHIP_BUMP = 3` (Relationship engine
      section): the first-sale bump, applied via the existing `dialogueBump()`
      (also marks contact — no separate `markContact` call needed).
    - `src/main.ts` — registers each `NPC_STALL_TRADES` row after the NPC
      roster exists; new `openStallRect: Rect | null` generalizes the old
      "walking away from STALL closes the window" check to whichever stall
      (farm or NPC) is currently open; `openPlayerStall()` wraps
      `openShopWindow()` to set `openStallRect = STALL`; `openNpcStallTrade
      (trade)` re-checks the NPC is `"atWork"` (belt-and-braces — the
      interactable's own action already gates this) then calls
      `openNpcStallWindow`; `onNpcSale(npcId)` is the first-sale hook: an
      `addMemory(..., "first_sale_<npcId>", ...)` guard (once-only, mirrors
      the farm stall's own idempotent memory call) around a `dialogueBump`
      Friendship bump + a toast reaction ("<Name> gives a small approving
      nod. (+3 ♥)") + any heart-event thresholds crossed. Dev bridge:
      `stallActions(npcId)` (read the stall's current action list without a
      click) and `tradeWith(npcId)` (opens the trade the same way a real
      click would, going through the same live gate).
  - **Behavior:** with fish/junk in the bag during Maren's work hours,
    interacting with the fish stall (or with Maren herself, since her `Talk`
    interactable is separate and unaffected) opens a sell-only window listing
    exactly the `fishing` category's items at table prices, with a "Sell all
    fish" button; selling pays coins and logs to the day ledger exactly like
    the farm stall. On her closed day (Tuesday)/off hours/festival, the stall
    reads "Maren's off today — the market square misses her." as both the
    reach prompt and the click's toast, and no window opens. The first sale
    to her ever writes a Memory Book entry, bumps Friendship by 3, and shows
    a reaction toast.
- **Verify (Playwright, headless Chromium via a scratch `pwtest` project +
  the dev `__wh` bridge):** fresh game, calendar forced to a Wednesday
  10:00 (Maren `atWork`) → `stallActions("maren")` returned `"Trade with
  Maren"`; gave carp/fish/corn, teleported the player to the stall's anchor,
  `tradeWith("maren")` opened the window — title "🐟 Maren's stall", sell
  rows showed ONLY "Common Carp ×3" / "Fish ×2" (corn correctly absent), buy
  section hidden, bulk button read "Sell all fish"; clicking Sell paid 9
  coins (3×3) with no console errors; forced Tuesday (Maren's closed day) →
  `stallActions` returned the exact closed line, `tradeWith` left the window
  `display:none`. A separate run confirmed Friendship 0→3 and
  `dayLog().newMemories` containing "Your first sale to Maren, at the
  stall." on the actual first sale. A real `"e"`-keypress at the farm's OWN
  stall (not a bridge shortcut) confirmed it is byte-for-byte unchanged:
  title "🛒 Market stall", buy section visible with 10 stock rows, sell list
  still shows both remaining fish AND farming goods (the union behavior).
- **Build:** `npm run build` — ✅ passing
- **Commit:** `88d22e8` — "Fish-stall NPC — Maren buys fish at the market"
- **Follow-ups:** none for this block. Tobin's produce stall (`farming`
  category) is deliberately NOT built — per the block's own scope note, it's
  meant to be the next additive `NPC_STALL_TRADES` row once a `farming`
  `SellCategory` exists, not built preemptively here.

## Festival engine — Harvest Festival at the market square
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #6) Festival engine. DECISIONS: one festival, day
  15 of a season, in the stall-area; open decision "which festival" not yet
  picked. **Decision made this block: Harvest Festival, autumn, mid-season.**
  Since seasons are 10 days (DECISIONS default) not 15+, the day is resolved
  as `festivalDay = min(15, ceil(DAYS_PER_SEASON/2))` — day 5 today, would
  honor day 15 outright if seasons are ever tuned to 15+ days. Framework
  supports adding more festivals later (Solstice/Moon are DECISIONS' open v5
  list) without a rewrite.
- **Done:**
  - **Files:**
    - `src/data/festivals.ts` (new) — `FestivalDef` { id, name, seasonIndex,
      day, theme }; `FESTIVALS` table, one entry: `{ id: "harvest", name:
      "Harvest Festival", seasonIndex: 2 (autumn), day: HARVEST_FESTIVAL_DAY,
      theme: "harvest" }`, `HARVEST_FESTIVAL_DAY` computed from the formula
      above (not hardcoded — re-derives correctly if `DAYS_PER_SEASON` ever
      changes).
    - `src/systems/calendar.ts` — `DAYS_PER_SEASON` now exported (was a
      private const) so festivals.ts's formula can read it.
    - `src/systems/festival.ts` (new) — `activeFestival(cal)` (the festival
      def if RIGHT NOW is within its 09:00-21:00 window, else null) and
      `isFestivalDay(cal)` (true all day, for the HUD pill/flavor that should
      read "festival day" from dawn regardless of the hour). Pure lookup
      against the fixed table — no state, no persistence.
    - `src/config.ts` — new `FESTIVAL_START_HOUR = 9`, `FESTIVAL_END_HOUR = 21`.
    - `src/systems/schedule.ts` — `NpcState` gains `"festival"`; `resolveState`
      takes an optional `festival` flag and returns `"festival"` for any awake
      state during festival hours (sleep schedule untouched — the festival
      never keeps anyone up past their normal bedtime); `placeFor`'s new
      `"festival"` case sends everyone to `socialSpot(idx)` around the well
      EXCEPT the musician (Liora), who goes to `BUSK_SPOT` to perform — unlike
      plain Sunday `"socializing"`, this ignores the forager's usual "stays in
      the forest" exception, so Ada joins the crowd too.
    - `src/entities/npc.ts` — `initNpcPositions`/`updateNpcs` compute
      `!!activeFestival(cal)` once per call and thread it into `resolveState`;
      `idleFacing`/`poseFor` gain a `"festival"` case (face the well; Liora's
      pose is `"busking"`, everyone else gets the same idle/talking gesture
      mix as socializing).
    - `src/world/zones.ts` — `FESTIVAL_LANTERN_SPOTS` (4, ringing the well)
      and `FESTIVAL_HARVEST_CLUSTERS` (3, just outside that ring) — world
      layout, per project convention.
    - `src/art/festival.ts` (new) — `drawBunting` (a sagging, swaying string
      of triangular pennants between the four market stalls, warm autumn
      palette, drawn as an overhead layer like the fence/hedges), `drawLantern
      Pole` (a wooden pole + a flickering glowing paper lantern), `drawHarvest
      Cluster` (two pumpkins + a bound wheat sheaf, deterministic per position).
    - `src/main.ts` — imports + wires all of the above: `stepGameMinute`
      raises the `festival_today` world flag (1-day duration) on the morning
      a festival falls; `draw()` paints the bunting overhead and pushes
      lantern poles/harvest clusters into the depth-sorted `ents` array, all
      gated on `activeFestival(calendar)`; `updateHud` gets a 5th arg,
      `isFestivalDay(calendar)?.name`, for the HUD pill; a new `festivalGreeted
      Day` guard fires a toast + `remember("first_harvest_festival", ...)`
      the first time each day the player enters the market region during
      festival hours (the Memory Book entry only ever writes once). Dev
      bridge: `gotoFestival(hour)` (time-travels straight to the festival's
      date + re-snaps the townsfolk) and `isFestivalNow()`.
    - `src/data/dialogue/shared.ts` — one new unconditional-but-flagged
      `FESTIVAL_LINE` (`flag: "festival_today"`), appended by `genericOpenings()`
      so every NPC (all 10, no per-NPC authoring needed) can say it; it
      competes on equal footing with each NPC's own same-specificity lines
      via the existing anti-repetition rotation (see Follow-ups).
  - **Systems / functions:** no new save keys — festival state is a pure date
    lookup (nothing to persist) plus the existing `worldFlags` store's
    `festival_today` entry (1-day, self-expiring like every other flag).
  - **Behavior:** on the festival's date, 09:00-21:00: all 10 townsfolk leave
    their normal routine and gather at the market square around the well
    (Liora performs at the busking spot instead); bunting/lantern poles/
    harvest clusters decorate the square; the HUD calendar pill reads e.g.
    "Autumn · Day 5 · 🎉 Harvest Festival!" all day; any NPC's dialogue can
    open with the shared festival line while the flag is active; the first
    time the player enters the market during festival hours each day, a toast
    plays, and the very first time ever, a Memory Book entry is written. The
    next day, everyone and everything is back to normal.
- **Build:** `npm run build` — ✅ passing
- **Commit:** (filled in below after committing)
- **Verification:** Playwright against the dev server via the dev bridge
  (`gotoFestival(10)`): `activeFestival`/`isFestivalNow()` true, HUD pill
  read "Autumn · Day 5 · 🎉 Harvest Festival!", all 10 NPCs' `.state` read
  `"festival"` and none were indoors, Liora's pose read `"busking"`; a
  screenshot at the well showed bunting across all 4 stalls, 2+ visible
  lantern glows, 3 harvest clusters, and the whole roster gathered.
  Repeating `talk('maren')` 6x showed the shared festival line surfacing in
  the rotation alongside her own season/region lines (confirms the flag
  condition wires through the existing dialogue engine). Entering the market
  region fired the market-entry toast then the once-only Memory Book entry
  (confirmed via the toast queue and the Memory Book's Memories tab).
  `advanceDay()` into the next date: `isFestivalNow()` false, every NPC's
  state read `"asleep"` (midnight) with no `"festival"` anywhere, HUD pill
  back to plain "Autumn · Day 6" — the day after is fully back to normal.
- **Follow-ups:** the shared festival line is NOT guaranteed to win the
  opening-line pick over an NPC's own same-specificity season/region lines —
  by design, ties at the top specificity are broken by the existing per-NPC
  rotation counter (anti-repetition), so the festival line surfaces as ONE of
  the rotation's candidates, not an override. If the product owner wants the
  festival line to always dominate on its day, the dialogue engine's
  specificity scoring would need a tie-break priority for flag conditions —
  out of scope for this block. Also unrelated, noticed in passing: `endTalk()`
  /`closeDialogue()` doesn't clear an NPC's `talkTimer`, so a conversation
  ended early via the dev bridge holds that NPC's `.state` resolution frozen
  for the remainder of `NPC_TALK_SECONDS` (~3.4s) — pre-existing Dialogue
  engine behavior, not touched here, flagged for whoever picks it up.

## End-of-day summary — none/quick/full with day ledger
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #7) End-of-day summary engine. Player setting
  none/quick/full-with-achievements (DECISIONS). A day ledger accumulates the
  cheap seams main.ts already owns; on day rollover, show per the setting.
  "full" auto-pauses game-time until dismissed (same gating as the dialogue
  box); a night slept through shows it only after the fade completes.
- **Done:**
  - **Files:**
    - `src/systems/daylog.ts` (new) — `DayLog` { coinsEarned, coinsSpent,
      itemsSold, catches, harvests, forages, dishesCooked, skillGains
      (Record<skillId,points>), newDiscoveries (string[]), newMemories
      (string[]), relationshipChanges (Record<npcId,{friendship,romance}>) };
      `freshDayLog()`/`resetDayLog()`; `logCoinsEarned/logCoinsSpent/
      logItemsSold/logCatch/logHarvest/logForage/logDishCooked/logSkillGain/
      logDiscovery/logMemory/logRelationshipChange`; `topActivityLine()` for
      the quick summary's one-line highlight. Not persisted — a plain object
      main.ts owns and resets every in-game day (explicit-passing, like every
      other store).
    - `src/systems/settings.ts` — new `EndOfDaySummary` type + `Settings.
      endOfDaySummary` field (default `"quick"`), validated on load (falls
      back to the default on junk); new `endOfDaySummaryMode()` accessor.
    - `src/config.ts` — new `EOD_QUICK_SHOW_SECONDS = 5` (how long the quick
      pill stays up before fading).
    - `src/ui/dayendpanel.ts` (new) — `initDayEndPanel()`, `showQuickSummary`/
      `updateQuickSummary` (a small auto-fading pill, non-blocking), `showFull
      Summary`/`isDayEndOpen` (a proper wood/gold modal listing every non-zero
      ledger line + an "Achievements today" section for new discoveries/
      memories; dismiss by click anywhere on it, Esc, or Enter).
    - `index.html` — `#eodQuick` pill, `#eodScrim` + `#eodPanel` modal (new
      CSS block matching the existing wood/gold token system).
    - `src/ui/shopwindow.ts` — two new optional callback params on
      `initShopWindow` (`logSale`, `logPurchase`), called at the existing
      sell/sell-everything/buy/buy-livestock success branches — the primary
      trade loop now feeds the ledger without shopwindow.ts owning daylog.ts.
    - `src/main.ts` — owns the live `dayLog` object; hooks it into `record()`
      (discoveries), `remember()` + `fireHeart()` (memories), `giveGiftFlow`/
      `doInteraction`/`applyDialogueEffect`'s friendship case (relationship
      deltas), the fishing/foraging/busking/cooking/farming-harvest completion
      handlers (catches/forages/dishesCooked/harvests/coinsEarned + per-skill
      gains), `handleCollapse`'s fee (coinsSpent), and the shop callbacks
      above. `stepGameMinute()` now returns a `DayEndSnapshot | null` (season/
      day of the day that just ended + a shallow-copied ledger) exactly on
      rollover, then resets the ledger; `presentDayEnd()` reads the setting
      and shows quick/full/nothing. The three time-skip paths (sleep/nap/
      collapse) collect any pending snapshot during the fade and present it
      only in the `onDone` callback — after the screen fades back in, never
      behind it. `isDayEndOpen()` joins `isDialogueOpen()` in the single
      `timePaused` gate that already froze NPCs/player/autosave for dialogue.
      Dev bridge: `dayLog()`, `setEodMode()`, `dayEndOpen()`, `advanceDay()`
      (fast-forwards through the real minute loop to the next rollover).
  - **Systems / functions:** no new save keys — `dayLog` is intentionally
    unpersisted; `endOfDaySummary` rides on the existing settings key.
  - **Behavior:** the player can set none/quick/full (today: via the dev
    bridge / a future Settings screen — same state as `dayLengthSeconds` and
    `guided` before their screens existed). "quick" shows a small 3-line pill
    (day header, coin net, top activity) that fades on its own and never
    pauses anything. "full" opens a proper panel listing every non-zero stat
    for the day just ended plus new discoveries/memories, freezes game-time
    and the townsfolk until dismissed (click/Esc/Enter). "none" is silent.
    Sleeping through midnight shows the panel only once the wake-up fade
    completes.
- **Build:** `npm run build` — ✅ passing
- **Commit:** (filled in below after committing)
- **Verification:** Playwright against the dev server via the dev bridge:
  gifting Maren + a friendly chat with Tobin populated `relationshipChanges`
  (`maren: +20 friendship`, `tobin: +3 friendship`) and the first-gift memory;
  `setEodMode('full')` + `advanceDay()` opened the modal with those exact
  lines plus the achievement, froze an NPC's world position while open, and
  Esc closed it; `setEodMode('quick')` + `advanceDay()` showed the 3-line
  pill without opening the blocking panel; `setEodMode('none')` showed
  neither; the setting value survived a full page reload.
- **Follow-ups:** relationship NEGLECT DECAY (the daily "no contact" drift)
  is deliberately NOT folded into `relationshipChanges` — only active
  interactions (gifts/categorized/dialogue) are logged, since decay is
  passive and would clutter the "today's activity" framing; a future pass
  could add it as a separate "faded" line if wanted. Building/Husbandry/
  Gardening skill gains (all three live in `systems/interact.ts`, not
  main.ts) aren't logged to `skillGains` — kept in scope per the block's
  explicit "cheap seams main.ts already owns"; wiring them later just needs
  an extra `InteractCtx` hook mirroring `toast`/`memory`. No dedicated
  Settings-screen toggle yet (Part E) — same gap as `dayLengthSeconds`/
  `guided` today.

## Save system — manifest, manual save icon, 10-minute autosave
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #11) Save/load system. Every store already writes
  localStorage continuously on change; add on top: a slot manifest (v5-multi-
  slot-forward-compat, one slot in v1), a manual save via a HUD icon, and an
  autosave every 10 real minutes (paused while game-time is paused). The
  tutorial-in-progress marker rides along in the manifest for a future load
  prompt, no UI yet.
- **Done:**
  - **Files:**
    - `src/systems/saveSlots.ts` (new) — `SlotManifest` { version, slot (always
      1 in v1), lastSavedAt (real epoch ms), calendarStamp {season, day},
      coins, guided? }; `loadSlot()` (tolerant read) and `stampSave(cal, coins,
      guided)`. Comments spell out the v5 path (array of manifests + `-slotN`
      key suffixes) without building it.
    - `src/config.ts` — new `AUTOSAVE_SECONDS = 600` and `SLOT_KEY =
      "wildhearth-slot-v1"`.
    - `src/systems/saves.ts` — `SLOT_KEY` added to `GAME_KEYS` so New Game
      wipes the manifest (no stale "last saved" stamp from the ended life).
    - `index.html` — a 💾 `#saveBtn` joins the `#tools` icon row (same
      `.tool-btn` chrome as map/skills/book/bag).
    - `src/main.ts` — `saveAllStores()` force-calls every store's save
      function (economy/skills/farm/plots/garden/livestock/calendar/weather/
      flags/needs/relationships/collections/memories); `manualSave()` runs it
      + `stampSave()` + a "Game saved." toast, wired to `#saveBtn` click;
      `autosaveTick()` is the same path with a quieter "Autosaved." toast. A
      real-seconds accumulator (`autosaveAccum` against a mutable
      `autosaveSeconds`, seeded from the config constant) ticks only inside
      the same gated block that already pauses on the title screen/dialogue,
      so the timer holds while game-time is paused. Dev bridge additions:
      `saveNow`, `autosaveNow`, `setAutosaveSeconds` (lets verification shrink
      the interval without touching config.ts).
  - **Systems / functions:** new save key `wildhearth-slot-v1`; no changes to
    any existing store's on-disk shape (the manifest is a new, independent key).
  - **Behavior:** clicking 💾 (or the dev bridge) saves every live store at
    once, stamps the manifest, and toasts "Game saved."; the same path fires
    automatically every 10 real minutes of active play (not while the title
    screen or a dialogue has time paused) with a quieter toast; New Game wipes
    the manifest along with the rest of the game-state keys.
- **Build:** `npm run build` — ✅ passing
- **Commit:** (filled in below after committing)
- **Verification:** Playwright against the Vite dev server, driven through
  the dev bridge (`window.__wh`) plus a real click on `#saveBtn`: New Game →
  manifest absent; click 💾 → manifest present with `lastSavedAt`/season/day/
  coins/guided and the "Game saved." toast text; `setAutosaveSeconds(0.3)` +
  a ~0.7s wait → manifest re-stamped with a newer `lastSavedAt` (autosave
  fired on its own); New Game again → manifest absent again.
- **Follow-ups:** none — v5 multi-slot and the "Continue Tutorial?" load
  prompt are deliberately left as comments/an unused manifest field, not code.

## Dialogue engine — condition-keyed lines, choice turns, bottom-box
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #4, mechanical layer) The Dialogue engine. Condition-
  keyed opening lines with MOST-SPECIFIC-MATCH-WINS (season / weather / dayOfWeek /
  phase / region / friendship-tier / romance-tier / flag / farm-repaired);
  specificity = matched-field count; ties → deterministic pick that VARIES between
  conversations via a per-NPC rotation counter (anti-repetition). Unconditional
  fallbacks so nothing is silent. Choice-based turns (2-3 choices, DECISIONS),
  shallow trees (1-3 turns), Farewell always last. Reads ONE
  `getWorldContext(sources,{npcId})` snapshot per turn. Bottom-box UI (wood/gold
  chrome), NPC name header + line + numbered choice buttons (click + keys 1-3, Esc).
  Auto-pause: game-time + NPC movement freeze while the window is open. AI seam:
  every displayed line routes through `renderNpcLine(req)` (v1 verbatim). Talk
  action opens the window instead of the canned toast; markContact + Social-need
  bump on conversation END. Tuning in config.
- **Done:**
  - **Files:**
    - `src/systems/dialogue.ts` (NEW): the engine. Types `LineConditions` /
      `LineEntry` / `LineSet` / `DialogueChoice` / `DialogueNode` / `NpcDialogue` /
      `ChoiceEffect`. `tierOf()` (0-3, >= semantics), `pickLine()` (most-specific by
      matched-field count, ties broken by a caller-supplied rotation index),
      `presentedChoices()` (caps to 2-3 + guarantees `FAREWELL`), `matchSpecificity`
      (per-field match incl. `farmRepaired` reading the farm slice), and the AI seam
      `renderNpcLine(req)` — the single choke-point Part-D §D2 wraps later.
    - `src/data/dialogue/shared.ts` (NEW): `genericOpenings(personality)` folds the
      existing `PERSONALITY_LINES` into unconditional `{}` fallbacks (old toast lines
      KEPT, not deleted); `smallTalkBranch(personality)` = the shared 2-turn tree
      (per-personality reply pool); `shopBranch(pitch)` for merchants; compact
      line-builders (`season`/`rainy`/`weatherLine`/`atPhase`/`warm`/`warmAny`/`here`/
      `farmWhole`/`topic`).
    - `src/data/dialogue/{maren,tobin,sera,henrik,petra,liora,bram,ada,finn,jonas}.ts`
      (NEW, 10): per-NPC opening tables (4 seasonal + ≥2 weather + friendship-warmer +
      region/work line + generics) and a personality small-talk tree. Maren/Tobin/Sera
      add a "What do you buy here?" shop branch. Maren + Henrik carry farm-repaired
      reactions (read the farm slice). Jonas demonstrates the world-topic-flag loop
      ("Heard any news?" sets `market_buzz`, then opens on it). Finn's lines are
      kid-appropriate (romance is structurally impossible on a kid).
    - `src/data/dialogue/index.ts` (NEW): id→dialogue registry + a personality
      skeleton fallback for any file-less NPC.
    - `src/ui/dialoguebox.ts` (NEW): the bottom-box turn state machine. `initDialogue`
      (hooks: `worldFor` / `applyEffect` / `onOpen` / `onClose`), `openDialogue(def)`,
      `closeDialogue()`, `isDialogueOpen()`. Per-NPC session rotation Map; capture-
      phase keys (1-3 pick, Esc closes) that beat other panels' handlers.
    - `index.html`: `#dialogueBox` (+ `#dlgName`/`#dlgText`/`#dlgChoices`) inside
      `#gameArea`, styled with the shared chrome tokens (wood border, gold header,
      cell-edge choice buttons with a gold key chip).
    - `src/systems/worldContext.ts`: `CalendarSlice.dayOfWeek` added (0-6, from
      `absoluteDay`) so the day-of-week condition reads the one snapshot.
    - `src/systems/relationships.ts`: `dialogueBump()` — a tiny Friendship nudge from a
      warm choice (no per-category diminishing), returns crossed thresholds, marks
      contact.
    - `src/entities/npc.ts`: `startTalking(n, px?, py?)` now optionally faces the
      player + holds the talking pose (kept synced to the open window). Retired
      `npcGreeting` + the unused `lineIdx` field (superseded by the engine).
    - `src/main.ts`: `onTalk` opens the dialogue window (was: canned toast); wired
      `initDialogue` hooks (one npc-scoped snapshot per turn, `playerRegion()` as the
      location slice); `applyDialogueEffect` (friendship bump / topic flag / contact +
      fires heart events); tick auto-pause (`isDialogueOpen()` freezes time + NPC
      updates + drains queued world input); dev bridge `talk`/`endTalk`/`dlgOpen`/
      `setFriendship`/`flag`/`repairFarm`.
    - `src/config.ts`: `DIALOGUE_MAX_CHOICES` (3), `DIALOGUE_FRIENDSHIP_BUMP` (2),
      `DIALOGUE_TOPIC_FLAG_DAYS` (3).
  - **Systems / functions:** condition-keyed line selection (specificity = matched
    fields, rotation tie-break), shallow choice trees, `renderNpcLine` AI seam,
    dialogue-open auto-pause gate. No new save key (rotation is session-scoped;
    topic flags persist via the existing `worldFlags` key).
  - **Behavior:** talking to any townsperson now opens a bottom-box conversation: an
    opening line chosen for the moment (season/weather/time/region/relationship/farm
    state), 2-3 choices by click OR keys 1-3, replies over 1-3 turns, Farewell/Esc to
    close. Repeat talks in the same conditions surface different generics. The clock
    and the townsfolk freeze while the window is open. Merchants explain their stall;
    Maren/Henrik react once your farm is fully mended.
- **Build:** `npm run build` — ✅ passing.
- **Verify:** Playwright (fresh game, dev bridge) — 16/16: opening line + 3 choices
  in the box; click AND number-key selection; clean close; anti-repeat (3 distinct
  openings of 4); rain line beats generic; friendship≥50 warmer wins; farm-repaired
  wins as most-specific; clock frozen while open (360→360) then resumes (→363); NPC
  holds the talking pose; Finn (kid) talks with age-appropriate lines and no romance
  interactions; zero page/console errors; existing save loads via Continue.
- **Commit:** 63140f4 — Dialogue engine — condition-keyed lines, choice turns, bottom-box
- **Follow-ups:** Rotation is in-memory (session-scoped) by design — persisting a
  per-NPC said-history is the Part-D anti-repetition store (AI_ARCHITECTURE §D7), not
  needed here. Trees are intentionally shallow personality skeletons + 3 shop
  branches; richer per-NPC bespoke trees can grow incrementally. `renderNpcLine` is
  the sole hook the AI dialogue-variation layer wraps.

## Relationship engine — two axes, trait-derived gifts, depth-based decay
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #3) The Relationship engine. Per-NPC record
  `{ friendship 0-100, romance 0-100, giftsThisWeek, lastInteractDay, … }`,
  versioned store, explicit-passing, kid romance structurally impossible.
  Trait-DERIVED gift preferences (not hand-authored per NPC) → 5-tier rating at
  runtime. Gift deltas loved +35 / liked +20 / neutral +8 / disliked −10 /
  hated −20; weekly cap 2 (refuse before consuming); birthday ×2 + cap-exempt,
  with a `birthday` on every NPC. Categorized interactions (Friendly / Funny /
  Romantic / Blunt) with per-personality lines and per-day diminishing returns;
  Romantic only for candidate adults at Friendship ≥ 20. Give-a-gift chooser.
  Depth-dependent neglect decay. Heart-event thresholds (25/50/75) → toast +
  Memory Book, once each, via a forward-compat seam. World Context relationship
  slice (drop the `_query` underscore). Subtle ♥/⚭ readout on the NPC pill.
  Tuning in config.ts.
- **Done:**
  - **Files:**
    - `src/systems/relationships.ts` (NEW): the engine. `Relationships { byId }`
      + `Relationship` record; versioned/tolerant load/save/reset on key
      `wildhearth-relationships-v1`. `giveGift()` (refusal BEFORE consume;
      Friendship-only in v1; birthday ×2 + cap-exempt), `applyInteraction()`
      (axis + per-day diminishing per category), `markContact()`,
      `decayRelationships()` (depth-based, year-wrap-safe via a captured
      ended-day), `readRelationship()`/`relationshipSummary()` (non-mutating
      reads), `ThresholdEvent`/`Axis` types.
    - `src/systems/heartEvents.ts` (NEW): the v1 heart-event seam —
      `heartEvent(def, ev)` → `{ memoryKey, memoryText, toast }`. v5 grows this
      into scripted `data/heartEvents/*.ts` scenes without touching callers.
    - `src/data/traitPreferences.ts` (NEW): item→category/price classifier built
      from the live fish/junk/crops/forage/recipe tables; `giftTier(def, itemId)`
      derives the 5-tier rating from the NPC's role + personality trait rules
      (fish-trade loves rare fish / likes common; naturalist loves forage, hates
      junk; performer loves dishes & shiny; grower loves crops; merchant likes
      high-value; everyone dislikes junk). `giftInfo`/`isGiftable`.
    - `src/data/interactions.ts` (NEW): 8 interactions across 4 categories with
      per-interaction axis/delta, and `interactionLine(category, personality)`
      scripted responses (per-personality with a generic fallback).
    - `src/data/npcs.ts`: added a required `birthday { seasonIndex, day }` to
      every NPC (spread across the 4 seasons, days 1-10), plus `isBirthday()`.
    - `src/ui/giftchooser.ts` (NEW) + `index.html`: a small `#giftChooser` panel
      (shop chrome) listing held giftable goods with icons; `openGiftChooser`/
      `closeGiftChooser`/`isGiftChooserOpen`. Tools/seeds never listed.
    - `src/systems/interact.ts`: `InteractCtx` gains `relationships`, `calendar`,
      `openGiftFor`, `doInteraction`; `registerNpc` now builds Talk / Give a gift
      / the categorized interactions (Romantic gated), Look. Left-click/E stays
      Talk.
    - `src/systems/worldContext.ts`: `relationships?` source + `relationship?`
      slice; `_query` → `query` (first real consumer of the scoping parameter).
    - `src/art/characters.ts`: `drawNpc` takes an optional `NpcRelReadout`; the
      name pill shows a subtle `♥{friendship}` (· `⚭{romance}` for candidates)
      line once a bond exists.
    - `src/config.ts`: `GIFT_DELTAS`, `BIRTHDAY_GIFT_MULT`, `GIFTS_PER_WEEK`,
      `RARE_FISH_PRICE`, `ROMANCE_UNLOCK_FRIENDSHIP`, `RELATIONSHIP_DECAY_*`,
      `RELATIONSHIP_THRESHOLDS`, `INTERACT_DIMINISH`, and `RELATIONSHIPS_KEY`.
    - `src/systems/saves.ts`: `RELATIONSHIPS_KEY` added to `GAME_KEYS` (New Game
      clears it).
    - `src/main.ts`: load relationships; `onTalk` marks contact; `giveGiftFlow`
      (consume + tiered reaction toast + first-gift memory + heart events),
      `openGiftFor`, `doInteraction`, `fireHeart`; daily decay hooked into
      `stepGameMinute` with the ended-day captured before the clock advances;
      reset on New Game; relationship source + nearby-NPC query into the
      per-frame World Context; pill readout wired; dev bridge hooks
      (`relOf`/`giftTo`/`openGift`/`interactWith`/`npcActions`/`rollDay`).
    - `docs/WORLD_CONTEXT.md`: Relationships row → **Built**.
    - `docs/ROADMAP_EXPANSION.md`: the relationships block + the gift/decay
      tuning-anchor block marked `[x]`.
  - **Systems / functions:** new save key `wildhearth-relationships-v1`; two
    independent axes per NPC; trait-derived tiers computed at runtime (no
    per-NPC gift lists); gift deltas + weekly cap + birthday ×2; categorized
    interactions with per-category-per-day diminishing returns; depth-based
    neglect decay (−2 below 30, −1 at 30-60, −0.25 above 60, never < 0); heart
    thresholds fired once per NPC/axis (persisted `fired` ledger); relationship
    slice in World Context.
  - **Behavior:** Right-click an NPC → Talk / Give a gift / Chat / Ask about
    their day / Tell a joke / Playful jest / Tease / Grumble together (+ Compliment
    / Flirt for romantic candidates once you're friends) / Look. Gifts move
    Friendship by how well they suit that person's trade and temperament — a rare
    fish thrills Maren, a truffle delights the herbalist, junk offends her; the
    3rd gift in a week is gently refused (item kept); a birthday gift lands
    double. Interactions nudge the right axis and taper off if you repeat the
    same kind that day. Ignoring someone lets the bond drift down, slower the
    deeper it runs. Crossing 25/50/75 pops a heart moment into the Memory Book,
    once. A subtle ♥ (· ⚭) readout sits under the name of anyone you've begun to
    know. All persists across reload; New Game forgets everyone.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright drove the real game via the dev bridge
  (18/18 core checks + 5 supplemental, 0 page errors): carp→Maren liked +20,
  koi→Maren loved +35, off-trait dish→Maren neutral +8, truffle→Ada loved +35,
  junk→Ada hated (clamped 0); 3rd weekly gift refused without consuming;
  birthday ×2 (+40) then a normal +20 same day; Chat +3 → +1.5 → +0.5 → 0
  diminishing; Compliment moves Romance not Friendship; Romantic hidden on Sera
  (non-candidate), Finn (kid, romance never shown), and Maren below Friendship
  20 (shown at 20); decay held on the contact day then −2 the next; threshold 25
  wrote exactly one Memory Book entry; survived reload; New Game emptied the
  store. The gift-chooser DOM was also driven end-to-end (rows exclude the rod +
  seeds; clicking Give applied the gift and consumed one item).
- **Commit:** `909ff49` — Relationship engine — two axes, trait-derived gifts, depth-based decay
- **Follow-ups:** Gifts move only Friendship in v1 (a logged judgment call —
  the Romantic interaction category is what moves Romance); v5 can route gifts
  to Romance for a committed bond. Scripted `data/dialogue/*.ts` and
  `data/heartEvents/*.ts` scenes remain their own later blocks (this ships the
  toast+memory seam they grow from).

## Needs engine — 7 needs, collapse, warnings, mood hooks
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #2) The Needs engine. 7 needs (hunger, thirst,
  energy, hygiene, bathroom, mood, social), each 0-100, per DECISIONS' 7-need
  list. Versioned store (New Game = comfortable). Per-in-game-minute decay,
  modified by action / season / weather; **mood is derived** from the other six
  + a recent-social-contact bonus. Restoration: eat (edible items), drink (well
  + basin), sleep (bed, "until morning"/"nap" via the REAL advanceMinute loop
  with a fade-to-black, never a clock teleport), wash (basin), outhouse (new
  code-drawn prop behind the farmhouse), social (talk seam), a rest-chair
  trickle. Escalating threshold warnings (25/10) + an always-visible HUD needs
  strip that pulses when low. Collapse at zero (physical) = fade, wake at the
  bed 06:00, coin fee (clamped ≥0), no death; bathroom-zero = an accident (mood/
  hygiene hit, no fee). Mood scales skill-gain chance + busking payout. NPC
  comments on a low need via the existing proximity/onTalk seams. World Context
  `needs?` slice. All tuning in config.ts.
- **Done:**
  - **Files:**
    - `src/systems/needs.ts` (NEW): the engine. `NeedsState` (versioned, tolerant
      load/save/reset, key `wildhearth-needs-v1`); `NeedId`, `PHYSICAL_NEEDS`,
      `ALL_NEEDS`, `NEED_LABELS`. `decayNeeds()` (per-minute drain w/ season+
      weather multiplier table living here, knobs in config; energy RECOVERS
      while sleeping, others drain at a reduced rate down to a floor);
      `recomputeMood()` (avg + worst-need weight + social glow − weather drag −
      accident penalty); `moodPerfMult()` (0.75/1.0/1.1 skill+busk multiplier);
      `applyExertion()` / `applyWalk()`; `restore()`/`drink`/`wash`/`useOuthouse`/
      `rest`; edible table (`edibleHunger`/`isEdible` — cooked dishes > crops >
      forage; raw fish/junk excluded); `socialContact()` (per-NPC per-day
      diminishing); `collectWarnings()` (hysteresis 25/10); `criticalNeed()`/
      `applyAccident()`/`collapseRecover()`; `needsRecord()` (World Context slice).
    - `src/art/needsicons.ts` (NEW): `drawNeedsStrip()` — 7 code-drawn glyphs
      (apple/droplet/bolt/bubbles/toilet-roll/speech/smiley; the smiley's mouth
      curves with mood) each with a status fill-bar (green/amber/red) and a
      pulsing alert plate under any need <25.
    - `src/ui/fade.ts` (NEW): `initFade()`/`fadeThrough(atBlack, msg, onDone)` —
      the fade-to-black overlay wrapping a synchronous time skip.
    - `src/config.ts`: `NEEDS_KEY` + the full needs tuning block (start baseline,
      per-need decay, sleep floor/recover, season/weather multipliers, mood
      weights/glow/weather-drag/perf-mult thresholds, exertion table, walk cost,
      eat/drink/wash/outhouse/rest amounts, social base/diminish, accident hits,
      `COLLAPSE_FEE`/`COLLAPSE_RECOVER`).
    - `src/systems/saves.ts`: `NEEDS_KEY` added to `GAME_KEYS` (New Game clears it).
    - `src/systems/worldContext.ts`: `needs?: NeedsState` source + `needs?:
      Record<string, number>` slice, populated via `needsRecord()`.
    - `src/systems/skills.ts`: `gainSkill(s, id, chanceMult = 1)` — mood scales
      the success chance (clamped to [0.01, 1]); Gain Guard unaffected.
    - `src/world/zones.ts`: `OUTHOUSE` rect (west of the farmhouse).
    - `src/art/buildings.ts`: `drawOuthouse()` — weathered planks, mono-pitch
      roof, crescent-moon door, shadow+outline.
    - `src/world/collision.ts`: outhouse blocks its lower ~75% (structure rule).
    - `src/systems/interact.ts`: `InteractCtx` gains `needs`, `sleep`, `nap`;
      well gets a Drink action; basin → Wash/Drink; bed → Sleep-until-morning/Nap;
      rest corner → Sit and rest; new `outhouseSpot` (Use the outhouse); the
      three interior `spot()` stubs replaced with real interactables; building/
      husbandry/gardening skill gains now pass `moodPerfMult(c.needs)`.
    - `src/entities/npc.ts`: `npcNeedComment(def, needId)` — the comment hook
      (2-3 lines per need, motherly-baker flavour), used by main's proximity.
    - `src/ui/hud.ts`: `updateNeedsStrip(record, time)` — dpr-crisp strip canvas +
      per-cell tooltip readback.
    - `src/ui/backpack.ts`: right-click an edible slot → an "Eat <name>" context
      menu; `initBackpack(economy, eat)` takes the eat callback (explicit-passed).
    - `index.html`: `#needsStrip` (top-left, wood/gold chrome) + `#fade` overlay
      + their CSS.
    - `src/main.ts`: `const needs = loadNeeds()`; `resetNeeds` in `newGameReset`;
      `stepGameMinute()` (single source of truth for a minute — used by both the
      live tick and the sleep/collapse skip); `liveMinute()` (decay+warnings+
      collapse); `sleepUntilMorning`/`napAnHour`/`wakeAtBed`/`handleCollapse`/
      `handleAccident`/`maybeNpcComment`; `eatItem`; exertion+mood wired into the
      fishing/foraging/busking/cooking/farming completion hooks; busking payout
      ×mood; walk-energy per frame; `onTalk` → `socialContact`; per-frame
      `recomputeMood`; `needs` added to the World Context source; outhouse drawn
      + depth-sorted; dev `__wh` bridge extended with needs verification hooks.
  - **Systems / functions:** save key `wildhearth-needs-v1`; `NeedsState` +
    ~25 exported functions in `needs.ts`; `gainSkill` gained a `chanceMult`
    param; World Context `needs` slice; `OUTHOUSE` zone + `drawOuthouse` painter.
  - **Behavior:** all 7 needs are always visible on the HUD strip and drain over
    time (faster in winter/summer/storm per need). The player can eat edibles
    from the bag, drink at the well or basin, wash at the basin, use a new
    outhouse, sit to rest, and sleep the night away in bed (fade to black, wakes
    at 06:00 a day later). Escalating "you're getting hungry / you feel faint"
    warnings fire at 25 then 10. Ignoring a physical need to zero collapses the
    player — a fade, a helper's fee (15 coins, never negative), and waking at the
    bed — while a zeroed bathroom is a mortifying accident instead. Low mood makes
    skills gain slower and busking pay less; high mood the reverse. Nearby NPCs
    remark on a low need ("You look exhausted, dear.").
- **Build:** `npm run build` — ✅ passing.
- **Verify:** Playwright against the dev bridge — 21/21 checks: New Game
  comfortable → drain → eat/drink/wash/outhouse/sleep each restore; sleep →
  06:00 + day roll + weather reroll (clear→rain) + energy 100; warnings at 25/10;
  forced hunger-collapse 20→5 coins & wakes at the bed (interior, ROOM_ENTRY);
  mood mult 0.75 low / 1.1 high; Henrik comments "You look exhausted, dear.";
  needs survive reload; New Game resets to 80; no page errors.
- **Commit:** 146f3e4 — "Needs engine — 7 needs, collapse, warnings, mood hooks"
- **Follow-ups:**
  - Weather visual layer + day/night tint (Part B #8/#9) will make the mood
    weather-drag legible on screen; today it's mechanical only.
  - Dedicated needs *icons in the sidebar side-panel* (DECISIONS' configurable
    panel) could later mirror the always-on strip — not needed for v1.
  - Busking-payout mood scaling is verified via the shared `moodPerfMult` (the
    same multiplier the skill-gain check exercised), not a separate live-busk
    Playwright run (busk completion isn't reachable from the dev bridge).

## NPC engine — 10 townsfolk with weekly schedules on the shared rig
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #1) The NPC engine. 10 distinct NPCs (fixed roster,
  logged for owner review), each a full entity on the shared humanoid rig with a
  weekly, day-of-week-varying schedule driving a state machine (atHome / atWork /
  atMarket / socializing / asleep), waypoint movement, profession poses, a
  proximity "Talk to <name>" one-liner via a single `onTalk` seam (the real
  dialogue engine is the next block), a tiny v5-forward weather stub, and
  v5-forward identity placeholders. No relationships/gifting/dialogue-trees/stall
  trading (all later). No persistence (deterministic from the clock).
- **Done:**
  - **Files:**
    - `src/data/npcs.ts` (NEW): the roster as pure data. `NpcDef` type +
      `AgeBand` / `Personality` / `Role` unions; **kid safety is structural** —
      `NpcDef = NpcCommon & ({ageBand:"kid"} | {ageBand:"adult"|"elder";
      romantic:boolean})`, so a `romantic` flag on a kid is a compile error, not
      a convention. `isRomantic(def)`. The 10 `NPCS` (each with distinct
      `RigParams`, home/work anchors, wake/sleep/work hours, optional
      `closedDay`, and v5-forward `family?`/`backstory?`/`heartEvents?` typed &
      undefined). `PERSONALITY_LINES` (2-3 canned lines per personality).
      NPC route tables: `FOREST_CORNERS`, `ADA_FOREST_REST`, `JONAS_ROUTE`,
      `BRAM_FARM_SPOT`/`BRAM_MARKET_SPOT`.
    - `src/systems/schedule.ts` (NEW): the clock-driven engine. `NpcState`;
      `dayOfWeek(cal)` / `dayName(cal)` (7-day Sun–Sat week from `absoluteDay`);
      `daySchedule(def, dow)` (computes the per-day `{startHour,state}` table);
      `resolveState(def, dow, hour)`; `placeFor(def, state, dow, idx)` (resolves
      the world point per state — stall/forest-corner-by-day/handyman-split/
      well-ring/plaza-wander/home); `scheduleWeatherTweak(def, state, weather)`
      (v5-forward stub: a storm sends outdoor NPCs home, nothing else yet).
    - `src/entities/npc.ts` (NEW): the entity + movement. `Npc` interface,
      `createNpcs()`, `initNpcPositions()` (snap to the schedule's here-and-now),
      `updateNpcs(npcs, cal, weather, player, dt)` (resolve state → on change set
      a waypoint route → straight-line lerp at `NPC_WALK_SPEED` → hold the
      state's pose), waypoint routing (`buildRoute` skirts forest trees via the
      passage spine; peddler patrols `JONAS_ROUTE`, direction by day parity),
      pose/facing derivation, and the talk seam `startTalking` / `npcGreeting` /
      `npcById`.
    - `src/art/characters.ts`: added `drawNpc(g, n, t, showLabel)` — the shared
      rig plus a code-drawn name pill shown only when the player is near/hovering.
    - `src/systems/interact.ts`: added `registerNpc(npc, all, onTalk)` — each NPC
      is a live-position "Talk to <name>" interactable, inert while `indoors`,
      routed through the single `onTalk` seam.
    - `src/main.ts`: instantiate + snap + register the NPCs; `updateNpcs` each
      tick (ambient, like animals); depth-sort non-indoor NPCs into the `ents`
      list with the near/hover-gated label; `onTalk(npc)` seam (canned line +
      `startTalking`); re-snap NPCs on New Game; a **dev-only** `__wh` test
      bridge (`import.meta.env.DEV`, tree-shaken from production — bundle size
      unchanged).
    - `src/config.ts`: `NPC_WALK_SPEED` (52), `NPC_ARRIVE` (4), `NPC_REACH` (46),
      `NPC_TALK_SECONDS` (3.4).
    - `src/vite-env.d.ts` (NEW): `/// <reference types="vite/client" />` so
      `import.meta.env.DEV` is typed (and literally replaced → tree-shaken).
  - **Roster (logged for owner review):** 1 Maren (fish stall, brisk-warm, ♥),
    2 Tobin (produce, cheerful-chatty, ♥), 3 Sera (general goods, precise, —),
    4 Henrik (elder neighbour farmer, gruff-kind, —), 5 Petra (baker, warm-
    motherly, —), 6 Liora (musician, dreamy-performer, ♥), 7 Bram (carpenter,
    quiet-craftsman, ♥), 8 Ada (elder herbalist/forager, shy-naturalist, —),
    9 Finn (kid fisher apprentice, eager, — never romanceable, enforced by type),
    10 Jonas (peddler, gossipy-connector, —). 4 romantic candidates per
    DECISIONS "Romantic NPCs v1: 3-4". Closed days: Maren Tue, Tobin Thu,
    Sera Sat.
  - **Behavior:** the town is alive with AI off — stallkeepers stand their
    stalls in work hours (each with a different closed day), Liora busks near the
    square (never on the player's busk spot), Ada forages a different forest
    corner each day, Finn fishes off the lake dock (after-school on weekdays, all
    day weekends), Jonas walks the farm↔market road (direction alternates by
    day), Petra bakes at her cottage and works the square mid-day, Henrik & Bram
    work the neighbour farm. Everyone gathers at the well on Sunday morning and
    sleeps at home at night (~22:00–06:00, ±1h). Talking shows a personality
    one-liner and turns the NPC to face you.
- **Build:** `npm run build` — ✅ passing.
- **Verify (Playwright, dayLength temporarily 90s, restored):** market Monday
  13:00 = 5 townsfolk doing distinct things (3 stalls + Petra browsing + Liora
  busking); Ada foraging in the forest; Finn fishing on the dock; night 23:00 =
  all 10 indoors; a closed day differs (Maren atWork@stall Mon vs socializing@
  well Tue); talked to 3 NPCs (Liora/Henrik/Bram — 3 distinct lines, each turns
  to the talking pose); Sunday 10:00 = all 10 socializing at the well; reload →
  Continue loads the existing save. No page errors. Screenshots reviewed.
- **Commit:** bb70e96 — "NPC engine — 10 townsfolk with weekly schedules on the shared rig"
- **Follow-ups:**
  - No persistence needed (schedules are deterministic from the clock) — noted
    per the block; nothing to save/load for NPCs.
  - The `onTalk` seam is a single canned-line stub; the next block swaps its body
    for the dialogue engine without touching `registerNpc`/`drawNpc`/movement.
  - `isRomantic()` and the `family`/`backstory`/`heartEvents` fields exist for
    v5 but have no consumer yet (the relationships / Heart-Events blocks).
  - Sped-up verification (dayLength ≤ ~40s) can out-run the longest NPC walk
    (Bram cottage→neighbour-farm ~17s) between hourly state changes; at the real
    default pace (1440s) it never happens. Not a bug at shipping settings.
  - The dev-only `__wh` bridge is compiled out of production; harmless in dev.

## Segmented rig — jointed player, poseable actions, rigged animals
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part B #6) Replace the static player/animal painters with a
  shared, jointed, poseable rig system, keeping the Cute-Fantasy look (shared
  dark OUTLINE, elliptical drop shadow, warm palette). Humanoid rig for the
  player (and, next block, the 10 NPCs) parameterised so distinct characters
  are cheap; walk cycle keyed to DISTANCE moved (phase = dist/stride); distinct
  pose functions (idle/walking/fishing/hoeing/foraging/busking/talking/
  sleeping); animals refactored to parameterised four-legged / bird rigs, built
  so Part-C animals are variants not new engines; painter interface kept narrow
  so a future sprite-swap stays local.
- **Done:**
  - **Files:**
    - `src/art/rig.ts` (NEW): the humanoid rig. Exports `RigParams` (scale,
      build slim/average/round, legLength, armLength, skin, hair style +
      color, `Outfit` {torso/torsoStyle/legs/legStyle/accent/shoes}, age
      kid/adult/elder, hatColor), the `PoseName` union, `Facing`, the
      `drawRig(g,x,y,facing,params,pose,phase,t)` single entry point, and
      `RIG_STRIDE`. Limbs are capsules anchored at both joints (root→hand /
      hip→foot) so nothing detaches at any zoom; upper body bobs/leans while
      legs stay grounded; head/hair (short/ponytail/bun/bald/hat) + face per
      facing; held-tool shapes (rod/hoe/lute/basket) drawn inline per pose.
    - `src/art/animalRig.ts` (NEW): `drawQuadruped` + `drawBird` with
      `QuadrupedParams` / `BirdParams`, `QUAD_STRIDE` / `BIRD_STRIDE`, and
      ready presets `COW_RIG` / `HEN_RIG`. Cow: 4 legs on a trot gait, body
      spots, ears/horns/tail/snout params, head graze-bob when idle, tail
      flick. Hen: two stepping legs, flapping wing on move, comb/beak/eye,
      peck. Param shapes cover pig/sheep/duck/cat/dog/rabbit as variants.
    - `src/art/characters.ts` (REWRITTEN): now thin adapters — `drawFarmer`
      → `drawRig` with `DEFAULT_PLAYER_RIG` and pose/dist from the entity;
      `drawCow`/`drawHen` → the animal rigs. main.ts's draw/depth-sort is
      unchanged (same exported names, same feet anchors).
    - `src/entities/player.ts`: `Player` gains `pose: PoseName` and
      `dist: number` (accumulated travel for the distance-keyed walk cycle,
      banked in `updatePlayer`); new exported `DEFAULT_PLAYER_RIG` reproducing
      the established straw-hat farmer (one place, later fed by Character
      Creation).
    - `src/entities/animals.ts`: `Cow`/`Hen` gain `dist` + `moving` (and hen
      `flip`); `updateAnimals` banks distance and sets `moving` for the rigs.
    - `src/main.ts`: derives `player.pose` each frame from the live activity
      flags (fishing.casting → fishing, foraging.picking → foraging,
      farmwork.working → hoeing, busking.playing → busking, moving → walking,
      else idle) — no new state machine.
  - **Systems / functions:** no save keys touched (rig fields are runtime
    state, not persisted); `RigParams`/`PoseName`/`Outfit`/`QuadrupedParams`/
    `BirdParams` types; `drawRig`/`drawQuadruped`/`drawBird`; stride constants.
  - **Behavior:** the player is now a jointed character that walks (legs/arms
    swing on distance, subtle torso bob), casts with a rod arced over the
    water, bends and swings a hoe while tilling, crouches with a basket at a
    bush, and strums a lute at the busk spot; talking + sleeping poses exist
    for the coming NPC/needs blocks. The cow walks on a gait with a flicking
    tail and grazing head-bob; the hen steps and flaps. Reads as the same
    farmer as before, just alive.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** temporary rig gallery (deleted) reviewed via Playwright —
  all 8 poses distinct/readable, walk limbs swing across phases, left/right
  mirroring, min (0.84) & max (5.28) zoom with no detached limbs, 6 NPC-variety
  param sets all distinct, cow + hen animate. In-game (Playwright): idle,
  mid-walk ×2 phases, fishing at the pond, hoeing on a field cell, foraging at
  a bush, busking at the market square, cow + hens in the yard, min/max zoom,
  and a seeded pre-existing save loaded (coins 137, backpack carp×4 + berries
  ×6, cow + 2 hens spawned) — no page/console errors in any run.
- **Commit:** <hash + message — fill in after committing>
- **Follow-ups:** up/down facing reuse the front profile (eyes shift, no
  dedicated back-of-head walk) — matches the pre-existing single-orientation
  art; add if a later pass wants true 4-dir. NPCs (next block) call `drawRig`
  directly with their own `RigParams`. Full standalone tool painters (rod/hoe/
  lute/etc.) arrive in Part C; the rig currently draws minimal inline shapes.

## docs — session planning: ROADMAP_TO_V5 + AI_ARCHITECTURE + PROPOSALS
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (from `docs/FABLE_PROMPT.md`, "Docs to produce during this
  session" #2-4) Three planning docs, each written by a dedicated subagent.
- **Done (docs only):**
  - **Files:**
    - `docs/ROADMAP_TO_V5.md` (NEW): the v1→v5 product arc — per version:
      theme, every system's state, the gap from the previous version,
      dependencies, scope estimate, risks. v1/v5 anchored to DECISIONS.md;
      v2 (town opens) / v3 (crafting+professions+appearance) / v4
      (family+living economy) interpolated by dependency order.
    - `docs/AI_ARCHITECTURE.md` (NEW): Part D blueprint — `src/systems/ai/`
      module tree behind an AICtx facade, BYOK browser-direct Anthropic
      transport, all 8 use cases with prompts/context/cost/fallbacks,
      closed NPCAction union + validator, budget/cache/rate limits, mock
      provider + deterministic testing, v1→v5 evolution.
    - `docs/PROPOSALS.md` (NEW): 22 proposals across mechanics / features /
      improvements / content, each with target version + build surface.
    - `docs/HANDOFF.md`: what-was-built, decisions #4-9, subagent registry.
  - **Behavior:** none — documentation only.
- **Build:** `npm run build` — ✅ (no source change).
- **Commit:** docs — session planning: ROADMAP_TO_V5 + AI_ARCHITECTURE + PROPOSALS
- **Follow-ups:** owner reviews PROPOSALS.md + the judgment calls logged in
  HANDOFF decisions #8-9.

## World expansion v1 — road, market stalls, forest passage, river & lake
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** World expansion v1 (from the supervisor's block prompt):
  grow the single farm scene into the v1 world per DECISIONS "Areas in v1" —
  farm (unchanged, at the west) + a dirt road east past one established
  neighbour farm + a stall-road market square (4 distinct stalls, a well,
  5-6 cottages, the relocated busk spot) + a forest passage branching north +
  a river down the east edge widening into a south-east lake with a dock.
  Add a `regionAt()` helper + a `location` slice to WorldContext; keep the
  farm's internal layout and all saves working; NOT the town.
- **Done:**
  - **Files:**
    - `src/config.ts`: world grew to `MW=108, MH=30` (3456x960 px, ~4x the old
      area, one canvas — both sides < 4096, no chunking needed); added
      `ROAD_W`; `MINIMAP_SCALE` 0.14 -> 0.11 (readable at the wider aspect).
    - `src/world/zones.ts`: the whole new layout — `Region` type + `regionAt()`;
      `ROAD_SEGMENTS` (+`onRoad`), `HEDGES` (farm's east natural bound with a
      road gap), `NEIGHBOR` (cared-for house+barn), `MARKET_STALLS` (4 typed
      variants), `WELL`, `COTTAGES` (6), `FOREST_TREES`, `ROADSIDE_TREES`,
      `WORLD_TREES` (combined), `FOREST_BUSHES`, `RIVER`/`LAKE`/`DOCK`
      (+`inWater`/`onDock`), `FISH_SPOTS` (river x2 + lake), `STRUCTURES`
      (lower-75% collidables), `Rect` type/`rect()` helper; relocated
      `BUSK_SPOT` to the market + `OLD_BUSK_SIGN` at the farm.
    - `src/world/collision.ts`: blocks the new structures/hedges/well/forest &
      roadside trees, and river+lake water (dock excepted) via `inWater`.
    - `src/world/ground.ts`: paints packed-dirt road, darker forest floor +
      leaf litter, the market apron + well cobbles, river/lake water with sandy
      banks; ambient-prop scatter scaled by area (`AREA_K`) with rejection
      zones around every new region's water/road/buildings/props + a per-region
      palette (forest leaves, waterside pebbles, forest-biased mushrooms).
    - `src/art/buildings.ts`: `drawHouse`/`drawBarn`/`drawStall` now take an
      optional rect (farm calls unchanged); `drawStall` takes awning/accent/sign
      so the 4 market stalls read distinct (fish/produce/goods/empty); new
      `drawCottage`, `drawWell`.
    - `src/art/props.ts`: new `drawHedge`, `drawDock`, `drawBuskSign`,
      `drawOpenWaterShimmer` (river+lake surface + fishing-spot ripples).
    - `src/systems/fishing.ts`: `FishingState.location` + `startCast(..., loc)`
      so `resolveCatch` rolls the pond/river/lake table for where you cast.
    - `src/systems/foraging.ts`: `createBushes()` now includes `FOREST_BUSHES`
      (foraged as "forest", like the farm-edge cluster).
    - `src/systems/interact.ts`: river/lake fishing spots (pass location, rod-
      gated like the pond), decorative Look-only market stalls/cottages/well/
      old busk sign; pond cast now passes "pond".
    - `src/systems/worldContext.ts`: `location?: Region` source + slice
      (Block-6 recipe).
    - `src/main.ts`: draws river/lake shimmer, the dock (ground level), hedges,
      neighbour farm, market stalls, cottages, well, busk sign, and all
      `WORLD_TREES` (depth-sorted); passes `fishing.location` to `resolveCatch`
      and the player's `regionAt()` region into `getWorldContext`.
    - `src/ui/minimap.ts`: static layer now renders the whole world (forest/
      market/road tints, river+lake+dock, farm + neighbour + market buildings,
      all trees, hedges).
    - `docs/WORLD_CONTEXT.md`: data-owner table Location row -> **Built**.
  - **Systems / functions:** `regionAt`, `onRoad`, `inWater`, `onDock`,
    `WORLD_TREES`, `FISH_SPOTS`; `FishingState.location`; WorldContext
    `location` slice. No new save keys — no persisted store changed, so every
    existing save loads unchanged.
  - **Behavior:** the farm is now the west corner of a large open scene. A dirt
    road exits east through a hedge gap past a thriving neighbour farm to a
    market square (4 stalls, a well, 6 cottages, and the busk spot — busking now
    only works here, per DECISIONS; the farm keeps a signpost pointing here). A
    forest passage branches north (denser trees, forageable "forest" bushes,
    darker floor). A river runs the east edge into a south-east lake with a
    walkable dock; fishing works at designated river and lake spots (correct
    location table) while the farm pond still fishes as "pond". Water is
    impassable except the dock. The minimap shows the whole world; the debug
    panel (backtick) shows the current region.
- **Build:** `npm run build` — ✅ passing.
- **Verified (Playwright, in-browser):** walked/teleported the full loop and
  screenshotted every region (reviewed: road reads as packed dirt, market reads
  as a plaza with distinct stalls, forest is dense/dark, river+lake+dock read
  right, farm untouched, no floating props). Debug panel location correct in all
  5 regions (farm/road/forest/market/river). Forest foraging picked berries;
  river & lake spots both landed catches while the pond gave a pond-only species
  (Bluegill) — confirming per-location routing; busking at the market earned
  coins; walking east into the lake stopped at x≈79.95T (water impassable, lake
  at 80T); a save reloaded via Continue. Temp teleport/pos hooks used only for
  screenshots were removed before commit.
- **Follow-ups:** market stalls/cottages/well are decorative (Look-only) — NPC
  trading/entry and the "real sell menu at the market" are their own later
  blocks. Lake fish table has no low-skill species, so early lake catches fall
  back to carp (expected). Farm→market is a ~10-13s walk, not the block's
  aspirational 20-40s — capped by staying at ~4x area / one <4096px canvas at
  the current 150px/s speed (a deliberate trade; "hours of walking" is the v5
  aim).

## docs — v1-foundation baseline: DECISIONS + FABLE_PROMPT + doc sync + HANDOFF
- **Date:** 2026-07-06 (v1-foundation, session start)
- **Block given:** (from `docs/FABLE_PROMPT.md`, "Doc sync — before any code")
  Commit the product owner's uploaded docs; smart-merge ROADMAP_EXPANSION
  (never lose an [x] tick); replace VISION if the uploaded copy is newer.
- **Done (docs only):**
  - **Files:**
    - `docs/DECISIONS.md` (NEW to git): the product-decision record from the
      design sessions — now the tie-breaker source of truth for scope.
    - `docs/FABLE_PROMPT.md` (NEW to git): this session's work order, kept
      for the record.
    - `docs/ROADMAP_EXPANSION.md`: smart merge — kept every accurate `[x]`
      tick from the uploaded copy (all cross-checked against real commits;
      the repo's copy had them reset since the batch-3 baseline upload) AND
      restored the two repo-only chunks describing built work the uploaded
      copy lacked (the ticked stall-selling block; the HUD block's
      minutes/day-length amendment). Union of blocks, union of ticks.
    - `docs/VISION.md`: the uploaded copy's single change (starting coins
      50 → 15 in the anchor table) was REJECTED as stale — DECISIONS.md
      says 50, commits `8d58520`/`ff95174` decided and shipped 50. Repo
      copy kept unchanged. Flagged OWNER PLEASE CONFIRM in HANDOFF.md.
    - `docs/HANDOFF.md` (NEW): the session's master continuity doc —
      session context, doc-sync resolutions, autonomous-decision log,
      subagent registry, how-to-continue. Updated throughout the session.
  - **Behavior:** none — documentation only.
- **Build:** `npm run build` — ✅ (no source change).
- **Commit:** docs — v1-foundation baseline: DECISIONS + FABLE_PROMPT + doc sync + HANDOFF
- **Follow-ups:** none.

## Stall selling — driven by the player's chosen path (Fishing)
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 3)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Stall selling — driven
  by the player's chosen path, starting with Fishing") Make the sell surface
  path-aware as a first-class concept — capability-gated (owns a rod / has
  fished), never a frozen day-one label — with fish/junk routed through the
  new lookup and structured so a second category is a small additive
  registration. **Scope: Fishing only**, per the explicit note.
- **Done:**
  - **Files:**
    - `src/systems/sellCategories.ts` (NEW): `SellCategory { id, applies(ctx),
      itemIds }` + `SELL_CATEGORIES` (just `fishing` for now) +
      `sellableGoodIds(ctx)` — the dispatch: goods claimed by NO category
      pass through (their categories arrive in later blocks); an applying
      category adds its goods; output preserves `GOOD_PRICES` order so
      fisher-side rows render exactly as before. Fishing's capability check:
      owns a rod, OR the Memory Book records any caught species, OR the bag
      holds legacy generic fish. Fishing claims all 12 species + 3 junk +
      legacy "fish".
    - `src/ui/shopwindow.ts`: the sell list reads the injected
      `sellable()` lookup instead of flat `GOOD_PRICES`; **"Sell everything"
      now sells only what the stall shows** (hidden-category goods stay in
      the bag) — it previously used `economy.sellAllGoods`, which would have
      silently sold hidden fish.
    - `src/main.ts`: composes the context (`{ inv, collections }`) into
      `initShopWindow`.
  - **Generalizability (the block's inspection criterion):** adding Farming
    later = one new `SellCategory` entry (id, capability check, item ids) in
    `SELL_CATEGORIES` — `sellableGoodIds`, the shop window, and main are
    untouched. The claimed-set and pass-through are derived, not hand-listed.
  - **Behavior:** a fisher's stall is pixel-identical to before. A player
    with no fishing capability doesn't see fish/junk rows or fish UI framing
    at all — and Sell-everything can't touch such goods — but the moment
    they buy a rod (or have ever landed a catch), the fish counter is theirs.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 6/6: rod owner sells carp/junk/
  berries exactly as today (2 carp → +6 coins); a hoe-life player holding
  seeded carp+tin sees neither row while berries/corn still sell, and Sell
  everything earned exactly the visible 16 leaving carp+tin in the bag;
  buying a rod surfaced the fish rows in the same window; a rodless player
  whose Memory Book records a catch still sells fish (has-fished capability).
- **Commit:** Stall selling — driven by the player's chosen path (Fishing)
- **Follow-ups:** `economy.sellAllGoods` is now uncalled (kept for
  compatibility; remove or repoint when the next category block lands).
  Farming/eggs and Performer behaviors are the next blocks, one at a time.

## Visual pass II — shared outlines + richer grass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 3)
- **Block given:** (batch-3 instruction) Push toward the reference look:
  (1) a consistent dark outline stroke around every drawn shape via a shared
  helper — the identified highest-impact cheap technique; (2) grass-blade
  tufts + tiny flower dots baked into the pre-rendered ground; (3) confirm
  every entity has the soft drop shadow, extend where missing.
- **Done:**
  - **Files:**
    - `src/art/shapes.ts`: the game-wide outline defined ONCE — `OUTLINE`
      (rgba(43,32,19,.62)) + `OUTLINE_W` (1.6) with three helpers:
      `outline(g)` (strokes the current path right after a fill), `oRect`,
      `oEllipse`. No per-object stroke styling anywhere.
    - Applied across every major silhouette: player (torso, head, hat),
      cow (body, head), hen (body, head), tree trunks + canopy blobs, bush
      blobs, every fence post (incl. leaning ones), ripe crop ears, flower
      beds, the busk hat, house/barn walls (contour on `drawPlankWall`),
      both shingled gables (contour stroked outside the clip), doors,
      chimney, the stall counter + awning. Deliberately NOT outlined: tiny
      specks (grass blades, soil crumbs, sprouts) and pre-existing stroked
      details, which would turn to mud at 1.6px.
    - `src/world/ground.ts`: 240 grass tufts (3-5 blades fanning from a
      base point, two greens) + 320 tiny pastel flower dots, deterministic,
      painted before the yard/field/pond layers so those areas stay clean —
      zero per-frame cost like batch 2's props.
  - **Shadow audit:** every drawn entity already carries the shared
    elliptical `shadow()` — player, cow, hen, trees, bushes, house, barn,
    stall. Nothing was missing; nothing duplicated. (Ground decals —
    stones/leaves/mushrooms/flower beds — correctly cast none.)
  - **Behavior:** purely visual. The farm reads dramatically closer to the
    reference: every object pops from the ground with the same soft dark
    contour, and the grass is textured with tufts and flower specks instead
    of flat green.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** screenshots reviewed full-farm and zoomed (outlined
  farmer/buildings/fence/trees/crops; tufted, dotted grass; weathered-roof
  contour crisp outside the shingle clip). Functional smoke: field prompts
  live, zero page errors.
- **Commit:** Visual pass II — shared outlines + richer grass
- **Follow-ups:** the interior room deliberately kept its softer look (it
  has its own light language); revisit with the Housing tier-2 pass.

## Fix: starting coins = 50
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 3)
- **Block given:** (batch-3 instruction) VISION.md's price anchor table now
  decides starting coins = 50 (was 15 in the old doc, 0 in code — a conflict
  batch 2 flagged). Update the code to match; verify a fresh New Game starts
  with exactly 50, in-browser.
- **Done:** `STARTING_COINS = 50` in `config.ts` (with the anchor-table
  reference); `newGameReset` in `main.ts` seeds `economy.coins` from it
  instead of 0. Nothing else touches starting money.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 2/2: a New Game over a seeded
  999-coin old life starts at exactly 50 (HUD and persisted save both
  checked), and the 50 survives reload + Continue.
- **Commit:** Fix: starting coins = 50
- **Follow-ups:** none. (VISION says "enough for exactly one starter-tool
  choice" — 50 comfortably covers the 12-coin tools; the anchor number wins.)

## Farm environment detail pass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 2)
- **Block given:** (batch-2 instruction) Richer visual texture on existing
  farm objects, fully code-drawn: furrowed tilled soil, weathered/patched vs.
  repaired shingle roofs, vertical plank wall striping, multi-tone tree
  canopies, procedurally scattered ambient props (leaves/stones/mushrooms,
  no gameplay function), drop shadows under entities if missing.
- **Done:**
  - **Files:**
    - `src/art/props.ts` — `drawTilledTile`: four gently-waved furrow rows
      (dark groove + lit crest) with per-tile deterministic wobble and soil
      crumbs, still darker/damp when watered. `drawTree`: a true three-tone
      blob-clustered canopy — dark under-layer, mid-tone body, sunlit top
      clusters — with subtle per-tree tint variation and a bark seam.
    - `src/art/buildings.ts` — new shared helpers: `drawPlankWall` (vertical
      planks with alternating tone, thin seams, occasional knots —
      deterministic, never shimmers) applied to the house and barn walls;
      `drawShingleRoof` (overlapping offset shingle rows, per-shingle tone
      jitter, row shadow lines) applied to both gables — **weathered state
      (pre-repair) gets stronger jitter and missing-shingle gaps; repaired
      reads neat and even**. The existing rundown extras (roof hole + patch
      plank, boarded window, barn boards) draw on top unchanged.
    - `src/world/ground.ts` — `scatterAmbientProps`: 42 stones (faceted grey
      pairs), 56 fallen leaves (tinted ovals with midribs), 7 mushrooms,
      baked once into the pre-rendered ground (zero per-frame cost) with a
      fixed seed and rejection zones covering the field at its **maximum
      expanded size**, pond, buildings, path, bushes, flower beds, and the
      busking spot — so props can never sit under interactables or block
      anything (nothing in the ground layer collides by construction).
    - Drop shadows under entities: **already present** (`shadow()` in
      drawFarmer/drawCow/drawHen) — verified, not duplicated.
  - **Behavior:** purely visual — the farm reads richer at every zoom: soil
    has furrows under every crop, roofs are shingled and visibly weathered
    until repaired, walls are planked wood, canopies have depth, and the
    grass is quietly alive with leaves, stones, and the odd mushroom.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** screenshots reviewed at both farm states and zoomed
  (weathered vs. neat shingles contrast; furrows + five crop palettes over
  them; planks + knots up close; props scattered on grass but absent from
  field/pond/paths). Functional smoke in-browser: field prompts (Till) still
  live after the art pass; zero page errors during play.
- **Commit:** Farm environment detail pass
- **Follow-ups:** the WORLD_MAP.md rundown-farm concrete details (coop, well,
  missing fence section, sparkle spots, broken bridge, mine on the horizon,
  visible road) are now unblocked by the new doc but belong to their own
  ROADMAP block — not folded into this purely-textural pass.

## UI/HUD exterior design pass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 2)
- **Block given:** (batch-2 instruction) A general visual redesign of the UI
  chrome, consistent across every window: a circular sun/moon clock dial
  replacing the flat time pill, shared panel chrome (rounded corners, subtle
  border, drop shadow), on-screen icon buttons as the primary way into
  windows (VISION Controls — speced, never built), and the same outlined
  rounded treatment on item cells and toasts.
- **Done:**
  - **Files:**
    - `src/ui/clockdial.ts` (NEW, built by a parallel subagent to spec): a
      pure canvas painter — hour-blended sky face (night→dawn→day→dusk), a
      sun with a soft glow traveling a 6:00→19:00 arc / a crescent moon on
      the night arc, horizon line, HH:MM in the lower half, wood+gold rings
      with a 60° season-tinted tick, and subtle rain/storm/fog marks. Driven
      by the same per-frame `getWorldContext()` snapshot (types only).
    - `src/ui/hud.ts`: a dpr-crisp 64px `#clockDial` canvas redrawn each
      frame; the date pill drops the time ("Spring · Day 4") — time lives on
      the dial; weather pill unchanged.
    - `index.html`: a design-token block (`:root` — ink/gold/wood/panel
      gradient/hairline/cell tokens, two shadow recipes) with grouped
      overrides so **all four floating windows + minimap share one chrome**
      (2px wood border, 14px radius, gold hairline inset, soft drop shadow,
      gold headers with hairline underlines); pills/prompt/toast get the same
      outlined treatment; tool/zoom buttons unified with hover/active states;
      the HUD restructured to dial + info column; skills panel default
      geometry adjusted (top 470, list 150px) so nine skills clear the tools
      row.
    - **Icon-first windows:** a new 🗺 map tool button (the minimap was
      keyboard-only); all four windows now open primarily by icon with
      keys as secondary (VISION Controls). **Fixes a real batch-1 bug:** the
      Memory Book had claimed key M, colliding with the minimap — the book
      is now B (`ui/memorybook.ts`), the map keeps M (`ui/minimap.ts`, which
      also gained the button wiring + active state).
  - **Behavior:** the HUD corner is now a small painted clock — sun arcs
    across a day-blue face, a crescent moon rides the night, the ring's top
    tick shows the season, rain/storm/fog mark the face — beside compact
    coins/date/weather pills. Every window, pill, toast, and button shares
    one wood-and-gold chrome language with soft shadows under everything
    that floats.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 6/6 functional: the dial
  canvas actually paints (3168 opaque px); the date pill dropped the time;
  all four tool icons toggle their windows; **M toggles only the map and B
  only the book** (each panel's visibility checked against the other's
  stability); computed styles confirm identical border/radius/shadow across
  backpack/skills/book. Eye review of screenshots: noon full-HUD, dawn
  (peach face, low sun), night (crescent moon), rain marks — all legible at
  64px.
- **Commit:** UI/HUD exterior design pass
- **Follow-ups:** the toast's green success tint was unified into the shared
  chrome (pale-green text on panel dark) — flag if the old solid green was
  preferred. Quest-log icon joins the tools row when quests exist.

## Farm plot expansion — money-gated
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 2)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Farm plot expansion —
  money-gated") Buy expansions that grow the usable farm area; plain
  money-gating, discrete steps, immediately visible payoff; exact
  size/price/tier count TBD during implementation.
- **Implementation decisions (the TBDs), with reasoning:**
  - **Two tiers**, each a full-width 2-row strip **south** of the field, so
    the fenced area stays one clean rectangle and the fence visibly leaps
    outward on purchase (the block's visible-transformation principle). Each
    tier adds 22 tiles (+20% of the 110-tile base).
  - **Prices 120 / 180** (`PLOT_EXPANSION_PRICES` in config): the block says
    "above a fence-repair-scale purchase (10), closer to an animal-tier
    spend" — tier 1 sits between the hen (45) and cow (175); tier 2 at cow
    tier, escalating since it permanently doubles-down on capacity.
  - **Sold at the farmhouse hub** beside repairs — the same
    money-into-visible-farm-growth family; no doc names another vendor.
  - Two decorative trees south of the field moved to rows 20.8/21 in
    `zones.ts` so the tier-2 fence never swallows them.
- **Done:**
  - **Files:** `zones.ts` (`PLOT_EXPANSIONS` strips + `fieldBounds(tiers)`,
    tree nudge), `renovation.ts` (`FarmState.plotTiers`, tolerant load, reset
    to 0), `config.ts` (prices), `farming.ts` (`stripCells`/`expansionCells`;
    `loadPlots(tiers)` builds base+strips in tier order so saved cells map
    positionally; `resetPlots` truncates back to the base 110), `interact.ts`
    ("Expand the field (price)" on the farmhouse when a next tier exists —
    coins check, `plotTiers`+1, `expandFarm()` callback, Memory Book
    `first_expansion` entry; plot interactables now use a module id counter
    and guard on live-array membership so New-Game-dropped cells go inert),
    `props.ts` (`drawFence` takes live bounds), `minimap.ts`
    (`setMinimapField` repaints the static layer), `main.ts` (farm loads
    before plots; `expandFarm` materializes+registers the new strip, saves,
    updates the minimap).
  - **Behavior:** the farmhouse offers "Expand the field (120)"; buying it
    drops 120 coins, the fence and minimap jump southward instantly, and 22
    new wild tiles are tillable on the spot. Tier 2 (180) follows; after it
    the offer disappears. All of it persists; New Game shrinks the farm back.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 8/8: tier-1 offer/purchase
  (350→230 coins, 110→132 persisted cells, screenshot of the leapt fence),
  tier-2 (230→50, 154 cells), no tier 3 offered, **a cell at store index 143
  (tier-2 strip by construction) tilled through normal play**, and the broke
  refusal changing nothing. Minimap growth visible in screenshots.
- **Commit:** Farm plot expansion — money-gated
- **Follow-ups:** expansion ground keeps the grass texture (the pre-rendered
  ground doesn't repaint) — tilled tiles read fine on it; a dirt underlay
  could join a future ground pass.

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
