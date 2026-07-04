# Autorun Summary — batch 2

**Branch: `autorun/wildhearth-batch-1`** (continued from batch 1 — no new
branch; master untouched). Five commits this batch, each built, verified,
and pushed. Per-file detail lives in `WORKLOG.md`; this reads on its own.

Date of run: 2026-07-04. Parallel subagents were used for the VISION.md
digest and the clock-dial painter.

---

## 0. Docs baseline — `027fb86`
The product owner replaced the stale `VISION.md` (311 → 565 lines) and added
`WORLD_MAP.md` (the world tracking sheet + the rundown-farm concrete detail
list). Committed as this batch's source of truth. A subagent digested the
new VISION in full; its findings feed the follow-ups section below.

---

## 1. Farm plot expansion — money-gated — `ecc64e1`
**Source:** ROADMAP_EXPANSION.md, "Farm plot expansion — money-gated".
The spec left size/price/tier-count to implementation. Decisions made, and
why:

- **Two tiers, each a full-width 2-row strip south of the field** (22 tiles
  each, +20% of the 110-tile base per tier). South strips keep the fenced
  area one clean rectangle, so the fence visibly *leaps* outward the moment
  the purchase lands — the block's visible-transformation principle with no
  awkward L-shaped fencing. Two decorative trees south of the field moved a
  little further south so the tier-2 fence never swallows them.
- **Prices 120 / 180** (config `PLOT_EXPANSION_PRICES`): the block asks for
  "above a fence-repair-scale purchase (10), closer to an animal-tier
  spend" — tier 1 sits between the hen (45) and the cow (175); tier 2 at
  cow tier, escalating because it permanently grows capacity.
- **Sold at the farmhouse hub**, beside the repairs — the established
  money-into-visible-farm-growth vendor; no doc names another.

Mechanically: `plotTiers` lives in the farm store (versioned, tolerant,
reset by New Game); `loadPlots(tiers)` builds base + strips in fixed tier
order so saved cells keep mapping positionally; buying a tier materializes
22 new wild cells on the spot (interactables registered live, with
membership guards so a New Game leaves no ghosts); the fence painter and
the minimap's static layer both read the live bounds; buying writes a
`first_expansion` Memory Book entry.

**Verified (Playwright, 8/8):** tier-1 offer/purchase (350→230 coins,
110→132 persisted cells, fence-leap screenshot), tier-2 (→50 coins, 154
cells), no third tier offered, **a cell at store index 143 — a tier-2 strip
cell by construction — tilled through normal play**, and the broke refusal
changing nothing.

---

## 2. UI/HUD exterior design pass — `515750c`
**Source:** batch-2 instruction + VISION's Controls section (icons-primary
was speced, never built).

- **The clock dial** (`src/ui/clockdial.ts`, written by a parallel subagent
  to a precise spec): a 64px painted circle replacing the flat time pill —
  the sky face blends by the hour (night blue → dawn peach → day blue →
  dusk ember), a glowing sun arcs 6:00→19:00 and a crescent moon rides the
  night arc, HH:MM sits below the horizon line, the wood-and-gold ring
  carries a 60° season-tinted tick at the top, and rain/storm/fog leave
  small marks on the face. Fed by the same per-frame `getWorldContext()`
  snapshot the HUD already used — no second call. The date pill slims to
  "Spring · Day 4"; the weather pill stays as the text label.
- **One chrome language** (index.html design tokens + grouped overrides):
  every floating window (backpack, skills, memory book, shop, minimap)
  shares the same wood border, 14px radius, gold hairline inset, and soft
  drop shadow; headers are gold with hairline underlines; pills, the
  prompt, and toasts get the same outlined rounded treatment; item cells,
  skill rows, shop rows, and book entries share one outline recipe; tool
  and zoom buttons are one family with hover/active states. Verified by
  computed style: identical border/radius/shadow across windows.
