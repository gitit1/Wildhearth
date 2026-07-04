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
- **Neighboring farms**, passed along the road to town — other, more
  established properties (visual contrast to the player's rundown start),
  likely tied to future NPCs (see OPEN_QUESTIONS.md's NPC roster item —
  a neighbor is a natural candidate for one of the first named NPCs).
- **The town** — the social and commercial hub. Multiple specialized
  merchants from the start (fish buyer, tool smith, seed seller, etc. —
  not one generic shop). Inn, town square (busking spot), homes of NPCs.
  Coastal — a seafront belongs here, not near the farm.
- **Forest** — foraging, foraging respawns, treasure spots, wildlife.
- **River/lake** — fishing, boats (later).
- **Mountains** — the region the mine sits in (not a flat opening in the
  ground); mining skill, ore, gems, deeper/rarer resources further in.
- **Coast** (near the town) — a distinct region from the river, sea-based
  rather than freshwater; content TBD (likely its own fishing flavor,
  possibly its own boat use beyond the river's).
Regions are hand-authored, not procedurally expanded — depth over
proceduralism. More regions can be added over time (this is explicitly a
"phase 3+ keeps growing" world, not a fixed small map).

**Topology: hub-and-spoke, farm at the hub.** The farm is the anchor
players return to; town, river, forest, and mountain are spokes reachable
from it (directly or via town). This is a deliberate choice over an "open
web" of equally-connected regions — it keeps the farm meaningful as home
base rather than one stop among many.

**Three independent gating axes, used deliberately per region/feature —
not just one kind of gate everywhere:**
- **Tool-gating** (metroidvania-style): fishing needs a rod, mining needs
  a pick, diving needs a boat. Access = ownership.
- **Relationship-gating**: some content (a neighbor's back field, an
  NPC's personal quest, moving into town) opens through Fame/Reputation
  or a specific NPC's Friendship/Romance level (#3, #6), not money or
  tools at all.
- **Money-gating**: fast travel, animals, renovations — straightforward
  earned-economy purchases.
Mixing these deliberately (not defaulting to money-gating everywhere) is
what keeps exploration, relationships, and money each feel like their own
axis of progress rather than one system doing all the work.

**Travel is meant to feel worth doing, not just permitted** — borrowing
from UO's approach of distributing resources unevenly across cities to
force real trade and travel between them: some materials, foods, or
recipes should be regionally distinctive (only found/cheap near the
coast, or only near the mountains) rather than everything being available
everywhere — this is what makes fast travel (#9) a convenience on top of
a world worth crossing, not a way to skip a world with nothing in it.

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
**Correction — tools gate activities, this isn't uniform.** Foraging is
bare-hand possible (picking berries needs no tool, a basket just helps
capacity/yield). **Fishing is not** — without an owned rod, fishing isn't
possible at all, full stop. So whichever path she doesn't pick, she keeps
bare-hand foraging as a fallback, but any path other than The Provider
means saving up for a rod before fishing opens up — the tool is the gate,
not a convenience. Either way, the path choice means she starts with two
skills already seeded and two tools already owned, saving her first
purchases, not that other paths are
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
6. **Guidance Mode**, asked once here: a three-way choice, not a binary
   toggle — **Tutorial Quests** (short authored quests walk her through her
   first catch/harvest/sale/repair), **Aspiration Quests** (quests drawn
   from her chosen Starting Path and the "what does she love to do"/trait
   picks from character creation — e.g. a Performer-leaning character gets
   nudged toward busking and town social quests instead of generic ones),
   or **None** (fully open sandbox, no quest prompts at all). This feeds
   directly into the Quests system (#5) — tutorial and aspiration quests
   are just specific authored/generated quest sources, not a separate
   system. **Always a live setting**, changeable at any moment from
   Settings, never locked in at creation.
7. Gameplay begins.

### First quests by path (the concrete micro-content)
This is the actual content for the two guidance sources named above —
written now so nobody has to re-derive it later.

**Tutorial Quests** (same 4-step skeleton for every path, wording adapts
to the chosen kit/tool):
1. Get your bearings — move around the farm.
2. First action — use your path's primary tool (catch a fish / till &
   plant / play a tune / cook something).
3. First sale — walk to the market, sell, watch coins land in your purse.
4. First purchase — spend those coins on the next concrete step (see
   Aspiration Quests below for what that step is per path).
A **persistent Help icon** stays on screen whenever Tutorial Quests mode is
active — clicking it re-shows the current step's hint on demand, it is not
a one-time popup that vanishes forever once dismissed.

**Aspiration Quests** (path-specific starter chains):
- **The Provider**: fish → sell → buy an upgraded gathering basket *or* a
  better rod → this opens access to the nearby forest edge.
- **The Tender**: till & plant → wait for the harvest → sell → buy more
  seed *or* repair the first stretch of fence.
- **The Performer**: busk in the square → collect tips → buy a tool
  upgrade *or* learn an additional tune.
- **The Keeper**: **resolves a real day-one gap** — her kit (feed pail +
  cooking pot) has nothing to feed or cook on day one, since no animal is
  free (per the earned-economy pillar). Her actual opening loop is:
  forage (base ability everyone has) → cook the foraged ingredient in her
  already-owned pot (a genuine head start — she skips buying a cooking
  tool) → sell the cooked dish for more than the raw ingredient would
  fetch → save toward her first hen. Animal Husbandry proper kicks in once
  she can actually afford an animal.

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
- **Gain from use is a chance per attempt, not a guaranteed tick — this
  applies to every skill in the game, not just Fishing.** Each relevant
  action (successful or not — a failed attempt can still teach something)
  rolls a chance to gain a small amount, roughly UO-style. This is
  deliberate: it's what keeps a skill from "leveling in a second" just
  because a fast loop (like casting a rod, or any other repeatable action)
  can be repeated quickly — the uncertainty in skill gain mirrors the
  uncertainty already built into catching/crafting/performing outcomes
  themselves, across the board.
- **A pity mechanism against pure bad luck**, borrowed directly from UO's
  Gain Guard System: after a run of consecutive failed gain-rolls on the
  same skill, the next attempt is guaranteed to succeed. This keeps the
  probabilistic system (above) from ever feeling like it's punishing a
  player who's genuinely trying — uncertainty stays, but never turns into
  a visible losing streak.
- **Tools and consumables require a skill floor to pay off, or they're
  wasted — again, a universal rule, not specific to fishing gear.**
  Rare-tier bait, a net, a higher rod tier, but equally a better hoe, a
  finer instrument, pricier seeds, or any other skill-linked purchase:
  using any of these below the skill level they're meant for either does
  nothing extra (the money/item is spent with no benefit) or fails
  outright, rather than always granting their full benefit regardless of
  skill. This makes buying ahead of your skill level a real mistake to
  avoid everywhere in the game, not a fishing-only quirk — see
  ROADMAP_EXPANSION Phase 1's fishing-gear items for the first concrete
  instance, which every later skill's gear should follow the same pattern
  for.
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
- **Town-wide Fame/Reputation, separate from per-NPC relationships** —
  borrowed from UO's fame/karma concept: a single town-facing number that
  shifts general treatment (better opening prices, NPCs more willing to
  offer quests or credit) independent of how any *specific* NPC feels
  about the player. This is the mechanical answer to "the town respects
  you," distinct from Haggling (a skill) and from any one friendship
  score (#6) — all three can move independently.
- Starting money: enough for exactly one starter-tool choice (see Opening
  Arc) — tight by design, this is the poverty pillar in numbers.

**Confirmed price anchor table** (coins — the reference scale everything
else gets tuned against, not final content, but the ratios are decided):
| Item | Cost |
|---|---|
| Starting coins | 15 |
| Basic fish/foraged item | 2–3 |
| Rare fish | 15–20 |
| Basic tool (if bought separately from a starting kit) | 20–30 |
| Binoculars (bird/animal/flower sighting) | 20–30 |
| Bait (cheap tier) | 2–3 per use |
| Bait (rare-shifting tier) | 8–12 per use |
| Fishing net (boat-based, separate from rod) | 30–40 |
| Fast travel (per discovered-location trip) | 3–5 |
| Seed pouch | 5 |
| Fence-section repair | 10 |
| First hen | 40–50 |
| First cow | 150–200 |

The intended pacing: a first small goal (seeds, a small repair) is
reachable within minutes of play; a mid goal (a hen) takes something like
half an hour; a cow is a real, multi-session savings target. Tune future
prices (crafted goods, upgrades, rare fish, animals beyond the first of
each kind) against this scale rather than picking numbers in isolation.

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
- **Guidance Mode** (see Opening Sequence #6) is the player-facing control
  over *how much* quest prompting she gets, always changeable in Settings:
  Tutorial Quests (mechanics-teaching), Aspiration Quests (drawn from her
  Starting Path + character-creation preferences), or None (no prompting,
  pure sandbox — she can still see/accept quests NPCs offer her directly,
  this setting only controls proactive prompting).

### 6. Relationships (Sims-depth social system)
This is a core pillar equal to the economy, not a side feature. Refined
with concrete mechanics from Sims/Stardew research rather than a vague
"friendship meter":
- **Two separate axes per NPC, not one number**: Friendship and Romance
  track independently (Sims-style) — a high Friendship doesn't imply
  Romance interest, and pursuing Romance doesn't require maxing Friendship
  first. Both feed the Memory Book differently.
- **Categorized interactions, not a single generic "talk"**: interactions
  are grouped (Friendly, Funny, Romantic, and — even in a peaceful game —
  a small "blunt/teasing" category for personality flavor), each category
  containing a handful of specific actions rather than one catch-all
  button. This gives the social system texture without needing full
  natural-language chat for every NPC (scripted mode) or wasting an LLM
  call on trivial small talk (AI mode).
- **Gifting uses explicit preference tiers with real point values**
  (Stardew-style): each NPC has loved/liked/neutral/disliked/hated items,
  and gifting moves the relevant axis by a concrete, tuned amount per
  tier (loved > liked > neutral > disliked > hated, with hated actively
  *hurting* the relationship, not just giving zero). Exact point values
  TBD during implementation, but the five-tier structure itself is
  confirmed, not a placeholder.
  **Preferences are derived from personality traits, not hand-authored
  per NPC** — a trait-to-category mapping (e.g. a "romantic" trait implies
  loving flowers; a trait tied to her role/setting implies loving items
  from that domain) generates each NPC's preference list, so adding a new
  NPC doesn't require manually writing a full gift table from scratch.
  Concrete first instance: the Riverside Fisherwoman's traits should
  derive a preference for **rare aquatic/river items** — an unusual catch
  or a fine bit of river-found craft means more to her than a generic
  gift would.
- **Relationships decay slowly if neglected**, mirroring the Skills decay
  principle (#1) — ignoring an NPC for a long stretch drifts the numbers
  down, not just stalls them. Gives a reason to revisit people, not just
  meet them once and forget them.
- **Milestone "heart events"**: at set relationship thresholds, a short
  scripted (or AI-flavored, if that layer is on) scene triggers — not
  random, tied to the specific NPC and threshold. **Fire independently on
  both axes** — a Friendship-threshold scene and a separate Romance-
  threshold scene with the same NPC are different events, not one merged
  track. These are exactly what feeds the Memory Book's Memories half
  (#14): a heart event *is* a memory entry, not a separate system bolted
  alongside it.
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
- **Fast travel, Sims-style**: walking takes real time across real
  distance (no teleporting by default), but clicking a discovered location
  on the minimap offers a quick-travel option **for a small coin cost**
  (an old-world framing like paying a coachman/ferryman fits better than
  a free instant warp — exact framing TBD). Only unlocked for locations
  already discovered on foot at least once; this is a convenience on top
  of the walked world, not a replacement for exploring it.

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
- **Autosave every few minutes**, in addition to any explicit save points —
  this is a hard requirement, not optional polish; the player should never
  lose more than a few minutes of progress to a crash or closed tab.
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

### 14. Collections & Memories
Formalizing an idea floated early on as "farm-game inspiration" (a
museum/album mechanic), now extended with a second dimension the person
specifically asked for: a Sims-style **memory book/scrapbook**, not just a
collection checklist.
- **Collections half**: album/collection tracking per category — the
  first confirmed instances are **birds, wild animals, and wild flowers**
  (river region, requires owning binoculars for birds/animals — see
  ROADMAP_EXPANSION Phase 1), generalizing to fish species caught, foraged
  items found, and later minerals/treasures — one system, multiple
  collections, not one-off code per category. Sighting/catching a new
  entry logs it; a UI screen shows progress per collection (X/Y
  discovered), tracked separately per category, not one merged list.
- **Memories half**: life-event entries, not just items — first day on the
  farm, first sale, first hen/cow bought, first repair completed, a
  relationship milestone (per #6: dating, marriage, a child born), a
  festival attended (per #7 seasons). Each memory can carry a short bit of
  flavor text and a timestamp (in-game date).
- **Presented as one physical, diegetic book** the player can open — sits
  in the house (a natural fit for the rest/living spot from #13's tier-1
  furniture) rather than being a pure abstract menu. Both halves
  (collections and memories) live in the same book, different sections/
  tabs, not two separate UI systems.
- Completing a collection or logging a major memory can reward money, a
  unique item, or a relationship/reputation bump — exact rewards TBD per
  entry, but the system should support rewarding milestones, not just be a
  checklist with no payoff.

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
- **Documented pitfalls from shipped LLM-NPC games (Suck Up!, AI Dungeon,
  and similar), to design against from the start:**
  - **Players will actively try to break character** — get the blacksmith
    to discuss quantum physics, extract the system prompt, or act
    completely against their sheet, purely to test the seams. The
    character sheet's constraints need to be genuinely strong (not just
    "please stay in character" politeness), and the structured-JSON
    validator (above) is the real backstop: if a response doesn't fit the
    closed action set or reads as badly off-character, fall back to a
    scripted line rather than surfacing whatever the model produced.
  - **Cost discipline is a gameplay feature, not just an engineering
    concern** — this reinforces the existing on/off toggle and depth/cost
    dial, but the lesson from real deployments is that uncontrolled call
    volume (e.g. a curious player rapid-firing dialogue) can spike costs
    fast; rate-limit calls per NPC per session in addition to caching.
  - **"Alive" doesn't require constant novelty** — several of these games
    lean on a fairly small set of well-written scripted fallback lines and
    still read as engaging; this supports Design Principle Zero directly
    (the AI-off experience isn't a lesser fallback, it's most of the
    actual game).

## Art direction
Top-down 2D, everything drawn in code (canvas) — no image assets, and
**no true 3D anywhere in the game, ever** (this was explicitly considered
and ruled out — see the project's early history with an isometric-asset
detour that got abandoned, in CLAUDE.md/this doc's earlier drafts).

**The single depth technique, used everywhere, not just as late polish:**
a consistent 2D "depth illusion" toolkit — jointed/volumetric character
rigs, buildings with two visible faces, diagonal cast shadows, parallax
background layers, and scene-transition effects (like an underwater state
for diving: color-tint shift, bubbles, light shafts, blurred background
layer) built from the same flat-canvas techniques already used for the
farm and characters. This is the core art identity of the whole game, not
a Phase-7-only upgrade — ROADMAP_EXPANSION's Phase 7 "Juice & feel" is
where the *fullest* version of these techniques lands, but simpler
versions of the same toolkit (e.g. a basic diving transition) can and
should appear as soon as content needs them, using whatever level of
polish is practical at that point in the build. Warm palette, soft
shadows, constant gentle ambient motion (sway, shimmer, smoke) throughout.

## Non-goals
Multiplayer. True isometric or realistic/photographic graphics. Combat,
monsters, death. Mobile app stores (browser-first). A character creator on
day one.