# Roadmap — Expansion (self-contained work blocks)

Prerequisite: every checkpoint in `docs/ROADMAP_MVP.md` is done and playable.
The MVP is the foundation everything here is bolted onto, not a parallel track.
Read `docs/VISION.md` for the *why* behind each system; this file is the *what
to build*.

**How to use this file.** Every work item is its own **self-contained block**,
titled, with a checkbox. There is no numbering, no phase/group scaffolding, and
no index on top — you grab one block by its title, hand it over, and it carries
everything needed to do that block alone. Blocks are written top-to-bottom in
dependency order (a block may rely on ones above it). Mark a block `[x]` when it
is built, verified (`npm run build` passes), and committed. Prefer leaving the
game runnable after each block over batching.

**Open decision, not yet resolved:** is the mine reachable from the
farm/forest area (same tier as foraging), or does it require the town
(tools/permission from a smith)? The mining block below assumes "requires
town" — mark it TODO if that's wrong, and resolve before starting it.


---

## Fix: no free animals
- [x] built, verified in-browser (empty yard on new game; barn-gated hen/cow purchases spawn + persist), committed — 2026-07-04 (autorun branch)

> Context (was Phase 0 intro): Before building anything new (town, NPCs), fix and enrich what the MVP already has. Two of these are **bug fixes against our own pillar** — the current prototype has a cow and hens roaming for free, which contradicts "nothing is free" — everything below either corrects that or takes a single-note system (one fish, one crop) and gives it the texture a real game needs.

**Fix: no free animals.** The cow/hens currently in the demo must not
exist until purchased. Remove default spawn; wire them into the Phase-4
(MVP) shop as buyable, with their own price and a coop/barn-repair
prerequisite (ties into Housing/Renovation, MVP Step 8).

---

## Rundown farm — concrete detail pass
- [ ] not started

**Rundown farm — concrete detail pass**, replacing generic "broken
fence/roof" with specific, individually-fixable pieces (see
`docs/WORLD_MAP.md` for the source list): broken/empty chicken coop,
barn door hanging on one hinge, a fence section that's simply missing
(not just damaged — visibly "used to be there"), an old well with a
rusted bucket, faint sparkle spots hinting at buried treasure (needs a
digging tool, not accessible yet), a broken bridge blocking a forest
shortcut (repairing it later is a real region unlock), the mine
entrance visible on the horizon, and the dirt road toward town visible
from day one. Each of these should be its own repair/unlock action
later (Housing tiers, VISION #8), not one generic "fix farm" button.
**Technical note on visibility:** our camera is 3/4 top-down (visible
building fronts, per the existing `drawHouse`/`drawBarn` pattern), not
pure orthographic — so damage is just a second painter variant per
object (askew door, gap in the roof polygon, missing fence tile, a
ground-level particle effect for sparkle spots), the same
normal/rundown pairing already established for the house.

---

## Fish variety (rich tier — 10+ species) + junk catches
- [x] built, verified in-browser (12 species incl. season/weather/location tags, junk odds by skill, rod hard-gate + rod in shop), committed — 2026-07-04 (autorun branch)

**Fish variety (rich tier — 10+ species) + junk catches.**
`data/fish.ts`: table of species, each with a rarity weight, a required
Fishing-skill floor, and tags for *where* (river vs. pond vs. lake, once
those are distinct zones) and *when* (season, weather) it can appear.
`data/junk.ts`: a parallel small table of non-fish catches (an old
boot, an empty tin, a tangled rope) with no sell value (or a token
amount) — UO-style "you caught junk" outcomes.
`systems/fishing.ts` rolls against both tables instead of always
returning one generic fish: **low Fishing skill → slow bites, junk is
common; high Fishing skill → fast bites, junk is rare, rare species
become reachable.**
**Fix, not just a rule to remember:** the MVP's original fishing loop
predates the tool-ownership concept and does not check for an owned
rod before allowing a cast. This must be corrected here — add an
explicit rod-ownership check that blocks fishing entirely without one,
per VISION.md's Opening Arc correction (fishing is a hard gate, unlike
bare-hand foraging).

---

## Market becomes a real place you walk to, with a real sell menu
- [ ] not started

**Market becomes a real place you walk to, with a real sell menu.** Not
the full town (that's Phase 1) — a standalone market/dock area,
separate from the farmhouse, reachable by the road already added in
Phase 1's zone work (pull that one piece of Phase 1 forward if needed,
since this depends on it). The player must physically carry goods
there to sell — the stall no longer sits conveniently next to the
farm. **Replaces the MVP's crude "sell everything in one press" flow**
with a real menu: a list of sellable items in the backpack, per-item
quantity selection, visible unit/total price before confirming (reads
the Haggling skill discount already established). This is a UI-only
change on top of the existing `systems/shop.ts` — no new economy logic,
just a proper interface for it.

> **Milestone after this block:** the MVP's five livelihoods behave correctly (no free animals, fishing genuinely requires a rod, fish catches have real variety) and the market is a real place with a real menu. No interior, needs, or character creation yet — that's Group B/C.

---

## House interior — first pass, deliberately bare and broken
- [x] built, verified in-browser (enterable, all five bare/broken spots + day-gated wall-crack light), committed — 2026-07-04 (autorun branch)

**House interior — first pass, deliberately bare and broken.** The
house becomes enterable. Minimum viable rooms, each functional but
rundown — this is tier-1, "barely works," not cozy yet:
- Cooking spot: a soot-blackened stone hearth, one (slightly rusty) pot,
  an empty shelf above it.
