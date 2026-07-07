# HANDOFF — v1-foundation session

**The master continuity doc.** Any LLM or human opening this project after
this session starts HERE. Updated continuously during the session; the
final version at the session's end is authoritative.

---

## Session context

- **What was asked:** the autonomous build session defined in
  `docs/FABLE_PROMPT.md` — five parts: (A) logic engines, (B) visual
  foundation, (C) content library, (D) AI integration, (E) main menu +
  top-level screens; plus four docs (this file, `ROADMAP_TO_V5.md`,
  `AI_ARCHITECTURE.md`, `PROPOSALS.md`). The product owner is asleep;
  run on auto, no questions, log every autonomous decision here.
- **Budget cap:** 60% of the supervisor model's own budget; subagents
  (Sonnet/Opus) are separate quota and do the heavy lifting.
- **Branch structure:** starting branch `autorun/wildhearth-batch-1` @
  commit `c1a942f` (contains master entirely; master sits at `ee7d7d5`).
  Work branch **`v1-foundation`**, created from it and pushed. Never
  pushing master or the inherited autorun branch.
- **Source-of-truth order for decisions:** DECISIONS.md → VISION.md /
  ROADMAP_EXPANSION.md → Ultima Online / The Sims parallels → judgment
  (logged here).

## Doc sync (done before any code)

The product owner uploaded newer copies of two docs (present as
uncommitted working-tree edits when the session started) plus two new
files (`DECISIONS.md`, `FABLE_PROMPT.md`). Resolution:

1. **ROADMAP_EXPANSION.md — smart merge, both directions.**
   - The uploaded copy carries **accurate `[x]` ticks** for ~16 blocks
     that the repo's copy showed unchecked (a known artifact: the batch-3
     baseline upload had reset ticks; see AUTORUN_SUMMARY_BATCH2's note).
     Every tick was verified against the actual commit log — all real.
     **Kept all uploaded ticks.**
   - The uploaded copy was **missing two chunks that exist in the repo
     and describe built, committed work**: the "Stall selling — driven by
     the player's chosen path (Fishing)" block (built in `9bc81c1`) and
     the HUD season/day/time block's minutes-amendment text (built in
     `ee7d7d5`). Both restored — per the "never lose an [x] tick" rule
     and because deleting the record of built work would misdescribe the
     codebase.
   - Net result: union of blocks, union of ticks, newest text everywhere.
2. **VISION.md — uploaded change NOT taken.** The uploaded copy's only
   change was reverting the price-anchor table's starting coins from 50
   back to 15. That contradicts DECISIONS.md (the newest source of truth:
   "Starting kit: 50 coins"), the explicit product decision committed in
   `8d58520`, and the code (`STARTING_COINS = 50`, verified in-browser in
   `ff95174`). Judged a stale copy of the anchor table, not a new
   decision. Repo's copy (50) kept. **OWNER PLEASE CONFIRM** only if 15
   was actually intended — everything else assumes 50.
3. **DECISIONS.md** committed as uploaded — now in the repo as the
   tie-breaker doc.
4. **FABLE_PROMPT.md** committed as uploaded — the session's work order,
   kept for the record.

## What was built

### Part A — logic engines
- **World expansion v1** (`4e1b397`) — prerequisite for NPCs/festival/stall
  NPC. The farm is now the west corner of a 108×30-tile open world: dirt
  road east past an established neighbor farm → market square (4 distinct
  stalls: fish-buyer / produce / general-goods / empty, a well, 6
  cottages) → forest passage branching north (foraging works there,
  location-tagged) → river along the east edge widening into a lake with
  a dock (fishing spots pass "river"/"lake" into the existing fish-table
  tags). Busking moved to the market square (DECISIONS: music income only
  at stall-area). New `regionAt(x,y)` + a `location` slice in
  WorldContext. Farm layout and all saves untouched.

