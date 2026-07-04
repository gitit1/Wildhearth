# Wildhearth — The Full Picture

This is the **map of the game**, not a build spec. Every other doc
(`VISION.md`, `ROADMAP_MVP.md`, `ROADMAP_EXPANSION.md`, `WORLD_MAP.md`,
`WORLD_CONTEXT.md`) already decides the details — this file exists so you
can see the *whole shape* of Wildhearth in one place, with an honest status
tag on every piece: what's actually running in code today, what's fully
designed but not built, and what's still an open question. New task blocks
get derived from the gaps this document exposes, not the other way around.

**Status legend**, used throughout:
- 🟢 **Built** — real, working code today.
- 🔵 **Speced** — fully designed in another doc, not built yet.
- 🟡 **Partially speced** — named/intended, details still thin.
- ⚪ **Open question** — a real unresolved decision, not forgotten, just undecided.

---

## What this is

A single-player, old-world life-sim: you start with almost nothing on a
rundown farm and claw your way to a full life. Mechanically, it's **The
Sims'** living characters and relationships + **Ultima Online's** skills,
economy, and open world + a farm-game's renovation arc. No combat, no
monsters, no death risk — tension comes from money, relationships, time,
and ambition. NPCs can optionally be powered by a real LLM that thinks,
remembers, and reacts, but the game is complete and substantial without it.

**Design principle zero, governing everything below:** the mechanical
simulation works with **zero AI calls**. AI is a layer on top, never a
foundation. Turning it off never hollows the game out.

**Era:** horses, carriages, boats — no engines, no cars, no true 3D, ever.

---

## The world 🟡

Hub-and-spoke, farm at the hub. See `WORLD_MAP.md` for the live tracking
sheet of exactly what's been detailed vs. just named.

| Region | Status | Notes |
|---|---|---|
| The Farm | 🟢 rundown state built (repairs: roof/window/barn/fence) | renovated states 🟡 (tiers named, visuals not walked through) |
| House interior | 🔵 | tier-1 bare/broken pass fully speced, not built |
| Market/dock area | 🟡 | confirmed separate & walkable, layout not detailed |
| Road (farm → town) | 🔵 | neighboring farm, ambient wildlife, minimap reveal, paid fast travel all speced |
| Town | 🟡 | inn + 3 merchants + 5-8 homes named, coastal, not walked as a place |
| River | 🔵 | richest single spec in the game — see the Riverside Fisherwoman below |
| Forest edge | 🟡 | foraging mechanic done, the place itself not walked |
| Deep forest / treasure | ⚪ | named only |
| Mountains / Mine | ⚪ | **open decision**: reachable from farm/forest, or gated behind the town? Not resolved — resolve before building it |
| Coast (near town) | ⚪ | named as distinct from the river, no content yet |

**Three deliberate gating axes**, mixed on purpose so no single system does
all the work: **tool-gating** (own a rod to fish, a pick to mine),
**relationship-gating** (a neighbor's back field, an NPC's personal quest),
**money-gating** (fast travel, animals, renovations, farm-plot
expansions 🔵).

**Travel is meant to be worth doing**: resources are distributed unevenly
across regions on purpose (UO-style), so fast travel is a convenience on
top of a world worth crossing, not a way to skip an empty one.

---

## The opening arc 🟡 (MVP has a simplified version; full version is speced)

1. Title → (New Game only) character creation 🔵 → skippable intro story →
   reveal the rundown farm *before* any choice is asked → **Starting Path**
   choice → **Guidance Mode** (Tutorial / Aspiration / None, always
   changeable later) → play begins.
2. **Four Starting Paths** 🔵 (MVP ships a simplified single-tool version
   🟢): The Provider (fishing+foraging), The Tender (farming+building+
   gardening), The Performer (busking+haggling), The Keeper (animal
   husbandry+cooking). Each seeds 2 skills + a 2-item kit.
3. **Nothing is free, ever** — absolute rule. Every tool, animal, seed, and
   upgrade is bought with money earned in-game. 🟢 enforced for the MVP's
   five livelihoods; 🔵 the "no free animals" correction is speced but the
   cow/hens fix is not yet built.
4. Concrete first-quest content (tutorial 4-step skeleton + path-specific
   aspiration chains, including the Keeper's forage→cook→sell bridge since
   no animal is free on day one) — 🔵 fully written, not built.

