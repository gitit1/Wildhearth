# Wildhearth — COMPOSITION & PROJECTION RULES (the 25-rule constitution)

Synthesized 2026-07-15 from two research reports (a UO rendering deep-dive;
a Sims-believability + top-down scene-grammar report), in response to the
owner's rejection of the W0 art-pivot mock: **"still looks detached — like
you just placed objects, no logical order, and everything looks top-down."**

**Scope — these rules are BINDING for:**
- every world-art generation (PixelLab prompts — paired with the per-object
  style anchors in `docs/PIXELLAB_ASSETS.md`'s "UO-mood era" section),
- every mock/composed-screen assembly,
- zone layout changes (`src/world/zones.ts`),
- **and interior furniture placement** — the hearth-on-window bug that
  prompted this doc's Interiors addendum below was exactly a rule violation,
  just indoors instead of outdoors.

Root causes found in the W0 mock (why these rules exist):
- **Mixed cameras** — the farmhouse was drawn as an isometric corner-view
  miniature, the barn dead-frontal, the ground flat plan. Three projections
  on one screen reads as a collage, not a place.
- **Zero scene grammar** — two fence segments enclosing nothing, a smeared
  path connecting nothing to nothing, buildings facing random directions,
  two symmetric bookend trees, no wear, no functional clusters.
- **Ground patchwork** — variant tiles too frequent and too contrasty; hard
  seams, no transitions.

---

## PART 1 — Projection law (from the UO report)

UO is NOT isometric. Its ground is un-foreshortened top-down plan art
(44×44 diamonds = square tiles rotated 45°, zero foreshortening — "military
projection"); its verticals are drawn at FULL height at one fixed implied
camera. Stardew/ALTTP are the identical recipe at yaw 0°. Wildhearth's
square-grid engine is therefore ALREADY structurally correct. The rules:

1. **ONE implied camera for every vertical object: pitch ≈45°, yaw 0°.**
   Viewer is due south and 45° above. NEVER a corner/diagonal/isometric view
   (no diamond bases, no two-facade views), NEVER a dead-frontal side view.
2. **Buildings: full SOUTH facade + a clear roof strip. Target 55–65%
   facade / 35–45% roof** (one-story). Roof slopes keep their front-on
   angles (uniformity beats realism). ALL doors, signs, steps, porches on
   the south face; blind wall to the north.
3. **Ground stays pure plan** (straight top-down, no perspective inside the
   tile). This is what UO itself does — do not "3D-ify" ground.
4. **Bottom-center anchoring**: an object's contact line is the bottom edge
   of its footprint; it extends upward and overlaps what's behind (y depth
   sort — already our model).
5. **One baked light — sun upper-left — identical in every sprite.** Classic
   UO has zero dynamic shadows and coheres anyway. One soft uniform contact
   ellipse per object, same opacity, same offset everywhere.
6. **No hard terrain seams, ever.** Every touching terrain pair gets a
   blended transition (our Bayer dither = UO's hand-authored transition
   tiles). Wear/mud edges fade over 1–2 tiles.
7. **Cheated flat objects (rug, well mouth) never sit adjacent to strongly
   angled ones** — separate opposing perspectives (the ALTTP spacing rule).
8. **Palette via ramps** (UO hues = our keyed-purple recolor, generalized).
   Master palette stays the muted style-bible set (`docs/PIXELLAB_ASSETS.md`
   "UO-mood era").

## PART 2 — Scene grammar (from the Sims/composition report)

Compose in this ORDER — infrastructure first, dressing last:

**Circulation first**
9. Road/path placed FIRST; buildings then orient to it — every door faces
   the path, connects within 1 tile. Paths link only meaningful endpoints
   (door↔gate, door↔well, gate↔field); no dead-ends in open grass.
10. Constant path width (1 tile foot / 2 cart), gentle economical curves
    (offset 1 tile every 3–5 tiles), widening into a 2–3 tile apron at
    doors, gates, and the well.
11. WEAR where feet concentrate: trampled bare dirt at every doorstep and
    gate mouth, a mud ring around the well/trough, thinning grass along
    path edges — always faded, never hard-cut.

**Enclosure**
12. A fence run must close a loop OR end at a wall/water/gate post. A fence
    that pens nothing is FORBIDDEN. Every enclosure gets exactly one gate,
    with worn ground through it on both sides.
13. Parcel formula (UO farm grammar): **anchor building + enclosure + work
    surface + profession prop-cluster.** Farm = house (south door) +
    rail-fenced field/pen with gate + tilled rows + hay/stable cluster at
    the fence corner.
14. Every building owns its doorstep: 2–4 tiles of use-signs at the door
    (step stone, barrel/crate against the wall, wear). Untouched grass at a
    door = reads abandoned. Vary building setbacks from the road 1–2 tiles;
    never a perfect parade line.

**Functional clusters (the Sims law: objects advertise; companions co-locate)**
15. No work object stands alone — place its full toolchain adjacent, in
    workflow order: woodpile+stump+axe(+chips); well+bucket+trough;
    garden+scarecrow+watering can; hay+pen+trough.
16. Inside a cluster: tight (0–1 tiles, may touch), oriented toward each
    other. BETWEEN clusters: 4–8 tiles of calm ground. Clusters sit where
    the workflow demands (woodpile near house+trees; trough inside the pen).
17. 2–3 clutter grace notes on the traffic lines (a dropped log between
    woodpile and door, a bucket halfway to the well) — clutter implies
    motion.

**Vegetation & breath**
18. Trees CLUSTER (3–7, staggered, canopies overlapping, odd counts, size
    variety, partially off-screen so the forest continues) — never even
    rows, never two symmetric bookends. 1–2 stragglers bleed toward open
    ground.
19. Undergrowth follows habitat: dense at forest edges/fence lines/building
    shadows, absent on paths and work aprons. No uniform salt-and-pepper.
20. ≥30% of the screen stays calm low-texture ground. Busy always sits next
    to quiet.

**Focal hierarchy**
21. ONE focal point per screen (the farmhouse), off-center (rule of
    thirds), highest detail; edges get the least. The path leads the eye
    from the screen's entry to the focal point; tree masses and fences
    frame, never wall off the view.
22. Unique/asymmetric sprites are reserved for focal/story moments;
    anything repeated must tolerate repetition.

**Ground discipline (fixes the W0 patchwork)**
23. Plain tile dominance ≥85%; variants sparse and LOW-contrast (value
    jitter ×0.97–1.03); transitions blended per rule 6. No giant dark
    variant rectangles.
24. One global time-of-day grade + vignette over the finished screen — the
    single biggest "one photograph" move.

**Final audit — every object answers two questions**
25. "What activity does this advertise?" and "How did it get here, who uses
    it, coming from where?" No answer → move it next to its answer or
    delete it.

---

## Interiors addendum — the same grammar applies indoors

Furniture placement inside a building follows the exact same scene grammar
as outdoor world-art — the hearth-on-window bug (a hearth generated/placed
overlapping the room's window) is a rule violation, not a one-off bug; it
breaks rule 25 (a hearth against a window answers neither "what does this
advertise" — smoke has nowhere to go — nor "how did it get here" sensibly)
and rule 12's spirit (an opening that nothing respects). Concretely, for
every interior:

- **No object overlaps a window or door.** A window/door is circulation +
  light, exactly like an outdoor doorway (rule 1/14) — furniture never
  blocks it, the same way outdoor clutter never blocks a path (rule 9).
- **Functional clusters, indoors too** (rule 15/16): hearth + cooking gear
  together; bed + nightstand/side-table together; wash spot (basin +
  bucket) together; rest spot (chair + table) together. No isolated work
  object.
- **Walkable circulation to every interactable** (the indoor equivalent of
  rule 9's "every door connects"): the player must be able to path to the
  hearth, the bed, the basin, and the chair without an object blocking the
  only approach.
- **One focal point per room** (rule 21) — usually the hearth or the bed,
  off-center, highest detail; everything else is calmer.
- **The final audit (rule 25) applies per furniture piece** before it ships
  in a zone/interior layout: what does it advertise, how did it get here,
  who uses it, from where do they approach it?

This addendum binds every interior layout in `src/world/zones.ts` (interior
room rects) and every future furniture-placement/decorating system (see
`docs/ROADMAP_EXPANSION.md`'s buy+place decorating block and
`docs/DECISIONS.md`'s Sims-home vision entry) — placement logic must be able
to check "does this new placement violate the addendum" before committing it,
not just "does it fit the grid cell."

## Consequences for the asset set (as of the W0.5 rollout)

- REGENERATE: farmhouse (currently isometric corner view — the worst
  offender), barn (dead-frontal, roof ratio off), any object that fails
  rule 1–2 on inspection.
- KEEP (re-inspect against rule 1): cottage, tree, boulder, well, fence,
  woman.
- NEW assets needed by the grammar: gate segment, woodpile, chopping stump
  (+axe), water trough, hay bale, bucket, crate/barrel, tilled-field row
  strip, step stone. Small, 1 gen each.
- The mock composer must implement: path-first layout, Bayer grass↔dirt
  blending, wear aprons, plain-tile dominance, cluster placement, tree
  clumps, global grade.
