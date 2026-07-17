# Wildhearth — Product Decisions (from design sessions)

**How to read this:** every entry has v1 (what to build now) and v5 (product-complete vision).
If a topic only lists v1, it means v5 = the maximum reasonable version of that thing.

---

## The character
- **Character creation screen** — dedicated, with all choices below
- **Age:** 18+, chosen on screen
- **Gender:** male/female binary
- **Appearance:** curated preset set in v1 (skin/hair/eyes/body/height). v5 = full Sims-style spectrum
- **Name:** first + last + optional nickname
- **Backstory:** none in v1. v5 = multiple backstories tied to personality/life-goals
- **Starting Path:** player picks one — Fisher / Farmer / Musician / Animal-Keeper — gets both a starter-kit AND a preferred skill
- **Personality system:** none in v1. v5 = full personality axes with in-game evolution
- **Life-goal (Aspiration):** short list in v1 (family / independence / community — TBD which). v5 = full multi-goal system, player picks single OR multiple
- **Prior life:** unemployed before arriving at the farm
- **Multi-character (Sims-style multiple playable characters):** v5+, not v1
- **Appearance change during play:** in-house wardrobe, in-town hairdresser (when town exists), in-market clothes stall. 5 outfits per gender, start with one, buy others. v5 = tattoos, makeup, full customization

## Opening flow (after "New Game" click)
Order: Character Creation → Guidance Mode selection → straight to farm (no cutscene in v1)
- **Guidance Mode:** three options — Tutorial (step-by-step) / Aspiration (goal-driven, background) / None (fully free)
- **Switching Guidance Mode:** can leave Tutorial anytime → Aspiration/None. Cannot return to Tutorial (one-shot)
- **Starting point:** outside the house, early morning
- **Starting season:** spring
- **Time behavior:** in Tutorial time pauses per step. Aspiration/None = time flows immediately
- **Tutorial style:** transparent bubbles, explicit "Skip Tutorial" button on every step
- **Tutorial first step:** UI orientation (movement, action, selling, saving)
- **Tutorial save behavior:** state saved. Next load asks "continue Tutorial?" or "switch to Aspiration/None"
- **Starting kit:** 50 coins + path-specific tools + one outfit + 2-3 days of food

## World
- **Areas in v1:** the farm + adjacent stall-road area (multiple distinct stalls) + small forest passage + lake/river area
- **Areas at v5:** all the above + town + true forest + mountains + expanded world (northern/southern regions)
- **World structure:** network with multiple roads from farm to different directions
- **Direction mapping from farm:** TBD — separate design task
- **Size v1:** medium-to-large (Stardew-to-UO scale — hours of walking end-to-end)
- **Transitions:** open world, no loading screens
- **Camera:** fixed continuous follow (v1). Rotatable camera at v5
- **Locked areas:** mostly open world, few locked points (caves, protected zones)
- **Seasons:** 4 full seasons active from v1
- **Season length:** player setting (default 10 days)
- **In-game hours:** 24 full hours, can act at night
- **Sleep:** any hour. Physical needs continue during sleep. Tired = long sleep, not tired = short
- **Sleep locations v1:** home only. v5 = home + friends' houses + inn
- **Wildlife in world:** migratory, changes with seasons (spring butterflies, summer birds, winter mammals)
- **Foraging resources:** trees + minerals + wild herbs + earth-mineral deposits
- **Weather v1:** full — clear/cloudy/rain/storm/fog. Active at night too. Affects gameplay
- **Festivals v1:** one festival, day 15 of season, in the stall-area
- **v5 festivals:** four (one per season)
- **Mine location:** unresolved — open decision

