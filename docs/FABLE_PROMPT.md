# Wildhearth v1 Foundation — Autonomous Build Session

## Critical resource constraint — read first

Budget cap: 60% of YOUR OWN remaining Fable (Opus) budget in this
session. This limit is on YOUR compute only. Subagents you spawn
(Sonnet or Opus) have their own quota and don't count toward your 60%.
The product owner is on Max x20; her quota resets tomorrow, so use
your 60% freely and let subagents do heavy lifting.

Your role = PLANNER + SUPERVISOR + ARCHITECT + DOCUMENTOR.

Model selection for subagents — pick per task complexity:
- Sonnet for narrow, well-defined implementation tasks
- Opus for architecturally complex tasks (dialogue/AI engine, NPC
  brain, relationship engine, save/load, character creation flow —
  anything where design choices interact with multiple existing
  systems)

Write code yourself ONLY if a task genuinely can't be delegated to
Sonnet or Opus (extreme complexity, needs your session context). This
is rare. Default is delegate.

The product owner (a woman — refer to her as "she" in all docs) is
asleep. Run on auto. Do NOT ask her questions. Use the source-of-truth
docs and reasonable defaults; log every autonomous decision in
HANDOFF.md.

Standing rule for autonomous decisions:
- First choice: what DECISIONS.md, VISION.md, or ROADMAP_EXPANSION.md
  says
- Second choice: what Ultima Online or The Sims does (the product
  owner has stated these are the primary influences)
- Third choice: your judgment, clearly logged in HANDOFF.md so she can
  review and override

## Setup — branches, before any doc reading or coding

1. Run `git branch -a` and `git log --oneline -30` to establish
   ground truth about which branches actually exist and where recent
   game state lives.
2. Identify the branch on which the game currently "lives" — the one
   with the most recent gameplay-affecting commits. This may or may
   not be `autorun/wildhearth-batch-1`. Do NOT assume — verify.
3. If there's an open, unmerged autorun/* branch — start from THAT
   branch, not master. All previous session work must be inherited.
4. From that inherited branch, create a NEW branch named:
   `v1-foundation`
