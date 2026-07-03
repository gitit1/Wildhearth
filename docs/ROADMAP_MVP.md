# Roadmap — MVP (the first complete, working game)

Goal: a small but *whole* game. Not a tech demo — something with the
identity of Wildhearth already recognizable: you start with almost nothing, you
choose how to earn, every tool is bought, skills grow, the farm visibly
improves. No town, no NPCs, no AI yet. Those are ROADMAP_EXPANSION.md.

**Definition of done for the MVP:** a new player can start the game, pick a
livelihood, earn coins through at least one full loop, buy her first tool,
watch a skill number grow, open her backpack and skills window, and see one
piece of the farm visibly repaired. Close the game, reopen it, everything is
still there.

Build order matters — each step should leave the game *running*, not broken,
so you can check progress in the browser after every step.

---

## Step 0 — Where we are (DONE)
Already built and verified (`npm run build` passes):
- Vite + TS skeleton, module structure, CLAUDE.md
- Ground, zones, collision, camera, input (keyboard + touch)
- Player movement/animation, ambient cow + hens
- One working loop: fish at the pond → sell at the stall → coins persist

## Step 1 — Inventory replaces the rigid coin/fish fields
Why first: every later step (skills, farming, buying tools) needs a real
item store instead of two hardcoded numbers.
- `src/systems/inventory.ts`: slot-based item store. Item = `{id, qty}`.
  Fixed slot count (e.g. 12), upgradeable later (not in MVP).
- Migrate `economy.ts`: coins stay a separate number (currency, not a slot
  item); fish becomes an inventory item (`id: "fish"`).
- `src/art/icons.ts`: one small painter function per item icon (fish, coin
  pouch — more added as items are introduced in later steps).
- `src/ui/backpack.ts`: window opens on key **I**, grid of slots, shows
  icon + qty per item, closes on I or Escape.
- Checkpoint: fishing loop still works end to end, fish now visibly sit in
  the backpack grid before being sold.

## Step 1.5 — Mouse-first control retrofit
A late but important decision: mouse becomes the primary input, on top of
what Step 0/1 already built.
- `src/engine/input.ts`: add click-to-move — a click/tap on the world sets
  a target point, the player entity walks toward it each frame (straight
  line against existing `blocked()` collision is fine for MVP; real
  pathfinding is an EXPANSION polish item, not required here). Keep the
  existing WASD/arrow keys and touch-drag joystick working as an alternate
  input — this is additive, not a replacement.
- The Step-1 backpack (and the Step-2 skills window, once it exists) get an
  on-screen clickable icon in the HUD, not just a keyboard shortcut. Keep
  the shortcut too (I/K) as a secondary way in.
- Checkpoint: a player who never touches the keyboard can still play the
  whole MVP loop end to end with the mouse alone.

## Step 2 — Skills (minimum viable: 5 skills, no cap yet)
- `src/systems/skills.ts`: `Skill = {id, value: 0-100, lock: "up"|"down"|"locked"}`.
  Five skills: Fishing, Foraging, Farming, Busking, Haggling.
  Gain function with diminishing returns near 100; no overall cap yet
  (cap + lock enforcement is Step 7, once there's enough skills for it to
  matter).
- Wire Fishing skill to the existing fishing system: catching a fish grants
  a small gain; higher Fishing skill shortens the average bite time.
- `src/ui/skills.ts`: window on key **K**, scrollable list, each row shows
  name + value + a floating `+0.3` popup on gain (reuse the toast/particle
  approach already in `ui/hud.ts`).
- Checkpoint: fishing now visibly trains a skill; better skill = faster
  bites. Game still fully playable.

## Step 3 — Foraging (second livelihood)
- `src/world/zones.ts`: add a forage patch (or a few bush spots) inside the
  existing forest-edge tree cluster.
- `src/systems/foraging.ts`: interact near a bush → timer → berries added
  to inventory, bush "used up" and respawns after a delay (mirror the fish
  timer pattern from `systems/fishing.ts`).
- `src/art/props.ts`: add a berry-bush painter (two states: full/picked).
- Wire Foraging skill: picking grants gain; skill shortens respawn wait
  or increases yield (pick one — keep it simple for MVP).
- Checkpoint: two independent ways to earn now exist.

## Step 4 — The market stall becomes a real shop (buy, not just sell)
- `src/systems/shop.ts`: a small fixed price list (buy hoe, buy seeds —
  just enough for Step 5). Buying removes coins, adds an inventory item/tool
  flag.