## Town & NPCs
- **v1:** 10 NPCs. v5: 50+
- **NPC depth v1:** name + profession + personality + daily schedule + work/role
- **NPC depth v5:** + family + backstory + individual preferences + Heart Events + full inter-NPC relationships
- **Schedule v1:** varies by day-of-week. v5: also reacts to season + weather
- **Families v1:** independent NPCs (no families). v5: full families with children
- **Marriage/romance:** open to all NPCs of appropriate age, all gender combinations
- **Romantic NPCs v1:** 3-4. v5: all appropriate-age NPCs
- **NPC mix v1:** blend of profession-based AND personality-based (both types)
- **Story-arcs:** none in v1 directly, but NPCs lead player to stories via quest-chains at v5
- **Language:** English only. Other languages TBD
- **Dialogue v1:** choice-based (2-3 responses per turn)
- **Dialogue v5:** deep dialogue trees with branches affecting relationships/memory/future
- **AI in dialogue v1:** dynamic AI-driven natural conversation
- **AI in dialogue v5:** each choice leads to different narrative path with consequences
- **Relationship v1:** 2 axes (Friendship + Romance 0-100) + gift preferences
- **Relationship v5:** + event memory + Heart Events + NPC-to-NPC relationships + reputation impact + rumors
- **Marriage v1:** no marriage. v5: marriage + children + shared pets + full family
- **Gifts v1:** 5-tier preferences (loved/liked/neutral/disliked/hated). v5: contextual preferences (season/weather/specific-item)
- **Pet acquisition:** in-town/adoption during play, not at start

## Day-in-game & needs
- **Needs v1:** hunger, thirst, energy, hygiene, bathroom, mood, social
- **Collapse at zero:** temporary — costs coins (no death)
- **Needs v5+:** + full health system with diseases and injuries
- **Needs rate:** affected by actions + season + weather (realistic simulation)
- **Livelihoods:** through gameplay actions themselves. No NPC-issued salaries
- **Need reminders:** engine + visual warnings + NPCs commenting ("you look tired")
- **Sleep enforcement:** none — player chooses when
- **Housemates v1:** player lives alone
- **Housemates v5:** partner + children + pet
- **Daily missions:** depends on Guidance Mode (Tutorial=step-by-step, Aspiration=background-related, None=none)
- **End-of-day summary:** player setting — none/quick/full-with-achievements
- **Pause:** dedicated button + auto-pause during dialogue/important events
- **Real-time to in-game day:** based on player's day-length setting. Tutorial pauses game-time per step
- **Time organizer:** weekly, 7 days (Sunday-Saturday). Day of week affects NPC schedules and market days
- **Market day v1:** open every day. v5: special market days, week-long fairs, harvest festival
- **Special events display (Heart Events, quests):** live animation + journal entry + achievement tracker
- **Hiring NPCs to work for you:** not in v1, arrives v3+

## Work & professions
- **Skills v1:** 8 — Fishing, Farming, Foraging, Music, Cooking, Animal-Keeping, Renovation, Ornamental-Gardening
- **Skills v5:** 21 full skills per ROADMAP_EXPANSION appendix
- **Score system v1:** 0-100 per skill + tiers (Novice/Skilled/Expert). v5: + specializations, records
- **Skill gain:** use + success/failure + paid training with NPC trainers
- **Decay:** unused skills decay slowly
- **Overall cap:** yes, forces specialization (UO-style)
- **Skill locking:** player can lock/mark-descending (UO classic)
- **Actions design (universal principle):**
  - Simple formula-based (no complex minigames)
  - Smart choices affect outcome: bait, tool, location, season, time-of-day
  - Rarity comes from context knowledge, not luck
  - Better tools = better odds
  - Each collection: 20 varieties in v1, 50+ at v5
- **All 8 skills available day one** (kit + preferred skill from starting path)
- **Music profession:** requires instrument + skill training. Path "Musician" gets both free
- **Music income v1:** only at stall-area

## Trade & economy
- **Currency:** single — "coins"
- **Bank/storage v1:** backpack only. v3+: house storage (cabinets, boxes, wardrobes) + items as decorations (Sims + UO hybrid)
- **Prices v1:** fixed. v5: fully dynamic (season + supply + demand + reputation)
- **Haggling v1:** no. Fixed price. Haggling skill = v3+
- **Player's stall lives in the TOWN (owner directive 2026-07-11):** her own
  buy/sell stall moved out of the market's west edge into the coastal town
  (`STALL` in `zones.ts`, now on the `TOWN_STREET` plaza just east of
  `TOWN_SQUARE`) — the town is the game's commercial heart where NPCs come to
  her shop. The customers-to-your-stall loop now draws its walk-up buyers from
  town-present townsfolk (schedule state `"town"`), and `townVisitsToday`
  (`schedule.ts`) was broadened so a real afternoon crowd (Finn + Jonas daily,
  Bram/Liora Tue/Thu, Henrik Wed) strolls the town street to buy. The old
  market-west spot is dressed with a delivery cart + crate so it doesn't read
  empty. Mechanic (flat buy/sell + premium customers) unchanged.