- Wash spot: a cracked clay basin on a wobbly wooden stand, an empty
  bucket beside it (water comes from the farm's well, no plumbing yet).
- Bed: a thin straw mattress on a creaky wood frame, one threadbare
  blanket, no pillow.
- Rest spot: a single wooden chair with one slightly-short leg (subtle
  wobble), an empty crate standing in as a table.
- Bare walls throughout — no pictures, no curtains; a thin crack lets in
  a visible line of light at certain times of day (a visual echo of the
  broken roof outside), plus one or two creaky/rotten floorboards.
This is exactly the four spots the Needs system (VISION #13) requires —
functional from day one — but every future furniture upgrade (Housing
tier 2/3, VISION #8) should read as a direct, visible contrast against
this bare/broken starting state, not just a stat increase.

---

## Needs system
- [ ] not started

**Needs system.** `systems/needs.ts`: hunger, energy, hygiene, mood,
social — each a 0–100 value that decays over time/activity. Interactions
at the item-5 interior spots restore the matching need. Mood is derived
from the other four plus recent social contact; mood in turn modulates
skill-gain rate and busking tips (a concrete, testable hook — not just a
number sitting unused). **Also implements the collapse consequence**
(VISION #13 — the actual trigger, not just tracking): escalating UI
warnings as a need bottoms out (plural, never a surprise), then a
collapse event at zero that costs coins (lost wages/a helper's fee —
exact amount TBD, tune against the price anchor table) and nothing
else — no game over, no lost save.

> **Milestone after this block:** the house is enterable and bare/broken as designed; all five needs are tracked, restorable at their matching interior spot, and neglect has a real (survivable) consequence.

---

## Crop/farming variety pass
- [x] built, verified in-browser (9 crops skill+season gated, active watering/wilt, rain auto-water, field persistence), committed — 2026-07-04 (autorun branch)

**Crop/farming variety pass, and farming becomes active, not
automatic.** Two changes together:
- Variety: a good number of crop types instead of one (fruits and
  vegetables both — mirrors the fish-variety idea at a similar scale),
  gated by Farming skill and season (seasons themselves are still
  Phase 6/VISION #7 — if seasons aren't in yet, gate by skill only for
  now and revisit).
- **Active tending, replacing the MVP's passive timer-only growth**:
  planted crops need watering (and later, care actions like weeding/
  fertilizing as more depth is warranted) to actually progress —
  neglected crops grow slower, yield less, or can wilt outright, rather
  than growing to harvest untouched on a pure timer. This is a direct
  extension of the earned-economy pillar: even after buying seeds and
  planting, nothing finishes itself for free.

---

## Real character creation
- [ ] not started

**Real character creation**, upgrading MVP Step 7's placeholder:
- `src/ui/charcreate.ts`: gender choice, a curated set of preset
  appearance options (skin/hair/body — not free sliders), starting
  clothes from a few preset outfits, name field.
- `src/systems/startingPath.ts`: replace the MVP's single-tool choice
  with the four-path system (Provider / Tender / Performer / Keeper),
  each granting a 2-item kit and seeding 2 skills — see VISION.md
  Opening Arc for the exact mapping.
- `data/quests/tutorial.ts` + `data/quests/aspiration.ts`: author the
  concrete first-quest content from VISION.md's "First quests by path"
  section — the 4-step tutorial skeleton (shared, wording adapts per
  kit) and the 4 path-specific aspiration chains. Note the Keeper path
  starts with foraging→cooking→selling, not animal care, since no
  animal is free on day one.
- Persistent Help icon (re-shows the current tutorial step on demand)
  whenever Tutorial Quests mode is active.
- Slot this into the Opening Sequence between the farm reveal and the
  Guidance Mode choice, per VISION.md's updated screen order.
- **Sequencing note**: the MVP already exposes a Tutorial Quests /
  None choice (Step 7) as a setting, but nothing delivers on it until
  this item lands — that's expected and fine, not a bug in the MVP,
  just worth knowing the setting is currently inert.

---

## Foraging variety pass
- [x] built, verified in-browser (11 finds, season+skill gated, table-driven prices/names/icons), committed — 2026-07-04 (autorun branch)

**Foraging variety pass**, same spirit as the fish/crop tables: many
more wild fruit and vegetable types to find (not just one generic
berry), each with its own rarity/location/season tags in
`data/forage.ts`, following the same table-driven pattern as
`data/fish.ts`. Ties into Phase 1's "wild fruit → farmable seed"
mechanic (under the Riverside Fisherwoman item) — the richer this
table, the more crop variety has real discovery behind it rather than
everything just being available in the shop from day one.

> **Milestone after this block:** farming and foraging are both rich and active (not single-note/passive), and a new game opens with real character creation and a working starting-path choice instead of the MVP's placeholder.

---

## Complete the base skill set
- [x] built, verified in-browser (9 skills: repairs→Building, hearth→Cooking, feeding→Husbandry, flowers→Gardening; chance-based gains + Gain Guard), committed — 2026-07-04 (autorun branch)

**Complete the base skill set — 4 skills the MVP left out, and add a
pity counter to the gain algorithm.** VISION's confirmed 9-skill base
list (reachable from the farm, no town needed) is Fishing, Foraging,
Farming, Busking, Haggling — the MVP's 5 — plus **Animal Husbandry,
Cooking, Building/Renovation, and Ornamental Gardening**, which never
made it into `systems/skills.ts`. Add all four now, each wired to a
mechanic that already exists or is being built here. **Also patch the
existing gain-chance function** (built in MVP Step 2) with a
UO-style Gain Guard: track consecutive failed gain-rolls per skill;
past a threshold (pick a number during implementation — a handful of
failures, not dozens), force the next roll to succeed. Applies to all
9 skills uniformly, not just the new ones.
- **Building/Renovation**: wire it to the MVP's farm-repair actions
  (Step 8) — repairing the fence/roof/door currently grants no skill
  at all, which is a real gap, not a stylistic omission. Every repair
  action should roll the same chance-based gain as any other skill.
- **Cooking**: needs to exist *earlier than originally planned*. It
  was scheduled for Phase 1 item 13, but the Keeper starting path
  (Phase 0 item 8, and VISION's "First quests by path") already
  depends on a working forage→cook→sell loop on day one. Build a
  minimal version here (one recipe: foraged ingredient → cooked dish,
  sellable for more than the raw ingredient) so the Keeper path
  actually functions when character creation lands; Phase 1 item 13
  then extends this with more recipes/depth rather than creating it
  from scratch.
- **Animal Husbandry**: wire to caring for an owned animal (feeding,
  etc.) once the Phase 0 item 1 fix (no free animals) and a first
  purchasable animal exist.
- **Ornamental Gardening**: wire to planting/tending decorative
  flowers (distinct from food crops) — a simple flower-planting action
  near the house is enough for a first pass; ties loosely to Housing
  tiers (VISION #8) for later depth.

---

## Toast/notification queue
- [x] built, verified in-browser (two simultaneous events play in order with a visible gap), committed — 2026-07-04 (autorun branch)

**Toast/notification queue.** Autosave, skill-gain, buy, and sell
toasts currently all share one slot in `ui/hud.ts` with no queueing —
multiple events landing at once will visually collide. Add a simple
queue (show one at a time, short delay between) rather than letting
them overlap or clobber each other.

---

## Camera zoom
- [x] built, verified in-browser (wheel + on-screen ± buttons, clamped bounds), committed — 2026-07-04 (autorun branch)

**Camera zoom.** `src/engine/camera.ts` gets zoom in/out — both a
mouse scroll-wheel handler on the game canvas and an on-screen
button pair (for touch, where scroll isn't available), adjusting the
existing `scale` value within reasonable min/max bounds. Pairs
naturally with the mouse-first control retrofit already built.

> **Milestone after this block:** the same five livelihoods from the MVP, but each with real texture (many fish, a market you travel to, an interior life with needs), and a real day-one character creation — before a single NPC or town building exists.

---

## `src/world/zones.ts` — expand the world
- [ ] not started

> Context (was Phase 1 intro): Everything here must be fully playable and feel alive with AI OFF — this is what makes the later AI layer an enhancement, not a crutch.

`src/world/zones.ts` — expand the world: farm becomes one corner of a
much larger map. Add a dirt road out of the farm, passing at least one
**neighboring farm** (visually established/thriving, contrast to the
player's rundown start — building reuses the `art/buildings.ts`
pattern with a "cared for" state alongside the existing rundown one), a
town area (coastal — include a seafront edge), forest edge extended,
river, a mountain region containing the mine entrance placeholder.
Remove the fence that currently seals the whole play area.

---

## `src/ui/minimap.ts` — parchment/scroll-styled minimap in a screen
- [ ] not started

`src/ui/minimap.ts` — parchment/scroll-styled minimap in a screen
corner, player dot, revealed-so-far regions (UO-style paper map feel).
**Fast travel**: clicking an already-discovered location on the map
offers quick travel for a small coin cost (price anchor table, VISION
#9/#3) — only available for locations reached on foot at least once;
walking remains the only way to discover new ground.

---

## Town buildings (reuse the `art/buildings.ts` painter pattern)
- [ ] not started

Town buildings (reuse the `art/buildings.ts` painter pattern): inn,
3 specialized merchant stalls (fish buyer, seed/tool seller, general
goods), 5–8 NPC homes.

> **Milestone after this block:** the world is large, the road/minimap/fast-travel work, and the town has buildings standing (empty of NPCs still) plus at least one established neighboring farm passed along the way.

---

## `src/entities/npc.ts` — NPC entity
- [ ] not started

> Context (was Group B note): The Riverside Fisherwoman block is large on its own (rod tiers, bait, teaching, boat, bird-watching, net fishing, diving, sailing, aquarium) — it sits right after the base NPC-entity block because it needs that entity to exist at all.

`src/entities/npc.ts` — NPC entity: position, home/work targets, a
simple daily schedule (home → work → square → home) driven by a game
clock, no AI.

---

## The Memory Book system
- [ ] not started

**The Memory Book system** (VISION #14) — must exist before anything
can log into it (bird-watching below needs this immediately).
`src/systems/collections.ts`: generic tracked-category engine (add
entry, check X/Y discovered per category) — birds/animals/flowers are
the first three categories, fish/foraged items/minerals plug into the
same engine later, not one-off code per category.
`src/systems/memories.ts`: life-event log (timestamp + short flavor
text per entry) — separate data from collections but same book.
`src/ui/memorybook.ts`: single window, two tabs (Collections /
Memories), opens via an on-screen icon (mouse-first, per VISION's
Controls section) — physically "sits" at the house's rest/living spot
per VISION #14, though the UI itself can open from anywhere.

---

## The Riverside Fisherwoman
- [ ] not started

**The Riverside Fisherwoman** — a standalone fixed NPC at the river,
discovered on the road to town before the town itself exists. Doesn't
need Phase 1's schedule engine (she's always at her spot) but does need
the NPC entity, dialogue, and shop systems below, so she's built here
rather than in Phase 0. Fully scripted, no AI, exactly like every other
Phase-1 NPC:
- Fixed hand-authored dialogue tree (`data/dialogue/fisherwoman.ts`).
- Fishing-only shop: buys/sells rods, **bait** (multiple types — cheap
  bait for common fish, pricier bait that shifts the species roll
  toward rarer entries in `data/fish.ts`, per Phase 0 item 3, **only if
  Fishing skill meets that bait's floor — below it, the pricier bait is
  just wasted money, no rarity benefit**), and fish — not a general
  store.
- **Rod tiers**: the rod itself upgrades in stages (bronze→iron→gold,
  mirroring the tiered-tool-upgrade idea from the farm-game
  inspirations list), each tier improving bite speed/quality odds
  further — the "first purchase" from the Opening Sequence becomes a
  real multi-stage progression, not a one-time buy. **Each tier also
  has a skill floor to actually benefit from it** (per VISION #1's
  tools-require-a-skill-floor rule) — buying ahead of your skill is a
  real waste, not a shortcut. **Upgrades cost time as well as money**
  (Stardew-style): the fisherwoman holds the rod for a day or two to
  upgrade it, so the player is briefly without it — a real decision
  about *when* to upgrade, not just *whether* she can afford it.
- **First Teacher NPC**: pay her to raise Fishing skill faster than
  grinding alone (the "deliberate learning" hook from Systems #1,
  finally with a real character behind it).
- **First Transportation vendor**: rent or buy a boat directly from her
  — a narrow, early instance of the Transportation system (VISION #9),
  which otherwise waits for Phase 4's town/stable buildout.
- **First barter instance** (VISION #3's "dual currency and barter" —
  otherwise never built anywhere): she can offer a direct item-for-item
  trade instead of a coin sale for specific items (e.g. a rare catch
  for a bait upgrade) when Friendship is high enough — `systems/
  shop.ts` needs a barter-offer path alongside its normal buy/sell one.
- **Bird-watching, requires owning binoculars** (another earned-economy
  tool purchase — price it at the "basic tool" tier, 20–30, in the
  price anchor table). Without binoculars, birds are just ambient
  wildlife, not loggable. The same sighting mechanic (and the same
  binoculars) extends to **wild animals** (rabbits, deer) and to
  **wild flowers** encountered while exploring — all three feed the
  Collections half of the Memory Book (VISION #14) as their own
  tracked categories (X/Y discovered per category, not one combined
  list), not just birds alone.
- **Wild fruit → farmable seed**: rare fruit found while foraging can
  be "seeded" — converts into a plantable seed for that same crop,
  which then becomes farmable on the player's own plot. This is the
  concrete bridge between Foraging and Farming (ties into Phase 0
  item 7's crop-variety pass) — discovery in the wild is how new crop
  types get unlocked for the farm, not just a shop purchase.
- **Catch quality, independent of species**: every catch also rolls a
  size/quality tier (small/medium/large, or a bronze/silver/gold
  framing — pick one during implementation) that scales sell price.
  Higher Fishing skill shifts the odds toward better quality, on top of
  whatever it already does for species/junk. Applies to both rod and
  net catches.
- **Boat-gated content**: once a boat is owned/rented, deeper water
  becomes reachable with its own fish species (add a "boat-only" tag to
  `data/fish.ts`'s location tags, per Phase 0 item 3) and a basic
  **diving** action — a simple version of the underwater depth-illusion
  technique from VISION's Art Direction (color-tint shift + a couple of
  parallax layers is enough here; the fullest version of that toolkit
  is a Phase 7 concern, not required for this to work now).
- **Net fishing from the boat — a second, distinct fishing style**:
  unlike the rod (active — cast, wait, single catch), the net is
  passive/bulk — drop it, wait longer, pull up several small catches
  (or a "school" of one species) at once. Requires owning both a boat
  and a net (separate purchase from the rod), **and a Fishing skill
  floor to use effectively — below it, the net mostly comes up with
  junk regardless of location, per VISION #1**. Differentiates
  playstyle, doesn't replace the rod.
- **Sailing, expanded**: the boat isn't just a fishing-spot unlock — it's
  a real means of travel along the river (and later to other water-
  adjacent regions as the world grows, per Phase 6). Basic version here:
  point-and-click movement (per the mouse-first control scheme) works
  on water the same way it does on land while the boat is in use.
- **Home aquarium for duplicate rare catches**: instead of always
  selling a repeat of an already-collected rare fish, the player can
  keep one on display at home (ties into Housing furniture, VISION #8)
  — a visual payoff for collecting, sitting alongside the Memory Book
  idea rather than competing with it.

> **Milestone after this block:** the river has a full standalone NPC, fully scripted, no AI — fishing gear, teaching, boats, and collections all work through her.

---

## `src/systems/schedule.ts` — the clock-driven schedule engine that moves
- [ ] not started

`src/systems/schedule.ts` — the clock-driven schedule engine that moves
NPCs between their fixed points through the day.

---

## `src/systems/relationships.ts` — **two independent numbers per NPC**
- [ ] not started

`src/systems/relationships.ts` — **two independent numbers per NPC**
(Friendship, Romance — per VISION #6), not one combined score.
- **Categorized interaction menu**, not one generic "talk" button:
  `data/interactions.ts` groups a handful of specific actions under
  Friendly / Funny / Romantic / Blunt (small teasing category for
  personality flavor). Each interaction is its own small affection
  delta, scripted line, and — once AI is on — its own prompt framing.
- Gift-giving: consumes an inventory item, moves the relevant axis by
  an amount keyed to a **5-tier preference** (loved/liked/neutral/
  disliked/hated). **Preferences are generated from each NPC's
  personality-trait sheet** via a trait-to-category mapping
  (`data/traitPreferences.ts`) — not a hand-written gift list per NPC.
  First concrete instance: the Riverside Fisherwoman's traits derive a
  preference for rare aquatic/river items.
- **Heart events**: `data/heartEvents/*.ts`, short scripted scenes keyed
  to (NPC, axis, threshold) triples — a Friendship-4 scene and a
  Romance-4 scene with the same NPC are separate entries, not one
  merged track. Firing a heart event writes an entry directly into
  `systems/memories.ts` (item 5 above) — it doesn't just play once and
  vanish.
- Scripted dialogue trees (`data/dialogue/*.ts`, hand-authored lines
  keyed by affection tier) as before.

---

## `src/systems/quests.ts` — fixed authored quests (fetch/deliver/talk-to),
- [ ] not started

`src/systems/quests.ts` — fixed authored quests (fetch/deliver/talk-to),
quest log UI, rewards route into inventory/economy/relationships.

---

## `src/systems/customers.ts` — NPCs walk to the player's stall with a want
- [ ] not started

`src/systems/customers.ts` — NPCs walk to the player's stall with a want
   drawn from a static want-table (personality tag + season + what's in the
   player's stock), scripted haggling curve reads the Haggling skill value.
   **Also builds `src/systems/reputation.ts`** (VISION #3's town-wide
   Fame/Reputation — never had a home until now): a single number, separate
   from any per-NPC Friendship/Romance and from the Haggling skill itself,
   that shifts customer generosity and opening prices town-wide. Raised by
   successful sales/quests, lowered by failed haggles or reneged trades —
   exact curve TBD, but the three-way independence (Fame / one NPC's
   opinion / Haggling skill) must hold from the first implementation.

> **Milestone after this block:** the town's NPCs have schedules, relationships, gifting, fixed quests, and come to the player's stall as customers — all scripted, zero AI calls anywhere yet.

---

## Wild animals along the road/river
- [ ] not started

**Wild animals along the road/river**: rabbits, birds, deer — same
wandering/flee-on-approach pattern as the farm's cow/hens, just placed
in the open world instead of the farmyard. Purely ambient for now —
**not** tied to any confirmed skill yet (see OPEN_QUESTIONS.md: whether
a Taming skill gets added to the confirmed 21-skill list is still an
open question, not a decided one).

---

## Pets
- [ ] not started

Pets: one adoptable companion (dog or cat) with a simple follow/idle
behavior — companionship flag, not full relationship depth yet (that's
Phase 5).

---

## Mining skill + mine region
- [ ] not started

Mining skill + mine region: resource nodes, rarity increases deeper in.

---

## Cooking skill, extended
- [ ] not started

Cooking skill, extended: Phase 0 item 10 already added a minimal
version (one recipe) to unblock the Keeper starting path — this item
builds it out further, more recipes using 2+ inventory items → 1
cooked item, sellable for more than the raw ingredients.

> **Milestone after this block:** a town full of NPCs with visible routines, real relationships, fixed quests, and customers who come to you — before any LLM call exists in the codebase.

---

## `src/systems/npc-brain/sheet.ts` — character sheet format
- [ ] not started

> Context (was Phase 2 intro): Start only once Phase 1's scripted town is solid and fun standalone.

`src/systems/npc-brain/sheet.ts` — character sheet format: personality,
role, schedule, tastes, teaching skill (if relevant).

---

## `src/systems/npc-brain/memory.ts` — per-NPC dynamic memory store
- [ ] not started

`src/systems/npc-brain/memory.ts` — per-NPC dynamic memory store
(interactions, opinions, mood, recent events), persisted like
inventory/skills.

---

## `src/systems/npc-brain/protocol.ts` — the LLM call contract
- [ ] not started

`src/systems/npc-brain/protocol.ts` — the LLM call contract: structured
JSON response, closed action set (`say | sell | haggleResponse |
offerQuest | memoryUpdate | gossip | teach`). Game-side validator rejects
anything outside the schema before it's applied — never execute free
text as instructions.

---

## Wire calls only at meaningful moments
- [ ] not started

Wire calls only at meaningful moments: opening dialogue, a buy/haggle
decision, a quest offer, a teaching session. Never per game tick.

---

## Caching layer + explicit fallback to Phase-1 scripted behavior when the
- [ ] not started

Caching layer + explicit fallback to Phase-1 scripted behavior when the
call fails, is disabled, or there's no key.

---

## `src/ui/settings.ts` — AI on/off toggle, depth-vs-cost dial, API key
- [ ] not started

`src/ui/settings.ts` — AI on/off toggle, depth-vs-cost dial, API key
entry (player's own key/budget, never hardcoded).

---

## Make Haggling/Charisma skill values visibly shape LLM dialogue tone, not
- [ ] not started

Make Haggling/Charisma skill values visibly shape LLM dialogue tone, not
just a hidden price multiplier.

---

## Dynamic quest generation layered on top of the Phase-1 fixed quest list
- [ ] not started

Dynamic quest generation layered on top of the Phase-1 fixed quest list.

---

## Teacher NPCs
- [ ] not started

Teacher NPCs: paying for faster skill gain; teaching quality reads the
teacher's own character sheet.

> **Milestone after this block:** the same town from Phase 1, now capable of freeform, memory-aware conversation and dynamic quests when AI is on — and exactly as playable as before when it's off.

---

## `src/systems/crafting.ts` — generic chain engine
- [ ] not started

`src/systems/crafting.ts` — generic chain engine: recipe = inputs +
output + required station + skill used. Pricing everywhere already
supports "buy finished vs. craft yourself" (Step 4/6 shop pattern) —
extend it so crafted goods sell for more than raw ones sold directly.

---

## Author 3–4 parallel chains
- [ ] not started

Author 3–4 parallel chains: wheat→flour→bread, wool→yarn→cloth,
milk→cheese (each ~3–4 steps per VISION #4).

---

## Fashion/Tailoring and Hairdressing/Styling professions + their stations
- [ ] not started

Fashion/Tailoring and Hairdressing/Styling professions + their stations
in town.

---

## Character appearance customization unlocked through those professions
- [ ] not started

Character appearance customization unlocked through those professions
(first real customization moment in the game — not a day-one screen).

---

## Animal husbandry expansion
- [ ] not started

Animal husbandry expansion: coop→hens→eggs, barn→cow→milk chains fully
wired into crafting.

---

## Tier 2 renovation
- [ ] not started

Tier 2 renovation: template-based room/furniture upgrades (pick-a-preset
layouts), building on the Phase-8-of-MVP... i.e. MVP Step 8's tier-1
repair system.

---

## Tier 3
- [ ] not started

Tier 3: freeform building/furniture placement.

---

## Horses, carriages, boats
- [ ] not started

Horses, carriages, boats — purchasable, tied to the town/stable, old-
world only (no motor vehicles per VISION).

---

## Marriage/partnership, cohabitation
- [ ] not started

Marriage/partnership, cohabitation.

---

## Children
- [ ] not started

Children: birth/adoption flow, growth over time.

---

## NPC-to-NPC relationships the player can observe/gossip about
- [ ] not started

NPC-to-NPC relationships the player can observe/gossip about — feeds
Phase 2's dynamic quests and dialogue flavor.

---

## Full pet relationship depth (beyond Phase 1's simple companion flag)
- [ ] not started

Full pet relationship depth (beyond Phase 1's simple companion flag).

---

## The Season system itself
- [x] satisfied by the World Context Infrastructure work (see `docs/WORLD_CONTEXT.md` Block 3 + the HUD block's minutes amendment) — 2026-07-04. `src/systems/calendar.ts` is real: four seasons, advancing day/hour/minute, day-phase, `absoluteDay`, day-length as a player setting (`settings.dayLengthSeconds`). The "season-change event" is the return-value convention (`advanceMinute` signals day rollover; season read via `currentSeason`). Crop/fish season gating wires in via their own variety blocks.

**The Season system itself** (VISION #7 — referenced as a dependency in
several earlier items, e.g. Phase 0's crop-variety pass and Phase 1's
customer want-table, but never actually built until now):
`src/systems/calendar.ts` — four seasons, a date that advances with the
day/night cycle, and a season-change event other systems subscribe to.
Crop growth/availability (Phase 0 item 7), fish season tags (Phase 0
item 3), and NPC routines/moods all read this calendar. Day length
remains the player-chosen setting from Opening Sequence — seasons ride
on top of that, not a separate clock.

---

## Regions beyond farm/town/forest/river/mine
- [ ] not started

Regions beyond farm/town/forest/river/mine — explicitly open-ended,
author more as the game grows rather than pre-building a fixed map.

---

## More treasure/discovery content, rarer resources deeper into
- [ ] not started

More treasure/discovery content, rarer resources deeper into
forest/mine.

---

## Seasonal festivals with town-wide NPC participation (builds directly on
- [ ] not started

Seasonal festivals with town-wide NPC participation (builds directly on
item 1 above + Phase 1 schedules).

---

## Second save slot
- [ ] not started

Second save slot.

---

## Player rig upgrade
- [ ] not started

> Context (was Phase 7 intro): Richer animation and depth feeling, still top-down, still all code-drawn.

Player rig upgrade: jointed limbs with swing arcs; dedicated animations
per action (cast, reel, dig/hoe, play instrument, carry sack).

---

## Secondary motion
- [ ] not started

Secondary motion: hair/clothes sway, small facial states.

---

## Faked-height depth pass
- [ ] not started

Faked-height depth pass: buildings with two visible faces, diagonal cast
shadows, volumetric characters (keep the flat grid — do NOT convert to
true isometric; that path was tried and abandoned early in this
project, see CLAUDE.md history).

---

## Ambient life
- [ ] not started

Ambient life: birds, falling leaves, weather (rain), night + lanterns.

---

## Feedback juice
- [ ] not started

Feedback juice: hit-pauses, particles on actions, floating numbers,
subtle screen shake on big moments.

---

## Gift point values & dynamic relationship decay — tuning anchor
- [ ] not started

Fills the "exact point values TBD" gap in VISION #6's five-tier gifting. Our
relationship axes run **0-100 each** (not Stardew's 2500), so gift deltas are
tuned to our scale — only the *ratios* between tiers come from Stardew's proven
economy, not its raw numbers.

**Gift deltas (per gift, on a 0-100 axis):**

| Tier | Delta |
|---|---|
| Loved | +35 |
| Liked | +20 |
| Neutral | +8 |
| Disliked | -10 |
| Hated | -20 |

- **Both axes.** Gifts apply to the axis that fits the current relationship —
  Friendship for a platonic bond, Romance for a romantic one. The five-tier
  preference list (loved/liked/neutral/disliked/hated) is the same either way;
  only which axis moves changes. (Preferences are still derived from the NPC's
  personality traits per VISION #6, not hand-authored.)
- **Weekly cap:** 2 gifts per NPC per week, plus one birthday gift that is
  exempt from the cap — so a relationship is built over time, not by dumping a
  stack of loved items in one day.
- **Birthday multiplier:** x2 on the tier delta (a loved birthday gift = +70) —
  a cheap, high-impact emotional beat, sized to our scale rather than Stardew's
  x8 which would blow past 100.

**Dynamic neglect decay.** Ignoring an NPC drifts the relevant axis down — this
is VISION #6's existing "relationships decay if neglected" principle, now with a
rate and, crucially, a **rate that varies with the relationship itself** (not a
flat number):
- Base drift ~-2/day for a shallow/new relationship.
- Deeper/committed bonds (close friendship, dating, marriage) decay much more
  slowly, or effectively stop — so the player never has to "feed" a spouse
  gifts just to keep the number from sliding.
- Same shape as the Skills-decay rule (VISION #1): frequent-but-occasional
  contact slows decay a lot; total neglect speeds it up.

Anchors, not final content: tune the absolute values against the price anchor
table so a loved gift and a rare-fish sale feel proportionate in the economy.

---

## Farm plot expansion — money-gated
- [ ] not started

The farm's tillable/usable area is not fixed forever. Once the starting plot
is in use, the player can buy expansions that grow the usable farm area,
priced at a real-money cost (tune against the price anchor table — this sits
above a fence-repair-scale purchase, closer to an animal-tier spend, since it
permanently grows the farm's capacity).

This is plain **money-gating** (VISION's third gating axis, alongside
tool-gating and relationship-gating) — no bundle/donation mechanic, no unlocks
tied to collecting or contributing items. Buy it, it's yours.

Each expansion is a fixed, discrete step (not a continuous slider) — e.g. one
additional plot-sized area unlocked per purchase — so the payoff is visible
immediately, the same visible-transformation principle as farm-repair
(ROADMAP_MVP Step 8) and Housing tiers (VISION #8). Exact size/price/number of
expansion tiers TBD during implementation.

---

## Dialogue authoring — condition-keyed, not flat pools
- [ ] not started

Replaces a flat "one line per NPC" dialogue pool with a **key -> line** table
per NPC, where the game picks the most specific matching key for the current
moment. This is the proven, AI-free way an NPC reads as alive and aware of the
world (Stardew's model) — it must exist under Phase 1's scripted dialogue
trees (data/dialogue/*.ts) before any NPC ships, not bolted on later.

**Cover all of it, not a subset** — this is a life-sim simulating a real
world, so an NPC's line should be able to react to any of:
- **Season** (spring/summer/autumn/winter, once VISION #7's calendar exists).
- **Weather** (rain, etc., layered within season per VISION #7).
- **Day of week / specific date** (a market day, a festival day).
- **Time of day**, where relevant (morning greeting vs. evening).
- **Location the player just entered** (an ambient line for "you walked into
  my shop" distinct from open-field dialogue).
- **Relationship tier** (Friendship/Romance level — already planned per the
  Relationships block, but must be wired into this same key system, not a
  separate dialogue mechanism).
- **Recent event / quest state** (a one-time "conversation topic" flag with a
  short expiry, so an NPC can react to something that just happened and then
  stop repeating it).

**Precedence rule:** when multiple keys match the current moment, the
**most-specific** key wins (e.g. a Romance-tier + rainy + festival-day line
beats a generic seasonal one). Every NPC still needs a fallback generic line
per season at minimum, so nothing is ever silent for lack of an authored
combination.

**Depends on the World Context package below** (World Context Infrastructure,
blocks 1-4) — the dialogue key-picker should read season/weather/date/time/
location/relationship-tier/flags from `getWorldContext()` rather than each
system re-deriving them independently. Do not duplicate state here.

This does not require new gameplay code beyond a lookup-by-priority function
in the dialogue system — the cost is entirely in authoring more lines per NPC
over time, which can grow incrementally (ship a generic seasonal line first,
add weather/event variants later) rather than needing full coverage on day one.

---

## World Context Infrastructure — build these 4 together, in this order
- [x] built, verified, and closed out in `docs/WORLD_CONTEXT.md` (Blocks 1-6, commits 8c81d32…9e28515) — 2026-07-04. Calendar, weather (season-weighted daily roll, `isRaining` exposed), world event flags (absolute-day expiry), and `getWorldContext()` are all real; the rain→crop-watering mechanical effect intentionally waits for the crop active-tending block, and location/relationships/reputation slices join via Block 6's recipe when their systems exist.

Wildhearth simulates a real, connected world (see the standing skills rule:
"Reality-simulation state check") — nearly every system can be affected by
season, weather, time, location, relationships, skill, reputation, and recent
events. Rather than every system (dialogue, quests, NPC reactions, prices...)
re-deriving that context on its own, these 4 pieces are built once, as a
package, in dependency order, and everything else queries them. **They must
land together and in this order** — that's why they carry internal numbers,
unlike the rest of this file.

Even where a first version only wires ONE variable end-to-end (e.g. dialogue
only reacting to season at first), the World Context system itself must
already expose all the fields below from day one — features grow into using
more of it over time, but the infrastructure recognizes the full shape now.

### 1. Calendar & time (prerequisite — already specced)
Already exists as its own block in this file ("The Season system itself" —
`src/systems/calendar.ts`): four seasons, an advancing date, day/night cycle,
a season-change event other systems subscribe to. Build this FIRST — every
other piece below reads from it. If it is already built, just confirm it
exposes season, current date, and time-of-day as plain readable values (not
just internal state), since the World Context layer (step 4) needs to read
them directly.

### 2. Weather system (new)
`src/systems/weather.ts` — weather does not exist yet as a real mechanic, only
as a mentioned "layer within season" (VISION #7). Build it for real:
- A small set of states (e.g. clear, rain, storm, fog — exact set TBD).
- Each day, roll the day's weather with a probability table keyed by season
  (rain more likely in one season, snow only possible in another, etc.).
- A weather-change event other systems can subscribe to (mirrors the
  season-change event from step 1).
- **At least one real mechanical effect from day one**, not purely cosmetic:
  the clearest, already-identified case is rain auto-watering outdoor crops
  (extends the active-tending crop block — a rained-on crop doesn't need
  manual watering that day). Additional effects (NPC schedule changes, mood,
  fishing odds) can layer on later once this exists.
- A visual layer (rain particles, sky tint) per VISION's Art Direction depth
  toolkit — simplest version first, richer version is a Phase-7-style polish
  pass, not required here.

### 3. World event / topic flags (new)
`src/systems/worldFlags.ts` — a generic mechanism for "something just
happened" state, usable by ANY system (dialogue, quests, NPC reactions):
- Set a flag by string key with a duration (e.g. `setFlag("fixed_bridge", 4)`
  = true for 4 in-game days, then auto-expires).
- Query a flag by key from anywhere (`hasFlag("fixed_bridge")`).
- Persisted like inventory/skills (survives save/load).
- This is exactly the mechanism the Dialogue-authoring block's "recent event /
  a short-lived conversation topic flag" bullet depends on — build it here
  once, as shared infrastructure, rather than inside the dialogue system
  itself.

### 4. World Context — the unified query layer (new)
`src/systems/worldContext.ts` — does NOT store its own data. It's a read-only
aggregator: one function, `getWorldContext(player, location?)`, that pulls
together and returns in one object:
- Season, weather, date, time-of-day (from steps 1-2).
- Active world flags (from step 3).
- Current location/region the player is in.
- Relationship tier(s) with the relevant nearby NPC(s) — reads the existing
  `relationships.ts` system (Friendship/Romance), does not duplicate its data.
- Player's relevant skill level(s) — reads the existing `skills.ts` system.
- Player's Fame/Reputation — reads the existing `reputation.ts` system.
Any system that wants to react to "what's going on right now" calls this one
function instead of individually checking season, then weather, then
relationships, then flags, etc. This is the concrete system that makes the
standing "reality-simulation state check" skill rule actually actionable in
code, not just a design-review habit.
**Depends on:** steps 1-3 above, plus the already-existing Relationships,
Skills, and Reputation systems (built independently elsewhere in this file —
World Context just reads them, doesn't rebuild them).

**Package checkpoint:** any system built after this point (dialogue, quests,
customer wants, NPC reactions) queries `getWorldContext()` for state instead
of deriving it locally. Confirm this by checking the Dialogue-authoring block
above is wired to it, not duplicating its own season/weather checks.

---

## HUD — Calendar & Weather indicator
- [ ] not started

The World Context Infrastructure (see `docs/WORLD_CONTEXT.md`) already
tracks a real, advancing season/day/hour and a real, changing weather
state — but nothing on screen shows it yet. This block is pure UI: read
already-live data, display it, add zero new game logic.

- New `src/ui/calendarhud.ts`, following the existing HUD module pattern
  (`ui/hud.ts`) — a small, always-visible element in a screen corner
  (top-right, next to or below wherever the coin count already sits).
- Call `getWorldContext({ economy, skills, farm, calendar, weather, flags })`
  once per frame from `main.ts`'s `tick()`, exactly where `updateHud(economy)`
  and friends are already called.
- Display: season name + day-of-season (e.g. "Spring, Day 4"), plus the
  current weather (e.g. a short label or a simple code-drawn icon — clear/
  rain/storm/fog). Reuse whatever text/icon-drawing helpers `art/` already
  has; don't introduce a new rendering approach for one small element.
- No interactivity needed — this is a readout, not a window. It does not
  open/close like the backpack or skills window.

**Done when:** the season, day, and weather are visibly correct on screen
at all times, update live as the game clock advances (verify a full day
rollover and a season change are both visible without a reload), and
survive a save/reload showing the correct restored values.

---

## Dev tool — World Context inspector (optional, developer-only)
- [ ] not started

A small toggle-able debug overlay that dumps the full `getWorldContext()`
snapshot as readable text on screen — useful now and increasingly useful
as more slices (relationships, needs, etc.) get added later, since it
replaces the throwaway `console.log` debugging every World Context block
so far has used and then deleted.

- New `src/ui/debugpanel.ts`: a monospace text block, off by default,
  toggled by a key not otherwise in use (e.g. backtick `` ` ``) — check
  `engine/input.ts` for a free key first.
- Renders `JSON.stringify(getWorldContext({...}), null, 2)` (or a lightly
  formatted version of it) in a corner, refreshed every frame while visible.
- This is a developer convenience, not player-facing content — it can be
  visually rough (plain text on a translucent box is enough), and should
  never be reachable through any in-game menu a player would find.

**Done when:** toggling the key shows/hides a live, accurate dump of the
current World Context snapshot during play.

---

## HUD - season, day & time display
- [x] built, verified in-browser (HH:MM, live day/season rollover, day-length setting), committed — 2026-07-04

Adds a small, always-visible readout showing the current season, in-game
day, and time. This is the first real, visible consumer of
`getWorldContext()` (see `WORLD_CONTEXT.md`) - it proves the World Context
data layer is genuinely useful to a player, not just internally verified
via debug logs.

What to show: season name, day number (within the season), and either the
hour or the day-phase (dawn/day/dusk/night) - whichever reads better in a
small HUD corner. Plain readable text is a completely fine first pass; no
icons or animation required yet (that belongs to the later "Juice & feel"
art pass).

Implementation:
- In `main.ts`'s `tick()`, build one `WorldContext` snapshot per frame:
  `const wc = getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags });`
  (field names here must match whatever `main.ts` actually calls its live
  instances today - adjust to match, don't rename existing variables).
- Feed `wc.calendar` into the existing HUD update pattern in
  `src/ui/hud.ts` - extend whatever convention `updateHud()` already uses
  there (it currently takes `economy`) rather than inventing a new one.

**Done when:** the HUD visibly shows the correct season/day/time, and it
updates live as the game's day advances during play (no reload needed).

---

## HUD - weather indicator
- [ ] not started

Depends on the block above - reuses the same `WorldContext` snapshot
already being built once per frame in `main.ts`'s `tick()`. Do not call
`getWorldContext()` a second time in the same frame.

Adds a small weather indicator next to (or directly below) the calendar
readout from the block above, showing `wc.weather`'s current state.

Implementation:
- Plain text label for this first pass ("Clear", "Rain", "Storm", "Fog").
- A visual weather effect (rain particles, sky tint) is already speced
  separately in `WORLD_CONTEXT.md` Block 4, tied to the actual crop-
  watering mechanical effect once that lands - this block is only the HUD
  readout, not the visual weather layer itself. Don't build the visual
  effect here.

**Done when:** the HUD visibly shows the correct current weather, and it
changes at the correct point (the next in-game day) when `weather.ts`'s
daily reroll fires.

---

## Appendix — full skill list, split by when it becomes reachable

**Base (MVP, reachable from the farm/surroundings, no town needed):**
Fishing, Foraging, Farming, Busking, Haggling, Animal Husbandry, Cooking,
Building/Renovation, Ornamental Gardening.

**Expansion (requires the town or a specific unlocked location):**
Baking (needs a proper oven/bakery), Mining (needs the mine — see open
decision above), Blacksmithing, Carpentry, Weaving/Textiles,
Tailoring/Fashion, Hairdressing/Styling, Charisma, Storytelling/
Entertaining, Teaching, Tracking, Riding, Sailing, Herbalism/Medicine,
Astronomy/Weather-reading.

This list is the same 21 skills already agreed on in chat — this appendix
is just the authoritative record of which phase each one belongs to, so
neither of us re-derives it from scratch later.