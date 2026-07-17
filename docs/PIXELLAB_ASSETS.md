# PIXELLAB_ASSETS.md — the sprite pipeline

Wildhearth's art is **code-drawn OR PixelLab-generated** (CLAUDE.md hard rule #1,
amended 2026-07-08). Sprites are pixel-art PNGs generated through the game's
PixelLab account, stored under `src/assets/pixellab/<category>/`, and drawn on a
**dual path**: the sprite when it is present and loaded, the code-drawn painter
otherwise. The game must run fully with **zero sprite files** — every
sprite-backed visual keeps its painter as a runtime fallback.

This doc is the source of truth for: what is sprite-sourced today, the proven
generation workflow + the exact prompts/ids, how to add or regenerate a sprite,
the asset/manifest layout, and generation costs.

---

## UO-mood era (CURRENT — supersedes the cozy anchors below)

*(W0/W0.5/W0.6 calibration, 2026-07-15..17 — frozen here after the owner's
sign-off on the composed mock and the grounding pass; see `docs/ART_PIVOT_UO.md`
for the execution program and `docs/DECISIONS.md` for the decision record.
Everything in this section is the ACTIVE style for every new generation from
this date. `docs/COMPOSITION_RULES.md` is the companion doc — it governs how
objects get PLACED into a scene (the 25-rule constitution); this section
governs how each individual object/character gets PROMPTED. Read both before
generating anything.)*

### The fixed STYLE SUFFIX (append verbatim to EVERY object/character prompt)
```
muted earthy desaturated palette of deep greens browns and cold greys,
gritty hand-painted painterly texture, detailed self-shadowing,
moody dusk lighting from the upper-left,
dark-fantasy realism in the style of classic Ultima Online,
no outlines, weathered and grounded
```

### Fixed generation parameters
| Param | World objects (buildings, props, rocks, trees) | Characters |
|---|---|---|
| `outline` | **`lineless`** | **`lineless`** *(prompt also says "no cartoon outlines")* |
| `shading` | `detailed shading` | `detailed shading` |
| `detail` | `high detail` | `high detail` |
| `view` | **`high top-down`** | **`low top-down`** |

