# SCALING DECISION — can PixelLab carry Wildhearth's variety bar?

**Date:** 2026-07-08 (session 2). **Asked by:** the product owner, after
seeing one-design-per-category sprites land ("every fish stall looks
identical — this is exactly the templated feel the game must avoid").
**Question:** can PixelLab scale to DECISIONS.md's variety principle
(20 varieties per collection at v1, 50+ at v5, no two neighbors alike),
within budget, on ground that reads correctly — or should the game
return to code-drawn art with a hard polish-and-motion investment?

**Method:** three parallel feasibility agents — (1) budget math against
the v1/v5 targets using measured real costs, (2) a projection/ground
diagnosis with live screenshots and doc archaeology, (3) live probes:
batch-variety, identity-preserving states, ground tilesets. Full
reports preserved in the session scratchpad (`feasibility-budget.md`,
`feasibility-projection.md`, `feasibility-probes.md` + images); key
numbers reproduced here so this doc stands alone.

---

## Finding 1 — Budget: variety is cheap; the subscription fits v1 ~3-8x over

Measured real costs (subscription generations): map object = **1**,
character (8 rotations, v3) = **2**, template animation (8 directions)
= **8**, tileset = **3**, object STATE (same-object variant) = **~20**.

| v1 target (owner's bar) | Images | Cost (gens) |
|---|---|---|
| 20 crops × 4 growth stages | 80 | 80 (inpainting path, untested) … 1,600 (state path, proven) |
| 20 fish species | 20 | ~20 |
| 20 trees/bushes × 3 seasons | 60 | 60 … 1,200 (same two paths) |
| 10 NPCs × extra action poses | 2-6 poses each | 160-480 (8/pose/NPC) |
| 8 farmhouses + 8 cottages + 12 stalls | ~30 | ~30 (PROVEN: 9 gens bought 8 distinct farmhouses in 3 min) |
| Props / ambient / flowers | 60-80 | 60-80 |
| Ground tilesets | 10-20 | 30-60 (3/tileset) |
| **Total v1 (with 25-30% retry overlay)** | ~350-450 | **575-1,547** |

Current account: Tier-2 subscription, **5,000 generations/month,
~4,712 remaining right now, resets monthly, $0 extra credits needed.**
Even the worst-case v1 number is under a third of one month. v5 scale
(50+/collection, 50 NPCs) = 2,400-5,900 — fits one-to-two fresh months.
**Credits are NOT the constraint and the owner does not need to top up
for v1.**

The REAL cost is review time: every image must be eyeballed for drift/
quality (her standing rule: an unnoticed drift is worse than a failed
verdict). Estimated 3-15 hours of sequential review for the full v1
bar — planned below as batched per-category gates, not one marathon.

## Finding 2 — The "isometric ground" question: the ground is right; 4 sprites are wrong

The world is **deliberately not isometric** — that decision is recorded
in four places (DECISIONS.md "Not: true isometric"; VISION.md art
direction + non-goals; ROADMAP_EXPANSION; CLAUDE.md history — an early
isometric detour was tried and abandoned). The camera is a pure flat 2D
transform; the ground, code props, and code buildings are all
consistently flat/front-elevation — the Stardew-style "flat ground +
3/4 front-facing objects" the Cute Fantasy references use.

What the owner's eye caught is real, but it's the opposite direction:
**four PixelLab sprites came out too oblique** for the flat world —
market-stall and well genuinely isometric-ish (visible side faces),
farmhouse moderately, barn mildly — despite identical view parameters
(the "low top-down" view is loosely honored per generation). A control
test (blocking those 4 PNGs so code fallbacks render) restores a fully
consistent scene.

**Fix:** regenerate those 2-4 sprites with flat-front guardrailed
prompts ("front face only, no side walls visible", view "high
top-down"), and make that guardrail the standard for every future
object generation. Cost: a handful of generations + re-measured
anchors. Converting the world to isometric instead would touch ~230
files and reverse a four-doc decision — rejected.

## Finding 3 — The probes: variety PASS, identity PASS, ground QUALIFIED

1. **Batch variety: PASS.** 8 farmhouse variants along explicit axes
   (roof × wall × feature) in ~3 minutes for 9 generations — all
   distinct from each other AND coherent as one village. Even a
   4-buildings-in-one-image call came out clean. The "no two neighbors
   alike" bar costs ~1 gen + ~25s per variant. This kills the
   "one design per category" failure mode outright.
2. **Identity-preserving states: PASS on identity, expensive on the
   proven path.** A tree kept its exact trunk/silhouette across
   summer/autumn/winter; wheat kept its soil strip and clump positions
   across seedling/half/ripe. So crop stages and tree seasons ARE
   achievable without drift — but at ~20 gens/state the full 140-image
   crop+tree library ≈ 2,800 gens (~56% of a month). A ~1-gen
   alternative (map-object inpainting over the base image) exists and
   is UNTESTED — it gets a 5-10 gen test before any bulk run.
3. **Ground tilesets: QUALIFIED PASS.** Flat top-down (correct for this
   game), grass↔dirt Wang transitions tile seamlessly — but a single
   grass tile repeats a visible motif on large fields and the palette
   runs limier than the game's muted warmth. Verdict: good for paths/
   edges/transitions; NOT yet a replacement for large open ground.

**Probe accounting (honest):** the probe agent was authorized 35
generations and spent **114** — it queued five state-generations in
parallel before the first one's true cost (~20, not ~1) posted. The
overrun is how we learned the state price, and it's why the inpainting
test comes before any bulk state run. Total session spend either way:
288/5,000 (5.8% of the month).

---

## THE DECISION — Path A, with a defined division of media

PixelLab **can** scale to the v1 variety bar in budget and without
drift — the two probes that could have killed it (variety-at-scale,
identity-across-states) both passed. We continue — with shifted
tactics exactly as the owner demanded, plus two honest exclusions
where code remains the better medium:

**Sprite-sourced (PixelLab):**
- Buildings & landmarks — batch-generated variety, minimum counts
  before anything ships: 8 farmhouse, 8 cottage, 12 stall variants;
  every future generation carries the flat-front camera guardrail;
  the 4 oblique sprites get regenerated first.
- Characters — the proven create→rotate→template-animate pipeline
  (heroine + 5 hairstyle bases + 10 NPCs + cow already exist);
  runtime H&S recolor covers skin/hair/outfit color choices.
- Furniture, props, one-off decorations.
- Crops & trees — via the stateful pipeline, GATED on the cheap
  inpainting test: if ~1-gen inpainting preserves identity, bulk-run;
  if not, the 20-gen path still fits v1 (56% of one month) and runs
  as a planned single-category batch.
- Path/edge ground transitions (Wang tiles) — where the tileset probe
  shined.

**Code-drawn (kept deliberately, not as a fallback):**
- Large open GROUND (grass/dirt/water fields) — correct projection,
  infinite non-repeating procedural variation, zero motif lattice;
  gets a palette-harmonization pass toward the sprite assets.
- Motion & atmosphere — weather visuals, particles, day/night grading,
  sway/shimmer (already built; this is the "aliveness" Path B wanted,
  and we keep it regardless).
- The dual-path rule stays absolute: every sprite keeps its code
  fallback; the game boots complete with zero PNGs.

**Execution shape (conductor mode):** one subagent per category owning
generate→download→review→integrate for its category, run in parallel;
the supervisor reviews per-batch sample gates + drift spot-checks and
keeps the ledger. Review is the bottleneck, so categories land as
gated batches (buildings → crops/trees → NPC poses → props), each
committed separately with WORKLOG entries.

## Frozen pending the owner's go-ahead

Per her instruction, NOTHING generates until she confirms this
direction. Currently parked: Jonas's walk animation (his creation is
done), integration of the 4 finished hairstyle bases, the 4-sprite
flat-front regeneration, the inpainting test, and all category
batches. The pre-freeze NPC-integration agent (already-generated
assets only, fully reversible dual-path) was allowed to land.

**If she prefers Path B despite the passes:** it remains first-class —
strip the manifest (the game already runs complete without sprites),
keep the window system and all session logic, and redirect the
category agents to painter-variant + motion work. Nothing done this
session blocks it.
