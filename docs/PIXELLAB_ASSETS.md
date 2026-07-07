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

## 1. What's sprite-sourced today (vs code-drawn)

| Visual | Source | Where |
|---|---|---|
| **Heroine player** (default female) — 8-dir walk + idle | **Sprite** | `characters/heroine/` → `art/spriteChar.ts` |
| **Farmhouse** (repaired base) | **Sprite** | `buildings/farmhouse.png` → `art/buildings.ts` `drawHouse` |
| **Barn** (repaired base) | **Sprite** | `buildings/barn.png` → `art/buildings.ts` `drawBarn` |
| **Hearth** (interior cook spot) | **Sprite** | `interior/hearth.png` → `art/interior.ts` |
| **Interior room backdrop** (floor + walls + window) | **Sprite** | `interior/room-backdrop.png` → `art/interior.ts` `drawInterior` |
| **Wash basin** (interior) | **Sprite** | `interior/basin.png` → `art/interior.ts` `drawInterior` |
| **Bed** (interior) | **Sprite** | `interior/bed.png` → `art/interior.ts` `drawInterior` |
| **Chair + crate table** (interior rest corner) | **Sprite** | `interior/chair-crate.png` → `art/interior.ts` `drawInterior` |
| **Market/farm stall** (base + roof; awning re-tinted per stall) | **Sprite** | `buildings/market-stall.png` → `art/buildings.ts` `drawStall` |
| **Market well** | **Sprite** | `buildings/well.png` → `art/buildings.ts` `drawWell` |
| Everything else — NPCs, animals, crops/trees/bushes, cottages, outhouse, dock, market ground, weather/particles, UI, tools, stall goods/signs (a code overlay on the stall sprite — see notes), the player's non-walk/idle poses (fishing/hoeing/foraging/busking/sleeping) | **Code-drawn** | `src/art/*` |

Notes:
- The heroine sprite only covers the **walk** and **idle** poses. Action poses
  (fishing/hoeing/foraging/busking/sleeping) have no generated animation and
  fall back to the code rig (`art/rig.ts`) per-frame, seamlessly.
