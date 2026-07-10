# HANDOFF — v1-foundation session(s)

**The master continuity doc.** Any LLM or human opening this project after
this session starts HERE. Updated continuously during the session; the
final version at the session's end is authoritative.

---

# SESSION 3 (2026-07-10) — The art-medium division (characters = rig, world = sprites)

**The decisive session for art direction.** Session 2 shipped a full
sprite world INCLUDING sprite characters (heroine + 5 hairstyles + 10
NPCs), with the code rig demoted to a mere fallback. Session 3 asked the
harder question the owner had flagged — "no middle," the world must be
ONE coherent visual language — and, through a chain of probes, REVERSED
the character decision: characters now render via the (upgraded) code
rig; PixelLab powers the environment only.

## The probe chain (how the decision was reached)
1. **"No middle" rule (owner):** the visual world is ONE language, not a
   jarring mix of sprite objects next to code-drawn objects. Everything
   below serves this.
2. **Tree probe:** PixelLab tree sprites are pretty per-frame, but the
   CODE tree system wins for mass-placed, seasonally-varying,
   per-instance-varied objects — so trees are not an argument for
   sprite-everything.
3. **Character-layering probe (DECISIVE):** PixelLab structurally CANNOT
   decompose a character — it emits baked full-body sprites, exposes no
   isolated hair/outfit layers, and gives no cross-generation skeleton
   registration. Fresh gens drift identity; identity-preserving
   `create_character_state` edits cost ~20 gens each and can't be freely
   mixed (50 outfits × 5 hair ≈ 5,000 gens). **Conclusion: sprites cannot
   power the character-creation pillar.**
4. **Rig-upgrade spike (DECISIVE):** the decomposed CODE rig CAN be
   elevated to sprite-competitive quality (3-tone per-material shading,
   expressive face, volumetric hair, cloth detail) while staying fully
   parametric — so choosing it for characters costs no fidelity.

## LOCKED DECISION
**Characters (player + all 10 NPCs) render via the upgraded code rig
`src/art/rig.ts`; the environment (buildings, animals, props, trees,
crops, items) uses PixelLab sprites. The PixelLab CHARACTER sprites become
an off-by-default dual-path FALLBACK (kept, not deleted), toggled by
`CHARACTER_SPRITES_PRIMARY` in `src/config.ts`.** Coherence holds because
the rig is drawn in the SAME pixel-art language as the sprites
(nearest-neighbour, dark single-colour outline, warm muted palette, 3-tone
shading) — "hand-crafted characters over a sprite environment," one world.
Character creation regains full depth: build/skin/hair/outfit/age + new
**eyeColor** + a new **"long"** hairstyle. Recorded as a first-class
product decision in DECISIONS.md ("Art medium division") and CLAUDE.md
hard rule #1.

## What shipped (commit `2ed29dc` "Characters adopt the upgraded rig — sprites become fallback")
- `src/art/rig.ts` UPGRADED to sprite-competitive quality (3-tone
  shading, expressive face, volumetric hair, cloth detail), still fully
  parametric.
- All characters (player + 10 NPCs) WIRED to the rig as the primary,
  shipped look.
- Character-creation screen exposes the new `eyeColor` and the new "long"
  hairstyle.
- `CHARACTER_SPRITES_PRIMARY` flag added in `src/config.ts` (default off);
  the session-2 sprite character code + PNGs remain in place as the
  dual-path fallback.

## Variety strategy for the sprite WORLD (unchanged, restated)
No third-party downloads (CLAUDE.md rule 1). PixelLab generates multiple
variants per species cheaply (proven: 8 farmhouses / 9 gens) + runtime
jitter (hue/scale/flip per position seed). Tree/crop sprite batches are
the next environment work.

## Known follow-ups (session 3 → next)
- **Rig polish in progress:** side-profile face + ponytail polish were
  being refined on `src/art/rig.ts` (another agent's concurrent work this
  session).
- **Fallback cleanup later:** the sprite-character code path
  (`spriteChar.ts` recolor bands, hairstyle sheets, etc.) and its PNGs
  stay as the `CHARACTER_SPRITES_PRIMARY` fallback; some now-dead branches
  can be cleaned up in a later pass — not urgent, the fallback still works.