- **Selling paths (universal principle):**
  1. Your own stall (in the town) — primary. v3+ can hire employee
  2. NPC stalls of matching specialty (fisher-stall buys fish, produce-stall buys crops)
  3. Town (v3+)
  - Priority: your stall → specialty stall → other stalls (may refuse)
  - Direct sale to random NPCs = NO, unless that NPC has their own trading business in that area (like the Fisherwoman at the lake)

## HUD, screens, UI
- **HUD content:** small fixed items always visible (clock, coins, need icons). Player-configurable side panel for opening (mood, backpack, skills, map, journal, NPC messages, anything else)
- **Screen behavior:** drag-open, minimize, close (UO/Sims style — this is what's already in code, don't rebuild)
- **Screen close:** X button + clicking outside the screen
- **Backpack display:** grid of icons with details (UO/Sims/The Last of Us style)
- **Skills display:** list with value + tier (standard game convention)
- **Map v1:** simple with areas. v3+: NPCs live on it + personal markers
- **Settings entry:** ⚙️ button in HUD
- **Save button:** separate icon in HUD
- **NPC dialogue display:** bubble OR bottom-box — Fable's choice per style
- **System notifications:** matches dialogue style — Fable's choice
- **Fonts/visual style:** Fable's choice — should match "3/4 rich Cute Fantasy" aesthetic

## Save
- Automatic every 10 real minutes
- Manual save available via HUD icon
- One save slot in v1. Second slot in v5

## Exit menu
Three options: "Exit to main menu" + "Exit fully" + "Switch to another game" (implies save slots / multi-character future)

## Aesthetic direction
- **Style:** rich 3/4 top-down (Stardew Valley depth level)
- **Not:** true isometric, not 3D, not flat top-down
- **Reference aesthetic:** Cute Fantasy pixel-art — visible dark outlines, warm palette, multi-tone tree canopies, elliptical shadows on entities, diagonal cast shadows on tall objects, textured tilled soil, weathered vs repaired variants
- **Language:** English

## Art medium division — characters vs. world (decided 2026-07-10, session 3)
**SUPERSEDED for characters — see "Art medium division — FINAL FLIP (session
4, 2026-07-11)" below.** The ground/ambient half of this entry (sprites for
environment, code for open ground) also moved on in session 4 (ground is now
PixelLab tiles, not code-painted — see the FINAL FLIP entry). Kept in full,
not deleted, because the reasoning below (why PixelLab alone couldn't power
character creation) is exactly what session 4's curated MATRIX approach
solves differently — worth reading both entries together.

The single most important art-direction call: the visual world is ONE
coherent pixel-art language, but it is produced by TWO pipelines, split by
subject, not mixed arbitrarily. "No middle" — never a jarring patchwork of
sprite objects sitting next to code-drawn objects.
- **Characters (player + all 10 NPCs) render via the upgraded code rig**
  (`src/art/rig.ts`) — decomposed, fully parametric (build/skin/hair/outfit/
  age + eyeColor + a "long" hairstyle), elevated to sprite-competitive
  quality (3-tone per-material shading, expressive face, volumetric hair,
  cloth detail).
- **The environment (buildings, animals, props, trees, crops, items) uses
  PixelLab sprites**, dual-path over their code painters as always.