- The heroine sprite only covers the **default female appearance**
  (`spriteCoversCharacter` in `art/spriteChar.ts`). Male or any customised
  look draws the rig.
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
- The four market stalls (+ the farm's own stall, same `drawStall`) share ONE
  sprite, re-tinted per stall via `recolorSprite` (hue/saturation swap on the
  awning fabric only — see §3's "Recoloring part of a sprite"). The goods on
  the counter (fish/produce/goods/empty) stay a code-drawn overlay on both
  paths — the sprite's own shelf art is generic, so the overlay is what makes
  each stall read as fish-buyer / produce / general / empty.
- **Bed**: the first generation read as a bench on review and was rejected;
  the retry clearly reads as a straw bed with a blanket and was integrated
  (see §2 for both object ids).

---

## 2. The proven workflow

**Style anchor.** One warm "cute cozy fantasy farm-game" look: warm palette,
soft dark outlines, readable at small size, **low top-down** view. Anchor every
new asset to it by (a) reusing the heroine **character id** below as the visual
reference and (b) repeating the palette/outline descriptors in the prompt.

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

---

## 3. Asset folder + manifest recipe

```
src/assets/pixellab/
  manifest.ts                     ← two eager globs; adding assets needs no edit
  characters/heroine.sheet.png    ← ONE packed atlas (was 88 loose PNGs)
  characters/heroine.sheet.json   ← its frame map + anchor (scripts/packsheets.mjs)
  buildings/farmhouse.png
  buildings/barn.png
  buildings/market-stall.png
  buildings/well.png
  interior/hearth.png
  interior/room-backdrop.png
  interior/basin.png
  interior/bed.png
  interior/chair-crate.png
```
`<dir>` ∈ `south south-east east north-east north north-west west south-west`.

**Two asset shapes** (both on the dual-path fallback):
- **Loose single PNGs** (buildings, interior, one-off props) — drawn whole by
  `sprite(id)` / `drawGroundSprite()`. Adding one is "drop the PNG + rebuild".
- **Sheet atlases** (characters: the heroine + the 10 NPCs) — every character's
  8 rotations + walk (+ the heroine's idle) frames are packed by
  `scripts/packsheets.mjs` into ONE `<name>.sheet.png` with a sibling
  `<name>.sheet.json` frame map. This exists because Vite base64-**inlines**
  sub-4KB PNGs into the JS bundle; a character's ~56–88 tiny frame PNGs bloated
  the bundle past the 500KB warning, whereas ONE atlas is emitted as a single
  hashed file that's fetched, not inlined (see §4 "Packing a character").

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
draw bridges (`art/spriteChar.ts` heroine, `art/spriteNpc.ts` NPCs) build frame
keys `rot_<dir>` / `walk_<dir>_<f>` / `idle_<dir>_<f>` and call `spriteFrame`.

**Player bridge** (`art/spriteChar.ts`): `drawPlayerSprite` picks the frame
(8-dir facing from the movement vector + hysteresis; walk keyed to `player.dist`,
idle on a timer), draws the same shadows the rig would, and returns `false` for
uncovered poses/undecoded frames so the caller draws the rig.

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

### Tuning knobs (`src/config.ts`)
`SPRITE_PLAYER_SCALE`, `SPRITE_PLAYER_FOOT_DY`, `SPRITE_WALK_STRIDE`,
`SPRITE_IDLE_FPS`, `SPRITE_FACING_HYSTERESIS`, `SPRITE_HOUSE_SCALE`,
`SPRITE_BARN_SCALE`, `SPRITE_HEARTH_SCALE`, `SPRITE_ROOM_SCALE`,
`SPRITE_BASIN_SCALE`, `SPRITE_BED_SCALE`, `SPRITE_CHAIR_CRATE_SCALE`,
`SPRITE_STALL_SCALE`, `SPRITE_WELL_SCALE`. Dev A/B toggle:
`__wh.spriteMode(on)` (the player sprite only — buildings/interior/stalls/well
have no runtime toggle, only the load-or-not dual path).

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

- **Regenerate a static** (e.g. redo the barn): `create_map_object` with the
  recorded prompt (tweak as needed), `get_map_object` until `completed`,
  **download immediately** (8h auto-delete), drop the PNG in place (same
  filename), re-measure the anchor if the silhouette moved, rebuild.
- **Regenerate the heroine or add a variant**: `create_character` (reuse the
  prompt / character id as the style reference), `animate_character` for walk +
  idle, download the zip, flatten into a new `characters/<name>/` folder, add a
  coverage branch in `spriteCoversCharacter` if it's a new player look.
- **Add a new category** (e.g. NPC sprites, farm animals): generate, drop the
  PNGs under a new `src/assets/pixellab/<category>/` folder, wire the draw
  site to `sprite("<category>/<id>")` with a painter fallback. No manifest
  edit needed.
- **Give an existing sprite a new per-instance color** (e.g. a 5th stall
  color): no new art — pass the new hex through `recolorSprite` (see above);
  only measure a new `HueBand` if the fabric/region to tint has changed.
- Keep the PNGs in the repo (they're small). Never hand-edit them; regenerate.

---

## 5. Generation costs

PixelLab account: **Tier 2 (Pixel Artisan)**, 5,000 subscription generations/mo,
$0.00 extra credits. **98 used / 4,902 remaining** as of this integration —
wave 1 (58: the heroine character + its walk & idle animations across 8
directions + 3 map objects + a few style tests) plus wave 2 (+40: room
backdrop, basin, chair+crate, market stall, well, and the bed — 2 attempts,
the first rejected on review and retried — 7 objects total this wave).

Rough per-category estimate for the rest of the plan (a generation ≈ one
direction of one frame/rotation, so animated characters dominate):
- **NPC** (8-dir, rotations + walk + idle, like the heroine): **~18–40 gens**
  each. 10 townsfolk ≈ 200–400.
- **Farm animals** (fewer directions / simpler): ~10–20 each.
- **Buildings / large props / furniture** (`create_map_object`, 1 image):
  **~1–3 gens** each; ~10–15 planned ≈ 20–45.
- **Tiles / tilesets** (if ever used): a few dozen for a full ground set.

Even the full NPC roster + a generous prop set (~600–800 gens) sits well inside
the monthly 5,000 — **not a constraint**. Batch within a month; map objects must
be downloaded within 8 hours of generation.