- **Resume ENVIRONMENT sprites** — the session-2 "what's next" order still
  holds for the world, now that characters are settled: crops & trees MIX
  batch (decision S2-10), then NPC action poses where gameplay shows them,
  then a props batch, then gap-fills, UI sprites last. See the session-2
  close-out below for the full recipe and standing generation rules.

---

# SESSION 2 (2026-07-08) — Visual Polish + Window System

**Work order:** the product owner reviewed the v1 foundation — logic is
right, but several visuals read "cheap code-drawn" (the house "like a
child drew it", the interior "a pile of code boxes", the character's
hair/hat/eyes off) and the UI must become fully draggable/resizable,
UO-classic style. Three tasks in order: (1) full window system,
(2) PixelLab sprite generation for all elements with dual-path
integration, (3) character quality gate. Same autonomy rules; same
branch `v1-foundation`.

## Session-2 status / environment findings

- Resumed on `v1-foundation` @ `6b7e32e`, tree clean, synced.
- The interrupted v1 smoke run had left two REAL bug fixes uncommitted —
  committed as `6b7e32e` (queued-action ordering in main.ts; pause-screen
  Esc-listener leak). Its temp harness files were deleted.
- **PixelLab account: ACTIVE (Tier 2 Pixel Artisan), 4,963/5,000 monthly
  generations remaining, $0.00 extra credits.** Estimated need for full
  coverage per the work order: ~1,200–1,500 generations (≈20 characters
  ×20-40 each incl. rotations/animations + ~130 static assets ×1-3 +
  retries) — **sufficient, not blocked**.
- **The style-anchor image `zoom-a-char.png` is NOT on disk** (searched
  repo-wide), and the PixelLab account holds 0 saved characters — the
  previous tests didn't leave reusable artifacts. Decision S2-1: anchor
  style via rich prompt descriptors ("Cute Fantasy" look per DECISIONS
  aesthetic: warm palette, dark outlines, readable straw hat, expressive
  eyes) and lock consistency via the account's character objects
  (create once, rotate/animate from the same character). If she still
  has zoom-a-char.png, dropping it in docs/reference/ lets a future
  session use it directly.
- **Decision S2-2: CLAUDE.md hard rule #1 amended** (art policy): art is
  code-drawn OR PixelLab-generated, dual-path mandatory (PNG when
  present, painter fallback otherwise), no third-party assets ever.
  Required so implementing subagents don't refuse sprite work against
  the old "never add image files" rule.
- Note: the work order says a sprite loader dual-path "was built in
  previous session" — it was NOT (only the rig's narrow painter
  interface was designed swap-ready). The loader gets built in Task 2's
  integration step.

## Session-2 what-was-built

- **Task 1 COMPLETE — the UO-classic window system.**
  Core (`1a27d78`): `src/ui/windows/` WindowManager — drag, 8-handle
  resize, minimize-to-dock strip, close/reopen (☰ menu), pin, z-order,
  edge snap (Alt bypasses), keep-on-screen clamp; THE GAME VIEWPORT IS
  A WINDOW on a code-drawn desktop; HUD split into clock/coins/needs/
  icon-dock windows. Persistence + presets (`d4245c7`): layout saved on
  `wildhearth-layout-v1`, presets Classic/Focus/Cozy + Reset in
  Settings, `docs/WINDOW_SYSTEM.md`. Migrations (`766fb35`, `77fcb0a`):
  backpack/skills/minimap/memory book/shop/gift chooser + dialogue/
  debug/day-summary/in-game-settings all real windows; `makePanel`
  deleted; Esc cascade defined (topmost closable → else pause).
- **Task 2 wave 1 — sprites are REAL.** (`ecf98f2`, `92f15a6`)
  `src/art/sprites.ts` loader + manifest (Vite glob), pose-level
  dual-path player bridge (`spriteChar.ts`): the PixelLab heroine
  (8-dir rotations + 6-frame walk + breathing idle, 84px canvas) walks
  Wildhearth with feet-aligned rig fallback for action poses;
  farmhouse/barn sprites with the code damage-overlays preserved
  (renovation arc intact); hearth sprite in the interior;
  `docs/PIXELLAB_ASSETS.md`. Fallback proven: game boots clean with the
  assets folder emptied.

## Session-2 decisions log
(S2-1, S2-2 in the header above.)
- **S2-3 (windows):** the desktop layout is a PREFERENCE, not game
  state — `wildhearth-layout-v1` survives New Game (UO keeps your
  desktop). The icon dock can't be closed (the reopen path must always
  exist). Pause/main-menu/exit stay overlays — they're menus, not
  workspace windows.
