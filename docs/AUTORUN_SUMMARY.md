# Autorun Summary — batch 1

**Branch: `autorun/wildhearth-batch-1`** (all work lives here; **master is
untouched**). 14 commits, every one built (`npm run build` green), verified
in-browser with headless Playwright driving the real game, and pushed after
each unit. Full per-file detail lives in `WORKLOG.md` (one entry per unit);
this document is the readable tour.

Date of run: 2026-07-04.

---

## What was built (in order)

### 0. Docs setup — `18bd3a3`, `4d1c180`
**Source:** run bootstrap + "small corrections" mandate.
`18bd3a3` snapshots the product owner's expanded `ROADMAP_EXPANSION.md` and
new `GAME_OVERVIEW.md` onto the branch as the run's source of truth (they
were uncommitted working-tree edits; per-unit `[x]` ticks need them in
history). `4d1c180` ticks two stale blocks that were already built and
verified before this run — "The Season system itself" and the "World Context
Infrastructure" package (see `WORLD_CONTEXT.md` Blocks 1–6).

### 1. Fix: no free animals — `3edf324`
**Source:** ROADMAP_EXPANSION, first block.
The demo cow/hens violated "nothing is free, ever." The yard now starts
empty; the stall sells **Hen 45 / Cow 175** (price-anchor table), refused
until the barn is mended ("Mend the barn first — animals need a sound
home."). Purchases spawn straight into the yard (never the backpack), the
cow is unique like the hoe, hens grow a flock, and ownership persists on a
new `wildhearth-livestock-v1` store wiped by New Game.
**Verified 10/10:** empty new-game yard (screenshot), barn-gate refusal
with no coin/store change, both purchases with exact deductions and live
spawns, cow uniqueness, reload persistence.

### 2. Fish variety + junk catches + the rod gate — `d81817e`
**Source:** "Fish variety (rich tier — 10+ species) + junk catches".
`src/data/fish.ts`: **12 species** with rarity weights, Fishing-skill
floors, location tags (pond/river/lake/boat — future zones just work), and
season/weather tags (Weather Loach bites only in rain; Moonfish only in
fog; Sturgeon waits for deep water). `src/data/junk.ts`: boot/tin/rope at a
token 1 coin. Junk odds fall 35%→5% with skill. **The MVP's missing rod
gate is fixed**: no rod, no cast — and the stall sells a rod (12, unique)
so no starting path is locked out. Prices/names/icons are table-driven
(one tinted fish silhouette painter).
**Verified 20/20** across 7 scenarios: gate + purchase; skill-0 spring
catches only floor-0 in-season species with ~35% junk; skill-95 reaches
Pike/Koi/Elder with 1 junk in 25; winter kills Bluegill and brings Crucian;
rain brings the Weather Loach; species sell at their table prices.

### 3. House interior — first pass, deliberately bare and broken — `aa449fc`
**Source:** "House interior — first pass".
The house is enterable: a scene system (scene-aware collision, a camera
that centres rooms smaller than the viewport, scene-filtered interactables)
and `art/interior.ts` painting the tier-1 room exactly as specced — sooty
hearth + rusty pot + empty shelf, cracked clay basin on a wobbly stand +
empty bucket, straw bed with one threadbare blanket and no pillow, a
short-legged chair + crate table, bare walls with a **day-gated crack of
light**, two rotten floorboards, and a worn exit mat.
**Verified 7/7:** enter through the door, all spots inspected with their
exact flavor lines, no world↔interior interaction leaks, exit works.
Screenshot reviewed (light shaft visible at noon).

### 4. Crop variety + active tending — `6766190`
**Source:** "Crop/farming variety pass".
`src/data/crops.ts`: **9 crops** (corn, carrot, potato, wheat, tomato,
strawberry, winter root, pumpkin, melon) with seed/produce prices, Farming
floors 0–40, and planting seasons. **Farming is active now**: crops grow
only on watered days (a hand-watering chore that visibly darkens the soil),
**rain waters every growing plot for free** — closing the standing
WORLD_CONTEXT Block-4 follow-up — and three consecutive dry days wilt the
crop outright (Clear → replant). The stall stocks only in-season packets;
planting checks skill + season with clear refusals. **The field persists**
(`wildhearth-plots-v1`) — also fixing the MVP gap where crops vanished on
reload. Legacy generic "seeds" still plant corn.
**Verified 19/19** across 7 scenarios, including a full
till→plant→water→ripen→harvest arc with a mid-growth reload, rainy-day
auto-watering, floor/season refusals, wilt→clear, and seasonal stock.

### 5. Foraging variety pass — `485e59d`
**Source:** "Foraging variety pass".
`src/data/forage.ts`: **11 wild finds** (berries keep their legacy id as
the floor-0 all-season fallback; garlic, mushrooms, sorrel, hazelnuts, wild
strawberries, elderflower, wintergreens, rosehips, chanterelle, truffle at
floor 60). Picks roll the table by season + skill; the extra-find skill
bonus stays; four tinted icon silhouettes cover the set.
**Verified 9/9:** eligibility filtering across three seasons, gated finds
at skill 90 (chanterelle observed), table-priced selling.

### 6. Complete the base skill set + the Gain Guard — `0c45b6e`
**Source:** "Complete the base skill set".
The base-9 is real: **Building** trains from farm repairs (the gap the
block names), **Cooking** cooks at the interior hearth (`data/recipes.ts`,
berry compote — the Keeper path's forage→cook→sell loop now functions),
**Animal Husbandry** trains by feeding your own corn to owned animals
(cow/hens are now clickable, live-position interactables), and
**Gardening** trains by planting stall-bought flower seeds in three beds
by the house that bloom and stay in bloom (`wildhearth-garden-v1`).
`gainSkill` converts to UO-style **chance rolls** (chance `1−v/100`, flat
0.3 — identical expected pace to the old shrinking-gain) so the **Gain
Guard** means something: 4 consecutive misses force the next success,
persisted per skill. Also fixed en route: the interior unit's door reach
had swallowed the repair hub's prompt everywhere near the house.
**Verified 14/14** (+ the interior suite re-run 7/7): all nine skills
listed; repair→Building, cook→Cooking (ingredients consumed), feed→
Husbandry (corn consumed), plant→Gardening with a persistent bloom; six
casts at Fishing 99 (1% chance) still gained — the Guard held.

### 7. Toast/notification queue — `3d2b2e7`
**Source:** "Toast/notification queue".
`toast()` enqueues instead of clobbering: one message at a time (2.2s +
0.3s gap), soft-capped at 4 waiting so bursts can't leave stale messages
playing. Same API, zero caller changes.
**Verified 4/4:** two back-to-back repairs played both toasts in order
with a visible gap — and the guided tip, which the old single slot used to
clobber, queued and played.

### 8. Camera zoom — `6247113`
**Source:** "Camera zoom".
Mouse wheel over the play window and an on-screen ＋/− pair (touch) scale
the camera: a user factor (0.6–2.4, step 0.15, config knobs) multiplies
the automatic fit, clamped at both ends.
**Verified 5/5** by measuring the farmer sprite's pixel area on the live
canvas: grows ~zoom² on wheel-up, shrinks on wheel-down, stops exactly at
the min clamp, and the buttons drive it too.

### 9. The Memory Book system — `9328449`
**Source:** "The Memory Book system".
One book, two tabs, opened from a new 📖 tool icon or **M**.
**Collections** is the generic per-category engine the spec demands (a
table + `discover()`, never per-category code): fish (12) and wild finds
(11) are the first live categories — the spec's birds/animals/flowers rows
join through the same engine when the binoculars sighting mechanic
(Fisherwoman block, skipped) lands. **Memories** is the curated life-event
log: ten "firsts" (catch, forage, harvest, busk, cook, repair, farm-whole,
flowers, sale, animal) each written once with an in-game date stamp.
**Verified 8/8:** empty states, discovery + exactly-once memory stamped
"Spring, Day 4", both tabs rendering real content, reload persistence.
Screenshot reviewed.

### 10. Cooking skill, extended — `3f4f7af`
**Source:** "Cooking skill, extended".
Five multi-ingredient recipes join the same table: Root stew, Corn chowder,
Forest sauté, Fisher's supper, Berry pie — 2+ items → 1 dish, floors 5–25,
every dish priced above its raw ingredients. Pure data; menu/pricing/icons
flow through existing plumbing.
**Verified 6/6:** multi-ingredient consumption, floor gating (no pie at
Cooking 6 despite ingredients), stew sells 14 > 10 raw.

### 11. Dev tool — World Context inspector — `f38d401`
**Source:** "Dev tool — World Context inspector".
Backtick toggles a monospace overlay dumping the live `getWorldContext()`
snapshot — fed the HUD's per-frame snapshot (never a second call), created
entirely in code, unreachable from player menus.
**Verified 5/5:** hidden by default, real seeded state in the dump, live
refresh (375→412 in-game minutes), toggle off.

### 12. HUD — weather indicator — `4f3dd26`
**Source:** "HUD - weather indicator" (also closes the older combined
"HUD — Calendar & Weather indicator" block — both halves now exist).
A weather pill directly below the calendar readout (☀ Clear / 🌧 Rain /
⛈ Storm / 🌫 Fog) from the same per-frame snapshot; the HUD wraps to two
rows and the minimap moved down to clear it.
**Verified 4/4:** seeded Storm shown; across ~15 fast days the label always
matched the live store and changed **exactly on the daily reroll**.

---

## Skipped (not built, per the run's stop rules)

Grouped by the rule that stopped them:

**Depends on an unresolved ⚪ open question:**
- **Mining skill + mine region** — the doc's own header says resolve the
  mine's placement/access first.
- **`zones.ts` world expansion** (road, neighboring farm, town, river,
  mountains) — contains the mine placement (⚪) and town/market layouts
  GAME_OVERVIEW marks 🟡 "not walked as a place". This is the single
  biggest unblock: most other skips chain from it.
- **Town buildings, NPC entity, schedule engine, customers/reputation** —
  need the town (above) and the ⚪ NPC roster.

**Spec is missing a real detail:**
- **Rundown farm — concrete detail pass** — sources its list from
  `docs/WORLD_MAP.md`, which does not exist in the repo; the bridge/mine/
  road pieces also need world layout. The farm-local subset (coop, well)
  is buildable the day that doc lands.
- **Needs system** — five needs are specced, but the social need has **no
  restoration path until NPCs/pets exist** (VISION: restored by talking to
  NPCs/pets). Building it now would ship a need that only ever falls.
  Surfaced as a real design gap, not guessed around.
- **Real character creation** — the block builds quest content "from
  VISION.md's 'First quests by path' section", which **doesn't exist in
  VISION.md**, and the quest-log system it feeds isn't built.
- **Pets** — no adoption source specified (needs town/NPC).
- **Second save slot** — the slot-picker UI is unspecified (one line of
  spec).
- **Tier 2/3 renovation** — the preset room/furniture layouts aren't
  designed anywhere.
- **Farm plot expansion** — price/size are explicitly implementation-TBD
  (fine), but *where* the land goes is real map design and the vendor is
  unspecified; also its premise ("once the starting plot is in use") is far
  off — the field is 110 tiles. Everything needed (persistence, money-gate,
  painter patterns) exists; buildable on direction.

**Depends on skipped blocks:**
- **Market becomes a real place** — needs the road/market area (world
  layout 🟡). Note: its sell-menu half already shipped pre-run (the trade
  window).
- **Riverside Fisherwoman** (and her rod tiers/bait/quality/boat/net/
  barter/teaching/aquarium) — the river doesn't exist; NPC/dialogue systems
  unbuilt.
- **Relationships, quests, dialogue authoring, gift-value tuning block,
  wild road/river animals, NPC-to-NPC, marriage/children, pet depth,
  horses/carriages/boats, festivals, regions beyond, treasure content** —
  all chain from town/NPCs/world expansion.
- **Crafting engine + chains, fashion/hairdressing, appearance
  customization, animal husbandry expansion** — stations, wool, milking,
  and town professions don't exist yet.

**Explicitly last / out of scope:**
- **All `npc-brain` AI blocks + AI settings UI** — the docs demand the
  scripted town be solid and fun first.
- **Art polish blocks** (player rig, secondary motion, faked-height pass,
  ambient life, feedback juice) — thin one-line specs whose substance is
  aesthetic judgment; deferred rather than improvised.

---

## Follow-ups & questions this run surfaced

1. **Gain-model tuning:** converting gains to chance-rolls (required for
   the Gain Guard) makes near-100 progression faster than before (a forced
   0.3 per ≤5 uses vs the old guaranteed 0.01/use). Same expected pace
   everywhere else. Worth a tuning pass review.
2. **`docs/WORLD_MAP.md` is referenced but missing** (rundown detail pass,
   GAME_OVERVIEW). Recreating/committing it unblocks the detail pass.
3. **VISION.md lacks the "First quests by path" section** that the
   character-creation block builds from — it needs writing (or pointing at
   wherever that content lives) before that block can start.
4. **Needs/social gap:** decide how the social need behaves before NPCs
   (frozen? slower decay? restored at the rest corner?) or hold the whole
   system for the town, as this run did.
5. **The world expansion block is the keystone** — resolving the mine ⚪
   and sketching the town/market/river layout unblocks roughly ten
   downstream blocks in one stroke.
6. **Toast queue + fast actions:** the 4-deep soft cap drops the oldest
   message during bursts (deliberate; noted for awareness).
7. **Zoom is session-only** (not persisted) — spec didn't ask; trivial to
   add if wanted.

---

## How this was verified, in general

Every unit: `npm run build` (TS strict) green → served via `vite preview`
→ headless Playwright drove the actual game (keyboard/mouse, real saves in
localStorage, seeded stores for scenarios) asserting on prompts, toasts,
persisted state, and — where it mattered — canvas pixels and screenshots
reviewed by eye. Temporary test instrumentation (fast day-lengths seeded
through the real `dayLengthSeconds` setting) never shipped in a commit.
