# Wildhearth — Roadmap to v5

The whole product arc, one section per version (v1 → v5). For each version:
its theme, every system's state, the gap from the previous version, the
dependencies, a rough scope estimate, and the key risks.

**How the versions were defined.** `DECISIONS.md` is the newest source of
truth and gives an explicit **v1** marker and an explicit **v5** marker for
almost every topic (its rule: "if a topic only lists v1, v5 = the maximum
reasonable version"). Those two ends are the fixed anchors. v2/v3/v4 are
**interpolated** here by natural dependency ordering and by
`ROADMAP_EXPANSION.md`'s block sequence. Where `DECISIONS.md` and `VISION.md`
disagree, DECISIONS wins (it is newer). **v1's definition is
`FABLE_PROMPT.md` Parts A–E** — the scope currently under construction on
branch `v1-foundation`.

**Scope estimates are rough.** They are calendar-weeks for this project's
actual pipeline (she is the product owner; an LLM implements, with subagents
doing the heavy lifting). Content-heavy versions and the AI layer are the
least predictable. Treat every number as an order-of-magnitude planning aid,
not a commitment.

---

## Interpretation notes (judgment calls she should review)

These are the places the source docs left a gap or lightly conflicted, and
how this roadmap resolved them. Each is flagged again in the relevant version.

1. **Town = v2, not v5.** `DECISIONS.md` lists the town only in its v5
   "everything exists" bucket, because it only ever lists v1 and v5. Building
   it in v5 would be absurd — the natural "town opens" step is v2, matching
   `ROADMAP_EXPANSION.md`'s block order. v1's 10 NPCs live in the *stall-road
   area, neighbouring farms, and the lake* (all v1 regions per DECISIONS), not
   in a town.
2. **Haggling.** DECISIONS says "Haggling v1: no. Fixed price. Haggling skill
   = v3+." But the Haggling *skill* is already built and applies a passive
   shop discount. Resolved as: the **passive skill discount ships in v1** (it
   already has); **active back-and-forth price negotiation with NPCs is v3+**.
   This satisfies both readings.
3. **AI in v1.** DECISIONS explicitly wants "dynamic AI-driven natural
   conversation" in v1, and `FABLE_PROMPT.md` Part D wants deep AI throughout
   v1. This *reverses* the older VISION/ROADMAP ordering ("AI is the last
   layer"). This roadmap follows DECISIONS: the **AI enrichment layer ships in
   v1**, always behind an off-switch, with a complete scripted game underneath
   (Design Principle Zero holds — AI never gatekeeps).
4. **Riverside Fisherwoman, split.** She is the richest-specced NPC. Her
   *basic* presence (dialogue + fishing shop + teaching) fits v1 as one of the
   10 NPCs at the lake. Her *deep kit* (rod tiers, bait system, boat, diving,
   net fishing, sailing, aquarium, binocular bird/animal/flower sightings)
   lands in v2 alongside transportation.
5. **Needs = 7.** DECISIONS lists 7 (hunger, thirst, energy, hygiene,
   bathroom, mood, social); VISION lists 5. Following DECISIONS: 7.
6. **Marriage/children = v4.** DECISIONS marks these v5 (its only non-v1
   bucket). Interpolated to v4 as the "family arrives" step; v5 only scales and
   enriches family depth.
7. **Second save slot = v5.** DECISIONS marks it v5 (with multi-character).
   Honoured, though the save architecture is built forward-compatible from v1.

---

## Current build state (mid-v1)

v1 is partly built. What is already shipped and verified (per `WORKLOG.md`,
branches `autorun/wildhearth-batch-1` → `v1-foundation`):

- **World:** the farm, an enterable bare/broken tier-1 house interior, and
  money-gated farm-plot expansion. No town, no walked stall-road, no river
  region yet — the world is still one fenced farm.
- **Livelihoods:** Fishing (12 species + junk + hard rod gate), Farming
  (9 crops, active watering/wilt, season-gated, rain auto-waters), Foraging
  (11 finds), Cooking (6 recipes), Busking. "No free animals" enforced —
  hen/cow are barn-gated stall purchases.
- **Skills:** the base 9 (`systems/skills.ts`) — Fishing, Foraging, Farming,
  Busking, Haggling, Animal Husbandry, Cooking, Building, Ornamental
  Gardening — chance-based gains with a UO-style Gain Guard pity mechanism.
- **Simulation spine:** `systems/calendar.ts` (4 seasons, day/hour/minute,
  day-length player setting), `systems/weather.ts` (5 states, season-weighted
  daily roll), `systems/worldFlags.ts`, and `systems/worldContext.ts` — the
  read-only aggregator every future system queries.
- **Economy/UI:** coins, slot-based backpack, shop, stall-selling routed
  through a path/capability-aware `systems/sellCategories.ts` (fishing wired,
  built to extend). Memory Book (`systems/collections.ts` + `memories.ts`),
  clock-dial HUD, basic minimap, camera zoom, toast queue, mouse-first
  controls.
- **Menus:** `ui/titlescreen.ts`, `ui/intro.ts`, `ui/newgame.ts` stubs exist.

**Not yet built for v1 (the remaining Parts A–E):** the NPC engine, Needs,
Relationships, the Dialogue+AI engine, real Character Creation + Guidance-Mode
delivery, the Festival, end-of-day summary, the full visual foundation
(segmented rig, day/night tint, weather visuals, parallax, particles), the
content-library expansion, the AI enrichment layer, and the top-level screens
(main menu, settings, pause, exit dialog).

---

## The arc at a glance

Terse cell = the state of that system at that version. "→" means "grows into."

| System | v1 | v2 | v3 | v4 | v5 |
|---|---|---|---|---|---|
| **World / regions** | Farm + stall-road + forest passage + lake/river | + Town (coastal, inn, merchants), road, fast travel | + Mountains/mine, deep forest | + Coast content, richer town life | + North/south regions, expanded world |
| **Skills** | Base 9, cap, lock, decay | 9 (+ teaching via NPCs) | → ~15 (Mining, Tailoring, Hairdressing, etc.) | ~18 | Full 21 + specializations/records |
| **Economy / trade** | Fixed prices, coins, own+specialty stalls, passive Haggling discount | + Customers to your stall, Reputation, town merchants | + House storage, hire employees, **active** haggling, barter | Dynamic prices begin (season/supply) | Fully dynamic (supply+demand+reputation) |
| **Crafting** | None (Cooking recipes only) | None | 3–4 chains (flour→bread, wool→cloth, milk→cheese) | Chains tied to animals/professions | Deep, choose-your-depth throughout |
| **Quests** | Tutorial + Aspiration + fixed authored; AI dynamic offers | + Town quest-givers | + Quest chains lead to stories | + NPC-relationship-driven quests | Emergent, world-state-driven |
| **Relationships** | 2 axes, 5-tier gifts, 3–4 romanceable, heart events | Same, more NPCs | Deeper heart events, more romanceable | **Marriage, cohabitation, children** | Full family, NPC↔NPC, rumors, reputation |
| **NPCs** | 10, independent, schedule by day-of-week | ~15–25, town homes | ~25–35 | ~35–45, families | 50+, full families/children |
| **Dialogue + AI** | Choice-based + AI variation + BYOK layer + fallback | AI on town NPCs, gossip | Teaching-driven, haggle tone | Story-arc weaving | Full memory-aware, per-choice consequences |
| **Needs** | 7 needs, collapse=coin cost | Same (+ inn sleep) | Same | + partner/child/pet housemates | + full health (diseases/injuries) |
| **Housing / renovation** | Tier-1 repair (roof/window/barn/fence) + plot expansion | Same | Tier-2 template rooms/furniture, storage | Tier-3 freeform placement, full home | Full home + family cohabitation |
| **Transportation** | Walking only | Boats, horses, carriages; fast travel | Expanded routes | Family/shared mounts | Full network |
| **Collections / Memories** | Fish + forage + memory log | + Birds/animals/flowers (binoculars) | + Minerals/treasure | + Festival/family memories | + full collections, aquarium/display |
| **Festivals / calendar / weather** | Calendar+weather built; **1 festival**; weather affects needs/wildlife | 1 festival, town-wide participation | 2 festivals | 3 festivals | **4 festivals** (one/season) |
| **Character creation** | Gender, presets, name, 4 paths, short life-goal, guidance mode | + wardrobe/outfit swap (town) | + appearance via professions | Personality begins to matter | Full spectrum, personality axes, backstories, multi-character |
| **Save system** | 1 slot, autosave, versioned per-store | 1 slot | 1 slot | 1 slot | **2nd slot** + multi-character |
| **Menus / settings** | Title, new-game, char-create, guidance, settings (AI/day-length/HUD/EOD), pause, exit | Same + map markers begin | + storage/employee UI | + family/home UI | Full, rotatable camera option |
| **Art / visual layer** | Full "depth illusion" foundation: outlines, shadows, segmented rig, day/night tint, weather visuals, parallax, particles | Town/coast painters | Mine/profession-station painters | Family/furniture painters | Fullest juice pass (rig upgrade, secondary motion) |

---

## v1 — The farm comes alive

**Theme:** a complete, self-contained life-sim on and around the farm — with
people, needs, relationships, and optional AI — *before a single town building
exists*. Everything must be fully playable and satisfying with AI switched
off.

**Focus / player experience.** She makes a character, picks a Starting Path
(Fisher / Farmer / Musician / Animal-Keeper), and chooses a Guidance Mode.
She works the farm and its surroundings — farm, the stall-road area, a small
forest passage, and the lake/river — earns her way up from 50 coins, and
along the way meets **10 living NPCs** who keep schedules, remember her, have
gift tastes, and can be befriended (and 3–4 romanced). Her seven needs push
her back into her rundown house to eat, sleep, wash, and rest. One festival
lands on day 15. If she has an API key, NPC talk and world moments are
AI-rendered so nothing reads the same twice; if she doesn't, scripted lines
and want-tables carry the whole game.

**System states at v1** (the matrix above has the one-liner per system; here
is the detail on what's *new* versus the current build state — the four core
engines carry the weight).

*Carried from the current build:* **World** opens the farm's fence to add the
stall-road area, a small forest passage, and the lake/river — no town
(`world/zones.ts`). **Skills** stay at the base 9, now gaining *deliberate
learning* (a Teacher NPC) and neglect decay. **Economy** is fixed-price with
own-stall / specialty-stall selling and the passive Haggling discount — no
customers-to-you, no Reputation yet. **Crafting** is Cooking recipes only.
**Housing** is tier-1 repair + plot expansion. **Transportation** is walking
only. **Collections/Memories**, **save**, and the **calendar/weather** spine
are built.

*New this version:*
- **Quests:** the Guidance-Mode engine goes live — Tutorial (step-by-step,
  pauses game-time), Aspiration (path-biased background quests), None. Fixed
  authored quests + AI-generated offers feed one quest log.
- **Relationships (core):** `systems/relationships.ts` — two independent
  axes (Friendship, Romance 0–100), categorized interactions
  (Friendly/Funny/Romantic/Blunt), 5-tier gift preferences **derived from
  personality traits** (loved +35 / liked +20 / neutral +8 / disliked −10 /
  hated −20; weekly cap 2 + birthday ×2), neglect decay whose rate depends on
  bond depth, heart events firing independently per axis into the Memory Book.
  No marriage.
- **NPCs (new, core):** `entities/npc.ts` — 10 NPCs, each identity +
  personality archetype + profession + day-of-week schedule driving a state
  machine (home / work / market / socializing / asleep). Independent (no
  families), but the entity is built forward-compatible for v5 families/heart
  events. They use the same segmented rig as the player.
- **Dialogue + AI (new, core):** choice-based skeleton (2–3 responses/turn)
  with the AI layer rendering the words per personality/mood/relationship/
  weather/time. Every AI feature has a flat fallback. BYOK, budget cap, and
  per-feature toggles in Settings.
- **Needs (new, core):** `systems/needs.ts` — 7 needs (hunger, thirst,
  energy, hygiene, bathroom, mood, social); rates modulated by action +
  season + weather; low needs drag mood, mood modulates skill-gain and busking
  tips and dialogue tone; collapse at zero costs coins, never death. (The
  tier-1 interior spots restore all seven.)
- **Festivals / calendar / weather:** calendar + weather built. v1 wires
  weather/season into needs rates and wildlife migration, and adds the
  Festival engine with **one** festival (day 15, stall-area — theme TBD from
  DECISIONS' open list: Harvest / Solstice / Moon).
- **Character creation (new):** `ui/charcreate.ts` — gender (M/F), curated
  appearance presets (skin/hair/body/height), name (first+last+optional
  nickname), the 4-path system (kit + seeded skill), a short life-goal list
  (3–5 aspirations). No personality sculptor, no backstory picker.
- **Save:** one slot, autosave every 10 min + manual, versioned per-store,
  built forward-compatible for a future 2nd slot / multi-character.
- **Menus (new):** full main menu (Continue / New Game / What's New / Settings
  / Help / Credits / Exit), Settings (day-length, HUD panel, end-of-day
  summary, accessibility, audio, AI section, save management), Guidance picker,
  Pause, three-way Exit dialog.
- **Art / visual layer (new, large):** the "depth illusion" foundation —
  universal outlines, elliptical + diagonal cast shadows, a **segmented rig**
  for player/NPCs/animals with per-action poses, multi-tone canopies, rich
  ground texture, parallax band, weather visuals (rain/storm/fog), day/night
  tint driven by `calendar.ts`, ambient particles. Plus the content library
  (~20 crops, ~10 fish, 6–8 animals, outfits, tools) — all code-drawn.

**Gap from current build → v1 complete:** everything under "Not yet built"
above — the four new core engines (NPC, Needs, Relationships, Dialogue+AI),
the Guidance/Festival/EOD/Character-Creation flows, the save robustness, the
whole visual foundation, the content library, the AI layer, and every
top-level screen.

**Dependencies (within v1):**
- NPC entity → Relationships → Dialogue → AI (each needs the one before it).
- Needs → house interior (built) and → mood-hooks into skills/busking (built).
- Character Creation → Starting Path + Guidance Mode + save.
- AI layer → `worldContext.ts` (built), relationships, NPC memory store.
- Segmented rig (Part B #6) → NPC visuals *and* player action animations.
- Festival → calendar (built) + NPC schedules.
- Everything reactive (dialogue, quests, customers) reads `getWorldContext()`.

**Scope estimate:** ~10–14 weeks of remaining work (rough). The four new
engines and the AI layer are the bulk; the visual foundation and content
library are parallelizable to subagents; the menus are broad but shallow.

**Key risks / unknowns:**
- **AI cost & quality with BYOK** — validating structured JSON against a
  closed action set, rate-limiting, caching, and a fallback that is genuinely
  as good as the AI path (Design Principle Zero). This is the single biggest
  unknown.
- **10-NPC roster** is an open decision (DECISIONS "open decisions"): which
  professions × personalities, which 3–4 are romanceable, where each lives.
- **Needs balance** — 7 needs is a lot to keep non-annoying; the collapse coin
  cost must be tuned against the price anchor table.
- **Segmented rig scope creep** — one rig serving player + NPCs + animals with
  many action poses is a large art-engine task; risk of it swallowing time.
- **Festival theme** and **life-goal list** are still open decisions.

---

## v2 — The town opens

**Theme:** the world stops being a single farm and becomes a *place*. The road
leads to a coastal town with real merchants, an inn, and homes; NPCs move
between farm-country and town on schedules; travel becomes a thing you plan.

**Focus / player experience.** She walks (or, for a few coins, fast-travels)
the road past a thriving neighbouring farm to the town — the social and
commercial hub. Specialized merchants buy and sell by specialty; NPCs come to
*her* stall as customers with real wants; a town-wide Reputation starts to
shift how everyone treats her. The Riverside Fisherwoman's full kit unlocks:
rod tiers, bait, teaching, a boat, diving, net fishing, and binocular
sightings that fill the bird/animal/flower collections. Transportation
(horses, carriages, boats) is now buyable.

**System states at v2** (deltas from v1; unchanged systems carry over):
- **World:** + the full town (coastal, seafront, inn, 3+ specialized merchant
  stalls, 5–8 NPC homes, town square busking spot), the road with a
  neighbouring farm, and the minimap + **paid fast travel** to discovered
  locations. The forest/river extend.
- **Skills:** still 9, now teachable by multiple Teacher NPCs; Sailing/net use
  appears via the boat.
- **Economy:** + `systems/customers.ts` (NPCs walk to your stall with
  want-table-driven demand), + `systems/reputation.ts` (town-wide Fame,
  independent of any one NPC and of Haggling), + town merchants. Barter appears
  first via the Fisherwoman.
- **Quests:** + town quest-givers; schedule-driven availability.
- **Relationships:** same mechanics, more NPCs to build with; the Fisherwoman's
  trait-derived preference (rare aquatic items) is the first live instance.
- **NPCs:** roster grows toward ~15–25 with the town homes; the
  `systems/schedule.ts` engine moves them between fixed points across the day.
- **Dialogue + AI:** AI (if on) now covers town NPCs, gossip between them, and
  location-aware lines (the condition-keyed dialogue table).
- **Needs:** + sleeping at the inn (a second sleep location).
- **Housing:** unchanged (still tier-1 + plot expansion), but wardrobe/outfit
  swapping arrives with the town (hairdresser + clothes stall).
- **Transportation (new):** boats (Fisherwoman), then horses/carriages tied to
  a town stable; fast travel live.
- **Collections:** + birds/animals/flowers via binoculars; + a home aquarium
  for duplicate rare catches.
- **Festivals:** the one festival now has town-wide NPC participation.
- **Character creation:** + first appearance *change* during play (wardrobe).
- **Art:** town + coast + boat/water + neighbouring-farm painters; a basic
  diving underwater transition.

**Gap from v1:** build the town region and its buildings; the schedule engine;
customers + reputation; the Fisherwoman's full kit (rod tiers, bait, teaching,
boat, diving, net, sailing, aquarium, sightings); minimap fast travel;
transportation vendors; wardrobe/outfit swapping.

**Dependencies:** town buildings need the expanded `zones.ts`; customers need
the stall + reputation + schedules; fast travel needs the minimap + discovered
locations; the Fisherwoman's boat gates diving/net/deep-water fish; sightings
need the (built) collections engine + binoculars.

**Scope estimate:** ~8–12 weeks (rough). The Fisherwoman block alone is large;
the town buildout is broad but reuses established patterns.

**Key risks / unknowns:**
- **Mine/mountain gating** is still an open decision (reachable from
  farm/forest, or gated behind the town smith?) — it doesn't block v2 but
  should be resolved before v3.
- **Schedule believability** — NPCs pathing around a bigger world without
  looking robotic; still straight-line vs. collision (real pathfinding is
  later polish).
- **AI call volume** rises sharply with more NPCs and gossip — caching and
  per-NPC rate limits get their first real stress test here.
- **Economy inflation** — customers-to-you plus specialty merchants can break
  the tight poverty pacing if not tuned against the anchor table.

---

## v3 — Crafting, professions & appearance

**Theme:** depth of *making* and *becoming*. Production chains, appearance-
tied professions, the mountains/mine, and the first home upgrades beyond bare
repair. This is the "choose your own depth" cluster from VISION.

**Focus / player experience.** She can now buy a finished good *or* run the
production chain herself for better margin (wheat→flour→bread, wool→yarn→cloth,
milk→cheese). New professions open: Mining in the mountains, Tailoring/Fashion
and Hairdressing/Styling in town — and *these* are how she finally customizes
her look beyond the day-one presets. She can rent/hire an NPC to work her
stall, store goods in her house, and haggle actively with merchants. Her home
gets its first real furniture (tier-2 templates).

**System states at v3** (deltas):
- **World:** + mountains/mine region (rarity increases deeper in) + deeper
  forest/treasure. The mine's access gate is resolved (see risks).
- **Skills:** grows toward ~15 — Mining, Baking, Tailoring/Fashion,
  Hairdressing/Styling, Carpentry/Blacksmithing begin (the "expansion" half of
  the 21-skill appendix).
- **Economy:** + house storage (cabinets/boxes/wardrobes — DECISIONS "v3+"),
  + hiring an NPC employee for your stall (DECISIONS "v3+"), + **active
  haggling** (the negotiation, not just the passive discount — DECISIONS
  "Haggling skill v3+"), + fuller barter.
- **Crafting (new):** `systems/crafting.ts` generic chain engine + 3–4 authored
  chains; crafted goods sell for more than raw.
- **Quests:** + quest chains that lead the player toward stories.
- **Relationships:** deeper heart events; more romanceable NPCs; still no
  marriage.
- **NPCs:** ~25–35, some tied to the new professions (smith, tailor,
  hairdresser, miner).
- **Dialogue + AI:** teaching quality reads the teacher's sheet; haggling
  skill visibly shapes merchant *tone*, not just the number; dynamic quest
  generation layered on the fixed list.
- **Needs:** unchanged.
- **Housing (new):** tier-2 template-based room/furniture upgrades — the first
  visible contrast against the bare/broken tier-1 interior. Home storage lives
  here.
- **Transportation:** expanded routes as regions grow.
- **Collections:** + minerals/treasure (via mining).
- **Festivals:** a second festival added.
- **Character creation:** the **first real customization moment** — appearance
  changed through the Fashion/Hairdressing professions (not a day-one screen).
- **Art:** mine/profession-station painters; tier-2 furniture painters.

**Gap from v2:** the crafting engine + chains; Mining + the mine region;
Fashion/Tailoring + Hairdressing professions and their stations; appearance
customization unlocked through them; house storage; employee hiring; active
haggling; tier-2 renovation.

**Dependencies:** crafting needs animals/crops as inputs (built) and stations
(new); professions need the town (v2); appearance customization needs the
professions; the mine needs its access decision resolved; tier-2 renovation
builds on the tier-1 repair system (built).

**Scope estimate:** ~10–14 weeks (rough). Crafting + multiple new professions
+ a new region is the widest content version so far.

**Key risks / unknowns:**
- **Mine access decision** must be made before starting (open in both DECISIONS
  and ROADMAP).
- **Profession sprawl** — 4–6 new skills each need a real mechanic, not a stub.
- **Economy re-balance** — crafting margins + employees + active haggling
  interact; easy to break the earned-economy pillar.
- **Appearance tech** — mid-game appearance changes must not break saved
  characters or the segmented rig / outfit painters.

---

## v4 — Family, home & a living economy

**Theme:** the Sims pillar reaches full weight. Marriage, cohabitation, and
children arrive; the home becomes fully yours; the town's people have families
and relationships among themselves; and prices start to breathe with season
and supply.

**Focus / player experience.** A long-built romance can become partnership,
cohabitation, and children — with shared pets and a real household. She can
place furniture freely (tier-3), fill her home, and store/display her
collection. The town feels alive between its own people (NPC↔NPC
relationships, rumors, reputation that ripples). Prices begin to shift with
season and supply. A third festival joins the calendar.

**System states at v4** (deltas):
- **World:** + coast content (distinct from the river) + richer town life.
- **Skills:** ~18 (Riding, Weaving, Herbalism, Storytelling, Teaching filling
  in).
- **Economy:** **dynamic prices begin** (season + supply + demand shifting off
  the fixed anchors) — the bridge to v5's fully dynamic market.
- **Crafting:** chains tie into the expanded animal-husbandry (coop→hens→eggs,
  barn→cow→milk fully wired) and professions.
- **Quests:** + NPC-relationship-driven quests (a broken friendship, a bumper
  harvest) — the AI story layer feeds these.
- **Relationships (new, core):** **marriage/partnership, cohabitation, and
  children**; NPC↔NPC relationships the player can observe/gossip about;
  full pet relationship depth; reputation impact and rumors.
- **NPCs:** ~35–45, now with families and children among them.
- **Dialogue + AI:** story-arc weaving — the AI tracks play patterns and
  surfaces emergent threads.
- **Needs:** + partner/child/pet as housemates who factor into daily life.
- **Housing (new):** tier-3 freeform building/furniture placement — the full
  home. Collections displayable.
- **Transportation:** family/shared mounts.
- **Collections / Memories:** + festival and family memories (marriage, a child
  born) logged into the Memory Book.
- **Festivals:** a third festival.
- **Character creation:** personality begins to matter (traits influence
  family/dialogue), foreshadowing v5's full personality axes.
- **Save:** still one slot (2nd slot is v5, but the architecture is ready).
- **Art:** family/child/furniture painters; fuller home interiors.

**Gap from v3:** the marriage→cohabitation→children flow; NPC↔NPC
relationships + rumors; full pet depth; tier-3 freeform housing; dynamic
pricing; the animal-husbandry crafting expansion; the third festival.

**Dependencies:** marriage needs mature relationships (v1 engine) + romanceable
NPCs (v2/v3) + housing to cohabit in (tier-3, here); children need marriage;
dynamic pricing needs the economy/reputation systems (v2); NPC↔NPC needs the
schedule + relationship engines; story-arc AI needs the memory + play-pattern
tracking.

**Scope estimate:** ~8–12 weeks (rough). Family systems are conceptually deep
but reuse the relationship engine; tier-3 building and dynamic pricing are the
new heavy pieces.

**Key risks / unknowns:**
- **Children over time** — growth/aging is a genuinely new time-axis and can
  ripple into schedules, needs, and save data.
- **Dynamic pricing** can destabilize the earned-economy pacing; needs careful
  bounding around the anchor table.
- **NPC↔NPC + rumors + AI** is where the AI layer is most exposed to
  incoherence and cost; the structured-JSON validator and caching must be rock
  solid by now.
- **Freeform building** (tier-3) is a large UI/placement/persistence task.

---

## v5 — Product-complete

**Theme:** everything at maximum. The full world, 50+ NPCs with full
personalities and families, deep customization and multi-character play, full
health, a fully dynamic economy, and the fullest art/juice pass. This is the
DECISIONS "v5" bucket made real.

**Focus / player experience.** The world reaches its full extent — town, true
forest, mountains, coast, and expanded northern/southern regions worth
crossing for their distinctive resources. 50+ NPCs live full lives with
families, backstories, evolving personalities, Heart Events, and inter-NPC
webs. Character creation is a full spectrum (appearance, personality axes,
multiple backstories tied to life-goals), she can run multiple playable
characters, the camera rotates, and four festivals mark the year. The AI layer,
when on, makes no two playthroughs alike; when off, it is still a complete
game.

**System states at v5** (the maxima):
- **World:** all regions — farm, stall-road, forest, lake/river, town, coast,
  mountains/mine, deep forest, and expanded north/south regions; rotatable
  camera.
- **Skills:** full **21** + specializations + records.
- **Economy:** fully dynamic prices (season + supply + demand + reputation).
- **Crafting:** deep, choose-your-depth across every profession.
- **Quests:** emergent, world-state-driven; quest chains lead to full
  storylines.
- **Relationships:** full family, NPC↔NPC webs, rumors, reputation impact,
  contextual gift preferences (season/weather/specific-item), Heart Events for
  all appropriate NPCs.
- **NPCs:** 50+, full families with children, backstories, individual
  preferences.
- **Dialogue + AI:** full memory-aware conversation where each choice leads to
  a different narrative path with consequences; anti-repetition throughout.
- **Needs:** + a full health system (diseases, injuries) on top of the 7 needs
  — still no death, still soft consequences.
- **Housing:** full freeform home + family cohabitation.
- **Transportation:** the full old-world network.
- **Collections / Memories:** full collections (50+ per category) + display.
- **Festivals:** **four** (one per season).
- **Character creation:** full Sims-style appearance spectrum + tattoos/makeup,
  full personality axes with in-game evolution, multiple backstories,
  full multi-goal aspiration system, **multi-character** (multiple playable).
- **Save:** **second slot** + multi-character support.
- **Menus:** everything, including the rotatable-camera option.
- **Art:** the fullest juice pass — player rig upgrade (jointed limbs, per-
  action animation arcs), secondary motion (hair/cloth sway, facial states),
  faked-height depth (two-face buildings, diagonal cast shadows), full ambient
  life, feedback juice (particles, floating numbers, gentle screen shake).

**Gap from v4:** scale the NPC roster to 50+ with families/backstories; full
personality axes + evolution; multi-character + second save slot; the full
appearance spectrum; the full health system; world expansion (north/south,
true forest, mountains fully realized, coast); the fourth festival; fully
dynamic economy; the fullest art/juice pass.

**Dependencies:** multi-character needs the second save slot; full personality
axes feed dialogue/relationships/gifts everywhere; the health system extends
Needs; world expansion reuses all region/painter patterns; the art juice pass
touches every entity (build on the v1 segmented rig).

**Scope estimate:** ~14–20 weeks (rough) — the largest by content volume and
polish, but mostly *scaling and enriching* systems that already exist rather
than inventing new engines.

**Key risks / unknowns:**
- **Content volume** — 50+ NPCs with backstories/families/schedules and 50+
  entries per collection is an enormous authoring load (AI-assisted, but still
  needs validation and coherence).
- **Personality evolution** interacting with everything (dialogue, gifts,
  relationships, family) is a deep systemic risk.
- **Health system** must stay inside the "peaceful, no death" pillar while
  having real teeth.
- **AI at scale** — cost, coherence, and anti-repetition across 50+ NPCs and
  emergent quests is the hardest version of the AI problem.
- **Multi-character save migration** — getting the architecture right early
  (v1) is what keeps this from being a rewrite.

---

## Dependency spine (across all versions)

The order things *must* be built in, regardless of version boundaries:

```
calendar + weather + worldFlags + worldContext   [built]
        │
        ├── Needs ──┐
        │           │
   NPC entity ── Relationships ── Dialogue ── AI enrichment
        │           │                │
   Schedules    Gift/heart      Quests ── dynamic quests
        │        events            │
     Customers ── Reputation ── active haggling
        │
   Town region ── merchants ── transportation ── fast travel
        │
   Crafting ── professions ── appearance customization
        │
   Marriage ── children ── NPC↔NPC ── story-arc AI
        │
   Full world + 50+ NPCs + health + multi-character + juice
```

Read top-to-bottom: nothing lower starts cleanly before the thing above it
exists. `worldContext.ts` is the hub every reactive system queries — it is
already built, which is why v1's remaining engines can all plug into a live
snapshot instead of re-deriving state.

## Rough total

v1 (remaining) ~10–14 · v2 ~8–12 · v3 ~10–14 · v4 ~8–12 · v5 ~14–20 weeks.
**Order of ~50–70 developer-weeks from the current mid-v1 state to v5**, with
wide error bars. The two biggest unknowns are the AI layer's cost/quality (from
v1 onward) and the v5 content-authoring volume.