`lineless` is the single most load-bearing setting — cartoon outlines are the
#1 "pasted-on / detached" tell the owner rejected. **Never** use
`selective outline` or `single color outline` in this pivot (that was the
cozy-era default, including wave 4's flat-front guardrail below — superseded).

### The WINNING VIEW RECIPE — buildings & world objects (calibrated in W0.5)
W0's plain wording (`view: "high top-down"` + a subject clause ending "...seen
from a high top-down angle with the front face and roof visible") was **too
weak** — it let the farmhouse drift into an isometric corner view, the worst
offender the W0.5 audit found (see `docs/COMPOSITION_RULES.md`'s root-cause
list). **Every building/object prompt from W0.5 onward MUST append this exact
mandatory clause**, in addition to `view: "high top-down"`:

> `"viewed straight-on from directly in front and 45 degrees above, the full
> front facade facing the viewer flat and symmetrical, with the roof plane
> visible above it, strictly NO corner view, NO isometric angle, NO diagonal
> rotation, like a <subject> sprite in a classic top-down RPG"`

(`<subject>` = the object being generated, e.g. "farmhouse", "barn", "well".)
This is the concrete, prompt-level enforcement of `COMPOSITION_RULES.md` Part
1 rule 1 (one implied camera, pitch ≈45°, yaw 0°, never a corner/diagonal/
isometric view) — bake the projection law directly into the prompt instead of
relying on the softer W0 phrasing, which the W0 mock proved wasn't load-bearing
enough on its own.

**Full per-object prompt** = `<subject clause>` + `<grounding slot>` (below) +
the view recipe above + the fixed style suffix.

### Palette (sampled from the approved W0/W0.5 pieces — real dominant hexes)
| Surface | Swatches |
|---|---|
| Timber walls (farmhouse) | `#382827` `#664a3e` `#191615` |
| Mossy shingle roof | `#2e5329` `#213923` |
| Barn planks / weathered grey wood | `#675c57` `#6c6059` |
| Dark slate roof | `#26232b` `#363338` `#1b1725` |
| Fieldstone + plaster (cottage) | `#4d5b31` `#434755` `#362829` |
| Tree bark (deep shadow) | `#241c2c` `#1a1215` |
| Tree canopy (muted, in shadow) | `#1a4632` `#05252b` (deep) |
| Granite boulder | `#73624f` `#5b5e64` |
| Lichen / moss highlight | `#b1c0a5` (rare highlight only) `#303f24` |
| Villager skin | `#7f5c3b` |
| Villager dress (muted brown) | `#613a30` `#452622` |
| Grass field (olive/khaki) | `#66693b` `#5e5d35` `#483525` |
| Bare dirt | `#362d21` `#3d3221` `#2e261d` |
| Worn path | `#534a38` `#3d3728` `#2a2518` |

**Palette rules:** saturation stays low (desaturate ~12% in the final grade);
value range mid-to-dark; the brightest note allowed on screen is the lichen/
rim-light `#b1c0a5`, and only as sparse highlight — no pure/candy hues
anywhere. **Global grade** over the whole composite (see `compose.mjs`):
desaturate ×0.88, dusk tint `×(1.02R, 0.97G, 0.90B)`, overall dim ×0.94,
radial vignette darkening to ~42% at the corners (this is
`COMPOSITION_RULES.md` rule 24 — "the single biggest one-photograph move").

### Grounding split (the "detached objects" fix)
| Category | Treatment | Why |
|---|---|---|
| **Nature** — rocks, boulders, trees, stumps, bushes | **(a) BAKED APRON**: *"standing on a base of trampled dirt and scattered grass tufts that blend outward from its footprint so it sits integrated into the ground"* | Nature always sits on natural terrain — no terrain-clash risk. The dirt-scuff + grass-tuft base is part of the silhouette and reads visibly more "planted" than a flat tint. |
| **Buildings** — farmhouse, barn, cottage, well | **(b) CLEAN-CUT + runtime base-blend decal**: *"clean cut base with no attached ground, isolated on a transparent background"*, then a Bayer-dithered ground-tint decal under the sprite at runtime (same machinery as terrain edges) | Buildings get placed on *varied* ground (farm dirt-yard, town cobble plaza, grass) — a baked apron would clash the instant a building sits on cobble. **For farm buildings specifically**, additionally paint a separate code-drawn worn-dirt yard decal under them (not baked into the sprite) to recover the "lived-in yard" feel. |
| **Characters** | **Clean-cut + contact shadow only** | A person casts a shadow but doesn't own a permanent ground scuff — an apron would look wrong the moment they move. |

Net: apron = commit the ground into the art (locks the terrain type, nature
never moves terrain so this is safe); clean + decal = adapt at runtime
(buildings/characters do move terrain, so this is required for them).

### Known failure modes (what to avoid)
1. `view: "top-down"` is **INVALID** for `create_map_object` — only
   `low top-down`, `high top-down`, `side` validate. Use `high top-down` for
   world objects/ground, `low top-down` for characters.
2. `create_map_object` **CANNOT make a ground fill** — it always returns a
   discrete object on transparency (a bordered patch, a blobby island, an
   ornate rug). Ground **MUST** come from `create_tiles_pro`
   (`outline_mode: "segmentation"`, `square_topdown`) — never a map object.
3. **Bright/saturated foliage drift** — the first gnarled-tree canopy came out
   spring-green, the one candy note against the muted set. Fix: explicitly add
   `NOT bright green, NOT saturated` to any foliage subject clause.
4. `create_tiles_pro` is **expensive** — ~20 generations per 16-tile set, vs
   ~1 per map object. Budget ground waves accordingly.
5. `tiles_pro` `square_topdown` tiles carry a **transparent depth skirt**
   (~5px top/bottom). Tile from the opaque core, or lay them in the intended
   offset grid — don't assume a full 32×32 opaque square.
6. **Grid waffle when tiling.** Mitigate with a dominant "plain" tile
   (~78-85%) + sparse variants + *gentle* brightness/value jitter
   (×0.96–1.04, or `COMPOSITION_RULES.md` rule 23's ×0.97–1.03). **Do NOT**
   over-jitter (×0.90–1.10) or add a brick-lay row offset — that overcorrects
   into a noisy masonry patchwork and dissolves paths.
7. **NEW (W0.6) — `create_map_object` occasionally returns an OPAQUE flat
   background instead of a transparent one.** After every generation, assert
   the PNG's transparency ratio is roughly **40-60%**; if it comes back near
   **~0%** (fully opaque), do **NOT** just re-roll the generation — fix it
   with a **border flood-fill keyed on the background's own luma** (sample the
   corner pixels, flood-fill matching-luma-and-connected pixels to
   transparent) before it's ever committed.

### W-UI ledger — the gump UI skin (2026-07-17)

The professional UI re-skin (the owner's "cheap"/"פושטי" verdict on the cozy
menus). **Cost: exactly 40 generations** — ONE `create_ui_asset` call, which
is billed at a flat **40 gens per panel** regardless of scope (measured, not
documented anywhere before — budget UI waves at ~40/panel). Balance
6976 → 6936. Everything else in the wave is **code/CSS** (CLAUDE.md hard
rule #1's code-drawn path), zero further gens.

- **UI kit sheet** — `create_ui_asset` id `15f1a17f-f739-4e36-ab90-a1d4b44f8c5c`,
  384×384, seed 7777. Prompt: *"ornate weathered gump window frame for a
  dark-fantasy RPG interface, a thick rectangular border of aged dark timber
  planks bound with black wrought-iron corner brackets rivets and straps, a
  plain hollow recessed center panel, classic Ultima Online interface chrome,
  muted earthy desaturated palette of deep charcoal browns and cold iron greys,
  gritty hand-painted painterly texture, heavy weathering and grime, detailed
  self-shadowing, grounded and heavy, no bright gold trim, no candy colors, no
  cartoon outlines"* (palette hint `weathered dark brown timber, black wrought
  iron, cold slate grey`). The tool returns a COMPOSITE kit sheet (one big
  frame + ~6 button/label plates + stray gem icons), not a single isolated
  panel — so **THREE** shipped assets were CROPPED out of the one sheet:
  - `ui/window.png` (235×229, crop @13,13) — the main window nine-slice frame.
    Its baked interior decorations (a "QUE" title, a castle scene, a potion, side
    gems) sit partly inside the border-image slice band, so a `_wui_clean` pass
    stamped flat dark `#1a140d` over any vivid/bright pixel **within 38px of an
    edge** (the slice ring) — the plank + iron stayed untouched (low-sat), the
    decorations in the ring were erased. The center content is irrelevant (the
    border-image draws no `fill`; `--panel-bg` covers it). Slice
    `38 36 40 36`, border-width `22px 21px 24px 21px`.
  - `ui/button.png` (113×51, crop @67,262) — a rounded wrought-iron button
    plate → the taskbar/zoom `.tool-btn`/`.zoom-btn` border-image (slice 12).
  - `ui/plate-anchored.png` (116×36, crop @254,38) — a slim iron plate → the
    ANCHORED HUD chrome (taskbar/needs/info/radar) border-image (slice 10), so
    fixed HUD reads as riveted iron, distinct from the wood-framed windows.
  The full raw sheet is kept at `scratchpad/uo-w0/../wui/wh-uo-uikit-source.png`
  for future harvest (the unused plates can back more chrome without a new gen).
- **Wired** in `src/ui/skin.ts` (`--skin-window` re-measured + new
  `--skin-button`/`--skin-anchored`) + `index.html` (all gated behind
  `.wh-skinned`, each with a zero-PNG CSS fallback — dual-path intact, verified
  by a zero-PNG smoke boot).
- **Icons** — the taskbar/HUD emoji (🗺️📜📖📋🎒💾⚙️⏸️☰🪙) are replaced by a
  code-drawn inline-SVG pixel-glyph set (`src/ui/icons.ts`, `applyIcons()` at
  boot). Not sprites — code art, always present, the emoji stay in `index.html`
  as the zero-JS fallback. The 7 need glyphs stayed code-drawn (already clear).
- **Palette** — the cozy honey/candy-gold token set was retuned to muted UO
  (aged brass, weathered timber, riveted iron, aged parchment) in `index.html`
  `:root` + a global de-candy of the bright-gold literals.

### W1 ledger — the ground wave (2026-07-17)

The first art-pivot terrain wave: all four ground tile sets regenerated in the
UO-mood palette (grass/soil/water/plaza), replacing the cozy sets in-place
(`src/assets/pixellab/ground/<set>/tile_0..15.png` — same ids/paths, drop-in).
**Cost: 140 generations** (7 × `create_tiles_pro` @ 20 gens each — measured,
`create_tiles_pro` is a flat 20/set at 32px×16-tile; the "~20-40" tool estimate
is worst-case). Balance 6936 → **6796** (Tier 3).

- **The winning tiles_pro recipe for terrain-FILL ground (calibrated this
  wave, supersedes the session-4 assumption that ground used
  `segmentation`):** `outline_mode: "outline"` (NOT `segmentation`),
  `tile_type: "square_topdown"`, `tile_view: "top-down"` (flat, 0 depth → a
  full-opaque 32×32 tile, no depth skirt), `tile_size: 32`, `seed: 7777`.
  **`segmentation` mode is WRONG for terrain fill** — it only paints tiles that
  carry a distinct feature/object and leaves featureless "plain" tiles fully
  TRANSPARENT (measured: a plain-grass segmentation set came back ~100%
  transparent; a full-bleed reword didn't help). `outline` mode fills every
  tile — its one artifact is a dark ~2px OUTLINE ring baked onto each tile
  border, which tiles into a hard grid; that is removed by a deterministic
  post-process **border-erode** (clamp the outer 2px ring to the interior edge,
  `scratchpad erode B=2`) BEFORE the PNG is committed. Net pipeline per set:
  `create_tiles_pro (outline, top-down)` → download 16 → erode B=2 → drop into
  `ground/<set>/`. (Same "generate then clean" class as the W-UI ring-clean.)
- **Prompt style for ground tiles** deviates from the object STYLE SUFFIX in
  one load-bearing way: ground tiles must be **flat, evenly-lit and seamlessly
  tileable** — so the suffix's "moody dusk lighting from the upper-left,
  detailed self-shadowing" is REPLACED by "flat even ambient lighting, no
  directional gradient, seamlessly tileable with no visible edges seams grid or
  brick courses". Directional light on a ground tile bakes a light-corner/
  dark-corner that reads as a grid when tiled (the exact "masonry/brick-strip"
  the owner rejected). The muted-palette / low-saturation / no-outlines / "like
  classic Ultima Online" parts of the suffix are kept.
- **Tile ids (all `seed 7777`, 32px square_topdown, outline, top-down):** grass
  `a8b434fb-5fc0-4848-ae6e-9452b651eb83`, soil `0d97e67f-6ce8-4c88-9bdc-5e259b2b4f71`,
  water `cf563875-f279-4079-95e4-b3b435df54ed`, plaza `6a6fee46-36df-4e70-968a-83a06e142b5f`.
  (3 discarded recipe-finding gens: two `segmentation` grass/soil sets +
  one `segmentation` high-top-down grass — all came back transparent.)
- **Bag re-mapping (`src/world/ground.ts`)** — the per-terrain weighted tile
  bags were re-derived from the new sheets' actual tile roles (see the inline
  comments). Two lessons baked in: (1) the tilled-field bag uses ONLY the soft
  HORIZONTAL crumbly-furrow tiles (kills the old "dark vertical planks" read the
  owner rejected) and the path/yard bag uses ONLY smooth-dirt tiles (kills the
  "odd dark vertical bars" the W0.6 audit flagged — same root cause: plank-
  textured soil tiles leaking into the yard); (2) to avoid a tile-to-tile
  **checkerboard**, each dominant pool is the tight same-tone cluster measured
  off the sheet (grass mean rgb 127,128,88 → tiles within ~4; water deep → the
  two near-identical dark tiles 0/12 at bright ~44, greens/lights excluded).

### The GROUND generation checklist (append to, per new set)
`create_tiles_pro` **outline / square_topdown / top-down / 32 / seed 7777** →
download → **erode border B=2** → **tone-NORMALIZE the pool** (W1.1: toroidal
low-pass removal + a common per-set mean — kills the several-tile "quilt" of
macro tone patches while keeping micro-texture; furrow tiles instead get the
furrow pipeline: strip each tile's own row profile + speckle, dampen residual
×0.65, add ONE shared y-aligned 8px band profile + common warm-earth mean so
rows continue across every tile border) → drop in `ground/<set>/` → re-derive
the bag from the new tiles' roles. Edge dithering in `world/ground.ts` is
multi-octave positional hash noise (`edgeThr`, W1.1 — the 4x4 Bayer read as a
mechanical dot lattice at gameplay zoom) with ~1.5-tile fades.

### W2a ledger — the buildings wave (2026-07-17)

Every on-screen building re-generated in the UO-mood straight-on style,
replacing the cozy-era sprites in-place (same filenames/paths, drop-in). **Cost:
34 generations** (27 shipped + 7 discards/re-rolls). Balance 6796 → **6762**
(Tier 3). All 27 came back with healthy 38-58% transparency — the opaque-flood
failure mode (#7) never triggered this wave.

- **The load-bearing calibration — buildings drift to ISOMETRIC even with the
  W0.5 "strict straight-on" clause + `view: high top-down`.** The first
  validation batch (farmhouse/barn/cottage on the documented recipe) came back
  as 3/4 corner-view miniatures — the exact look the owner rejected. Root cause:
  `create_map_object` has a strong 3/4 prior for tall gable buildings that the
  strict clause alone can't overcome (the approved W0.5 `*-v2` refs were the
  lucky flat rolls kept from a higher-variance set). **The winning recipe for
  GABLE BUILDINGS** (farmhouse, neighbor, barn, all 11 cottages, inn, stable,
  outhouse): `view: "low top-down"` **+** the strengthened flat clause —
  *"drawn as a completely flat 2D front elevation like a Stardew Valley building
  sprite, showing ONLY the flat front wall and the pitched roof directly above
  it, the front wall symmetrical and squarely facing the viewer, absolutely NO
  side walls, NO side faces, NO visible building depth, NO corner view, NO
  isometric projection, NO three-quarter angle, NO diagonal rotation"*. This
  merges the proven wave-4 "no side walls / flat like Stardew" language with the
  UO style suffix + `lineless`. `high top-down` reliably drifts isometric for
  gable forms — **use `low top-down` for buildings**; `high top-down` stays
  correct only for open **STALLS** (9 stalls, `view: high top-down` + the W0.5
  straight-on clause — open counters read fine with a little awning-top depth)
  and the **well**. PixelLab kept the full requested canvas (no trim), so anchors
  barely moved from the cozy set.
- **All 27 shipped** (subject clause per building's identity — weathered/muted):
  `farmhouse` (dark timber + mossy roof), `farmhouse-neighbor` (prosperous
  fieldstone+plaster+slate), `barn` (grey plank, cross-braced doors, cupola),
  cottages `01-11` (varied timber/plaster/stone/brick walls × thatch/shingle/
  slate/clay-tile roofs × porch/ivy/flowerbox/lean-to/net/buoys/lantern), `inn`
  (two-storey timber-frame, warm-lit windows, hanging sign — re-rolled twice, the
  hardest to flatten), `stable` (low broad, horseshoe sign, open bays),
  `outhouse` (mono-pitch, crescent door), `well` (fieldstone + peaked post-roof),
  and 9 stalls: generic `market-stall` (terracotta), the 4 market themes (fish
  teal / produce olive / goods mustard / empty grey) + 4 distinct town-merchant
  stalls (general brown / fishmonger slate-blue / greengrocer sage / tailor
  plum, in `buildings/spare/`). Anchors re-measured (alpha bbox centre+foot) in
  `art/buildings.ts`; the hard-coded set updated, the `spriteBaseAnchor` set
  auto-adapts.
- **Grounding (clean-cut + runtime base-blend decal, the "detached" fix):**
  `world/ground.ts` `paintBuildingGrounding()` bakes a decal under every building
  footprint INTO the ground canvas (once, so it sits under the depth-sorted
  sprites and adapts to the terrain) — it SAMPLES the local ground pixels
  (getImageData) and blends them toward a dark compacted-earth contact with a
  two-octave noise-dithered edge; **farm buildings** (house/barn/outhouse +
  neighbour farmstead) additionally get a wider WARM worn-dirt yard. Runs in BOTH
  the tiled and painterly paths → grounding shows on the zero-PNG fallback too.
  Contact shadows stay dynamic (`castShadow`, uniform sun) — the decal supplies
  the "sits in the earth" weight, so no global shadow-alpha change was needed.
- **Roofline metadata (the interiors constraint):** `BUILDING_ROOFLINE` in
  `art/buildings.ts` records each sprite's roof band `[topY, eavesLine]` (sprite
  px; eaves = the widest row in the top ~55%) for the future Sims-style roof-hide.
- **Damage overlays re-tuned** to the new player farmhouse/barn art (read off a
  16/8px coord grid + verified against a rundown-state screenshot): farmhouse
  roof-hole+patch on the mossy roof ≈(112-152,72-106), boarded window ≈(119-146,
  112-137); barn loose-plank across the doors ≈(104,132), missing-plank gap
  ≈(167,118). The generic stall's `STALL_AWNING_BAND` was widened to 328-22° (the
  new terracotta cloth) so the player-stall recolour still catches it.

### W2c ledger — the proportion pass (2026-07-17)

**Cost: 0 generations. Balance 6762 → 6762 (unchanged, measured before/after).**
The owner's verdict on the fresh W2a buildings — *"the buildings aren't
proportional to the overall scale... it still looks like you just threw them"* —
was NOT under-resolution. Measuring every W2a sprite (alpha-bbox silhouette ×
its config scale ÷ 39px char unit) showed the sprites were **mis-scaled**, not
under-resolutioned: farmhouse 4.13u (over the 3.2-3.8 law), cottages/homes
2.0-2.5u (the "playhouse"), stalls 1.6-2.1u, outhouse 1.03u, barn 3.97u (under
4.5-5u), stable 2.03u. Since `create_map_object` auto-trims and picks subject
size, a bigger CANVAS is an unreliable lever anyway — the reliable levers are the
`SPRITE_*_SCALE` multipliers + the `zones.ts` rects. So W2c fixed proportion with
**zero generations**, retuning scales into `COMPOSITION_RULES.md` Part 3's bands:
farmhouse 0.95 (3.92u, ≤ the 4.0 focal cap, < barn), barn 1.18 (4.69u), cottages
1.25 (3.2-3.85u), stalls 0.96 (~2.3u), outhouse 1.15 (2.13u), stable 1.2 (3.2u),
well 0.90 (1.9u), inn kept 1.0 (4.15u). Pixel density stayed ~0.9-1.25 (≈ ground
1.0 / chars 0.82) — verified by eye at gameplay zoom that no building reads
softer than its neighbours, so no surgical regen was needed. **Dependent art
followed for free** because the scale/rect changes propagate through existing
scale-aware code: damage overlays use `sw(p,…)` (auto-scale with placement),
`BUILDING_ROOFLINE` is sprite-px (unchanged), the grounding decals + code-painter
fallbacks read the rects (grown to match, bottom-centre kept fixed). W2c also
shipped three GROUNDING fixes in the same commit (not generations — code):
buildings dropped the hard diagonal cast polygon for a soft `contactShadow` +
`baseGrounding` (tint climb + weed tufts) uniform on both render paths, and the
farm yard became grass with baked worn-dirt circulation (`paintFarmWear`,
manifest-driven). **Optional future fidelity pass:** if the owner later wants
buildings at native pixel density matching the ground exactly, regenerate at
bigger canvases — but that is a fidelity nicety, NOT needed for proportion; the
~100-gen budget stays unspent.

---

## 1. What's sprite-sourced today (vs code-drawn)

| Visual | Source | Where |
|---|---|---|
| **Player** — curated sprite MATRIX (2 genders × 5 hairstyles × 5 outfits, 4-dir rotations + walk), keyed vivid-purple hair runtime-recoloured to 3 natural shades | **Sprite** | `characters/matrix/matrix-<gender>-<hair>-<outfit>.sheet.png` → `art/spriteChar.ts` (rewritten as the matrix bridge, session 4) |
| **Townsfolk** — the 10 NPCs, each 8-dir walk + static rotations | **Sprite** | `characters/<id>.sheet.png` → `art/spriteNpc.ts` |
| **Ground** — grass/soil/water/plaza, 16 32px tiles per set, weighted scatter + code Bayer-dither edges | **Sprite (tiles)** | `ground/{grass,soil,water,plaza}/tile_0..15.png` → `world/ground.ts` `paintTerrainTiles` |
| **UI kit** — wood/gold window frame, parchment tooltip, 2 NPC bust portraits (Maren, Tobin), the WildhearthStorybook pixel font | **Sprite/font** | `ui/{window,tooltip}.png`, `ui/portraits/{maren,tobin}.png`, `assets/fonts/WildhearthStorybook.ttf` → `ui/skin.ts` |
| **Farmhouse** (player's, repaired base — flat-front) | **Sprite** | `buildings/farmhouse.png` → `art/buildings.ts` `drawHouse` |
| **Farmhouse** (neighbour's — established/prosperous, flat-front) | **Sprite** | `buildings/farmhouse-neighbor.png` → `art/buildings.ts` `drawHouse(..., spriteId)` |
| **Barn** (repaired base — flat-front; shared by the player's farm AND the neighbour farm) | **Sprite** | `buildings/barn.png` → `art/buildings.ts` `drawBarn` |
| **Hearth** (interior cook spot) | **Sprite** | `interior/hearth.png` → `art/interior.ts` |
| **Interior room backdrop** (floor + walls + window) | **Sprite** | `interior/room-backdrop.png` → `art/interior.ts` `drawInterior` |
| **Wash basin** (interior) | **Sprite** | `interior/basin.png` → `art/interior.ts` `drawInterior` |
| **Bed** (interior) | **Sprite** | `interior/bed.png` → `art/interior.ts` `drawInterior` |
| **Chair + crate table** (interior rest corner) | **Sprite** | `interior/chair-crate.png` → `art/interior.ts` `drawInterior` |
| **The 4 market stalls** (fish/produce/goods/empty — each its OWN themed sprite, flat-front) | **Sprite** | `buildings/stall-{fish,produce,goods,empty}.png` → `art/buildings.ts` `drawStall(..., themed=true)` |
| **The farm's own trade stall** (generic base; awning re-tinted to the player's selling path) | **Sprite** | `buildings/market-stall.png` → `art/buildings.ts` `drawStall` |
| **Market well** (flat-front) | **Sprite** | `buildings/well.png` → `art/buildings.ts` `drawWell` |
| **Market cottages** (6, each a DIFFERENT approved variant of 8 generated) | **Sprite** | `buildings/cottage-0N_*.png` → `art/buildings.ts` `drawCottage(..., variant)` |
| **Farmyard livestock** — cow, pig, sheep (8-dir walk cycle) + hen, duck (8 static rotations, no walk) | **Sprite** | `animals/{cow,pig,sheep,hen,duck}.sheet.png` → `art/spriteAnimal.ts` |
| Everything else — crops/trees/bushes, outhouse, dock, market ground, weather/particles, UI, tools, stall goods/signs (a code overlay on the stall sprite — see notes), the player's non-walk/idle poses (fishing/hoeing/foraging/busking/sleeping), and **seasonal wildlife** (deer/rabbit/hare/songbird/butterfly — `entities/wildlife.ts` + `art/wildlife.ts` — deliberately code-rig only, never sprite-sourced: too many ambient species/poses to justify the generation spend) | **Code-drawn** | `src/art/*` |

Notes:
- **Session 4 superseded the heroine multi-sheet system entirely** (the 5
  `characters/heroine*.sheet.*` files were deleted, ~968KB, commit `d3fb35f`
  — nothing imports them). The **player** now picks a look from the curated
  **sprite matrix** (§2 Wave 7 below) instead of one fixed heroine identity
  with hairstyle variants; the matrix covers BOTH genders, not just a
  default female look. The matrix sprite only covers **rotations + walk**
  (4-dir, no diagonals, no baked idle — the static rotation stands in);
  action poses (fishing/hoeing/foraging/busking/sleeping) have no generated
  animation and fall back to the code rig (`art/rig.ts`) per-frame,
  seamlessly, same contract as before.
- The matrix sprite covers **every combo the creator can pick** (5 hair × 5
  outfit × gender, all shipped, no combos excluded — the exclusion
  mechanism exists but its set is empty) — see "Recolouring the matrix hair"
  (§below) for the keyed-purple → natural-shade mechanism. Skin-tone
  recolour and body sizes S/L are NOT yet covered (see Wave 7's honest
  coverage note) — those looks draw the rig fallback, wearing the same
  colours, until the next generation wave ships them.
- The building/hearth sprites are the **repaired** buildings. The renovation
  DAMAGE (roof hole/patch, boarded window, barn boards) is code-drawn **on top
  of the sprite** when a part is broken (`buildings.ts` `drawHouse…Sprite`
  overlays), positioned in the sprite's own pixel space.
- The room backdrop is a **full-bleed background**, not a footprint sprite —
  it's placed by offset, not the usual "scale to the zone rect" recipe (see
  §2/§3). Furniture (hearth/basin/bed/chair-crate) still anchors base-on-floor
  to its own rect, per the usual recipe. The wall-crack light shaft, the exit
  mat, and every furniture piece are code-drawn overlays **on top of** the
  backdrop, unchanged; the fallback-only "rotten floorboards" detail is
  skipped on the sprite path (the sprite has its own worn boards baked in —
  drawing both would double up).
- **Building variety batch** (2026-07-07, v1-foundation) — the "no two
  neighbors alike" pass. See `docs/SCALING_DECISION.md` for why (four sprites
  came out too oblique for the flat world) and the full manifest handed off by
  the generation batch for every pick's reasoning.
  - **Flat-front replacements**: `farmhouse.png`, `barn.png`,
    `market-stall.png`, `well.png` were swapped for flat-front regenerations
    (same filenames, same pixel sizes — a drop-in swap). Every anchor
    (`FARMHOUSE_SHEET`/`BARN_SHEET`/`STALL_SHEET`/`WELL_SHEET` in
    `art/buildings.ts`) was re-measured against the new art, and the
    renovation damage overlays (roof hole + patch, boarded window, barn
    boards) were re-tuned to sit on the new silhouettes — verified with an
    in-browser screenshot of the rundown state, not just measured.
  - **The 4 market stalls stopped sharing one recolored design.** Each now
    draws its OWN dedicated sprite (`STALL_THEMES` in `art/buildings.ts`,
    picked from 3 generated variants per theme): fish = `stall-fish.png`
    (clearest "FISH" signage + net + barrel, of `stall-fish-01/02/03`);
    produce = `stall-produce.png` (open-counter read with veg crates +
    flowers, of `-01/02/03`); goods = `stall-goods.png` (mustard awning +
    lanterns, of `stall-general-01/02/03` — picked for the distinct mustard
    hue the manifest's own color-coding calls out, over `-01`/`-03`'s
    red-leaning palette); empty = `stall-empty.png` (shuttered counter + blank
    placard, of `stall-empty-01/02/03` — manifest's own "best fit to disused"
    pick; `-02` was avoided per the brief, reading too cozy for a vacant
    stall). The single generic sprite + `recolorSprite` hue-band machinery
    (`STALL_SHEET`/`STALL_AWNING_BAND`) was NOT deleted — it stays live as the
    code path for the farm's own trade stall (its awning/goods are driven by
    the player's chosen selling path, so it can't commit to one theme's art)
    and for any future stall that doesn't have its own themed art yet
    (`drawStall`'s new `themed` param, `false` by default, `true` for the 4
    market stalls only).
  - **6 market cottages, 6 different variants** (of 8 approved; 2 spare) — a
    `variant: number` field on each `zones.ts` `CottageDef`, resolved to a
    sprite + its own measured anchor via `COTTAGE_SPRITES` in
    `art/buildings.ts`. `drawCottage`'s existing code painter (random
    wall/roof tone) is untouched as the fallback.
  - **The neighbour farm's house** draws its OWN sprite
    (`farmhouse-neighbor.png`, the whitewash-walls/slate-roof "established"
    variant) via a new `spriteId` param on `drawHouse` (default
    `"buildings/farmhouse"`, so every other caller is unaffected); its barn
    reuses the player's barn sprite as-is (no distinct "established" barn art
    this wave).
  - **Spares** (paid for, unused this wave, v2 will want them): committed
    under `buildings/spare/`, all ≥4.3KB so Vite's asset inliner (base64,
    <4KB by default) never touches them — they land as their own hashed
    files, not inline in the JS bundle. 11 files: 1 farmhouse variant
    (`farmhouse-extra-01_stone-plank.png`), 2 cottage variants (`cottage-06_
    slate-stone-porch.png`, `cottage-08_shingle-plank-leanto.png`), 8 stall
    variants (the 2 unused generations per theme). Being under
    `src/assets/pixellab/`, the manifest glob still picks them up and
    `loadSprites()` fetches+decodes them at boot like any other sprite (a
    dozen small unused network fetches, functionally harmless, dual-path-safe
    — they're just never drawn) — noted honestly rather than silently
    accepted; splitting the glob to exclude `spare/` was judged out of scope
    for this batch (see "Adding a category" in §4 — the glob's whole design
    point is needing no code change per drop-in).
  - The four market stalls' own baked-in goods overlay stays a code-drawn
    overlay on both paths (themed sprite AND the generic fallback) — the
    per-stall differentiator (fish/produce/goods/empty) the sprite's shelf art
    doesn't itself encode; unchanged by this batch, documented again below.
- **Bed**: the first generation read as a bench on review and was rejected;
  the retry clearly reads as a straw bed with a blanket and was integrated
  (see §2 for both object ids).
- **Townsfolk (10 NPCs)**: each NPC has its OWN packed sheet
  (`characters/<id>.sheet.png`, see §3/§4), covering the 8 rotations + an
  8-direction walk. The sprite covers EVERY on-screen state — WALKING uses the
  6-frame walk cycle (keyed to the NPC's distance), everything else (standing /
  socializing / atWork / talking) uses the STATIC rotation frame for the NPC's
  facing (decision S2-8: NO breathing idle for NPCs). So an NPC never swaps
  sprite↔rig in normal play; the rig is a pure fallback (no sheet / not decoded
  / `__wh.npcSpriteMode(false)`). The rig's action poses (hoeing/fishing/
  busking limbs) are therefore not used on the sprite path — where an action
  needs to read, a MINIMAL code prop overlays the static sprite (`spriteNpc.ts`
  `drawNpcProps`): **Finn** gets the existing code fishing rod (`rig.ts`
  `drawRod`) angled from his hands at the dock; **Liora** gets drifting music
  notes (`props.ts` `drawMusicNotes`) above her head while performing (her
  sprite already holds the lute). Everyone else (incl. Ada, Bram, the
  stallkeepers) is a static sprite with no overlay. Per-NPC scale + the shared
  foot/shadow anchoring are in §3 and `config.ts` (`SPRITE_NPC_SCALES`).
