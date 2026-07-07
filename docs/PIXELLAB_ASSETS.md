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
| **Heroine player** (female) — 5 hairstyle sheets, each 8-dir walk + idle, with runtime hair/dress recolour | **Sprite** | `characters/heroine{,-bun,-short,-cropped,-ponytail}.sheet.png` → `art/spriteChar.ts` |
| **Townsfolk** — the 10 NPCs, each 8-dir walk + static rotations | **Sprite** | `characters/<id>.sheet.png` → `art/spriteNpc.ts` |
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
- The heroine sprite only covers the **walk** and **idle** poses. Action poses
  (fishing/hoeing/foraging/busking/sleeping) have no generated animation and
  fall back to the code rig (`art/rig.ts`) per-frame, seamlessly.
- The heroine sprite covers **her created look** — 5 hairstyle sheets picked
  from `appearance.hair`, with her hair + dress colours recoloured onto the base
  at runtime (`spriteCoversLook`/`buildOps` in `art/spriteChar.ts`). What's
  sprite-covered vs. rig-drawn is the honest matrix in "Recolouring the heroine"
  (§below). Male, an excluded outfit/skin, or any pose without a generated
  animation draws the rig — which wears her exact chosen colours, so an excluded
  look still matches her design.
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

---

## 3. Asset folder + manifest recipe

```
src/assets/pixellab/
  manifest.ts                     ← two eager globs; adding assets needs no edit
  characters/heroine.sheet.png    ← the HAT hairstyle (ONE packed atlas, was 88 loose PNGs)
  characters/heroine.sheet.json   ← its frame map + anchor (scripts/packsheets.mjs)
  characters/heroine-bun.sheet.*      ← 4 more hairstyle bases (bun/short/cropped/
  characters/heroine-short.sheet.*      ponytail), same face/dress identity, 92px
  characters/heroine-cropped.sheet.*    cells; hair id → sheet in art/spriteChar.ts
  characters/heroine-ponytail.sheet.*   (bald → cropped). Hair/dress recoloured at runtime.
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

### Recolouring the heroine (hair + dress, per look)
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

To add a new hairstyle: generate + `packsheets.mjs` (idle rows included) →
`characters/heroine-<name>.sheet.*`, add the `HairStyle` id + a `HERO_SHEETS`
entry (its head-zone `hairYMax`). To add a dress colour: it just works — a new
outfit preset's `torso`/`accent` recolour with no code change.

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
