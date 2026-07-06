# Wildhearth — Proposals

Ideas that strengthen the game but aren't already decided in `DECISIONS.md`,
`VISION.md`, or scheduled in `ROADMAP_EXPANSION.md`. Where an idea answers one
of `DECISIONS.md`'s "open decisions still on the table," that's noted — a
proposal, not a decision; she picks what sticks. Grounded throughout in the
pillars: nothing is free, rarity comes from context knowledge over luck,
content should never feel templated, tension comes from money/relationships/
time/ambition (never danger), and skills carry UO's depth while relationships
carry Sims' depth. Every idea respects the hard constraints: no combat, no
death, no monsters, no PvP, all art stays code-drawn, browser-first.

---

## Mechanic Proposals

### 1. Folk Weather-Reading
Once the Astronomy/Weather-reading skill (already on the confirmed 21-skill
list) exists, give it a concrete payoff beyond a passive stat: above a skill
floor, the player can read tomorrow's weather a day early from in-world cues
— cloud shapes over the mountains, birds flying low, animals restless in the
coop — surfaced as a small HUD/journal hint rather than a raw number. This
turns a skill point into an actual planning advantage (water crops tonight
before tomorrow's dry spell, delay a fishing trip before a storm) instead of
a passive multiplier, reinforcing "context knowledge over luck" concretely
for weather the same way skill floors already do for fishing gear.
**Version:** v2/v3 (once Astronomy exists). **Touches:** `systems/weather.ts`
(expose a same-day "tomorrow" roll gated by skill floor, not just the current
day's state), `systems/skills.ts`, HUD/journal display.

### 2. Skill Journals — collectible technique scrolls
A UO-flavored alternative to always training with a live teacher NPC: found
or purchased "journals" (a fishing knot-tying pamphlet, a farmer's seed-
rotation notes, an old busker's songbook) that permanently unlock a specific
technique or recipe variant the moment they're read, rather than raising the
skill number directly. This gives skill purchases an object-collectible feel
— something to actively seek out in the world (forest treasure spots, market
oddities stall, a gift from a high-Friendship NPC) — distinct from the
already-speced paid-teacher mechanic, which stays the faster/more expensive
route. **Version:** v2/v3. **Touches:** a new inventory item subtype in
`systems/inventory.ts`, unlock flags in `systems/skills.ts`, shop/treasure
tables.

### 3. Bounty Board
A rotating board at the market/stall-area listing a handful of "wanted"
items — a specific fish species, a specific crop, a rare foraged item — each
posted for a limited window (a few in-game days) and paying a flat bonus on
top of the normal fixed sell price when fulfilled. This adds urgency and a
reason to check back regularly without touching the fixed-price economy
decision (DECISIONS.md: prices are fixed in v1) — the bonus is a stacked
reward on a bounty fulfillment, not a change to the base price. Doubles as
a soft, non-quest way to nudge the player toward a livelihood she's been
neglecting. **Version:** v2. **Touches:** new `systems/bounties.ts` (rotation
timer, reward payout), reads from `data/fish.ts`/`data/forage.ts`/crop data,
hooks into `systems/reputation.ts` for a small Fame bump on fulfillment.

### 4. Journeyman's Table — cross-skill combo bonuses
A small bonus system rewarding a player who actually uses her own production
chain rather than always buying raw ingredients at market: cooking a dish
using an ingredient she grew/caught/foraged herself (not bought) yields a
modest quality/price bonus on top of the recipe's normal output, scaled by
the *combination* of the two relevant skill levels (e.g. high Farming + high
Cooking = a noticeably better loaf than store-bought flour + high Cooking
alone). This makes "own the whole chain" a genuine payoff distinct from
Crafting's existing buy-vs-craft choice (VISION #4), which only rewards
depth within one chain, not connections across two skills. **Version:**
v2/v3 (needs Cooking + at least one gathering skill live, which both already
are). **Touches:** `systems/crafting.ts` (recipe metadata: "self-sourced"
ingredient flag), `systems/skills.ts` (read two skill values, not one).

### 5. Weight of the Season — one time-critical task per season
Each season gets exactly one recurring task with a real, visible deadline —
spring's planting window before the ground firms up, autumn's harvest before
the first frost spoils an unharvested field — creating a soft, seasonal kind
of pressure distinct from the moment-to-moment pressure of Needs (hunger,
energy) or the day-to-day pressure of the economy. It's meant to be a small,
memorable beat four times a year, not a constant timer — miss it and a field
underperforms (lost yield, not lost save), never a hard fail. Reinforces
"tension from time and ambition, never danger." **Version:** v2 (needs
Seasons live, which they are). **Touches:** `systems/calendar.ts` (season-day
countdown flag), `systems/farm.ts`/crop growth logic, a HUD/journal reminder.

### 6. Scene Snapshots for the Memory Book
A "capture this moment" action at scenic spots (a river sunset, the farm in
first snow) or big milestones (a Heart Event, a festival) that stores a small
thumbnail alongside the Memory Book's existing flavor text — today Memories
are text-only. Critically, this stays "all art is code": the game stores the
*scene parameters* (location, season, weather, nearby entities/poses) at
capture time, not a saved bitmap — the thumbnail is recomposed live from the
existing painter functions whenever the Memory Book is opened, the same way
the world itself is redrawn every frame. No image asset is ever written to
disk or save data. **Version:** v3 (pairs naturally with the "Juice & feel"
art pass). **Touches:** `systems/memories.ts` (store a compact scene
descriptor per entry), a new small-canvas render path in `ui/memorybook.ts`
reusing existing `art/` painters.

---

## Feature Ideas

### 7. Roadside Travelers
Ambient, non-schedule-bound minor figures glimpsed on the farm-to-town road
before the full town NPC roster exists — a peddler passing with a cart, a
messenger on horseback, a shepherd moving a small flock. These are flavor,
not full NPCs: no name persistence, no relationship tracking, occasionally
offering a tiny one-off trade or a passing line of dialogue, distinct from
the planned wild-animals-along-the-road block (which is pure ambient
wildlife with no interaction at all). Makes the road feel like a lived-in
route from the very first walk to market, not an empty corridor waiting for
Phase 1's town. **Version:** v1/v2. **Touches:** `world/zones.ts` (road
segment spawn points), a lightweight one-off encounter table, no new
persistent entity type needed.

### 8. Personal Diary — a player-written page in the Memory Book
Alongside the Memory Book's curated, auto-logged "firsts," add a second,
optional page where the player can type her own short reflection at any
point — not AI-generated, not prompted, just a blank timestamped entry she
chooses to write. A small, quiet feature that lets the memory book feel like
hers, not only the game's record of her — a genuinely Sims-adjacent touch
(a real scrapbook has handwriting in the margins) that costs almost nothing
to build. **Version:** v2. **Touches:** `systems/memories.ts` (a
player-authored entry type alongside curated ones), `ui/memorybook.ts` (a
simple text-input page).

### 9. Personal Almanac — records tab
A new Memory Book tab distinct from the existing Collections (X/Y discovered
per category): personal *records*, not discovery — biggest fish ever landed,
best-quality crop ever harvested, longest relationship streak without decay,
first perfect (all-loved-gift) week. Discovery answers "have I found this
yet"; records answer "how well have I done this" — a second axis of mastery
that keeps rewarding a player long after every species/flower in a category
is already checked off. **Version:** v2/v3. **Touches:** `systems/
collections.ts` (extend with a parallel "best value seen" tracker per
category), `ui/memorybook.ts` (third tab).

### 10. Weather-appropriate wardrobe bonus
A small mechanical hook for the outfit system (5 per gender, buy others),
which today is cosmetic-only per DECISIONS.md: wearing a weather-appropriate
outfit (a cloak in rain, lighter clothes in summer heat) gives a minor Needs
mitigation — slightly slower hygiene/mood decay while out in bad weather —
never a requirement, never gatekeeping any action, just a small reward for
paying attention to the world state. Keeps clothing purchases meaningful
past the first novelty without adding a punishing "wrong outfit" penalty
system. **Version:** v3+ (after wardrobe and Needs both exist). **Touches:**
`systems/needs.ts` (read equipped outfit + weather), `data/outfits.ts`
(a tag per outfit: warm/cool/rain-suited).

### 11. Customizable stall display
Let the player choose which few items front-and-center on her own stall
(VISION's "your own stall, primary" selling path) — a small arrangement/
decoration step distinct from house-interior decorating (Housing tiers,
VISION #8), giving the stall itself a sliver of personal expression and
letting her show off a prized rare catch or a favorite crop to passersby
even before Housing tier-2/3 furniture exists. **Version:** v2/v3.
**Touches:** `ui/` stall/trade window, a small display-slot array alongside
the existing sell-list data.

---

## Improvements to Existing Systems

### 12. Skill-decay nudge
Skills already decay slowly with neglect (VISION #1) and the decay rate is
already meant to vary — but no player-facing reminder pattern exists for it,
only for Needs ("you look tired"-style warnings). Add a gentle, low-frequency
nudge (skills window shows a small "fading" marker on a skill untouched for
a while) so decay is a visible, fair signal rather than an invisible number
quietly dropping. Mirrors the Needs system's escalating-but-never-a-surprise
warning philosophy, applied to Skills for the first time. **Version:** v2.
**Touches:** `systems/skills.ts` (last-used timestamp already implied by
decay logic — surface it), skills window UI (key **K**).

### 13. Backpack pinned/favorite slots
A handful of backpack slots the player can mark "pinned" so bulk actions
(sell-everything, quick-drop) always skip them — protects a keepsake gift,
a rare fish earmarked for the home aquarium, or a journal she's saving to
read later from being swept up by a fast sell click. A small quality-of-life
addition to the existing slot-limited Inventory (VISION #2), not a rebuild
of it. **Version:** v2. **Touches:** `systems/inventory.ts` (a pinned-flag
per slot), backpack window UI (key **I**), sell/bulk-action logic.

### 14. Batch farm actions
"Plant a row" / "harvest all ready" batch commands for the farming loop,
reducing click fatigue as farm-plot size grows — directly relevant once the
already-speced farm-plot-expansion block lands and tillable area roughly
doubles per tier. A pure interaction-layer improvement; no change to the
active-tending rule itself (crops still need real watering per plot, no
mechanic shortcut). **Version:** v2 (pairs with Farm plot expansion).
**Touches:** `systems/farm.ts` (loop an action over a selected/adjacent tile
range), input handling for a drag-select or "select field" gesture.

### 15. Fast-travel discount tied to Fame/Reputation
Ties two systems that currently sit fully independent — town-wide Fame/
Reputation (VISION #3) and paid fast travel (VISION #9) — so a well-regarded
player pays a little less per trip (a coachman/ferryman treating a familiar,
respected face better), while a player who's never built Reputation still
pays full price, never zero. A small, concrete example of Reputation
actually *doing* something beyond opening prices and quest offers, without
inventing a new number. **Version:** v3 (once both systems are live).
**Touches:** `systems/reputation.ts` (read at travel time), fast-travel cost
calculation in `ui/minimap.ts`/travel logic.

---

## Content Ideas

### 16. Weather event specifics (answers an open DECISIONS.md question)
Concrete proposal for "what happens in storm? in fog?": **Storm** — outdoor
actions (fishing bite rate, foraging spawn rate, farming without shelter) get
a real penalty, but a leaky-roof-adjacent farmhouse (pre-full-repair) can
develop a small indoor puddle needing a quick mop-up chore (a minor mood hit
until cleaned, never a real hazard) — a visible, low-stakes consequence of
the rundown-farm state that repairing the roof later removes for good.
**Fog** — sighting range for birds/wild-animals/wild-flowers (the binoculars
mechanic) shrinks noticeably, but fog is also the *only* condition a rare
fog-loving mushroom variety appears while foraging — a concrete instance of
"rarity from context knowledge," where bad weather becomes a reason to go
out, not just a reason to stay in. **Version:** v1/v2. **Touches:**
`systems/weather.ts`, `systems/needs.ts` (mood hook), `data/forage.ts` (a
fog-tagged entry), house-interior repair state.

### 17. Harvest Fair — concrete festival content (one recommendation for the open theme decision)
Whichever theme she ultimately picks, propose Harvest as the strongest first
festival because it lines up with an already-built system (crop variety) and
needs no new mechanic to feel full: a **best-crop/best-catch contest**
(reads existing Collections "best value seen" data if #9 above is built, or
just current backpack contents otherwise), a **stall row** where the market
NPCs sell festival-only limited goods, and a **busking spotlight** (a
one-day tips multiplier at the town square) — three small, already-existing
systems (Farming, Trade, Busking) each get one festival-day spotlight
instead of the festival needing its own bespoke minigame. **Version:** v1
(the single day-15 festival). **Touches:** `systems/calendar.ts` (day-15
flag), `systems/economy.ts` (limited festival stock), `systems/busking.ts`
(temporary multiplier).

### 18. Mine location — a resolution proposal (answers an open DECISIONS.md question)
Propose a compromise between "reachable from farm/forest" and "requires the
town": the mine entrance is **visible from the farm/forest edge from day
one** (already planned as a horizon detail in the rundown-farm pass) as a
tease, but **physically sealed** until the player earns a permit from the
town's future blacksmith/mine-warden NPC — combining tool-gating (a pick,
already implied) with relationship/money-gating (earning the permit) rather
than picking only one of the two axes VISION already establishes as
deliberately mixed. Keeps the mountain region visually present immediately
without needing town infrastructure to exist first. **Version:** v1 tease,
v2 real access (needs the town). **Touches:** `world/zones.ts` (mine
entrance prop, locked state), a permit flag in `systems/worldFlags.ts`.

### 19. Ten NPC archetypes — a concrete roster proposal (answers an open DECISIONS.md question)
A proposed mix for the "10 NPCs for v1" open decision, spanning profession
and personality per DECISIONS.md's stated blend: a stern **blacksmith**
(gruff, respects competence over charm), a warm **innkeeper** (town's social
hub, knows everyone's business), a shy **seed-seller** (romance candidate,
opens up slowly), a sharp-tongued **fishmonger** (foil/rival energy to the
already-speced Riverside Fisherwoman, without duplicating her), a cheerful
**baker** (gossip source, gift-loves anything homemade), a gruff **retired
sailor** (Sailing/Storytelling teacher candidate), a bright **town healer**
(future Herbalism teacher), an eccentric **hairdresser** (future
appearance-customization gatekeeper, comic relief), a quiet **established
neighboring farmer** (visual and tonal contrast to the player's rundown
start, per VISION), and a young **traveling musician** passing through
seasonally (romance candidate, ties to Busking). **Version:** v1 (Town
buildings + NPC entity blocks). **Touches:** `data/npcs.ts` roster, ties into
the already-planned schedule/relationship/dialogue systems.

### 20. Unusual crop varieties (beyond a generic 20-item list)
Two flavor-carrying crop concepts to seed the variety pass with real texture,
not just more generic fruit/veg: a **moon-bloom flower** that can only be
planted/harvested at night (rewards actually playing after dark, which the
24-hour day already supports but nothing currently uses), and a **stubborn
heirloom crop** that fails outright unless both season AND weather match
exactly (e.g. only thrives in spring rain) — a single crop that makes
"context knowledge over luck" legible in one concrete example a player can
point to and explain, rather than only living in tuning tables. **Version:**
v1/v2 (Crop variety pass already scheduled — these are two entries for that
table). **Touches:** `data/crops.ts`.

### 21. New collection category: Roadside & Storm-Washed Curios
A collection category distinct from the already-speced fish/wild-finds/
birds/animals/flowers: small, non-organic curiosities found along the road
or washed up near the river/coast after a storm — a chipped teacup, an old
coin, a cracked pocket-watch, a faded letter. Ties discovery to *weather*
and *travel* specifically (a storm-only or road-only spawn condition) rather
than season alone, giving the Collections engine (already generic per
`systems/collections.ts`) a category that rewards being outside right after
bad weather clears — pairs naturally with proposal #16's fog/storm content.
**Version:** v2. **Touches:** `data/curios.ts` (new table, same shape as
`data/forage.ts`), `systems/collections.ts` (new category registration, no
engine changes needed).

### 22. New Memory Book moments (beyond the current ten "firsts")
Concrete additions to the curated Memories log: **"first storm weathered"**
(the night she chose to stay in rather than push through bad weather — a
small, quiet acknowledgment of a peaceful-tension moment rather than a
danger one), **"one full year on the farm"** (an anniversary-of-arrival
entry, naturally timed by the calendar system), **"first skill mastered"**
(any skill crossing into its top tier, per the existing Novice/Skilled/
Expert bands), and **"first time turning down a sale"** (keeping a rare
catch for the aquarium instead of selling it — a small character-revealing
beat the game can only log because it already tracks both the aquarium and
the sale price). **Version:** v1/v2 (Memory Book engine already built —
these are just new entries). **Touches:** `systems/memories.ts` (new
trigger points wired from `systems/skills.ts`, `systems/weather.ts`,
`systems/calendar.ts`, and the shop/sell flow).

---

*22 proposals. Each stands alone — pick any subset, any order; none depend on
another proposal in this document to be worth building, though a few note a
natural pairing where one exists.*