---

## Core systems

### Skills 🟢 (partial) / 🔵 (full)
UO-style, 0.0-100.0, three-state lock (up/down/locked). 🟢 today: 5 skills
(Fishing, Foraging, Farming, Busking, Haggling), use-based gain with
diminishing returns, no overall cap yet. 🔵 not built: the full 21-skill
list (base 9 + 12 town/expansion skills, see `ROADMAP_EXPANSION.md`'s
appendix), the overall point cap + full lock enforcement, the UO-style
Gain Guard pity mechanism, and dynamic decay from neglect. Tools/gear
requiring a skill floor to pay off (buying ahead of your skill wastes
money) is a universal rule, 🔵 not yet enforced anywhere.

### Inventory & Economy 🟢
Slot-based backpack (🟢), dual currency+barter economy (🟢 currency, ⚪
barter never built — the Riverside Fisherwoman block is the first planned
instance). Confirmed price anchor table exists (starting coins 15, basic
tool 20-30, first hen 40-50, first cow 150-200, etc.) 🔵 mostly unused
until more goods/animals exist. Town-wide Fame/Reputation, separate from
any one NPC's opinion and from Haggling itself — 🔵 speced, not built.

### Crafting 🔵
Depth is the player's choice — always buy finished, or invest in the
production chain yourself. A handful of 3-4 step chains (wheat→flour→
bread, wool→yarn→cloth, milk→cheese). Not built.

### Quests 🟡
Hybrid: fixed authored quests work with AI off; AI-on layers dynamic
offers on top of the same quest-log UI. Guidance Mode is the player-facing
control. 🔵 fully speced; 🟡 the MVP's Tutorial/None toggle exists as a
*setting* already but nothing delivers on it yet (correctly inert, not
broken).

### Relationships 🔵
A pillar equal to the economy, not a side feature. Two independent axes
per NPC (Friendship, Romance) — not one meter. Categorized interactions
(Friendly/Funny/Romantic/Blunt), five-tier gift preferences **derived from
personality traits**, not hand-authored, with concrete tuned point values
(loved +35 / liked +20 / neutral +8 / disliked -10 / hated -20 on our
0-100 scale, weekly cap of 2 gifts + a birthday exemption at x2 multiplier,
and **decay whose rate itself depends on relationship depth** — shallow
bonds fade faster, committed ones barely fade at all). Milestone heart
events fire independently per axis and log straight into the Memory Book.
Marriage, cohabitation, children, and pets are all in scope at maturity.
Nothing here is built yet.

### Seasons & Weather 🟢 (infrastructure) / 🔵 (gameplay effects)
🟢 **Built**, as of the World Context Infrastructure work: a real
`calendar.ts` (four seasons, advancing day/hour, day-phase) and a real
`weather.ts` (season-weighted daily rolls, persisted, `isRaining()`
exposed). 🔵 **Not yet wired to gameplay**: rain auto-watering crops
(waiting on the active-tending farming block), festivals, NPC mood/routine
shifts by season, and crop/fish availability gated by season. Day length
is a player-chosen setting — 🔵 speced, not built.

### Housing & Building 🟡
Tiered, player-directed depth: tier-1 is the MVP's static rundown/repaired
states 🟢 (4 repairs: roof/window/barn/fence), tier-2 is template-based
room/furniture upgrades 🔵, tier-3 is full freeform placement 🔵. Farm-plot
expansion (buy more usable farm area with money) is 🔵 speced, not built.

### Needs 🔵
Hunger, energy, hygiene, mood, social — full Sims-style interaction, not
siloed: low needs drag mood down, mood affects skill-gain rate and busking
tips and dialogue tone; total neglect triggers a soft "collapse" that costs
coins, never a game over. Tier-1 house interior (hearth, wash basin, bed,
rest chair) is the minimum needed to restore all five. Not built.

### Collections & Memories 🔵
One physical, diegetic book in the house, two tabs. **Collections**:
per-category discovery tracking (birds/animals/flowers first, requires
binoculars; fish/foraged items/minerals generalize the same engine later).
**Memories**: a curated life-event log (first sale, first hen, a
relationship milestone, a festival) with a timestamp and flavor text —
deliberately curated, not auto-logging everything (a documented Sims 3
failure mode). Not built.