- **Farmyard livestock (wave 6)**: cow/pig/sheep are quadrupeds with a real
  8-dir walk cycle (`art/spriteAnimal.ts`, the livestock counterpart to
  `spriteNpc.ts`); hen/duck are birds generated as 8-directional OBJECTS with
  no skeleton/animation at all — a moving bird gets a small CODE-DRIVEN waddle
  (±1px bob + a slight tilt, keyed to distance) instead of a generated walk, so
  it doesn't visually freeze mid-stride. An animal that stops just holds
  whatever facing it last walked in (no idle animation, same "no breathing
  idle" spirit as decision S2-8, but there's no "face the player" concept
  either — animals don't get talked to). Dev A/B: `__wh.animalSpriteMode(false)`.
  Per-species scale + ground/shadow geometry are in `config.ts`
  (`SPRITE_ANIMAL_SCALES`, `SPRITE_ANIMAL_GROUND`) — computed so the sprite's
  apparent height AND foot/shadow line match `art/animalRig.ts`'s existing
  `COW_RIG`/`PIG_RIG`/`SHEEP_RIG`/`HEN_RIG`/`DUCK_RIG` fallback presets, so the
  toggle never pops (see `docs/WORKLOG.md`'s entry for the exact numbers).
  **Cat and dog were generated + packed in the same batch (same quadruped
  8-dir-walk shape) but are BANKED, not spawned** — no `Cat`/`Dog` entity
  exists yet; they're reserved for the future Pets block (adoption/
  companionship, `VISION.md` Systems #6). `art/characters.ts`'s existing
  `drawCat`/`drawDog` stay rig-only wrappers (unused outside verification),
  untouched by this batch. **Seasonal wildlife stays code-rig by design** —
  see §1's table note; it was never in scope for a sprite pass.

---

## 2. The proven workflow

**SUPERSEDED (style only) — see "UO-mood era" at the top of this doc.** The
*mechanics* below (tool usage, the character/map-object recipes, the packing
scripts, the manifest layout) are still exactly how every generation gets
made; only the "cute cozy" style descriptors quoted through this section (and
every ledger entry's recorded prompt, waves 1–8) are historical record of the
pre-pivot look, not something to reuse in a new prompt.

**Style anchor (cozy era, SUPERSEDED).** One warm "cute cozy fantasy
farm-game" look: warm palette, soft dark outlines, readable at small size,
**low top-down** view. Anchor every new asset to it by (a) reusing the
heroine **character id** below as the visual reference and (b) repeating the
palette/outline descriptors in the prompt.

**Characters** (`create_character`, export v3):
1. `create_character` with `view: "low top-down"`, `n_directions: 8`, a `size`
   around 84–96px canvas (character ≈ half the canvas), and the rich prompt.
   This yields the 8 static rotations.
2. `animate_character` per motion using the built-in templates — **walk**
   (6 frames) and **idle/"animating"** (4 frames, gentle breathing) — each
   generated across all 8 directions.
3. Download the character zip (`…/characters/<id>/download`); it contains
   `rotations/<dir>.png` + `animations/<template>/<dir>/frame_00N.png` +
   `metadata.json`. Flatten into `characters/<name>/` with tidy names
   (`rot_<dir>`, `walk_<dir>_N`, `idle_<dir>_N`). If the idle job is still
   finishing, re-download after a couple of minutes.

**Static objects** (`create_map_object`): buildings, furniture, big props.
`view: "low top-down"`, transparent background, a `size` a little larger than
the on-map footprint (roof/chimney overhang). One PNG, no directions.
**⚠ Map objects auto-delete after 8 hours — download immediately.**

**Tiles / tilesets** (`create_topdown_tileset`, etc.): not used yet; reserved
for future ground/terrain work if the code-drawn ground is ever replaced.

### Recorded prompts + ids (reuse the character id as the style reference)

- **Heroine** — character `0f0c45b6-1502-4088-8183-3293b4eec8fa`, 84×84, 8-dir,
  low top-down, template `mannequin`:
  > young woman farmer with warm chestnut-brown hair in a low side ponytail,
  > wide-brimmed woven straw sun hat with a clearly readable brim and a thin red
  > band, large expressive hazel eyes, friendly face with light freckles,
  > rust-red work dress with a cream apron, sturdy brown boots — cute cozy
  > fantasy farm-game heroine, warm color palette, soft dark outlines, charming
  > and readable at small size

  Animations: `walking` (6 frames × 8 dir), `animating`/idle (4 frames × 8 dir).
- **Farmhouse** — map object `7eb7dddd-2271-4549-bda4-61afb3a77ade`,
  downloaded 192×176:
  > small rustic farmhouse with a shingled gable roof, warm honey-brown wooden
  > plank walls, a front door and one shuttered window, small stone chimney,
  > charming cozy fantasy farm-game style, warm palette, soft dark outlines,
  > weathered but lovable
- **Barn** — map object `2c09a872-ea69-4165-b0a8-2f3b9d74be69`,
  downloaded 208×176:
  > weathered wooden barn with a wide double door, faded red-brown plank walls,
  > shingled gable roof, hay wisps at the base, charming cozy fantasy farm-game
  > style, warm palette, soft dark outlines
- **Hearth** — map object `f208be6d-229a-4a9d-acea-54224e7ae1ce`,
  downloaded 64×80:
  > soot-blackened stone hearth fireplace with a rusty iron cooking pot hanging
  > over glowing embers, a small wooden shelf above, cozy fantasy farm-game
  > interior furniture, warm palette, soft dark outlines

(PixelLab trims the transparent canvas, so the downloaded size differs from the
requested `size` — always align to the **downloaded** dimensions.)

**Wave 2** (interior room + furniture, market stalls, well) — generated by the
supervisor pipeline; only the truncated `name` the API returns (~52 chars) was
recovered afterward via `list_objects`/`get_object`, not the original full
prompt, so these entries are shorter than wave 1's:

- **Room backdrop** — map object `6dda6373-44a3-4c2c-8455-8073a11f00cd`, high
  top-down, downloaded 320×240, fully opaque (a background, not a footprint
  sprite): *"bare rustic room interior backdrop seen from above"* — bare room,
  plank floor, timber-framed plaster walls, shuttered back window.
- **Wash basin** — map object `777bddd0-5dc7-4cbd-9907-0e5b72426e86`, low
  top-down, downloaded 48×64: *"cracked clay wash basin on a wobbly wooden
  stand w…"* — clay basin on stand + bucket.
- **Chair + crate table** — map object `5030a04f-6e3c-400b-9f3b-b6bf8bac0f07`,
  low top-down, downloaded 64×64: *"single wooden chair with one slightly
  short leg ne…"* — chair + crate table.
- **Market stall** — map object `5d23b3dd-e162-4a71-9f1d-2dbc1a48af85`, low
  top-down, downloaded 112×112: *"wooden market stall with a striped canvas
  awning, …"*.
- **Well** — map object `45054ca5-f684-4558-a9d7-cb7cb8143359`, low top-down,
  downloaded 80×96: *"round stone well with a small wooden roof, rope an…"*.
- **Bed** — REJECTED first attempt: map object
  `1c0d1b45-ac2a-4471-ac24-af4a6a1a5b15` (*"simple straw mattress bed on a
  creaky low wooden f…"*, 64×80) read as a bench on review, not a bed — retried.
  ACCEPTED retry: map object `154caf2b-2df8-4a8a-84ce-c7ce0260dd85`
  (*"rustic single bed viewed from the front: low woode…"*, 64×80) — clearly a
  straw bed with a blanket, integrated.

**Wave 3** (the 10 townsfolk) — each a `create_character` (`view: low top-down`,
`n_directions: 8`, v3) + one `animate_character` `walking` (6 frames × 8 dir);
NO idle template (decision S2-8). Downloaded, then packed with
`scripts/packsheets.mjs` into `characters/<id>.sheet.png` (loose frames kept in
untracked staging, not committed). Canvas sizes vary by generation (the
downloaded native size; the packer aligns to it). Character ids + prompts:

- **maren** `ae9dd242-37e1-4dba-8253-256b4077699a`, 92×92 — *middle-aged woman
  fishmonger, dark auburn hair in a bun under a kerchief, sea-green fisher's
  smock + apron, brisk warm expression.*
- **tobin** `c28c90b4-8e37-4bb3-a56b-9c9bf2df10ab`, 92×92 — *round cheerful
  greengrocer, ruddy cheeks, short sandy hair, leaf-green vest + market apron.*
- **sera** `3f01fa9a-79b5-45c6-9fd6-096b86cb490d`, 88×88 — *poised shopkeeper,
  black hair in a tight bun, round spectacles, slate-blue tailored dress, a
  ledger under one arm.*
- **liora** `e67d5229-9999-4ab0-a12b-5665155361b1`, 76×76 — *young street
  musician, copper-red hair with a flower behind one ear, plum-and-gold
  performer's dress, holding a small wooden lute.*
- **henrik** `8faad319-131d-4834-a7cd-8bcc46ac003e`, 88×88 — *elderly farmer,
  bushy grey brows, slight stoop, faded blue overalls over a checked shirt.*
- **petra** `37546611-44c7-49f2-9ccb-69b2e394513e`, 92×92 — *plump motherly
  baker, flour-dusted burgundy dress + white apron, honey-brown braided hair.*
- **bram** `4d3dc9e5-d92e-489a-be69-21a68fc48245`, 88×88 — *broad-shouldered
  carpenter, short dark hair + neat beard, tan leather apron, hammer on belt.*
- **ada** `f7d8d4a6-5682-4ecd-a872-69bd76648320`, 84×84 — *elderly herbalist,
  silver hair in a loose bun, moss-green hooded shawl, a woven gathering basket.*
- **finn** `bb312a83-a131-43c7-be86-a90f0d7cec9a`, 72×72 — *young boy (~10) fisher
  apprentice, messy sandy-blond hair, freckles, rolled teal trousers, eager.*
  (kid — the smallest canvas; drawn clearly smaller in-game.)
- **jonas** `c0e81f27-537b-4851-b79f-60dabad10bff`, 92×92 — *wiry middle-aged
  peddler, travel-worn burgundy coat, patched satchel, flat cap, clever eyes.*

**Wave 4** (building variety batch, `create_map_object`) — the FLAT-FRONT
GUARDRAIL, now the standard for every future object generation: view
`"high top-down"` + *"straight-on front view, camera looking slightly down,
only the front face and roof visible, no side walls, flat pixel-art game
building like Stardew Valley architecture"*, style suffix *"charming cozy
fantasy farm-game style, warm palette, soft dark outlines"*, detail
`"high detail"`, outline `"selective outline"`, shading `"medium shading"`.
18 generations, all landing clean first try (no reject/retry cycle needed):
- **4 flat-front replacements** (drop-in, same filename/size as the sprite
  they replaced): `farmhouse-flat.png` → `farmhouse.png` (192×176),
  `barn-flat.png` → `barn.png` (208×176), `market-stall-flat.png` →
  `market-stall.png` (112×112), `well-flat.png` → `well.png` (80×96, also
  fixed an internal-inconsistency bug — the old well had a 3D-pyramid roof
  over a flat top-down base).
- **12 stall variants** (112×112, 3 each × fish/produce/goods/empty theme) —
  see the Notes above (§1) for which one was picked per theme and why.
- **2 extra farmhouse variants** (192×176): `farmhouse-extra-01_stone-plank.png`
  (stone foundation + honey plank, spare) and `farmhouse-extra-02_whitewash-
  slate.png` (whitewash walls + slate roof — integrated as the neighbour's
  `farmhouse-neighbor.png`).
- **8 cottage variants** (112×128) were NOT generated this wave — reused
  as-is from the pre-guardrail probe batch (`docs/SCALING_DECISION.md`
  Finding 3), re-reviewed against this wave's stricter guardrail and judged
  still on-style (one notch more oblique than the wave-4 assets, never
  approaching the old market-stall/well's severe two-visible-side-faces
  problem) — 0 generations spent. `cottage-01` through `cottage-08`, axes
  roof×wall×feature (thatch/slate/red-tile/shingle × plank/plaster/stone/
  timber × porch/ivy/flowerbox/lean-to); 6 integrated, 2 spare (see §1 notes
  for which). The EARLIER pre-guardrail cottage designs in scratchpad
  `objects/` (`cottage.png` thatched, `cottage-stone.png`, `cottage-tall.png`)
  are retired — mildly oblique, never integrated, superseded by the 8-variant
  probe batch above.

**Wave 5** (4 heroine hairstyle bases) — `create_character` (`view: low
top-down`, 8-dir, v3, 92px) + `animate_character` walk (6f) + idle (4f), same
prompt as the heroine hat base but with the hair described and "no hat", so all 5
share ONE face/dress identity (only the hair differs — the runtime recolour then
carries her chosen colours). Packed with `scripts/packsheets.mjs` (idle rows
included) into `characters/heroine-<name>.sheet.*`:
- **bun** `04e2188c-4ac9-4d43-bc55-3e39f8c7d3ed` — *…warm chestnut-brown hair
  gathered in a neat round bun, no hat…*
- **short** `e06ed8f6-a529-489c-a119-a1b621eb77b5` — *…in a short neat bob, no hat…*
- **cropped** `c59950dd-d218-432c-a339-57193d651cba` — *…very short cropped
  chestnut-brown hair, no hat…* (the creation's "bald" id maps here — the closest
  hatless-minimal base).
- **ponytail** `fbe6ef39-359d-4824-aa7b-1afad7a5f9f0` — *…in a long flowing
  ponytail, no hat…* (its NE walk was rejected + regenerated; the accepted retry
  was merged into the export's `metadata.json` before packing).
Integration + the recolour bands + the honest coverage matrix are in §3
"Recolouring the heroine".

**Wave 6** (farm animals) — two shapes, both `view: low top-down`:
- **Quadrupeds** (`create_character`, v3, 68×68 except dog 56×56/cat 48×48,
  8-dir) + `animate_character` **walking only** (no idle template — these
  exports never had an `animating` folder at all, unlike the heroine): **cow**
  `7dd48ae3-6563-456b-bcdf-f1749599ef56`, template `horse` — *gentle dairy cow
  with a cream-and-caramel patched coat, soft pink muzzle, small curved horns,
  big kind eyes, rounded friendly body — cute cozy fantasy farm-game animal,
  warm color palette, soft dark outlines, charming and readable at small
  size*; **pig** `c0e5358e-79df-4500-8716-f94c9e7be3f8`, template `bear` —
  *plump pink farm pig with a curly tail, floppy ears, cheerful snout, …*;
  **sheep** `d2e9dad4-26fd-429e-a16b-4392cfbb0f3f`, template `dog` — *woolly
  cream sheep with a soft rounded fleece, dark face and legs, …*; **dog**
  `dfa08509-bbed-4e12-b78c-c9810769369b`, template `dog` — *friendly
  brown-and-white farm dog with a wagging tail, …* (banked, see §1 notes);
  **cat** `4b5c5966-2f6c-4816-96d6-3a1cd068e74a`, template `cat` — *small
  ginger farm cat with white paws, …* (banked). All five share the style
  suffix *"cute cozy fantasy farm-game animal, warm color palette, soft dark
  outlines, charming and readable at small size."*
  - **Slot-limited queueing split the walk animation across several sibling
    job folders** for cat/dog/pig — e.g. pig's `animate_character` calls landed
    as `walking` (south-east only) + `walking-d8196a65` (north-west/-east,
    south-west) + `walking-dd988e1a` (south) + `walking-e67eee01` (west/east/
    north), together covering all 8 directions with no overlap. Cow (single
    `walk` folder, all 8 dirs, 7 frames) and sheep (single `walking` folder, 6
    frames) came back whole. `scripts/packsheets.mjs`'s new
    `mergeSplitAnimations()` merges the split folders back into one animation
    before packing (see §4) — no manual metadata surgery needed this time.
- **Birds — rotations only, no skeleton/animation** (hen, duck): generated as
  8-directional objects (a bare `rotations/<dir>.png` per direction, no
  `metadata.json` at all — so no character id/prompt was recoverable for the
  ledger here, unlike every other entry in this section). Packed into a
  ROW-0-ONLY sheet by `packsheets.mjs`'s new metadata-less fallback (see §4).
  A moving bird has no walk frames to key off — see §1 notes for the
  code-driven waddle that stands in.

Integration (the dual-path bridge, scale/anchor table, and the bird-waddle
decision) is in `docs/WORKLOG.md`'s "Farmyard sprites" entry.

**Wave 7** (session 4, 2026-07-11 overnight run — the medium-final wave):
three new categories, each probed before its production batch. Costed
~520 gens total across the whole run (char matrix + ground + UI kit);
balance ~8,063 at the last meter (Tier 3, plan-time balance 8,583).

- **Character sprite matrix** (`create_character`, method A — probed and
  chosen over identity-preserving `create_character_state` edits, which
  cost ~20 gens each and can't be freely recombined): one fresh
  `create_character` per `(gender, hair, outfit)` combo at the MEDIUM
  body size, standard mode, **4-dir** rotations (not 8 — a deliberate cost
  cut, since the player only needs cardinal facing), ~1 gen/combo, plus
  `animate_character` `walking` (template) per combo, ~4 gens/combo. 2
  genders × 5 hairstyles × 5 outfits = 50 combos shipped this run (S/L
  body sizes queued next). Every combo's prompt holds ONE fixed
  per-gender face descriptor + one shared eye colour, specifically so
  combos read as siblings rather than drifting identities (faces DO drift
  subtly combo-to-combo regardless — accepted as fine for a "pick a look"
  creator, not a face-locked single heroine). **Hair is generated in a
  KEYED vivid purple** (not a natural colour) in every prompt — this is
  the single most load-bearing wording choice in the whole batch, since it
  gives `recolorSheet` an unambiguous hue band to retarget (see
  "Recolouring the matrix hair" above); natural browns were measured to
  bleed into skin/outfit hues the way the old heroine bands needed
  lightness+y-window gymnastics to work around. Packed with
  `scripts/packsheets.mjs --matrix <root>` (new mode, `packMatrix`/
  `packMatrixOne`) into `characters/matrix/matrix-<gender>-<hair>-<outfit>.sheet.{png,json}`
  on a 4-column cardinal grid (row 0 rotations, rows 1-6 walk), cell 68px,
  measured anchor. Supervisor spot-checked `male/ponytail-tunic` for
  coherence (reads as a clothed man in a sleeveless jerkin, not
  bare-chested) before shipping the full 50.
- **Ground production tile sets** (`create_tiles_pro`, `outline_mode:
  "segmentation"`, 32px square_topdown): 4 sets — grass, soil (tilled
  field), water, plaza (cobble) — 16 tiles each (64 total), re-rolled
  tighter/dimmer than the probe-2 mock per the production tuning notes in
  `docs/DECISIONS.md` "Ground medium" (base grass tonal range narrowed,
  daisies dimmed, ~75% plain tiles with sparse feature tiles). Verified
  against a full weighted-field composite mock (`scratchpad/ground-prod/
  final_mock.js`) before committing to production — the same mock's
  weighted-scatter bags and Bayer-dither edge technique were PORTED
  verbatim into `world/ground.ts`'s `paintTerrainTiles`. **Wang
  `topdown_tileset` was tried first and REJECTED** (auto-tiled grass
  always rendered lime-green, couldn't chain from `tiles_pro` output) —
  don't re-attempt that tool for ground without a new reason to believe
  it'll behave differently.
- **UI kit** (`create_ui_asset` for panels, `create_font` for the pixel
  font, `create_portrait_character` for busts): 2 panels shipped
  (`window` — the ornate wood+gold nine-slice frame; `tooltip` — a compact
  parchment panel) of 6 generated (`button`/`tabs`/`dialogue-panel` were
  generated but NOT shipped — see `docs/WORKLOG.md`'s "screens re-skin"
  entry Follow-ups for why: the gold CSS buttons/tabs already read as one
  family with the new font, and the dialogue window's CSS notch was judged
  simpler/more robust than nine-slicing around a baked notch); 1 font
  (`WildhearthStorybook`, warm pixel display face, TTF); 2 of 10 planned
  NPC portraits (`create_portrait_character` from each NPC's existing
  `characters/<npc>.sheet.png` south rotation crop) — Maren + Tobin
  shipped, the other 8 queued for the next generation day (recipe: crop
  the south-facing rotation frame out of the NPC's sheet, feed it as the
  portrait reference, `create_portrait_character`, drop the result at
  `ui/portraits/<npc-id>.png` — no code change, `npcPortraitUrl()` already
  resolves any id present).

---

## 3. Asset folder + manifest recipe

```
src/assets/pixellab/
  manifest.ts                     ← two eager globs; adding assets needs no edit
  characters/matrix/matrix-<gender>-<hair>-<outfit>.sheet.png  ← THE LIVE player
  characters/matrix/matrix-<gender>-<hair>-<outfit>.sheet.json   pipeline (session 4,
    50 atlases: 2 genders × 5 hair × 5 outfit, keyed-purple hair, 4-dir + walk.
    (The old `characters/heroine*.sheet.*` — 5 files, one identity + 4
    hairstyle bases — was DELETED, commit `d3fb35f`; superseded by the matrix.)
  characters/<npc-id>.sheet.png   ← one per townsfolk (10)
  characters/<npc-id>.sheet.json
  buildings/farmhouse.png              ← player farm (flat-front)
  buildings/farmhouse-neighbor.png     ← neighbour farm (established/prosperous)
  buildings/barn.png                   ← flat-front; shared by both farms
  buildings/market-stall.png           ← generic; farm's own stall + future recolor path
  buildings/stall-fish.png             ← the 4 themed market stalls (building-variety batch)
  buildings/stall-produce.png
  buildings/stall-goods.png
  buildings/stall-empty.png
  buildings/well.png                   ← flat-front
  buildings/cottage-01_thatch-plank-porch.png     ← 6 of 8 approved cottage variants
  buildings/cottage-02_slate-plaster-ivy.png
  buildings/cottage-03_redtile-stone-flowerbox.png
  buildings/cottage-04_shingle-timber-leanto.png
  buildings/cottage-05_thatch-plaster-flowerbox.png
  buildings/cottage-07_redtile-timber-ivy.png
  buildings/cottage-09_slate-whitewash-shutters.png   ← wave 8: coastal town homes (V2-B1b)
  buildings/cottage-10_shingle-bluetimber-buoys.png
  buildings/cottage-11_slate-brick-lantern.png
  buildings/spare/                     ← paid-for, unused this wave (see notes above)
  interior/hearth.png
  interior/room-backdrop.png
  interior/basin.png
  interior/bed.png
  interior/chair-crate.png
  animals/cow.sheet.{png,json}    ← 8-dir walk (7 frames); art/spriteAnimal.ts
  animals/pig.sheet.*                8-dir walk (6 frames each), same bridge
  animals/sheep.sheet.*
  animals/hen.sheet.*             ← ROTATIONS ONLY (8x1 grid, no walk row)
  animals/duck.sheet.*
  animals/cat.sheet.*             ← banked for the Pets block — not spawned
  animals/dog.sheet.*
  ground/grass/tile_0.png .. tile_15.png    ← session 4: 4 sets × 16 tiles (64
  ground/soil/tile_0.png .. tile_15.png       total), world/ground.ts paintTerrainTiles,
  ground/water/tile_0.png .. tile_15.png      weighted scatter + code Bayer-dither edges
  ground/plaza/tile_0.png .. tile_15.png
  ui/window.png                   ← W-UI: weathered timber+iron gump nine-slice frame (ring-cleaned), ui/skin.ts
  ui/button.png                   ← W-UI: wrought-iron button plate (taskbar/zoom border-image)
  ui/plate-anchored.png           ← W-UI: slim iron plate (anchored HUD chrome border-image)
  ui/tooltip.png                  ← parchment tooltip panel (cozy-era; superseded by CSS parchment for #prompt)
  ui/portraits/maren.png          ← 2 of 10 NPC busts (8 more queued)
  ui/portraits/tobin.png
(fonts live alongside, not under pixellab/: src/assets/fonts/WildhearthStorybook.ttf)
```
`<dir>` ∈ `south south-east east north-east north north-west west south-west`.

**Two asset shapes** (both on the dual-path fallback):
- **Loose single PNGs** (buildings, interior, one-off props) — drawn whole by
  `sprite(id)` / `drawGroundSprite()`. Adding one is "drop the PNG + rebuild".
- **Sheet atlases** (characters: the heroine + the 10 NPCs; animals: the 5
  livestock species + the 2 banked pets) — every character's 8 rotations +
  walk (+ the heroine's idle) frames are packed by `scripts/packsheets.mjs`
  into ONE `<name>.sheet.png` with a sibling `<name>.sheet.json` frame map.
  This exists because Vite base64-**inlines** sub-4KB PNGs into the JS bundle;
  a character's ~56–88 tiny frame PNGs bloated the bundle past the 500KB
  warning, whereas ONE atlas is emitted as a single hashed file that's
  fetched, not inlined (see §4 "Packing a character"). A ROTATIONS-ONLY sheet
  (hen/duck — no skeleton, so no walk/idle rows, just an 8-column row 0) is
  the same shape with an empty `anims` array; the packer synthesizes the frame
  map straight from a bare `rotations/<dir>.png` export with no
  `metadata.json` at all (see §4).

**Manifest** (`manifest.ts`): two eager globs —
`import.meta.glob("./**/*.png", {query:"?url"})` → `SPRITE_MANIFEST: {id,url}[]`
(`id` = path minus `.png`; a sheet's atlas lands under `characters/<name>.sheet`)
and `import.meta.glob("./**/*.sheet.json")` → `SHEET_MANIFEST: {id,data}[]`
(`id` = path minus `.sheet.json`, e.g. `characters/heroine`; `data` is the
parsed `SheetData`). **Adding a category is still "drop the files + rebuild"** —
the globs pick them up, no code change. An empty folder → both `[]` → every
`sprite()`/`spriteFrame()` returns `null` → all painters.

**Loader** (`art/sprites.ts`): `loadSprites()` runs once at boot, NON-BLOCKING;
`sprite(id)` returns the decoded `HTMLImageElement` or `null` until ready (or
forever if absent). `drawGroundSprite(g,img,groundX,groundY,anchorCol,footRow,
scale)` places a static sprite base-on-ground, centred on its anchor column, and
returns the sprite→world transform for overlays. For atlases:
`spriteFrame(sheetId, frameName)` → `{img, sx, sy, sw, sh} | null` (the atlas
image + a frame's source sub-rect, fed to the 9-arg `drawImage`), and
`sheetInfo(sheetId)` → the `SheetData` (cell size + measured foot anchor). The
draw bridges (`art/spriteChar.ts` heroine, `art/spriteNpc.ts` NPCs,
`art/spriteAnimal.ts` livestock) build frame keys `rot_<dir>` /
`walk_<dir>_<f>` / `idle_<dir>_<f>` and call `spriteFrame`. The animal bridge
reads a sheet's walk-frame COUNT off its own `anims` entry at runtime instead
of hardcoding one (unlike the NPC bridge, which hardcodes 6 — every NPC
happens to share that count, but the cow's walk export is 7 frames).

**Player bridge** (`art/spriteChar.ts`): `drawPlayerSprite` picks the frame
(8-dir facing from the movement vector + hysteresis; walk keyed to `player.dist`,
idle on a timer), draws the same shadows the rig would, and returns `false` for
uncovered poses/undecoded frames so the caller draws the rig.

**Animal bridge** (`art/spriteAnimal.ts`): `drawAnimalSprite(g, kind, animal)`
mirrors the NPC bridge (8-dir facing from the movement vector + hysteresis;
walk keyed to `animal.dist`) for cow/pig/sheep; hen/duck have no walk frames,
so a moving bird gets a small code-driven waddle (a canvas rotate + a y-offset,
both keyed to `animal.dist`) layered on top of its static rotation frame
instead. Facing/last-position are held in a `WeakMap` keyed by the entity
object itself (a flock has no stable string id the way NPCs do). Returns
`false` for no sheet / sprites off / undecoded frame, same contract as the
other two bridges.

### Aligning a new sprite (the recipe used here)
1. Measure the PNG's **alpha bounding box** (a tiny Node PNG decoder does it):
   the horizontal centre column and the bottom (foot/base) row.
2. **Character:** pick `scale` so the sprite's character height ≈ the rig's
   apparent height (the 84px heroine sheet = the rig height at `scale 1.0`).
   Place the foot row on the rig's ground line (`player.y + FOOT_DY`), centre on
   `player.x`.
3. **Static:** pick `scale` so the sprite's footprint ≈ the zone rect
   (HOUSE/BARN/R_HEARTH); place the base row on `rect.y + rect.h`, centre on the
   rect's centre. Roof/chimney overhang above the rect is fine.
4. `imageSmoothingEnabled = false` everywhere (crisp at any zoom). Verify feet/
   base alignment against the painter with an A/B screenshot.
5. **Full-bleed background** (e.g. the room backdrop), instead of a footprint
   object: skip the scale-to-rect step and place by OFFSET only — bottom- (or
   otherwise edge-) anchor the sprite flush with the scene rect's matching
   edge, letting any size mismatch "ride" past the opposite edge into
   whatever already paints beyond the scene bounds (a dark surround, in the
   interior's case). Cheaper than rescaling and keeps pixels crisp; only
   works when nothing important sits right at the mismatched edge.

### Recoloring part of a sprite (per-instance tint)
Some sprites need a per-instance color identity the art itself can't bake in
(the four market stalls' awnings all reuse ONE sprite). `recolorSprite(id,
img, targetHex, band)` (`art/sprites.ts`) does it without regenerating art: it
decodes the sprite onto an offscreen canvas, and for every pixel whose OWN
hue/saturation falls inside a `HueBand` (degrees, wrapping through 0/360 if
`hueMin > hueMax`, plus a saturation floor — measured from the source PNG's
own color histogram; see the market stall's `STALL_AWNING_BAND` in
`art/buildings.ts`), replaces its hue+saturation with the target color's
(keeping the pixel's own lightness, so the fabric's shading/stripe contrast
survives). Every pixel outside the band — wood, dark outlines, the
alternating cream stripe — is untouched. Computed once per `(id, color)` pair
and cached (a handful of small canvases, session-lifetime) — cheap to call
every frame. To measure a new band: dump a quantized color histogram of the
region to recolor vs. the rest of the sprite (a tiny node script — decode the
PNG, bucket pixel RGB→HSL, count) and look for a hue range that's distinct
from everything else at typical saturations.

### Recolouring the matrix hair (session 4 — see "Recolouring the heroine" below for the superseded system's per-region reasoning)
The player's look now comes from the curated sprite MATRIX (§2 Wave 7), not
the single-heroine multi-sheet system this whole subsection originally
described (kept below for the record — its measured hue/lightness/y-window
technique is the same one the matrix hair uses, just against a much
simpler target). Every matrix sheet's hair is generated in a **KEYED vivid
purple** (hue window 240–300°, sat > 0.35) specifically so the recolour
band is unambiguous — no natural hair colour shares that hue range with
skin/outfit, unlike the old heroine's all-warm-brown palette that needed
lightness + y-window separation. `recolorSheet` remaps the purple band to
one of 3 `HAIR_SHADES` (warm brown `#6e4a2b`, golden blonde `#c99a45`,
espresso `#241c16`), audited for **zero purple bleed** in the shipped
build. Skin recolour is shipped OFF for the same reason as the old heroine
system: the H&S remap preserves per-pixel lightness, so it can shift hue
but can't darken skin — a lightness-aware recolour approach is the
follow-up, not a flag flip.

### Recolouring the heroine (SUPERSEDED, hair + dress, per look — kept for its technique)
The player is one character across 5 hairstyle sheets, each painted the SAME
chestnut-hair / rust-dress / cream-apron identity; her Character-Creation hair +
dress colours are applied at runtime by `recolorSheet` (the multi-band cousin of
`recolorSprite` — several disjoint bands in one cached pass, each keeping
per-pixel lightness). `RecolorBand` adds two things a plain `HueBand` lacks and
both are load-bearing here: **lightness bounds** (`lMin`/`lMax`) and a **per-cell
vertical window** (`nyMin`/`nyMax`, a fraction of one atlas cell). This heroine
is almost entirely warm browns — hair, skin, dress, apron and boots all cluster
in ~0–50° hue — so hue alone can't separate them; lightness + a body-zone window
do the rest. Bands (`art/spriteChar.ts`, measured from the base sheets' HSL
histograms):

| Region | hue | sat≥ | lightness | cell y-window | maps to |
|---|---|---|---|---|---|
| **HAIR** (chestnut) | 13–28° | 0.30 | 0.12–0.44 | ny ≤ 0.52 (0.62 ponytail) | `hairColor` |
| **DRESS** (rust) | 349–14° (wraps) | 0.34 | 0.25–0.52 | ny ≥ 0.49 | outfit `torso` |
| **APRON** (cream) | 31–54° | 0.26 | 0.50–0.92 | ny ≥ 0.49 | outfit `accent` |

- **Hair** is separated from the lighter freckled **skin** (same hue) by the
  `lMax 0.44` value ceiling, and from the same-dark-brown **boots** by the
  head-zone `nyMax` (the ponytail's tail hangs lower, so it gets 0.62 not 0.52).
  A choice equal to the baked chestnut (`#5b3b22`) emits no op → pixel-identical.
- **Dress** is separated from hair/skin (both higher hue) by staying at the
  redder end, from the darker **boots** by the `lMin 0.25` floor, and from the
  **face** by `nyMin` (below the head). Skipped for the native work-dress so the
  default heroine is pixel-identical.
- **Skin is NOT recoloured** (honest exclusion). The face/hand skin band overlaps
  the eyes/mouth/apron-highlights/hair-highlights in HSL with no clean cut;
  recolouring it smears features. Verdict from measuring + rendering every tone:
  keep skin on the rig — a non-default skin tone draws the design-accurate rig.

**Honest coverage matrix** (`spriteCoversLook`): the sprite renders a look only
when it can do so faithfully; otherwise the rig (which wears her exact colours).

| Choice | Sprite-covered | → Rig |
|---|---|---|
| gender | female | male |
| hair style | hat, bun, short, ponytail, bald (→ cropped sheet) | — (all 5 covered) |
| hair colour | all 6 on the 4 hatless sheets (recoloured); hat = default only | hat + non-default colour |
| outfit | native work-dress + skirted styles (dress/tunic-skirt/shawl-dress/smock); dress→primary, apron→accent | **overalls** (bib+trousers) |
| skin | default tone only | the other 4 tones (skin recolour excluded) |
| build | ignored by the sprite (all builds draw the same frames) | — (rig honours build on fallback) |

To add a new hairstyle to the SUPERSEDED heroine system (kept for the
record only, not the live pipeline): generate + `packsheets.mjs` (idle rows
included) → `characters/heroine-<name>.sheet.*`, add the `HairStyle` id +
a `HERO_SHEETS` entry (its head-zone `hairYMax`). To add a dress colour: it
just works — a new outfit preset's `torso`/`accent` recolour with no code
change.

**To add a new hair style/outfit to the LIVE matrix** (session 4): generate
the combo per Wave 7's recipe below (keyed purple hair, fixed per-gender
face descriptor), `packsheets.mjs --matrix` to pack it in, add the id to
`MatrixHair`/`MatrixOutfit` in `art/spriteChar.ts` — no `HERO_SHEETS`-style
per-hairstyle band tuning needed, since every matrix sheet shares the same
keyed-purple hair band and the same outfit-region convention.

### Tuning knobs (`src/config.ts`)
`SPRITE_PLAYER_SCALE`, `SPRITE_HAIRSTYLE_SCALE` (the 4 alternate 92px hairstyle
sheets, rendered at the 84px hat heroine's apparent height), `SPRITE_PLAYER_FOOT_DY`,
`SPRITE_WALK_STRIDE`,
`SPRITE_IDLE_FPS`, `SPRITE_FACING_HYSTERESIS`, `SPRITE_HOUSE_SCALE`,
`SPRITE_BARN_SCALE`, `SPRITE_HEARTH_SCALE`, `SPRITE_ROOM_SCALE`,
`SPRITE_BASIN_SCALE`, `SPRITE_BED_SCALE`, `SPRITE_CHAIR_CRATE_SCALE`,
`SPRITE_STALL_SCALE`, `SPRITE_WELL_SCALE`, `SPRITE_COTTAGE_SCALE` (building-
variety batch — one scale for all 8 cottage variants, same 112×128 canvas).
Farm animals (wave 6): `SPRITE_ANIMAL_WALK_STRIDE`, `SPRITE_ANIMAL_SCALES`,
`SPRITE_ANIMAL_GROUND` (per-species `{dy,rx,ry}` ground/shadow geometry),
`SPRITE_BIRD_WADDLE_AMP`/`_TILT`/`_STRIDE`.
Dev A/B toggles: `__wh.spriteMode(on)` (player), `__wh.npcSpriteMode(on)`
(townsfolk), `__wh.animalSpriteMode(on)` (livestock) — buildings/interior/
stalls/well/cottages have no runtime toggle, only the load-or-not dual path.

---

## 4. How to regenerate / extend

### Packing a character into a sheet (`scripts/packsheets.mjs`)
Characters are drawn from a packed **atlas**, not loose frame PNGs (see §3 for
why). The packer (Node, `pngjs` devDep — build tooling only, never shipped)
turns a raw PixelLab character export into `<name>.sheet.png` + `.sheet.json`:

1. **Download + unzip** the character (`…/characters/<id>/download`) into an
   **untracked staging folder** (kept OUT of the repo — only the packed sheet is
   committed). The export is a `metadata.json` (v3) + `<Char>/rotations/<dir>.png`
   + `<Char>/animations/<anim>/<dir>/frame_00N.png`.
2. **Pack:** `node scripts/packsheets.mjs --src <stagingDir> --name <name>`
   (default `--out src/assets/pixellab/characters`; or `--all <stagingRoot>` to
   pack every subdir, name = subdir minus a trailing `_raw`). It reads the
   metadata frame map, asserts a uniform cell size, and writes a deterministic
   grid: **row 0** = the 8 rotations (columns in `dirs` order, south→south-west
   clockwise), then **one row per animation frame** (`walking`→`walk` 6 rows,
   `animating`→`idle` 4 rows) across the 8 direction columns. The JSON records
   `canvas` (cell px), `cols`/`rows`, `dirs`, `anims`, the per-frame source
   rects (keyed `rot_<dir>` / `walk_<dir>_<f>` / `idle_<dir>_<f>`), and a
   measured **`anchor {cx, footY}`** (union alpha-bbox centre column + ground
   row) the draw bridge uses to plant feet.
3. **Commit** only `<name>.sheet.png` + `<name>.sheet.json`; the loose frames
   stay in staging. To regenerate, re-download and re-pack — deterministic, so
   an unchanged export yields byte-identical output.

Two export-shape quirks the packer now absorbs automatically (both hit during
the farm-animal batch, wave 6 — see §2):
- **A walk animation split across several sibling job folders** (PixelLab's
  slot-limited animation queue: `walking`, `walking-<hex>`, `walking-<hex2>`,
  ... each covering a different subset of the 8 directions) — `packOne`'s
  `mergeSplitAnimations()` groups them by base name (strips the trailing
  job-id suffix) and merges the per-direction frame arrays before packing. A
  single-folder export (no split) passes through unchanged. If a direction
  ends up missing after the merge, packing throws with a clear error rather
  than silently shipping a gap.
- **A ROTATIONS-ONLY export with no `metadata.json` at all** (an 8-directional
  object with no skeleton — e.g. hen/duck): `findMetadata()` falls back to
  scanning a bare `rotations/<dir>.png` set and synthesizes the same frame-map
  shape with an empty `animations`, so the rest of the pipeline (incl. the
  merge above) never has to know the difference. Packs to a row-0-only sheet.

- **Regenerate a static** (e.g. redo the barn): `create_map_object` with the
  recorded prompt (tweak as needed), `get_map_object` until `completed`,
  **download immediately** (8h auto-delete), drop the PNG in place (same
  filename), re-measure the anchor if the silhouette moved, rebuild.
- **Regenerate a character (heroine or NPC) / add a variant**: `create_character`
  (reuse a prompt / character id as the style reference), `animate_character` for
  walk (+ idle for the heroine), download the zip into staging, and **re-pack**
  with `scripts/packsheets.mjs` (above) → `characters/<name>.sheet.png` + json.
  For a new PLAYER look add a coverage branch in `spriteCoversCharacter`; for a
  new NPC add its `NpcDef` (its sheet id is `characters/<npc.id>`) and a
  `SPRITE_NPC_SCALES` entry.
- **Add a new loose-PNG category** (single static images, no directions/
  animation — the buildings/interior recipe): drop the PNGs under a new
  `src/assets/pixellab/<category>/` folder, wire the draw site to
  `sprite("<category>/<id>")` with a painter fallback. No manifest edit needed.
- **Add a new animal species** (quadruped or bird — the `animals/` recipe,
  wave 6): pack into `src/assets/pixellab/animals/<kind>.sheet.*` (same packer,
  above — a rotations-only export packs fine with no `animations` at all).
  Add the kind to `AnimalKind` (`art/spriteAnimal.ts`), a `SPRITE_ANIMAL_SCALES`
  + `SPRITE_ANIMAL_GROUND` entry (`config.ts`, measured against the species'
  fallback rig preset in `animalRig.ts` the same way §1's table was built), and
  a dual-path draw wrapper in `art/characters.ts` (mirror `drawCow`/`drawHen`).
  A quadruped with no walk animation, or a bird, needs no extra code — the
  bridge already keys off whether `info.anims` has a `walk` entry.
- **Give an existing sprite a new per-instance color** (e.g. a 5th stall
  color): no new art — pass the new hex through `recolorSprite` (see above);
  only measure a new `HueBand` if the fabric/region to tint has changed.
- Keep the PNGs in the repo (they're small). Never hand-edit them; regenerate.

---

## 5. Generation costs

PixelLab account: **Tier 2 (Pixel Artisan)**, 5,000 subscription generations/mo,
$0.00 extra credits. **~198 used / ~4,800 remaining** as of the wave-3
integration — wave 1 (58: the heroine character + its walk & idle animations
across 8 directions + 3 map objects + a few style tests), wave 2 (+40: room
backdrop, basin, chair+crate, market stall, well, and the bed — 2 attempts,
the first rejected on review and retried — 7 objects total this wave), plus
wave 3 (+~100: the 10 townsfolk — each 2 (8 rotations, v3) + 8 (the walk
template across 8 directions) = ~10 gens; no idle template, decision S2-8).

**Wave 4 — building variety batch** (2026-07-07): 18 successful
`create_map_object` generations (1 gen each, all landing clean on the first
try — zero rejects/retries, the hardened flat-front guardrail wording worked
every time): the 4 flat-front replacements, 12 new stall variants (3 each ×
fish/produce/goods/empty), and 2 extra farmhouse variants (the neighbour's +
1 spare). The 8 cottage variants were REUSED from an earlier probe batch
(SCALING_DECISION.md Finding 3) at 0 additional generations — copied, not
regenerated. Session ledger delta was 27 (shared queue with other
concurrently-running agents per this batch's own brief; the 18-call count is
the reliable per-batch number). ~4,677 remaining after this wave.

**Wave 6 — farm animals** (2026-07-07): generated in a separate batch and
handed off gate-passed for this integration pass, so an exact per-call ledger
wasn't available here — estimating instead from the observed export shape
using this doc's own accounting below: 5 quadrupeds (cow/pig/sheep + the 2
banked pets, dog/cat) at the NPC's ~10-gens-each shape (2 rotations v3 + 8
walk directions) ≈ 50, though cat/dog/pig's walk needed 3–4 extra
`animate_character` submissions each to route around slot-limited queueing
(§2/§4) — up to ~30 more if a resubmission re-bills (unconfirmed either way);
hen/duck (rotations only, no walk template at all) are cheaper, roughly 2–8
gens each. Rough total this wave: ~60–100 gens — in the ballpark of this
doc's own pre-batch "~10–20 each" estimate below. Retune this line once the
account's actual usage delta for the batch is confirmed.

Rough per-category estimate for the rest of the plan (a generation ≈ one
direction of one frame/rotation, so animated characters dominate):
- **NPC** (8-dir, rotations + walk, NO idle — decision S2-8): **~10 gens** each
  (2 rotations v3 + 8 walk directions). 10 townsfolk ≈ 100 — measured, the whole
  roster this wave. (With an idle template, like the heroine, ~18 each.)
- **Farm animals** (fewer directions / simpler): ~10–20 each — see wave 6 above.
- **Buildings / large props / furniture** (`create_map_object`, 1 image):
  **~1–3 gens** each; ~10–15 planned ≈ 20–45.
- **Tiles / tilesets** (if ever used): a few dozen for a full ground set.

Even the full NPC roster + a generous prop set (~600–800 gens) sits well inside
the monthly 5,000 — **not a constraint**. Batch within a month; map objects must
be downloaded within 8 hours of generation.

**Wave 7 — the medium-final overnight run** (2026-07-11, session 4): account
upgraded to **Tier 3** by this point (plan-time balance 8,583). ~520 gens spent
across the whole run: the character sprite matrix (50 combos × ~5 gens each —
1 rotation gen + ~4 walk-template gens — ≈ 250), the 4 ground tile sets (64
tiles total, `create_tiles_pro`, plus the earlier probe-1 Wang-tileset attempt
that was rejected and re-spent on probe-2 `tiles_pro`), and the UI kit (6
`create_ui_asset` panels generated for 2 shipped, 1 `create_font`, 2
`create_portrait_character` busts). Balance ~8,063 at the last meter —
comfortably inside the run's own ≤1,500/day pacing rule. Next generation day's
planned spend: 8 more NPC portraits (~8-16 gens), S/L body sizes for the
character matrix (+100 combos ≈ +500 gens incl. walks), and a lightness-aware
skin recolour mechanism (0 gens — a code change, not a new generation).

**Wave 8 — coastal town-home variants** (2026-07-14, V2-B1b): **3
`create_map_object` generations, all clean on the first try** (the wave-4
flat-front guardrail wording again, verbatim; 112×128, high top-down, high
detail, selective outline, medium shading). Fixes an everything-pixels
violation: 3 of the 5 coastal-town homes were seed-driven CODE cottages
clashing next to sprite neighbours. The 3 new variants are coastal-flavored so
the town reads different from the farm market: `cottage-09_slate-whitewash-
shutters.png` (whitewashed stone, blue shutters, hanging net), `cottage-10_
shingle-bluetimber-buoys.png` (weathered blue timber, rope-hung buoys),
`cottage-11_slate-brick-lantern.png` (red-brown brick, ship lantern) — wired
as `COTTAGE_SPRITES` variants 9–11 (alpha-bbox-measured anchors, like 6/8),
assigned to `TOWN_HOMES` in `zones.ts`; the seed-keyed code painter stays the
zero-PNG fallback. Balance metered 7,030 → **7,027 remaining** (Tier 3).