- **S2-4 (heroine gate):** v3 generation PASSED the hair/hat/eyes gate
  (structured straw hat, readable hair, expressive eyes, no drift
  across 8 rotations — reviewed at full size). She is the style anchor
  (character id `0f0c45b6-…`); all other characters are prompted to
  match her look.
- **S2-5 (coverage):** the sprite covers the DEFAULT female appearance;
  any customized/male character falls back to the code rig until more
  variants are generated. Palette-swap widening was deliberately NOT
  attempted (her rule: a clean fallback beats a drifty sprite).
- **S2-6 (buildings):** sprites are the REPAIRED base; the rundown
  states remain code-drawn overlays on top — one sprite serves both
  renovation states.
- **S2-7 (generation batching):** map objects auto-delete in 8h →
  download immediately; NPCs generated in batches of ~4 with a
  per-batch full-size drift review before any animation spend.

- **S2-8:** NPCs get walk animations only; their idle is the static
  rotation frame (classic RPG convention; halves animation spend). The
  heroine keeps her breathing idle.
- **S2-9 — THE SCALING DECISION (owner-triggered, see
  docs/SCALING_DECISION.md for the full evidence):** the owner froze
  generation mid-session over scaling doubts (one design per category
  = templated feel; ground read as wrong projection; variety bar
  untested). Three parallel feasibility agents ran: budget math
  (v1 bar = 575-1,547 gens of 4,712 remaining — fits 3-8x over),
  projection diagnosis (the world is DECIDEDLY non-isometric; the
  ground/code layers are correct; 4 sprites came out too oblique —
  market-stall + well must regenerate, farmhouse should, barn mild),
  live probes (batch variety PASS: 8 distinct coherent farmhouses for
  9 gens in 3 min; identity-across-states PASS: same tree across
  seasons, same wheat across growth — but at ~20 gens/state; ground
  tilesets qualified: seams fine, motif repetition bad for open
  fields). **Recommendation: Path A with a media division** — sprites
  for buildings (8-12 variants each, flat-front guardrail), characters
  (proven pipeline + recolor), props, crops/trees (gated on a cheap
  inpainting test before bulk); code stays for open ground and all
  motion/atmosphere; dual-path absolute. AWAITING OWNER GO — nothing
  generates until she confirms (or picks Path B, which stays fully
  viable: strip the manifest, keep everything else).
- **Probe overrun, owned:** the probe agent spent 114 gens vs 35
  authorized (create_object_state turned out to cost ~20, not ~1, and
  five were queued in parallel before the first posted). That price
  discovery IS the reason the inpainting test now gates the bulk run.
  Session total: 288/5,000 (5.8% of the monthly cap).
- **Conductor correction (owner directive):** supervisor stops doing
  one-at-a-time generation/implementation; every category runs as a
  parallel delegated batch with review gates. Applied from the
  feasibility check onward.

## Path-A execution log (owner approved "Path A go")

- **S2-10 (crop/tree path):** inpainting gate verdict — trees PARTIAL-PASS
  via inpainting (~1 gen, trunk holds; spot-check each), crops FAIL
  inpainting (clump layout dissolves) → **approved MIX path**: tree
  seasons via inpainting, crop stages via object-states; projected
  1,280-1,600 gens; runs as its own gated batch NEXT session (owner
  priority order puts animals before trees/crops).
- **Drift-gate scoreboard:** navy-trousers drift caught on 2 hairstyle
  bases pre-ship → regenerated with hardened wording, all 3 regens
  PASS (cropped pixel-perfect; ponytail needed one direction re-roll);
  ponytail v1 had failed server-side. All 5 hairstyles now have clean
  bases + walk + idle. Old failed character ids noted in the batch
  report; harmless to leave in the account.
- **NPC sprites SHIPPED** (`a3eb122` atlas packer + `43a7ae8` town
  faces): all 10 NPCs incl. Jonas; per-NPC scale/anchor table in the
  WORKLOG; Finn keeps a code rod overlay, Liora gets music notes;
  bundle 665KB→398KB (atlas fix), rig fallback proven two ways.
