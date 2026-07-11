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
| The Farm | 🟢 rundown state built (repairs: roof/window/barn/fence); farmhouse + barn now PixelLab sprite-sourced (flat-front, dual-path with the code painter) | renovated states 🟡 (tiers named, visuals not walked through) |
| House interior | 🟢 tier-1 bare/broken built (enterable; hearth/basin/bed/rest/bare-walls per spec), all now sprite-sourced (room backdrop + hearth + basin + bed + chair-crate, dual-path) | tier 2/3 furniture upgrades still 🔵 |
| Market/dock area | 🟢 built and walkable: 4 distinctly-themed stalls (fish/produce/goods/empty, each its own sprite), a well, 6 differently-varianted cottages, the busking spot | the wider coastal "Town" below (inn, 3+ merchants, 5-8 homes) is a separate, still-future region |
| Road (farm → town) | 🟢 the farm→market segment built and walkable, incl. an established neighbor farm (its own sprite farmhouse) | continuing to an actual town, gradual minimap reveal, and paid fast travel are still 🔵 speced (v2) |
| Town | 🟡 | inn + 3 merchants + 5-8 homes named, coastal, not walked as a place — distinct from the now-built market square above (v1's commerce hub, not the town itself) |
| River | 🟢 the river/lake/dock region is built and walkable (fishing spots tagged river/lake) | the Riverside Fisherwoman NPC herself — dialogue/shop/teaching, let alone rod tiers/bait/boat/diving/net/sailing/aquarium/sightings — is NOT part of the built 10-NPC roster and remains fully 🔵 speced (v2) |
| Forest edge | 🟢 the forest passage is built and walkable (location-tagged foraging finds) | deep forest/treasure beyond it remains ⚪ |
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

## The opening arc 🟢 (built in full — the MVP's simplified version has grown into the complete speced arc)

1. Title → (New Game only) character creation 🟢 → skippable intro story →
   reveal the rundown farm *before* any choice is asked → **Starting Path**
   choice → **Guidance Mode** (Tutorial / Aspiration / None, always
   changeable later, switchable in Settings) → play begins.
2. **Four Starting Paths** 🟢 built in full: Fisher, Farmer, Musician,
   Animal-Keeper (the shipped names for the earlier Provider/Tender/
   Performer/Keeper working titles) — each a card seeding 2 skills (one at
   floor 10) + a 2-item kit + 50 starting coins + food.
3. **Nothing is free, ever** — absolute rule. Every tool, animal, seed, and
   upgrade is bought with money earned in-game. 🟢 enforced for every
   livelihood; 🟢 the "no free animals" correction is built — the yard
   starts empty, hens (45) and the cow (175) are stall purchases gated on the
   mended barn, persisted in their own store.
4. Concrete first-quest content — 🟢 built as the **Guidance Mode engine**:
   Tutorial is a real 4-step skeleton (move → first action → first sale →
   first purchase; clock-freeze per step; one-way Skip; a persistent Help
   icon; a mid-progress reload prompt); Aspiration is per-path 3-4 step
   background chains + life-goal flavor (a HUD pill), including the Keeper's
   forage→cook→sell bridge since no animal is free on day one.

---

## Core systems

### Skills 🟢 (base 9) / 🔵 (town 12)
UO-style, 0.0-100.0, three-state lock (up/down/locked), total cap 250 with
down-skill draining. 🟢 today: the full base-9 (Fishing, Foraging, Farming,
Busking, Haggling, Animal Husbandry, Cooking, Building, Gardening), each
wired to a real mechanic; chance-based use gains with the UO-style Gain
Guard pity mechanism. 🟢 skill floors now gate content (fish species, crop
planting, forage finds, recipes). 🟢 **neglect decay built** (`systems/
skills.ts`): unused skills decay slowly, floored at their tier boundary
(Novice/Skilled/Expert) so decay never drags a skill back down a whole tier
— the Skills window now shows each skill's earned tier tag. 🔵 not built:
the 12 town/expansion skills (see the appendix).

### Inventory & Economy 🟢
Slot-based backpack (🟢), dual currency+barter economy (🟢 currency, ⚪
barter never built — the Riverside Fisherwoman block is the first planned
instance, still unbuilt). Price anchor table (starting coins **50** —
corrected from an earlier 15, per DECISIONS.md + commit `ff95174`; basic
tool 20-30; hen 40-50; cow 150-200) is now **in active use, not just
planned** — the shipped hen (45) and cow (175) both land inside their
anchor bands (see "The opening arc" above). **Built (session 1):** the
first live NPC-buys-from-player instance — Maren buys fish at the market
stall during her work hours (`systems/sellCategories.ts`'s path/
capability-aware dispatch, a `{stallId, npcId, buysCategory}` table, one row
today, built to extend) — the seed of v2's fuller "customers come to your
stall" system. Town-wide Fame/Reputation, separate from any one NPC's
opinion and from Haggling itself — still 🔵 speced, not built.

### Crafting 🔵
Depth is the player's choice — always buy finished, or invest in the
production chain yourself. A handful of 3-4 step chains (wheat→flour→
bread, wool→yarn→cloth, milk→cheese). Not built.

### Quests 🟢 (the v1's one large gap is now CLOSED)
**Built** (`data/quests.ts` + `systems/quests.ts`): a real hybrid quest
system on top of (not replacing) the Guidance Mode engine. Six authored
quests across the roster (Maren's fish delivery, Petra's bread run,
Henrik's barn favour, Finn's repeatable junk quest, Tobin's and Liora's
seasonal flower quests) with sequential steps (activity counters — catch/
harvest/forage/cook/busk/sell/talk/reach — and possession/gather steps
live-checked against the bag), a persisted `QuestLog`, and a real
**quest-log window** (`ui/questlog.ts`, 📋/J) with Active/Completed tabs,
a step checklist + progress counts, a reward preview, and abandon for side
quests — it MIRRORS the Guidance layer rather than duplicating it. Offers
and turn-ins surface as the giver NPC's own dialogue choices. **AI
quest-generation is promoted from stub to real dynamic offers** (D3,
`ai/features/questOffers.ts`): behind the AI master toggle, the model picks
one eligible template and flavors its words in the giver's voice, reward
clamped to the authored template's range, with a scripted fallback on any
failure — byte-identical to AI-off when AI is off. The dock icon shows a
live active-quest count badge. Guidance Mode (Tutorial/Aspiration/None)
is unchanged and still the v1 onboarding layer these quests sit alongside.

### Relationships 🟢 (marriage/children/pets still 🔵)
Built (`systems/relationships.ts`): a pillar equal to the economy, not a
side feature. Two independent axes per NPC (Friendship, Romance, 0-100) —
not one meter. Categorized interactions (Friendly/Funny/Romantic/Blunt,
with diminishing daily returns), five-tier gift preferences **derived from
personality traits** (`data/traitPreferences.ts`), not hand-authored, with
the concrete tuned point values (loved +35 / liked +20 / neutral +8 /
disliked -10 / hated -20 on the 0-100 scale), a weekly cap of 2 gifts + a
birthday exemption at x2, and **decay whose rate itself depends on
relationship depth** — shallow bonds fade faster, committed ones barely
fade at all. Milestone heart events (25/50/75 thresholds) fire
independently per axis and log straight into the Memory Book. **Not
built:** marriage, cohabitation, and children remain 🔵 (v4 per
`ROADMAP_TO_V5.md`); pets are 🔵 too — a cat and dog were generated and
packed as sprites in the farm-animal batch but are deliberately **banked,
not spawned** (no entity exists yet), reserved for a future Pets block.

### Seasons & Weather 🟢 (infrastructure + gameplay effects + festivals + wildlife)
🟢 **Built**: a real `calendar.ts` (four seasons, advancing day/hour/minute,
day-phase) and a real `weather.ts` (season-weighted daily rolls, persisted).
🟢 **Wired to gameplay**: rain auto-waters growing crops (active-tending
farming), fish availability is gated by season AND weather, crop planting +
the stall's seed stock are gated by season. Day length is a real player
setting, now with a live Settings-screen slider. 🟢 **Festival engine
built**: the Harvest Festival (autumn, mid-season) gathers all 10 NPCs at
the market square with bunting/lanterns/harvest decorations, a festival
dialogue line, and a Memory Book entry; the framework is data-driven for
the 2nd-4th festivals v2+ will add. 🟢 **Seasonal wildlife built**:
butterflies/songbirds/rabbits/ducks/deer/hares appear by season + weather +
region (`entities/wildlife.ts`), flee-and-despawn when approached, and a
storm empties the world of them. 🟢 **Day/night + weather are now VISUAL,
not just mechanical**: a continuous time-of-day colour grade, rain streaks,
storm lightning + dark beats, drifting fog banks, and per-weather ground
tints (interior milder; the menu vista is exempt) — see "Art direction"
below. 🔵 still to come: NPC mood/routine shifts driven by season (beyond
their fixed weekly schedule).

### Housing & Building 🟡
Tiered, player-directed depth: tier-1 is the MVP's static rundown/repaired
states 🟢 (4 repairs: roof/window/barn/fence), tier-2 is template-based
room/furniture upgrades 🔵, tier-3 is full freeform placement 🔵. Farm-plot
expansion is 🟢 built: two discrete money-gated tiers (120/180) bought at
the farmhouse, each visibly leaping the fence southward with 22 new
tillable tiles, persisted with the farm state. **The barn now does
something 🟢** (`systems/storage.ts`, a versioned save key): interacting
with it opens a real storage-chest window (the existing window system) for
overflow beyond the backpack, and farm animals shelter inside the barn
overnight (a schedule tweak) instead of standing out in the open.

### Needs 🟢 (7, not 5)
Built (`systems/needs.ts`): **7** needs — hunger, thirst, energy, hygiene,
bathroom, mood, social (DECISIONS.md's count superseded the earlier
5-need VISION draft) — full Sims-style interaction, not siloed: season +
weather decay modifiers, eat/drink/wash/outhouse/sleep/sit restoration
(sleep drives the real minute loop, firing every daily hook), escalating
25/10 warnings + an HUD needs strip, low needs drag mood down, mood
(derived) scales both skill-gain and busking pay, NPCs comment on a low
need. Total neglect triggers a soft **collapse** — a 15-coin fee + waking
at the bed — never a game over. The tier-1 house interior (hearth, wash
basin, bed, rest chair) is the minimum needed to restore all seven, and
(session 2) all four now render as PixelLab sprites with the code painter
kept as fallback.

### Collections & Memories 🟢 (engine + variety pushed toward the v1 bar) / 🔵 (sightings)
One book, two tabs, built. **Collections**: the generic per-category engine
is real, table-driven, and its live categories were pushed hard toward the
DECISIONS "20 in v1" variety bar this run — **fish 12→50**, **forage
11→26** (both well past the bar), plus a brand-new **flowers 0→20**
ornamental category (`data/flowers.ts` + a species-driven gardening system
in `systems/gardening.ts` — plant/water/bloom/sell) — discoveries log on
first catch/pick/bloom. Recipes (6→21) and crops (18→20) got the same push,
propagating through prices/names/icons/collections/shop with zero per-item
code (every table is fully data-driven — future variety is just more
rows). Birds/animals join through the same engine when the binoculars
sighting mechanic (Fisherwoman block) lands 🔵. **Memories**: the curated
life-event log is real — ten "firsts" (sale,
catch, harvest, animal, repair, farm-whole…) each written once with an
in-game date stamp. Opens from the 📖 icon or M.

### Transportation 🟡
Old-world only (horses, carriages, boats), money-gated. Fast travel is
Sims-style: pay a small coin cost, only for locations already discovered
on foot. The Riverside Fisherwoman is the first planned vendor (rent/buy a
boat). Not built.

### Professions beyond the starter five 🔵
Mining, Cooking (an early minimal version is required for the Keeper
path), Fashion/Tailoring, Hairdressing/Styling — same "choose your own
depth" philosophy as crafting. Not built.

### Character creation & customization 🟢 (deep customization via professions still 🔵)
**Built** (`ui/charcreation.ts`): the full New Game flow — identity
(first/last/nickname, age 18+, gender), curated appearance presets (skin/
hair/body/height) with a live breathing rig preview + Randomize, a
skippable intro story, the farm reveal *before* any choice is asked, the 4
Starting Path cards (Fisher/Farmer/Musician/Animal-Keeper — each a kit + a
seeded skill at 10 + 50 starting coins + food), and a life-goal pick
(Family/Independence/Community/Mastery/Fortune). Old saves synthesize a
default character. **Updated (session 4):** appearance now picks a look
from the **curated PixelLab sprite matrix** — gender × 5 hairstyles × 5
outfits, plus a hair-shade choice (3 natural shades, runtime-recoloured
from the sprite's keyed base via `spriteChar.ts` `recolorSheet`) — so both
genders, not just a default female look, are sprite-covered; "what she
designs is what she sees" now holds for the whole matrix, not a partial
coverage table. Body size (S/L) and skin-tone recolour show "coming soon"
pending the next generation wave (skin recolour specifically needs a
lightness-aware mechanism the current one doesn't have). **Deep
customization** (tailored clothing, real hairstyling) is still deferred
to the future Fashion/Hairdressing
professions (🔵, v3).

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
This is what the (now-built) dialogue system and the NPC brain / AI layer
below read from.

### NPC brain / AI layer 🟢 (built, off by default; AI-driven quests/haggling still 🔵)
Built (`src/systems/ai/`): a provider abstraction (browser-direct Anthropic
via plain `fetch`, a `?aimock` test provider, and "none"), a monthly token
budget ledger, per-NPC + global rate limits, a persisted LRU cache, a
closed `NpcAction` schema + strict validator, a depth dial
(haiku→sonnet→opus tiers), and a live "Test connection" button in
Settings. **The master toggle defaults OFF and the game is byte-identical
with AI off** — Design Principle Zero holds. **8 features**, each with a
flat scripted fallback: authored backstory seeds for all 10 NPCs +
generate-once AI backstories ("Tell me about yourself"); dialogue variation
through the `renderNpcLine()` seam (prefetch-on-proximity, never blocks);
daily NPC inner thoughts + ambient bubbles; world-event narration; a
plain-code play-pattern arc tracker feeding prompts; quest-generation as a
**validated STUB only** (debug panel, a v2 preview — no quest log or
player-facing offers yet, see "Quests" above); a token-free
improvement-notes observer (off by default, debug panel). The two-part
per-NPC model (character sheet + dynamic memory), structured-JSON-only
responses against a closed action set, and the cost/cache/rate-limit
discipline all match the original design intent. **Still the boundary:**
deeper AI-driven quest offers as real gameplay, active haggling tone, and
story-arc-driven relationship quests stay 🔵 (v2+).

---

## NPCs — 10 townsfolk, built and sprited 🟢 (the Riverside Fisherwoman's full concept still 🔵)

**Built:** 10 independent NPCs (`entities/npc.ts`, `data/npcs.ts`), each
with a personality archetype, a profession, and a real weekly (Sun-Sat)
day-of-week schedule (`systems/schedule.ts`) driving a state machine
(home/work/market/socializing/asleep; indoors = not rendered; storms send
them home). The roster: Maren (fish-stall keeper), Tobin (produce-stall
keeper), Sera (general-goods keeper), Henrik (neighbor farmer, elder),
Petra (baker/cook), Liora (street musician), Bram (carpenter/handyman), Ada
(forager/herbalist, elder), Finn (fisher apprentice, a kid — structurally
unromanceable), Jonas (wandering peddler); 4 are romanceable (Maren, Tobin,
Liora, Bram). Every NPC is **sprite-sourced** (PixelLab, 8 rotations + an
8-direction walk, packed into one atlas) with the code rig as its
dual-path fallback — no idle animation (a static rotation stands in;
decision S2-8), and two get a minimal code prop overlay (Finn's fishing
rod, Liora's drifting music notes). The dialogue condition-key system
(season/weather/day-of-week/phase/region/relationship-tier/flags,
most-specific-match-wins, anti-repeat rotation, 2-3 choice turns) is built
and live for all 10, with the (off-by-default) AI layer rendering
variation through the same `renderNpcLine()` seam.

**Not built:** **the Riverside Fisherwoman as originally specced** —
dialogue, a fishing-only shop, rod tiers, a bait system, boat/diving/net/
sailing, a home aquarium, and binocular bird/animal/flower sightings — is
not part of the 10-NPC roster above (Maren sells fish at the *market*
stall, not the river; Finn fishes at the dock as a kid apprentice, not as
this character) and remains entirely 🔵 speced, planned for v2 per
`ROADMAP_TO_V5.md`. Town NPCs beyond these 10 are still ⚪ an open roster
question (v2, ~15-25 with the town homes).

---

## Controls 🟢
Mouse-first, built: click-to-move (straight-line vs. collision),
hover-marked objects with left-click act-or-walk + right-click context
menus, camera zoom (wheel + on-screen ±), and on-screen icon buttons as
the primary way into every window (🗺 map, 📜 skills, 📖 memory book,
🎒 backpack) with keyboard shortcuts (M/K/B/I) as secondary. Real
pathfinding remains a later polish item.

## Menus, screens & the window system 🟢
**Built:** the full main menu (Continue — live slot manifest showing
season/day/coins/saved-ago, disabled without a save; New Game — confirm-
over-save; What's New — data-driven changelog + NEW badges; Help/Guide — 5
pages; Credits; Exit), Settings (day-length slider, summary detail,
guidance switch, HUD toggles, font size, high contrast, audio sliders, the
AI section, save management, **Windows** presets), Esc/⏸ Pause (Save/
Settings/menu/exit), and the three-option Exit dialog. **Built (session
2):** every player-facing panel — backpack, skills, minimap, memory book,
shop/trade, gift chooser, dialogue, the day-end summary (none/quick/full
setting; a day ledger of coins/catches/harvests/skills/discoveries/
relationships), and in-game Settings — is now a real **UO-classic window**
(draggable by its title bar, resizable from edges/corners, minimizable to
a bottom dock strip, closable + reopenable from the dock's ☰ menu,
z-ordered by focus, edge-snapping, keep-on-screen clamped), including the
**game viewport itself**, all on one persisted desktop layout
(`WINDOW_SYSTEM.md`). A single Esc cascade closes the topmost open+closable
window, falling through to Pause only once nothing is left open. Only the
title screen, Pause, the Exit-confirm dialog, and What's New/Help/Credits
deliberately stay full-screen overlays — they're menus, not workspace
content, so dragging them out of the way would defeat the point. **Re-skinned
(session 4):** a generated PixelLab UI kit dresses the chrome —
`src/ui/skin.ts` (dual-path: PNG panels + font when present, the existing
CSS chrome otherwise) applies a wood+gold nine-slice frame to every panel
window and the full-screen modals, a warm pixel display font
(WildhearthStorybook) on titles/buttons, a parchment tooltip, and NPC bust
portraits in the dialogue notch (Maren + Tobin shipped; 8 more NPCs queued).
The quest-log dock icon also carries a live active-quest-count badge.

## Art direction 🟢 (all three mediums — characters, environment, ground — are now PixelLab-sprite-first)
Top-down 2D, no true 3D ever. Art is **code-drawn OR PixelLab-generated**,
always **dual-path**: a sprite/tile PNG draws when present and loaded, the
code painter/rig draws otherwise, and the game must (and does, verified)
boot and play complete with the sprite folder emptied.

**The medium division, FINAL as of session 4 (2026-07-11)** — see
`docs/DECISIONS.md` "Art medium division — FINAL FLIP" + "Ground medium"
for the full history (it flipped once at session 3, then flipped back with
a different mechanism at session 4):
- **Characters** (player + all NPCs) render via a **curated PixelLab sprite
  matrix** — 2 genders × 5 hairstyles × 5 outfits at the MEDIUM body size
  (S/L queued next), keyed vivid-purple hair runtime-recolored to 3 natural
  shades + skin tone. The decomposed code rig (`art/rig.ts`) is the
  zero-PNG dual-path **fallback**, not the shipped look (reverse of session
  3's framing — the rig's side-profile nose, same-look-both-genders, and
  hair-over-body issues are exactly what the sprite matrix fixes).
- **Ground** (grass, tilled field, paths, water, plaza) renders via
  **PixelLab `tiles_pro` segmentation tiles** (`world/ground.ts`), with
  terrain-to-terrain edges dithered in CODE (zero gens). The original
  painterly ground painter is the dual-path fallback.
- **The environment** (buildings, animals, props, trees, crops, items,
  UI chrome) uses PixelLab sprites, dual-path over code painters, as
  before session 3/4 — this half of the division never changed.

🟢 **Built:**
- The **segmented rig** (`art/rig.ts`/`art/animalRig.ts`) — jointed
  player/NPC/animal figures with per-action poses — is now the universal
  fallback beneath every sprite/tile category (characters included).
- **Day/night + weather visuals** — a continuous time-of-day colour grade;
  rain streaks, storm lightning + dark beats, drifting fog banks; per-
  weather ground tints (interior milder, the menu vista exempt). **Water
  shimmer restyled to chunky pixel glints** (session 4, R8/B5) in place of
  smooth ellipses, closing the last obvious "smooth vs. pixel" mismatch.
- **Parallax + particles + cast shadows** — a pre-baked northern mountain
  skyline band at 0.3x scroll (hinting at the future mine); pooled ambient
  particles (petals/motes/fireflies/leaves/snow) plus catch/harvest/
  skill-gain bursts; a shared `castShadow()` (sun upper-left, length varies
  with time, fades at night) on buildings/trees/dock/rig, audited across
  every entity.
- **The PixelLab sprite pipeline** (`docs/PIXELLAB_ASSETS.md`,
  `docs/SCALING_DECISION.md`) — proven to scale to the "no two neighbours
  alike" variety bar in budget. Sprite-sourced today, all dual-path: the
  **character matrix** (above); **building variety** (farmhouse, barn, 4
  distinctly-themed market stalls, a well, 6+ cottage variants with
  anti-repetition jitter, an established neighbour farmhouse); the
  **interior** (room backdrop, hearth, basin, bed, chair+crate); **5
  farm-animal species** (cow/pig/sheep with a real walk cycle, hen/duck as
  static rotations with a small code-driven waddle when moving) — a cat
  and dog are banked for a future Pets block; **20 crop species** (ripe +
  growth-stage sprites for the original set, new variety-push crops
  dual-path to the code painter until sprited) and **2 tree species × 4
  seasons** + assorted foliage/props; **ground tiles** (grass/soil/water/
  plaza); and the **UI kit** (wood/gold window frame, tooltip, 2 NPC
  portraits, the WildhearthStorybook font).

🔵 **Still code-only / not built:** ambient wildlife (deliberately —
too many species/poses to justify the spend), tools/accessory icons, most
particle/weather fx beyond the water-glint pass, two-face buildings, and
underwater transitions (tied to the still-unbuilt Fisherwoman's boat/
diving). The fullest juice pass (secondary motion, jointed-limb animation
arcs) remains the long-term "Juice & feel" version.

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
