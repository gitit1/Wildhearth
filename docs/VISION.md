# Meshek — Game Vision

## One-liner
A single-player, old-world (pre-industrial: horses & carriages, no cars/planes)
life-sim where you claw your way from a few coins to a full life — The Sims'
living characters and relationships + Ultima Online's skills, economy and open
world + farm-game renovation. NPCs can optionally be powered by a real LLM
that thinks, remembers, and reacts — but the game is complete and substantial
without it.

## Design principle zero: AI is a layer, not a foundation
This governs every system below. The mechanical simulation — skills, economy,
farming, fishing, foraging, busking, crafting, building, seasons, exploration,
animals, scripted relationships and fixed quests — is plain code and works
with **zero AI calls**. Turning AI on adds a layer on top: freeform dialogue,
dynamic quests, NPCs that remember specifics and reason about the player and
about each other. Turning it off does not break or hollow out the game; it
falls back to authored dialogue trees and simple want-tables. Never design a
system that *requires* an LLM call to function.

The player brings her own API key/budget (she controls spend, expected around
$20/month as a ceiling). A settings panel controls: AI on/off, and a
depth-vs-cost dial (see docs/ROADMAP.md NPC Brain phase).

## Era & world tone
Old-world fantasy-adjacent countryside: horses, carriages, boats — no engines.
Peaceful. **No combat, no monsters, no death risk.** Tension comes from money,
relationships, time, and ambition — not danger. Warm, charming, code-drawn
top-down 2D art (see Phase 4 in ROADMAP for polish direction); consistency and
motion over realism.

## World structure
Large world, multiple defined regions, each with distinct character:
- **The farm** — player's starting property (rundown at game start).
- **The town** — the social and commercial hub. Multiple specialized
  merchants from the start (fish buyer, tool smith, seed seller, etc. —
  not one generic shop). Inn, town square (busking spot), homes of NPCs.
- **Forest** — foraging, foraging respawns, treasure spots, wildlife.
- **River/lake** — fishing, boats (later).
- **Mine** — mining skill, ore, gems, deeper/rarer resources further in.
Regions are hand-authored, not procedurally expanded — depth over
proceduralism. More regions can be added over time (this is explicitly a
"phase 3+ keeps growing" world, not a fixed small map).

Player housing: starts and stays on her own farm for the whole first build.
Renting/moving to town is a real idea for later, gated behind relationship
and money — not part of the initial vertical slice.

## Opening arc — the poverty climb
Day 1: a starter choice, Pokémon-style — the player picks ONE starting tool
that shapes her first playstyle:
- **Hoe** → leans into farming from day one (small starter plot).
- **Fishing rod** → leans into fishing (as already prototyped).
- **Instrument** → leans into busking/charisma.
Whichever she doesn't pick, she can still do the other starter activities at
a base ability (everyone can forage, everyone can fish a little) — the
choice just means she starts with one skill seeded and one tool already
owned, saving the first purchase.

No progression is free. Every tool, animal, seed, and upgrade is bought with
money the player earned herself. This is absolute: it's the spine of the
"earned economy" pillar.

Example climb: fish/forage/busk for the first coins → buy a hoe & seeds →
first tiny plot → better rod → repair the coop → buy a hen → eggs → repair
more of the barn → buy a cow → milk → and so on. Each purchase unlocks a new
loop, not just a number going up.

## Systems

### 1. Skills (the UO signature system)
- 20–30+ skills at maturity, each **0.0–100.0**, three-state lock per skill:
  **Up / Down / Locked** (exactly like UO) — the player decides which skills
  absorb growth and which are protected, because of the cap below.
- **Overall skill cap** (UO-style total budget, e.g. ~700 points to split
  across all skills) — this forces specialization and makes the lock system
  necessary and meaningful.
- Skills rise from *use* (with diminishing returns near their own cap) AND
  from *deliberate learning* — a teacher NPC, a book, later even an
  in-world "video/tutorial" equivalent — which is faster than grinding.
  Teaching quality/speed is itself a property of the teacher NPC (an AI-layer
  hook: a good teacher, taught well, teaches faster — personality-driven).
- Skills **decay slowly with neglect**, and the decay rate itself is dynamic:
  frequent-but-occasional use slows decay a lot; total neglect decays faster.
  This dynamic-decay behavior is intentionally the seam where the AI layer
  can later modulate things (e.g. an NPC noticing you haven't fished in
  weeks and commenting on it) — but the decay math itself is plain code.
- Initial skill list seeded from confirmed activities: Fishing, Foraging,
  Farming, Busking (Music), Haggling — plus Mining and Cooking are already
  named as coming next. Full 20–30 list to be drafted in ROADMAP Phase 1/2
  as those activities get built (do not invent the full list speculatively
  here; grow it alongside real systems).
- Skills window (key **K**): scrollable table in a UO-style paperdoll/skill
  list, with a floating "+X.X" popup on gain.
- **Skills affect AI-NPC treatment, not just mechanics.** High Haggling
  changes how a merchant *talks* to you (respect, better offers), not just
  the final price number. This is a hard requirement connecting skills to
  the NPC brain protocol (see below).

### 2. Inventory / Backpack
- Replaces the current rigid `fish`/`coins` fields with a general item
  inventory (fish, coins, hoe, seeds, berries, ore, crafted goods…).
- **Slot-limited**, not weight-limited (deliberate simplification vs. true
  UO weight system) — starts small, expands via purchasable upgrades.