- **Building variety SHIPPED** (`c16e452`): 4 flat-front replacements
  (damage overlays re-derived for the new farmhouse art), 4 themed
  stalls, 6/8 distinct cottages (2 spare), whitewash-slate neighbor
  farmhouse, 11 spares banked under buildings/spare/ for v2.
- **Heroine fidelity SHIPPED** (`f27fcb9`): all 5 hairstyle bases
  (hat/default + bun, short, cropped, ponytail) on the player bridge +
  runtime hue-and-saturation recolor (keeps per-pixel lightness) for
  hair (6 colors) and dress/apron — the creation screen's choices now
  show on the sprite. Navy-trousers identity drift caught on 2 bases +
  a server-side failure on ponytail → 3 hardened regens, all PASS.
  Coverage is honest: female + skirted outfits + any hair style/color
  are sprite-covered; male/overalls/non-default skin fall back to the
  rig wearing her exact chosen colors (skin recolor deliberately
  excluded — it smears eyes/mouth).
- **Farmyard SHIPPED** (`25d7153`): cow, sheep, pig, hen, duck sheets
  on a shared animal bridge (batch cost 84 gens incl. retries), heights
  within ~1% of the rig's; birds get a code waddle-bob (±1px y-bob +
  tilt keyed to stride); cat + dog sheets downloaded and BANKED for the
  future Pets block. Feeding/persistence verified; bundle 434.83KB,
  no chunk warnings.
- **Docs refreshed** (`376d3f8`): ROADMAP_TO_V5 rows/estimates moved to
  the sprite pipeline + window system, GAME_OVERVIEW status tags
  flipped to two-session reality (plus two stale factual fixes),
  WORLD_MAP built-region pass.
- **T3 (character quality gate): SATISFIED.** The heroine and all 4
  hairstyle bases passed the hair/hat/eyes gate at full zoom across
  directions; the navy-trousers catches are the gate working. No "meh"
  character shipped, no drift shipped.
- **Final generation ledger (get_balance at session end): 508/5,000
  used this month — 4,492 remaining, $0 extra credits, resets
  monthly.** That 508 includes every probe, retry, and pre-session
  test. The projected crops/trees MIX batch (1,280-1,600) fits in the
  remainder ~3x over.

## Session-2 owner feedback log (live)
1. "Characters don't match the design the player defined" → coverage
   to be tightened (rig for customized looks) + 4 hairstyle bases
   generated (short/bun/ponytail/cropped, gate-passed identity with
   the hat heroine) + runtime H&S recolor plan for skin/hair/outfit.
   Integration parked by the freeze.
2. "Buildings are repetitive" → 4 distinct merchant stalls + 2 cottage
   variants + distinct neighbor farmhouse generated and gate-passed;
   batch-variety probe then proved 8-variants-per-type costs ~9 gens.
   Integration parked by the freeze.
3. "Ground reads top-down flat / not isometric" → diagnosed: ground is
   correct for the decided non-isometric direction; the offenders are
   4 oblique sprites (regeneration queued behind her go).
4. "You're the conductor, not the orchestra" → acknowledged; parallel
   category agents from here on.

## Session-2 subagent registry

