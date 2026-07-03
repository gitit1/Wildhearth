# Roadmap — Expansion (everything after the MVP is whole)

Prerequisite: every checkpoint in `docs/ROADMAP_MVP.md` is done and playable.
This file does not get started before that one is finished — the MVP is the
foundation everything here is bolted onto, not a parallel track.

Read `docs/VISION.md` for the *why* behind each system; this file is the
*build order*. As in the MVP file, prefer leaving the game runnable after
each step over batching changes.

**Open decision, not yet resolved:** is the mine reachable from the
farm/forest area (same tier as foraging), or does it require the town
(tools/permission from a smith)? Placement below assumes "requires town,"
mark it TODO if that's wrong — resolve before Phase 2's mining item.

---

## Phase 0 — Depth & correctness pass on MVP systems
Before building anything new (town, NPCs), fix and enrich what the MVP
already has. Two of these are **bug fixes against our own pillar** — the
current prototype has a cow and hens roaming for free, which contradicts
"nothing is free" — everything below either corrects that or takes a
single-note system (one fish, one crop) and gives it the texture a real
game needs.

1. **Fix: no free animals.** The cow/hens currently in the demo must not
   exist until purchased. Remove default spawn; wire them into the Phase-4
   (MVP) shop as buyable, with their own price and a coop/barn-repair
   prerequisite (ties into Housing/Renovation, MVP Step 8).
2. **Fish variety (rich tier — 10+ species).** `data/fish.ts`: table of
   species, each with a rarity weight, a required Fishing-skill floor, and
   tags for *where* (river vs. pond vs. lake, once those are distinct
   zones) and *when* (season, weather) it can appear. `systems/fishing.ts`
   rolls against this table instead of always returning one generic fish.
   Higher Fishing skill both raises catch odds for rare tags and shortens
   average bite time (already true for the generic case — now it also
   shifts the species roll).
3. **Market becomes a real place you walk to.** Not the full town (that's
   Phase 1) — a standalone market/dock area, separate from the farmhouse,
   reachable by the road already added in Phase 1's zone work (pull that
   one piece of Phase 1 forward if needed, since this depends on it). The
   player must physically carry goods there to sell — the stall no longer
   sits conveniently next to the farm.
