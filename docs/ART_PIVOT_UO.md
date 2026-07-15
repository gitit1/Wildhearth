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
  PIXELLAB_ASSETS.md and freeze.
- **W1 — Ground first (~40–80 gens):** tiles_pro terrain set in the new
  palette (grass/soil/paths/water/plaza/sand), Bayer edge-blend retained;
  day/night grade + weather tints retuned to the moody range.
- **W2 — Buildings & world objects (~150–250 gens):** all buildings,
  trees ×seasons, props, rocks, festival kit — each with its grounding
  treatment. Anti-repetition variants as today.
- **W3 — Characters (~1,570 gens):** THE deferred G1 rebuild, executed
  ONCE in the new style: face-locked heroine matrix (Medium), realistic
  proportions, keyed-hair recolor kept; then the 10 NPCs + portraits.
- **W4 — Animals, crops, remaining props (~150–250 gens);** item icons
  re-evaluated last (small/neutral — restyle only if they clash).
- **W5 — Sweep:** zero-PNG fallback still boots (dual-path law unchanged),
  screenshot tour, hub update.

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