- **Icons-first windows** (VISION Controls): a new 🗺 map button joins
  📜 📖 🎒 — all four windows open primarily by icon, keyboard second.
  **This also surfaced and fixed a real batch-1 bug:** the Memory Book had
  claimed key M, silently colliding with the minimap's M. The map keeps M;
  the book moved to B.
- Skills panel default geometry adjusted so nine skills clear the tools row.

**Verified (Playwright 6/6 + eye review):** the dial canvas actually paints;
all four icons toggle their windows; M toggles *only* the map and B *only*
the book; chrome identical across windows; screenshots at noon/dawn/night/
rain reviewed — the dial is legible and charming at 64px.

---

## 3. Farm environment detail pass — `5fc7c97`
**Source:** batch-2 instruction; grounded in VISION's Art direction (warm
palette, soft shadows, consistency and motion).

- **Furrowed soil:** tilled tiles now have four gently-waved furrow rows —
  a dark groove with a sunlit crest — plus scattered soil crumbs, all
  deterministic per tile (no shimmer), still reading darker and damp when
  watered.
- **Shingled roofs, weathered vs. repaired:** a shared `drawShingleRoof`
  paints overlapping offset shingle rows with per-shingle tone jitter on
  both the house and barn gables. Unrepaired roofs jitter harder and drop
  whole shingles (dark gaps); repaired roofs read neat and even. The
  existing rundown story-props (hole + patch plank, boarded window, barn
  boards) still draw on top.
- **Plank walls:** a shared `drawPlankWall` gives the house and barn
  vertical planks with alternating tone, thin seams, and occasional knots.
- **Three-tone tree canopies:** a dark under-layer, mid-tone body, and
  sunlit top clusters, with subtle per-tree tint variation and a bark seam.
- **Ambient props:** ~42 stones, ~56 fallen leaves, and 7 mushrooms baked
  once into the pre-rendered ground (zero per-frame cost) with a fixed seed
  and rejection zones around the field *at its maximum expanded size*, the
  pond, buildings, the path, and every clickable (bushes, flower beds, busk
  spot) — so they can never block movement or sit under an interactable.
- **Entity drop shadows:** verified already present (player, cow, hen all
  call the shared `shadow()`); nothing duplicated.

**Verified:** screenshots reviewed at both farm states and zoomed in
(weathered/neat contrast, furrows under five different crop palettes,
planks and knots, props on grass but absent from field/pond/path);
functional smoke in-browser — field prompts still live, zero page errors.

---

## Skipped / explicitly not folded in

- **The rundown-farm concrete detail pass** (coop, well, missing fence
  section, sparkle spots, broken bridge, mine on the horizon, visible road)
  is now **unblocked** — WORLD_MAP.md carries its source list — but it's a
  separate ROADMAP block of new *objects and unlocks*, not texture on
  existing ones, so it wasn't smuggled into area 3. It's the natural next
  build unit.
- Nothing else in the three assigned areas was skipped.

## Design decisions worth a second look

1. **Expansion placement south** (two full-width strips) — chosen for clean
   fencing and visibility; if the world-expansion block later wants that
   land for the road south, tiers could move east instead (the strip
   definitions are two lines in `zones.ts`).
2. **Toast styling** was folded into the shared chrome (pale-green text on
   the dark panel); the old solid-green toast is gone. Flag if missed.
3. **Memory Book hotkey moved M→B** to fix the map collision.
4. **VISION digest surfaced tuning conflicts** (pre-existing, not from this
   batch): the code's skill cap is 250 vs. VISION's "~700" example; starting
   coins are 0 in code vs. 15 in VISION's price anchor table; VISION names
   birds/animals/flowers as the Collections' *first* categories (binocular-
   gated) while the code shipped fish/forage first as the engine's live
   proof. All logged here rather than churned mid-batch.
5. **Clock dial replaces the textual time** entirely — if a numeric date+
   time line is ever wanted back, it's one line in `hud.ts`.