| Task | Model | Outcome | Notes |
|---|---|---|---|
| Window system core (T1a) | Opus | ✅ `1a27d78`+`d4245c7` | ~341k tok; input-accuracy proof Δ=0.00px |
| Surface migrations (T1b) | Sonnet | ✅ `766fb35`+`77fcb0a` | ~589k tok; makePanel deleted, Esc cascade |
| Sprite integration (T2) | Opus | ✅ `ecf98f2`+`92f15a6` | first launch completed pre-interrupt; second run independently verified all checks |
| Wave-2 integration (T2) | Sonnet | ✅ `1365f06` | interior room+furniture, tinted stall awnings (per-pixel H&S recolor, cached), well; zero-assets fallback re-proven |
| NPC sheet-pack + integration (pre-freeze launch) | Opus | ⚠ task lost to interrupts, no commit landed | relaunched after "Path A go" — see the Path-A rows |
| Feasibility: budget math | Sonnet | ✅ report | v1 bar 575-1,547 gens = 12-32% of month; review-time is the real bottleneck |
| Feasibility: projection diagnosis | Sonnet | ✅ report | world correctly non-isometric; 4 sprites too oblique; regenerate, don't convert |
| Feasibility: scaling probes | Opus | ✅ report (⚠ 114 gens vs 35 authorized — state-cost discovery) | variety PASS, identity PASS, tilesets qualified |
| **— Path A (post-"go") —** | | | |
| Inpainting identity gate | Opus | ✅ verdict → decision S2-10 | trees PARTIAL-PASS at ~1 gen (trunk holds; spot-check each); crops FAIL (clump layout dissolves) → MIX path |
| NPC atlas + integration (relaunch) | Opus | ✅ `a3eb122`+`43a7ae8` | `scripts/packsheets.mjs` atlas packer (fixed 665KB base64 bloat → 398KB); all 10 NPCs incl. Jonas on `spriteNpc.ts` bridge |
| Building variety batch (generation) | Sonnet | ✅ gate-passed to scratchpad | flat-front regens ×4 + themed stalls + 8 cottages + neighbor farmhouse + spares, all with the camera guardrail |
| Building variety integration | Sonnet | ✅ `c16e452` | damage overlays re-derived for new farmhouse; 6/8 cottage variants wired to market; 11 spares banked under `buildings/spare/` |
| Hairstyle base animations (generation) | Sonnet | ✅ walk+idle for 4 bases | 8-slot atomic animation calls; queue-split folders merged by the packer |
| Hair-base regens (drift fix) | Sonnet | ✅ 3 bases regenerated, all PASS | navy-trousers drift ×2 + ponytail server failure → hardened "one continuous rust-red work dress" wording |
| Character fidelity integration | Opus | ✅ `f27fcb9` | 5 hairstyle sheets + measured H&S recolor bands (hair/dress/apron) + honest coverage matrix in `spriteChar.ts` |
| Farm animal batch (generation) | Sonnet | ✅ 7/7 gate-passed, 84 gens | cow/sheep/pig/hen/duck + cat/dog banked; drift review before every animation spend |
| Animal integration | Sonnet | ✅ `25d7153` | shared `spriteAnimal.ts` bridge, ~1% height match to rig, bird waddle-bob in code |
| Docs status refresh | Sonnet | ✅ `376d3f8` | ROADMAP_TO_V5 pipeline shifts + GAME_OVERVIEW/WORLD_MAP reality pass |

## Session-2 PixelLab asset ledger

| Asset | Mode/kind | Verdict | Where |
|---|---|---|---|
| Heroine (default ♀) | character v3 + walk + idle templates | ✅ PASS (gate S2-4) | `src/assets/pixellab/characters/heroine/` |
| Farmhouse 192×176 | map object | ✅ PASS (huge upgrade) | `buildings/farmhouse.png` |
| Barn 208×176 | map object | ✅ in game | `buildings/barn.png` |
| Hearth 64×80 | map object | ✅ in game | `interior/hearth.png` |
| Room backdrop 320×240 | map object | ✅ PASS — interior transformed | `interior/room-backdrop.png` |
| Basin, chair+crate | map objects | ✅ PASS | `interior/…` |
| Bed | map object ×2 (1st looked like a bench → REJECTED, retry passed) | ✅ PASS | `interior/bed.png` |
| Market stall (awning recolored per stall) | map object | ✅ PASS | `buildings/market-stall.png` |
| Well | map object | ✅ PASS | `buildings/well.png` |
| Flat-front regens: farmhouse, barn, market-stall, well | map objects | ✅ SHIPPED `c16e452` — replace the 4 oblique originals above at the same paths | `buildings/…` |
| Cottages 01–08 (batch variety) | map objects | ✅ SHIPPED `c16e452` (variants 1-5,7 wired to market; 6,8 spare) | `buildings/cottage-0*.png` |
| Themed stalls (fish, produce, general, empty) + neighbor farmhouse | map objects | ✅ SHIPPED `c16e452`; +11 banked variants | `buildings/…` + `buildings/spare/` |
| All 10 NPCs (Maren, Tobin, Sera, Liora, Henrik, Petra, Bram, Ada, Finn, Jonas) | character v3 + walk (idle = static rotation per S2-8) | ✅ drift-gated + SHIPPED `43a7ae8` | `characters/<npc>.sheet.png` |
| Heroine hairstyle bases ×4 (bun, short, cropped, ponytail) | character v3 + walk + idle | ✅ SHIPPED `f27fcb9` (2 trouser-drifts + 1 server fail caught → regens PASS) | `characters/heroine-<style>.sheet.png` |
| Cow, sheep, pig, hen, duck | characters/objects + walk | ✅ drift-gated + SHIPPED `25d7153` | `animals/<kind>.sheet.png` |
| Cat, dog | character v3 + walk | ✅ generated + gate-passed, BANKED for the Pets block | `animals/{cat,dog}.sheet.png` |