5. All work in this session happens on `v1-foundation`.
6. Push `v1-foundation` after each commit. NEVER push to master.
   NEVER push to any inherited autorun/* branch.
7. Report the exact starting branch and commit SHA in your first
   status message.

## Read these in full, before any coding

1. docs/VISION.md
2. docs/ROADMAP_EXPANSION.md
3. docs/GAME_OVERVIEW.md
4. docs/WORLD_CONTEXT.md
5. docs/WORKLOG.md
6. docs/AUTORUN_SUMMARY_BATCH2.md
7. docs/DECISIONS.md (NEW — uploaded now, newest source of truth,
   the tie-breaker for scope questions)

## Doc sync — before any code

Two docs may be slightly out of sync between the repo and the newer
versions uploaded now:
- docs/VISION.md
- docs/ROADMAP_EXPANSION.md

For VISION.md: if uploaded copy is newer/longer, replace the repo's
copy with the uploaded one. Doc-only commit with WORKLOG entry.

For ROADMAP_EXPANSION.md: smart merge —
- Preserve every [x] tick from the repo's copy (checkbox state is
  authoritative)
- Add any new blocks from the uploaded copy (keep them unchecked)
- If a block's text differs, prefer the uploaded version's text but
  keep the repo's checkbox state
- Never lose an [x] tick. Uncertain? Note in HANDOFF.md, keep repo's.

## Feel free to reorganize docs

If the docs/ folder has grown messy (duplicate content, stale files,
unclear naming) — clean it up. Rename for clarity. Consolidate
overlapping docs. Split monster docs into readable chunks. Add an
index. The product owner explicitly invited this. Log every rename/
move/merge in HANDOFF.md so nothing is lost.

## The task — five parts, in dependency order

### Part A — Logic engines (build first, highest priority)

Each engine follows the project's InteractCtx pattern — explicit
passing, no singletons, no registry. Wire into World Context so state
is queryable.

1. **NPC engine** — Each NPC is a full entity, not just a name:
   - Identity: name, gender, age band, profession, personality
     archetype
   - Visuals: uses the same segmented rig as the player (built in
     Part B #6), with body-shape variants, hair, clothing per role,
     age-appropriate proportions
   - Behavior: daily schedule that varies by day-of-week, drives a
     state machine (at-home / at-work / at-market / socializing /
     asleep)
   - v1: 10 NPCs. You pick the mix of professions × personalities
     from safe presets grounded in DECISIONS.md. Log picks in
     HANDOFF.md for owner review.
   - v5-ready: forward-compatible with family/backstory/Heart Events
     even though v1 uses independent NPCs

2. **Needs engine** — 7 needs per DECISIONS.md: hunger, thirst,
   energy, hygiene, bathroom, mood, social. Rate affected by action,
   season, weather. Collapse at zero = temporary + coin cost, no
   death, no injury. Visual warnings + NPC comments ("you look
   tired") when the player is near a low-need threshold.

3. **Relationship engine** — 2 axes per NPC (Friendship 0-100,
   Romance 0-100). 5-tier gift preferences (loved/liked/neutral/
   disliked/hated). No marriage in v1 but engine forward-compatible
   for v5's event memory, Heart Events, NPC-to-NPC relationships,
   marriage, children.

4. **Dialogue + AI engine** — see Part D (AI). Choice-based skeleton
   (2-3 responses per turn per DECISIONS.md) with the AI layer on
   top for variation.

5. **Guidance Mode engine** — Tutorial / Aspiration / None per
   DECISIONS.md. Tutorial pauses game-time per step, transparent
   bubbles, Skip button per step. Aspiration feeds background NPC/
   quest bias. None = fully free. Save-state remembers mode; asks
   on next load if Tutorial was in progress.

6. **Festival engine** — v1: one festival per year, day 15 of a
   season, in the stall-area. Pick season + theme (Harvest / Solstice
   / Moon) from DECISIONS.md open questions — log pick. Framework
   supports adding more festivals for v5.

7. **End-of-day summary engine** — Player setting: none / quick /
   full-with-achievements per DECISIONS.md. Auto-pause during
   dialogue/important events.

8. **Weather integration** — weather.ts already picks state each day.
   Wire the gameplay consequences: needs rate changes by weather +
   season, wildlife-in-world changes by season+weather, NPC schedule
   tweaks by weather (v5 forward-compatible stub for now).

9. **Stall-selling-by-path** — v1: Fishing scope. Player's own stall
   shows the union of their skill outputs. Fish-stall NPC in the
   stall-area buys fish. Structure so adding future paths (farming,
   cooking, music) is additive.

10. **Character Creation flow v1** — Age 18+, gender male/female,
    appearance preset set, name (first+last+optional nickname),
    Starting Path (Fisher/Farmer/Musician/Animal-Keeper) with kit +
    preferred skill, life-goal from a short list. You pick 3-5 goals
    from DECISIONS.md open questions — log picks. Followed by
    Guidance Mode picker, then straight to farm.

11. **Save/load system** — auto-save every 10 real minutes + manual
    save via HUD icon. Save slots forward-compatible for v5's
    multiple-characters feature. "Continue Tutorial?" prompt on load
    if Tutorial was in progress.

### Part B — Visual foundation (into existing engine)

For each item, extend the existing code — don't fork a parallel
engine. Integrate into art/*.ts, engine/*.ts, systems/*.ts.

1. Universal outline pass — audit batch 3's coverage, extend to any
   entity type still missing outlines
2. Elliptical drop shadows — audit + extend to any missing entity
   type
3. Diagonal cast shadows for tall objects — buildings, trees, player,
   NPCs, tall props. Fixed upper-left light source. Distinct from #2
   (which is under-entity), this is offset-and-skewed.
4. Rich ground texture — extend batch 2's ambient props with
   procedural grass blade tufts + flower dots, pre-baked, respecting
   rejection zones around interactables
5. Multi-tone tree canopies — audit vs Cute Fantasy reference; push
   to 3 shades in blob clusters if too flat
6. **Segmented rig for ALL moving entities** — player, NPCs, animals.
   Jointed segments, walk cycle on sine wave keyed to distance moved.
   Distinct pose functions for actions: idle, walking, fishing,
   hoeing, foraging, busking, talking, sleeping. Share outline/shadow
   helpers. NPCs and animals adopt the same rig with body-shape
   variants (chicken has short legs, cow has 4 legs, etc.)
7. Parallax background layer — at least one distant band scrolling
   slower than foreground on camera pan
8. Weather visual layer — rain particles, storm sky-tint, fog overlay
   per DECISIONS.md's full weather list
9. Day/night tint — full-screen color cycle dawn→day→dusk→night
   driven by calendar.ts currentPhase()
10. Ambient particle system — seasonal drift, sparkles for feedback,
    hooks any painter can trigger

Note on sprites: no PNG assets currently exist. Keep everything
code-drawn for now. Design painter interfaces so a future sprite-swap
is local, not a rewrite. If you judge that connecting to PixelLab (or
any other sprite source) would materially improve results within
budget — you have permission to do so. Log the decision and any auth/
API steps clearly in HANDOFF.md.

### Part C — Content library

Only after A and B substantially done. Code-drawn painters, visuals
only, no gameplay logic. Per DECISIONS.md: ~20 varieties per
collection for v1, growing to 50+ at v5. Build for v1 now.

- 15-20 crop varieties with growth stages
- 10-15 tree/bush variants with seasonal variants (bloom/leaf/bare)
- 20-30 ambient decorations (flowers, stones, mushrooms, logs, fallen
  leaves, weeds)
- 8-10 fish species
- 6-8 farm animals (chicken, cow, pig, sheep, duck, cat, dog, rabbit)
- Multiple building variants (farmhouse rundown/repaired, barn, shed,
  stall variants, well, fence variants)
- 10 outfit painters layering on the rig (5 per gender, swappable
  per DECISIONS.md)
- 15-25 accessory/tool painters (rod, hoe, watering can, basket,
  instrument, seed bag, sickle, axe, pickaxe, cooking pot, sack)

### Part D — AI integration (deep, throughout the game)

The product owner's vision for AI is enrichment and anti-repetition.
The core goal: no experience should feel same-twice. This is what
elevates the game above simple sim mechanics.

Apply AI to ALL of these:

1. **Backstory generation** — every NPC gets a rich backstory
   generated at world-creation time. Why did they come to town? What
   do they miss? What do they hope for? Grounded in personality +
   profession. Stored in save data, feeds dialogue.
2. **Dialogue variation** — the choice tree is the skeleton; AI
   renders the actual words per NPC personality, current mood,
   relationship state, weather, time of day. Same choice = different
   phrasing each conversation.
3. **Quest generation** — dynamic quests that emerge from world
   state: an NPC's mood, a broken relationship, a bumper harvest, a
   long dry spell. Not one-shot templates; unique to the player's
   world.
4. **NPC internal state** — each NPC has a "current thought" — what
   they want right now, what they're worried about, what they
   noticed. Drives their spontaneous comments to the player and
   what they'll bring up in dialogue.
5. **Story arc weaving** — AI tracks the player's play patterns,
   relationships built, quests completed, and suggests emergent
   narrative threads: "you always visit the fisherwoman on Fridays;
   she starts saving her best catch for you." Not scripted;
   discovered.
6. **World-event narration** — first snow, a rare fish caught, an
   NPC's birthday, a relationship crossing a threshold — narrated
   uniquely each time, never templated.
7. **Anti-repetition memory** — every AI-generated line remembers
   what it said before to this player. Never repeats a story, never
   uses the same phrase twice in one session.
8. **Improvement observation (meta)** — AI watches player behavior
   over time and flags to the WORKLOG-equivalent: "player has skipped
   fishing 5 sessions in a row — this feature may need a hook."
   This is a HANDOFF.md output for the developer, not shown to the
   player.

Design constraints:
- v1: works with the player's own API key (BYOK) per VISION.md. The
  game must run without any AI provider — every AI feature has a
  "flat fallback" (static text, single template) so a player who
  never sets a key still has a complete game.
- Budget-aware: never spend player's tokens without them opting in.
  Configurable monthly cap per VISION.md.
- Server-optional: the game is browser-first; AI calls go direct from
  browser or via a lightweight relay if the provider requires one.

### Part E — Main menu + top-level screens

Completely missing today. Build these BEFORE the game world becomes
accessible:

1. **Main title screen** — game logo, ambient background (maybe a
   painted vista of the farm at sunrise), and the following buttons:
   - Continue (shows save-slot status: last saved day, season, coins;
     disabled if no save exists)
   - New Game (leads to Character Creation from Part A #10)
   - What's New (see below)
   - Settings (see below)
   - Help / Guide (short pages explaining core mechanics for the
     lost player)
   - Credits
   - Exit
2. **What's New screen** — a scrollable changelog. Every version
   entry has a title, date, and human-readable summary of what
   changed for the player. Auto-highlights entries the player hasn't
   seen since last play. Data-driven: entries live in a
   docs/CHANGELOG-for-players.md or similar so future updates just
   append.
3. **Settings screen** — every toggle we've decided on:
   - Day-length slider (per DECISIONS.md)
   - HUD side-panel content (what shows on the right sidebar per
     DECISIONS.md)
   - End-of-day summary detail (none / quick / full)
   - Font size, high-contrast toggle, colorblind palette hooks
     (accessibility)
   - Audio (music / SFX / ambient volumes)
   - AI section: API key input (masked), monthly token cap, which
     AI features are enabled (checkboxes per Part D feature)
   - Language: English only in v1 but the setting exists
   - Save/load/delete (manage save slots even though v1 uses one)
4. **Character Creation screen** — full flow from Part A #10, visual
   preview of the character as the player changes options, plus a
   Randomize button
5. **Guidance Mode picker** — three cards (Tutorial / Aspiration /
   None) each with a brief description of what to expect
6. **Pause screen** (in-game) — quick access to Save / Settings /
   Return to Main Menu / Exit
7. **Exit dialog** — three options per DECISIONS.md: "Exit to main
   menu" + "Exit fully" + "Switch to another game" (forward-compat
   for v5's multi-character)

All screens: the reusable panel chrome batch 2 built. Not one-offs.

## Freedom clause — extend as needed

The product owner explicitly invited you to:
- Add features beyond what's listed if you see the need
- Push into v2/v3 territory once v1 is solid, if budget permits
- Reorganize architecture where the current one is limiting
- Propose new mechanics that fit the game's vision — log them,
  build them if you're confident, or leave as recommendations in
  a proposals doc
- **Meat over minimal.** Given a choice between "just the block spec"
  and "the block spec plus 3 obvious next-step details" — take the
  richer version.

Constraints on freedom:
- Everything must fit the game's core: no combat, no death, no injury,
  no monsters, no PvP
- Anything requiring product-owner input for scope: reasonable default
  now, flagged in HANDOFF.md as "OWNER PLEASE CONFIRM"

## Docs to produce during this session

### 1. HANDOFF.md — the master continuity doc

Placed at docs/HANDOFF.md. This is the single doc that lets ANY LLM
or human open the project tomorrow and understand where to continue.
Not just decisions — the whole picture:

- **Session context** — what was asked, what was in-scope, budget cap,
  branch structure
- **What was built** — grouped by Part (A/B/C/D/E). For each item:
  file paths touched, key exports, integration with existing systems,
  status (done / partial / blocked)
- **Every autonomous decision made** — what, why, which source-of-
  truth doc grounded it, or if none, what UO/Sims parallel guided it
- **Subagent registry** — for each subagent task: which model was
  used, what was the task, what was the output, how long it took,
  how many tokens (if available), any correction rounds
- **Files reorganized** — every rename/move/merge/delete, with reason
- **Known bugs / rough edges** — anything not perfect, described
  precisely so it can be picked up
- **Open questions for owner** — anything flagged "OWNER PLEASE
  CONFIRM", with proposed answer and reasoning
- **How to continue** — literal step-by-step for the next session:
  "run X, verify Y, then start Part F", regardless of who/what
  continues

### 2. ROADMAP_TO_V5.md — the version evolution plan

Placed at docs/ROADMAP_TO_V5.md. Deep planning of the whole product
arc. For EACH of v1, v2, v3, v4, v5 — a full section with:

- Theme/focus of the version (e.g. "v1 = playable farming loop, v2 =
  town opens, v3 = deep relationships and NPC storylines...")
- Every system's state at that version — what's in, what's not
- The gap from previous version — what to build to get there
- Dependencies between systems (what needs what)
- Estimated scope in developer-weeks (your best judgment, note it's
  an estimate)
- Key risks or unknowns for that version

Use DECISIONS.md's v1/v5 markers as anchors — you'll be interpolating
v2/v3/v4 based on natural dependency ordering and DECISIONS.md's
intent.

### 3. AI_ARCHITECTURE.md — how AI works throughout the game

Placed at docs/AI_ARCHITECTURE.md. Since AI is deep and cross-cutting
per Part D, it gets its own doc:

- Overall architecture (where AI lives, what it doesn't do)
- Each of Part D's 8 use cases: prompt strategy, memory, cost,
  fallback
- API key handling and player-facing UX (Settings → AI section)
- Testing strategy without burning tokens (mock provider,
  deterministic mode)
- v1 → v5 evolution of the AI layer

### 4. PROPOSALS.md — your ideas and extensions

Placed at docs/PROPOSALS.md. Anything you thought of that didn't fit
in DECISIONS.md but you believe strengthens the game:

- Mechanic proposals
- Feature ideas
- Improvements to existing systems
- Content ideas (crop varieties, NPC archetypes, festivals, etc.)

Each proposal: title, one-paragraph description, which version it
would fit, what would build it. Owner reviews and picks.

### 5. Docs cleanup log — if you reorganize

If you clean up the docs/ folder, produce a mapping table in
HANDOFF.md showing every rename, move, merge, delete, and why.

## Commits — MANDATORY project rule

Every code change ships with a WORKLOG.md entry in the SAME commit.

Standard flow:
1. Feature finished + verified (`npm run build` green + in-browser
   sanity check where relevant)
2. Add WORKLOG.md entry (files, systems, behavior, subagent used if
   any)
3. git add -A
4. Commit with title matching WORKLOG entry
5. git push (v1-foundation only)

One commit per feature/painter category. Do not batch.

## Hard rules recap

- 60% of YOUR OWN Fable budget. Subagent quota separate.
- Continue on `v1-foundation` branch. Never push master or inherited
  branches.
- Delegate substantively. Sonnet or Opus for subagents per complexity.
- Every commit: code + WORKLOG entry together.
- DO NOT ask questions. Log ambiguities in HANDOFF.md, pick defaults
  grounded in docs or UO/Sims parallels, keep moving.
- Order: Part A → B → C → D → E, but you can interleave subagents on
  independent items across parts to maximize parallelism.
- DECISIONS.md is tie-breaker for scope.
- The product owner is a woman. Reference her as "she" throughout
  all docs.
- **Meat over minimal.** Given a choice, always go richer.
- **Anti-repetition is a north star.** Never let content feel
  templated.

Report back when done or at 60%.
