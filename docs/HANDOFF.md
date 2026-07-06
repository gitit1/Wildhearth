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

(Filled in as work lands; grouped by Part.)

## Autonomous decisions log

| # | Decision | Grounding |
|---|---|---|
| 1 | Start branch = `autorun/wildhearth-batch-1` (game's live branch; contains master) | FABLE_PROMPT setup rule; verified via `git log`/`merge-base` |
| 2 | VISION starting-coins stays **50** (uploaded 15 rejected as stale) | DECISIONS.md "Starting kit: 50 coins"; commits `8d58520`/`ff95174` |
| 3 | ROADMAP merge keeps uploaded ticks + restores repo-only built blocks | FABLE_PROMPT "never lose an [x]"; commit log cross-check |

## Subagent registry

(One row per subagent task; filled in as they run.)

| Task | Model | Outcome | Notes |
|---|---|---|---|

## Files reorganized

(None yet.)

## Known bugs / rough edges

(None yet this session.)

## Open questions for owner

- **OWNER PLEASE CONFIRM:** starting coins = 50 (kept). See Doc sync #2.

## How to continue

1. `git checkout v1-foundation && git pull`
2. `npm install && npm run dev` — confirm the game boots.
3. Read this file top to bottom, then the newest WORKLOG entries.
4. Continue from the first unchecked item in the session plan (Parts
   A→E per FABLE_PROMPT.md); the "What was built" section above shows
   exactly where the session stopped.
