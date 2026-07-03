# CLAUDE.md — agent guide for this repository

## What this project is
"Meshek" (משק) — a single-player top-down 2D life-sim / farm / open-world game.
Design pillars: The Sims + Ultima Online + farm games. The player starts nearly
broke (fishing, street singing, foraging), buys every tool herself (no free
progression), renovates a rundown farm, explores, and trades with LLM-powered
NPCs that think, remember, and come to her shop as customers.

Read docs/VISION.md before making design decisions. Read
docs/ROADMAP_MVP.md to see the current build order — work through it
top-to-bottom, keeping the game runnable after every step, before touching
anything in docs/ROADMAP_EXPANSION.md (town, NPCs, the AI layer, and
everything after). Do not build ahead of the current phase without asking.

## Hard rules
1. **All art is code.** Every visual is drawn procedurally on canvas
   (see src/art/). Never add image/sprite/asset files, never suggest asset
   packs. New visuals = new painter functions.
2. **The user is the product owner, Claude is the implementer.** She reviews
   results; do not hand her manual work (no "now you tweak X").
3. Keep gameplay tuning values in src/config.ts, world layout in
   src/world/zones.ts — never hardcode inline.
4. TypeScript strict mode must stay green: `npm run build` before declaring done.
5. UI-facing strings are Hebrew; code, comments, and docs are English. The
   user reviews docs here in chat (in Hebrew) and Claude updates the English
   files accordingly — the files themselves stay English.
6. Keep modules small and single-purpose; follow the existing structure below.

## Architecture map
- src/config.ts — tuning knobs (speeds, prices, sizes)
- src/engine/ — input (keyboard+touch), camera, deterministic rng
- src/world/ — zones (layout), collision, ground painter (pre-rendered once)
- src/art/ — painter functions: shapes, props, buildings, characters
- src/entities/ — player, animals (state + update logic, no drawing)
- src/systems/ — economy (coins/inventory/save), fishing; future: shop, quests,
  npc-brain (LLM calls), skills, renovation
- src/ui/ — HUD, prompts, toasts (DOM, not canvas)
- src/main.ts — game loop: update -> interactions -> draw (depth-sorted)

## Conventions
- Entities hold state; art/ holds how they look; systems/ hold rules.
- Depth sorting: push {y, drawFn} into the ents list in main.ts.
- Interactions: proximity check in main.ts -> setPrompt -> consumeAction().
- Persistence: localStorage via systems/economy.ts pattern (SAVE_KEY versioned).
- Determinism for textures: mulberry32 with fixed seeds.

## Running
npm install; npm run dev (Vite, opens browser); npm run build (typecheck+bundle).

## LLM-NPC layer (future, phase 2)
The mechanical simulation (schedules, needs, movement) runs in plain code.
LLM calls happen only at meaningful moments (dialogue, buy/haggle decisions,
quest offers) with a character sheet + memory, returning structured JSON that
the game validates. Design details in docs/VISION.md §NPCs.