- **NPC engine — 10 townsfolk with weekly schedules** (`bb70e96`) —
  `data/npcs.ts` roster (below), `systems/schedule.ts` (7-day week
  Sun–Sat from `absoluteDay`, per-day timelines, storm-goes-home weather
  stub), `entities/npc.ts` (waypoint walking, state machine
  atHome/atWork/atMarket/socializing/asleep, indoors = not rendered),
  talk prompt with personality one-liners via the `onTalk` seam the
  dialogue engine will replace. Kid-safety is structural (a kid NPC
  cannot carry a romantic flag at the type level).

- **Needs engine** (`146f3e4`) — 7 needs (hunger/thirst/energy/hygiene/
  bathroom/mood/social), season+weather decay modifiers, eat/drink/wash/
  outhouse/sleep/sit restoration, sleep drives the real minute loop (all
  daily hooks fire), escalating 25/10 warnings + HUD needs strip,
  collapse = coin fee (15) + wake at bed, mood (derived) scales
  skill-gain AND busking pay, NPCs comment on low needs.
- **Relationship engine** (`909ff49`) — Friendship+Romance 0-100 per
  NPC, gift tiers DERIVED from traits (`data/traitPreferences.ts`),
  deltas +35/+20/+8/-10/-20, weekly 2-gift cap + birthday ×2 exempt,
  depth-dependent daily decay, category interactions
  (Friendly/Funny/Romantic/Blunt) with diminishing daily returns,
  threshold 25/50/75 events → Memory Book (heart-event seam for v5),
  WorldContext relationship slice via query.npcId.
- **Dialogue engine** (`63140f4`) — condition-keyed lines
  (season/weather/dayOfWeek/phase/region/tier/flags/farm-state),
  most-specific-wins + anti-repeat rotation, 2-3 choice turns in a
  wood/gold bottom-box, auto-pauses game time, per-NPC tables for all
  10 + shared skeletons, `renderNpcLine()` seam for the AI layer.
- **Save system** (`592f8f2`) — slot manifest (v5 multi-slot ready),
  💾 manual save icon, 10-minute autosave.
- **End-of-day summary** (`218fc5f`) — none/quick/full setting, day
  ledger (coins/catches/harvests/skills/discoveries/relationships),
  full panel pauses time.
- **Festival engine** (`baa7c14`) — Harvest Festival, autumn mid-season,
  all 10 NPCs gather, bunting/lanterns/harvest decorations, festival
  dialogue line + Memory Book entry; framework is data-driven for more.
- **Fish-stall NPC** (`88d22e8`) — Maren buys fish at the market during
  work hours (sell-only window via the sellCategories dispatch); the
  {stallId, npcId, buysCategory} table makes the produce stall one row
  later.
- **Seasonal wildlife** (`577f242`) — butterflies/songbirds/rabbits/
  ducks/deer/hares by season+weather+region; flee-and-despawn; storm
  empties the world.

- **Character creation** (`d65b87e`) — full New Game flow: identity
  (first/last/nickname, age 18+, gender), curated appearance presets
  with a live breathing rig preview + Randomize, skippable intro story,
  farm reveal BEFORE the path choice, Starting Path cards
  (Fisher/Farmer/Musician/Animal-Keeper — kit + skill 10 + 50 coins +
  food), life-goal pick. Old saves synthesize a default character.
- **Guidance Mode engine** (`ee2fe8d`) — picker (Tutorial/Aspiration/
  None); Tutorial = 4 real-action steps (move→first action→first
  sale→first purchase) with clock-freeze, Skip (one-way), persistent
  Help icon, mid-progress reload prompt; Aspiration = per-path 3-4 step
  background chains + life-goal flavor, HUD pill; switchable in
  Settings (tutorial re-entry blocked per DECISIONS).

### Part E — main menu + screens (complete)
- **Main menu** (`4827325`) — code-painted sunrise-farm vista + animated
  "Wildhearth" logo; Continue (live slot manifest: season/day/coins/
  saved-ago; disabled without a save), New Game (confirm-over-save),
  What's New (data-driven `src/data/changelog.ts`, NEW badges +
  lastSeen tracking), Help/Guide (5 honest pages), Credits, Exit.