- Backpack window (key **I**): items drawn as code-painted icons inside a
  sack — the UO "paperdoll bag" feeling, fully code-drawn like everything
  else (one painter function per item type).

### 3. Economy
- **Dual: currency AND barter.** A single coin currency for most trade, but
  NPCs can also want direct item-for-item exchange — especially
  relationship-driven trades ("I'll trade you my old fiddle for a basket of
  berries") rather than pure shop transactions.
- Multiple specialized merchants in town from the start (not one generalist).
- Starting money: enough for exactly one starter-tool choice (see Opening
  Arc) — tight by design, this is the poverty pillar in numbers.

### 4. Crafting
- **Depth is the player's choice, not a requirement** — this is a design
  principle, not just a crafting detail. A player can always buy a finished
  good directly (less profit margin / higher price) or invest in the
  production chain herself (more steps, more skill use, better margin).
  Nobody is forced into deep crafting to progress.
- A handful of parallel chains, each ~3–4 steps (e.g. wheat→flour→bread,
  wool→yarn→cloth, milk→cheese) — "medium" depth, expandable over time as
  more professions come online (see #10).

### 5. Quests
- **Hybrid.** Fixed, authored quests exist and work with AI off. When AI is
  on, NPCs can also generate dynamic quest offers based on season,
  relationship level, and world state. Both systems feed the same quest-log
  UI; the player shouldn't need to know which kind she's looking at.

### 6. Relationships (Sims-depth social system)
This is a core pillar equal to the economy, not a side feature.
- Friendship/affection tracks per NPC, gifts, dialogue, dating.
- **Marriage/partnership, cohabitation, and children** are in scope for
  maturity — full Sims-depth, not just a friendship meter.
- **Pets** (dogs, cats, etc.) are part of this system too — companionship,
  not just livestock.
- 20+ AI-capable NPCs at maturity, each with a personality sheet, schedule,
  and evolving relationship state with the player. This number is explicitly
  meant to keep growing over time, not cap at 20.

### 7. Seasons & weather
- Full seasons (not just daily weather), affecting: crop growth/availability,
  AND town life — festivals, NPC moods/routines change with season. Weather
  (rain etc.) layered within seasons.
- Day length is a **player-chosen setting** (Sims-style lifespan/day-length
  option), not a fixed value.

### 8. Housing & building
- **Tiered, player-directed depth** (mirrors the crafting principle): starts
  as static repair of the rundown farm (fixed before/after states), grows
  into template-based upgrades (pick from preset room/furniture layouts),
  and can reach full freeform building/furniture placement for players who
  want to invest there. A player who doesn't care about home design can
  stay at tier 1 forever without being penalized elsewhere.

### 9. Transportation
- Old-world only: horses, carriages, boats (no motor vehicles). Available
  to buy from early game, gated by money like everything else — not free,
  not withheld artificially either.

### 10. Professions beyond the starter set
Fishing, Foraging, Farming, Busking, Haggling are the confirmed starting
five. Confirmed as **coming, at the same "player chooses her own depth"
philosophy**: Mining, Cooking, Fashion/Tailoring, Hairdressing/Styling —
i.e. professions that tie into personal appearance and the world's economy,
not just resource gathering. Appearance customization itself (see #11) is
deliberately deferred, but the professions that revolve around it are
already part of the long-term vision.

### 11. Character customization
Explicitly **not a phase-1 concern.** The player doesn't need to customize
her look at game start. It becomes meaningful later, hand-in-hand with the
Fashion/Hairdressing professions (#10) — customization as something you
build up access to in-world (a hairdresser NPC, a tailor), not a character
creator screen on day one.

### 12. Persistence & save system
- One save slot for the first build; designed so a second slot (parallel
  playthroughs) can be added later without a rearchitecture.
- **Offline progress is a player-chosen setting**: she can choose whether
  skills/world/NPCs keep advancing while she's not playing, or freeze
  entirely when she's away. Not a fixed design decision — expose it.

## NPC brain (AI layer — phase 2+ design)
- Two-part model: **fixed character sheet** (personality, role, schedule,
  tastes, teaching-skill-if-relevant) + **dynamic memory** (interactions,
  opinions of the player, current mood, recent events).
- LLM calls happen only at meaningful moments — dialogue, buy/haggle
  decisions, quest offers, teaching sessions — never per game tick.
- Calls return **structured JSON** the game validates against a closed set
  of allowed actions (say / sell / haggle-response / offer-quest /
  memory-update / gossip / teach); the game applies it, never executes
  free-form instructions from the model output.
- Cache aggressively; define an explicit offline/no-budget fallback
  (scripted dialogue + want-table) that must remain fully playable per
  Design Principle Zero above.
- Player-facing cost control: an on/off toggle and a depth/cost dial in
  settings, since she supplies her own API key and budget.
- Skill values (esp. Haggling) are read by the brain layer and should visibly
  change tone/outcomes, not just a hidden number.

## Art direction
Top-down 2D, everything drawn in code (canvas) — no image assets. Warm
palette, soft shadows, constant gentle ambient motion (sway, shimmer,
smoke). See ROADMAP Phase 4 for the "more Ultima Online" depth/animation
upgrade path — richer rigs and faked-height depth, while deliberately
staying off true isometric (that path was tried and abandoned; see project
history/CLAUDE.md notes).

## Non-goals
Multiplayer. True isometric or realistic/photographic graphics. Combat,
monsters, death. Mobile app stores (browser-first). A character creator on
day one.