- **Why the split (two decisive probes):**
  1. *Character-layering probe* — PixelLab structurally CANNOT decompose a
     character. It emits baked full-body sprites, exposes no isolated hair/
     outfit layers, and gives no cross-generation skeleton registration
     (fresh gens drift identity; identity-preserving edits cost ~20 gens
     each and can't be freely combined — 50 outfits × 5 hair ≈ 5,000 gens).
     So sprites CANNOT power the character-creation pillar. Only a
     decomposed code rig can.
  2. *Rig-upgrade spike* — the code rig CAN be lifted to sprite-competitive
     quality while staying parametric, so nothing is lost by choosing it for
     characters.
- **Coherence is preserved** because the rig is drawn in the SAME pixel-art
  language as the sprites: nearest-neighbour, dark single-colour outline,
  warm muted palette, 3-tone shading — "hand-crafted characters over a
  sprite environment," one world.
- **The PixelLab character sprites are kept as an off-by-default FALLBACK**
  (dual-path, not deleted), toggled by `CHARACTER_SPRITES_PRIMARY` in
  `src/config.ts`. Shipped as commit `2ed29dc`.
- **Variety for the sprite WORLD** (no third-party downloads — CLAUDE.md
  rule 1): PixelLab generates multiple cheap variants per species (proven:
  8 farmhouses / 9 gens) + runtime jitter (hue/scale/flip per position
  seed). Tree/crop sprite batches are the next environment work.

## Art medium division — FINAL FLIP: characters = curated PixelLab sprite matrix (decided 2026-07-11, session 4 / overnight run)
Owner reversed the session-3 code-rig decision after reviewing it in play:
three concrete complaints (the rig's side-profile nose read way too long,
male and female looked like the same character, long hair drew in front of
the body) all trace back to the rig, not to anything sprite-related.
Tier-3 PixelLab funded the generation cost. **This is the decision CLAUDE.md
hard rule #1 and docs/VISION.md now describe as current.**

- **D-1 Characters = a curated PixelLab sprite matrix**: 2 genders × 3 body
  sizes (S/M/L) × 5 hairstyles × 5 outfits. Session 4 shipped the MEDIUM
  size row only (2×5×5 = 50 combos); S/L are queued next generation day.
  3 hair shades + skin tones apply via RUNTIME recolor (`recolorSheet`),
  never regenerated per shade. Hair is generated in a KEYED unnatural vivid
  purple specifically so the recolor pass has a clean band to retarget —
  natural browns were measured to bleed into outfit colors.
- **Pipeline method (probed, not guessed):** method A — one fresh
  `create_character` per combo (standard mode, 4-dir), ~1 gen/combo; walk
  via template `animate_character`, ~4 gens/combo. Faces drift subtly
  combo-to-combo (they read as siblings, not clones) — accepted as fine for
  a "pick a look" creator; mitigated with a FIXED face descriptor per
  gender + one shared eye color. A face-locked heroine (via
  `create_character_state`, ~481 gens) is a possible future upgrade, not
  done — "expand when we want" (owner).
- **The code rig is now the fallback, not the shipped look** — the reverse
  of session 3's framing. It stays wired as the zero-PNG dual-path fallback
  (CLAUDE.md rule 1): the game must still boot and play with the sprite
  folder emptied.
- **Shipped:** commit `0c7aea2` ("character — curated sprite matrix becomes
  the shipped player look", R1). `CHARACTER_SPRITES_PRIMARY` flips meaning —
  it now gates the matrix + NPC-sprite path being primary. Character
  Creation exposes 5 hair / 5 outfit / 3 shade; skin-tone recolor shipped
  OFF (the recolor mechanism preserves lightness and can't darken skin —
  an honest limitation, not a bug) and body-size S/L show "coming soon"
  until the next generation wave.

## Ground medium — PixelLab `tiles_pro` segmentation (decided 2026-07-11, session 4 / overnight run)
The ground (grass, tilled field, paths, water, plaza) was the last
smooth/painterly holdout once characters were sprite-matrix and the
environment was sprite-sourced — it no longer read as the same pixel
medium as everything sitting on top of it. Two probes settled the approach:
- **Probe 1 (Wang `topdown_tileset`): REJECTED.** Auto-tiling grass always
  rendered lime-green and couldn't chain cleanly from the `tiles_pro`
  output — unusable for the base grass field.
- **Probe 2 (`tiles_pro` segmentation): GO.** 32px square_topdown tiles,
  `outline_mode: "segmentation"` (NOT `"grid"` — grid outline mode reads as
  a literal lattice over the world and was rejected on sight). Verified via
  a full weighted-field composite mock before committing to production
  tiles.
- **Terrain-to-terrain edges are CODE, not generated** (a Bayer-dither alpha
  mask blends grass↔path↔tilled↔water↔plaza at zero additional
  generations) — the same "code handles transitions/motion, sprites handle
  the object" split as the rest of the medium division.
- **Production tuning** (measured against the first mock, not guessed):
  ~75% plain tiles with sparse feature tiles scattered in, a tighter tonal
  range on the base grass, and dimmer daisies than the first pass.
- **Shipped:** commit `6adeacc` ("world — the ground becomes pixel tiles",
  R2). The painterly ground painter is kept as the zero-PNG dual-path
  fallback (CLAUDE.md rule 1), not deleted.

## Everything-one-pixel-medium rule (reaffirmed 2026-07-11, session 4)
With characters on the sprite matrix and the ground on PixelLab tiles, the
"no middle" principle collapses to one simple rule going forward:
**environment, characters, and ground are all PixelLab pixel-art sprites,
dual-path over their code painter/rig, always.** Code is still the right
tool for anything that isn't a discrete drawable object — terrain-edge
dithering, motion (water glints, waddle, weather), and mass-scattered
ambient variation — but never for a "thing" that could instead be a sprite.
Any remaining smooth/painterly visual (water shimmer, weather fx,
particles, vista/parallax) is a to-audit item, not an accepted exception —
restyle to the chunky pixel language in code (zero gens) wherever found;
session 4 already did this for water glints (R8/B5, chunky pixel-block
glints replacing smooth ellipses).

---

## Universal principles (apply to all systems)

1. **Rich variety over simplicity** — 20 varieties per collection in v1, growing to 50+ at v5
2. **Context knowledge over random luck** — rare items appear when player masters the right conditions
3. **Player choice at every configuration level** — HUD content, day length, end-of-day summary all configurable
4. **Actions have consequences that matter** — every action feeds skills, needs, relationships, economy
5. **v1 = playable and complete standalone** without AI layer — AI enhances, doesn't gatekeep
6. **All actions are simple mechanically, deep contextually** — click + formula, with choices that matter

---

## Art direction — FULL PIVOT to the UO-mood look (2026-07-15, FINAL)

The owner, after a 4-generation style probe: the cozy/bright style "is not
the graphics I wanted — I want something more similar to Ultima Online."
Root diagnosis, hers: **"everything looks detached — like you PLACED the
house, PLACED the rock; it doesn't read as one realistic screen." Verdict:
full pivot.** Target look: muted earthy palette, realistic (non-chibi)
proportions, gritty painterly texture, NO outlines (lineless), moody
lighting; camera stays top-down (true isometric remains a non-goal). The
"detached objects" fix ships with it: shared terrain/object anchors,
grounding aprons/base-blend under every object, retuned contact shadows.
Execution program + wave budget (~2,000–2,500 gens): `docs/ART_PIVOT_UO.md`.
The deferred character-matrix rebuild happens ONCE, inside this pivot
(wave W3). No new generations in the old cozy style from this date.

---

## W0 mock rejected → research-driven rebuild → owner approved direction (2026-07-16/17)

The first W0 art-pivot mock was rejected on sight: **"still looks detached —
like you just placed objects, no logical order, and everything looks
top-down."** Instead of re-rolling the same generation recipe, the response
was research-driven: two research reports (a UO rendering deep-dive; a
Sims-believability + top-down scene-grammar report) were synthesized into
`docs/COMPOSITION_RULES.md`, the 25-rule constitution — a one-camera
projection law (Part 1) plus scene grammar (Part 2: circulation first,
enclosure that closes, functional clusters, vegetation clumping, ground
discipline, a final per-object audit). The worst offenders (farmhouse's
isometric corner view, the barn's dead-frontal/roof-ratio mismatch) were
regenerated against a hardened mandatory view clause (`docs/PIXELLAB_ASSETS.md`
"UO-mood era" → "WINNING VIEW RECIPE"), and the mock composer was rebuilt
around path-first layout instead of scattering objects onto a ground plane.
A further grounding-iteration pass (W0.6) fixed apron/terrain-clash findings
(a green-grass apron baked onto a cobble-plaza cottage) and a
`create_map_object` opaque-background failure mode. The owner's verdict on
the resulting mock: **"כן זה כבר יותר הכיוון"** ("yes, this is already more
the direction") — approved to proceed past the W0 gate into W1. Full
execution status: `docs/ART_PIVOT_UO.md`'s "Status" section.

## The REAL-ANIMATIONS LAW (2026-07-16/17)

**Every player action ships with a real generated animation — an action
without one is an incomplete feature, not a placeholder that's good enough.**
This was made explicit after auditing the current action set (wash,
sit-down/seated/stand-up, sleep, cook, chop, fish, hoe, forage, busk, talk,
eat, drink) and finding it running on GF-1 code bobs — a stopgap, never
meant to be the shipped feel. Concretely: W3 of the art pivot
(`docs/ART_PIVOT_UO.md`) now carries a REQUIREMENT, not an aspiration, to
generate a real animation (via `animate_character`/`create_character_state`)
for every action in that list, for every body in the character matrix. Since
a naive per-combo-per-action generation cost does not fit any reasonable
budget (50 combos × ~13 actions), **W3 planning must solve the cost
explosion via layering BEFORE generating anything**: animate the base
bodies once per action, keep hair as a recolored STATIC overlay (the
existing keyed-purple mechanism already does this for rotations/walk), so
an action's generation cost is paid once per body shape, not once per full
(gender × hair × outfit) combo.

## HUD direction — Proposal A "the tidied UO desk" (owner pick, 2026-07-17)

After the window-feedback arc (the owner's repeated "you throw every part in
the wrong place" / "the tiny unreadable thing"), the fix is a defaults change,
not a new UI paradigm. **Research verdict:** UO's fully-free gumps are exactly
the failure mode we hit — every panel floats, nothing has a home, so a busy
desk always drifts into chaos; the durable pattern (Albion Online and modern
MMO clients) is **anchored defaults** — fixed, edge-pinned chrome with content
panels that spawn at fixed homes, while still letting the player drag if she
wants. So: **ANCHORED CHROME** — the tool row becomes a bottom taskbar, the
needs strip an enlarged labelled cluster above it, the clock+coins merge into
one top-right info box, the radar sits top-left; none of these are draggable,
and all re-derive from the desktop edge on every resize (no more drift).
**FIXED SPAWN ANCHORS** — backpack docks right, skills/memory-book/quests open
at a left-edge zone (cascading so they never stack exactly), everything else
opens centered; the free-space edge-seek is retired for all current windows.
**RIGHT-CLICK CLOSE** on a window's title bar / frame border. Shipped as block
**A1+A2, commit `2a5f884`** ("HUD A1+A2 — the anchored UO desk: taskbar,
readable needs, one info box, fixed window homes"). The rest of Proposal A
follows: a paperdoll/equipment hub (A3), a relationships panel (A4), and an
edit-mode to re-arrange/reset the desk (A5).

## Sims-home vision — buy + place decorating is a committed future feature (2026-07-16/17)

Decorating the player's home/farm the Sims way — **buy furniture/decor and
place it yourself, NOT a build-mode wall/room editor** (that's the separate,
already-tracked Tier 2/Tier 3 renovation blocks in
`docs/ROADMAP_EXPANSION.md`) — is a committed future feature, not a maybe.
Consequences that apply starting now, ahead of the feature actually being
built:
- **Groundwork rule: furniture/decor must be data-driven placeable
  instances from now on**, not hardcoded draw calls at fixed positions —
  any new furniture/decor work (interior or exterior) should already be
  shaped as "an instance of a placeable type at a position," so the future
  buy+place system is additive on top of existing data, not a rewrite of it.
- **The house interior will be enlarged and divided into real functional
  areas** (tracked as roadmap block **HOME-1** in
  `docs/ROADMAP_EXPANSION.md`) — today's single bare room is a first-pass
  placeholder (see `docs/ROADMAP_MVP.md`'s interior block), not the shape
  the decorating system will ship against.
- **An ownership/assets surface joins the paperdoll** — a panel showing
  what the player owns beyond what she's wearing (boat, carriage, stall,
  home furnishings), alongside the paperdoll/equipment hub already planned
  as HUD Proposal A3 above.

## Interiors — Sims-style roof-hide view is a committed requirement (2026-07-16/17)

Standing view-inside-buildings requirement, reaffirmed as a **W2 constraint**
on the art pivot (`docs/ART_PIVOT_UO.md`): every enterable building's sprite
generation must be planned so a roof/facade layer can be hidden at runtime
when the player is inside — the Sims "roof disappears, you see the room from
above" read, not a separate disconnected interior scene. This was already the
W0.5-era sign-off requirement (see the interiors memory note) and is recorded
here as a binding constraint on every future building generation, not just a
preference: a building generated as one flat undivided sprite (no separable
roof/facade) blocks this feature and must be re-planned before it ships.

---

## Open decisions still on the table

- Mine location (accessible from farm/forest, or through town?)
- Which festival for v1 (Harvest / Solstice / Moon)
- Exact life-goal list for v1 Aspiration screen
- Direction map from farm to each area
- Weather event specifics (what happens in storm? in fog?)
- 10 NPCs mix for v1 (which professions + personalities)
