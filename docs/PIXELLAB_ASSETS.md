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
| Everything else — NPCs, animals, crops/trees/bushes, cottages, stalls, well, outhouse, dock, market, ground, weather/particles, UI, tools, the player's non-walk/idle poses (fishing/hoeing/foraging/busking/sleeping) | **Code-drawn** | `src/art/*` |

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

---

## 3. Asset folder + manifest recipe

```
src/assets/pixellab/
  manifest.ts                     ← one eager URL glob; adding PNGs needs no edit
  characters/heroine/
    rot_<dir>.png                 (8)   e.g. rot_south.png … rot_north-east.png
    walk_<dir>_0..5.png           (48)
    idle_<dir>_0..3.png           (32)
  buildings/farmhouse.png
  buildings/barn.png
  interior/hearth.png
```
`<dir>` ∈ `south south-east east north-east north north-west west south-west`.

**Manifest** (`manifest.ts`): `import.meta.glob("./**/*.png", { eager:true,
query:"?url", import:"default" })` → `SPRITE_MANIFEST: {id,url}[]`, where
`id` = the path under `pixellab/` minus `.png` (e.g. `characters/heroine/
walk_south_0`, `buildings/farmhouse`, `interior/hearth`). **Adding a category is
"drop the PNGs + rebuild"** — the glob picks them up, no code change. An empty
folder → `[]` → every `sprite()` returns `null` → all painters.

**Loader** (`art/sprites.ts`): `loadSprites()` runs once at boot, NON-BLOCKING;
`sprite(id)` returns the decoded `HTMLImageElement` or `null` until ready (or
forever if absent). `drawGroundSprite(g,img,groundX,groundY,anchorCol,footRow,
scale)` places a static sprite base-on-ground, centred on its anchor column, and
returns the sprite→world transform for overlays.

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

### Tuning knobs (`src/config.ts`)
`SPRITE_PLAYER_SCALE`, `SPRITE_PLAYER_FOOT_DY`, `SPRITE_WALK_STRIDE`,
`SPRITE_IDLE_FPS`, `SPRITE_FACING_HYSTERESIS`, `SPRITE_HOUSE_SCALE`,
`SPRITE_BARN_SCALE`, `SPRITE_HEARTH_SCALE`. Dev A/B toggle: `__wh.spriteMode(on)`.

---

## 4. How to regenerate / extend

- **Regenerate a static** (e.g. redo the barn): `create_map_object` with the
  recorded prompt (tweak as needed), `get_map_object` until `completed`,
  **download immediately** (8h auto-delete), drop the PNG in place (same
  filename), re-measure the anchor if the silhouette moved, rebuild.
- **Regenerate the heroine or add a variant**: `create_character` (reuse the
  prompt / character id as the style reference), `animate_character` for walk +
  idle, download the zip, flatten into a new `characters/<name>/` folder, add a
  coverage branch in `spriteCoversCharacter` if it's a new player look.
- **Add a new category** (e.g. NPC sprites, a well): generate, drop the PNGs
  under a new `src/assets/pixellab/<category>/` folder, wire the draw site to
  `sprite("<category>/<id>")` with a painter fallback. No manifest edit needed.
- Keep the PNGs in the repo (they're small). Never hand-edit them; regenerate.

---

## 5. Generation costs

PixelLab account: **Tier 2 (Pixel Artisan)**, 5,000 subscription generations/mo,
$0.00 extra credits. **58 used / 4,942 remaining** as of this integration
(the heroine character + its walk & idle animations across 8 directions + the 3
map objects + a few earlier style tests).

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
