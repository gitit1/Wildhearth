# ART PIVOT — the UO-mood full restyle (owner decision, 2026-07-15)

**The decision, in the owner's words:** the current cozy/bright look "is not
the graphics I wanted — I want something more similar to Ultima Online."
And the root diagnosis, hers: **"everything looks detached — like you PLACED
the house, PLACED the rock; it doesn't read as one realistic screen."**
Verdict after the 4-gen style probe
(https://claude.ai/code/artifact/a43ca535-3325-4b77-8277-d3a876bd74b8):
**FULL pivot.**

This document is the execution program. It supersedes the "cozy" style
anchors in `PIXELLAB_ASSETS.md` (the pipeline/workflow there still applies);
`DECISIONS.md` carries the decision record.

## Status

**W0 gate: PASSED (2026-07-16/17).** The W0 mock was rejected on first pass
("still looks detached... everything looks top-down") — root-caused and
fixed in two follow-up passes, not a re-roll of the same recipe:
- **W0.5 — projection fix.** Synthesized `docs/COMPOSITION_RULES.md` (the
  25-rule constitution: one-camera projection law + scene grammar) from a UO
  rendering deep-dive + a Sims-composition report, regenerated the worst
  offenders (farmhouse's isometric corner view, the barn's dead-frontal/
  roof-ratio mismatch) against the new mandatory view clause (see
  `PIXELLAB_ASSETS.md` "UO-mood era" → "WINNING VIEW RECIPE"), and rebuilt
  the mock composer around path-first layout + functional clusters.
- **W0.6 — grounding pass.** Fixed the grounding-apron/terrain-clash audit
  findings (see the W2 constraint below) and the `create_map_object`
  opaque-background failure mode (`PIXELLAB_ASSETS.md` failure mode #7).

Owner verdict on the resulting mock: **"כן זה כבר יותר הכיוון"** ("yes, this
is already more the direction") — approved to proceed into W1. See
`docs/DECISIONS.md`'s dated 2026-07-16/17 entries for the full decision
record. The waves below run without further asks per the "Standing rules"
section, with the scope additions recorded here.

## The target look (locked by the probe)

- **Palette:** muted, earthy, desaturated — deep greens, browns, greys;
  never candy-bright.
- **Proportions:** realistic adult bodies (NOT chibi/big-head).
- **Texture:** gritty, hand-painted feel; detailed shading.
- **Outlines: NONE** (`lineless`) — cartoon outlines are the single biggest
  "pasted-on" tell.
- **Lighting:** moody; objects carry believable self-shadow; the day/night
  grade gets retuned darker.
- **Camera: UNCHANGED** — top-down (true isometric is a recorded non-goal
  and an engine rewrite). UO's soul here is palette+texture+light.

## The "detached objects" problem — three fixes, all first-class

Style alone won't fix "you placed the house." Three integration mechanisms
ship WITH the restyle:
1. **Shared light & palette** — terrain and objects generated against the
   same anchors so nothing glows against its ground.
2. **Grounding aprons** — buildings/trees/rocks get a baked base apron
   (trampled dirt / grass tufts creeping over the footprint) OR a runtime
   base-blend decal (dithered ground-tint under each sprite base, same
   Bayer machinery as the terrain edges). Probe both, pick per category.
3. **Contact shadows** — the existing `castShadow()` retuned: tighter,
   darker at the base, longer/softer with the sun; objects must feel
   WEIGHTED.

## Waves (each = agent-owned block(s), committed + verified per the
executor contract in EXECUTION_PLAN_V5.md §0)

- **W0 — Style bible (~15–25 gens, scratchpad-only until sign-off):**
  calibrate the exact prompt anchors on 6–8 representative objects
  (farmhouse, barn, cottage, tree, rock, well, fence, woman), compose ONE
  full mock screen (new ground + new objects + new character), owner
  signs off on the composed SCREEN — then the anchors get written into
  PIXELLAB_ASSETS.md and freeze. **PASSED — see "Status" above.**
- **W1 — Ground first (~40–80 gens):** tiles_pro terrain set in the new
  palette (grass/soil/paths/water/plaza/sand), Bayer edge-blend retained;
  day/night grade + weather tints retuned to the moody range. **W1 also
  owns:** restyling the baked ambient ground-scatter — the poppies, clover,
  and stones currently painted as smooth vector shapes must become chunky
  pixel-art to match everything sitting on top of them (the everything-one-
  pixel-medium rule, `DECISIONS.md`) — and cleaning up the dark-bar soil
  artifacts found in the W0.6 grounding audit.
- **W2 — Buildings & world objects (~150–250 gens):** all buildings,
  trees ×seasons, props, rocks, festival kit — each with its grounding
  treatment. Anti-repetition variants as today. **W2 constraints (added
  post-W0):**
  - Every **enterable** building must be generated so a roof/facade layer
    can be hidden at runtime for Sims-style interiors (owner requirement —
    see `docs/DECISIONS.md`'s interiors entry) — plan the generation (or a
    layered/state-based follow-up pass) so this is possible, not something
    that has to be re-shot later.
  - Every building's **grounding apron must match the ground it actually
    sits on** — the W0.6 audit found cottages with a green-grass baked apron
    pasted onto cobble-plaza ground. Buildings are clean-cut + runtime
    base-blend decal (see `PIXELLAB_ASSETS.md`'s grounding split) for
    exactly this reason; audit every building placement against its zone's
    actual ground before shipping.
  - **Interior furniture sprites join W2** (basin, bed, chair — the pieces
    already sprite-sourced in the cozy era) — regenerate them in the UO-mood
    style so an interior doesn't mix eras with its exterior.
- **W3 — Characters (~1,570 gens):** THE deferred G1 rebuild, executed
  ONCE in the new style: face-locked heroine matrix (Medium), realistic
  proportions, keyed-hair recolor kept; then the 10 NPCs + portraits.
  **W3 requirement — REAL frame animations, not code bobs:** every player
  action (wash, sit-down/seated/stand-up, sleep, cook, chop, fish, hoe,
  forage, busk, talk, eat, drink) ships with a real generated animation via
  `animate_character`/`create_character_state` — the current GF-1 code bobs
  are placeholders, not the shipped feel (see `DECISIONS.md`'s
  REAL-ANIMATIONS LAW: an action without a real animation is an incomplete
  feature). **W3 planning must solve the matrix×actions cost explosion
  BEFORE generating anything** — 50 combos × ~13 actions at a naive
  per-combo generation cost is not viable; the planned mitigation is
  layering (animate the base bodies once per action, keep hair as a
  recolored STATIC overlay per the existing keyed-purple mechanism, so an
  action's animation cost is paid once per body, not once per full combo).
- **W4 — Animals, crops, remaining props (~150–250 gens);** item icons
  re-evaluated last (small/neutral — restyle only if they clash).
- **W5 — Sweep:** zero-PNG fallback still boots (dual-path law unchanged),
  screenshot tour, hub update.
- **W-UI (~20–40 gens) — professional gump-language UI skin:** the owner's
  bar is a real UO gump side-by-side with ours, and today's menus read
  "cheap" against it. `create_ui_asset` for window frames, taskbar, buttons,
  and slots, all in the muted UO-mood style; a real typography hierarchy;
  one consistent icon set replacing the current emoji icons throughout the
  HUD/windows. Sits alongside (does not block) the HUD direction work in
  `DECISIONS.md` (Proposal A) — this wave is the visual skin, not the
  layout.

Budget envelope: **~2,000–2,500 gens** of the 7,027 available. Every wave
keeps the game runnable and old saves loading; sprites swap in-place via
the manifest (ids unchanged where possible).

## Standing rules during the pivot

- NO new generations in the old cozy style, anywhere.
- The dual-path law (CLAUDE.md hard rule 1) is untouched — painters stay
  the zero-PNG fallback.
- Old-style PNGs stay in place until their replacement wave lands (the
  game never mixes eras within one category on screen — swap per category,
  atomically per commit).
- W0's composed mock screen is the ONLY owner gate inside the program;
  after her sign-off the waves run without further asks.