- Extend `ui/hud.ts` prompt/toast pattern for a simple buy interaction at
  the stall (reuse existing E/action-button flow, no new UI framework).
- Checkpoint: player can now spend her fish/berry money on her first tool.

## Step 5 — Farming (third livelihood, and the first purchase payoff)
- `src/world/zones.ts`: designate a small tillable plot near the house
  (reuse/shrink the existing FIELD rect — MVP doesn't need the full big
  field yet).
- `src/systems/farming.ts`: till (requires owned hoe) → plant (requires
  owned seeds, consumes one) → grow timer → harvest → crop added to
  inventory. Mirror the same state-machine shape as fishing/foraging so the
  three systems stay consistent and easy to maintain.
- `src/art/props.ts`: extend `drawCorn` (already exists) into a generic
  per-tile crop painter with a growth-stage parameter.
- Wire Farming skill.
- Checkpoint: the full "earn → buy tool → new loop unlocked" arc is now
  provable in-game with real gameplay, not just design docs.

## Step 6 — Busking + Haggling (fourth and fifth livelihoods)
- `src/world/zones.ts`: a small square/plaza spot (doesn't need the full
  town — just a designated busking tile near the farm for MVP).
- `src/systems/busking.ts`: interact → mini timer/rhythm-lite loop (keep it
  simple: a skill-weighted random tip amount is fine for MVP) → coins
  awarded directly (no inventory item).
- Haggling: no NPCs yet, so for MVP this skill just discounts prices at the
  Step-4 shop (`price * (1 - hagglingDiscountCurve(skillValue))`). Full
  dialogue-based haggling is an EXPANSION item once NPCs exist.
- Checkpoint: all five starting livelihoods exist and each trains its own
  skill.

## Step 7 — Skill lock, and the real opening sequence
Now that 5 skills exist, the lock system and starter choice are meaningful.
Implement the exact flow from `VISION.md`'s "Opening sequence" section, in
this order — do not shortcut straight to a bare choice screen:
- `src/ui/titlescreen.ts`: New Game / Continue. Continue loads the save and
  skips everything below entirely.
- `src/ui/intro.ts`: short skippable text (new-game only) — a placeholder
  sentence or two is fine for MVP, final writing is a content pass, not a
  blocker.
- Reveal sequence: camera/scene shows the rundown farm state (Step 8's
  rundown painters need to exist by now — reorder Step 8 earlier if it's
  easier to build the visuals before this screen needs them) *before* the
  starter-choice screen appears.
- `src/ui/newgame.ts`: starter choice — hoe / rod / instrument. Sets
  starting tool + seeds that skill's value slightly.
- Tutorial toggle (guided vs open), asked once here, stored as a normal
  setting (not a one-time irreversible flag — it must be changeable later
  from a settings menu, even if that menu is minimal for MVP).
- Extend `skills.ts` with an overall cap (pick a placeholder number, e.g.
  250, since MVP only has 5 skills — revisited when more skills arrive in
  EXPANSION). Enforce: a skill can't gain if the cap is full and it isn't
  currently favored; `locked` skills never move (up or down).
- Checkpoint: skill system now has real stakes, not just numbers going up,
  and starting the game feels like the start of *this* game, not a bare
  tech demo.

## Step 8 — Farm repair (visible renovation, tier 1 only)
- `src/art/buildings.ts`: add a "rundown" paint variant for the house
  (patched roof hole, boarded window, broken-plank fence) alongside the
  existing normal state.
- `src/systems/renovation.ts`: 3–4 fixed repair actions (fix fence, patch
  roof, fix door), each costs coins + requires being near the farmhouse,
  flips one rundown flag to fixed and swaps the painter output.
- Checkpoint: the farm visibly changes as a direct result of money earned
  — the renovation arc from VISION.md is now real, not just described.

## Step 9 — Save/load hardening
- Version the save schema (`SAVE_KEY` + a `version` field already
  scaffolded in `economy.ts` — extend the same pattern to inventory,
  skills, farm-repair state, starter choice).
- One explicit "new game" vs "continue" entry point.
- Checkpoint: this is the MVP finish line. Closing and reopening the
  browser preserves everything above.

---

## After this file
Once every checkpoint above is real and playable, move to
`docs/ROADMAP_EXPANSION.md` — town, NPCs, the AI layer, relationships,
crafting depth, housing depth, and the rest of the full vision. Do not pull
expansion items forward into this file; if something here turns out to need
an expansion feature to feel good, note it and keep going — polish passes
happen after the MVP is whole, not before.
