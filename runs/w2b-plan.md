# W2b — nature/props/furniture + fidelity match. Run plan & progress

Branch v1-foundation. ONE commit at end. Balance at start: **6762** (Tier 3). Hard cap ≤130 gens.

## Key finding
Dual-path wiring ALREADY EXISTS. Current trees/props/foliage/interior PNGs are
COZY-ERA (pre-pivot Jul10-11) — bright cartoon, clash with UO buildings/ground.
Job = regenerate in UO-mood + drop in SAME filenames (drop-in like W2a). Code
wiring mostly exists; re-measure anchors/scales after new PNGs land.

Asset folders (all live, dual-path):
- trees/  oak-{spring,summer,autumn,winter}, birch-{...}, pine-base, pine-winter (10)
- props/  barrel crate sack hay-bale firewood wheelbarrow cart signpost scarecrow
          birdhouse bench well-bucket bucket busk-sign flower-pot lantern flower-bed-soil ...
- foliage/ bush bush-pink bush-white berry-bush flowers-{mixed,red,yellow,purple} fern grass-tuft ...
- interior/ hearth(anchor,keep) bed basin chair-crate room-backdrop  (chair/table/counter/nightstand/rug code-only)
- buildings/ (Part 0 pixel-grid unification target)

## Wiring facts
- Trees: props.ts drawTree -> treeSpriteId(species,season) -> trees/<s>-<season>.
  TREE_ANCHOR_DEFAULT {cx:64,foot:151} (128x160). SPRITE_TREE_SCALE=0.55 (=> ~2u; law wants 3-4.5u -> RAISE).
  Per-tree flip/scale jitter already gives variety. Stump = drawStump (code, keep, retune to new trunks).
- Props: drawProp auto-anchors (spriteBaseAnchor), SPRITE_PROP_SCALE=0.46 default + per-prop scale override.
  Placement in zones.ts WORLD_PROPS. Rocks: only scatter foliage/mossy-rock today -> ADD boulder props.
- Foliage: scatter.ts + drawBush. BUSH_VARIANTS. flower-bed blooms via foliage/flowers-<family>.
- Interior: interior.ts PAINTERS by kind. Only hearth/basin/bed have sprites. ADD sprite path for
  chair/table/counter/nightstand/rug/crateTable. HEARTH/BASIN/BED_SHEET anchors in interior.ts.

## Part 0 (owner top complaint) — 0 gens
0.1 Pixel-grid unification: resample each building PNG by its SPRITE_*_SCALE (NN), set scale->1.0.
    Rescale hardcoded anchors (FARMHOUSE_SHEET/NEIGHBOR/BARN/STALL/WELL, COTTAGE_SPRITES,STALL_THEMES),
    BUILDING_ROOFLINE, damage-overlay sprite-px coords (farmhouse x0.95, barn x1.18). Inn already 1.0.
    Script scripts/pixel-grid-unify.mjs. VERIFY rundown farmhouse+barn + closeup.
0.2 Ground micro-texture: normalize.mjs did flatten(micro x1.0)/furrow(res x0.65). Committed tiles near-flat.
    Sources rich in scratchpad/ground-prod/. Restore micro (macro-preserving boost). Script scripts/ground-microtexture.mjs.

## Generation agents (parallel, staging to scratchpad/w2b/<cat>/, montage, transparency-assert)
- A Trees (cap 22)  - B Rocks+Props (cap 34, reuse scratchpad/uo-w0/assets where good)
- C Foliage (cap 16) - D Interior furniture (cap 18)

## Progress
- [ ] Part 0.1  - [ ] Part 0.2  - [ ] Trees  - [ ] Rocks  - [ ] Props  - [ ] Foliage  - [ ] Interior
- [ ] verify (build/smoke/save/farmstart/zero-png) - [ ] screenshots - [ ] WORKLOG - [ ] commit+push
