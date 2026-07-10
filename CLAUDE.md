# CLAUDE.md — agent guide for this repository

## What this project is
"Wildhearth" — a single-player top-down 2D life-sim / farm / open-world game.
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
1. **Art is code-drawn OR PixelLab-generated — nothing else.** (Policy
   updated 2026-07-08 by the product owner.) Visuals are either drawn
   procedurally on canvas (src/art/) or pixel-art sprites generated
   through the game's PixelLab account, stored under
   src/assets/pixellab/<category>/. Every sprite-backed visual MUST keep
   its code-drawn painter as a runtime fallback (dual-path: PNG when
   present and loaded, painter otherwise — the game must run fully with
   zero sprite files). Never add hand-made or third-party asset files,
   never suggest asset packs. See docs/PIXELLAB_ASSETS.md for the
   generation workflow and style anchors.
   **MEDIUM DIVISION (decided 2026-07-10, session 3 — one world, two
   pipelines, split by subject, never mixed arbitrarily):**
   - **Characters (player + all 10 NPCs) render via the decomposed code
     rig `src/art/rig.ts`** — this is the SHIPPED look, not a fallback.
     Characters MUST stay decomposable (build/skin/hair/outfit/age/
     eyeColor/hairstyle) because they power the character-creation pillar,
     and PixelLab structurally cannot decompose a character (it bakes
     full-body sprites with no layer/skeleton control). The rig is drawn
     in the SAME pixel-art language as the sprites (nearest-neighbour, dark
     outline, warm muted palette, 3-tone shading) so the world stays one
     coherent look.
   - **The environment (buildings, animals, props, trees, crops, items)
     uses PixelLab sprites** (dual-path over code painters, per above).
   - The PixelLab CHARACTER sprites are kept as an off-by-default FALLBACK
     (not deleted), toggled by `CHARACTER_SPRITES_PRIMARY` in
     src/config.ts. See docs/DECISIONS.md "Art medium division".
2. **The user is the product owner, Claude is the implementer.** She reviews
   results; do not hand her manual work (no "now you tweak X").
3. Keep gameplay tuning values in src/config.ts, world layout in
   src/world/zones.ts — never hardcode inline.
4. TypeScript strict mode must stay green: `npm run build` before declaring done.
5. Everything is English — UI-facing strings, code, comments, and docs.
   (Product-owner decision 2026-07-03; the UI was originally Hebrew.) The
   user may still review docs in chat in Hebrew; the files stay English.
6. Keep modules small and single-purpose; follow the existing structure below.

## Commit & push workflow (MANDATORY)
Updating docs/WORKLOG.md is PART of committing. A commit that changes game
behavior without a matching WORKLOG entry is incomplete. Every time a
commit or push is requested, in order:
1. Finish the work for the current block only.
2. Run `npm run build` and confirm it passes.
3. Add/update the docs/WORKLOG.md entry for this block (see WORKLOG.md for
   the required detail level).
4. `git add -A`
5. `git commit` — message matches the WORKLOG entry title.
6. `git push`
Never split the code change and the WORKLOG update into separate commits.

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