- **Settings screen** (`8259b09`) — day-length slider (live), summary
  detail, guidance switch, HUD toggles (needs strip/minimap/dial), font
  size, high contrast, colorblind hook (stored, honest "coming soon"),
  audio sliders (stored, "no sound yet"), **AI section** (master off by
  default, masked BYOK key, monthly token budget, 8 feature checkboxes
  — surface only; the AI layer itself is the next block), save
  management (save now / double-confirm delete). `aiSettings.ts` is NOT
  in GAME_KEYS (survives New Game).
- **Pause + Exit** (`ee96377`) — Esc/⏸ pause (freeze, Save/Settings/
  menu/exit), DECISIONS' three-option exit dialog ("Switch to another
  game" greyed until v5 multi-character), return-to-menu autosaves then
  `location.reload()` (sanctioned pragmatic teardown), exit-fully saves
  + farewell screen.

### Part B — visual foundation
- **Segmented rig** (`ad18828`) — `art/rig.ts` (RigParams: build, legs,
  arms, skin, 5 hairstyles, outfit, age proportions; 8 poses: idle,
  walking, fishing, hoeing, foraging, busking, talking, sleeping;
  distance-keyed walk cycle) + `art/animalRig.ts` (quadruped + bird —
  cow/hen presets; pig/sheep/duck/cat/dog/rabbit are param variants).
  Player + animals fully migrated; painter interface narrow so a future
  sprite swap stays local.

### The 10-NPC roster (decision #10 — OWNER PLEASE REVIEW)
| Name | Role | Personality | Romantic |
|---|---|---|---|
| Maren | fish-stall keeper | brisk-warm | ✓ |
| Tobin | produce-stall keeper | cheerful-chatty | ✓ |
| Sera | general-goods keeper | precise-practical | — |
| Henrik | neighbor farmer (elder) | gruff-kind | — |
| Petra | baker/cook | warm-motherly | — |
| Liora | street musician | dreamy-performer | ✓ |
| Bram | carpenter/handyman | quiet-craftsman | ✓ |
| Ada | forager/herbalist (elder) | shy-naturalist | — |
| Finn | fisher apprentice (kid) | eager-apprentice | never (kid) |
| Jonas | wandering peddler | gossipy-connector | — |

### Session planning docs
- **docs/ROADMAP_TO_V5.md** — full v1→v5 product arc (17-system matrix
  per version, gaps, dependencies, scope estimates, risks).
- **docs/AI_ARCHITECTURE.md** — the Part-D blueprint: `src/systems/ai/`
  module tree, BYOK browser-direct transport, closed NPCAction union +
  validator, budget/cache/rate-limit discipline, mock provider testing,
  ~$0.04/hr cost envelope.
- **docs/PROPOSALS.md** — 22 proposals for owner review.

## Autonomous decisions log