### Transportation 🟡
Old-world only (horses, carriages, boats), money-gated. Fast travel is
Sims-style: pay a small coin cost, only for locations already discovered
on foot. The Riverside Fisherwoman is the first planned vendor (rent/buy a
boat). Not built.

### Professions beyond the starter five 🔵
Mining, Cooking (an early minimal version is required for the Keeper
path), Fashion/Tailoring, Hairdressing/Styling — same "choose your own
depth" philosophy as crafting. Not built.

### Character creation & customization 🔵
Real but bounded: gender, a curated set of preset appearance options
(skin/hair/body), starting clothes from presets, a name. Deep
customization (tailored clothing, real hairstyling) is deferred to the
Fashion/Hairdressing professions. Not built (MVP skips this entirely for
now).

### Persistence & Save 🟢
One save slot, versioned per-store saves (economy/skills/farm/calendar/
weather/flags each own their key), autosave, tolerant of corrupt data,
New Game wipes every game-state key via a central `GAME_KEYS` list while
leaving settings untouched. A second save slot is 🔵 speced for later.

### World Context (infrastructure layer) 🟢
Not a game system a player sees — the plumbing every future system reads
from. `getWorldContext(sources)` returns a live, read-only snapshot: coins,
skills, farm-repair state, calendar, weather, and active world-event flags,
all from the game's existing live objects, no duplicated state. Built in
full (see `WORLD_CONTEXT.md` for the complete block-by-block history).
This is what the dialogue system (below) will read from once it exists.

### NPC brain / AI layer ⚪ (deliberately last)
Two-part model per NPC: a fixed character sheet + dynamic memory. LLM
calls only at meaningful moments (dialogue, buy/haggle, quest offers,
teaching), never per tick. Structured JSON responses validated against a
closed action set — never free-form execution. Documented pitfalls from
shipped LLM-NPC games (cost discipline, players actively breaking
character, "alive" doesn't require novelty) are already folded into the
design. This is explicitly the **last** layer to build — everything above
must work and feel complete with AI off first.

---

## NPCs — what exists in the design today 🟡

Only one NPC is fully speced: **the Riverside Fisherwoman** — dialogue,
a fishing-only shop, rod tiers with time-cost upgrades, a bait system with
skill floors, first Teacher NPC, first Transportation vendor, first barter
instance, bird/animal/flower sighting (binoculars-gated), wild-fruit→seed
bridging, catch quality tiers, boat-gated deep water + diving, net fishing,
sailing, and a home aquarium. Town NPCs (5-8 planned) are ⚪ still an open
roster question. NPC schedules, the generic NPC entity, and the dialogue
condition-key system (season/weather/day/location/relationship/flags, most-
specific-match-wins) are all 🔵 speced, none built.

---

## Controls 🟡
Mouse-first (click-to-move, click-to-open-windows) on top of an
already-built keyboard+touch base. 🟢 built: keyboard/touch base, basic
interaction system (hover, left-click act-or-walk, right-click context
menu). 🔵 not yet retrofitted: click-to-move pathing, on-screen window
icons as the primary way in (keyboard shortcuts stay as secondary), camera
zoom.

## Art direction 🟢 (established) / 🔵 (fullest version)
Top-down 2D, everything drawn in code — no image assets, no true 3D ever.
🟢 in use today: the normal/rundown painter-pairing pattern (house, farm
objects). 🔵 the fuller "depth illusion" toolkit (jointed rigs, two-face
buildings, diagonal shadows, parallax, underwater transitions) is the
long-term identity, arriving progressively as content needs it, fullest
version in the later "Juice & feel" pass.

## Non-goals (fixed, not up for revisiting casually)
Multiplayer. True isometric or photorealistic graphics. Combat, monsters,
death. Mobile app stores (browser-first). A character creator forced on
day one for the MVP specifically (it's real for the full game, just not
the MVP's job).

---

## How to use this document

When you want to add depth to the game, start here: find the system, check
its status. 🟢 → already real, changes go through the normal commit/
WORKLOG flow. 🔵 → fully designed already, the next step is just picking it
up as a build block from `ROADMAP_EXPANSION.md`. 🟡 → needs a short
discussion to firm up before it becomes a real block. ⚪ → needs an actual
decision first, not more detail — flag it and resolve it before building
anything that depends on it.

This file should be kept honest as things get built — flip a status tag
the same day a block ships, the same discipline as `WORLD_MAP.md`'s
tracking sheet.