4. **House interior — first pass.** The house becomes enterable. Minimum
   viable rooms: a cooking spot, a wash basin, a bed, one rest/living
   spot — exactly the four the Needs system (VISION #13) requires. This is
   *tier-1* furniture: fixed, not yet shoppable/placeable (that's Housing
   Phase 4's tier 2/3) — but real, enterable, and functional.
5. **Needs system.** `systems/needs.ts`: hunger, energy, hygiene, mood,
   social — each a 0–100 value that decays over time/activity. Interactions
   at the Step-4 interior spots restore the matching need. Mood is derived
   from the other four plus recent social contact; mood in turn modulates
   skill-gain rate and busking tips (a concrete, testable hook — not just a
   number sitting unused).
6. **Crop/farming variety pass**, mirroring the fish-variety idea at a
   smaller scale: a few crop types instead of one, gated by Farming skill
   and season (seasons themselves are still Phase 6/VISION #7 — if seasons
   aren't in yet, gate by skill only for now and revisit).

**Checkpoint:** the same five livelihoods from the MVP, but each with real
texture (many fish, a market you travel to, an interior life with needs) —
before a single NPC or town building exists.

## Phase 1 — Town & scripted NPCs (still zero AI calls)
Everything here must be fully playable and feel alive with AI OFF — this is
what makes the later AI layer an enhancement, not a crutch.

1. `src/world/zones.ts` — expand the world: farm becomes one corner of a
   much larger map. Add a dirt road out of the farm, a town area, forest
   edge extended, river, and a mine entrance placeholder. Remove the fence
   that currently seals the whole play area.
2. `src/ui/minimap.ts` — parchment/scroll-styled minimap in a screen
   corner, player dot, revealed-so-far regions (UO-style paper map feel).
3. Town buildings (reuse the `art/buildings.ts` painter pattern): inn,
   3 specialized merchant stalls (fish buyer, seed/tool seller, general
   goods), 5–8 NPC homes.
4. `src/entities/npc.ts` — NPC entity: position, home/work targets, a
   simple daily schedule (home → work → square → home) driven by a game
   clock, no AI.
5. `src/systems/schedule.ts` — the clock-driven schedule engine that moves
   NPCs between their fixed points through the day.
6. `src/systems/relationships.ts` — friendship/affection number per NPC,
   gift-giving (consumes an inventory item, raises affection by a table
   lookup), scripted dialogue trees (`data/dialogue/*.ts`, hand-authored
   lines keyed by affection tier).
7. `src/systems/quests.ts` — fixed authored quests (fetch/deliver/talk-to),
   quest log UI, rewards route into inventory/economy/relationships.
8. `src/systems/customers.ts` — NPCs walk to the player's stall with a want
   drawn from a static want-table (personality tag + season + what's in the
   player's stock), scripted haggling curve reads the Haggling skill value.
9. Pets: one adoptable companion (dog or cat) with a simple follow/idle
   behavior — companionship flag, not full relationship depth yet (that's
   Phase 5).
10. Mining skill + mine region: resource nodes, rarity increases deeper in.
11. Cooking skill: at least one recipe (uses 2+ inventory items → 1 cooked
    item, sellable for more than the raw ingredients).

**Checkpoint:** a town full of NPCs with visible routines, real
relationships, fixed quests, and customers who come to you — before any
LLM call exists in the codebase.

## Phase 2 — NPC brain (the AI layer)
Start only once Phase 1's scripted town is solid and fun standalone.

1. `src/systems/npc-brain/sheet.ts` — character sheet format: personality,
   role, schedule, tastes, teaching skill (if relevant).
2. `src/systems/npc-brain/memory.ts` — per-NPC dynamic memory store
   (interactions, opinions, mood, recent events), persisted like
   inventory/skills.
3. `src/systems/npc-brain/protocol.ts` — the LLM call contract: structured
   JSON response, closed action set (`say | sell | haggleResponse |
   offerQuest | memoryUpdate | gossip | teach`). Game-side validator rejects
   anything outside the schema before it's applied — never execute free
   text as instructions.
4. Wire calls only at meaningful moments: opening dialogue, a buy/haggle
   decision, a quest offer, a teaching session. Never per game tick.
5. Caching layer + explicit fallback to Phase-1 scripted behavior when the
   call fails, is disabled, or there's no key.
6. `src/ui/settings.ts` — AI on/off toggle, depth-vs-cost dial, API key
   entry (player's own key/budget, never hardcoded).
7. Make Haggling/Charisma skill values visibly shape LLM dialogue tone, not
   just a hidden price multiplier.
8. Dynamic quest generation layered on top of the Phase-1 fixed quest list.
9. Teacher NPCs: paying for faster skill gain; teaching quality reads the
   teacher's own character sheet.

**Checkpoint:** the same town from Phase 1, now capable of freeform,
memory-aware conversation and dynamic quests when AI is on — and exactly as
playable as before when it's off.

## Phase 3 — Crafting chains & professions
1. `src/systems/crafting.ts` — generic chain engine: recipe = inputs +
   output + required station + skill used. Pricing everywhere already
   supports "buy finished vs. craft yourself" (Step 4/6 shop pattern) —
   extend it so crafted goods sell for more than raw ones sold directly.
2. Author 3–4 parallel chains: wheat→flour→bread, wool→yarn→cloth,
   milk→cheese (each ~3–4 steps per VISION #4).
3. Fashion/Tailoring and Hairdressing/Styling professions + their stations
   in town.
4. Character appearance customization unlocked through those professions
   (first real customization moment in the game — not a day-one screen).
5. Animal husbandry expansion: coop→hens→eggs, barn→cow→milk chains fully
   wired into crafting.

## Phase 4 — Housing depth & transportation
1. Tier 2 renovation: template-based room/furniture upgrades (pick-a-preset
   layouts), building on the Phase-8-of-MVP... i.e. MVP Step 8's tier-1
   repair system.
2. Tier 3: freeform building/furniture placement.
3. Horses, carriages, boats — purchasable, tied to the town/stable, old-
   world only (no motor vehicles per VISION).

## Phase 5 — Relationships at full Sims depth
1. Marriage/partnership, cohabitation.
2. Children: birth/adoption flow, growth over time.
3. NPC-to-NPC relationships the player can observe/gossip about — feeds
   Phase 2's dynamic quests and dialogue flavor.
4. Full pet relationship depth (beyond Phase 1's simple companion flag).

## Phase 6 — World growth
1. Regions beyond farm/town/forest/river/mine — explicitly open-ended,
   author more as the game grows rather than pre-building a fixed map.
2. More treasure/discovery content, rarer resources deeper into
   forest/mine.
3. Seasonal festivals with town-wide NPC participation (builds on Phase 1
   schedules + VISION's season system).
4. Second save slot.

## Phase 7 — Juice & feel ("more Ultima Online")
Richer animation and depth feeling, still top-down, still all code-drawn.
1. Player rig upgrade: jointed limbs with swing arcs; dedicated animations
   per action (cast, reel, dig/hoe, play instrument, carry sack).
2. Secondary motion: hair/clothes sway, small facial states.
3. Faked-height depth pass: buildings with two visible faces, diagonal cast
   shadows, volumetric characters (keep the flat grid — do NOT convert to
   true isometric; that path was tried and abandoned early in this
   project, see CLAUDE.md history).
4. Ambient life: birds, falling leaves, weather (rain), night + lanterns.
5. Feedback juice: hit-pauses, particles on actions, floating numbers,
   subtle screen shake on big moments.

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