| # | Decision | Grounding |
|---|---|---|
| 1 | Start branch = `autorun/wildhearth-batch-1` (game's live branch; contains master) | FABLE_PROMPT setup rule; verified via `git log`/`merge-base` |
| 2 | VISION starting-coins stays **50** (uploaded 15 rejected as stale) | DECISIONS.md "Starting kit: 50 coins"; commits `8d58520`/`ff95174` |
| 3 | ROADMAP merge keeps uploaded ticks + restores repo-only built blocks | FABLE_PROMPT "never lose an [x]"; commit log cross-check |
| 4 | Direction map (open decision): farm WEST hub; road EAST past neighbor farm to market; forest passage NORTH off the road; river/lake EAST/SOUTH-EAST | DECISIONS "World structure: network of roads"; VISION hub-and-spoke |
| 5 | v1 world size 108×30 tiles (~4x prior area, single pre-rendered ground canvas <4096px); farm→market ~10-13s walk — "hours of walking" stays the v5 aspiration | Performance cap vs DECISIONS "medium-to-large" |
| 6 | Busk spot relocated farm → market square | DECISIONS "Music income v1: only at stall-area" |
| 7 | Market stalls decorative until the NPC engine lands; player's own trade stall stays at the farm for now | Dependency order; DECISIONS selling-paths priority |
| 8 | ROADMAP_TO_V5 arc: town=v2 (not v5), Fisherwoman deep kit=v2, marriage/children=v4, needs=7 per DECISIONS; passive Haggling discount stays v1, active haggling v3+ | DECISIONS v1/v5 anchors, dependency interpolation |
| 9 | AI layer: BYOK browser-direct (documented CORS header), Haiku-tier default on the cost dial, improvement-observation (D8) defaults OFF since it spends her tokens for dev benefit | VISION §NPC brain; AI_ARCHITECTURE.md |

Later decisions (10+):
- **#10** — the 10-NPC roster table below (professions × personalities, 4 romantic candidates, kid structurally unromanceable). FABLE_PROMPT asked for the mix to be picked + logged.
- **#11** — v1 gifts move Friendship only; the Romantic interaction category is what moves Romance. Grounding: keeps the two axes independently earnable (Sims model), avoids gift-spam romancing.
- **#12** — NPC dialogue display = bottom-box (DECISIONS left bubble-vs-box to Fable). Matches the established wood/gold chrome.
- **#13** — Festival: **Harvest, autumn**, day = `min(15, ceil(DAYS_PER_SEASON/2))` → day 5 with 10-day seasons. Resolves the FABLE_PROMPT "day 15" vs DECISIONS "10-day seasons" contradiction; honors day-15 whenever seasons run ≥15 days. **OWNER PLEASE CONFIRM** the theme pick (Harvest vs Solstice vs Moon).
- **#14** — End-of-day summary default = "quick".
- **#15** — NPC-stall trading is a data table; only Maren's fish stall is live in v1 (FABLE_PROMPT: fishing scope).
- **#16** — Wildlife tables: spring butterflies/songbirds/rabbits, summer +ducks, autumn deer, winter hares+deer; insects vanish in rain; storms empty the world.

Decisions 17-22:
- **#17** — Life-goal list (open decision in DECISIONS): **Family / Independence / Community / Mastery / Fortune**. OWNER PLEASE CONFIRM.
- **#18** — Old `guided:true` saves migrate to **Aspiration** (gentle, non-modal), `false` → None; a forced tutorial is never revived on a mid-game save.
- **#19** — "Tutorial pauses game-time per step" read as: the CLOCK freezes while a step bubble is up, movement/actions stay live so steps can complete.
- **#20** — Return-to-main-menu = autosave then `location.reload()` (clean-teardown risk not worth zero player-visible gain); Continue re-enters cleanly.
- **#21** — AI settings surface (key/budget/feature checkboxes) shipped BEFORE the AI layer so Part D wires into a real UI; master toggle defaults OFF; stored outside GAME_KEYS.
- **#22** — Player-facing changelog lives in `src/data/changelog.ts` (FABLE_PROMPT suggested a docs file "or similar" — in-code = type-checked + bundled).

## Subagent registry

(One row per subagent task; filled in as they run.)

| Task | Model | Outcome | Notes |
|---|---|---|---|
| World expansion v1 | Opus | ✅ committed `4e1b397` | ~295k tok, ~33 min, verified in-browser (Playwright walkthrough, all 5 regions) |
| Segmented rig (B6) | Opus | ✅ committed `ad18828` | ~175k tok, ~22 min; pose gallery + in-game verification, temp harness removed |
| NPC engine (A1) | Opus | ✅ committed `bb70e96` | ~288k tok, ~34 min; full-day observation incl. closed days + Sunday gathering |
| Needs engine (A2+A8) | Opus | ✅ committed `146f3e4` | ~300k tok, ~33 min; 21/21 in-browser checks |
| Relationships (A3) | Opus | ✅ committed `909ff49` | ~305k tok, ~28 min; 23 checks incl. trait tiers + caps + decay |
| Dialogue engine (A4) | Opus | ✅ committed `63140f4` | ~283k tok, ~26 min; 16/16 checks incl. condition precedence |
| Save+Summary+Festival (A11/A7/A6) | Sonnet | ✅ 3 commits `592f8f2`/`218fc5f`/`baa7c14` | ~405k tok, ~39 min |
| Fish stall + wildlife (A9/A8b) | Sonnet | ✅ 2 commits `88d22e8`/`577f242` | ~369k tok, ~38 min |
| Char creation + Guidance (A10/A5) | Opus | ✅ 2 commits `d65b87e`/`ee2fe8d` | ~393k tok, ~45 min; 37/37 + 36/36 checks, real-action tutorial |
| Main menu + screens (Part E) | Opus | ✅ 3 commits `4827325`/`8259b09`/`ee96377` | ~336k tok, ~37 min; 60 checks + reviewed vista screenshots |
| ROADMAP_TO_V5.md | Opus | ✅ delivered | ~135k tok; judgment calls in decision #8 |
| AI_ARCHITECTURE.md | Opus | ✅ delivered | ~273k tok; judgment calls in decision #9 |
| PROPOSALS.md | Sonnet | ✅ delivered | ~101k tok; 22 proposals |

## Files reorganized

(None yet.)

## Known bugs / rough edges

(None yet this session.)

## Open questions for owner

- **OWNER PLEASE CONFIRM:** starting coins = 50 (kept). See Doc sync #2.

## Session status at the pause point (2026-07-07)

The product owner asked to pause mid-session. State: **Parts A and E are
COMPLETE** (all 11 Part-A engines + all 7 Part-E screens, every block
committed, verified in-browser, and pushed). Part B item 6 (the rig) is
done. **Remaining:** Part D (the AI layer — foundation + the 8
features; the Settings AI surface already exists and waits for it),
Part B remainder (day/night tint, weather visuals, parallax, ambient
particles, diagonal cast shadows, outline/shadow audits), Part C
(content library: more crops/trees/decorations/animals/buildings/
outfits/tools). After those: the user's standing instruction is to
continue into next-version work per ROADMAP_TO_V5.md if budget remains.

## How to continue

1. `git checkout v1-foundation && git pull`
2. `npm install && npm run dev` — confirm the game boots to the new
   main menu; run a quick New Game to see the creation flow.
3. Read this file top to bottom, then the newest WORKLOG entries.
4. Build next, in order, one subagent per block, each with its own
   WORKLOG-entry commit pushed to v1-foundation:
   a. **Part D commit 1 — AI foundation**: `src/systems/ai/` per
      docs/AI_ARCHITECTURE.md (provider.ts BYOK browser-direct +
      mock provider, budget.ts monthly cap vs `aiSettings`, cache,
      schema validator with the closed action set, deterministic test
      mode). Wire the Settings "Test connection" button.
   b. **Part D commit 2+ — AI features with flat fallbacks**: NPC
      backstories at world-creation, dialogue variation via the
      existing `renderNpcLine()` seam, NPC inner thoughts, world-event
      narration, anti-repetition memory, quest-gen stub, improvement
      observer (writes dev notes, off by default). EVERY feature must
      no-op gracefully with AI off — the game is complete without it.
   c. **Part B remainder** (one Sonnet run, commits per feature):
      day/night full-screen tint from `currentPhase()`, weather visual
      layer (rain particles, storm tint, fog overlay), one parallax
      background band, ambient particle system (seasonal drift +
      action sparkles), diagonal cast shadows for tall objects
      (upper-left light), audit outlines/drop-shadows on new entities
      (NPCs/wildlife/cottages/stalls).
   d. **Part C content library** (one-two Sonnet runs): crops 9→15-20,
      tree/bush seasonal variants, 20-30 ambient decorations, farm
      animals pig/sheep/duck/cat/dog/rabbit (params exist in
      animalRig), building variants, 10 outfits (5/gender) on the rig,
      15-25 tool/accessory painters.
5. Keep updating THIS file the same way (decisions, registry, built
   list) and keep the one-commit-per-block + WORKLOG rule.