## Screenshots referenced
Captured under the session scratchpad during verification: `expand-before/
tier1/tier2/descent.png`, `ui-noon.png`, `ui-dial-{dawn,night,rain,dusk-fog}.png`,
`env-rundown.png`, `env-repaired.png`, `env-field-zoom.png`.

---

# Batch 3 — continuation (same branch)

Date: 2026-07-04. Baseline commit `8d58520`: the product owner's updated
VISION.md (starting coins decided: **50**) and the revised
ROADMAP_EXPANSION.md carrying the new stall-selling block. (Note: that
revision also reset the file's earlier `[x]` ticks — left as delivered;
WORKLOG.md remains the authoritative built-record.)

## 4. Fix: starting coins = 50 — `ff95174`
**Source:** VISION.md price anchor table (resolves the 0-in-code vs
15-in-old-doc conflict batch 2 flagged).
`STARTING_COINS = 50` in config; `newGameReset` seeds from it. Nothing else
touches starting money.
**Verified (2/2):** a New Game over a seeded 999-coin life starts at exactly
50 — HUD and persisted save both checked — and survives reload + Continue.

## 5. Visual pass II — shared outlines + richer grass — `aa3d0ba`
**Source:** batch-3 instruction (reference-look direction).
- **One game-wide outline**, defined once in `shapes.ts` (`OUTLINE`
  rgba(43,32,19,.62), width 1.6) with `outline`/`oRect`/`oEllipse` helpers —
  applied to every major silhouette: player (torso/head/hat), cow, hen,
  tree trunks + canopy blobs, bush blobs, every fence post, ripe crop ears,
  flower beds, the busk hat, house/barn wall contours, both shingled gables
  (stroked crisp outside the clip), doors, chimney, stall counter + awning.
  Deliberately not outlined: sub-2px specks (grass blades, crumbs, sprouts),
  which would turn to mud at this stroke width.
- **Richer grass**: 240 fanning grass-blade tufts (two greens) + 320 tiny
  pastel flower dots, deterministic, baked into the pre-rendered ground
  (zero per-frame cost), painted under the yard/field/pond layers.
- **Shadow audit**: every drawn entity already carried the shared elliptical
  shadow (player, cow, hen, trees, bushes, house, barn, stall) — confirmed,
  none added, none duplicated.
**Verified:** full-farm and zoomed screenshots reviewed — the outline is the
single change that most pulls the scene toward the reference; functional
smoke green (prompts live, no page errors).

## 6. Stall selling by path — Fishing — `9bc81c1`
**Source:** the new ROADMAP_EXPANSION block, Fishing scope only.
New `systems/sellCategories.ts`: a `SellCategory` dispatch where the fishing
category — **capability-gated**: owns a rod, OR the Memory Book records any
catch, OR the bag holds legacy fish — claims all 12 species + 3 junk +
legacy "fish". Goods no category claims yet (crops, forage, dishes…) pass
through untouched until their own blocks land; output preserves
`GOOD_PRICES` order so a fisher's stall renders pixel-identical. The shop
window reads the injected lookup, and **"Sell everything" now sells only
what the stall shows** — previously it used `economy.sellAllGoods`, which
would have silently sold hidden fish. Adding Farming later is one new
`SELL_CATEGORIES` entry; the dispatch, the window, and main stay untouched
(the block's generalizability criterion, verified by inspection).
**Verified (6/6):** rod owner sells carp/junk/berries exactly as today
(2 carp → +6); a hoe-life player holding seeded carp+tin sees neither row
while berries/corn still sell, and Sell-everything earned exactly the
visible 16 leaving carp+tin in the bag; buying a rod surfaced the fish rows
in the same window; a rodless player with a recorded catch still sells fish.

## Batch-3 follow-ups
- `economy.sellAllGoods` is now uncalled — remove or repoint when the next
  category block (Farming/eggs) lands.
- The interior room kept its softer un-outlined look on purpose (it has its
  own light language); revisit with Housing tier 2.
- The ROADMAP revision's tick reset means WORKLOG.md (and these summaries)
  are the reliable record of what's actually built.