**Month ledger at session end (live `get_balance`): 508/5,000
generations used — 4,492 remaining, $0 extra credits, resets
monthly.** Character IDs, anchors, and the per-asset pipeline how-to
live in `docs/PIXELLAB_ASSETS.md` (maintained by every integration
agent).

## Session-2 close-out — NEXT SESSION STARTS HERE

**Everything in the session-2 work order shipped, committed with
WORKLOG entries, and pushed to `v1-foundation` (latest `376d3f8`;
master and autorun branches untouched).** T1 window system ✅. T2
sprite world ✅ — heroine + 5 hairstyles with runtime recolor, 10
NPCs, building variety, interior, farmyard, all dual-path (the game
boots complete with the assets folder emptied). T3 character gate ✅
satisfied. Drift scoreboard: 4 catches (bench-bed, navy-trousers ×2,
the 4-oblique-sprites class), **0 drift shipped**. Spend 508/5,000;
4,492 remain this month.

**How to continue (the owner's priority order — trees/crops are
next):**

1. `git checkout v1-foundation && git pull`, `npm install && npm run
   dev` — boot to the main menu, New Game, walk farm + market +
   interior; try dragging/minimizing windows.
2. Read this section + the Path-A execution log above, then
   `docs/PIXELLAB_ASSETS.md` (pipeline how-to, style anchors,
   character IDs) and `docs/SCALING_DECISION.md` (the media division:
   what is sprite-sourced vs deliberately code-drawn).
3. **Crops & trees MIX batch** (decision S2-10; projected 1,280-1,600
   gens — fits the remaining month ~3x over):
   - TREES: generate each base tree as a map object (flat-front
     guardrail wording), then seasons via inpainting edits over the
     base image — the trunk/silhouette holds identity at ~1 gen per
     season. Full-size spot-check EVERY inpainted season; two-strike
     retry rule.
   - CROPS: inpainting FAILS for crops (clump layout dissolves) — use
     `create_object_state` (~20 gens per state). Cost-check after the
     FIRST call; run as one gated category batch.
   - Variety bar (DECISIONS.md): 20 crop species × 4 stages, 20
     trees/bushes × 3 seasons. Integrate dual-path over the existing
     crop/tree painters.
4. **NPC action poses** where gameplay actually shows them (~8
   gens/pose/NPC via template animations) — Finn fishing and Liora
   performing first.
5. **Props batch** — fences, crates, lamps, signage, flowers: ~1 gen
   each, flat-front guardrail, batch → gate → integrate.
