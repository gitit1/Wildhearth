# Wildhearth — Game Vision

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
Day 1: a **Starting Path** choice — not a single item, an identity, closer
to Ultima Online's "what will you be" than a Pokémon starter pick. Each
path bundles a small kit (2 items) and seeds 2 skills, covering all nine
base skills across four paths:
- **The Provider** (wild resources) → Fishing + Foraging seeded. Kit: a
  fishing rod + a foraging basket.
- **The Tender** (land & home) → Farming + Building/Renovation +
  Ornamental Gardening seeded. Kit: a hoe + a seed pouch.
- **The Performer** (people & trade) → Busking + Haggling seeded. Kit: an
  instrument + a trader's coin pouch/ledger.
- **The Keeper** (animals & kitchen) → Animal Husbandry + Cooking seeded.
  Kit: a feed pail + a cooking pot.
Whichever path she doesn't pick, she can still do those activities at base
ability (everyone can forage a little, everyone can fish a little) — the
choice means she starts with two skills already seeded and two tools
already owned, saving her first purchases, not that other paths are
locked away.

**Note on build order:** the small first MVP build (see ROADMAP_MVP.md)
implements a simplified single-tool version of this (hoe / rod /
instrument, one skill seeded) to keep the first playable slice small. The
full four-path system above is the finished-game design and belongs to
ROADMAP_EXPANSION.md — the MVP's simple version gets upgraded into it,
not replaced by a second unrelated system.

No progression is free. Every tool, animal, seed, and upgrade is bought with
money the player earned herself. This is absolute: it's the spine of the
"earned economy" pillar.

Example climb: fish/forage/busk for the first coins → buy a hoe & seeds →
first tiny plot → better rod → repair the coop → buy a hen → eggs → repair
more of the barn → buy a cow → milk → and so on. Each purchase unlocks a new
loop, not just a number going up.

## Opening sequence (the exact flow, screen by screen)
This is the concrete order — implement it in this order, don't improvise a
different one:
1. **Title screen**: New Game / Continue / Settings / What's New. Continue
   skips everything below and loads straight into the saved state — the
   intro story and character creation are new-game-only, never repeated or
   forced on a returning save.
2. **New Game only — character creation.** Gender, basic appearance
   (skin/hair/body preset), starting clothes, and her name. Real choices,
   not a deep sculptor (see Systems #11).
3. **Short, skippable intro story.** A few sentences, not a cutscene: why
   she's broke, why this particular rundown farm (inherited from a distant
   relative is the working placeholder framing — final wording TBD). Any
   key/tap skips it immediately.
4. **Reveal the rundown farm.** She sees the broken fences/roof *before*
   being asked to choose a path — the choice below should feel like an
   emotional reaction to the state of the place ("okay, what do I do now"),
   not an abstract menu shown in a void.
5. **Starting Path choice** (finished game: the four-path system; MVP: the
   simplified single-tool version — see Systems #1/Opening Arc for both).
6. **Tutorial toggle**, asked once here: guided (short prompts walk her
   through her first catch/harvest/sale) or fully open (no hand-holding).
   This is a remembered setting, not a one-time forced sequence — she can
   still be a beginner who wants to skip hints, or an experienced player
   who wants them back on later via settings.
6. Gameplay begins.

## Controls
**Mouse-first**, on top of the keyboard/touch base already built:
- **Click-to-move**: click a point in the world, the character walks there
  (pathing can stay simple/straight-line against existing collision for
  now — real pathfinding is a later polish item, not a Phase-1 blocker).
- **Windows open via on-screen icons** (backpack, skills, map, quest log —
  as each gets built) clicked with the mouse, rather than relying on
  keyboard shortcuts as the primary method.
- WASD / arrow keys and the existing touch-drag joystick remain supported
  as an alternate input method (accessibility + the mobile/touch case
  already built) — mouse is primary, not exclusive.
- This is a retrofit against already-built code (`engine/input.ts` is
  currently keyboard+touch-joystick only) — see ROADMAP_MVP.md for where
  this gets added.

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

### 11. Character creation & customization
Revised: the finished game **does** have real day-one character creation —
this isn't a Sims-depth sculptor, but it's a genuine choice, not deferred
entirely as earlier drafts of this doc said.
- **Gender**: female or male, chosen at creation.
- **Basic appearance**: a handful of preset options (skin tone, hair
  style/color, body type) — simple selection from a curated set, not a
  free slider-based sculptor.
- **Starting clothes**: pick from a few preset outfits.
- **What stays deferred** to the Fashion/Hairdressing professions (#10) is
  the *deep* layer: custom-tailored clothing, real hairstyling, expanded
  wardrobes earned through play — not the initial look itself.
- This is bundled into character creation together with the Starting Path
  choice below; see Opening Sequence for the exact screen order.

### 12. Persistence & save system
- One save slot for the first build; designed so a second slot (parallel
  playthroughs) can be added later without a rearchitecture.
- **Offline progress is a player-chosen setting**: she can choose whether
  skills/world/NPCs keep advancing while she's not playing, or freeze
  entirely when she's away. Not a fixed design decision — expose it.

### 13. Needs (Sims-style, full depth)
A gap identified late but core to the "Sims" pillar — the house isn't a
shell, it's where daily needs get met, and neglecting them has real
consequences.
- Tracked needs: **hunger, energy (sleep), hygiene, mood, social.**
- **Full interaction, not siloed:** hunger/energy/hygiene decay over time
  and from activity; low needs drag mood down; mood affects work
  performance (skill gain rate, busking tips, dialogue tone with NPCs);
  low social need is addressed by talking to NPCs/pets, which also feeds
  the relationship system (#6); poor mood/needs can be *noticed* by AI-layer
  NPCs and reacted to (a friend asking if you're okay) once that layer
  exists.
- The house interior is where most needs get restored: a kitchen/cooking
  spot (hunger — also the entry point to the Cooking skill and crafting
  chains), a place to bathe (hygiene), a bed (energy/sleep, and also where
  the day-length/sleep-skip happens), a living/rest area (mood, and later
  where cohabitation/family scenes play out).
- **Consequence of total neglect: soft, never a game over.** If a need is
  ignored past low warnings (plural, escalating — this must never be a
  surprise), it can trigger a "collapse" event: the character faints/is
  found and helped, and pays a **coin cost** (lost wages for the day, a
  helper's fee — exact framing TBD, but it must cost money, not time-lock
  or hard-fail the player). No permanent death, no forced reload from an
  old save — this stays inside the "peaceful world" pillar even though it
  has real teeth.
- This system and Housing (#8) are joined at the hip: tier-1 static repair
  must include at least minimal versions of these (a cot, a wash basin, a
  fire pit) so needs are manageable from the very first days, before any
  furniture shopping exists.


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