6. **Gap fills**: wire the 2 spare cottage variants when new zones
   open; male sprite bases + non-skirt outfits (rig covers them today,
   wearing the player's exact colors); body-build variation
   (rig-only today).
7. **UI sprites LAST** (her explicit ordering).

**Standing generation rules (hard-won, do not relearn):** flat-front
camera guardrail on every object prompt ("high top-down, straight-on
front view, no side walls"); download map objects immediately (8h
auto-delete); the account has a 10-concurrent-job cap — 8-slot
animation calls are atomic, retry patiently on "need 8 job slots";
full-size multi-direction drift review BEFORE any animation spend;
cost-check after the first call of any new tool kind (the 114-gen
probe lesson); one category = one delegated agent owning
generate→download→review→integrate; dual-path is absolute; every
batch updates the PIXELLAB_ASSETS.md ledger and lands as one commit +
WORKLOG entry.

**Known rough edges (also under WORKLOG Follow-ups):** `spare/` PNGs
are eagerly fetched by the manifest glob (exclude later if it
matters); body build not reflected in sprites; one dress-style preset
is sprite-covered (others recolor onto it); `mergeSplitAnimations`
relies on a job-id-suffix regex; festival day formula pinned to
`min(15, ceil(DAYS_PER_SEASON/2))`.

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

### Part D — AI integration (complete)
- **AI foundation** (`4877c31`) — `src/systems/ai/`: provider (browser-
  direct Anthropic via plain fetch + mock `?aimock` + none), monthly
  budget ledger, per-NPC/global rate limits, persisted LRU cache,
  closed NpcAction schema + strict validator, `createAiCtx` facade,
  depth dial (haiku→sonnet→opus tiers), Settings "Test connection"
  live. Game byte-identical with AI off.
- **AI features I** (`c4242c0`) — authored backstory seeds for all 10
  NPCs + generate-once AI backstories ("Tell me about yourself"
  choice), dialogue variation through the `renderNpcLine` seam
  (prefetch-on-proximity, never blocks), daily NPC inner thoughts
  ("What's on your mind?" + ambient bubbles; template fallbacks),
  persisted anti-repetition store.
- **AI features II** (`a30ca7e`) — world-event narration (enriched
  follow-up toast; canonical text untouched), plain-code play-pattern
  arc tracker feeding prompts, quest-generation validated STUB (debug
  panel only — v2 preview; no quest system in v1), improvement-notes
  observer (token-free, default off, debug panel).

### Part B — visual foundation (complete)
- **Day/night + weather visuals** (`a5f6ca5`) — continuous time-of-day
  color grade; rain streaks, storm lightning + dark beats, drifting fog
  banks, per-weather ground tints; interior milder; menu vista exempt.
- **Parallax + particles** (`e27d99d`) — pre-baked northern skyline
  band at 0.3x scroll (distant mountains hint at the future mine);
  pooled ambient particles (petals/motes/fireflies/leaves/snow) +
  `burst()` wired to catch/harvest/skill-gain.
- **Cast shadows + audit** (`05da090`) — shared `castShadow()` on
  buildings/trees/dock/rig (sun upper-left, length varies with time,
  fades at night); outline+ellipse audit swept all session entities
  (one gap fixed); canopies/ground texture confirmed across regions.

### Part C — content library (complete)
- **Crops/trees/decorations** (`5f77289`) — 18 crops (winter 1→4,
  premium floor-50/60 entries, growth-shape silhouettes), 4 tree
  species × 4 seasons (pine evergreen, winter bare-branch), bushes
  season-tinted, ambient scatter 3→24 kinds region-gated.
- **Animals/outfits/tools** (`c924e5a`) — pig/sheep/duck purchasable
  (35/90/110, barn-gated, feedable), rabbit/cat/dog painters ready for
  the Pets block, 10 outfit styles wired into creation (+5 NPCs
  re-flavored), 15 forward tool/accessory icons.

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
| AI foundation (D) | Opus | ✅ committed `4877c31` | ~346k tok, ~18 min; 37/37 harness checks |
| AI features I+II (D) | Opus | ✅ 2 commits `c4242c0`/`a30ca7e` | ~333k tok, ~41 min; 47 checks AI-off + `?aimock` |
| Visual atmosphere (B 1-3,7-10) | Sonnet | ✅ 3 commits `a5f6ca5`/`e27d99d`/`05da090` | ~530k tok, ~66 min; pixel-sampled verification |
| Content library (C) | Sonnet | ✅ 2 commits `5f77289`/`c924e5a` | ~530k tok, ~65 min; icon gallery + season screenshots reviewed |
| ROADMAP_TO_V5.md | Opus | ✅ delivered | ~135k tok; judgment calls in decision #8 |
| AI_ARCHITECTURE.md | Opus | ✅ delivered | ~273k tok; judgment calls in decision #9 |
| PROPOSALS.md | Sonnet | ✅ delivered | ~101k tok; 22 proposals |

## Files reorganized

(None yet.)

## Known bugs / rough edges

(None yet this session.)

## Open questions for owner

- **OWNER PLEASE CONFIRM:** starting coins = 50 (kept). See Doc sync #2.

## Session status (2026-07-07, post-resume)

**ALL FIVE FABLE_PROMPT PARTS (A, B, C, D, E) ARE COMPLETE** — every
block committed with a WORKLOG entry, verified in-browser, and pushed
to `v1-foundation`. The v1 foundation defined by FABLE_PROMPT.md is
done. Per the product owner's standing instruction ("continue running
on next version according to your plan"), the session continues into
v2 work per docs/ROADMAP_TO_V5.md: (1) a whole-game integration smoke +
docs status refresh, then v2 blocks in value/dependency order — real
sell menu, customers + reputation, parchment minimap + fast travel,
the Riverside Fisherwoman.

## How to continue (session-1 original — SUPERSEDED by "Session-2 close-out" above)

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
