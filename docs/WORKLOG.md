# WORKLOG — Wildhearth

Purpose: a running, detailed record of every unit of work done on the game.
This is **not a roadmap and not an index** — it is the "what actually
happened" log. One block per completed task, newest at the top. Bring this
file to the design chat and it alone should tell you the exact state of the
project.

## How to write an entry (the agent MUST follow this)

- **One block = one task = one commit.** Never merge two tasks into one
  entry, and never split one task across two.
- Write the entry **after** the work is done and `npm run build` passes, and
  **before** the commit — updating this file is part of the commit (see
  `CLAUDE.md`).
- **Be specific.** Name every file created or changed, every system /
  function / data structure / save key added or touched, and the actual
  player-facing behavior that changed.
  - ✗ "Added fishing polish."
  - ✓ "Added quality tiers to catch resolution in `src/systems/fishing.ts`
    via `resolveCatch()`; new `Quality` enum + `rollQuality()`; sell price
    now multiplied by quality in `src/systems/economy.ts`."
- If anything was left unfinished, or a decision is still open, put it under
  **Follow-ups** so it is never lost. Do not silently drop it.

---

## Entries (newest first)

<!-- Copy the template below for each new block. Keep newest at the top. -->

## npc — town life + first-arrival hint (v2 BLOCK #3, part 3)
- **Date:** 2026-07-11 (v1-foundation)
- **What & why:** so the coastal town isn't a ghost street, a few existing
  townsfolk now walk down to it on a schedule, and the player is greeted +
  pointed the way the first time she arrives.
- **Schedule — `src/systems/schedule.ts`:** new `NpcState` member `"town"`
  (added to the `OUTDOOR` set so a storm still sends visitors home). New
  `townVisitsToday(def, dow)` routes a handful of NON-stall roles to town in
  the afternoon (Finn the fisher-kid any weekday; Bram the handyman and Liora
  the musician on Tue/Thu) — stallkeepers stay at the market so it keeps
  trading. The default `daySchedule` branch gets a town variant (work the
  morning → `"town"` 15:00 → `"socializing"` 18:00 → home); `placeFor` gets a
  `case "town"` → new `townSpot(idx)` (spreads visitors along the promenade,
  keyed by roster index so they don't stack). `entities/npc.ts` needs no change
  — its `poseFor`/`idleFacing` fall through to idle/face-south for the new state,
  and `buildRoute` already straight-lines them there.
- **First-arrival hint — `src/main.ts`:** in the region-entry seam (beside the
  existing `fireQuest({kind:"reach"})`), the first time `regionAt` returns
  `"town"` fires a one-time Memory Book entry (`first_town`, via `addMemory`) +
  a guiding toast ("The road opens onto a coastal town — an inn, merchants, and
  the sea beyond"). The `reach:"town"` quest event now also fires for free
  (regionAt returns the new region), and the minimap already shows the town
  (part 1), so the player has three ways to find it.
- **Verified (live headless-Edge, `scratchpad/v2-block3/L1-L2`):** on a Tuesday
  16:00, **Finn, Bram and Liora** are all in the town band (y ≥ 31·T), spread
  along the street (screenshot shows them milling between the inn and the
  merchant stalls). Stepping from the market into the town region fired the
  exact arrival toast. A save + full page **reload + resume** kept Fame (42)
  and coins (321) — save/reload in town works. `npm run build` green.
- **Follow-ups:** town visitors just stand/mingle (no town-specific idle pose or
  a seafront busk spot for Liora) — a future life-polish pass. Only 3 of 10
  NPCs visit; widening the roster (and a town-square social ring like the
  market's) is easy content once more town anchors exist.

## economy — the town's specialised merchants (v2 BLOCK #3, part 2)
- **Date:** 2026-07-11 (v1-foundation)
- **What & why:** the coastal town's shops now trade. VISION §town wants
  "multiple specialised merchants from the start (fish buyer, tool smith, seed
  seller) — not one generic shop", and ROADMAP_TO_V5 §v2 wants Reputation's band
  to shape merchant pricing. Three working merchants + a stubbed tailor, each a
  distinct banked stall sprite already placed in part 1.
- **The three merchants + tailor:**
  - **General Store** (`stall-general-01`): SELLS tools + seeds. New
    `MERCHANT_STOCK` in `src/systems/shop.ts` — the same tools/seeds as the farm
    stall but the seed packets carry **no season gate** (a fuller year-round
    shelf = "better stock than the farm-market stall"). Reputation gives a
    purchase discount on top of Haggling (VISION "the better known you are, the
    better your opening prices").
  - **Fishmonger** (`stall-fish-02`): BUYS the `fishing` category at a
    reputation-scaled **premium** (the same 1.15→1.45 band customers pay).
  - **Greengrocer** (`stall-produce-02`): BUYS a new `produce` category —
    crops + wild forage + cut flowers — at the same reputation premium.
  - **Tailor** (`stall-empty-01`): a "wardrobe fittings coming soon" counter
    (opens no window). Wardrobe buy/swap is v1-vs-v2 ambiguous in the docs — an
    OPEN OWNER QUESTION, logged in the handoff.
- **Pricing plumbing:**
  - `src/systems/reputation.ts` — new `reputationBuyDiscount(fame)` (0 →
    `REP_BUY_DISCOUNT_MAX` at fame 100), parallel to `reputationPremium`.
  - `src/systems/shop.ts` — `discountedPrice()` + `tryBuy()` take an optional
    `extraDiscount` so the shown price and the charged price stay identical when
    the general store's reputation discount stacks on Haggling.
  - `src/systems/sellCategories.ts` — new `produce` `SellCategory`
    (`applies: () => true`, so crops/forage/flowers stay freely sellable at the
    player's OWN stall exactly as before — no regression; the category exists so
    `categoryItemIds("produce")` feeds the greengrocer).
  - `src/ui/shopwindow.ts` — the `SellMode` union gains a `priceMult` on the
    `npc` (buying-stall) mode and a new `merchant` (selling-shop) mode
    (`openMerchantBuyWindow`). The sell rows pay `GOOD_PRICES × priceMult` via
    `economy.sellGoodAt`; the buy rows use the merchant's own stock + discount.
    The static `Sell`/`Buy` headings hide per mode.
- **Wiring:** `src/systems/interact.ts` — one `Interactable` per town merchant
  (counter hit/reach → `c.openTownMerchant(kind)`), the inn (a Look prop hinting
  at lodging to come), and the NPC homes (Look props). New `InteractCtx`
  callback `openTownMerchant`. `src/main.ts` — `openTownMerchant(kind)` gates on
  daytime hours (`TOWN_SHOP_OPEN_HOUR`/`CLOSE_HOUR`), opens the right window with
  the live reputation premium/discount, sets the merchant rect as
  `openStallRect` so walking away closes it; `onMerchantSale()` nudges Fame
  (`REP_GAIN_SALE`) + a one-time Memory note; the existing `logSale` seam already
  fires guidance/quests. New config knobs `REP_BUY_DISCOUNT_MAX`,
  `TOWN_SHOP_OPEN_HOUR`, `TOWN_SHOP_CLOSE_HOUR`. Dev bridge
  `__wh.openTownMerchantDev(kind)`.
- **Verified (live headless-Edge, `scratchpad/v2-block3/m1-m5`):** fishmonger
  pays **30 → 40 coins** for 10 fish as Fame goes 0 → 90 (premium band);
  greengrocer buys corn (7) + berries (3) (produce category live); general
  store discounts the hoe **12 → 11** at high Fame and lists seeds year-round
  ("better stock"); tailor opens **no window** (coming-soon toast); a real
  fishmonger sale moved coins **500 → 540** and Fame **90 → 91.5** (the sale
  awards reputation). Save toast fired. `npm run build` green.
- **Follow-ups:** the tailor/wardrobe is an OPEN OWNER QUESTION (v1 or v2?).
  Merchants keep no shopkeeper NPC (they're always open in daytime) — a future
  pass could staff them (needs new NPC sprites → a generation follow-up). The
  fishmonger/greengrocer are the first non-Maren `openNpcStallWindow` users, so
  the sell-only window is now exercised by three stalls.

## world — the coastal town region (v2 BLOCK #3, part 1: the region)
- **Date:** 2026-07-11 (v1-foundation)
- **What & why:** v2's dependency spine (`Customers → Reputation → Town region
  → merchants → fast travel`) gates everything left on the town EXISTING. This
  block builds the region itself. The map now extends SOUTH (`MH` 30→46 in
  `src/config.ts`; `WORLD_H` 960→1472px, both canvas axes still < 4096) to add
  a coastal town below the market square: a cobbled town street, an inn, NPC
  homes, three specialised merchant fronts, a seafront + town dock. The market
  square (v1's commerce hub) is untouched and disjoint above it.
- **Layout — `src/world/zones.ts`:** new `Region` member `"town"`;
  `regionAt()` returns `"town"` for the whole new southern band (`y >= 31*T`).
  New exports: `TOWN_STREET` (cobble plaza rect), `TOWN_SEA` (coastal water
  along the south edge, added to `inWater()`), `TOWN_DOCK` (walkable decking,
  `onTownDock()` + excluded from `inWater`), `TOWN_SQUARE` (NPC gather coord),
  `INN` (largest building rect), `TOWN_HOMES` (`TownHomeDef[]` — cottage
  variants **1 & 5**, the only two the market doesn't use, + three seed-distinct
  code-painter cottages, so no two town buildings look alike — the owner's hard
  rule), and `TOWN_MERCHANTS` (`MerchantDef[]` — general store / fishmonger /
  greengrocer / tailor, each a DISTINCT banked **spare** stall sprite so none
  duplicates a market stall). A new `ROAD_SEGMENTS` strip drops the road south
  out of the market into town. `STRUCTURES` gains the inn/homes/merchant
  counters (3/4-view collision); `WORLD_PROPS` gains a curated sparse town set
  (entry signpost, dock-mouth + street lanterns, two seafront benches, a cart,
  crate and barrel), all clear of building fronts / the dock / counters.
- **Art:** `src/art/buildings.ts` — new `drawInn()` (a code-drawn two-storey
  timber-framed hall with warm-lit windows, a broad gable roof, chimney and a
  hanging "INN" sign; always renders, always distinct — a dedicated PixelLab
  inn sprite is a logged follow-up). `drawStall()` gains an optional `themeId`
  param so a town merchant can point at a distinct spare-stall sprite (anchor
  measured off the alpha bbox, like cottages 6/8). `src/art/props.ts`
  `drawDock()` gains an optional rect param so the same painter draws the town
  dock. `src/main.ts` draws the inn/homes/merchants depth-sorted (ents band by
  `zones.ts`) and the town dock at ground level.
- **Ground — `src/world/ground.ts`:** the tiled path cobbles the town street
  (plaza tile set, alongside the market) and paints `TOWN_SEA` as water
  (deep/shallow ring + a beach-reading mud/sand shore dither); the painterly
  zero-PNG fallback gets a matching `paintTownGround()` + `TOWN_SEA` in
  `paintWater()`. Ambient floral/weed scatter skips the town cobble (`onPlaza`
  extended) and the sea/dock are rejection-zoned, matching the market.
- **Minimap — `src/ui/minimap.ts`:** paints the town street apron, the sea, the
  town dock, and the inn/homes/merchant blocks, so the region shows on the map.
- **Exhaustiveness:** adding `"town"` to `Region` forced a `case "town"` in
  `entities/wildlife.ts regionSample()` (samples the town band; no species
  lists `"town"` yet, so behaviour is unchanged — pure compiler safety).
- **Verified:** `npm run build` green. Live headless-Edge play (fisher path,
  teleport walk of the whole town): road spur reads as a clean market→town
  connection; the street is coherent cobble with varied buildings + props; no
  two buildings alike (INN, thatch/timber cottages, a code-painter cottage,
  three distinct merchant stalls); the seafront + beach + walkable town dock
  read as a coast; the minimap shows the town. Screenshots in
  `scratchpad/v2-block3/01-07`. `drawInn` renders as pure code in-scene,
  directly proving the zero-PNG building path; the sea/cobble painterly
  fallbacks reuse the market's proven zero-PNG pattern.
- **Follow-ups:** merchants are decorative in this commit (trade wiring is
  BLOCK #3 part 2). WANTED SPRITES (follow-up generation list): a dedicated
  **inn** sprite, and optionally town-specific **home** sprites so the
  code-painter cottages can become sprites (only 2 unused cottage variants
  existed). The beach shore is the water-dither's mud/sand ring (sand-dominant
  beach tiles would be a nicer touch — a tuning/gen follow-up).

## ui — the remaining 8 NPC dialogue portraits wired in
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** the generation agent delivered the 8 missing NPC bust
  portraits (liora, sera, henrik, petra, ada, jonas, finn, bram — 160 gens,
  verified against their sprites); drop them into the data-driven portrait
  slot R8 built.
- **Done:** copied the 8 PNGs into `src/assets/pixellab/ui/portraits/`
  (joining maren + tobin — all 10 NPCs now show a bust in the dialogue
  window's notch; R8's map auto-wires by filename, zero code change).
- **Build:** `npm run build` green. Dual-path intact (a missing portrait
  simply reflows the dialogue full-width).
- **Follow-ups:** none.

## systems — town-wide Reputation / Fame (v2 economy block #2)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** v2 BLOCK #2 per `ROADMAP_TO_V5.md` §v2 ("`systems/reputation.ts`
  — town-wide Fame, independent of any one NPC and of Haggling") and the DAY 2
  handoff spine `Customers → Reputation → Town`. Doc-verified before building:
  VISION §Economy ("Town-wide Fame/Reputation … borrowed from UO's fame/karma:
  a single town-facing number that shifts general treatment … distinct from
  Haggling and from any one friendship — all three can move independently") and
  the block #1 seams it explicitly left waiting (flat 1.3× premium, spawn/cap
  knobs, the deliberately-deferred ignored-customer penalty).
- **What shipped (player-facing):** a single town-wide **Fame** score, 0-100,
  shown in the Skills window header as `🏛️ <tier> · NN/100` across five warm
  tiers (**Unknown → Familiar Face → Well-Liked → Respected → Beloved**). It
  **rises** when she serves a customer (+1.5), completes a quest (+4), turns up
  at a festival (+3, once/day), or gives a warmly-received gift (loved/liked,
  +0.5); crossing a tier fires a warm toast + a Memory Book entry. It **falls**
  gently when a customer is left to give up waiting (−1 — the ignored-customer
  penalty block #1 deferred; smaller than a sale's gain so engaging always nets
  positive), and drifts down after 5 idle days — but **floored at the current
  tier's min, so neglect never demotes a tier she earned** (mirrors the shipped
  skills/relationships neglect-decay). Fame then **modulates the customer
  economy**, live: the price premium is now a **band 1.15×→1.45×** (replacing the
  flat 1.3×), the daily customer cap grows **6→10**, and the per-attempt spawn
  odds gain up to **+0.25**. With the AI dialogue feature on, Fame also colours
  villager dialogue (a fallback-safe prompt line; off = byte-identical).
- **New file:** `src/systems/reputation.ts` — the pure rules half (versioned,
  tolerant, private-mode-safe store matching relationships.ts / customers.ts):
  `Reputation {version, fame, lastGainDay}`; the `REP_TIERS` ladder +
  `reputationTier()`; effect readers `reputationPremium/reputationDailyCap/
  reputationSpawnBonus(fame)`; writers `gainReputation()` (returns the applied
  delta + any tier newly crossed up), `penalizeReputation()` (gentle, floored at
  0), `decayReputation()` (idle, tier-floored); `load/save/resetReputation`.
- **Config (`src/config.ts`):** a REPUTATION knob block — `REP_GAIN_SALE 1.5`,
  `REP_GAIN_QUEST 4`, `REP_GAIN_FESTIVAL 3`, `REP_GAIN_GIFT 0.5`,
  `REP_LOSS_TIMEOUT 1`, `REP_DECAY_IDLE_DAYS 5`, `REP_DECAY_PER_DAY 0.5`,
  `REP_PREMIUM_MIN 1.15` / `REP_PREMIUM_MAX 1.45`, `REP_DAILY_CAP_BONUS_MAX 4`,
  `REP_SPAWN_CHANCE_BONUS_MAX 0.25`; new `REPUTATION_KEY` save key.
- **Wired (not just tracked):**
  - `systems/customers.ts` — `rollCustomerWant(def, inv, premium?)` and
    `customersRemain(ledger, cap?)` now take the live Fame-scaled premium/cap
    (defaulting to the flat block-#1 knobs, so the pure module still stands
    alone). `priceFor(itemId, premium)`.
  - `main.ts` — `const reputation = loadReputation()`; `awardReputation(amount)`
    helper (gain + tier-cross toast/memory) fired at the serve seam, in
    `grantQuestReward` (every completed quest), at the festival market-entry
    greeting, and in `giveGiftFlow` (loved/liked only). `penalizeReputation` at
    the customer-timeout cull; `reputationPremium` passed into `trySpawnCustomer`;
    `reputationDailyCap`/`reputationSpawnBonus` into `customerLiveMinute`;
    `decayReputation` on day rollover; `resetReputation` on New Game.
  - `systems/saves.ts` — `REPUTATION_KEY` folded into `GAME_KEYS` (New Game wipes it).
  - `systems/worldContext.ts` — optional `reputation` source → a
    `{fame, tier}` slice on the snapshot.
  - `systems/ai/features/dialogueVariation.ts` — the prompt gains a Fame line
    ("Around town the player is <tier> …") when present + non-Unknown, and the
    variation bucket keys on the tier; both no-ops with AI dialogue off.
  - `ui/skills.ts` + `index.html` — `#skillsRep` line in the Skills panel,
    `updateReputationUI(fame, tier)` (writes only when the window is open).
- **Verified (fable-mode):** `npm run build` green. A node/esbuild logic harness
  (`scratchpad/v2-block2/rep.test.ts`) — **32/32** assertions: tier boundaries,
  premium/cap/spawn bands at 0/50/100, gain + tier-crossing report, penalty
  gentleness (< a sale's gain) + 0-floor, idle decay respecting the grace window
  AND flooring at the tier min (never demoting), save/load round-trip, New Game
  wipe. Live headless-Edge/puppeteer (`scratchpad/driver/drive-b2.mjs` +
  `quest-rep.mjs`): fresh game = Unknown/0; premium band read 1.15→1.405 (fame 0
  vs 85); serving climbs fame +1.5/sale with the served count; a customer
  timeout drops it gently; a real quest (`petra_bread_run`: accept → give 3
  wheat → turn in) bumps fame exactly +4; fame 52 survives a reload; New Game
  wipes to Unknown/0. Screenshots in `scratchpad/v2-block2/`:
  `01-fame0-customers.png` (Jonas buys corn at 6/unit = base 5 × 1.15) and
  `02-fame85-skills-and-customer.png` (Skills header "🏛️ BELOVED · 85/100", the
  tier-crossing toast, Maren buying berry compote at the higher premium). Zero
  console errors bar a benign 404. Zero-PNG boot unaffected — no sprite/asset
  code was touched.
- **Follow-ups:** (1) which NPCs come could gate on Fame (higher rep → pickier/
  premium roles) — deliberately left out to keep the early game welcoming;
  logged, not built. (2) An AI-accepted quest instance still pays the authored
  template's reward (block #1 note, unchanged). (3) The timeout penalty is per
  timed-out customer, so a burst that all give up at once compounds (correct, but
  worth a glance if it ever feels harsh). (4) Fame is not yet shown on the HUD
  proper (only the Skills window) — a small dock/pill could come with the town
  buildout. (5) `AI_ARCHITECTURE.md` does not yet list reputation in prompt
  context; the dialogue hook was added anyway (fallback-safe) — worth a doc line
  in a future R9-style sync.

## ui — Project Docs, a developer/archive reading room on the main menu
- **Date:** 2026-07-11 (v1-foundation)
- **Block given (owner request):** a developer screen, opened from the MAIN
  MENU, that displays EVERY doc/log in the project in a comfortable reading
  mode — so she can audit her own planning and verify nothing was missed. A
  first-class reading feature, invest in comfort.
- **What shipped (player/owner-facing):** a new **"Project Docs"** button on the
  main menu (`ui/mainmenu.ts`, between Credits and Exit) opens a near-fullscreen
  reading room. Left: a sidebar of every markdown doc, grouped **Design docs /
  Roadmaps / Logs / Runs / Rules** with human titles (the doc's first `#`
  heading, falling back to the humanized filename) + the filename underneath.
  Centre: a **parchment reading pane** (warm paper, dark ink, ~74ch measure,
  smooth scroll) rendering the doc. Right: a **per-doc table of contents** built
  from the doc's `##`/`###` headings, each clickable to scroll to that section.
  Top: a **cross-doc search box** — case-insensitive, searches ALL docs at once,
  groups snippet hits by doc with a match count, and each hit opens the doc
  scrolled to and **highlights the match** (`<mark>`). Remembers the last-opened
  doc for the session. Esc / Back returns to the main menu.
- **Content is auto-globbed, zero code change for future docs:**
  `import.meta.glob(["../../docs/*.md","../../runs/*.md","../../CLAUDE.md"],
  {query:"?raw", import:"default"})` in `ui/docsscreen.ts` — **lazy** importers,
  so each doc is emitted as its own hashed chunk fetched only when read/searched
  (the game entry bundle does NOT carry doc text). Titles/search are populated by
  a background `loadAll()` that awaits every importer once and caches the strings
  for the tab's lifetime. Dropping a new `.md` under `docs/`, `runs/`, or a new
  `CLAUDE.md` makes it appear automatically.
- **New files:**
  - `src/ui/mdrender.ts` — a small, dependency-free Markdown → **DOM** renderer
    (`renderMarkdown(src)` returns `{node, headings}`). No `innerHTML` of doc
    text: every piece of content is a real text node, so `<tags>` inside a doc
    render literally and can't inject markup. Supports ATX headings,
    bold/italic/inline-code, links (rendered as text + the URL in muted parens,
    deliberately **non-navigating**), nested bullet/numbered lists (incl. "loose"
    blank-line-separated lists that keep counting 1,2,3), GitHub task checkboxes
    `[x]`/`[ ]` → ✅/⬜, pipe tables, fenced code blocks, blockquotes, and HRs.
    Inline formatter is boundary-aware so `snake_case` / `src/**/*.png` in prose
    don't false-trigger emphasis.
  - `src/ui/docsscreen.ts` — the screen: glob + classify/group, lazy loading +
    caches, sidebar, parchment reader, TOC, cross-doc search + live highlight,
    Esc/back teardown.
- **Changed:** `src/ui/mainmenu.ts` (import + button + column order);
  `index.html` (a new CSS block: `.docs-panel`/sidebar/parchment reader/TOC/
  search/results + the full `.md-*` markdown element styles). Body text uses the
  readable sans stack; only display headings pick up `--font-title`
  (WildhearthStorybook) — reading comfort wins.
- **Robustness:** pure dev/meta content — touches no gameplay, saves, or the
  zero-PNG boot. It reads files, writes nothing. The reader is its own light
  parchment surface by design (independent of the dark game chrome).
- **Verified (headless Edge / puppeteer, screenshots viewed):** main menu shows
  the button; reader open on DECISIONS (grouped sidebar + TOC); WORKLOG.md
  (6067 lines) renders in **~294 ms / 7034 nodes** on select and scrolls
  smoothly mid-doc (one-time cost, no ongoing jank); a "festival" search →
  **110 matches in 11 docs**, grouped with snippets; clicking a hit opens
  FABLE_PROMPT scrolled to a highlighted "Festival"; ROADMAP_EXPANSION shows
  **66 checkboxes + a bordered/zebra table** rendering correctly; loose
  numbered list now a single `<ol>` (1,2,3). `npm run build` green. The only
  console 404 is `/favicon.ico` (pre-existing, the game ships no favicon).
- **Bundle impact:** doc text is entirely **lazy chunks** (e.g. `WORKLOG-*.js`
  423 KB, `ROADMAP_EXPANSION` 62 KB, `PIXELLAB_ASSETS` 56 KB, … 20 chunks),
  fetched on demand — NOT in the entry. The entry chunk grew only by the
  screen+renderer code (`index-*.js` 567.2 KB, ~+8 KB vs. before). Requirement
  "keep the bundle lean" met.
- **Follow-ups:** rendering handles this repo's docs well; nested tables and
  reference-style links `[a][b]` are not supported (no doc uses them). Search
  snippets show the raw source line (so a hit inside `**bold**` shows the `**`)
  — intentional, it's honest context; the in-doc highlight after clicking is
  clean. Very long docs render eagerly on select (measured fine at 6k lines); if
  a doc ever dwarfs WORKLOG, virtualize the reader.

## economy — customers come to your stall (v2 economy block #1)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** advance toward v5 one block at a time; take v2's FIRST
  unbuilt block in the roadmap's value/dependency order. Verified against
  `docs/ROADMAP_TO_V5.md` §v2: the "real sell menu / own-stall selling" the
  brief guessed at is **already built** (v1 — `ui/shopwindow.ts` is a full
  window with stepper/total/sell-all/category-aware/NPC-stall modes). The
  genuinely-first unbuilt v2 block, per the v2 economy delta + the global
  dependency spine (`Schedules → Customers → Reputation → Town`), is
  **`systems/customers.ts` — "NPCs walk to your stall with want-table-driven
  demand"** (customers.ts + reputation.ts both confirmed absent). This also
  IS the "deepened own-stall selling" the brief described. **Reputation is
  the NEXT block (#2) and deliberately NOT built here.**
- **What shipped (player-facing):** while she minds her own market stall
  during market hours (08–18), townsfolk who are out in the plaza walk up to
  her counter wanting to buy something she's holding, and pay a **premium**
  over the flat stall price (1.3×). A "Customers at your stall" section at the
  top of her stall window lists each waiter (name + "wants N <item>" + premium
  total + a Sell button); serving one grants the coins, fires the same sell
  seam a flat sale does (guidance/quests/day-log/story-arcs), nudges that NPC's
  Friendship (+1, repeatable), logs a "first customer" memory, and sends them
  on their way. A bobbing 🛒 bubble marks anyone heading to / waiting at the
  stall. Customers give up after ~90 in-game min unserved (no penalty — that's
  the reputation block). A per-day served cap (6) keeps the poverty pacing.
- **New file:** `src/systems/customers.ts` — the pure RULES half: `GoodCategory`
  membership derived from the data tables (fish/crop/forage/dish/flower, junk
  excluded), a `CUSTOMER_WANTS: Record<Role, GoodCategory[]>` want-table (baker
  wants ingredients + a posy, herbalist wild finds, peddler anything, etc.),
  `rollCustomerWant(def, inv)` (picks a preferred category she has stock in →
  a held item → qty capped by stock & knob → premium `unitPrice`/`total`), and
  a persisted daily ledger (`CustomerLedger {day,served}` + load/save/reset/
  `rolloverDay`/`customersRemain`/`noteServed`).
- **Entity (`src/entities/npc.ts`):** new `CustomerVisit {spot,want,arrived,
  patience}` + `Npc.visit`; the update loop gained a visit override (walk to
  the counter spot, then hold facing it) mirroring the existing talkTimer
  override; `sendCustomer` / `customerWaiting` / `clearVisit` (clearVisit
  routes them back to their live schedule so they don't freeze at the counter).
  `initNpcPositions` clears visits on (re)snap.
- **UI (`src/ui/shopwindow.ts` + `index.html`):** player-mode render now draws
  the customers section (fed by an injected `customers: () => CustomerRow[]`
  provider + `onServe` callback — the window stays pure UI); new
  `refreshShopWindow()` repaints when a customer arrives/leaves while the
  window is open; new `CustomerRow` export + `#shopCustomers` container +
  warm-tinted `.shop-row` styling. **Also fixed a pre-existing window-sizing
  bug the customers section surfaced:** the scale-window measures its content
  height once at init while the shop's sell/buy lists are still EMPTY (the
  backpack, which has content at init, sizes fine), so on a fresh profile the
  trade window opened collapsed to a ~27px body that clipped everything. Fix,
  contained to the shop window: the three lists (`#shopCustomers/#shopSell/
  #shopBuy`) now scroll within bounded max-heights (matching `scalewindow.ts`'s
  own documented "vertical size = how much scroll region shows" model), and a
  new `fitHeight()` sizes the window to its content on open / on customer
  refresh. Verified the window now opens correctly filled.
- **Wiring (`src/main.ts`):** extracted the sell seam into a named `logSale()`
  reused by both the flat-stall Sell button and customer sales; `nearStall()`,
  `customerSpot(slot)`, `customerRows()`, `serveCustomer(npcId)` (clamps qty to
  live stock; premium sale via new `economy.sellGoodAt`), `trySpawnCustomer`
  (eligible = plaza-dweller in atMarket/socializing, not indoors/talking/already
  a customer, x>44T), `customerLiveMinute()` (patience cull + gated spawn:
  market hours + tending + daily cap + concurrent cap 2 + cadence 25 min +
  60% chance) wired into `liveMinute()`; `rolloverDay` into the new-day hook;
  `clearAllCustomers()` on sleep/nap/collapse; `resetCustomers` + visit clear
  in New Game; a `drawCustomerBubble` overlay; `__wh` dev hooks (`forceCustomer`
  /`arriveCustomers`/`customers`/`serveCustomerDev`/`customerLedger`).
- **Economy (`src/systems/economy.ts`):** `sellGoodAt(e,id,qty,unitPrice)` —
  sells an exact qty at a caller-supplied (premium) price; used by customer
  sales. Flat `sellGood` unchanged.
- **Persistence:** new `CUSTOMERS_KEY` (`config.ts`) folded into `saves.ts`
  GAME_KEYS (New Game clears it); old saves without the key start fresh
  (`loadCustomers` → zeroed). Save-compatible: no existing store's schema
  changed.
- **Config knobs (`src/config.ts`):** `CUSTOMER_MARKET_START/END`,
  `CUSTOMER_DAILY_CAP`, `CUSTOMER_MAX_CONCURRENT`, `CUSTOMER_PREMIUM`,
  `CUSTOMER_QTY_MAX`, `CUSTOMER_SPAWN_GAP_MIN`, `CUSTOMER_SPAWN_CHANCE`,
  `CUSTOMER_PATIENCE_MIN`, `CUSTOMER_TEND_TILES`, `CUSTOMER_FRIENDSHIP_BUMP`.
- **Verified:** `npm run build` green (tsc strict + vite). Live headless-Edge
  (puppeteer-core + the `__wh` bridge, driver in the run scratchpad, NOT
  committed): fresh fisher life → stocked a fish/flower/dish/crop/forage →
  minded the stall at 12:00 → customers spawned (BOTH dev-forced and organically
  via the live minute loop) with role-correct wants (Liora/Ada→flower[tulip],
  Bram/Jonas→crop[corn], Maren→dish) at premium prices (corn 5→7, dish 6→8);
  serving granted coins (50→74→96 across sales), decremented the exact stock
  (tulip 4→1), fired the sell seam (day-log coinsEarned/itemsSold), bumped
  Friendship +1, logged the memory, showed the toast + 🛒 bubbles; the ledger's
  served count persisted (4) across a reload. Screenshots (filled window + after
  serving) in the run scratchpad `v2-block1/`. Zero-PNG boot unaffected (no
  sprite/asset-loading code touched).
- **Follow-ups:** (1) Reputation/Fame (v2 block #2) — will shift customer
  prices + who shows up + add a soft penalty for ignored customers. (2)
  `forceCustomer` dev-spawn bypasses the concurrent cap by design (test hook);
  the real `customerLiveMinute` path honors it. (3) The premium is a flat 1.3×
  for now; block #2's reputation is the intended modulator. (4) Customer visits
  are runtime-only (not persisted mid-visit) — a reload mid-market clears the
  queue, which is fine (they'd re-approach), but worth noting.

## docs — overnight run sync: mediums final, quest system, variety counts (R9)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R9, the last item in the overnight-run repo queue (see
  `runs/handoff-2026-07-11.md`) — bring every design doc in line with what
  R1-R8 shipped: the character-medium re-reversal (rig → curated PixelLab
  sprite matrix), the ground-medium flip (painterly → `tiles_pro`
  segmentation tiles), the quest system going from speced to built, the
  variety-count push (fish 50/forage 26/recipes 21/crops 20/flowers 20),
  skill neglect-decay, barn storage, and the UI re-skin. Docs only, no
  source changes.
- **`docs/DECISIONS.md`:** annotated the session-3 "Art medium division"
  entry as superseded (kept in full for its reasoning, not deleted); added
  three new sections — "Art medium division — FINAL FLIP" (D-1: characters
  = curated PixelLab sprite matrix, 2 genders × 5 hair × 5 outfits at MEDIUM
  size, keyed-purple hair runtime-recoloured to 3 shades, rig = fallback),
  "Ground medium" (D-2: `tiles_pro` segmentation tiles, Wang `topdown_tileset`
  rejected, terrain edges dithered in code), and "Everything-one-pixel-medium
  rule" (D-3: audit remaining smooth visuals, restyle to chunky pixel code).
- **`CLAUDE.md`:** hard rule #1's MEDIUM DIVISION clause rewritten to the
  FINAL state — characters = sprite matrix (rig = zero-PNG fallback only),
  environment = sprites (unchanged), ground = PixelLab tiles (painterly
  painter = fallback).
- **`docs/HANDOFF.md`:** new top "SESSION 4 (2026-07-11)" section — the
  re-flip + probe-chain one-liners, the full commit list (R1-R8, ~30
  commits), PixelLab spend (~520 gens, balance ~8,063), and the next-day
  queue (8 NPC portraits, S/L body sizes, lightness-aware skin recolour,
  a font-legibility check, the still-unreported puppeteer QA recon).
- **`docs/GAME_OVERVIEW.md`:** Quests section rewritten 🟡→🟢 (the quest
  engine/log/dialogue-offers/AI-offers now built, v1's one large gap
  closed); Skills section notes neglect decay as built; Collections section
  rewritten with the pushed variety counts (fish 12→50, forage 11→26,
  flowers 0→20 new gardening system, recipes/crops mentioned in-line);
  Housing & Building notes the barn storage chest + night shelter; Menus
  section notes the UI re-skin (wood/gold kit, storybook font, portraits,
  quest badge); the Art-direction section and the Character-creation
  section both rewritten for the FINAL medium (characters = sprite matrix,
  ground = tiles) — also corrected a pre-existing drift found while editing
  this section: crops/trees are already sprite-sourced in the actual repo
  (`src/assets/pixellab/{crops,trees}/`) even though this doc still called
  them "not yet run" from an older session.
- **`docs/ROADMAP_TO_V5.md`:** flagged the "Current build state (mid-v1)"
  section as a stale session-1 snapshot (many claimed-unbuilt systems have
  long since shipped) with a pointer to `GAME_OVERVIEW.md` for current
  truth, while still refreshing its variety numbers in place; the v1
  section's Quests and skill-decay bullets marked BUILT; the "Art / visual
  layer" bullet and the "Segmented rig scope creep" risk both rewritten for
  the session-4 FINAL flip; the v4/v5 Art bullets' "characters = rig"
  wording updated to "characters = sprite matrix"; the arc-at-a-glance
  table's Art row updated to name all three mediums.
- **`docs/VISION.md`:** the "Medium division" paragraph under Art direction
  rewritten (light touch, one paragraph) for the FINAL flip.
- **`docs/PIXELLAB_ASSETS.md`:** §1's table — the heroine/NPC rows replaced
  with the matrix + new ground-tiles and UI-kit rows (the deleted
  `heroine*.sheet.*` row removed since those files no longer exist); a new
  "Wave 7" entry in §2 with the char-matrix/ground-tile/UI-kit generation
  recipes (the keyed-purple-hair convention, 4-dir-only cardinal matrix
  rotations, the Wang-tileset rejection, which UI panels shipped vs. not);
  §3's folder tree updated with `matrix/`, `ground/`, `ui/`, and the fonts
  note; a new "Recolouring the matrix hair" section (the old "Recolouring
  the heroine" section kept, marked SUPERSEDED, since its hue/lightness/
  y-window technique is the direct ancestor of the matrix's simpler keyed
  approach); §4's "add a hairstyle" recipe split into the superseded
  heroine path and the live matrix path; §5's cost ledger gained a "Wave 7"
  paragraph (~520 gens, Tier 3, balance ~8,063).
- **`runs/handoff-2026-07-11.md`:** appended a "RUN COMPLETE" section — R9
  marked done, what this entry touched, the contradictions found (crops/
  trees drift above; the stale session-1 build-state snapshot; the named
  `char-medium-code-rig.md` file doesn't exist — it meant the DECISIONS.md
  section) and how each was reconciled, plus a reminder that the puppeteer
  agent's temp files are still untouched in the working tree.
- **Verified:** `npm run build` green after the full edit batch (docs-only
  changes; confirms nothing else broke). `git status` reviewed before
  staging — only the 7 doc files + this WORKLOG + the runs/ file are
  staged; `package.json`/`package-lock.json` (modified) and
  `recon-driver.mjs`/`recon-faces.mjs` (untracked) are the puppeteer QA
  agent's leftovers and were deliberately left untouched, per standing
  orders.
- **Follow-ups:** none new — all open items are already tracked in
  `docs/HANDOFF.md`'s SESSION 4 next-day queue and `runs/handoff-2026-07-11.md`.
  The pre-existing ROADMAP_TO_V5.md "Current build state" staleness beyond
  the numbers refresh is flagged in place rather than fully rewritten
  (out of scope for a targeted docs-sync run — a full rewrite would be a
  large, unrelated change).

## quests — active-quest count badge on the dock icon (R8/B6)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R8/B6 — a small active-quest count on the quest-log dock icon.
- **`src/ui/questlog.ts`:** `initQuestLog` appends a `.tool-badge` span to
  `#questBtn`; new `syncBadge()` sets it to `activeQuests(log).length` and hides
  it at zero. Called on init and from `updateQuestLog()` (which is wired to
  `onQuestsChanged`), so it stays live even while the quest window is closed.
- **`index.html`:** `.tool-badge` chrome (red pill, top-right of the icon,
  matching the What's-New menu badge) + `#questBtn{position:relative}`.
- **Verified:** headless Edge — accepted Maren's "Tavern Night" via dialogue; the
  quest icon then shows a red "1" badge. It sits in the icon corner without
  fighting the dock layout. `npm run build` green.

## world — pixel water glints + field-furrow / plaza-cobble ground niggles (R8/B5, B4)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R8/B5 — restyle the water shimmer from smooth white ellipses
  to chunky pixel glints. R8/B4 — furrow tiles read patchwork (make plain
  furrows dominant), and flower/grass scatter shouldn't sit on the plaza cobble.
- **B5 `src/art/props.ts`:** new `pixelGlint()` draws a short run of 2px blocks
  snapped to a 2px grid with the ends dropped one block + a brighter one-block
  core — a stepped pixel crest that sits on the tiled water. `drawWaterShimmer`
  (pond) and `drawOpenWaterShimmer` (river/lake) now emit `pixelGlint`s instead
  of `ellipse()` fills. The fishing-spot ripple RINGS are left as-is (a
  deliberate "fishable here" affordance, not ambient shimmer).
- **B4 furrows `src/world/ground.ts`:** re-weighted `SOIL_TILLED_BAG` (the shared
  field + hoed-plot bag) from an even 7-way spread to plain-furrow-dominant —
  `[[0,8],[1,8],[2,8],[8,2],[3,1],[15,1]]`: tiles 0/1/2 are clean vertical
  furrows (~86%), the sprout (8/15) + wet-clumpy (3) feature tiles a sparse
  minority, so the field reads as evenly tilled soil rather than a patchwork.
- **B4 plaza scatter `src/world/ground.ts` + `src/art/scatter.ts`:** both
  ambient layers now skip the market plaza cobble rect. In `scatterAmbientProps`
  a new `onPlaza()` rejects weed tufts / clover / wildflowers / thistle /
  wildflower clumps on the cobble (stones/pebbles/leaves still land); the
  wildflower-clump loop dropped its now-obsolete market bias. In the live
  foliage scatter (`pickKind`) an `onPlaza()` gate drops flowers/ferns on the
  cobble and reduces grass to a rare in-crack sprig. Grassy plaza fringes keep
  their foliage.
- **Verified:** headless Edge, zoomed — the field reads as clean furrows with a
  sparse sprout/wet minority; the pond/river show chunky pixel glints; the
  market cobble is clear of flowers with only a few sprigs left. `npm run build`
  green.

## assets — delete the legacy heroine sprite sheets, replaced by the matrix (R8/B2)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R1's curated matrix (`characters/matrix/*`) became the shipped
  player look; the five old `characters/heroine*.sheet.{png,json}` pairs (~968KB)
  were left behind unused. Delete them.
- **Verified nothing imports them FIRST:** `spriteChar.ts` resolves only
  `characters/matrix/matrix-<gender>-<hair>-<outfit>` sheet ids; a repo-wide grep
  for the string `"…heroine…"` in `.ts` found ZERO code references (only doc
  comments / examples). The code-drawn rig fallback (`drawFarmer`) is independent
  of any PNG sheet, so it is unaffected.
- **Deleted:** `heroine.sheet.*`, `heroine-bun.sheet.*`, `heroine-cropped.sheet.*`,
  `heroine-ponytail.sheet.*`, `heroine-short.sheet.*` (10 files, 968KB). The glob
  manifest picks up the remaining sheets automatically (no code change needed);
  freshened the two stale `manifest.ts` example comments from `characters/heroine`
  to `characters/maren` / the matrix id.
- **Verified:** `npm run build` green (no heroine refs, smaller bundle — the four
  big heroine atlases no longer emitted); headless Edge — the matrix player
  preview in Character Creation still renders (rust dress + long hair), so both
  the sprite path and the rig fallback are intact.

## saves — fold STORAGE_KEY into GAME_KEYS so New Game wipes the barn (R8/B3)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R5's barn-storage `STORAGE_KEY` was missing from
  `saves.ts` GAME_KEYS. New Game already re-seeded storage via `resetStorage()`,
  but the raw localStorage key was never swept by the generic wipe — fold it in.
- **`src/systems/saves.ts`:** imported `STORAGE_KEY` from config and added it to
  the `GAME_KEYS` array, so the New-Game wipe loop now removes the barn-storage
  key directly (belt-and-braces alongside `resetStorage`).
- **Verified:** `npm run build` green. (`resetStorage` still runs on New Game;
  this just guarantees the persisted key is cleared even if reset paths change.)

## skills — show the earned tier per skill in the Skills window (R8/B1)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R7 exposed `skillTier(value)` (Novice/Skilled/Expert) but the
  Skills window never showed it. Surface it.
- **`src/ui/skills.ts`:** imported `skillTier`; each row now builds a `.sk-tier`
  tag (between the name and the value) set to `skillTier(s.value)` with a
  `data-tier` attribute; `refresh()` keeps both the label and `data-tier` live
  as values climb, so a skill visibly graduates Novice → Skilled → Expert.
- **`index.html`:** `.sk-tier` chrome — a small uppercase pill, colour-keyed by
  `data-tier` (Novice muted cream, Skilled green, Expert gold).
- **Verified:** headless Edge — the Skills window shows "NOVICE" tags beside
  Fishing / Foraging / Farming. `npm run build` green.

## screens — re-skin with the generated UI kit (R8, Mission A)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R8 Mission A — dress the whole UI in the PixelLab-generated
  UI kit (wood/parchment nine-slice panels + the WildhearthStorybook pixel
  font + NPC portraits in the dialogue window), strictly dual-path.
- **Assets copied into the repo:** `src/assets/pixellab/ui/window.png` (the
  ornate wood+gold frame, from the kit's `window-frame-trim`),
  `src/assets/pixellab/ui/tooltip.png` (compact parchment tooltip),
  `src/assets/pixellab/ui/portraits/maren.png` + `tobin.png` (64px busts),
  and `src/assets/fonts/WildhearthStorybook.ttf`. The kit's `button` / `tabs` /
  `dialogue` panels were evaluated and NOT shipped (see Follow-ups).
- **New `src/ui/skin.ts`** (`initSkin()`, called once at the top of boot in
  `main.ts` before the first window is built): injects the `@font-face` and
  sets `--font-title` (storybook prepended to the sans stack) UNCONDITIONALLY
  (the font is a plain source asset with a natural fallback); then, ONLY when
  `ui/window` is present in `SPRITE_MANIFEST`, publishes the panel URLs as
  `--skin-window` / `--skin-tooltip` custom props and adds the `wh-skinned`
  class to `<html>`. With zero ui PNGs nothing is added and the code-drawn CSS
  chrome stands (CLAUDE.md rule #1). Also exports `npcPortraitUrl(npcId)` →
  `ui/portraits/<id>` URL or null (data-driven — dropping a PNG in makes it
  appear).
- **`index.html`:** added a `--font-title` token (default = sans) and a gated
  R8 style block: `var(--font-title)` on all display titles / section heads /
  window title-text / menu buttons; the ornate frame as `border-image` on every
  utility/panel `.wh-window` EXCEPT the permanent chrome (viewport + clock /
  coins / needs / dock — a 22px wood border would dwarf the HUD pills and box
  the game viewport), no `fill` so interiors keep the dark readable
  `--panel-bg`; the same frame on the full-screen `.menu-panel` / `.screen-panel`
  modals (char creation, pause, exit, title-screen back screens); the parchment
  tooltip on `#prompt`; and the dialogue portrait-notch styles. `image-rendering:
  pixelated` on every scaled panel.
- **Dialogue portrait notch:** `#dialogueBox` restructured (`index.html`) into
  `#dlgPortrait` (a wood-framed 76px bust) + `#dlgMain` (line + choices);
  `src/ui/dialoguebox.ts` `setPortrait(npcId)` sets the bust from
  `npcPortraitUrl()` on open, or adds `.dlg-noportrait` (notch hidden, text
  reflows full-width) for NPCs with no portrait yet. Maren + Tobin have busts;
  the other 8 gracefully show none.
- **Verified (headless Edge / puppeteer, screenshots viewed):** main menu, char
  creation, in-game with backpack + quest log + skills open, dialogue with Maren
  (portrait present) and Sera (no portrait, full-width), settings, pause, plus a
  **zero-UI-PNG fallback boot** (ui dir removed → no frames, pure CSS chrome,
  no broken layout, game fully boots, dialogue gracefully portrait-less). Shots
  in `scratchpad/ui-kit/ingame-*.png` + `fallback-*.png`. `npm run build` green.
- **Follow-ups:**
  - The kit's `button` + `tabs` panels were dropped: the gold CSS buttons/tabs
    already read as one family with the storybook font, and the wood button
    plaque (baked "Button" center text; heavy at small sizes) looked gaudier,
    not better — honest call. Available in the kit scratchpad for a future
    dedicated pass.
  - The kit's `dialogue-panel` PNG (portrait notch baked in) was not used — the
    dialogue window already gets the generic wood frame, and a CSS notch is
    simpler/robust than nine-slicing around a baked notch.
  - The storage window shares the same `.wh-window` frame + shop-grid chrome
    (both confirmed via the shop window) but has no `__wh` dev hook to force it
    open for a dedicated screenshot; not worth adding dev-only code.
  - The other 8 NPC portraits arrive next budget day (recipe in the kit LEDGER);
    dropping `ui/portraits/<id>.png` in wires them with no code change.

## quests — D3 AI dynamic offers, promoted from the stub (R6, commit 5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R6 commit 5 — promote the debug-only AI quest STUB to real
  dynamic offers behind the AI master toggle, validated against the closed
  schema, with a scripted fallback on any failure and byte-identical behaviour
  when AI is off.
- **New `src/systems/ai/features/questOffers.ts`** (replaces `questStub.ts`,
  removed): `createQuestOffers(ai, { onOffer })`. On day rollover (≤ once per
  `QUEST_AI_OFFER_MIN_INTERVAL_DAYS`), when `ai.enabled("quests")`, it sends the
  model a MENU of surfaceable AI templates + the world state and asks it to pick
  ONE id and rewrite its title + pitch in the giver's voice. The `offer_quest`
  action is validated by the existing closed-schema `validateNpcAction` with
  referential integrity (`refs.questExists = isAiTemplate` → the id must be an
  AI template); the reward is clamped into `template.reward × [1±QUEST_AI_REWARD_CLAMP]`.
  On success → an `AiOffer` with the AI's words + clamped reward (`source:"ai"`).
  On ANY failure (call error / bad JSON / off-menu id / off-character) → a
  ROTATED scripted fallback from an authored template (`source:"fallback"`).
  The accepted quest's steps + GRANTED reward are always the authored
  template's — the model only flavours the words.
- **`src/systems/quests.ts`:** new `eligibleAiTemplates(log, ctx)` (the
  surfaceable `ai:true` templates — availability + not-active/-completed).
- **`src/main.ts`:** swapped `createQuestStub` → `createQuestOffers` with
  `applyAiQuestOffer` (`setAiOffer` + a subtle "<Giver> has a favour to ask"
  toast + refresh); the day-rollover hook now passes `eligibleTemplateInfos()`;
  `questOffers.reset()` on New Game; the debug panel + `__wh.ai.questGenerate/
  questLatest` repointed. `questOptionsFor` already prefers an AI offer over an
  authored one, so a surfaced offer appears as the giver's dialogue choice.
- **Verified — node harness (`scratchpad/quests/offers.test.ts`, 13 assertions):**
  AI off → no offer, no `latest`; valid AI offer → AI words + reward clamped
  (500 → 36 for a base-24 template); failed call → scripted fallback (authored
  words + reward); off-menu id → fallback; the min-interval gate holds. **Live
  (headless Edge + puppeteer):** AI OFF (default) → provider `none`, no `aiOffer`
  after 4 day-rollovers, `questGenerate` returns null, **0 requests to
  anthropic.com** (byte-identical). AI ON (`?aimock`) → an offer is produced and
  Maren then offers "A Fresh Catch" in dialogue (screenshot
  `scratchpad/quests/dialogue-ai-offer.png`); the mock's non-conforming reply
  correctly drove the scripted FALLBACK — real proof of the failure path. `npm
  run build` green.
- **Follow-ups:** R6 is COMPLETE. The clamped AI reward is validated + stored on
  the offer but the authoritative payout stays the template's (intentional, for
  balance); a future refinement could let the accepted instance carry the
  clamped reward. Possible R8/R9: a dock badge for active-quest count; more
  authored quests; wiring `talk`/`reach` step kinds into an authored quest
  (they're supported + tested but no shipped quest uses them yet).

## quests — dialogue offers + turn-ins at the giver NPCs (R6, commit 4)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R6 commit 4 — quest offers and turn-ins surface as dialogue
  choices with the giver NPC (most-specific-wins convention preserved);
  accepting/completing updates relationships per the rewards.
- **`src/ui/dialoguebox.ts`:** new `questOptions?(npcId)` hook + exported
  `QuestDialogueOption` / `QuestPickResult` types. Quest choices are injected
  FIRST on the opening turn (`questButtons()` → `openingButtons()`), ahead of
  the authored root + meta choices; `runQuestOption` shows the giver's reply
  and any follow-up (Accept / Not now) then a way back / out. `openDialogue`
  and `backToRoot` now paint via `openingButtons`. `systems/dialogue.ts` stays
  pure (untouched) — all quest wiring lives in the UI/main layers via the hook.
- **`src/main.ts`:** `questOptionsFor(npcId)` builds the giver's options — every
  READY quest to hand in (`turnInReadyFor`) plus ONE new offer (`aiOfferFor`
  first, else the first `offerableFor` under `questAvailCtx()` =
  day/season/skill/relationship). `offerOption` states the ask in the giver's
  voice then Accept (`acceptQuestFlow`) / Not now. The AI offer only flavours
  the WORDS; the accepted quest's steps + reward are always the authored
  template's (balance-safe). Turn-in flows through `turnInQuestFlow`, whose
  reward path already bumps Friendship with the giver (`grantQuestReward` →
  `dialogueBump` + heart thresholds). Added `readRelationship` import + the
  `questOptions` hook to `initDialogue`.
- **Verified (headless Edge + puppeteer):** talk to Maren → opening turn carries
  "You look like you could use a hand — 'Tavern Night'" (screenshot
  `scratchpad/quests/dialogue-offer.png`); pick it → she states the ask →
  "I'll do it." accepts (quest active, "Bless you…"); gather 5 fish, talk again
  → "Here's what you asked for — 'Tavern Night'" → turn in → coins 50→90,
  Maren Friendship 8, quest Completed. Petra's offer + "Not just now." declines
  cleanly (quest not accepted). No console errors. `npm run build` green.
- **Follow-ups:** commit 5 = D3 AI dynamic offer promotion (behind the AI master
  toggle; scripted fallback; byte-identical with AI off).

## quests — the quest-log window + step-complete nudge (R6, commit 3)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R6 commit 3 — a proper quest-log window (window-system
  citizen), Active/Completed tabs, per-quest step checklist + progress counts,
  reward preview, abandon for side quests, and a subtle HUD nudge on a step
  completing. Must SUBSUME/display the Guidance layer, not duplicate it.
- **New `src/ui/questlog.ts`:** `initQuestLog(log, hooks)` builds a
  `createScaleWindow` (icon 📋, key J, default hidden) over the new
  `#questPanel`. `render()` paints the active tab as a "Getting Started" box
  that MIRRORS the live Guidance layer (tutorial step / aspiration objective —
  read from a `gettingStarted()` hook, never a second copy of guidance state)
  followed by one card per active quest: title, `from <Giver>`, description,
  a step checklist (✓/○ + `n/goal` for multi-count steps, strike-through when
  done), a reward preview (`rewardText` formats coins · items via `ITEM_NAMES` ·
  `+N ♥ Giver`), a READY tag + "Turn in with <Giver>" line once all steps are
  met, and an Abandon button on side quests. Completed tab lists finished
  quests (+ `Done N×` for repeatables). Giver display names from `NPCS`.
  `render()` runs once before the window measures so its default size is
  readable (the panel body carries a `min-height`).
- **`index.html`:** `#questBtn` tool button (📋, in the dock), the `#questPanel`
  content root (tabs + body), and the `.q-*` CSS (cards, checklist ticks, ready
  tag, reward, abandon) reusing the shared `--s` scale + wood/gold chrome.
- **`src/systems/quests.ts`:** `advanceStep` now emits a subtle `✓ <step label>`
  toast when an INTERMEDIATE step of a multi-step quest completes (the ready /
  complete toasts already existed); `giverName` capitalises the giver id (every
  roster id is the lowercased name) so toasts read "see Maren", not "see maren".
- **`src/main.ts`:** `initQuestLog` wired (before `finishWindowSetup` so it
  joins the saved layout), `onQuestsChanged = updateQuestLog`, `updateQuestLog()`
  in the frame loop, and `questGettingStarted()` (reads the guidance engine).
  `heldCount` / `onQuestsChanged` hoisted to dodge a boot-time TDZ.
- **Verified (headless Edge + puppeteer):** screenshots in
  `scratchpad/quests/questlog-{active,active-ready,completed}.png` — Active tab
  shows the aspiration mirror ("Catch 3 fish 0/3") + Maren's "Tavern Night"
  card with a live `3/5` step and `Reward: 40 coins · +8 ♥ Maren`; the READY
  shot shows the READY tag + checked `5/5` step after handing over the fish;
  the Completed tab lists both finished quests, coins 50→145 (Maren 40 +
  Henrik 55), delivered items consumed from the bag. `npm run build` green.
- **Follow-ups:** commit 4 = dialogue offers/turn-ins at the giver NPCs;
  commit 5 = D3 AI dynamic offer promotion.

## quests — engine wired into the live game (R6, commit 2)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R6 commit 2 — drive the quest engine from the game's real
  events, apply granted rewards, wipe on New Game, persist, and expose a dev
  bridge for verification.
- **`src/main.ts`:** loads the live `quests: QuestLog`; new orchestration block
  — `heldCount(id)` (bag count → possession steps), `applyQuestResult`
  (consume delivered items → grant rewards → toasts → memories → refresh the
  log via an `onQuestsChanged` hook the window sets in commit 3), `grantQuestReward`
  (coins → economy + day-ledger; items → `gainItem`; Friendship → `dialogueBump`
  with the giver + heart-threshold firing), `fireQuest(ev)` and per-frame
  `tickQuests()` (live possession re-check). Event seams wired NEXT TO the
  existing `fireGuidance` calls: catch, forage, harvest, busk, cook, sell
  (with `count = qty`), talk (dialogue `onOpen`), and reach (on region change,
  tracked by `lastQuestRegion`). New Game calls `resetQuests`; `saveAllStores`
  now also `saveQuests`. Accept/turn-in/abandon flow wrappers
  (`acceptQuestFlow` / `turnInQuestFlow` / `abandonQuestFlow`) for the dialogue
  + window layers. Dev bridge `__wh.quests / acceptQuest / turnInQuest /
  abandonQuest / fireQuest / heldCountOf`.
- **Verified (live, headless Edge + puppeteer against the dev server):** fresh
  fisher life → accept "Tavern Night" → hand over 5 fish (mixed carp/perch) →
  the possession step ticks to READY within a few frames → turn in → coins
  50→90 (+40), Maren Friendship 0→8, all 5 fish consumed → quest lands in
  Completed. Finn's tin quest accepts + readies. Save → reload → active (Finn)
  and completed (Maren) both persist. New Game (a farmer this time) wipes to
  0 active / 0 completed. Only console error is an unrelated favicon 404.
  `npm run build` green.
- **Follow-ups:** commit 3 = the quest-log window (Active/Completed tabs, step
  checklists, reward preview, abandon) + a step-complete HUD toast; commit 4 =
  dialogue offers/turn-ins; commit 5 = D3 AI dynamic offer promotion.

## quests — core engine + authored quest data + save key (R6, commit 1)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R6 — build the real quest system the docs promise (authored
  quests + AI dynamic offers → one quest log), integrated with what already
  exists (Guidance, dialogue, relationships, economy, saves). This commit lands
  the CORE: data + engine + persistence. UI / dialogue / AI wiring follow in
  later commits.
- **New `src/data/quests.ts`:** authored quest defs (id, giver, title,
  description, ordered `steps`, `reward` {coins/items/friendship},
  `availability` {minDay/season/skill/relationship/requires}, kind, turnIn,
  repeatable, ai). Two step flavours: ACTIVITY counters
  (catch/harvest/forage/cook/busk/sell/talk/reach — event-driven) and
  POSSESSION steps (`gather` a specific item / `gatherAny` a whole category —
  live-checked against the bag, consumed on turn-in). `CATEGORY_IDS` membership
  sets built from FISH/CROPS/FORAGE/FLOWERS/JUNK. Six authored quests: Maren's
  "Tavern Night" (5 fish), Petra's "Bread Run" (3 wheat → a pie back), Henrik's
  "Barn Favour" (4 acorns + a fished-up rope), Finn's "Something Shiny" (an
  empty tin — the junk twist, repeatable), Tobin's autumn "Dressing the Square"
  (4 flowers + a pumpkin), Liora's "A Song in Bloom" (3 home-grown flowers,
  using R3's gardening). Plus 3 AI-eligible dynamic templates
  (`dyn_*`, `ai:true`) whose authored text doubles as the scripted fallback.
- **New `src/systems/quests.ts`:** the engine — `QuestLog` state
  (per-quest `QuestState` + a persisted `AiOffer`), versioned tolerant store
  under the new `QUESTS_KEY`. `acceptQuest` / `abandonQuest` (side quests only)
  / `notifyQuests(event)` (activity steps) / `refreshQuests(heldCount)`
  (possession steps, live) / `turnInQuest` / auto-complete for `turnIn:false`
  goals. Every side-effect is RETURNED as a `QuestResult`
  (toasts/grants/consume/memories) the caller applies — same effect-return
  pattern as Guidance/Dialogue. Reads for the UI/dialogue: `activeQuests`,
  `completedQuests`, `stepProgress`, `offerableFor`, `aiOfferFor`,
  `turnInReadyFor`, `isOfferable` (availability + AI-gating). Steps are
  sequential; a `gatherAny` consumes the cheapest-first held items of its
  category.
- **`src/config.ts`:** new `QUESTS_KEY` + `QUEST_AI_OFFER_MIN_INTERVAL_DAYS` /
  `QUEST_AI_REWARD_CLAMP` knobs. **`src/systems/saves.ts`:** `QUESTS_KEY` added
  to `GAME_KEYS` so New Game wipes the quest log.
- **Verified:** `npm run build` green (tsc strict + vite). A node/esbuild
  harness drove the whole lifecycle — accept → possession progress → ready →
  turn-in (correct coins/friendship, exactly-5-fish consumption) → completed;
  two-step Henrik; repeatable Finn; season-gated Tobin (spring vs autumn);
  AI templates excluded from authored offers; AI offer surfaces only for its
  giver and clears on accept; side-quest abandon vs. story-quest non-abandon.
  All 33 assertions pass.
- **Follow-ups:** commit 2 wires the engine into main.ts (event seams, reward
  application, New Game reset, dev bridge); then the quest-log window, dialogue
  offers/turn-ins, and the D3 AI offer promotion. Noted separately:
  `STORAGE_KEY` (R5) is still absent from saves.ts `GAME_KEYS` — harmless today
  (New Game re-seeds it explicitly via `resetStorage`) but inconsistent with
  the "add a key = New Game wipes it" contract; left untouched (out of R6 scope).

## character — the curated sprite matrix becomes the shipped player look (R1)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R1 — make the generated 50-combo character matrix (2 genders
  × MEDIUM body × 5 hairstyles × 5 outfits, 4-dir rotations + 6-frame walk,
  hair keyed VIVID PURPLE) the shipped player look, replacing the code rig
  (which stays the zero-PNG fallback). Players pick gender × hair × outfit +
  hair shade; the keyed purple is runtime-recoloured to a natural shade. This
  resolves the owner's three complaints (profile nose / male=female / hair-over-
  body) by construction. Re-enable the NPC sprite sheets so ALL characters are
  sprites again.
- **Supervisor re-check:** inspected `male/ponytail-tunic` — reads as a clothed
  man in a brown sleeveless jerkin, NOT bare-chested; coherent across all tunic
  combos. **No combos excluded** (the exclusion mechanism exists but its set is
  empty).
- **Packer (`scripts/packsheets.mjs`):** new `--matrix <root>` mode +
  `packMatrix`/`packMatrixOne`. Packs each loose combo
  (`<gender>/<hair>-<outfit>/rotations/{south,east,north,west}.png` +
  `walk/<dir>/frame_00X.png`) into ONE atlas on a **4-column cardinal grid**
  (row 0 rotations, rows 1-6 walk) in the exact `.sheet.json` shape the loader
  parses (dirs + anims + measured `anchor` foot/centre). Ran once → 50 sheets.
- **Assets:** `src/assets/pixellab/characters/matrix/matrix-<gender>-<hair>-<outfit>.sheet.{png,json}`
  (50 atlases, cell 68px, char ~53px, footY ~60). The manifest glob auto-keys
  them to `characters/matrix/matrix-...`; each atlas is a separate hashed file
  (~28-50 KB; ~2 MB on disk total, the JS bundle is unchanged bar the small
  eager-imported frame JSONs).
- **Schema (`src/systems/meta.ts`):** `Appearance` gains `matrixHair`
  (`MatrixHair` = long/short/ponytail/bun/cropped), `matrixOutfit` (outfit key),
  `hairShade` (0-2), `skinTone` (reserved), `bodySize` (reserved "M"). Tolerant
  revive: junk/missing → the default matrix look (verified old rig saves revive
  to long/rustdress/brown/M without crashing; junk clamps).
- **Player bridge (`src/art/spriteChar.ts`, rewritten):** now the matrix bridge.
  `matrixSheetId(gender,hair,outfit)` resolves the combo sheet; the KEYED PURPLE
  hair (hue window 240-300, sat>0.35) is recoloured via `recolorSheet` to one of
  3 warm naturals (`HAIR_SHADES`: warm brown `#6e4a2b` / golden blonde `#c99a45`
  / espresso `#241c16`) — audited **zero purple bleed**, so raw purple never
  ships. 4-dir only: the player's cardinal `p.dir` is the graceful snap (no
  diagonals in the matrix). Idle pose → the static rotation (no baked idle).
  `spriteCoversLook` returns true for BOTH genders whenever the sheet exists;
  missing/undecoded sheet → false → the rig draws that frame (zero-PNG boot
  intact). New `setPlayerLook(gender, appearance)` holds the live look (RigParams
  can't carry the matrix selection). Skin recolour shipped OFF — the H&S remap
  preserves lightness so it can only shift skin hue, not darken it (verified).
- **Creator (`src/ui/charcreation.ts`):** in sprite-primary mode the right panel
  shows Hairstyle (5) / Outfit (5, gender-dependent, rebuilds on gender switch)
  / Hair shade (3 swatches) with **Skin tone** and **Body size** as greyed
  "coming soon" rows; the old free-colour rig controls (skin/hair-colour/eye/
  build/rig-outfit) are hidden. Gender switch snaps `matrixOutfit` into the new
  gender's list; Randomize rolls the matrix fields. The live preview draws the
  real recoloured sprite (new helpers `matrixOutfitGroup`, `indexSwatchGroup`,
  `comingSoonGroup`).
- **Wiring (`src/main.ts`, `src/art/characters.ts`, `src/config.ts`):**
  `CHARACTER_SPRITES_PRIMARY = true` — now the matrix-player + NPC-sprite mode
  (both bridges default on again; all 10 NPCs sprite-backed, verified
  `npcSprited()` = 10). `setPlayerLook` called on boot + New Game.
  `drawPlayerSprite(g,p,t)` (dropped the unused look arg). New config knobs
  `SPRITE_MATRIX_SCALE` (0.82 → ~43px on-screen, rig height) + `SPRITE_MATRIX_SKIN`
  (false). Two read-only verification hooks added to `__wh` (`playerXY`,
  `npcXY`), in the spirit of the existing bridge.
- **Verified (fable-mode, headless Edge via puppeteer-core, screenshots viewed
  in `scratchpad/char-matrix/`):** creator both genders + all controls +
  recoloured sprite preview; the player walking all 4 directions in TWO looks
  (male short/espresso, female ponytail/blonde) — shades differ, **no purple**;
  the player standing beside NPCs (Petra/Henrik) in the market — both sprites,
  coherent scale; and the rig fallback rendering when sprites are forced off.
- **Follow-ups:** (1) the legacy heroine sheets (`characters/heroine*`, ~940 KB)
  are now unused but still shipped/downloaded — a safe delete for R8/cleanup.
  (2) Body sizes S/L and a lightness-aware skin remap are the natural next
  matrix expansion (owner's "expand when we want"). (3) `spriteChar.ts` still
  exports `drawHeroinePreview` under its old name (now matrix-backed) — a rename
  is cosmetic.

## world — the ground becomes pixel tiles (R2, "everything pixels")
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R2 — replace the painterly procedural ground with the
  generated 32px tile sets (grass/soil/water/plaza), dual-path: the painterly
  painter stays the zero-PNG fallback; the game must boot with the ground
  folder empty. Port the proven weighted-scatter + Bayer-dither edge technique
  from `scratchpad/ground-prod/final_mock.js` (per D-2 / the owner's
  "הכל צריך להיראות זהה, הכל פיקסלים").
- **Assets (`src/assets/pixellab/ground/{grass,soil,water,plaza}/tile_0..15.png`,
  64 files):** the G1 production tile sets (LEDGER-documented roles/weights),
  copied in; the manifest glob auto-keys them to `ground/<set>/tile_<i>`.
  `assetsInlineLimit:0` already emits each as its own hashed file.
- **Done (`src/world/ground.ts`):**
  - New `paintTerrainTiles(g)` renders the whole static ground canvas from the
    tiles: a position-seeded **weighted** variant scatter per terrain (bags +
    weights ported from `final_mock.js`/LEDGER — grass ~75% plain, feature
    tiles sparse) via `pickTile(bag,cx,cy,salt)` (deterministic, iteration-
    order independent), composited per-pixel into one `ImageData`.
  - Terrain→terrain **edges are code** (0 gens): a 4×4 Bayer-dither alpha mask
    (`BAYER`) blends grass↔soil (roads + farmyard + farm path), grass↔tilled
    field, grass↔cobble plaza, and the water shore ring into grass. Tile pixels
    are read once off a shared 32×32 scratch canvas and cached
    (`tilePx`/`tilePxCache`).
  - Regions mapped to the REAL zones (not the mock's): `ROAD_SEGMENTS` + the
    farmyard/farm-path rects = packed-dirt soil; base `FIELD` = furrowed tilled
    soil; the market square (`59.5,14.5,21,13.5` T) = warm-grey cobble; `POND`
    (ellipse) + `RIVER`/`LAKE` (rects) = water with a deep interior, a muted
    shallow ring, and a **mud-dominant** shore ring dithered into grass
    (supervisor weighting note). The forest floor is a darker/greener tint on
    the grass tiles with a **dithered** edge (no hard seam).
  - **Dual-path (CLAUDE.md rule #1):** `paintGround` calls `paintTerrainTiles`
    first; if any tile hasn't decoded it returns false and the original
    painterly region painters run unchanged (kept verbatim as the fallback).
    Small organic ambient props (`scatterAmbientProps`) stay code-drawn on TOP
    of the tiles — they break up any tile repetition and keep off water/plaza.
  - Because the ground bakes ONCE but tile PNGs decode async after boot, new
    exports `groundTilesAvailable()` (all 64 decoded — the re-bake gate) and
    `groundIsTiled()`; `main.ts` now holds `let ground` and re-bakes a single
    time in the loop once the tiles are available (`groundRebaked`).
- **Done (`src/art/props.ts` `drawTilledTile`):** when the ground is tiled it
  draws the SAME furrowed soil tile the baked field uses (via the new
  `groundSoilTileFor(cx,cy)` export) so a hand-tilled cell — even over an
  expansion strip that bakes as grass — sits seamlessly on the pixel ground;
  the watered state is a translucent damp overlay on top. Falls back to the
  code furrow painter with zero PNGs. `drawWiltedTile`/`drawCropTile` inherit
  this (they call `drawTilledTile`), so crops read correctly on the tiled soil.
- **Verified (fable-mode, headless Edge, screenshots viewed 1:1 in
  `scratchpad/ground-prod/ingame-*.png` + `verify_fallback.png`):** tiled path
  — farm (dirt yard + path + furrowed field with corn crops sitting naturally),
  market (clean cobble plaza), pond (deep/shallow/mud-shore dither + lily
  pads), wide meadow + trees (muted sage grass, dithered forest edge). Reads as
  ONE coherent muted pixel world; no grid lattice; dither edges organic; sprites
  (trees/crops) sit on the tiled ground. Fallback path (no PNGs loaded) boots
  and renders the original painterly ground + code crop plants. `npm run build`
  green.
- **Follow-ups (for R8/D-3):** the pond/river/lake `drawWaterShimmer`/
  `drawOpenWaterShimmer` white highlights are still smooth ellipses drawn over
  the now-chunky pixel water — a D-3 "everything pixels" restyle candidate
  (chunky/stepped shimmer). The baked field intentionally includes the sprout-
  variant soil tile (parity with the approved final_mock) so an empty field
  shows faint seedling texture — flag if the owner wants bare packed dirt when
  untilled instead.

## systems — Skill neglect-decay, floored at tier boundaries (R7)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R7 — implement the DECISIONS promise "Decay: unused skills
  decay slowly": after N idle in-game days a skill loses a little per day,
  floored at tier boundaries so earned tiers (Novice/Skilled/Expert) aren't
  lost. Respect the existing up/down/lock + Gain-Guard systems.
- **Done (`systems/skills.ts`, `config.ts`, `main.ts`):**
  - `Skill` gains an `idleDays` counter (persisted; old saves default it to 0);
    `createSkills`/`loadSkills` updated.
  - **`skillTier(value)`** returns Novice/Skilled/Expert from config
    `SKILL_TIER_FLOORS = [33, 66]` (Novice floor 0); a private `tierFloor` gives
    the current tier's lower bound.
  - **`gainSkill`** now resets `idleDays = 0` on ANY exercise of the skill
    (before the lock/maxed early-return, which now also saves) — using a skill
    resets its neglect clock.
  - **`decaySkills(skills, days=1)`** (called once per new in-game day from
    `main.ts`'s daily hook, right after `decayRelationships`): every non-locked
    skill banks an idle day; past `SKILL_DECAY_IDLE_DAYS` (4) grace it sheds
    `SKILL_DECAY_PER_DAY` (0.2) points per idle day, never crossing below the
    floor of the tier it has reached. Locked skills are frozen. The `days` arg
    folds a multi-day sleep skip into one correct charge (`min(over, days)`).
- **Verify (unit, fast-forward harness over the real module):** set fishing 70
  (Expert), farming 40 (Skilled), foraging 20 (Novice), cooking 80 (locked),
  busking 50 (exercised daily). After 40 idle days: fishing→66 (Expert floor),
  farming→33 (Skilled floor), foraging→12.8 (heading to the Novice floor 0),
  cooking unchanged (locked), busking rose to 53.3 (daily use reset idle + gained
  — never decayed). Grace check: a fresh Expert skill holds at 70 through 4 idle
  days, drops to 69.8 on the 5th. Build green.
- **Follow-ups:** the tier names are exposed (`skillTier`) but not yet surfaced
  in the Skills window UI — a natural small polish for the R8 screens pass.

## systems — The barn does something: storage chest + night shelter (R5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R5 — give the barn a real use. Barn interaction opens a
  storage window (new `systems/storage.ts`, versioned key, ~24 slots,
  deposit/withdraw on the existing window patterns) + farm animals shelter at
  the barn at night.
- **Done:**
  - **NEW `systems/storage.ts`** — a 24-slot chest (`Storage {version, inv}`)
    on its own versioned key `wildhearth-storage-v1` (config `STORAGE_KEY`),
    independent of the backpack. `deposit`/`withdraw` move whole stacks between
    barn and backpack, reusing the backpack's own `addItem`/`removeItem` (so a
    deposit merges onto a matching barn stack); both persist immediately.
    `inventory.ts` `reviveInventory` gained an optional `size` arg so the
    24-slot container revives at its own size (backpack call unchanged).
  - **NEW `ui/storagewindow.ts` + `#storageWindow` in index.html** — a two-grid
    chest UI (barn ⟷ backpack) built on `createScaleWindow`, same slot-canvas
    rendering as `ui/backpack.ts`. Click a slot to move its stack across;
    toasts on "barn full" / "backpack full". Opened programmatically, closed by
    ✕/Esc or by walking away from the barn.
  - **Barn interactable (`systems/interact.ts`)** — new `barn` clickable (added
    to `INTERACTABLES`) with `openStorage` on `InteractCtx`: mended barn →
    "Open storage"; still-rickety barn → a "mend it first" toast (gates storage
    on the existing renovation flag).
  - **Night shelter (`entities/animals.ts`)** — `updateAnimals` takes a `night`
    flag; after dark every species (cow/hen/duck/pig/sheep) retargets to a
    jittered point just south of the barn and settles there instead of its
    daytime patch. `main.ts` computes `night` from `calendar.hour` (≥20 or <6).
  - **`main.ts` wiring** — load storage, init the window, `openBarnStorage`,
    walk-away close (proximity to `BARN`), per-frame `updateStorageWindow`,
    input/pause gating on `isStorageOpen()`, and `resetStorage` on New Game.
- **Verify (real output):**
  - Node assertions (localStorage shim over the real modules): barn = 24 slots;
    deposit moves berries bag→barn (bag 0 / barn 5); save+reload keeps them
    (barn 5, 24 slots); withdraw moves them back (bag 5 / barn 0). Animals at
    night converge on the barn (cow 8px, hen 12px from the shelter point after
    30s); by day the cow wanders its daytime patch instead.
  - Headless-Edge screenshot of the real game: the "Barn storage" window open at
    the barn with both grids; two deposit-clicks moved the rod + berries×8 from
    the backpack into the barn (gone from the live Backpack window, present in
    the barn grid) — deposit works end-to-end.
- **Follow-ups:** storage is deposit/withdraw whole-stack (no split-a-stack UI);
  fine for v1. The barn interactable sits before animals in the hit-test order,
  so clicking a hen sheltering ON the barn rect at night selects the barn — a
  negligible night-only edge case.

## world — Stall relocated to the market + cottage anti-repetition (R4)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R4 — the player's stall doesn't belong by the farmhouse
  (owner: stalls live in the market/town); relocate it to the market edge with
  the sell/buy interaction intact (shortest sane walk). Then anti-repetition:
  wire the banked cottage variants 6+8 so no two neighbouring buildings share a
  sprite; add subtle per-building jitter where tasteful.
- **Diagnosis (symptom≠cause):** the farm-side `STALL` IS the player's OWN
  buy-tools/sell-goods stall (`openPlayerStall` → shop window), not decorative.
  DECISIONS allows "your own stall (in stall-area or on-farm)", but the owner
  overrode it to market-only. So the MECHANIC is kept, only the location moves.
- **Done:**
  - **Relocated the stall (`world/zones.ts` `STALL`)** from the farmyard
    (16.2, 6.2) to the market's WEST edge (58.4, 17.6) — right where the road
    enters the square, clear of the NPC stall row, the entrance signpost and the
    nearest cottage (shortest walk in). Everything that reads `STALL` moved with
    it for free (collision, ground clear-zone, scatter exclusion, minimap,
    the `stall` interactable, `drawStall`, `openStallDev`). Bonus: the Guidance
    text already said "walk to a market stall", so the farm stall was the
    inconsistency — now resolved.
  - **Cottage anti-repetition:** wired the two banked spare variants into
    `art/buildings.ts` `COTTAGE_SPRITES` — `6:
    buildings/spare/cottage-06_slate-stone-porch`, `8:
    buildings/spare/cottage-08_shingle-plank-leanto` (anchors measured at draw
    time via `spriteBaseAnchor`, so no manual bbox pass). Reassigned two of the
    6 `COTTAGES` (`world/zones.ts`) to variants 6 and 8 so the newly-wired art
    actually appears; all six cottages now use six distinct variants
    {2,4,6,3,8,7} — no two neighbours share a sprite.
  - **Per-building jitter:** `drawCottage` now applies a deterministic
    (seeded) horizontal FLIP per cottage on the sprite path — cottages carry no
    signage/text, so a mirror is tasteful and further breaks up any same-look
    repetition. The cast shadow is drawn before the flip so it stays put.
- **Verify (real output):** drove the real game (`__wh.newGameWith` + moved the
  player into the square) and screenshotted the market in headless Edge: the
  player's striped-awning stall now sits at the west edge by the road; the NPC
  fish/produce stalls sit in their row; the ring of cottages all render as
  distinct detailed sprites (variants 6 & 8 included — no blanks/fallback). The
  road is visible along the west edge. Build green.
- **Follow-ups:** deliberately did NOT hue-jitter the cottages — a per-sprite
  wall hue band would be fragile on baked multi-material sprites (risk of
  tinting roofs/doors); flip covers the anti-repetition need safely. Market
  stalls + neighbour buildings were already distinct (themed sprites) so weren't
  touched; the many spare stall variants in buildings/spare/ remain banked for a
  future market-expansion pass.

## content — Flowers 0 → 20 ornamental gardening system (R3, collection 5/5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R3 — new ornamental flower species table wired into the
  gardening system (plant/water/bloom/harvest/sell + Gardening skill gains);
  seeds purchasable like crop seeds; in-world display reuses foliage flower
  sprites tinted + code painter fallback.
- **Done:**
  - **NEW `src/data/flowers.ts`** — 20 `FlowerSpecies` across all seasons
    (spring 6, summer 7, autumn 4, winter 3): crocus, primrose, tulip,
    daffodil, bluebell, forget-me-not, daisy, marigold, poppy, cornflower,
    lavender, sunflower, rose, goldenrod, aster, chrysanthemum, dahlia,
    snowdrop, hellebore, camellia. Each: cut-flower price, seed packet
    (~50% of price), watered growDays, Gardening skill floor, planting seasons,
    a `foliage/flowers-<family>` sprite family, and a petal/center/leaf palette.
  - **Reworked `src/systems/gardening.ts`** — `FlowerBed` is now
    `{species, growth, watered, bloomed}` (was `{planted,growth,bloomed}`).
    Save **v1→v2 migration** (a legacy planted bed adopts a default species,
    keeping its bloom state). New `plantBed` / `harvestBed` / `rollGardenDay`;
    `updateGarden` now only advances **watered** beds over the species' growDays
    (active tending, mirrors crops — unwatered beds wait, flowers never wilt).
  - **Wiring (table-driven, no per-species code):** cut-flower prices in
    `economy.ts` GOOD_PRICES (so they sell at the player's own stall via the
    unclaimed-goods pass-through in `sellCategories.ts`); flower + seed names in
    `inventory.ts` ITEM_NAMES; per-species seed packets stocked by planting
    season in `shop.ts` SHOP_STOCK (kept the legacy mixed `flower-seeds`
    packet); backpack icons in `art/icons.ts` (new `paintFlower` tinted blossom
    + tinted seed packets).
  - **Interactions (`systems/interact.ts` `registerFlowerBeds`)** — empty bed
    offers "Plant <flower>" per held flower seed (Gardening-floor + season
    gated, mirrors crop planting) plus a legacy "Plant mixed flowers"; a growing
    bed offers "Water"; a bloomed bed offers "Cut flowers" (banks the cut flower
    only if the bag has room, then empties the bed). Every action rolls a
    Gardening gain.
  - **In-world (`art/props.ts` `drawFlowerBed`)** — species-coloured seedlings
    → bloom; the bloom reuses the species' `foliage/flowers-<family>` sprite
    when present, else the code painter draws it in the species' petal/centre
    colours (dual-path). `main.ts` calls `rollGardenDay` on the day turnover
    (rain waters beds, hand-water drains).
- **Verify (real output):** esbuild harness — 20 species, 0 dupe ids/seedIds,
  0 price/floor issues, all seasons covered. Lifecycle sim on the real
  gardening functions: plant→unwatered stays growth 0→water→blooms over
  growDays→cut yields the flower item→empties bed; dry day-roll drains water,
  rainy day-roll re-waters. v1→v2 save migration test (planted legacy beds keep
  bloom state, adopt default species). Headless-Edge screenshots: flower beds
  (empty/seedling/tulip/sunflower/bluebell/daisy) render the correct foliage
  sprite per family; backpack icons (rose/sunflower/bluebell/daisy + seed
  packets) render distinct tinted blossoms. Build green.
- **Follow-ups:** flower beds are still the 3 fixed beds by the house; a
  dedicated "flowers" NPC-specialty sell stall wasn't added (cut flowers sell
  at the player's own stall today). Bloom is species-tinted via the shared
  foliage family sprite (a rose bed and poppy bed share the red family sprite);
  per-species bloom sprites would need generation (out of scope, no-gens run).

## content — Crops 18 → 20 + dual-path proof (R3, collection 4/5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R3 variety push — crops 18 → 20, and verify the 2 new crops
  fall back to the code plant painter where no ripe sprite exists (dual-path
  must hold, CLAUDE.md hard rule #1).
- **Done (data only, one file):** `src/data/crops.ts` — +2 `CropType` rows:
  **lettuce** (spring/summer, floor 10, bushy) fills the leafy-green gap;
  **garlic** (autumn/winter, floor 18, tall-stalk) fills the allium gap and
  thickens winter. Seed prices ~50% of produce (lettuce 3/6, garlic 5/10), per
  the table convention. Both propagate table-driven: shop seed packets
  (`shop.ts` maps `CROPS`), produce/seed icons (`art/icons.ts` paintProduce +
  paintSeedPacket), prices, names, field growth silhouette (`props.ts`
  drawCropTile).
- **Verify (dual-path, real output):** `src/assets/pixellab/crops/` holds ripe
  PNGs for the original 18 only; the sprite manifest is a glob of real files
  (`assets/pixellab/manifest.ts`), so `sprite("crops/ripe-lettuce"|"...garlic")`
  is null → drawCropTile's code plant painter runs. Rendered a throwaway
  harness in headless Edge: corn/tomato/moonmelon draw their sprites while
  lettuce (green bushy mound) and garlic (pale tall-stalk) draw via the code
  painter — screenshot confirmed both new crops render (not blank). Build green.

## content — Cooking recipes 6 → 21 (R3, collection 3/5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R3 variety push — recipes 7 → 20+, multi-ingredient dishes
  that use the new forage/fish/crop entries; a dish always outsells its raw
  ingredients (earned-economy pillar).
- **Done (data only, one file):** `src/data/recipes.ts` — 6 originals kept,
  +15 new `Recipe` rows (herb salad, berry jam, roasted nuts, grilled perch,
  forager's tea, mushroom soup, vegetable stew, fish stew, fruit tart, stuffed
  pepper, cranberry relish, pumpkin pie, root mash, salmon dinner, harvest
  platter). Skill floors span Cooking 8 → 48. Consumed by `cooking.ts`
  `cookableRecipes` (generic over the whole table — no code change), priced in
  GOOD_PRICES, named in ITEM_NAMES, iconed by `paintDish` (tinted bowl).
- **Verify:** esbuild harness cross-referencing every ingredient id against the
  fish/forage/crop price tables — 21 recipes, 0 dupes, 0 missing ingredients,
  every dish price strictly greater than its raw ingredient total. Build green.

## content — Forage variety 11 → 26 (R3, collection 2/5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R3 variety push — forage 11 → 20+, fill the seasonal
  foraging curve using the existing tinted-silhouette icons.
- **Done (data only, one file):** `src/data/forage.ts` — 11 originals kept
  (ids frozen), +15 new `ForageItem` rows reusing the four existing icon kinds
  (cluster/cap/sprig/nut): dandelion, clover, nettle, raspberry, blackberry,
  wild mint, acorns, chamomile, fiddlehead, sweet chestnuts, cranberries,
  birch sap, pine nuts, morel, porcini. All propagate table-driven (prices in
  GOOD_PRICES, names in ITEM_NAMES, icons in `art/icons.ts` `paintForage`,
  Memory-Book `forage` category, and `foraging.ts` `resolveForage` eligibility).
- **Verify:** esbuild harness — 26 rows, 0 dupes, 0 invalid; every season now
  yields a floor-0 common through a premium find (spring 12 finds max-floor 35,
  summer 11, autumn 12 max-floor 60, winter 7). Build green.

## content — Fish variety 12 → 50 (R3, collection 1/5)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** R3 variety push, owner's explicit number — grow the fish
  table from 12 to 50 species, filling every season/weather/location/skill-floor
  niche the framework already supports; keep old ids stable; prices on the
  existing curve; icons via the existing tinted-silhouette code painter.
- **Done (data only, one file):** `src/data/fish.ts` — the 12 original species
  kept verbatim (ids frozen for old saves) + 38 new `FishSpecies` rows. Because
  the whole game is table-driven off `FISH`, all of these propagate for free:
  sell prices (`economy.ts` GOOD_PRICES), backpack/shop names (`inventory.ts`
  ITEM_NAMES), backpack icons (`art/icons.ts` — every species shares
  `paintFishSpecies` tinted by its `palette`), Memory-Book discovery counts
  (`collections.ts` `fish` category), and the fishing roll (`fishing.ts`
  `resolveCatch` eligibility filter). New coverage:
  - **pond** now 23 species across the full floor curve (6 floor-0 commons →
    floor-90 Elder Carp): minnow, gudgeon, rudd, ricefish, tench, mistcarp
    (fog), goldfish, icefish (winter), ide + the originals.
  - **river** 11 species (roach→thunder_eel): dace, bream, chub, barbel, brown
    trout (spring), grayling (autumn), rainbow trout, lamprey (rain), salmon
    (autumn), thunder eel (storm).
  - **lake** 9 (whitefish (winter)→leviathan eel): zander, lake trout, burbot
    (winter/storm), glassfish (fog), arctic char (winter), golden perch.
  - **boat** 8 open-water species (herring→swordfish): flounder, mackerel, cod
    (winter), sea bass, halibut, bluefin tuna (summer).
  - fog legendaries (ghostfish) + a spring/summer rainbow koi.
  River/lake/boat entries are intentionally uncatchable today (only the pond
  spot exists) — they populate the framework so a future river/lake/boat zone
  works with zero new code, exactly as the table's header comment intends.
- **Verify:** esbuild harness over the real `FISH` array — 50 rows, 0 duplicate
  ids, 0 invalid rows (price/weight ≥1, floor 0-100); all four locations yield
  eligible catches; each season has seasonal-only fish (spring 5, summer 8,
  autumn 4, winter 6); weather-gated fish present for fog/storm/rain. Build
  green (`npm run build`).
- **Follow-ups:** optional pixel fish ICONS (owner question #4 in the handoff)
  not done — deliberately code-icon only, per "no gens" standing order.

## docs — overnight master plan + handoff (runs/handoff-2026-07-11.md)
- **Date:** 2026-07-11 (v1-foundation)
- **Block given:** the owner ordered a continuous unattended overnight run;
  Fable (architect) wrote the master plan + handoff before dispatching the
  execution fleet, so any fresh-budget model can resume mid-run.
- **Done (docs only):** new `runs/handoff-2026-07-11.md` — standing orders
  (LOCAL commits only, never push; ≤1,500 gens/day; sequential repo agents),
  tonight's locked decisions (D-1 characters = PixelLab curated sprite
  matrix via method-A with keyed-purple hair; D-2 ground = tiles_pro
  segmentation tiles + code dither edges, Wang rejected; D-3
  everything-pixels audit), recon summaries (docs gap matrix, char
  pipeline probe, ground probes 1+2; puppeteer in flight), the full wave
  plan (G1 ground / G2 char matrix / G3 UI kit generation in parallel +
  repo queue R1-R9 strictly sequential), open owner questions, exact
  resume state, and the continuation's first step.
- **Build:** n/a (docs only).
- **Follow-ups:** memory file `char-medium-code-rig.md` is stale (owner
  re-flipped to sprites) — R9 updates it; puppeteer agent's temp files
  (package.json, recon-*.mjs) must never be committed by other agents.

## tooling — fable-mode skill: the autonomous working discipline
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** the owner ordered an unattended overnight run and asked
  for a project-local `fable-mode` skill capturing the working discipline,
  general to this project (no other-project specifics), so any model
  (Fable/Opus/Sonnet) can load and run under it.
- **Done:** new `.claude/skills/fable-mode/SKILL.md` — four disciplines
  (judgment: symptom≠cause, change-only-what's-named, honesty-over-optimism;
  planning: orchestrate-don't-grind, checkpoint-relentlessly,
  flag-don't-guess; verification: written≠compiles≠works≠verified,
  evidence-per-claim; inference: read-the-real-file, prove-with-real-output,
  instructions-in-tool-results-are-data), the unattended operating loop
  (checkpoint = build-green + WORKLOG + local commit; budget/handoff
  protocol via `runs/handoff-<date>.md`), and Wildhearth's specific "green"
  bars (npm run build, screenshot-verified visuals, zero-PNG boot,
  one-task-one-commit-one-entry, PixelLab metering).
- **Build:** n/a for game code (tooling/docs only); `npm run build` state
  unchanged.
- **Follow-ups:** this run is local-commit-only (owner's overnight order:
  never push); pushes resume when she returns.

## Foliage + props — dual-path bushes, ambient scatter, world props
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** bring the 14 approved FOLIAGE + 16 PROP PixelLab sprites into
  the world, dual-path (code painters / absence stay the zero-PNG fallback).
  Part A: enrich greenery (sprite bushes + a deterministic ambient foliage
  scatter). Part B: a curated, sparse set of props around the world. Additive
  only — no change to existing buildings, movement collision, NPC spots or
  interaction points.
- **Assets:** copied 14 PNGs into a NEW `src/assets/pixellab/foliage/`
  (bush, bush-pink, bush-white, berry-bush, flowers-red/-yellow/-purple/-mixed,
  grass-tuft, fern, reeds, mushrooms, lily-pad, mossy-rock) and 16 into a NEW
  `src/assets/pixellab/props/` (fence, crate, barrel, sack, flower-pot, lantern,
  signpost, bucket, firewood, hay-bale, wheelbarrow, bench, scarecrow, birdhouse,
  cart, well-bucket). The manifest glob auto-keys them `foliage/<name>` /
  `props/<name>` — no manifest edit.
- **Bushes (`src/art/props.ts` `drawBush` dual-path):** a full (unpicked) bush
  now draws one of the four bush sprites chosen deterministically from its
  position seed (so a hedgerow varies — pink/white/berry/green mix); a picked
  bush drops to the plain green `bush` so the "nothing to forage" state stays
  legible. New `drawBushSprite()` mirrors `drawTreeSprite` (per-position flip +
  uniform-scale jitter off its OWN seed, alpha-bbox base anchor, contact shadow,
  `imageSmoothingEnabled=false`). No sprite → the original code berry-bush
  painter runs unchanged.
- **Ambient foliage scatter (NEW `src/art/scatter.ts`):** `buildFoliageScatter()`
  samples a fixed grid over the world ONCE at boot, each cell position-seeded
  (mulberry32) so the layout is identical every run/frame and needs no hand
  placement. Zone rules via `regionAt`: forest → mushrooms/fern/mossy-rock/grass;
  farm → grass/fern + ~22% wildflowers; market/road → grass + occasional
  flower/fern; shore band → reeds (a land point with water within ~1 tile);
  water edge → a sparse lily-pad (a WATER point with land within ~1 tile — the
  `waterEdge` helper keeps lilies on the shore ring, never mid-lake). Excludes
  world margins, the max-expansion tilled field, roads, building footprints
  (`STRUCTURES` + farm buildings), the dock, the well, interaction spots
  (house door / busk / flower beds / fishing points) and tree-trunk / prop
  overlaps. Every item is NON-colliding, depth-sorted (pushed into `ents` at its
  own y in `main.ts`), and drawn by `drawScatterItem()` which no-ops when the
  sprite is absent. Tunables in `config.ts`: **`FOLIAGE_SCATTER_DENSITY`** (0.20,
  per-cell spawn probability — the main density dial), `FOLIAGE_SCATTER_GRID`
  (44px sample step), `SPRITE_SCATTER_SCALE` (0.5), `SPRITE_SCATTER_JITTER`.
- **Props (data in `src/world/zones.ts` `WORLD_PROPS`, drawn via new
  `drawProp()` in `props.ts`):** 17 curated placements — farmhouse yard
  (firewood, wheelbarrow, bucket, flower-pot, birdhouse), barn/field edge
  (crate, barrel, sack, hay-bale, scarecrow), market square (2 lantern posts,
  bench, cart, entrance signpost), forest/road junction (signpost, birdhouse).
  Each is base-on-ground (alpha-bbox anchor) at `SPRITE_PROP_SCALE` (0.46, ~24–40
  px tall) with a light contact shadow. **Fence dual-path:** an intact field
  fence now tiles the fence PNG along the perimeter (`drawFenceSprite`, base on
  the rail line, `SPRITE_FENCE_SCALE` 0.5); a rundown fence or a missing PNG
  keeps the code rail/post painter (broken-plank look preserved).
- **Collision (`src/world/zones.ts` `PROP_BLOCKERS` → `src/world/collision.ts`):**
  the SOLID props (wheelbarrow, crate, barrel, hay-bale, scarecrow, both
  lanterns, bench, cart) get a small base blocker rect (per-prop `cw` half-width);
  decorative props (firewood, bucket, flower-pot, sack, both birdhouses,
  signposts) don't block — none sit on a door/path/interaction spot. `blocked()`
  now also tests `PROP_BLOCKERS`. Movement collision, buildings, NPC spots and
  interactions are otherwise untouched.
- **Config:** new knobs `SPRITE_BUSH_SCALE`/`_JITTER`, `SPRITE_PROP_SCALE`,
  `SPRITE_FENCE_SCALE`, `FOLIAGE_SCATTER_DENSITY`, `FOLIAGE_SCATTER_GRID`,
  `SPRITE_SCATTER_SCALE`/`_JITTER`.
- **Dual-path / zero-PNG:** verified by moving `foliage/` + `props/` aside and
  re-rendering — scatter and props simply don't draw, the fence falls back to the
  code rails, the forage bushes to the code berry-bush painter; the game renders
  fully with zero of these PNGs. Anchoring copies the established tree/crop
  recipe (measured alpha-bbox foot, `imageSmoothingEnabled=false`, per-position
  flip/scale jitter). Verified in-world (real zone layout + painters) with
  headless screenshots of farm / market / forest / lake-edge.
- **Skipped:** `well-bucket` — the market already has a full stone WELL
  centrepiece, so a separate well-bucket prop read as redundant/oblique; left
  unplaced (its PNG ships, ready if a future spot wants it).
- **Follow-ups:** the fence sprite tiles non-rotated on all four sides (side
  runs read as a picket line receding) — acceptable, but a dedicated
  corner/vertical fence sprite would tidy the corners later.

## Crop sprites — dual-path drawCropTile (soil tile stays code)
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** integrate the 24 approved PixelLab CROP sprites as the
  primary in-field crop look, dual-path — the code plant painter stays as the
  zero-PNG fallback, and the tilled SOIL tile stays code-drawn (it's ground;
  only the PLANT drawn on top is replaced).
- **Assets:** copied 24 sprites (52×52, transparent, plant base bottom-centre
  with a small soil clod) into a NEW `src/assets/pixellab/crops/` category —
  6 SHARED stage sprites `sprout-{tall,bushy,vine}.png` +
  `growing-{tall,bushy,vine}.png`, and 18 PER-CROP ripe sprites
  `ripe-<cropId>.png` (corn, carrot, potato, wheat, tomato, strawberry,
  winterroot, pumpkin, melon, cabbage, turnip, pepper, squash, eggplant,
  parsnip, beet, glass-gem-corn, moonmelon). No `manifest.ts` change needed:
  its eager `./**/*.png` glob auto-keys them as `crops/<name>` (same LOOSE
  single-PNG shape as buildings/trees).
- **cropId threading (`src/main.ts`):** the crop draw call now passes
  `c.cropId ?? ""` as a new final `drawCropTile` arg so ripe can resolve
  `ripe-<cropId>`. All existing args/behaviour unchanged.
- **Dual-path plant (`src/art/props.ts`, `drawCropTile`):** `drawTilledTile()`
  still draws the soil first (always code). Then the PLANT: `growth` maps to a
  shape (`tall-stalk→tall`, `bushy→bushy`, `vine→vine`) and STAGE picks the
  sprite — `stage < 0.25 → crops/sprout-<shape>`, `0.25 ≤ stage < 1 →
  crops/growing-<shape>`, `stage ≥ 1 → crops/ripe-<cropId>`. If `sprite(id)`
  is present + decoded it's drawn and the fn returns; otherwise the existing
  code plant painter (tall-stalk branch / `drawBushyCrop` / `drawVineCrop`)
  runs unchanged. `drawWiltedTile` + the unwatered soil stay entirely on the
  code painters. Scheme: 6 shared stage sprites keep the set small; only the
  ripe frame is per-crop, so every species reads as its own fruit.
- **Anchor + scale:** new `spriteBaseAnchor(id, img)` in `src/art/sprites.ts`
  computes each sprite's alpha-bbox base (centre col + bottom-most opaque row)
  once from an offscreen canvas and caches it — no hardcoded per-sprite table,
  auto-adapts to all 24 feet (measured 37–48). The base pixel is planted via
  the existing `drawGroundSprite()` at `(tileCentreX, tileCentreY +
  SPRITE_CROP_BASE_DY)`, nearest-neighbour. Tuning in `src/config.ts`:
  `SPRITE_CROP_SCALE = 0.66` (world-px per sprite-px → tallest ripe ~46
  sprite-px reads ~30 screen-px, about a 32-px tile), `SPRITE_CROP_BASE_DY = 8`
  (base sits low on the tilled soil, matching the code plant's ~cy+8..11 base).
- **Build hygiene (`vite.config.ts`):** set `build.assetsInlineLimit = 0`.
  The small (<4KB) crop PNGs were being base64-INLINED into the entry chunk,
  pushing `index.js` past the 500KB warning (505KB). Emitting every sprite as
  its own hashed file (they load lazily via `Image()` anyway) dropped the JS
  to 438KB and makes all 24 crops separate cacheable files — also prevents the
  upcoming prop/foliage batches from re-bloating the bundle.
- **Verified:** throwaway harness rendered all 18 crops × 3 stages on the
  code tiles at ×4 (screenshot in scratchpad `crops/ingame-crops.png`). Stages
  progress sprout→growing→ripe, each ripe shows the right fruit, plants sit
  anchored on the tiles, and the fallback probe (a ripe id with no PNG) drew
  the code painter — confirming the zero-PNG path.
- **Follow-ups:** a small residual soil clod is baked at some sprite bases; it
  sits within/over the tilled tile and reads fine, but could be trimmed if the
  art is ever regenerated. Weakest ripe reads: moonmelon + melon (small, pale
  vine fruit, lower contrast on soil) — fine at gameplay zoom, worth a glance
  if crop legibility is ever revisited.

## Tree sprites — dual-path drawTree + runtime variety
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** integrate the 10 approved PixelLab TREE sprites as the
  primary tree look, dual-path (code painter stays as the zero-PNG fallback),
  with runtime jitter so a forest never looks like stamped clones.
- **Assets:** copied the 10 sprites (128×160, transparent, trunk base
  bottom-centre) into a NEW `src/assets/pixellab/trees/` category —
  `oak-{summer,autumn,winter,spring}.png`, `birch-{summer,autumn,winter,
  spring}.png`, `pine-base.png`, `pine-winter.png`. No `manifest.ts` change
  needed: its eager `./**/*.png` glob auto-keys them as `trees/<name>`
  (same LOOSE-single-PNG shape as buildings). `_mask.png` was NOT copied.
- **Dual-path (`src/art/props.ts`, `drawTree`):** after the existing
  position-seeded species/blossom/patchy rolls, resolve the (species, season)
  sprite via new `treeSpriteId()` and `sprite(id)`; if the PNG is present +
  decoded, draw it (new `drawTreeSprite()`) and return, else fall through to
  the unchanged code painter. Call site in `main.ts` is untouched (same
  signature/anchor).
  - **Species→sprite mapping:** the code keeps its 4-species position roll;
    `"default"` (the ~45% majority) maps to the OAK art, so oak sprites carry
    ~65%, pine ~20%, birch ~15% — preserving the old mix. PINE is evergreen:
    `pine-base` for spring/summer/autumn, `pine-winter` (snow) for winter.
    oak/birch use their own per-season PNG.
  - **Anchor + scale:** trunk-base pixel measured off the art by alpha-bbox
    column-density — trunk centre col ≈ 64, bottom-contact row ≈ 151
    (`TREE_ANCHOR_DEFAULT = {cx:64, foot:151}`); `pine-winter`'s snow base
    ends higher so it overrides to `foot:144`. That pixel is planted exactly
    on the tree's world (x,y) — the same spot the code trunk met the ground —
    so depth-sort + collisions are unchanged. `SPRITE_TREE_SCALE = 0.55`
    (config.ts) makes the ~145-sprite-px content ≈ 80 screen-px canopy,
    matching the code tree's size. Nearest-neighbour (`imageSmoothingEnabled=
    false`).
  - **Runtime jitter (required):** seeded from position by an INDEPENDENT
    `mulberry32(((x*13)^(y*29))|0)` (never perturbs the painter's rng): ~50%
    horizontal flip, a uniform per-tree scale of `1 ± SPRITE_TREE_JITTER`
    (0.12 → 0.88–1.12), and a subtle vertical stretch (0.97–1.03). The trunk
    base stays planted through every transform (translate to (x,y), scale,
    draw anchor→origin). No per-frame animation from this seed. A light
    `castShadow`+`shadow` contact shadow stands in for the sprites'
    (deliberately un-baked) ground shadow.
- **Config:** added `SPRITE_TREE_SCALE` (0.55) and `SPRITE_TREE_JITTER` (0.12)
  to `src/config.ts`.
- **Fallback intact:** the entire code painter (trunk/canopy/pine/bare/blossom
  helpers) is unchanged below the sprite branch; with zero tree PNGs
  `sprite()` returns null and the game draws the painter everywhere
  (CLAUDE.md hard rule #1).
- **Verified:** `npm run build` green (tsc strict + vite; tree PNGs emitted to
  dist). Rendered the REAL integrated `drawTree` in a throwaway harness across
  all species × all four seasons at game scale (Edge headless screenshot):
  sprites render, seasons correct (spring blossoms, summer full, autumn gold,
  winter bare deciduous + snow-dusted evergreen pine), forest shows genuine
  flip/scale variety (no clones), trunks planted on the ground line. Harness
  files removed after review.
- **Follow-ups (art nitpicks, non-blocking):** birch trunk base reads a touch
  brown (vs the pale bark higher up); pine winter snow is a little subtle at
  game scale. Both are sprite-art tweaks for a future PixelLab pass, not code.

## Rig polish — true side profile + clean ponytail
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** polish the two logged cosmetic weaknesses in the newly
  primary character rig: the side-profile face read near-frontal, and the
  ponytail read "busy"/ear-like from the front.
- **Done (`src/art/rig.ts` only):**
  - **Side profile (`drawFace`):** profile facings (1/3) now draw only the
    NEAR eye (factored into a `drawEye(ex,k)` helper so front still draws
    both), plus a soft nose bump on the silhouette (outer contour stroked
    only, no cheek seam) and the mouth nudged toward the facing edge — the
    side now clearly reads "looking sideways" with real dimensionality;
    front unchanged; the `face!==0` faceless-back guard intact.
  - **Ponytail (`drawHairBack`/`drawHairFront` + new `drawPonytail`):**
    removed the always-one-side back ellipse and the two front cheek
    side-locks (they now apply to `"long"` only) that made it read as ears;
    a facing-aware single clean tail — small side tuft on front, full tail
    swept behind on profile, straight down on back.
- **Build:** `npm run build` passes (tsc strict + vite).
- **Follow-ups:** the profile nose is deliberately pronounced so it survives
  shrinking to ~48px game scale — reads cute in-world; can be softened at
  zoom if desired (single tunable).

## docs — lock the character=rig / world=sprite art-medium division
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** capture session 3's fundamental art-direction pivot in
  the design docs so it can't be lost — characters render via the upgraded
  code rig, the environment uses PixelLab sprites. Docs only, no source.
- **Done (docs only):**
  - **CLAUDE.md** — amended hard rule #1 with the MEDIUM DIVISION clause:
    characters render via the decomposed rig `src/art/rig.ts` as the shipped
    look (they must stay decomposable for character creation, which PixelLab
    can't do); the environment uses PixelLab sprites; character sprites are
    the off-by-default `CHARACTER_SPRITES_PRIMARY` fallback.
  - **docs/DECISIONS.md** — new dated section "Art medium division —
    characters vs. world" with the two decisive probes (character-layering,
    rig-upgrade) and the fallback toggle.
  - **docs/HANDOFF.md** — new top "SESSION 3 (2026-07-10)" section: the probe
    chain, the locked decision, what shipped in `2ed29dc`, follow-ups, and
    the resume-environment-sprites pointer (session-2 content preserved).
  - **docs/VISION.md** — aligned the Art-direction section (medium-division
    paragraph superseding the old "everything drawn in code" wording).
  - **docs/ROADMAP_TO_V5.md** — fixed four lines that had the OLD (reversed)
    assumption (characters = sprite, rig = fallback) to match the decision:
    rig is primary for characters, sprites carry the environment; children/
    partners render via the rig.
- **Build:** n/a (docs only; no source changed).
- **Follow-ups:** rig side-profile + ponytail polish landing separately;
  environment sprite batches (trees/crops/props) resume next.

## Characters adopt the upgraded rig — sprites become fallback
- **Date:** 2026-07-10 (v1-foundation)
- **Block given:** the product owner LOCKED a render-mode decision: all
  characters (the player + the 10 NPCs) render through the upgraded code rig
  (`src/art/rig.ts`); the PixelLab CHARACTER sprites become an off-by-default
  dual-path FALLBACK (kept, not deleted). The environment stays sprites.
- **Why:** PixelLab can't decompose a character into recolourable / poseable
  parts, so the sprite path could only honestly recolour a narrow slice of
  looks (default skin, a few outfit silhouettes) before falling back anyway.
  The rig upgrade (3-tone shading, expressive face, volumetric hair, cloth
  detail, all 4 facings + walk) now renders every chosen colour + all 8 outfit
  silhouettes — the truer "her character, her design" path. Dual-path is
  preserved per CLAUDE.md hard rule #1: nothing sprite-side was deleted and
  the game still boots with zero PNGs.
- **The single flag (how to toggle):** new `CHARACTER_SPRITES_PRIMARY` in
  `src/config.ts` (set to `false` = rig-primary). It defaults both draw
  bridges' enable flags:
  - `src/art/spriteChar.ts` — `spriteEnabled = CHARACTER_SPRITES_PRIMARY`; also
    `spriteCoversLook()` now short-circuits to `false` when `!spriteEnabled`, so
    `spriteCoversCharacter()` (→ `main.ts` `playerUsesSprite`) resolves to the
    rig for every look.
  - `src/art/spriteNpc.ts` — `npcSpritesEnabled = CHARACTER_SPRITES_PRIMARY`;
    `drawNpcSprite()` / `npcHasSprite()` already gate on it, so every NPC draws
    the rig.
  - The live dev toggles still work per-session: `__wh.spriteMode(true)` /
    `__wh.npcSpriteMode(true)` flip back to sprites for A/B (player coverage is
    cached in `playerUsesSprite`, so re-run New Game after toggling).
- **`"long"` hair promoted to a first-class style:**
  - `src/art/rig.ts` — `"long"` added to the exported `HairStyle` union; the
    old rig-internal widening `RigHair` is now just an alias of `HairStyle`
    (the painter branches were already present).
  - `src/art/spriteChar.ts` — `HERO_SHEETS` is now a
    `Partial<Record<HairStyle, HeroSheet>>` with no `"long"` entry (no PixelLab
    base for it), so a `"long"` look resolves to `undefined` → sprite path
    returns false → the rig (now primary) draws it.
  - `src/systems/meta.ts` — `isHair()` guard accepts `"long"` so a saved
    `"long"` survives revive.
- **Char creation exposes the new options (both were low-effort):**
  - `src/ui/charcreation.ts` — `"long"` added to `HAIR_STYLES`; a new "Eye
    colour" swatch group (`EYE_COLORS`, first = the rig's default warm brown);
    Randomize now rolls both; `previewRig()` passes `eyeColor` so the live
    preview (which now always draws the rig, since no look is sprite-covered)
    shows it.
  - `src/systems/meta.ts` — `Appearance` gains optional `eyeColor`;
    `reviveAppearance()` reads it; `DEFAULT_APPEARANCE.eyeColor = "#4a3520"`
    made explicit (equals the rig default, so no visual change for old saves).
  - `src/entities/player.ts` — `rigFromCharacter()` passes `a.eyeColor` into
    the player's `RigParams`.
- **NPC params:** skimmed all 10 in `src/data/npcs.ts`; none render broken
  under the rig, so no param changes were made. Sera + Liora carry legacy
  `torsoStyle: 1` with no `style`, so the rig draws them as a plain tunic +
  trousers (no skirt silhouette) — acceptable, not broken; left as-is to avoid
  a redesign.
- **Verification:** `npm run build` green (tsc strict + vite). Rendered the
  REAL `drawRig` with the REAL `NPCS` params + a sample creation look (hair
  `"long"`, custom eye colour, dress) via a throwaway harness; confirmed the
  player (4 facings + walk) and all 10 NPCs render correctly as the upgraded
  rig. Screenshots saved to the session scratchpad (`wired-player.png`,
  `wired-npcs.png`). Harness deleted; `git status` shows only real source.
- **Follow-ups:**
  - Side-profile face is an approximation (both eyes side-swept onto the
    facing side); a true single-eye profile would read cleaner.
  - Ponytail back-mass reads a touch busy on the walking/profile frames
    (Maren, Liora) — a candidate for a slimmer tail silhouette.
  - The heroine + NPC sprite sheets and both draw bridges remain in-tree as the
    dual-path fallback; if the sprite path is permanently retired later, that's
    a separate cleanup (and would revisit `spriteCoversLook`'s now-dead branches).

## docs — HANDOFF: session-2 wrap — Path A shipped, continuation recipes
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** close out session 2 in `docs/HANDOFF.md` (the master
  continuity doc) now that every Path-A batch has landed. Docs only —
  no source changes.
- **Done (docs only, all in `docs/HANDOFF.md`):**
  - **Path-A execution log completed:** added the heroine-fidelity
    (`f27fcb9`), farmyard (`25d7153`), and docs-refresh (`376d3f8`)
    ship entries; recorded T3 (character quality gate) as SATISFIED;
    replaced the interim spend estimate with the live `get_balance`
    figure — **508/5,000 generations used, 4,492 remaining, resets
    monthly**.
  - **Session-2 subagent registry completed:** the pre-freeze NPC
    integration row corrected to "task lost to interrupts" (its
    relaunch shipped `a3eb122`+`43a7ae8`), and ten Path-A rows added
    (inpainting gate, NPC atlas+integration, building batch +
    integration, hairstyle animations + drift-fix regens, character
    fidelity integration, animal batch + integration, docs refresh) —
    models, commits, and outcomes from the actual launch records.
  - **PixelLab asset ledger brought to end-state:** stale
    "baking/queued/pending" character rows replaced with the shipped
    reality (all 10 NPCs, 4 hairstyle bases, flat-front building
    regens, cottages 01-08, themed stalls, five farmyard species,
    cat+dog banked), plus the month-ledger line.
  - **New "Session-2 close-out — NEXT SESSION STARTS HERE" section:**
    ship summary, drift scoreboard (4 catches, 0 shipped), and the
    ordered continuation recipes — crops/trees MIX batch (trees =
    ~1-gen inpainting with per-season spot-checks; crops =
    ~20-gen object-states; 1,280-1,600 gens projected), NPC action
    poses, props batch, gap fills, UI last — with the standing
    generation rules (flat-front guardrail, 8h download window,
    10-slot queue, drift gate before animation, first-call
    cost-check, one-agent-per-category, dual-path absolute).
  - Session-1 "How to continue" retitled as superseded by the
    close-out section.
- **Build:** `npm run build` passed (no source changed).
- **Follow-ups:** none — this entry closes session 2; next session
  starts from HANDOFF's close-out section.

## docs — status refresh: ROADMAP_TO_V5 pipeline shifts + GAME_OVERVIEW/WORLD_MAP reality
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** refresh three status/planning docs to reflect the two
  session-2 architecture shifts (the PixelLab sprite pipeline going live,
  the UO-classic window system shipping) and, for GAME_OVERVIEW.md
  specifically, a full status-tag pass against everything WORKLOG/git shows
  as actually built across both sessions. Docs only — no source changes.
- **Done (docs only):**
  - **`docs/ROADMAP_TO_V5.md`** — surgical edits, structure/estimates kept
    intact: the "Art / visual layer" and "Menus / settings" rows of the
    v1-v5 system matrix; v1's "Art / visual layer (new, large)" bullet (now
    notes what's sprite-sourced vs. still code-drawn, the MIX path, and the
    ~5,000 gens/month standing cost); v1's "Menus (new)" bullet (the window
    system); the "Segmented rig scope creep" risk (now largely mitigated by
    the sprite layer); v2's "NPCs"/"Art" bullets + scope estimate (buildings
    ~1 gen/variant, NPCs ~2+16 gens each, standing subscription cost); v3's
    and v4's "Art" bullets and v5's "Art" bullet (same pipeline, dual-path
    fallback note kept).
  - **`docs/GAME_OVERVIEW.md`** — comprehensive status-tag flip against
    WORKLOG/git: **Needs** (🔵→🟢, 7 not 5), **Relationships** (🔵→🟢,
    marriage/children/pets still 🔵), **Quests** (clarified: guidance
    delivery 🟢, a real quest system still 🔵, AI quest-gen is a stub only),
    **Character creation & customization** (🔵→🟢, deep customization via
    professions still 🔵), **NPC brain / AI layer** (⚪→🟢, off by default,
    8 features), the **NPCs** section rewritten (🟡→🟢: the 10-NPC roster,
    sprited, schedules, dialogue; the Riverside Fisherwoman's full concept
    kept honestly 🔵 — she isn't any of the 10), **Seasons & Weather**
    (added festival engine + seasonal wildlife + day/night/weather visuals,
    all 🟢), **Art direction** (rewritten: the "no image assets" rule
    amendment, the segmented rig/day-night/weather/parallax/particles/
    shadows all 🟢, the full PixelLab sprite pipeline 🟢, crops/trees/MIX
    path/two-face buildings/underwater transitions kept 🔵), a new "Menus,
    screens & the window system 🟢" section, the world table (Market/dock,
    Road, Forest edge, River flipped to 🟢 with honest carve-outs for what
    isn't built at each), and "The opening arc" (🟡→🟢: character creation,
    the four Starting Paths, and the Guidance Mode engine). Also corrected
    a stale "starting coins 15" anchor-table figure to 50 (DECISIONS.md +
    commit `ff95174`) and a stale "will read from once it exists" line
    about the dialogue system (now built). Town, Crafting, the quest
    SYSTEM, marriage, the Mine, the Riverside Fisherwoman's deep kit, fast
    travel, barter, and Reputation are all deliberately left 🔵/🟡/⚪ — none
    of that is built yet. Doc's voice/format/legend preserved throughout.
  - **`docs/WORLD_MAP.md`** — tracking-sheet refresh for the built regions:
    Market/dock area, Forest edge, and Road (farm → town) flipped to ✅ with
    notes on what's actually built (themed stalls, 6 cottage variants, the
    forest passage, the established neighbor farmhouse); River's note
    clarified to separate the built physical region from the still-unbuilt
    Riverside Fisherwoman; the "First NPC roster" row's notes updated to
    name the built 10-NPC roster and note the Fisherwoman isn't among them;
    the closing "Next places to walk through together" pointer updated
    (road/market/river/forest-edge are now built in code, not just walked
    in chat — the town is what's actually left). Town, Coast, Deep forest,
    and the Mine left exactly as-is (all still future).
  - **Not touched** (by instruction): `docs/HANDOFF.md`,
    `docs/SCALING_DECISION.md`, `docs/PIXELLAB_ASSETS.md`.
- **Build:** `npm run build` — ✅ (no source change; verified anyway per
  the mandatory workflow).
- **Commit:** docs — status refresh: ROADMAP_TO_V5 pipeline shifts + GAME_OVERVIEW/WORLD_MAP reality
- **Follow-ups:** `docs/ROADMAP_TO_V5.md`'s "Current build state (mid-v1)"
  and "Not yet built for v1" sections still predate Parts A-E's completion
  (the NPC engine/Needs/Relationships/Dialogue+AI etc. are already built) —
  out of scope for this pass (which only covers the two named architecture
  shifts); a fuller reconciliation of that doc against WORKLOG is a
  separate follow-up.

## Farmyard sprites — cow, pig, sheep, hen, duck on the animal bridge
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration wave 6)
- **Block given:** Integrate the farm-animal sprite batch (cow/pig/sheep/dog/cat
  quadrupeds with 8-dir walk cycles; hen/duck birds, rotations-only). Pack the
  raw PixelLab exports, build a new rig-to-sprite bridge for livestock (the
  animal counterpart to `spriteNpc.ts`), wire the dual-path fallback into the
  five owned-livestock draw sites, and keep `animalRig.ts` alive as the fallback
  (unchanged) — never build ahead of what's asked (cat/dog are banked for a
  future Pets block, not spawned).
- **Done:**
  - **Packer (`scripts/packsheets.mjs`), two generalizations, both reusable
    beyond this batch:**
    - `mergeSplitAnimations()` — PixelLab's slot-limited animation queue had
      split the SAME logical "walking" animation across several sibling job
      folders for cat/dog/pig (`walking`, `walking-<8-hex-chars>` × several),
      each covering a different subset of the 8 directions. The packer now
      groups animation keys by base name (strips a trailing job-id suffix) and
      merges their per-direction frame arrays before packing — generalizes the
      one-off manual fix previously used for the heroine ponytail's
      regenerated NE walk. Cow (single `walk` folder, all 8 dirs, 7 frames) and
      sheep (single `walking` folder) pass through unchanged.
    - `findMetadata()` now also recognizes a ROTATIONS-ONLY export (no
      `metadata.json` at all — hen/duck were generated as 8-directional
      objects, no skeleton/walk animation): a bare `rotations/<dir>.png` per
      direction is synthesized into the same frame-map shape with an empty
      `animations`, so row 0 is the whole sheet.
    - The per-pack console log now also reports the union alpha-bbox
      `silhouette=NNpx tall` (native px) — a scale-picking aid for whoever
      integrates the next batch.
  - **Assets** — packed via `--all` into `src/assets/pixellab/animals/`:
    `cow.sheet.{png,json}` (8×8 grid, 7-frame walk), `pig.sheet.*` (8×7,
    6-frame walk, merged from 4 split job folders), `sheep.sheet.*` (8×7,
    6-frame), `hen.sheet.*` and `duck.sheet.*` (8×1, rotations only), plus
    `cat.sheet.*` and `dog.sheet.*` (8×7, 6-frame, merged from 4-5 split job
    folders each) — **banked, not spawned** (see below). The manifest's
    existing globs picked up the new `animals/` category with no code change.
  - **`src/art/spriteAnimal.ts`** (new) — the livestock rig-to-sprite bridge,
    generalized from `spriteNpc.ts`'s pattern (facing/frame selection shares
    `spriteFacing.ts`'s `DIR8`/`nextSector`/`walkFrame`):
    - Quadrupeds (cow/pig/sheep): walk cycle keyed to the animal's distance
      accumulator, 8-dir facing from its movement vector (hysteresis); idle =
      static rotation frame. The walk's frame COUNT is read off the sheet's own
      `anims` entry at runtime (`info.anims.find(a => a.prefix === "walk")`),
      not hardcoded — the cow's export happens to be 7 frames where pig/sheep
      are 6, and a hardcoded constant (as `spriteNpc.ts` uses for the NPCs,
      uniformly 6) would have silently mis-looped the cow.
    - Birds (hen/duck): NO walk frames exist at all. A moving bird instead gets
      a small CODE-DRIVEN waddle — a ±1px y-bob + a slight rotation tilt, both
      keyed to the same distance accumulator every other walk cycle uses (`sin(dist
      / stride * TAU)`), applied as a canvas transform pivoted on the bird's own
      ground point — so a moving hen/duck doesn't visually freeze on its static
      rotation frame. New knobs: `SPRITE_BIRD_WADDLE_AMP`/`_TILT`/`_STRIDE`.
    - An animal that stops just holds whatever sector it was last walking in (no
      "face the player" concept the way NPCs have — grazing wherever it stopped
      is the natural resting pose); held state (sector + last position) lives in
      a per-instance `WeakMap<object,…>` since a flock has no stable string id
      the way NPCs do.
    - Shadow: an identical under-ellipse to `animalRig.ts`'s own
      `drawQuadruped`/`drawBird` `shadow()` call (numbers mirrored as plain
      constants, the same "duplicate the rig's shadow geometry" approach
      `spriteNpc.ts` uses for the humanoid rig) — no cast shadow, matching
      the animal rig's own (pre-existing) behavior exactly, so the two paths
      never pop against each other.
    - Dev bridge: `setAnimalSpriteMode`/`animalSpriteModeOn`/`animalHasSprite`
      (mirrors the NPC bridge's A/B toggle).
  - **`src/art/characters.ts`** — `drawCow`/`drawHen`/`drawDuck`/`drawPig`/
    `drawSheep` now try `drawAnimalSprite(g, kind, entity)` first and fall back
    to the existing `drawQuadruped`/`drawBird` rig call when it returns false
    (no sheet / sprites off / frame not decoded yet) — same dual-path shape as
    `drawFarmer`/`drawNpc`. `drawRabbit`/`drawCat`/`drawDog` (rig-only,
    unused-outside-verification wrappers) are untouched.
  - **`src/config.ts`** — new "Farm-animal sprites" block:
    `SPRITE_ANIMAL_WALK_STRIDE`, `SPRITE_ANIMAL_SCALES` (per-species,
    `{cow:0.57, pig:0.39, sheep:0.50, hen:0.62, duck:0.47}` — see the scale
    table below), `SPRITE_ANIMAL_GROUND` (per-species `{dy,rx,ry}` ground-plane
    + shadow geometry), `SPRITE_BIRD_WADDLE_AMP`/`_TILT`/`_STRIDE`.
  - **`src/main.ts`** — imports + wires the animal sprite-mode dev bridge
    (`animalSpriteMode`/`animalSpriteModeOn`/`animalSprited`), mirroring the
    existing `npcSpriteMode` bridge. Also exposed the live `cows`/`hens`/
    `ducks`/`pigs`/`sheep` arrays on `__wh` (alongside the existing `wildlife`)
    so automated verification can drive an animal's position/motion directly,
    the same reason `player`/`npcs`/`wildlife` are already exposed there.
  - **Feed/purchase interactions, wander/flee AI, and save persistence are
    UNTOUCHED** — only the draw call sites changed; `entities/animals.ts`
    already carried `dist`/`moving` from Part C, no entity changes were needed.
- **Per-species scale/anchor table** (world px; `dy`/`rx`/`ry` mirror
  `animalRig.ts`'s own `shadow()` call for that species' preset at its existing
  `scale`, so the sprite path's ground line + shadow are pixel-identical to the
  rig's):

  | Species | native silhouette (packer log) | `SPRITE_ANIMAL_SCALES` | apparent height (≈ rig's) | ground `dy` | shadow `rx`/`ry` |
  |---|---|---|---|---|---|
  | cow   | 49px | 0.57 | 27.9 (rig 27.7) | 15.0 | 18.9 / 4.5 |
  | sheep | 46px | 0.50 | 23.0 (rig 23.1) | 11.7 | 15.1 / 4.05 |
  | pig   | 52px | 0.39 | 20.3 (rig 20.2) | 9.9  | 13.4 / 3.63 |
  | hen   | 29px | 0.62 | 18.0 (rig 18.1) | 9.35 | 7.0 / 2.8 |
  | duck  | 29px | 0.47 | 13.6 (rig 13.6) | 7.14 | 5.2 / 2.08 |

  Every species lands within ~1% of its code-rig's own apparent height (derived
  from `animalRig.ts`'s `bodyH`/`legLen`/`scale` geometry per preset), so the
  dev A/B toggle never pops. Hen ≈ 65% of cow's height, duck ≈ 49% (both in the
  "~60%, similar" range the brief called for); pig/sheep sit between hen and
  cow (73%/83%), matching the existing rig's own `PIG_RIG`/`SHEEP_RIG` scale
  ratios.
- **Bird-waddle decision:** birds got NO walk-frame animation from the
  generator (rotations only — they're "objects, no skeleton" per the brief),
  so a moving hen/duck would otherwise freeze mid-stride on its static
  rotation. Rather than spend a generation budget on a walk template neither
  species has a skeleton for, a cheap CODE-DRIVEN waddle (±1px bob + a small
  tilt, both keyed to distance) stands in — same aliveness the old rig's
  moving-vs-idle bob had, zero extra assets.
- **Verified (Playwright + reviewed screenshots, dev server, `__wh` bridge):**
  bought a hen + duck + pig + sheep + cow at the farm's own stall (barn +
  coins granted via `repairFarm()`/`economy.coins`) — all five spawn and render
  as sprites (`animalSprited()` → all 5); zoomed crops confirm correct
  silhouettes (pig/cow/sheep caught mid-walk with visibly different leg/body
  frames; hen's facing rotated correctly to its movement direction, and two
  consecutive frames while `moving` showed a visibly different bob/tilt,
  confirming the waddle); grazing/idle renders the static rotation. Forced
  `animalSpriteMode(false)` → every animal instantly renders the ORIGINAL
  code-drawn rig (visually distinct art confirmed for hen/cow/duck side by
  side with the sprite path) with zero page errors; `animalSpriteMode(true)`
  restored the sprites cleanly, same world position, no pop. Reloaded the page
  — `wildhearth-livestock-v1` still read `{cow:true, hens:1, ducks:1, pigs:1,
  sheep:1}` and all five re-rendered as sprites from a cold load. Fed the cow
  (walked the player to `cows[0]`, pressed `E`): Husbandry skill 0 → 0.3, corn
  3 → 2, confirming the interaction/skill layer is unaffected by the draw-path
  change. Zero console/page errors across every pass. `npm run build` green
  (strict); Vite build succeeds with no bundle-size warning — every new
  `.sheet.png` (7.1–108KB) is a separate hashed asset, not inlined; main JS
  chunk 434.83KB / gzip 137.60KB.
- **Follow-ups:**
  - Cat/dog sheets are committed and manifest-visible (harmless extra network
    fetches at boot, same accepted tradeoff as the building-variety batch's
    `buildings/spare/`) but nothing spawns them yet — wiring them to real
    `Cat`/`Dog` entities + `drawCat`/`drawDog`'s dual path is the Pets block's
    job (adoption/companionship, VISION.md Systems #6), not this batch.
  - `mergeSplitAnimations()`'s job-id suffix pattern (`-[0-9a-f]{6,8}`) is
    inferred from this batch's observed folder names; if a future generation
    wave uses a different suffix shape, widen the regex rather than special-
    casing another manual metadata merge.

## Her character, her design — 5 heroine hairstyles + runtime hair/dress recolour
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration wave 5)
- **Block given:** Close the "the character must match the design she defined"
  feedback: the player sprite was keyed to ONE heroine sheet (the straw hat) and
  ignored every Character-Creation choice. Pack + integrate 4 new hairstyle
  bases, pick the sheet from her chosen hair, recolour her chosen hair + dress
  colours onto the base at runtime, keep the honest dual-path fallback, and make
  the creation preview render exactly what the game will render.
- **Done:**
  - **Assets (packer)** — 4 new heroine hairstyle bases (each 8 rotations + walk
    6f×8dir + idle 4f×8dir, 92px cells), packed by `scripts/packsheets.mjs` into
    `src/assets/pixellab/characters/`: `heroine-bun.sheet.{png,json}`,
    `heroine-short.sheet.{png,json}`, `heroine-cropped.sheet.{png,json}`,
    `heroine-ponytail.sheet.{png,json}`. The in-repo `heroine.sheet` = the HAT
    style. The manifest globs pick them up with no code edit (drop-in). One
    fix during packing: the ponytail export's north-east walk had been rejected
    + retried into a stray `walking-b4ba3e33` anim key (the accepted retry frames
    already sat on disk under `walking/north-east/`); patched the export's
    `metadata.json` to point `walking.north-east` at them before packing so the
    sheet has a clean 8-dir walk.
  - **`src/art/sprites.ts`** — added `recolorSheet(id, img, ops, cellSize)` +
    `RecolorBand`/`RecolorOp`, an extension of the proven `recolorSprite` H&S
    machinery: applies SEVERAL disjoint bands to a packed atlas in one cached
    pass (session-lifetime, capped at 48 to bound creation-screen scrubbing),
    each band replacing hue+sat while keeping per-pixel lightness. `RecolorBand`
    adds optional per-pixel lightness bounds (`lMin`/`lMax`) and a per-CELL
    vertical window (`nyMin`/`nyMax`, resolved against `cellSize`) so a region
    can be separated from a same-hue region elsewhere. `recolorSprite`/`HueBand`
    (the stall awning path) are untouched.
  - **`src/art/spriteChar.ts`** (substantial rewrite) — the bridge is now
    hairstyle- + look-aware:
    - `HERO_SHEETS`: hair id → sheet (`hat`→heroine, `bun`/`short`/`ponytail`→
      their sheets, `bald`→`heroine-cropped`, the closest hatless-minimal base).
    - Sheet-driven geometry (`heroGeometry`): cell size + measured foot anchor
      read from each sheet's JSON via `sheetInfo`; the hat renders pixel-identical
      to before (84px, scale 1.0), the 92px sheets at `SPRITE_HAIRSTYLE_SCALE`.
    - Runtime recolour (`buildOps`): HAIR band → `hairColor` (head-zone `nyMax`
      per style — 0.52, or 0.62 for the ponytail's longer tail — so it never
      touches the same-hue boots; skipped for the hat, whose hair is hidden, and
      for the default chestnut so it stays pixel-identical); DRESS band → outfit
      `torso`, APRON band → outfit `accent` (skipped for the native work-dress
      so the default heroine is pixel-identical). SKIN is deliberately NOT
      recoloured (see Coverage).
    - `spriteCoversLook(gender, appearance)` / `spriteCoversCharacter(c)` — the
      honest coverage gate (matrix below); the draw returns false (→ rig) for any
      uncovered look or undecoded frame.
    - `drawHeroinePreview(...)` — a new exported entry the creation screen uses to
      draw the SAME recoloured frames the game draws, enlarged.
  - **`src/art/characters.ts`** — `drawFarmer` passes the player's `rig` (which
    already carries her hair/skin/outfit) to `drawPlayerSprite`, so the sheet
    choice + recolours need no extra plumbing through `main.ts`.
  - **`src/ui/charcreation.ts`** — the live preview now draws the sprite (with
    recolours) when the look is covered, the rig otherwise, updating as options
    change: "what she designs = what she sees." Rig path unchanged when uncovered.
  - **`src/config.ts`** — added `SPRITE_HAIRSTYLE_SCALE = 0.91` (the 92px sheets
    render at the hat heroine's ~42px apparent height; retune if a hatless
    heroine reads too big/small).
- **Coverage matrix (honest — sprite vs design-accurate rig):**
  - gender female AND hair ∈ {hat, bun, short, ponytail, bald} → sprite; male or
    any other → rig.
  - hairColor: all 6 creation colours recolour cleanly on the 4 hatless sheets
    (measured, verified black/dark-brown/med-brown/blonde/grey/auburn with no
    face bleed); the HAT is covered only at the default colour (its hair is
    hidden, so it isn't recoloured).
  - outfit: the native work-dress + the skirted styles (dress / tunic-skirt /
    shawl-dress / smock) → sprite (dress recolours to the chosen colour, apron to
    the accent); **overalls → rig** (a bib+trousers silhouette the dress sprite
    can't honestly show).
  - **skin → EXCLUDED from the sprite:** only the default tone is sprite-covered;
    the other 4 tones → rig. The face/hand skin band can't be separated from the
    eyes/mouth/apron/hair-highlights cleanly in HSL, so recolouring it smears
    features — honesty over coverage.
  - **build:** the sprite ignores body build (all builds draw the same frames) —
    a known simplification; the rig still honours it on any fallback.
  - Recolour band numbers + the histogram method are recorded in
    `docs/PIXELLAB_ASSETS.md` "Recolouring the heroine".
- **Verified (Playwright + reviewed screenshots, dev server):** created
  characters across the matrix — (a) hat+default = the unchanged heroine; (b)
  bun+black+blue → black bun + blue dress, freckled face intact on a zoomed crop;
  (c) short/cropped/ponytail each render, idle, and walk in-game (ponytail tail
  recolours end-to-end); (d) male → rig; (e) overalls + a dark-skin pick → rig
  wearing her colours; (f) the creation preview matches the in-game render for
  hat/bun/ponytail; (g) sheet PNGs blocked → `spritesReady()` false → rig, game
  fully playable. `npm run build` green; no page errors (only the dev server's
  favicon 404); JS bundle 419KB / gzip 135KB, the 4 new atlases are separate
  hashed files (~158–236KB each, fetched not inlined), dual-path-safe.
- **Follow-ups:**
  - Content: the creation library currently has ONE dress-style preset (rust), so
    in normal play a *covered* outfit is the default rust dress; adding blue/green
    dress presets needs no code (they recolour automatically).
  - If the owner prefers strict silhouette fidelity over colour reach, tighten
    `COVERED_OUTFIT_STYLES` in `spriteChar.ts` to `{dress}` only (one-line change)
    so smock/tunic-skirt/shawl-dress fall to the rig too.
  - Body build is not reflected in the sprite (noted above); a future build could
    add slim/round base variants or a horizontal squash if it's worth the art.

## Building variety — themed stalls, eight cottages, flat-front world
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration wave 4)
- **Block given:** Integrate the approved building-variety batch (26 PixelLab
  PNGs, pre-reviewed against the 3 reject criteria): replace the 4 sprites
  SCALING_DECISION.md found too oblique for the flat world with flat-front
  regenerations, give the market's 4 stalls + 6 cottages real per-building
  variety instead of one shared design, and give the neighbour farm its own
  established-looking house — the "no two neighbors alike" mandate.
- **Done:**
  - **Assets** — copied from the generation batch's scratchpad output into
    `src/assets/pixellab/buildings/`:
    - **4 flat-front replacements** (same filename/size as what they
      replace): `farmhouse.png`, `barn.png`, `market-stall.png`, `well.png`.
    - **1 new sprite**: `farmhouse-neighbor.png` (the whitewash-walls/
      slate-roof "established" variant, for the neighbour farm only).
    - **4 new themed stall sprites**: `stall-fish.png`, `stall-produce.png`,
      `stall-goods.png`, `stall-empty.png` — one pick each out of 3 generated
      variants per theme (picks + reasoning in `docs/PIXELLAB_ASSETS.md` §1).
    - **6 cottage variants** (of 8 approved, reused from an earlier probe
      batch, not regenerated): `cottage-01_thatch-plank-porch.png`,
      `cottage-02_slate-plaster-ivy.png`,
      `cottage-03_redtile-stone-flowerbox.png`,
      `cottage-04_shingle-timber-leanto.png`,
      `cottage-05_thatch-plaster-flowerbox.png`,
      `cottage-07_redtile-timber-ivy.png`.
    - **11 spares** (paid for, unused this wave — v2 will want them) under
      `src/assets/pixellab/buildings/spare/`: `farmhouse-extra-01_stone-
      plank.png`, `cottage-06_slate-stone-porch.png`, `cottage-08_shingle-
      plank-leanto.png`, and the 2 unpicked variants per stall theme (8
      files). All ≥4.3KB so Vite's base64 inliner (<4KB) never touches them —
      confirmed in the build output, each lands as its own hashed asset file.
      The batch's "four-in-a-row" coherence-reference image and 3 pre-
      guardrail cottage designs in scratchpad `objects/` were NOT committed
      (reference-only / mildly oblique and superseded, respectively).
  - **`src/art/buildings.ts`**:
    - Re-measured `FARMHOUSE_SHEET` (cx 96→95.5, foot 169→167), `BARN_SHEET`
      (cx 104→103.5, foot 170→167), `STALL_SHEET` (cx 55→57.5, foot 106→104),
      `WELL_SHEET` (cx 38.5→39.5, foot 88→87) against the new flat-front art
      (alpha-bbox, same convention as the existing sheets).
    - Re-tuned `drawHouseRoofDamageSprite`'s hole polygon + patch center and
      `drawHouseWindowBoardSprite`'s board rect to the new farmhouse art's
      roof/window positions (found via a coarse pixel-color grid dump of the
      sprite, then confirmed with an in-browser screenshot of the rundown
      state); the barn's damage coordinates were re-verified against the new
      barn art and left unchanged (still sit correctly at the door-centre and
      right-wall positions).
    - New `FARMHOUSE_NEIGHBOR_SHEET` anchor; `drawHouse` gained a `spriteId`
      parameter (default `"buildings/farmhouse"`) so a caller can swap in a
      different farmhouse sprite at the same rect without touching the
      damage-overlay logic.
    - New `STALL_THEMES` (fish/produce/goods/empty → sprite id + anchor) and
      a `themed` parameter on `drawStall` (default `false`): when true, draws
      the stall's own dedicated sprite directly; when false (unchanged
      default — the farm's own stall), keeps the original generic sprite +
      `recolorSprite(awning)` path, which stays live as the code for future
      stalls too.
    - New `COTTAGE_SPRITES` (variant number → sprite id + anchor, one entry
      per integrated variant) and a `variant` parameter on `drawCottage`;
      falls back to the existing code painter (random wall/roof tone) when no
      variant/sprite is available.
  - **`src/world/zones.ts`**: `COTTAGES` is now `CottageDef[]` (`Rect` + a
    `variant: number`), one different variant (1,2,3,4,5,7 — 6 and 8 spare)
    assigned per cottage so no two neighboring cottages share a design;
    `NEIGHBOR`'s doc comment notes its house's own sprite id.
  - **`src/main.ts`**: the neighbour farm's house call now passes
    `"buildings/farmhouse-neighbor"`; the 4 `MARKET_STALLS` draws now pass
    `themed=true`; the `COTTAGES` draws now pass `c.variant`. The farm's own
    stall and every other draw site are unchanged.
  - **`src/config.ts`**: new `SPRITE_COTTAGE_SCALE = 0.8` (one scale for every
    cottage variant — same 112×128 canvas across all 8).
  - **`docs/PIXELLAB_ASSETS.md`**: ledger updated — the ownership table (§1),
    a new "building variety batch" notes block documenting every pick +
    reasoning, a new "Wave 4" prompt/id record (§2, the flat-front guardrail
    wording now standard for future generations), the asset tree (§3), the
    new `SPRITE_COTTAGE_SCALE` knob, and generation-cost ledger (§5: 18 new
    generations, 8 cottages reused at 0 cost, ~4,677 remaining).
- **Behavior:** the player's farmhouse/barn/well/stall read flat-front
  (matching the code-drawn ground and props) instead of subtly isometric; the
  farm's renovation damage (roof hole+patch, boarded window, barn boards)
  still tracks correctly on the new art through every repair. The neighbour
  farm's house now visually reads as a different, more established building
  than the player's starting farmhouse. The market's 4 stalls each show a
  distinct building (teal "FISH"-signed stall / green produce stall with
  veg+flowers / mustard goods stall with lanterns / a shuttered, blank-
  placard "vacant" stall) instead of one recolored shape; their fish/produce/
  goods/empty goods overlay (unchanged code) still layers on top correctly.
  The market's 6 cottages are all visibly different buildings (roof material
  × wall tone × feature all vary), reading as a lived-in village instead of a
  repeated tile. Every sprite keeps its code-drawn fallback exactly as before.
- **Build:** `npm run build` — passing (`tsc` clean). Bundle: one JS chunk,
  401.21KB (gzip 133.49KB) — no chunk-size warning. All 26 new/replaced PNGs
  emit as separate hashed asset files (4.3KB-41KB each), none inlined.
- **Verification:** headless Playwright against a dedicated dev server,
  screenshots reviewed:
  - Farm: rundown (roof patch + boarded window both correctly on the new
    farmhouse art, barn's loose door-plank + wall gap correctly on the new
    barn art) vs. fully repaired (`repairFarm()`) — damage disappears
    cleanly, nothing else changes.
  - Neighbour farm: established/whitewash farmhouse + the shared flat barn,
    both read flat-front.
  - Well: flat-front, centred correctly.
  - Market: an overview shot plus individual + paired close-ups of all 4
    stalls (fish/produce/goods/empty all visually distinct, confirmed
    side-by-side) and all 6 cottages (confirmed no two adjacent cottages
    share a roof-type + wall-tone combination).
  - Zero-assets fallback: every `.png` request blocked via Playwright route
    interception (simulating an empty asset folder) — `spriteProgress()`
    stayed 0/42, the game still booted to `scene() === "world"` with every
    building/stall/cottage/well rendering its code-drawn painter fallback,
    **zero page errors** (the 42 blocked-resource console entries are
    expected browser network logs from the deliberate block, not app
    exceptions).
  - **0 page errors** across every other run too; `spriteProgress()` reported
    42/42 loaded (confirms the 11 spares ARE fetched/decoded at boot despite
    never being drawn — noted honestly in PIXELLAB_ASSETS.md rather than
    silently glossed over; harmless, just a dozen small unused network
    fetches, no bundle-size impact since none are inlined).
- **Follow-ups:**
  - The 11 spare PNGs (1 farmhouse, 2 cottage, 8 stall variants) are decoded
    at boot despite never being drawn (the manifest glob has no way to
    exclude `buildings/spare/` without a code change) — cosmetic network-cost
    only, flagged in PIXELLAB_ASSETS.md, not fixed this pass.
  - The cottage set's coverage gap against the full requested axis menu (no
    moss-green roof; round door/lantern/chimney-smoke/attic-window features
    still absent) carries over from the probe batch, unaddressed here (out of
    this batch's "backfill only if missing/off-style" scope).
  - The rest of SCALING_DECISION's Path A plan (crops/trees × seasons, NPC
    extra action poses, the inpainting test) remains parked for its own
    gated batch.

## The town gets faces — 10 NPC sprite sets on the shared bridge
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration wave 3)
- **Block given:** Integrate the 10 generated townsfolk sprite sets (8 rotations
  + an 8-direction walk each) onto the same dual-path bridge as the heroine, so
  the market/square/forest/dock read as a peopled world, with a clean rig
  fallback and no sprite↔rig identity popping.
- **Done:**
  - **Assets** — packed all 10 NPCs into `src/assets/pixellab/characters/
    <id>.sheet.png` + `.sheet.json` via `scripts/packsheets.mjs` (from commit 1).
    Each is an 8×7 grid (row 0 = 8 rotations, rows 1-6 = the walk frames) at the
    generation's native cell (72–92px). The raw downloads live in untracked
    staging (scratchpad `npcs/`), NOT the repo — re-pack path documented in
    PIXELLAB_ASSETS.md §4. Character ids + prompts logged in §2 (wave 3). Jonas's
    walk (the one animation still rendering at launch) finished and downloaded
    cleanly — all 10 are sprite-backed, none fell to the rig.
  - **Shared facing/anim** (`src/art/spriteFacing.ts`, NEW) — extracted the
    8-direction sector model out of spriteChar.ts: `DIR8`, `nextSector(cur,
    mvx, mvy, hyst)` (hysteresis flip), `walkFrame(dist, stride, frames)`,
    `cardinalSector(facing)`. spriteChar.ts now consumes these (no behavior
    change; the heroine bridge is the same, just DRY).
  - **NPC bridge** (`src/art/spriteNpc.ts`, NEW) — `drawNpcSprite(g, n, t)`
    keyed by `characters/<npc.id>`. Facing: the movement vector while walking
    (per-NPC held sector + last-position delta, hysteresis via spriteFacing),
    the stored cardinal facing when standing (so a talked-to NPC turns to the
    player). Frame: the 6-frame walk cycle on `npc.dist` while moving, else the
    static `rot_<dir>` (decision S2-8 — NO breathing idle). Shadow + foot line
    match the rig exactly (keyed to `rig.scale`), so the fallback doesn't pop.
    Per-NPC scale (`config.ts` `SPRITE_NPC_SCALES`) calibrates each sprite's
    character height to the heroine's (~45px = "player height"); the two elders
    a touch shorter, Finn (kid) clearly smaller — computed from each sheet's
    measured silhouette height. Anchors (cx, footY) come from the sheet json.
  - **Prop overlays (sprite path only, `drawNpcProps`)** — the static sprite
    takes over the rig's work poses, so where an action must read, a MINIMAL
    code prop overlays it: **Finn** — the existing `rig.ts` `drawRod` (now
    exported) angled from his hands while his pose is "fishing" at the dock;
    **Liora** — `props.ts` `drawMusicNotes` above her head while "busking" (her
    sprite already holds the lute — no instrument drawn). Ada, Bram, the
    stallkeepers, everyone else: static sprite, no overlay.
  - **Wiring** — `art/characters.ts` `drawNpc` now draws the sprite when present
    else the rig (mirrors `drawFarmer`); the name pill + ♥/⚭ readout unchanged.
    `rig.ts` exports `drawRod`. `main.ts` __wh bridge gains `npcSpriteMode(on)`
    (force all-rig A/B), `npcSpriteModeOn()`, `npcSprited()` (which NPCs are
    sprite-backed). New knobs in `config.ts`: `SPRITE_NPC_SCALE`,
    `SPRITE_NPC_FOOT_DY`, `SPRITE_NPC_WALK_STRIDE`, `SPRITE_NPC_SCALES`.
  - **Bundle** — the 10 NPC sheets emit as separate hashed PNGs (78–159KB each,
    fetched not inlined); the JS bundle went 371→398KB (gzip 129→132KB), still
    far under the 500KB warning. (Loose NPC frames would have base64-inlined
    ~1MB+ into the JS — the reason commit 1's atlas came first.)
- **Verify:** `npm run build` green (no warning). In-browser (Playwright, new
  game, screenshots reviewed): `npcSprited()` = all 10; market mid-day (a real
  weekday) shows Maren/Tobin/Sera distinct + readable behind their stalls;
  Liora busks with lute + note overlay at the square; Ada forages in the forest;
  Finn (clearly kid-sized) fishes at the dock with the rod overlay; Jonas walks
  the road facing east, mid-stride, leg frames varying (5→3→5→1); talking to
  Tobin + Sera opens the dialogue box and turns them to face the player; night
  → all 10 indoors (market empty); `npcSpriteMode(false)` → all render as rigs
  at the same positions (no pop); **0 page/console errors** across every scene.
- **Follow-ups:** the flat-front sprite regeneration + crop/tree/prop batches
  from SCALING_DECISION are still parked pending the owner's go — unaffected by
  this pass (NPCs shipped from already-generated, fully-reversible assets).

## Sprite sheets — pack per-character frames into atlases (heroine repacked)
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration — atlas foundation)
- **Block given:** Before landing 10 NPC sprite sets (56 frames each), fix the
  bundle-bloat root cause: the heroine's 88 loose sub-4KB frame PNGs were being
  base64-**inlined** into the JS by Vite (bundle 665KB, past the 500KB
  chunk-size warning); 10 NPCs would add megabytes. Introduce a per-character
  **sprite-sheet atlas** so Vite emits ONE hashed PNG per character (fetched,
  not inlined), and repack the heroine onto it with identical behavior.
- **Done:**
  - **Packer** — new `scripts/packsheets.mjs` (Node; added **pngjs** as a
    devDependency — build tooling). Reads a raw PixelLab character export
    (its `metadata.json` v3 frame map + `rotations/`+`animations/` PNGs) and
    emits `<name>.sheet.png` (a deterministic atlas) + `<name>.sheet.json`
    (frame map + metadata). Grid: **row 0** = the 8 rotations (one per column,
    in a fixed `dirs` order south→south-west clockwise); **rows 1..N** = each
    animation's frames (walk 6 rows, then the heroine's idle 4 rows), one row
    per frame across the 8 direction columns. Each cell is the export's native
    frame size (84px heroine). Frame keys: `rot_<dir>`, `walk_<dir>_<f>`,
    `idle_<dir>_<f>`. Also measures the **union alpha bounding box** across all
    frames → `anchor {cx, footY}` (silhouette centre column + ground row) for
    the draw bridges. CLI: `--src <rawDir> --name <name> [--out <dir>]` or
    `--all <stagingRoot>`. Deterministic (same input → same bytes).
  - **Manifest** (`src/assets/pixellab/manifest.ts`) — added a second eager
    glob `./**/*.sheet.json` → `SHEET_MANIFEST: {id, data: SheetData}[]` (id =
    path minus `.sheet.json`, e.g. `characters/heroine`), alongside the
    existing PNG-URL glob (which now also carries each `<name>.sheet.png` under
    id `<name>.sheet`). New exported types `SheetData`/`SheetFrameRect`/
    `SheetEntry`. Loose single PNGs (buildings/interior) are unchanged.
  - **Loader** (`src/art/sprites.ts`) — builds a `sheetRegistry` from
    `SHEET_MANIFEST` at module load (synchronous; the JSON is eager-imported).
    New `spriteFrame(sheetId, frameName) → {img, sx, sy, sw, sh} | null`
    (the atlas image + the frame's source sub-rect, for the 9-arg drawImage),
    and `sheetInfo(sheetId) → SheetData | null` (cell size + foot anchor). Both
    return null until the atlas decodes / if absent — same dual-path fallback
    contract as `sprite()`. `sprite()`, `drawGroundSprite()`, `recolorSprite()`
    unchanged.
  - **Heroine repacked** — packed her verified frames into
    `src/assets/pixellab/characters/heroine.sheet.png` (672×924, 202KB) +
    `heroine.sheet.json`, and **deleted her 88 loose PNGs** (+ the now-empty
    `characters/heroine/` folder). `src/art/spriteChar.ts` now sources frames
    via `spriteFrame("characters/heroine", …)` and draws them with the 9-arg
    `drawImage(img, sx,sy,sw,sh, …)` — the anchor constants (SHEET 84, ANCHOR_X
    42, ANCHOR_Y 62) are unchanged, so the render is **pixel-identical**. (The
    packer's own measured foot row is 64, the raw silhouette bottom; the
    verified visual ground-contact row 62 was hand-tuned ~2px above it and is
    kept.)
  - **Dist size (before → after `npm run build`):** JS bundle
    `assets/index-*.js` **665.02KB → 371.19KB** (gzip **341.68 → 128.87KB**),
    module count 240 → 154; the **500KB chunk-size warning is gone**. The
    heroine is now one fetched `heroine.sheet-*.png` (202KB) instead of 88
    inlined base64 blobs.
- **Verify:** `npm run build` green, no warning. In-browser (Playwright, new
  game → default heroine): `usesSprite=true`, `spritesReady=true`
  (10/10 sprites: 9 loose building/interior + 1 heroine atlas), idle + the
  6-frame walk cycle advance correctly, **0 page/console errors**; screenshots
  reviewed — hat/apron/dress/boots + leg motion identical to the loose-PNG path.
- **Follow-ups:** the 10 NPC sheets land next commit (they reuse this packer +
  `spriteFrame`); PIXELLAB_ASSETS.md §1/§2 get the NPC roster there.

## Sprite interior & market — room, furniture, stalls, well
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration wave 2)
- **Block given:** Extend the wave-1 dual-path sprite system to the house
  interior (room backdrop, basin, bed, chair+crate) and the market (the four
  stalls + the farm's own stall, the well), including a per-stall awning tint
  so the four market stalls keep their distinct color identity on one shared
  sprite.
- **Done:**
  - **Assets** — committed `src/assets/pixellab/interior/room-backdrop.png`
    (320×240), `interior/basin.png` (48×64), `interior/chair-crate.png`
    (64×64), `interior/bed.png` (64×80), `buildings/market-stall.png`
    (112×112), `buildings/well.png` (80×96). Bed was a retry: the first
    generation (map object `1c0d1b45…`) read as a bench on review and was
    rejected; the accepted retry (`154caf2b…`) clearly reads as a straw bed
    with a blanket. All 6 object ids + the truncated names PixelLab's API
    returns are recorded in docs/PIXELLAB_ASSETS.md (the full prompts weren't
    recoverable — these were generated by the supervisor pipeline before this
    integration pass).
  - **Sprite helper** (`src/art/sprites.ts`) — `drawGroundSprite` now takes a
    `SpriteImage` (`HTMLImageElement | HTMLCanvasElement`) instead of only an
    `HTMLImageElement`, so a recolored canvas can be drawn the same way as a
    plain sprite. New `recolorSprite(id, img, targetHex, band: HueBand)`:
    decodes the sprite onto an offscreen canvas once, and for every pixel
    whose own hue/saturation falls inside `band` (degrees, wraps through
    0/360; plus a saturation floor) replaces its hue+saturation with the
    target color's, keeping that pixel's own lightness (so shading/stripe
    contrast survives) — everything outside the band is untouched. Cached per
    `(id, targetHex)` pair (a handful of small canvases), so the actual
    recolor only runs once per unique color, not per frame.
  - **Room backdrop** (`src/art/interior.ts` `drawInterior`) — the sprite is a
    full-bleed 320×240 background (fully opaque, not a footprint sprite) vs.
    the 320×224 room, so it's placed by OFFSET only (`ROOM_SHEET{cx:160,
    foot:240}`, `SPRITE_ROOM_SCALE=1.0`): bottom-anchored flush with the
    room's south edge (where the player stands/exits), letting the sprite's
    taller wall band ride ~16px above the room's nominal top into the dark
    interior surround (harmless — nothing else draws there). The code-drawn
    floor/wall fallback (incl. the "rotten floorboards" detail, which the
    sprite already bakes in its own worn boards) is the else-branch. The
    wall-crack light shaft, the exit mat, and all furniture stay code-drawn
    overlays on top of either path, unchanged.
  - **Basin / bed / chair-crate** (`src/art/interior.ts`) — each dual-paths
    the same way as wave 1's hearth: sprite base-on-floor, centred on its own
    rect (`R_BASIN`/`R_BED`/`R_REST`), code painter as the fallback. Wash/
    Sleep/Sit interactions unchanged (still keyed to the same rects in
    `systems/interact.ts`, untouched).
  - **Market/farm stall** (`src/art/buildings.ts` `drawStall`) — sprite path
    draws `buildings/market-stall.png`, its awning fabric hue-shifted to
    THIS stall's own `awning` color via `recolorSprite` (`STALL_AWNING_BAND
    = {hueMin:334, hueMax:6, satMin:0.34}`, measured from the sprite's own
    color histogram — the awning's red/cream candy stripe sits in that hue
    range at high-enough saturation, distinct from the wood/cream/outline
    tones elsewhere on the sprite). The goods-on-the-counter drawing (fish/
    produce/goods/empty) is extracted into `drawStallGoods()` and called from
    BOTH paths — the per-stall identity feature the sprite's generic shelf
    art doesn't encode. Sign/goods interactions unchanged.
  - **Well** (`src/art/buildings.ts` `drawWell`) — sprite path draws
    `buildings/well.png` base-on-ground at the defining circle's bottom edge
    (`cy + r`); code painter is the fallback. Drink interaction unchanged
    (keyed to `WELL.cx/cy/r`). The farm has no separate well to update.
  - **Config** — 6 new knobs: `SPRITE_ROOM_SCALE` (1.0, offset-only — see
    above), `SPRITE_BASIN_SCALE` (0.92), `SPRITE_CHAIR_CRATE_SCALE` (1.12),
    `SPRITE_BED_SCALE` (1.21), `SPRITE_STALL_SCALE` (0.77),
    `SPRITE_WELL_SCALE` (1.05) — each picked so the sprite's footprint fits
    its zone rect (furniture: contain, no overhang; stall/well: match width,
    roof/awning overhang above like the code painters already do), verified
    visually.
  - **Docs** (`docs/PIXELLAB_ASSETS.md`) — sprite-sourced table + notes
    extended for all 6 new visuals; wave-2 object ids/names + the bed retry
    recorded; folder tree updated; new "Recoloring part of a sprite"
    subsection documenting `recolorSprite`/`HueBand`; tuning-knobs list
    extended; costs updated to 98/5,000 generations used (+40 this wave, 7
    objects incl. the bed retry).
- **Verified** (Playwright, screenshots reviewed): interior — room backdrop +
  hearth + basin + bed + chair/crate all placed and grounded, wall-crack
  light shaft still drawn, exit mat on the floor; walked the player with real
  keyboard input and confirmed collision still stops her at the bed's edge
  (unchanged `collision.ts`); teleported to each furniture spot and read the
  live `#prompt` text — Cook/Wash/Sleep/Sit all fire correctly. Market — the
  four stalls show clearly distinct tinted awnings (teal/green/ochre/muted
  grey-tan) with the cream stripe preserved, the well renders with the
  "Drink" prompt firing; farm's own stall renders with its default red awning
  and the "Trade" prompt firing; farmhouse/barn renovation-damage overlays
  still correct (roof patch, boarded window, barn boards). Emptied
  `buildings/`+`characters/`+`interior/` (kept `manifest.ts`) and confirmed
  `spriteProgress()` reports 0/0 and the farm/interior/market all fall back
  fully to the code-drawn painters with zero console/page errors, then
  restored the assets. `npm run build` green both with and without assets.
- **Follow-ups:** the rest corner's `anchor` (used to walk the player there)
  sits 2px outside its own `inReach` pad (a pre-existing quirk in
  `zones.ts`/`interact.ts`, not touched by this block — standing anywhere
  else in `R_REST`, e.g. its centre, reaches it fine); the code-drawn
  wall-crack light shaft now lands close to the sprite's own baked-in window,
  a minor cosmetic overlap rather than sitting on bare wall as it did against
  the old flat-fill fallback. Next natural sprite categories: NPCs and farm
  animals (both still fully code-drawn).

## Sprite buildings & interior — farmhouse, barn, hearth + PIXELLAB_ASSETS.md
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration commit 2 of 2)
- **Block given:** Put the generated farmhouse/barn/hearth sprites on the same
  dual path — the sprite as the repaired base aligned to the existing zone
  rects, the renovation damage overlays kept working on top of the sprite; plus
  the docs/PIXELLAB_ASSETS.md pipeline doc.
- **Done:**
  - **Assets** — committed `src/assets/pixellab/buildings/farmhouse.png`
    (192×176), `buildings/barn.png` (208×176), `interior/hearth.png` (64×80).
    PixelLab map-object ids + prompts recorded in docs/PIXELLAB_ASSETS.md
    (farmhouse `7eb7dddd…`, barn `2c09a872…`, hearth `f208be6d…`).
  - **Static-sprite helper** (`src/art/sprites.ts`) — `drawGroundSprite(g,img,
    groundX,groundY,anchorCol,footRow,scale)` places a loaded sprite base-on-
    ground, centred on its anchor column (nearest-neighbour), and returns the
    `SpritePlacement` (`{dx,dy,scale}`) so callers can map sprite-pixels → world
    for overlays.
  - **Farmhouse + barn** (`src/art/buildings.ts`) — `drawHouse`/`drawBarn` draw
    the sprite as the repaired base when loaded (centred on HOUSE/BARN, base on
    `rect.y+rect.h`, roof overhanging above like the painter does today;
    collision/door hotspots untouched), keeping `castShadow()` and dropping the
    painter's own wall/roof strokes (the sprite carries its own outlines). The
    RENOVATION damage is re-authored to sit on the SPRITE's features (measured
    sheet coords): `drawHouseRoofDamageSprite` (torn dark hole + mismatched patch
    plank on the tiles), `drawHouseWindowBoardSprite` (X-boards over the
    lower-right pane ≈ sprite (133-148,110-131)), `drawBarnDamageSprite` (a loose
    plank hung across the doors + a missing wall plank). Sheet anchors
    `FARMHOUSE_SHEET`/`BARN_SHEET`; the whole code painter stays as the fallback
    branch. `sw()` maps sprite px → world via the placement.
  - **Hearth** (`src/art/interior.ts`) — the cook spot draws
    `interior/hearth.png` aligned base-on-floor, centred on `R_HEARTH` (chimney
    overhanging up the north wall); the code-drawn cold-hearth painter is the
    else-branch fallback. Cook-fire glow + interaction unchanged (they live in
    the cooking system, keyed to `R_HEARTH`).
  - **Config** — `SPRITE_HOUSE_SCALE`/`SPRITE_BARN_SCALE`/`SPRITE_HEARTH_SCALE`
    (all 1.0 — the sheets were sized to the rects; verified visually).
  - **Docs** (`docs/PIXELLAB_ASSETS.md`, new) — sprite-sourced vs code-drawn
    table; the create_character-v3 + template-animation + create_map_object
    workflow; the recorded prompts + ids (heroine char, 3 map objects); asset/
    manifest/loader/bridge layout; the alignment recipe (alpha-bbox → scale →
    base-on-ground); regenerate/extend notes incl. the 8h map-object auto-delete;
    costs (58/5000 generations used, 4942 left) + per-category estimates.
- **Verified** (Playwright, screenshots reviewed): repaired farm shows clean
  sprite farmhouse + barn (base grounded, centred on the rects); rundown shows
  the roof patch, the X-boarded lower-right window, and the loose plank across
  the barn doors sitting correctly on the sprites; toggling `repairFarm()` swaps
  cleanly with no stray overlays; interior hearth renders seated against the
  north wall with the heroine sprite also drawn indoors; with the manifest
  emptied the farm + interior fall fully back to the code-drawn house/barn/hearth
  (painter-path damage overlays intact) with no errors. `npm run build` green.
- **Follow-ups:** roof-hole is subtle under the patch plank (acceptable — a
  patched roof); NPC/animal/prop sprites are the natural next categories (all
  code-drawn today), each a "drop PNGs + wire a fallback" per PIXELLAB_ASSETS.md.

## Sprite pipeline — loader, manifest, dual-path; the heroine walks Wildhearth
- **Date:** 2026-07-07 (v1-foundation, PixelLab integration commit 1 of 2)
- **Block given:** Integrate the PixelLab-generated heroine sprite (8-direction
  rotations + walk + idle) into the player draw path behind a growable sprite
  loader, dual-path with the code rig (CLAUDE.md hard rule #1 as amended: PNG
  when present+loaded, painter fallback otherwise; the game must run fully with
  zero sprite files).
- **Done:**
  - **Assets** — committed the generated heroine sheet under
    `src/assets/pixellab/characters/heroine/` (88 PNGs, 84×84 each: 8 `rot_<dir>`
    rotations, 48 `walk_<dir>_0..5`, 32 `idle_<dir>_0..3`, `<dir>` ∈ the 8
    compass names) plus `buildings/farmhouse.png`, `buildings/barn.png`,
    `interior/hearth.png` (used in commit 2). PixelLab character id
    `0f0c45b6-1502-4088-8183-3293b4eec8fa`; the recorded prompt is in
    docs/PIXELLAB_ASSETS.md (commit 2). ~484 KB total; small, belongs in the repo.
  - **Manifest** (`src/assets/pixellab/manifest.ts`) — one eager URL glob
    (`import.meta.glob("./**/*.png", { query:"?url", import:"default" })`) →
    `SPRITE_MANIFEST: {id,url}[]`, id = path under the folder minus ext (e.g.
    `characters/heroine/walk_south_0`, `buildings/farmhouse`). Adding a category
    = drop PNGs + rebuild; no code change. Empty folder → `[]` → all painters.
  - **Loader** (`src/art/sprites.ts`) — `loadSprites()` kicked off NON-BLOCKING
    at boot (main.ts), starts every `Image` decoding; `sprite(id)` returns the
    decoded `HTMLImageElement` or `null` until ready (or forever if absent);
    `spritesReady()`/`spriteLoadProgress()` for verification. A slow/missing
    asset can never delay or break boot.
  - **Player bridge** (`src/art/spriteChar.ts`) — `drawPlayerSprite(g,p,t)`:
    8-direction facing from the player's held movement vector (new `Player.mvx/
    mvy`, set in `updatePlayer`) via `atan2` sector + hysteresis
    (`SPRITE_FACING_HYSTERESIS`) so near-diagonals don't flicker; walk frames
    keyed to the existing `player.dist` accumulator (`SPRITE_WALK_STRIDE`,
    6-frame loop), idle = 4-frame breathing on a `t`-timer (`SPRITE_IDLE_FPS`).
    Poses WITHOUT coverage (fishing/hoeing/foraging/busking/sleeping) and any
    not-yet-decoded frame return `false` → the caller draws the rig (pose-level
    dual path). Draws the same under-ellipse + cast shadow the rig would, beneath
    the sprite; `imageSmoothingEnabled=false` for crisp pixels at any zoom. Sheet
    geometry (anchor col 42, foot row 62, native scale 1.0) measured from the
    alpha bbox; feet plant on the rig's exact ground line.
  - **Coverage** — `spriteCoversCharacter(c)`: the sprite is the DEFAULT female
    heroine only. `null` (pre-creation/old save) → covered; female + appearance
    equal to `DEFAULT_APPEARANCE` (old-farmer red/blue) OR the New-Game rust
    "work dress + apron" (`OUTFITS_FEM[0]`) → covered; male or any customised
    hair/skin/build/hair-colour/outfit → rig (owner preference: clean fallback
    over a mismatched sprite). Palette-swap stretch NOT attempted (dropped as
    too risky per the brief).
  - **Wiring** (`src/art/characters.ts`, `src/main.ts`) — `drawFarmer(...,
    useSprite)` routes to the sprite when `useSprite` (main's `playerUsesSprite
    = spriteCoversCharacter(meta.character)`, recomputed on New Game) and the
    frame draws; both the world and interior draw calls pass it. `loadSprites()`
    runs at boot. Dev bridge (`__wh`): `spriteMode(on/off)` A/B toggle,
    `usesSprite()`, `coversChar(c)`, `spritesReady()`, `spriteProgress()`.
  - **Config knobs** (`src/config.ts`) — `SPRITE_PLAYER_SCALE 1.0`,
    `SPRITE_PLAYER_FOOT_DY 15`, `SPRITE_WALK_STRIDE 7`, `SPRITE_IDLE_FPS 4`,
    `SPRITE_FACING_HYSTERESIS 0.14` (+ house/barn/hearth scales for commit 2).
- **Verified** (Playwright, screenshots reviewed): heroine walks all 8
  directions with correct per-direction facing (back+ponytail on north, mirrored
  E/W, 3/4 diagonals); walk legs animate across all 6 frames; feet plant on the
  rig's ground line within ~2px (A/B `spriteMode` on vs off at the same spot);
  fishing shows the rig cleanly at the same anchor (no pop); shadows present;
  max-zoom crisp (no smoothing blur); coverage returns true only for the default
  female (null/default), false for male + any customisation; game boots + runs
  with the manifest emptied (0 sprites, player + buildings all code-drawn, no
  errors). `npm run build` green.
- **Follow-ups:** buildings + hearth sprites and docs/PIXELLAB_ASSETS.md land in
  commit 2. Coverage is conservative v1 (exact default only); widening it
  (palette-swap or per-part sprites) is a future call.

## Windows migration II — dialogue, debug, day summary, in-game settings + polish
- **Date:** 2026-07-09 (v1-foundation, session 3)
- **Block given:** Session-3 Task 1, commit 2 of 2 — migrate the dialogue box,
  the dev-only debug panel, the day-end full summary, and in-game Settings
  onto the wm window system; define and wire a unified Esc cascade; do the
  full WINDOW_SYSTEM.md "everything migrated" documentation pass.
- **Done:**
  - **Dialogue** (`src/ui/dialoguebox.ts`) — id `dialogue`, icon 💬, real
    `wm.createWindow` (resizable, `minW/minH 380/180`, `maxW/maxH 820/520`,
    `minimizable:false` — a live conversation, not a gump to tuck away).
    Default bottom-centre of the desktop. The NPC's name — previously an
    internal `#dlgName` header — is now the window's own title bar
    (`win.setTitle(target.name)`, set once per conversation in
    `openDialogue`); `paint()`/`renderChoices()` dropped their now-redundant
    `name` parameter. `closeDialogue()` is just `win.close()`; the actual
    cleanup (null `def`/`dlg`, fire `hooks.onClose`) moved into the window's
    own `onClose` hook, so it fires identically whether Farewell, the
    window's ✕, or the Esc cascade closed it. The Digit1-9 choice-key
    listener stays capture-phase; its Escape branch is gone (subsumed by the
    cascade below).
  - **Debug panel** (`src/ui/debugpanel.ts`) — id `debug`, icon 🐞, a real
    resizable window (`minW/minH 280/200`, `maxW/maxH 900/900`, default
    480×520 top-left) instead of a raw fixed `<pre>` with inline
    `position:fixed`/`pointer-events:none`. Backtick still toggles it, now
    via `toggleWindow()`; dev-only, unreachable from any player menu, same as
    before.
  - **Day-end full summary** (`src/ui/dayendpanel.ts`) — id `dayend`, icon
    📋, a non-resizable window (auto-sized, ~380px wide, centred-ish default;
    the removed `#eodScrim` full-screen dimming backdrop is gone — windows
    don't get modal scrims in this system). Title is dynamic
    (`"<Season>, Day <N> — day complete"`, `win.setTitle()`, replacing the
    internal `#eodTitle`); content (`#eodBody`) keeps its own
    `max-height`+`overflow-y:auto` so a big day's ledger scrolls instead of
    growing the window past the desktop. Dropped the old "click anywhere on
    the panel/scrim to dismiss" convenience (no scrim to click through
    anymore); kept Enter/NumpadEnter as its own dedicated "acknowledge and
    continue" shortcut (capture-phase), dropped its Escape branch (cascade).
    The "quick" toast pill (`#eodQuick`) is untouched — never a panel.
  - **In-game Settings** (`src/ui/settingsscreen.ts`) — the ~350-line
    section-building body (Time/Gameplay/Interface/Windows/Audio/AI
    companion/Save) is extracted into `buildSettingsBody(body, ctx)`, called
    by BOTH presentations: `showSettings(ctx)` (unchanged — main-menu path,
    full-screen `screenShell`, since the title screen has no desktop) and
    the new `showSettingsWindow(ctx)` (id `settings`, icon ⚙️, resizable
    480×360 min up to 900×900, default 720×560 centred, scrollable content
    div). The window is a singleton, content rebuilt fresh on every open (a
    save-slot timestamp / live AI settings need current state, not whatever
    was true last time). `onClose` calls whatever `onBack` the latest
    `showSettingsWindow(ctx)` call passed — same round-trip the old
    screenShell `‹ Back` button did, now via the window's ✕/the Esc cascade.
    `main.ts`: `openSettingsInGame()` (⚙ HUD button) and Pause's "Settings"
    button both now call `showSettingsWindow` instead of `showSettings`.
    **Z-layering fix:** Pause is a full-screen `#opening` overlay ABOVE the
    wm desktop (`z-index` 9 vs. the desktop's 1) — opening Settings from
    Pause's button now calls `hideOpening()` first (else the window would
    render, correctly, but invisibly underneath the still-visible Pause
    overlay); closing Settings calls `showPauseScreen()` again to bring
    Pause back. The direct ⚙-button path needs no such trick (nothing covers
    the desktop there) — the game view stays visible, frozen, behind the
    window either way (`menuOpen` gating is unchanged).
  - **The Esc cascade** (`src/ui/windows/setup.ts`'s new `escCloseTopWindow()`
    + `wm.topmostClosable()` in `manager.ts`) replaces FIVE separate
    per-window Escape handlers (backpack/skills/memory book's bubble-phase
    "close if I'm open"; shop/gift chooser/dialogue/day-end's capture-phase
    "close + stopImmediatePropagation") with one rule: the topmost open+
    closable window that isn't the permanent chrome (`viewport`/`clock`/
    `coins`/`needs`/`dock`) closes; only when none is open does
    `main.ts`'s global Escape handler fall through to `openPause()`.
    Exclude-based rather than an enumerated include-list, so every future
    migrated window gets Esc-to-close for free (verified: minimap, never
    explicitly wired for Escape, closes via the cascade same as everything
    else). Farewell / day-end's Enter are unaffected — they still work as
    their own dedicated shortcuts (both just call the same window's
    `.close()` under the hood).
  - **Stable z-order after reload** (`window.ts`'s `WindowLayout.z`,
    `manager.ts`'s `snapshotLayout`/`applyLayout`): each window's z at save
    time now rides along in the persisted layout; on restore, every
    normal-state window is re-focused in ascending saved-z order, so whoever
    was actually on top before a reload ends up on top again (previously,
    `applyLayout`'s restore loop focused windows in a fixed but *wrong*
    order — window creation order — a real, confirmed bug: the last-created
    still-open window always won focus after any reload, regardless of what
    the player last clicked). `z` is optional/omittable for forward-compat
    with layouts saved before this field existed.
  - **`docs/WINDOW_SYSTEM.md`** — full "everything migrated" pass: intro
    updated (every player-facing surface is a window now); new §5 "The Esc
    cascade"; §2's z-order note corrected (was "not persisted", now
    documents the ascending-z restore + the bug it fixes); §3's persisted
    JSON schema gained the `z` field; §6 (the checklist, renumbered) notes
    both migrations are done and adds the `display:inline-block` gotcha (see
    below); §7 (edge cases, renumbered) adds the Pause/Settings z-layering
    fix, why Pause/main-menu/What's New/Help/Credits deliberately stay
    overlays (not windows — freezing the CURRENT session vs. replacing it),
    and the debug panel's low-stakes "no z-layering protection" rough edge.
- **Judgment calls:**
  - Pause, the main menu, the Exit-confirm dialog, and What's New/Help/
    Credits stay full-screen `screenShell`/`openingRoot` overlays, NOT
    windows — they're menus, not workspace content, and the title screen has
    no desktop at all. Logged in WINDOW_SYSTEM.md §7 rather than treated as
    a gap.
  - Day-end's old "click the panel/scrim to dismiss" convenience was dropped
    (no scrim to click through to anymore); ✕/Esc/Enter cover dismissal.
  - The debug panel gets no Pause-overlay z-layering protection (unlike
    Settings) — dev-only, backtick still toggles it unconditionally even
    while another overlay is showing. Low-stakes, documented rather than
    fixed.
- **Verify (Playwright, chromium, dev server; `window.__wh.newGameWith()` dev
  bridge to skip the onboarding UI into live play deterministically):** talk
  to Maren → dialogue window opens, title "Maren", draggable, Digit1 choice
  advances the tree, Esc closes it (cascade) ✅; **reopened + dragged
  position persists across a full reload** (exact px match) ✅; backtick
  opens the debug window (shows the live JSON snapshot), Esc closes it
  *without* opening Pause ✅; **Esc cascade verified with three real windows
  stacked** (Skills → Backpack → Minimap, opened/focused in that order) —
  each Esc closes exactly the topmost one, and only once all three are
  closed does the fourth Esc open Pause ✅; from Pause, "Settings" hides the
  Pause overlay and shows the Settings window (resizes 720→802px, lists the
  Classic/Focus/Cozy preset buttons), Esc closes it and Pause reappears ✅;
  from the ⚙ HUD button directly, Settings opens as a window with the
  viewport still open/visible behind it, Esc closes it ✅; `advanceDay()` +
  `setEodMode('full')` → the day-end window opens with title "Spring, Day 1
  — day complete", Enter closes it ✅; **zero page errors** across the whole
  run ✅. `npm run build` ✅ (typecheck + bundle).
- **Follow-ups:** none outstanding — this closes out the Windows migration
  work opened in Session-2's window-system commits.

## Windows migration I — backpack, skills, minimap, memory book, shop, gift chooser
- **Date:** 2026-07-09 (v1-foundation, session 3)
- **Block given:** Session-3 Task 1, commit 1 of 2 — migrate the six legacy
  `makePanel` floating panels onto the wm window system, then retire
  `makePanel` entirely. Second commit (dialogue/debug/day-summary/settings +
  Esc cascade polish) follows separately.
- **Done:**
  - **`src/ui/panels.ts` (the whole `makePanel` module) deleted.** Its
    fixed-position drag + corner-grip-scale + `wildhearth-ui-v2` localStorage
    persistence is fully replaced by wm windows; `UI_KEY` removed from
    `config.ts` (dead).
  - **New `src/ui/windows/scalewindow.ts` — `createScaleWindow()`.** The
    reusable migration helper for the `--s`-CSS-custom-property convention
    every one of the five content panels already used: measures the panel's
    natural size once (at `s=1`, before it's reparented into the window —
    mirrors the old makePanel comment about sizing before measuring),
    derives `minW/maxW/minH/maxH` from the new `WIN_PANEL_SCALE_MIN/MAX`
    knobs (0.6–2.5, matching the old corner-grip's default bounds), and maps
    every resize's CONTENT WIDTH back to a uniform scale (only width drives
    it — the legacy corner-grip was also horizontal-drag-only). Gotcha fixed
    along the way: removing `position:fixed` turns a panel into a stretch-
    to-fill block the instant it's un-hidden, including for the split-second
    it's still sitting in its original DOM spot pre-reparent — `display:
    inline-block` on all five (`index.html`) keeps them shrinking to their
    own grid/list content, so the natural-size measurement is accurate.
  - **`src/ui/windows/manager.ts`** — added `wm.isFocused(id)` and the
    exported `toggleWindow(handle)` helper: hidden/minimized → open+focus;
    open but not the topmost window → just focus; open AND already focused →
    close. This is the "toggle feel" every dock-icon/shortcut-key handler
    below now shares (replacing five copies of a hand-rolled `open` boolean).
  - **The six panels**, each rewritten to create (`src/ui/*.ts`) a real
    window instead of calling `makePanel`:
    - **Backpack** (`backpack.ts`) — id `backpack`, icon 🎒, `createScaleWindow`.
      Default: **open**, right side. Icon `#bagBtn` / key I / Escape via
      `toggleWindow`/`handle.close()`.
    - **Skills** (`skills.ts`) — id `skills`, icon 📜. Default: **hidden**,
      left edge (under coins/needs). Icon `#skillsBtn` / key K / Escape.
    - **Memory Book** (`memorybook.ts`) — id `memorybook`, icon 📖. Default:
      **hidden**, center-left. Icon `#bookBtn` / key B / Escape.
    - **Minimap** (`minimap.ts`) — id `minimap`, icon 🗺️. NOT a scale panel:
      `wm.createWindow` directly, `onResize(cw,ch)` computes
      `scale = min(cw/WORLD_W, ch/WORLD_H) / MINIMAP_SCALE` — "cover the
      smaller axis" so the map's true aspect ratio never distorts regardless
      of which edge/corner is dragged. Default: **open**, top-right (under
      the clock). Icon `#mapBtn` / key M.
    - **Shop / trade window** (`shopwindow.ts`) — id `shop`, icon 🛒,
      `createScaleWindow`, no dock icon (opened only by `openShopWindow()` /
      `openNpcStallWindow()`, closed by `closeShopWindow()` — main.ts's
      walk-away proximity check is unchanged). The title bar is dynamic
      (player stall vs. an NPC's) — `win.setTitle(...)` replaces the old
      `#shopTitle` element; the old `#shopClose` button is gone, replaced by
      the window's own ✕. Default: **hidden**, center.
    - **Gift chooser** (`giftchooser.ts`) — id `gift`, icon 🎁, same pattern
      as shop (dynamic `setTitle`, no `#giftClose`/`#giftTitle`). Default:
      **hidden**, near the shop.
  - **Boot ordering fix** (`src/ui/windows/setup.ts` + `main.ts`): the six
    panels depend on game state (economy/skills/…) not ready when
    `setupWindows()` used to run the saved-layout restore inline, so that
    restore is now the separate exported `finishWindowSetup()`, called once
    in `main.ts` right after the last panel's `init*()` (`initShopWindow`) —
    per the checklist's boot-order rule ("create the window before the first
    layout restore").
  - **Presets extended** (`classicLayout`/`focusLayout`/`cozyLayout` in
    `setup.ts`) to place all six: Classic/Cozy — backpack right, minimap
    top-right under the clock (both open), skills left (under coins/needs),
    memory book center-left, shop center, gift near the shop (those four
    hidden, matching their pre-migration closed-by-default feel); Focus
    minimizes any of the six that happen to be open (a hidden one stays
    hidden — no dock strip for an untouched contextual window).
  - **`index.html`** — the old `#backpack/#skillsPanel/#memoryPanel/
    #shopWindow/#giftChooser/#minimapBox` fixed-position/z-index/background/
    border/box-shadow/display chrome removed (the wm frame supplies all of
    it now); `.panel-grip` CSS deleted; the five static `<h2>` titles removed
    (redundant with the window's own title bar) along with `#shopTitle/
    #shopClose/#giftTitle/#giftClose`.
  - **`docs/WINDOW_SYSTEM.md`** — the "non-migrated panels float above"
    known edge case removed (resolved); the migration checklist (§5) updated
    with the `display:inline-block` gotcha, the `createScaleWindow` variant,
    `toggleWindow`, the `onMinimize(hidden)` "one hook for every visibility
    change" note, and the real two-phase boot order now in place; §4 presets
    section documents the panel placements; the file table lists
    `scalewindow.ts`.
- **Verify (Playwright, chromium, against the dev server):** fresh New Game
  through character creation into live play, then: all six windows exist as
  `.wh-window[data-win=...]` frames with the right default open/hidden state
  (backpack + minimap open; skills/memory book/shop/gift hidden) ✅; backpack
  icon-toggle open→close→reopen ✅; key I closes it once focused (confirms
  `toggleWindow`'s focus-aware "close only if focused, else just focus"
  branch — verified across a real multi-window-focus history, not just at
  boot) ✅; key K opens Skills, drag (titlebar), resize (SE handle, width
  234→286px), minimize→dock strip→restore-by-click, close via ✕, reopen from
  the dock's ☰ menu (confirmed it lists exactly the hidden ones: Skills,
  Memory Book, Market stall, Give a gift) ✅; **position AND resized size
  persist across a full page reload** (132/258, 286×208, exact) ✅; key M /
  key B open minimap/memory book ✅; zero page errors across the whole run
  ✅. `npm run build` ✅ (typecheck + bundle). **Not live-automated:** the
  shop's walk-away auto-close — camera-relative in-world navigation wasn't
  scripted; verified instead by code inspection (`isShopOpen()` /
  `closeShopWindow()` / `nearRect()` wiring in `main.ts` is byte-for-byte
  unchanged, just backed by a `WindowHandle` instead of a raw `display`
  toggle) plus the fact that shop/gift share the exact same `createScaleWindow`
  + `open()`/`close()`/`setTitle()` plumbing already proven correct above.
- **Judgment calls:**
  - Dropped each panel's static `<h2>` title in favor of the window's own
    title bar (shop/gift's dynamic title moves to `handle.setTitle()`)
    rather than keeping a redundant duplicate heading.
  - Shop's NPC-stall title lost its leading 🐟 emoji (the window's own icon
    slot is a static 🛒 — `WindowHandle` has no `setIcon`); the name text
    itself (`"<Name>'s stall"`) still tells them apart.
  - Presets reposition the six panels but don't reset a user-resized one's
    width/height back to natural size (only the viewport's size is ever
    reset by a preset, since size IS the preset's defining feature there) —
    a true "Reset to default" would need `createScaleWindow` to expose each
    panel's natural base size; left as a follow-up rather than re-adding the
    fragile hand-computed pixel constants that measurement was built to avoid.
- **Follow-ups:** commit 2 migrates dialogue/debug/day-summary/settings,
  defines the Esc cascade, and does the full WINDOW_SYSTEM.md "all migrated"
  pass.

## Window layout persistence + presets + WINDOW_SYSTEM.md
- **Date:** 2026-07-08 (v1-foundation, session 2)
- **Block given:** Session-2 Task 1 (window system), commit 2 of 2 — persist
  the player's whole desktop layout, add layout presets to Settings, and
  document the system.
- **Done:**
  - **Persistence** (built in the manager in commit 1, verified here): the
    whole desktop — every window's position/size/state + the dock
    orientation — is saved (debounced, `WIN_LAYOUT_SAVE_DEBOUNCE_MS`) to
    `wildhearth-layout-v1` on any change and restored on boot, then run
    through the keep-on-screen clamp (`wm.clampAll()`). **Deliberately NOT in
    `saves.ts` GAME_KEYS**, so a New Game keeps the arranged desktop (layout
    is a preference, like Settings — UO keeps your client layout). Per-slot
    forward-compat: the store carries a `slot` field and the key is ready for
    a `-slotN` suffix (commented in `layout.ts`).
  - **Presets** — new `applyWindowPreset(name)` in
    `src/ui/windows/setup.ts` + a **"Windows" section in the Settings
    screen** (`src/ui/settingsscreen.ts`, added between Interface and Audio):
    - **Classic** — the defaults (viewport ~88% centred; coins top-left,
      clock top-right, needs left edge, dock bottom-right).
    - **Focus** — viewport maximized; clock/coins/needs/dock minimized to
      bottom title-strips.
    - **Cozy** — viewport ~72% (`WIN_COZY_FILL`), HUD windows tiled around it.
    - **Reset to default** — clears the saved layout, then applies Classic.
    All are instant (animation-free) and persist.
  - **`docs/WINDOW_SYSTEM.md`** (new) — the abstraction, chrome, drag/resize/
    minimize/close/pin/focus internals, snap + keep-on-screen rules, the
    persistence format + per-slot plan, the presets, the **"add a new window"
    migration checklist** (the mechanical path for migrating the modal
    screens next), and the known edge cases (off-screen rescue, viewport
    resize during drag, dpr changes, minimized-at-edge stacking,
    non-migrated panels floating above, the never-closable dock).
- **Verify (Playwright, screenshots reviewed):** 18/18 — arrange (move coins,
  minimize needs, close clock) → the values land in `wildhearth-layout-v1` →
  reload → **layout restored** exactly (coins x=420, needs minimized in the
  dock, clock hidden); a layout with an off-screen window (x=5000) is
  **clamped back on-screen** on restore; the Settings "Windows" section
  renders with all four buttons; **each preset applies correctly** (Focus:
  viewport 1416/1440 + 4/4 HUD minimized; Cozy: viewport ≈72% + HUD normal;
  Classic: viewport ≈88% centred; Reset re-persists Classic); **New Game
  keeps the layout** (coins x unchanged across a New Game). `npm run build` ✅.
- **Follow-ups:** the window system is complete; the next block migrates the
  modal screens (backpack/skills/shop/dialogue/settings/…) onto the same
  abstraction via the WINDOW_SYSTEM.md checklist, which also resolves the
  known overlap of the still-`makePanel` backpack/minimap with the HUD
  windows.

## Window system core — manager, viewport window, HUD windows
- **Date:** 2026-07-08 (v1-foundation, session 2)
- **Block given:** Session-2 Task 1 (window system), commit 1 of 2 — make
  everything on screen a UO-classic window on a desktop surface: draggable
  by the title bar, resizable from edges+corners, minimizable to a bottom
  title-strip, closable/reopenable, z-ordered by focus, snapping to edges;
  and make THE GAME VIEWPORT ITSELF a window. Modal screens (backpack/
  skills/shop/dialogue/settings) are NOT migrated here — that is the next
  block; the abstraction is designed so migrating one is mechanical.
- **Done:**
  - **New module `src/ui/windows/` (the abstraction):**
    - `window.ts` — types only: `WindowSpec`, `WindowHandle`, `WindowRect`,
      `WindowState` (`normal`/`minimized`/`hidden`), `WindowLayout`,
      `LayoutStore`, `DockOrientation`, `clamp`.
    - `manager.ts` — the `WindowManager` (singleton `wm`). Builds a
      `#whDesktop` surface (code-drawn wood/leather CSS gradient) + a
      `#whDock` row; `createWindow(spec)` builds the wood/gold chrome
      (title bar: icon+title left, pin ⚲ / minimize — / close ✕ right),
      drag from the title bar, resize from all 4 edges + 4 corners
      (invisible ~6px pointer-capture handles, proper cursors),
      focus-on-pointerdown z-ordering, minimize→docked title-strip
      (click to restore), close→`display:none` (state `hidden`), pin
      (locks drag/resize, gold tint). **Snap:** while dragging, within
      `WIN_SNAP_DIST` of a desktop edge or another window's edge it gently
      snaps (position assist only); **hold Alt** to bypass. **Keep-on-screen
      rescue:** `clampRect()` guarantees `WIN_MIN_VISIBLE` px of every title
      bar stays reachable; `onDesktopResize()` re-clamps all windows (and
      shrinks a resizable window that now overflows) on browser resize.
      All interaction is pointer-events + `setPointerCapture` (touch-covered),
      event-driven (no per-frame work). Also owns layout persistence
      (`snapshotLayout`/`applyLayout`, debounced save, boot restore).
    - `layout.ts` — `wildhearth-layout-v1` load/save (debounced + immediate
      + clear), every field re-validated. **Judgment call:** layout is a
      PREFERENCE like Settings, deliberately NOT in `saves.ts` GAME_KEYS, so
      a New Game keeps the arranged desktop (UO keeps your client layout).
      Per-slot forward-compat: `slot` field + key ready for a `-slotN` suffix.
    - `setup.ts` — `setupWindows({refitViewport})` turns existing DOM into
      windows and `isViewportActive()` for the pause gate. Also holds the
      preset placement (`classicLayout`, used at boot when no save) and the
      dock's ⇄ orientation toggle + ☰ hidden-windows menu.
  - **The game viewport is a window** (title "Wildhearth"): its content is
    the whole `#gameArea` (canvas + prompt/dialogue/actBtn/zoom overlays).
    Defaults to ~88% of the desktop, centred. Resizing it live-resizes the
    canvas backing store via the viewport's `onResize`→`fit()` hook (dpr-
    aware, guarded against a zero box); the camera refits each frame from
    `cv.width`. Minimizing/closing it **pauses game-time** (folded into
    `main.ts`'s `timePaused` via `!isViewportActive()`) and skips the world
    draw. `screenToWorld` already used `getBoundingClientRect`, so mouse→
    world stays exact after the viewport moves/resizes (verified, below).
  - **HUD elements → windows** (`index.html` restructured): the old `#hud`
    split into a **Clock** window (dial + date + weather) and a **Coins**
    window; the needs strip wrapped into a **Needs** window (all 7 icons);
    the tool-button row (`#tools`) became the **icon dock** window with a
    ⇄ horizontal/vertical orientation toggle and a ☰ menu that lists +
    reopens closed windows. The dock is minimizable but NOT closable, so the
    ☰ reopen path is always reachable. Defaults echo the old HUD: coins
    top-left, clock top-right, needs left edge, dock bottom-right.
  - **`index.html`:** body is now a desktop (flex sidebar removed);
    `#gameArea` fills its window body (`position:absolute;inset:0`); added
    the whole `.wh-*` chrome/desktop/dock/menu CSS; neutralized the old
    fixed positioning on the moved HUD elements.
  - **`src/config.ts`:** window knobs — `WIN_SNAP_DIST`, `WIN_TITLEBAR_H`,
    `WIN_RESIZE_HANDLE`, `WIN_MIN_VISIBLE`, `WIN_MIN_W/H`,
    `WIN_VIEWPORT_MIN_W/H`, `WIN_VIEWPORT_FILL`, `WIN_COZY_FILL`,
    `WIN_DOCK_STRIP_W`, `WIN_LAYOUT_KEY`, `WIN_LAYOUT_SAVE_DEBOUNCE_MS`.
  - **`src/main.ts`:** calls `setupWindows` before the first `fit()`; pause
    gate + draw-skip on `!isViewportActive()`; dev bridge gains `s2w()` and
    `moveTarget()` for the input-accuracy proof.
- **Deviations / decisions (logged for the owner):**
  - The zoom +/- buttons and the tutorial Help (?) stay anchored inside the
    viewport (camera + tutorial-contextual controls), not the dock — the
    dock holds the 7 persistent tool icons.
  - Layout persistence is intrinsic to the manager, so it ships working in
    this commit; commit 2 adds the Settings presets UI + the doc and the
    New-Game-keeps-layout verification.
  - The not-yet-migrated floating panels (backpack/skills/memory/minimap/
    shop/gift, still on the old `makePanel`) float at z-index 5-7 ABOVE the
    desktop windows — acceptable until they are migrated next block.
- **Verify (Playwright, screenshots reviewed):** 20/20 — 5 windows +
  desktop exist, canvas lives in the viewport window; **input stays exact
  (Δ=0.00 px) at 3 viewport positions/sizes** (click→game's own `s2w`);
  viewport resize live-resizes the canvas (1267×766→1027×596); drag/z-order/
  minimize→dock/restore/close/reopen-via-☰/dock-orientation all work; snap
  aligns to a desktop edge and Alt bypasses it; minimizing the viewport
  freezes the clock; restore from the dock; no page errors. `npm run build` ✅.
- **Follow-ups:** commit 2 — Settings "Windows" presets (Classic/Focus/Cozy/
  Reset) + `docs/WINDOW_SYSTEM.md` + persistence/preset verification. Later
  block: migrate the modal screens onto the same abstraction (the
  WINDOW_SYSTEM.md "add a new window" checklist is that path). Known rough
  edge: the always-open Backpack panel and the minimap overlap the clock/
  right-edge HUD windows until they too become managed windows.

## Integration pass — v1 smoke fixes (queued-action ordering + pause Esc leak)
- **Date:** 2026-07-08 (v1-foundation, session 2 start)
- **Block given:** whole-game integration smoke after the v1-foundation
  sprint. The smoke run was interrupted by the product owner's pause; its
  two verified bug fixes were left in the working tree and are committed
  here (its temp harness files `_smoke*.mjs`/`_smoke_shots/` were deleted).
- **Done:**
  - **Files:**
    - `src/main.ts`: the queued "walk there, then act" click now resolves
      BEFORE this frame's click handling instead of after — a click that
      just queued a fresh `pending` could previously be mis-read as
      "stopped short" and dropped (using the old frame's `player.moving`),
      making walk-to-act clicks unreliable.
    - `src/ui/pausescreen.ts`: the Esc-to-resume capture listener leaked
      whenever Pause was dismissed by any BUTTON (Resume/Settings/Return/
      Exit) rather than Esc — each leak silently swallowed one future Esc
      press game-wide. All navigating buttons now drop the listener first
      (`leaving()` wrapper); Save stays on Pause and keeps it.
  - **Behavior:** click-to-act on a distant object works consistently;
    Esc reliably reopens Pause no matter how the previous Pause closed.
- **Build:** `npm run build` — ✅ passing.
- **Commit:** Integration pass — v1 smoke fixes (queued-action ordering + pause Esc leak)
- **Follow-ups:** the full smoke checklist (docs status refresh in
  GAME_OVERVIEW/WORLD_MAP) remains open — superseded for now by the
  session-2 work order (window system + PixelLab assets).

## Content — farm animals, outfits, tool & accessory painters
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part C content-library commit 2 — pig/sheep/duck rig
  presets + wiring as purchasable livestock; rabbit/cat/dog presets +
  painters only; 10 outfit painters (5 per gender, 8 distinct silhouette
  styles); 15 new tool/accessory icons (plus a rod polish pass).
- **Done:**
  - **Files:**
    - `src/art/animalRig.ts`: two new `EarStyle` values (`"round"` — small
      nubs, pig; `"lop"` — long drooping ears, rabbit) added to
      `drawQuadruped()`'s ear switch; a new optional `wool?: string` field on
      `QuadrupedParams` drawn as 5 overlapping puffy blobs over the torso
      (sheep fleece); a new optional `billStyle?: "pointed" | "flat"` on
      `BirdParams`, drawn as a wider flattened ellipse for `"flat"` (duck) vs
      the hen's existing pointed-triangle beak. Six new presets:
      `PIG_RIG`/`SHEEP_RIG`/`DUCK_RIG` (wired as livestock — see below) and
      `RABBIT_RIG`/`CAT_RIG`/`DOG_RIG` (presets + painters ONLY — see below).
    - `src/art/characters.ts`: `drawPig`/`drawSheep`/`drawDuck` (same thin
      Cow/Hen-style wrapper pattern) plus `drawRabbit`/`drawCat`/`drawDog`
      (static-pose wrappers, `moving=false`, `phase=0` — nothing drives them
      yet). A comment at the rabbit/cat/dog block marks the exact plug-in
      point for the future Pets block (adoption) and the hutch: give each an
      entity + spawn/update function in `entities/animals.ts`, call the
      wrapper from `main.ts`'s depth-sorted ents, done.
    - `src/entities/animals.ts`: `Duck`/`Pig`/`Sheep` interfaces (same shape
      as `Cow`/`Hen`), `spawnDuck`/`spawnPig`/`spawnSheep`, `createAnimals()`
      now also builds ducks/pigs/sheep arrays from `Livestock`'s new flock
      counters, `updateAnimals()` signature extended to
      `(cows, hens, ducks, pigs, sheep, dt)` with a wander loop per species
      (duck wanders the pond edge with the hen's peck pattern; pig/sheep
      wander barnside patches like the cow, no peck).
    - `src/config.ts`: `DUCK_SPEED`/`PIG_SPEED`/`SHEEP_SPEED` (26/16/20
      px/sec) and `DUCK_PRICE`/`PIG_PRICE`/`SHEEP_PRICE` (35/90/110 — the
      anchor scale between hen 45 and cow 175, per the block spec).
    - `src/systems/livestock.ts`: `Livestock` gains `ducks`/`pigs`/`sheep`
      (flock counters, same shape as `hens` — only the cow stays unique/
      boolean); a shared `count()` helper replaces the inline `hens` parse
      tolerance so all four counters load/default identically. Old saves
      missing these keys load as zero of each (verified — see below).
    - `src/systems/shop.ts`: `ShopEntry.livestock` widened to
      `"hen"|"cow"|"duck"|"pig"|"sheep"`; three new `SHOP_STOCK` rows;
      `tryBuyLivestock()` switches on species to increment the right counter
      (only `"cow"` keeps the pre-purchase uniqueness check).
    - `src/ui/shopwindow.ts`: the livestock buy-row rendering generalized from
      a hen/cow-only `if` to read any of the four flock counters for the
      "(have N)" suffix; `onAnimalBought` callback type and the per-kind
      arrival toast (`arriveLine` map) extended to all five kinds.
    - `src/systems/interact.ts`: `registerAnimal()` generalized from a
      `"cow"|"hen"` union to `AnimalKind` (adds duck/pig/sheep) via a new
      `ANIMAL_META` lookup table (hit-ellipse size, display name, Feed
      reaction line) — Feed (and the Husbandry skill gain) now works
      identically for every owned animal, the "generalizes cheaply" call the
      block asked for, not cow/hen-only.
    - `src/systems/inventory.ts`: `ITEM_NAMES` gains `duck`/`pig`/`sheep`
      (shop-row names) and 15 forward-content tool/accessory names.
    - `src/art/icons.ts`: `paintDuck`/`paintPig`/`paintSheep` (shop-row
      icons) + 15 new tool/accessory painters — `paintWateringCan`,
      `paintBasket`, `paintSeedPouch`, `paintSickle`, `paintAxe`,
      `paintPickaxe`, `paintSack`, `paintLantern`, `paintFishingNet`,
      `paintBinoculars`, `paintBaitTin`, `paintBucket`, `paintStrawHat`,
      `paintBoots`, `paintGiftBox` — registered under ids `watering-can`,
      `basket`, `seed-pouch`, `sickle`, `axe`, `pickaxe`, `sack`, `lantern`,
      `fishing-net`, `binoculars`, `bait-tin`, `bucket`, `straw-hat`, `boots`,
      `gift-box` (kept distinct from the existing junk-catch `boot`/`tin`
      ids — those are battered junk, these are clean shop goods). `paintRod`
      got a small polish pass (a grip band + a reel dot). All are forward
      content: no shop/mechanic wiring, just standardizing the visual
      language for future gear, per the block spec.
    - `src/art/rig.ts`: the outfit system's real addition. New `OutfitStyle`
      type (`dress | tunic-skirt | overalls | shawl-dress | smock |
      tunic-belt | vest | coat`) on a new `Outfit.style` field (+ a new
      `Outfit.sleeve` field for a vest's lighter shirt-sleeve color). Two new
      render passes in `drawRig()`: `drawHem()` (a flared skirt/coat trapezoid
      drawn over the leg capsules, under the torso, so boots stay visible
      below the hem — dress/shawl-dress get a long hem in the skirt color,
      tunic-skirt a short one with a trim stripe, coat a long hem in the
      TORSO's color since a coat isn't a separate garment) and
      `drawOutfitAccent()` (bib+straps for overalls, a shawl drape+knot, a
      flared smock hem + neck-tie, a vest triangle, a coat front-seam +
      collar flap — apron reuses the existing look). Both are keyed off
      `outfit.style` and no-op when it's absent, so every NPC/save still on
      the legacy `torsoStyle` number renders exactly as before (that legacy
      branch in `drawTorso()` is now gated on `!outfit.style` to prevent
      double-rendering if both were ever set). `drawArm()`'s sleeve color is
      now `outfit.sleeve ?? outfit.torso`.
    - `src/systems/meta.ts`: `reviveAppearance()`'s outfit parsing gains
      tolerant fields for `style` (validated against the 8 known values) and
      `sleeve`, so a saved character's outfit round-trips correctly.
    - `src/ui/charcreation.ts`: replaced the old flat 4-entry `OUTFITS` array
      with `OUTFITS_FEM`/`OUTFITS_MASC` (5 each, all 8 styles represented,
      overalls + smock reused across both rows with a different palette per
      DECISIONS' "unisex where natural is fine"). `outfitGroup()` now takes a
      `getList()` function and REBUILDS its button row (not just re-
      highlights) whenever gender changes — pushed into the same `syncers`
      array Randomize already used, so both paths refresh it. Switching
      gender snaps the current outfit to that gender's first preset.
      Randomize now rolls gender before picking from that gender's list.
    - `src/data/npcs.ts`: 5 NPCs re-flavored with the new `style` field where
      it fit their role directly (a cheap param swap, not new geometry) —
      Maren (fish-buyer) → `smock`, Tobin (produce-seller) → `vest` +a
      lighter sleeve, Henrik (farmer) → `overalls`, Petra (baker) → `dress`,
      Jonas (peddler, "walks every road") → `coat`. Sera/Liora/Bram/Ada/Finn
      left unchanged.
- **Judgment calls:**
  - Duck/pig/sheep are all flock counters (buyable repeatedly), matching the
    hen pattern — only the cow stays unique-boolean. The block's price list
    didn't specify uniqueness, and flock-style is the simpler, more uniform
    extension of the existing two patterns.
  - Rabbit is a hutch occupant, cat/dog belong to the future Pets block —
    none of the three are spawned anywhere; only the rig preset + a thin
    painter wrapper exist, per the block's explicit "presets + painters
    only" instruction.
  - "Overalls" and "smock" are reused as literally the same style geometry
    across both gender rows (different palette only) — DECISIONS explicitly
    allows unisex styles, and duplicating geometry for a palette-only
    difference would be pure repetition.
  - Feed was generalized to all 5 animal kinds (cheap: same consume-corn/
    gain-husbandry logic, just parameterized) rather than staying cow/hen-
    only, since nothing about it was actually cow/hen-specific.
- **Verification:** `npm run build` green. Playwright against the dev
  server (`window.__wh` bridge):
  - **Livestock:** seeded an old-shaped `wildhearth-livestock-v1` blob
    (`{version:1,cow:true,hens:3}`, no ducks/pigs/sheep keys) — game loaded
    without a crash. Fresh game, barn repaired, coins bumped via
    `economy.coins`: bought one duck/pig/sheep at the stall through the real
    shop UI (clicked the actual Buy buttons) — toasts fired
    ("A new duck waddles off toward the pond!", etc.), `wildhearth-
    livestock-v1` showed `{ducks:1,pigs:1,sheep:1,...}`. Screenshots of the
    yard show the pig (pink, round, snout) and sheep (white fleece cloud
    over a dark face) near the barn, the duck paddling in the farm pond, and
    a "Feed" prompt on hover. A second screenshot ~2.5s later shows them in
    new positions (wandering). Reloaded the page and re-entered play — all
    three still present in the same counts, confirming persistence.
  - **Outfits:** opened Character Creation fresh, screenshotted the outfit
    row (5 distinct gradient swatches) and cycled all 5 for both genders
    (10 screenshots) — dress shows the apron overlay, tunic-skirt shows a
    two-tone top/skirt split, overalls shows visible bib straps over a
    cream shirt, shawl-dress shows a draped shawl over a plum dress, vest
    shows a triangle vest over lighter sleeves, coat shows a long hem + a
    front seam + collar flap — all 8 styles read as visually distinct in
    the live preview. Confirmed switching gender REBUILDS the outfit row
    (not just re-highlights) to the other gender's 5 presets. Spot-checked
    Maren/Tobin/Henrik/Jonas in the live market square and at the neighbor
    farm — new outfit styles render on NPC body builds/ages without
    clipping or crashes.
  - **Icons:** rendered all new icons in a temporary standalone gallery page
    (`icongallery.html` at the repo root, Vite-served, imported the real
    `art/icons.ts` module) at an enlarged review size, caught and fixed two
    that didn't read clearly at first pass (binoculars looked like two dark
    smudges — lightened the casing + enlarged the lenses; the seed pouch
    read as a piece of fruit — reshaped to a peaked, gathered/tied neck).
    Re-reviewed after fixes, then deleted the gallery file (never
    committed). Cross-checked 12 of the new icons at the ACTUAL in-game
    backpack scale (40px) via the dev bridge's `give()` hook + the real
    backpack window — all readable at that size.
- **Follow-ups:** the seed-pouch and sack icons are serviceable but still
  read a little ambiguously (pouch leans fruit-like, sack leans jug-like) —
  minor, forward-content-only, no mechanic depends on them yet; worth a
  second pass whenever a real seed-pouch/sack mechanic lands.

## Content — crops, seasonal trees & bushes, ambient decorations
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part C content-library commit 1 — 9→18 crops, seasonal
  tree/bush variants, ambient decorations to ~25 kinds. Visuals-only per
  Part C's header rule, except where the existing table-driven systems make
  content live for free (new crop rows are automatically plantable/stockable
  — no shop.ts/farming.ts changes needed).
- **Done:**
  - **Files:**
    - `src/data/crops.ts`: 9 new crop rows (18 total) — `cabbage` (spring+
      autumn, floor 8), `turnip` (winter, floor 5), `pepper` (summer, floor
      15), `squash` (autumn, floor 20), `eggplant` (summer, floor 25),
      `parsnip` (winter, floor 35), `beet` (autumn, floor 45), `glass-gem-corn`
      (autumn, floor 50, premium), `moonmelon` (winter, floor 60, premium).
      Seed price kept at ~50% of produce price throughout, matching the
      original 9's ratio exactly. Winter went from 1 crop (winterroot) to 4
      (turnip/parsnip/winterroot/moonmelon) — the "no season thin" fix;
      autumn is now the richest at 9. New `CropGrowthShape` field
      (`"tall-stalk" | "bushy" | "vine"`) on every row (existing 9 back-filled
      too) driving the field-painter silhouette (see props.ts below).
    - `src/art/props.ts`:
      - `drawCropTile()` gained a `growth: CropGrowthShape` param (default
        `"tall-stalk"`, so old call sites keep the original look) dispatching
        to two new painters: `drawBushyCrop()` (a rounded leafy mound that
        swells with growth stage, fruit peeking once ripe — potato/tomato/
        cabbage/pepper/eggplant) and `drawVineCrop()` (a low trailing ground
        runner with 1-2 round fruits resting beside it — strawberry/pumpkin/
        melon/squash/moonmelon). Corn/carrot/wheat/winterroot/turnip/parsnip/
        glass-gem-corn keep the original upright-stalk painter.
      - `drawTree()`: now `(g, x, y, t, season)`. Added `TreeSpecies` (`default
        | oak | pine | birch`), picked deterministically per tree position
        from the SAME position-seeded rng already driving the per-tree hue
        variation (`drawTrunk()`, `CANOPY_SHAPES` table, `drawDeciduousCanopy()`,
        `drawPineCanopy()`, `drawBareBranches()`, `drawBlossoms()`). Spring:
        blossom flecks on ~50% of default/oak trees, ~30% of birch (pine
        never blossoms). Summer: unchanged original 3-tone canopy. Autumn: a
        `warm()` color-shift toward orange (birch shifts hardest — "reads the
        most golden"), plus ~20% of deciduous trees go "patchy" (drop their
        mid-layer's odd clusters + skip the sunlit top layer entirely, reading
        as thinning/dropping leaves). Winter: deciduous trees go fully bare
        (a drawn 5-branch skeleton + twig forks + a pale frost-dusting fleck
        at each twig tip) — pine is the one evergreen, staying green year-
        round with only a slightly cooler winter tone + a light snow dusting
        band on each conic layer. Verified live (not baked): trees are
        depth-sorted ents drawn fresh every frame from `main.ts`, so a season
        change shows immediately.
      - `drawBush()`: now `(g, x, y, full, t, season)`. New `BUSH_FULL_TINT`
        table shifts a FULL bush's foliage per season (spring fresh green,
        summer original tone, autumn olive/warm, winter grey-brown); picked
        (not-full/already-picked) bushes stay visually constant across
        seasons (already reads bare/muted).
    - `src/art/icons.ts`: added `paintGlassGemCorn()` (same silhouette as the
      classic ear, but each kernel is its own jewel tone) registered for
      `glass-gem-corn`, excluded from the generic tinted-produce mapping
      alongside `corn`. Every other new crop uses the existing generic
      `paintProduce()`/`paintSeedPacket()` painters via its `shape`/`palette`.
    - `src/world/ground.ts`: `scatterAmbientProps()` extended from 3 kinds
      (stones/fallen leaves/mushrooms) to 21, plus a new dedicated
      `scatterWaterEdgeDecor()` pass for 4 more (24 kinds total, close to the
      ~25 target): logs, stumps, twigs, weed tufts, clover patches, pebble
      clusters, daisies/poppies/bluebells/dandelions (via shared
      `drawTinyFlower()` + bespoke `drawBluebell()`/`drawDandelion()`),
      thistle, wildflower clumps (market edges), pinecones/ferns/acorns/moss
      patches (forest floor), hay wisps (farm/road), and — in
      `scatterWaterEdgeDecor()` — cattails + reed clumps along river/lake
      banks, lily pads at the lake's and pond's still-water edge (the pond is
      an ellipse, sampled by angle/radius so pads never land past the
      shoreline — the rect-bounding-box approach was tried first and fixed
      after a close-up screenshot showed the risk), and shells on the lake
      shore specifically. All baked (zero per-frame cost), deterministic
      (fixed seeds), region-gated via the existing `regionAt()` + the same
      rejection-zone `blocked()` check the original 3 kinds use — nothing
      spawns on the field/pond/road/buildings/trees/bushes/point-props.
    - `src/main.ts`: `drawTree`/`drawBush` calls now pass `currentSeason(calendar)`;
      the crop-tile draw call passes `cropById(...)?.growth`. Added a small
      dev-only verification-bridge helper `forcePlot(i, cropId, growth)`
      (same established pattern as the existing `harvestPlot0`) so the three
      growth-shape painters could be screenshotted without a full till/plant/
      water cycle — dev-only, tree-shaken from the production build.
- **Judgment calls:**
  - Growth-shape assignment per crop, and the exact 9 new crop identities/
    floors/seasons, were my picks (grounded in the price-anchor table +
    matching the original 9's seed:produce ratio) — no DECISIONS.md entry
    named specific crops.
  - Ambient water-edge decorations were kept baked/static rather than live
    swaying ents; the FABLE_PROMPT allowed either and the extra per-frame
    ents felt not worth it for how small these read at world scale.
  - Bespoke icon painter added only for glass-gem-corn (the rainbow-kernel
    gag needs one); moonmelon uses the generic pale-round produce painter.
- **Verification:** `npm run build` green. Playwright (dev-bridge `window.__wh`
  — `newGameWith`, `calendar` mutation + `snap()`, `forcePlot`, `openStallDev`)
  against the Vite dev server, screenshots reviewed per season at the forest
  passage, the farm yard, the pond, the lake dock, and the market square:
  spring shows blossom flecks on deciduous trees; summer is the original
  look; autumn reads warm/golden (pines stay green); winter trees are bare-
  but-not-dead with a frost dusting, pines keep a snow-dusted green canopy,
  bushes go grey-brown. Shop buy-list spot-checked in spring/summer/winter —
  each season's new seed rows appear at the right price (e.g. winter: Winter
  root/Turnip/Parsnip/Moonmelon seeds at 5/3/6/11). Forced 7 plots through
  all three growth shapes side by side — tall-stalk, bushy mounds, and vine
  runners with resting fruit read as clearly distinct silhouettes. Ambient
  decorations (logs, wildflowers, lily pads, cattails, reeds, shells, etc.)
  render without overlapping the house/barn/stall/pond/road/trees/bushes.
  One bug caught and fixed during verification: lily pads at the pond
  (ellipse, not a rect) were sampled from the ellipse's bounding box, which
  could place a pad past the shoreline into the grass; switched to angle/
  radius sampling inside the ellipse, re-verified with a close-up screenshot.
- **Follow-ups:** none blocking; ambient-decoration count landed at 24 kinds
  (vs. the ~25 target) — close enough that no further padding felt worth it.

## Cast shadows + outline/shadow audit
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part B commit 3 — diagonal cast shadows (item 3) for tall
  objects, distinct from the existing under-entity ellipse (items 1-2), plus
  an audit of every entity type added this session for outline + ellipse
  coverage, tree canopy tone, and rich-ground-texture reach.
- **Done:**
  - **Files:**
    - `src/art/shapes.ts`: `castShadow(g, footX, footY, halfW, rise)` — a
      skewed dark quadrilateral thrown toward the lower-right (fixed
      upper-left sun), ~16% base alpha (spec: 12-18%). Reads a tiny
      module-level "sun state" (`sunLenMult`, `sunAlphaMult`) set once per
      frame via `setSunFactors()` — the SAME pattern `engine/camera.ts`
      already uses for `lastCam`, chosen over threading hour/minute through
      every painter's signature (would have touched a dozen call sites for no
      real benefit). `getSunFactors()` is a dev-only verification hook.
    - `src/art/daynight.ts` (touched in commit 1, exercised here):
      `shadowFactors(hour, minute)` — shares commit 1's `sampleAt()`
      keyframe interpolator against a SEPARATE table tuned for shadow
      length/alpha: shortest (`CAST_SHADOW_LEN_NOON`=0.55) and near-full
      alpha at solar noon, longest (`CAST_SHADOW_LEN_EDGE`=1.6) at dawn/dusk,
      fading to near-invisible (`CAST_SHADOW_ALPHA_NIGHT`=0.05) at night.
    - `src/engine/camera.ts`: `getLastCam()` (dev-only) — exposes the raw
      camera state for a verification hook that maps a world point straight
      to a canvas pixel.
    - `src/art/buildings.ts`: `castShadow()` added to `drawHouse` (also
      covers the neighbor farm's house — same function, different rect),
      `drawBarn` (ditto, neighbor's barn), `drawStall` (covers all 4 market
      stalls, same function), `drawCottage`, `drawOuthouse`, `drawWell`.
    - `src/art/props.ts`: `castShadow()` added to `drawTree` (the canopy's
      blob shadow, anchored at the trunk base) and to `drawDock`'s two
      mooring posts. Audit fix: `drawBuskSpot`'s upturned hat had NO
      under-entity shadow (it's a small raised object sitting on the
      cobbles, same as every other prop) — added the shared `shadow()`
      ellipse.
    - `src/art/rig.ts`: `castShadow()` added to `drawRig` — a short skewed
      blob, distinct from (and drawn alongside) the existing under-feet
      ellipse. Since NPCs and the player both go through this ONE shared
      rig, this single change covers the player AND all 10 NPCs.
    - `src/main.ts`: `setSunFactors(shadowFactors(calendar.hour,
      calendar.minute))` called once per frame in the world scene's `draw()`,
      right after the ground image and before the depth-sorted entity pass
      (interior scene doesn't call it — no tall silhouettes indoors). Dev
      bridge (verification-only): `shadowFactorsNow()`, `sunFactorsRaw()`,
      `worldToCanvasPx()`.
  - **Audit table** (every entity type added this session — outline / ellipse
    shadow / cast shadow):

    | Entity | Outline | Ellipse shadow | Cast shadow | Notes |
    |---|---|---|---|---|
    | Player + NPCs (shared rig) | ✓ (already) | ✓ (already) | **added** | one shared function covers both |
    | Wildlife: songbird/duck (bird rig) | ✓ (already) | ✓ (already) | n/a | low profile, not in item 3's list |
    | Wildlife: rabbit/hare/deer (quad rig) | ✓ (already) | ✓ (already) | n/a | ditto |
    | Wildlife: butterfly (bespoke shape) | ✓ (already) | ✓ (already) | n/a | ditto |
    | Cow / Hen | ✓ (already) | ✓ (already) | n/a | ditto |
    | House (+ neighbor's) | ✓ (already) | ✓ (already) | **added** | |
    | Barn (+ neighbor's) | ✓ (already) | ✓ (already) | **added** | |
    | Farm stall / 4 market stalls | ✓ (already) | ✓ (already) | **added** | one function, all 5 |
    | Cottages (6) | ✓ (already) | ✓ (already) | **added** | |
    | Well | ✓ (already) | ✓ (already) | **added** | |
    | Outhouse | ✓ (already) | ✓ (already) | **added** | |
    | Dock (deck + posts) | ✓ (already) | reflection substitutes (over water) | **added** (posts) | deck itself doesn't need one — it's flush with the water, not raised |
    | Hedges | ✓ (already) | base-tint substitutes | not applicable | a running wall, not a discrete tall object; the flat base tint already reads as grounded |
    | Trees (farm/forest/roadside) | ✓ (already) | ✓ (already) | **added** | canopy blob shadow |
    | Busk spot (cobbles + hat) | ✓ (already) | **fixed** (was missing) | not applicable | a ground-flush decal except the small hat, which now has one |
    | Festival: lantern poles, harvest clusters | ✓ (already) | ✓ (already) | not applicable (not in item 3's list; short props) | |
    | Festival: bunting | n/a (overhead, not ground-touching) | n/a | n/a | correct as-is |

    Multi-tone tree canopies: verified 3 shades still read (dark under-layer,
    mid-tone body, sunlit top clusters) in the farm AND forest regions — no
    fix needed. Rich ground texture (grass tufts + flower dots): verified it
    extends into the road/neighbor-farm/market gaps (painted before the
    region-specific overlays clip their own footprint) — no flat regions
    found; forest gets its own equally rich dappled-leaf-litter treatment.
- **Build:** `npm run build` — passing.
- **Verification:** headless Playwright against the dev server; this one took
  real debugging (see Rough edges) before I trusted the result.
  - Screenshots at the market square (well + 4 stalls + 6 cottages + 7 NPCs
    all in frame) at noon and dusk, the forest, the road/neighbor-farm strip,
    and a zoomed house+barn crop: every building/tree/NPC/player shows a
    lower-right cast shadow; shadows read visibly longer at dusk than noon;
    zoomed fully in and fully out — no artifacts, no double-shadows.
  - Because the effect is intentionally subtle (~16% alpha, per spec) against
    an already-textured ground, comparing noon vs. dusk screenshots by eye
    was inconclusive at first, and a naive pixel-strip/area-average sampling
    attempt was too noisy (confounded by the ground's own dirt-clump texture
    AND by the separate day/night tint, which is strongest exactly when
    shadows are longest — dawn/dusk). I did NOT declare success on ambiguous
    data: I built an isolated, blank-canvas test (`isolated_shadow_test.html`,
    scratchpad-only, not part of the repo) that calls the exact same
    `castShadow` formula directly with `lenMult=0.55` vs `lenMult=1.0` side by
    side on a plain background — it shows an unambiguous, clearly-longer
    parallelogram on the `1.0` side. Combined with `sunFactorsRaw()`
    confirming the module-level state genuinely differs by time (0.3 night /
    0.55 noon / 1.0 morning-evening / 1.6 dawn-dusk-edge, matching
    `shadowFactors()`'s own output exactly), this confirms the mechanism is
    correct; the in-game subtlety is a deliberate consequence of the spec'd
    low alpha plus a busy, textured background, not a bug.
  - No console/page errors in any pass.
- **Commit:** <hash> — Cast shadows + outline/shadow audit
- **Follow-ups / rough edges:**
  - Verifying this block took several wrong turns worth recording: an hour-6
    vs. noon screenshot comparison was contaminated by the day/night tint
    (also strongest at low sun angles); an ASCII brightness-grid over a wide
    area mostly captured the pre-baked ground's own dirt-clump texture noise,
    not the shadow. The lesson (left here for whoever verifies the next
    subtle low-alpha visual effect): isolate the primitive on a blank canvas
    FIRST, rather than trying to diff two busy, multi-layered screenshots.
  - The busk spot's hat shadow and the dock posts' cast shadows are small
    enough that I couldn't get a clean isolated screenshot of either — verified
    by code-reading + the pattern's success everywhere else it was applied
    (well/cottages/stalls/houses all confirmed visually), not by a dedicated
    screenshot.
  - Dock deck / hedges / festival lantern poles+harvest clusters were audited
    and judged NOT to need a cast shadow (see the table's Notes column) —
    flagged here in case that judgment call needs revisiting later.

## Parallax skyline + ambient particles
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part B commit 2 — at least one distant parallax band beyond
  the world's north edge (rolling hills + tree line + a mountain hint), plus a
  pooled ambient particle system (`src/art/particles.ts`): seasonal drift
  (petals/motes-fireflies/leaves/snow) and a `burst(kind,x,y)` feedback API,
  wired to 3 real actions (catch landed, harvest, skill gain).
- **Done:**
  - **Files:**
    - `src/engine/camera.ts`: `applyCamera()` gains a 5th param `northMargin =
      0` — lets the camera's y-clamp go as low as `-northMargin` instead of
      the historical hard `0` floor. Every existing caller keeps the old
      behavior (default 0); only main.ts's world-scene draw passes
      `CAM_NORTH_SKY_MARGIN`.
    - `src/art/parallax.ts` (NEW): `drawParallaxBand(g, camx)` blits a
      pre-baked (`paintBand()`, same offscreen-canvas technique world/
      ground.ts uses) strip — sky gradient, two hazy mountain ranges
      clustered over the farm's stretch, two rolling-hill layers, and a
      tree-line silhouette flush at the strip's bottom edge — offset by
      `camx * (1 - PARALLAX_FACTOR)` so it scrolls at 0.3x camera speed.
      Placement is a **judgment call grounded in docs**: WORLD_MAP.md's
      intended-feel notes say "the mine entrance is visible on the horizon
      from the farm", so the mountain hint sits over the west (farm) side of
      the band, echoing that future landmark without committing to the still-
      open mine-location decision. The band is exactly `CAM_NORTH_SKY_MARGIN`
      tall so its bottom sits flush at world y=0 — no separate overlap
      bookkeeping (an earlier version used a +40px overlap, which put the
      tree line INSIDE the zone the opaque ground image covers, hiding it
      entirely — caught during verification, see Rough edges).
    - `src/art/particles.ts` (NEW): one fixed-size pool
      (`PARTICLE_POOL_MAX`=160 records, `active` toggles a slot — zero
      per-frame allocation). `updateParticles(dt, season, phase, viewport)`
      tops up the ONE currently-active seasonal drift kind toward its cap
      (spring petals / summer motes by day, fireflies by dusk-night / autumn
      falling leaves / winter snow) and recycles anything that drifts out of
      the (padded) viewport or whose kind no longer matches the season/time —
      so changing season/time cleanly clears the wrong kind instead of
      leaving stragglers. `burst(kind,x,y)` (splash/leafpuff/glint) grabs free
      slots from the SAME pool for a short-lived feedback sparkle. Per-kind
      look/feel numbers (colors, speeds, sizes) are pure art constants in this
      file, matching rig.ts/animalRig.ts's own stated convention; the pool
      caps + burst counts (the numbers that matter for perf/balance) are in
      config.ts. `debugParticleCounts()` is a dev-only verification hook
      (active-slot counts by kind).
    - `src/main.ts`: `draw()` now takes `dt` (passed from `tick()`) so
      particles can advance using the frame's own delta. World scene: camera
      call passes `CAM_NORTH_SKY_MARGIN`; `drawParallaxBand()` is called right
      after the viewport clear, BEFORE `ctx.drawImage(ground,...)`, so the
      opaque ground clips the band's seam; `updateParticles()` runs with the
      just-computed viewport; `drawParticles()` is called after the entity
      pass + hover glow, before the smoke/tint/vignette (world-space,
      depth-agnostic, above ents, below the tint per the brief). Three real
      triggers: `burst("splash", ...bobberSpot())` when a cast resolves
      (`bobberSpot()` is a **judgment call** — `FishingState` doesn't track
      the exact cast point, so it approximates the bobber from the player's
      facing direction, echoing rig.ts's own rod-reach distance);
      `burst("leafpuff", cell.x, cell.y)` on a successful harvest; a new
      `onSkillGain(id, gained)` helper (glint burst + the existing popup/log)
      replacing 5 duplicated `skillGainPopup+logSkillGain` pairs across
      fishing/foraging/busking/cooking/farming — a small reuse cleanup that
      fell out of wiring the single skill-gain trigger. Dev bridge additions
      (all dead-code-eliminated in prod): `enter()` (mirrors the existing
      `leave()`), `particleCounts()`, `harvestPlot0()` (forces plot 0 ripe +
      harvests it — verification-only, lets the leaf-puff burst be exercised
      without a full till/plant/grow cycle).
    - `src/config.ts`: `CAM_NORTH_SKY_MARGIN`, `PARALLAX_FACTOR`,
      `PARTICLE_POOL_MAX`, `PARTICLE_AMBIENT_MAX`, `PARTICLE_FIREFLY_MAX`,
      `PARTICLE_BURST_COUNTS`, `PARTICLE_VIEWPORT_PAD` (added alongside
      commit 1's knobs in the prior commit; only these are exercised here).
  - **Behavior:** Walking near the world's north edge (forest's north end, the
    road's north branch, the roadside trees) now reveals a distant sky band —
    mountains, hills, a tree line — that scrolls slower than the foreground,
    reading as "beyond the world" rather than a static sticker. Elsewhere
    (most of the map) nothing changes — the sky gap simply isn't in view. The
    world now carries sparse, gentle seasonal ambience (petals in spring,
    daytime motes/dusk-night fireflies in summer, falling leaves in autumn,
    snow in winter), plus three feedback sparkles: a splash at the bobber when
    a cast lands, a leaf-puff on harvest, and a tiny gold glint at the player
    on any skill-gain tick.
- **Build:** `npm run build` — passing.
- **Verification:** headless Playwright against the dev server.
  - **Parallax:** screenshotted at two player x-positions 1000px apart near
    the north edge — the mountain/hill silhouette recognizably shifted but far
    less than the foreground (which showed a completely different part of the
    farm), confirming the sub-1x scroll. A mid-map screenshot (well south of
    the edge) showed no sky gap at all. Zoomed fully in and fully out near the
    edge — clean seam, no tiling artifacts, no stretching at either extreme.
  - **Seasonal drift:** rather than eyeballing screenshots for something as
    fine as falling leaves (which can look like the ground's own pre-baked
    leaf-litter decoration at a glance), I added `debugParticleCounts()` and
    read it directly: spring/day -> `{petal:22}`, summer/day -> `{mote:16}`,
    summer/night -> `{firefly:10}`, autumn/day -> `{leaf:22}`, winter/day ->
    `{snow:22}` — each exactly the one expected kind, capped correctly
    (`PARTICLE_FIREFLY_MAX`=10 for fireflies, `PARTICLE_AMBIENT_MAX`=22 for
    the rest), with NO cross-contamination between seasons/times (confirms
    the recycle-on-mismatch logic actually clears stale kinds).
  - **Bursts:** same counter, polled every ~80ms right after triggering each
    action, to catch the brief (0.4-0.65s) burst mid-flight: a real fish catch
    (via the dev bridge's `castPond()`, after giving the player a rod —
    fishing is gated on holding one, a real gate I'd initially forgotten in a
    test, not a bug) showed `{splash:8, glint:6}` (the glint from that same
    catch's skill-gain roll) exactly matching `PARTICLE_BURST_COUNTS`; a
    forced-ripe harvest (`harvestPlot0()`) showed `{leafpuff:7, glint:6}`,
    again exact. Screenshots at the moment of detection show the splash at
    the water's edge and the "Harvested corn!" toast.
  - Combined worst case (autumn leaves near cap + a storm) sampled 150
    `requestAnimationFrame` deltas: avg 16.62ms, max 18.6ms — no fps
    collapse from running both systems together; no console/page errors in
    any pass.
- **Commit:** <hash> — Parallax skyline + ambient particles
- **Follow-ups / rough edges:**
  - `bobberSpot()`'s facing-direction approximation is a stand-in for a real
    tracked cast point; if `FishingState` ever grows an explicit bobber
    x/y (e.g. for a future bite-animation), the splash should read from that
    instead.
  - The parallax band's mountain placement is a judgment call (grounded in
    WORLD_MAP.md's "visible on the horizon from the farm" line) — it isn't
    tied to the still-open mine-location decision, so it may need to move
    once that's settled.
  - Ambient particles update unconditionally, even while paused (same
    look-and-feel call as commit 1's weather layer) — not exercised by an
    automated pause-state assertion.

## Day/night tint + weather visual layer
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part B commit 1 — a continuous (hour+minute, not the 4 stepped
  phases) full-screen day/night color grade, plus rain/storm/fog visual effects
  (streaks, a lightning flash + dark beat, drifting fog banks, a ground-tone
  weather tint), all screen-space composite passes over the finished world
  render, before the HUD.
- **Done:**
  - **Files:**
    - `src/art/daynight.ts` (NEW): `dayNightTint(hour,minute)` blends across
      named color keyframes (deep-blue night -> warm-peach dawn -> neutral day
      -> amber dusk -> night again), continuous across the whole 24h clock, not
      stepped by `currentPhase()`. `paintDayNightTint(g,w,h,hour,minute,milder?)`
      is the one screen-space painter (one `fillRect`, cheap); `milder` (used by
      the house interior) multiplies alpha by `DAYNIGHT_INTERIOR_MULT`.
      `shadowFactors(hour,minute)` — a second keyframe table (shares the same
      `sampleAt()` interpolator) returning `{lenMult,alphaMult}` for Part B #3's
      cast shadows (commit 3): shortest+full at solar noon, longest at dawn/dusk,
      near-invisible at night. Pure functions of numbers — never imports
      `systems/calendar.ts`, so art/ stays decoupled from systems/ per the
      architecture map; main.ts is the only seam reading the live clock.
    - `src/art/weatherfx.ts` (NEW): a fixed-size droplet pool (`MAX_DROPS =
      max(rain,storm count)`, normalized screen-space `nx,ny`, recycled on
      overflow — zero per-frame allocation) + a 3-bank fog array + a lightning
      state machine (`lightningT`/`darkBeatT`). `updateWeatherFx(dt, kind)`
      advances all of it; `drawWeatherFx(g,w,h,kind)` paints (in order) the
      ground-tone tint -> fog banks (radial-gradient ellipses via `g.ellipse()`,
      not a transform trick — canvas gradients are fixed to the CTM active at
      *creation*, so repositioning via translate/scale silently breaks them; the
      earlier version of this file had exactly that bug, caught and fixed during
      verification, see Rough edges) -> rain/storm streaks (wind-slanted,
      storm heavier + more slant) -> the lightning flash + dark beat (storm
      only; no screen shake, per the brief).
    - `src/config.ts`: new "Visual foundation" section — `DAYNIGHT_*` (night/
      dawn/dusk colors+alphas, interior mult), `WEATHER_RAIN_*`/`WEATHER_STORM_*`
      (counts, fall speed, slant, streak length), `WEATHER_FOG_*`,
      `WEATHER_LIGHTNING_*`, `WEATHER_TINT_ALPHA`. (Also pre-added this
      commit's siblings' knobs — `CAM_NORTH_SKY_MARGIN`, `PARALLAX_FACTOR`,
      `PARTICLE_*`, `CAST_SHADOW_*` — since all three commits' tuning was
      planned together; only this commit's knobs are exercised by this diff.)
    - `src/main.ts`: `updateWeatherFx(dt, weather.kind)` runs unconditionally
      every frame (alongside `updateAnimals`/`updateWildlife`, which already ran
      "even behind the opening screens") — a **judgment call**: weather keeps
      gently drifting through dialogue/menu pauses rather than freezing, since
      it reads as ambient atmosphere, not simulated game-time. `draw()` and
      `drawInteriorScene()` each reset the transform and call
      `paintDayNightTint()` (interior passes `milder=true`) right before their
      existing `drawVignette()`; `draw()` (the world scene) also calls
      `drawWeatherFx()`. Dev bridge: added `enter: () => enterHouse()` (mirrors
      the existing `leave`) so verification can reach the interior scene.
  - **Behavior:** The world (and, milder, the house interior) now visibly
    darkens/warms/cools across the day: cool near-black-blue at night, a warm
    lift at dawn, neutral midday, amber at dusk — continuously, not in 4 jumps.
    Rain and storms show wind-slanted streaks (storm: denser + more slanted +
    an occasional lightning flash with a beat of extra darkness after);
    fog shows 2-3 slow drifting haze banks + an overall grey-out. The title
    menu is unaffected (it paints to its own separate `.menu-vista` canvas, not
    `#cv`); the HUD (DOM, outside the canvas) is unaffected either way.
- **Build:** `npm run build` — passing.
- **Verification:** headless Playwright against the Vite dev server (`npx`-
  cached, not added to package.json/package-lock — same ad-hoc approach prior
  WORKLOG entries describe). Forced every weather kind + several times of day
  via the dev bridge (`__wh.calendar.hour/minute`, `__wh.weather.kind` — both
  already live-object references in the bridge, no new setter needed).
  - Screenshots reviewed at dawn/noon/dusk/night and rain/storm/fog — **my own
    verdict:** legible and charming; NOT distracting; HUD/backpack/minimap
    crisp and untouched in every shot.
  - Because the tint reads subtly against the game's already-warm palette at a
    glance, I additionally sampled exact pixel RGBA (not just eyeballed PNGs) at
    a fixed grass point across conditions to confirm the math, e.g. (clear)
    noon `(74,96,45)` -> night `(53,72,48)` (clearly darker, per DECISIONS'
    "~35% darkening" — retuned from a first pass that used too light a night
    color and under-delivered, see Rough edges) -> dawn `(105,117,60)` (a real
    warm lift) -> dusk `(102,105,51)`; rain `(82,108,57)` (cooler) vs clear;
    fog `(104,123,84)` (lighter/desaturated, blue channel jumps furthest).
  - Interior milder tint confirmed the same way: noon `(125,138,153)` -> night
    `(103,116,133)`, a ~20-unit drop vs. the ~45-unit drop the same alpha would
    give at full (non-milder) strength — matches `DAYNIGHT_INTERIOR_MULT=0.45`
    almost exactly.
  - Lightning: probabilistic (~4.5%/sec while storming), so I sampled average
    canvas brightness every 0.5s for 20s during a storm — caught both a bright
    spike (the flash, partially — 0.5s sampling under-catches a 0.2s event's
    true peak) and a dip below baseline (the dark beat), confirming the
    up-ramp/down-ramp/dark-beat state machine actually fires and reads as
    distinct from steady rain.
  - Perf: sampled 120 `requestAnimationFrame` deltas during a storm (the
    heaviest configuration — 200 streaks + fog/lightning logic all disabled
    except the storm's own): avg 16.6ms, max ~19ms — at/near the 60fps (16.7ms)
    budget on this machine; no long-task console warnings; no page errors in
    any screenshot pass.
- **Commit:** <hash> — Day/night tint + weather visual layer
- **Follow-ups / rough edges:**
  - DECISIONS.md's "Weather v1: full — clear/cloudy/rain/storm/fog" lists
    "cloudy", but `systems/weather.ts`'s `WeatherKind` only has clear/rain/
    storm/fog — there's no "cloudy" state to hang a visual on. Adding a new
    weather STATE (table entries, `MOOD_WEATHER_DRAG`, wildlife
    season/weather lists, etc.) is Part A #8 (weather integration) scope, not
    this visual-foundation batch, so cloudy's "drifting soft cloud shadows"
    item is a documented gap, not implemented.
  - The fog-bank draw originally tried to reuse one pre-created gradient via
    `translate`/`scale` (to avoid recreating a `CanvasGradient` every frame).
    That's wrong: gradient coordinates are fixed to the transform active at
    *creation* time, not re-evaluated at fill time, so the reused gradient
    silently painted in the wrong place (nothing visible). Fixed by creating
    the (cheap — 3 max) gradient fresh per bank per frame at its actual
    on-screen position, using `g.ellipse()` for the non-circular shape instead
    of a transform trick.
  - The first tint tuning pass used `DAYNIGHT_NIGHT_COLOR=[18,26,58]` at 0.35
    alpha; because that blue value was brighter than the grass's own blue
    channel, night barely darkened (and the blue channel briefly went *up*).
    Retuned to `[8,14,42]` at 0.4 alpha — reads clearly as night now while
    staying fully legible (DECISIONS: "can act at night").
  - Weather particles/tint update unconditionally, even while paused
    (dialogue/menus/day-end panel) — a look-and-feel judgment call, noted
    above, not exercised by an automated pause-state assertion.

## AI features II — event narration, story arcs, quest stub, improvement notes
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part D commit 2 — the remaining four AI features, each additive
  and fully gated (AI off = zero behavior change): world-event narration (enrich
  existing memorable moments), story-arc weaving (plain-code play-pattern tracker
  whose notes feed the dialogue prompt), a validated quest-generation stub (debug-
  only, hands v2 a working generator), and improvement/dev observations (plain-
  code, token-free, default off).
- **Done:**
  - **Files:**
    - `src/systems/ai/features/narration.ts` (NEW): feature #5. `createNarration({ai,
      toast,attachFlavor})` → `{ enrich, announce, reset }`. `enrich(evt)` fires a
      one-sentence AI narration for a moment that already toasted its scripted line,
      then toasts the narrated line + attaches a Memory Book flavor; `announce(evt)`
      is for NEW moments (season's first storm, birthday) — toasts the authored
      fallback then enriches. Generated once per event key; fully no-op with the
      feature off (existing toasts unchanged).
    - `src/systems/ai/features/arcs.ts` (NEW): feature #6, PLAIN CODE. `createArcs()`
      → `{ recordTalk, recordActivity, notesFor, reset, snapshot }`. Persisted per-NPC
      talk-by-weekday counts + activity counters on `AI_ARCS_KEY` (GAME_KEYS). Detector
      emits short arc notes ("visits me most on Fridays", "fishing is the player's main
      livelihood") past config thresholds. No tokens; notes are only read by the
      dialogue-variation prompt (feature #2), so AI off changes no scripted content.
    - `src/systems/ai/features/questStub.ts` (NEW): feature #3. `createQuestStub(ai)`
      → `{ maybeGenerateDaily, latest, reset }`. At most once per in-game day it builds
      a quest-offer prompt from world state, calls `requestAction`, validates the
      closed `offer_quest` schema, and stores the result for the debug panel ONLY —
      never shown or applied. The prompt builder + validated round-trip is the v2
      generator.
    - `src/systems/ai/features/devNotes.ts` (NEW): feature #8, default OFF, token-free.
      `createDevNotes()` → `{ observe, notes, reset }`. Plain-code counters (per-activity
      last-used day + totals) persisted on `AI_DEVNOTES_KEY` (GAME_KEYS) → human-readable
      observations ("Most-used: fishing", "Fishing last done N days ago — this hook may
      be going cold", "Never tried: …") for the debug panel. AI summarization noted as
      a v2 step in code + the rendered notes.
    - `src/systems/ai/provider.ts`: the mock provider returns a valid `offer_quest`
      action for the `quests` feature (so the stub pipeline is verifiable end-to-end).
    - `src/systems/memories.ts`: `MemoryEntry.flavor?` + `attachMemoryFlavor(m, key,
      flavor)` — the canonical text is never touched; a late-arriving narration adds a
      flavor sentence once.
    - `src/ui/memorybook.ts`: renders the optional flavor line (italic sub-line).
    - `src/ui/debugpanel.ts`: `updateDebugPanel(wc, sections?)` now appends labelled
      text sections ("Latest AI quest offer (v2 preview)", "Dev observations").
    - `src/systems/ai/features/dialogueVariation.ts`: `lastPrompt()` verification helper
      (inspect the grounding sent to the provider).
    - `src/config.ts`: `AI_DEVNOTES_STALE_DAYS` knob.
    - `src/main.ts`: instantiates narration/arcs/questStub/devNotes; wires `arcNotesFor`
      into the dialogue-variation prompt (gated by the arcs feature); records talks
      (onOpen) + activities (fishing/foraging/busking/harvest/cooking/sale) into the arc
      tracker + dev notes; `fireHeart` enriches heart-events via narration; day rollover
      runs the quest stub + season-first-storm + birthday narration; the debug panel gets
      the two new sections; `record()` now returns whether a species was newly
      discovered (drives first-catch narration); New Game resets all four stores; DEV
      `__wh.ai` bridge extended for verification.
  - **Systems / functions:** narration/arc/quest/devNote factories + interfaces; new
    save keys (arcs, devnotes) already in GAME_KEYS; the arc tracker is the only new
    always-on writer (plain code, per-playthrough) — everything else is fully gated.
  - **Behavior:** With AI off, nothing changes anywhere. With AI on: heart-event /
    first-catch / festival / first-storm / birthday moments gain a unique narrated
    sentence (and the Memory Book keeps its canonical entry plus an optional flavor
    line); NPCs' dialogue can subtly acknowledge the player's patterns ("you come by
    most on Fridays"); a validated quest offer is generated daily and shown only in the
    debug panel as a v2 preview; and, when the dev-facing Improvement-notes checkbox is
    turned on, the debug panel lists plain-code observations about play habits.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright (AI off + `?aimock`), 22/22: AI-off produces
  zero flavor / empty arc notes / no quest / devNotes off; AI-on threshold crossing
  attaches a mock-narrated flavor while the Memory Book entry stays canonical, arc
  tracker accumulates and its notes appear verbatim in the dialogue prompt, the quest
  stub yields a validated `offer_quest` in the debug channel, devNotes are off by
  default and render observations once enabled, and New Game empties all four stores;
  zero page errors. (Commit 1's 25/25 re-run green — no regression.)
- **Commit:** <hash> — AI features II — event narration, story arcs, quest stub, improvement notes
- **Follow-ups:** Quest generation is a validated STUB (no player-facing quest UI/
  catalog until the v2 quest block); dev observations are plain-code only (AI
  summarization is a v2 step); narration "replaces" a toast by adding an enriched
  follow-up toast a beat later (instant scripted feedback is preserved, never blocked).

## AI features I — backstories, dialogue variation, inner thoughts, anti-repetition
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part D commit 1 — wire the first four AI features on top of the
  foundation, each with a flat fallback so the game is complete with AI off:
  anti-repetition memory, NPC backstories (authored seed + generate-once richer
  version), the flagship dialogue variation (prefetch + swap-in, never blocking),
  and NPC inner thoughts (daily-refreshed, template fallback). Golden rules: game
  complete with AI off, never block gameplay on a call, everything validated,
  respect the checkboxes/budget/rate caps.
- **Done:**
  - **Files:**
    - `src/systems/ai/antiRepetition.ts` (NEW): feature #7 store. `createAntiRepetition()`
      → `{ recentLines, recordLine, recentScripted, recordScripted, isNearDuplicate,
      reset, size }`. Per-NPC ring buffers of recent AI-line gists + recent authored
      lines; `isNearDuplicate` uses token-set overlap (|A∩B|/min) vs `AI_DEDUP_OVERLAP`.
      Persisted on `AI_ANTIREP_KEY`, added to saves.ts `GAME_KEYS` (per-playthrough).
    - `src/data/backstories.ts` (NEW): authored 2-3 sentence flat-fallback backstory
      per NPC (`BACKSTORY_SEEDS`, all 10) + `backstorySeed(id, name)`.
    - `src/systems/ai/features/backstory.ts` (NEW): feature #1. `createBackstory(ai)`
      → `{ text, seed, isGenerated, ensureGenerated, reset }`. `text()` returns the
      generated version if frozen else the seed; `ensureGenerated(def)` fires ONE
      background request on first interaction, validates, and freezes it in
      `AI_BACKSTORY_KEY` (never rerolled, in GAME_KEYS). Prompt builder co-located.
    - `src/data/thoughts.ts` (NEW): `THOUGHT_TEMPLATES` — ~5 slot-filled thoughts per
      personality (10) + `fillThought()` filling `{season}`/`{weather}`.
    - `src/systems/ai/features/thoughts.ts` (NEW): feature #4. `createThoughts(ai)`
      → `{ current, peek, reset }`. `current(def, wc)` returns today's thought,
      computing a deterministic template first and firing at most one AI refresh per
      NPC per in-game day (lazy, non-blocking; the generated line replaces the
      template for the rest of that day). In-memory (day-scoped, cheap).
    - `src/systems/ai/features/dialogueVariation.ts` (NEW): feature #2, the flagship.
      `createDialogueVariation(deps)` → `{ render, prefetch, isReady }`. `render()` is
      SYNCHRONOUS: returns an already-staged variation (consumed + recorded in
      anti-repetition) for this (npc, purpose, coarse-world-bucket, scripted-hash),
      else the scripted line verbatim and fires an async prefetch. Prompt anchors on
      the scripted line ("re-voice, same meaning, ≤2 sentences") grounded in sheet +
      backstory + current thought + arc notes + relationship tier + season/weather/
      time/region + the anti-repetition exclusions. Session Map (sync lookup layer);
      validation/length-cap via the facade's `request()`.
    - `src/systems/dialogue.ts`: `DialogueChoice.special?: "backstory" | "thought"`
      (engine-level meta choices); `pickLine(set, wc, rotation, avoid?)` — new optional
      `avoid` set skips recently-said authored lines among tied winners (identical to
      the old rotation pick when `avoid` is empty → AI-off unchanged). `renderNpcLine`
      unchanged (still the base seam).
    - `src/ui/dialoguebox.ts`: rewritten to route each line through a `renderLine`
      hook (AI variation) with `renderNpcLine` fallback; opening turn now carries
      "Tell me about yourself" (backstory, marks contact) + "What's on your mind?"
      (thought) meta choices with a sentence-boundary pager for long backstories;
      new hooks `backstoryText`/`thoughtText`/`recentScripted`/`recordScripted`; new
      export `peekOpeningText(def, wc)` (rotation-peek, for proximity prefetch). Lower-
      level `paint()` renderer so pager buttons don't need synthetic DialogueChoices.
    - `src/systems/aiSettings.ts`: `improve` (devNotes) now defaults OFF even when the
      master toggle is on (`freshFeatures`); `saveAiSettings` mutates the cached object
      IN PLACE so the live facade sees setting changes without a rebuild.
    - `src/systems/ai/aiCtx.ts`: `enabled()` treats `?aimock` as master-on (mock is a
      QA/verification switch), so AI paths can be exercised without editing settings;
      a real player is still gated by her own master toggle.
    - `src/systems/saves.ts`: added `AI_ANTIREP_KEY`, `AI_BACKSTORY_KEY`, `AI_ARCS_KEY`,
      `AI_DEVNOTES_KEY` to `GAME_KEYS` (per-playthrough; budget/cache stay per-machine).
    - `src/config.ts`: new AI feature keys + ~20 knobs (anti-rep sizes/overlap,
      prefetch dwell/cooldown, per-feature max-tokens/length caps, thought-bubble
      chance, backstory page size, quest/arc thresholds for commit 2).
    - `src/main.ts`: instantiates the facade (`createAiCtx`) + all feature objects,
      wires the dialogue hooks, resets the AI stores on New Game, adds proximity
      opening-prefetch (`maybeNpcPrefetch`) and the ambient thought bubble
      (`maybeNpcThought`) to the tick, and a DEV-only `__wh.ai` verification bridge.
  - **Systems / functions:** new save keys `wildhearth-ai-antirep/backstory/arcs/
    devnotes-v1`; `AntiRepetition`, `Backstory`, `Thoughts`, `DialogueVariation`,
    `NpcSheet` interfaces; the AI-off path calls no provider and writes no store.
  - **Behavior:** With AI off, dialogue is byte-identical to before, PLUS every NPC
    now offers "Tell me about yourself" (authored backstory, paged) and "What's on
    your mind?" (template thought reactive to season/weather). With AI on (`?aimock`
    or a real key + master toggle): opening lines get re-voiced per NPC once a
    variation is prefetched (never a spinner — scripted shows instantly, the varied
    line swaps in on a later occurrence); lingering near an NPC prefetches their
    opening; each NPC's backstory is enriched once and frozen; thoughts refresh once
    per in-game day and occasionally surface as an ambient bubble; no line repeats.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright (`?aimock` for AI-on + a run with AI off),
  25/25 checks: AI-off dialogue opens instantly with scripted text and identical
  choices, backstory choice shows authored text, thought shows a template, stores
  stay empty; AI-on backstory generated once + persisted + not rerolled, variation
  staged by prefetch and swapped in on the next open (differs from scripted),
  anti-repetition grows, thought stable within a day and recomputes on rollover,
  New Game wipes anti-rep + backstory stores, devNotes off by default, zero page
  errors in both runs.
- **Commit:** `c4242c0` — AI features I — backstories, dialogue variation, inner thoughts, anti-repetition
- **Follow-ups:** Story-arc notes feed the dialogue-variation prompt but are empty
  until commit 2 wires `arcNotesFor`. Commit 2 adds event narration, the arc
  tracker, the quest-generation stub, and dev observations.

<!--
## [BLOCK-ID] Short title
- **Date:** YYYY-MM-DD
- **Block given:** <paste the exact block/prompt that was handed to the agent>
- **Done:**
  - **Files:** <every file created/changed — one line each, what and why>
  - **Systems / functions:** <new or changed functions, types, save keys>
  - **Behavior:** <what a player can now see or do that they couldn't before>
- **Build:** `npm run build` — ✅ passing / ❌ failing (+ notes)
- **Commit:** <hash + message — fill in after committing>
- **Follow-ups:** <deferred items / TODOs / open decisions — "none" if none>
-->

## AI foundation — provider, budget, cache, validator, test connection
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part D commit 1 — build the AI infrastructure ONLY (no
  gameplay feature wiring; the next block does that), following
  docs/AI_ARCHITECTURE.md. Three providers behind one interface (anthropic
  browser-direct via plain fetch, deterministic mock, off), a monthly token
  budget ledger on its own key, per-NPC/per-session + global rate caps, a
  persisted response cache, the closed NpcAction schema + validators, a facade
  that wires them, an enabled Settings "Test connection" button, and a `?aimock`
  deterministic mode. The game must behave identically with AI off (default).
- **Done:**
  - **Files:**
    - `src/systems/ai/provider.ts` (NEW): `AiProvider { complete(req): Promise<AiResult> }`
      with three factories — `anthropicProvider(key, depth)` (browser-direct
      `fetch` to `api.anthropic.com/v1/messages`, headers `x-api-key` /
      `anthropic-version: 2023-06-01` / `anthropic-dangerous-direct-browser-access:
      true`; minimal `{model,max_tokens,system,messages}` body — no
      temperature/top_p/thinking so one shape works on every tier; 8s abort
      timeout, one retry on 429/5xx with backoff, typed `AiErrorKind` results,
      never throws), `mockProvider(deterministic)` (seeded mulberry32 canned
      lines, zero network, answers the connection test with "The hearth is
      warm."), `noneProvider()` (instant `ai-off`). Plus `estimateTokens()` and
      `aiMockRequested()` (`?aimock`). **Deviation from AI_ARCHITECTURE §2:** plain
      fetch, not `@anthropic-ai/sdk`, to keep the bundle lean.
    - `src/systems/ai/budget.ts` (NEW): `createBudget(monthlyTokenBudget, now)` →
      `{ canSpend, record, snapshot }`; ledger `{monthKey,inputTokens,outputTokens,
      callCount}` persisted on its OWN key `AI_BUDGET_KEY` (not GAME_KEYS), resets
      on month change; budget 0 = unlimited (a zeroed value must never brick AI).
    - `src/systems/ai/rateLimit.ts` (NEW): `createRateLimiter(keyPerSession,
      globalPerMin, now)` — per-key (npcId or feature) session cap + a sliding
      60s global cap; only counts a call when it's allowed.
    - `src/systems/ai/cache.ts` (NEW): `createCache(max, now)` — persisted LRU
      (own key `AI_CACHE_KEY`) with per-entry TTL; `cacheKey(feature,npcId,salient)`
      FNV-1a hash. De-dupes identical moments so a mashed choice doesn't re-bill.
    - `src/systems/ai/schema.ts` (NEW): the closed `NpcAction` union
      (say / sell / haggle_response / offer_quest / gossip / teach / memory_update)
      + `validateNpcAction(input, refs?)` (strict type/enum/extra-field/bounds/id
      checks, rejects oversized text, sanitizes markup, cheap off-character
      heuristic; optional referential checkers for when catalogs land) and
      `validateText(raw, maxLen)` (sanitize + cap for prose). Pure, no I/O.
      **Deviation from §5:** `offer_quest.reward` is a bounded coin count, not a
      structured Reward object (no reward-item catalog yet).
    - `src/systems/ai/aiCtx.ts` (NEW): the facade `createAiCtx(settings, opts)` →
      `{ enabled(feature), request(feature,spec), requestAction(feature,spec),
      testConnection() }`. Pipeline: `enabled()` gate → cache → rate → budget →
      provider → record → validate. With AI off `enabled()` is false and callers
      never await. `testConnection()` builds a provider directly so a key can be
      validated before the master toggle is flipped on; a single budget toast per
      month via an injected `onToast`. Explicit-passing, no singletons.
    - `src/systems/ai/index.ts` (NEW): barrel for the public surface.
    - `src/config.ts`: AI knobs — `AI_BUDGET_KEY`, `AI_CACHE_KEY` (own keys),
      `AI_ANTHROPIC_URL`/`_VERSION`, timeout/retry, `AI_MODEL_BY_DEPTH`
      (standard→`claude-haiku-4-5-20251001`, rich→`claude-sonnet-5`,
      deepest→`claude-opus-4-8`), cache size + per-feature TTLs, rate caps, and
      validation bounds.
    - `src/systems/aiSettings.ts`: added the depth dial `depth: "standard" |
      "rich" | "deepest"` (+ `AI_DEPTHS`), migrated the store v1→v2 (old saves
      default to "standard").
    - `src/ui/settingsscreen.ts`: added the "Response depth" segmented row; enabled
      the previously-disabled "Test connection" button (builds a fresh facade,
      awaits `testConnection()`, shows "Connected — the hearth is warm." or a typed
      inline error via `testErrorMessage()`).
    - `index.html`: `.set-feedback.set-ok/.set-err` colors; `.set-inline` wraps.
  - **Systems / functions:** two new localStorage keys deliberately OUTSIDE
    saves.ts GAME_KEYS (spend ledger + response cache are per-machine, survive New
    Game, like aiSettings). No gameplay system calls the layer yet.
  - **Behavior:** unchanged with AI off (the default) — zero calls, no console
    noise, bundle grows only by the new modules. In Settings, the AI section now
    has a working depth dial and a live "Test connection" button (real request
    with a key; instant success under `?aimock`; clean typed error for a bad
    key / network / no key).
- **Build:** `npm run build` — ✅ passing.
- **Verification:** temporary esbuild-bundled Node harness (stubbed
  localStorage/fetch, then removed): 37/37 assertions — schema accepts a valid
  say-action and rejects wrong-enum / extra-field / oversized-text /
  off-character / bad-reward, sanitizes markup, parses JSON strings, and
  `validateText` caps; budget accumulates and gates at the cap and rolls over on
  month change (0 = unlimited); a cache hit avoids the provider call (1 call for
  3 identical requests) and expires past TTL, LRU caps size; rate limiter trips on
  both per-key and global caps; with AI off `enabled()` is false and `request`
  short-circuits to `ai-off`; `?aimock` + `testConnection()` returns "The hearth
  is warm."; the facade caches an identical second request and gates on budget
  with exactly one toast; a garbage key surfaces a clean `auth` error and a fetch
  throw a `network` error (no uncaught rejections). Vite dev transforms of
  main.ts / settingsscreen.ts / aiCtx.ts all 200 (no page errors).
- **Commit:** <hash + message — fill in after committing>
- **Follow-ups:** next block wires real features (backstory/dialogue/thoughts/
  narration) onto this layer; anti-repetition store (D7) and referential
  `ActionRefs` checkers arrive with the NPC/quest catalogs; prompt-caching
  breakpoints (stable system+sheet prefix) to add once prompt builders exist.

## Pause screen + Exit dialog + return to main menu
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part E #6-7, third of three commits. A Pause screen (Esc + a
  ⏸ HUD button, freezing game-time like dialogue) with Resume / Save / Settings
  / Return to Main Menu (confirm, autosaves first) / Exit; and the Exit dialog
  (DECISIONS' three: "Exit to main menu" in-game, "Exit fully" → try
  window.close() then a warm farewell, "Switch to another game" greyed for v5).
  Returning to the menu must tear the play session down cleanly; a
  location.reload() after autosave is the accepted pragmatic teardown.
- **Done:**
  - **Files:**
    - `src/ui/pausescreen.ts` (NEW): `showPause(ctx)` — a dimmed-scrim overlay
      (the frozen farm shows through) with the five buttons; Save flashes
      "Saved ✓" and stays; Esc resumes (its handler is added mid-dispatch so it
      never catches the same Esc that opened it). Pure DOM; main wires actions.
    - `src/ui/exitscreen.ts` (NEW): `showExitDialog(ctx)` — "Exit to main menu"
      (only when `fromGame`), "Exit fully" (calls `onSaveBeforeExit`, tries
      `window.close()`, then always falls back to `showFarewell` since browsers
      block close() for a tab they didn't open), "Switch to another game"
      (disabled, tooltip "arrives with multiple characters — v5"), and Back/Esc.
    - `src/main.ts`: pause/exit orchestration — `openPause` (guarded to live
      free play only: not over the opening flow, another menu, a time-skip fade,
      or dialogue/shop/day-end/guidance overlays), a window-level Esc handler
      (in-game overlays own Esc on the capture phase, so this bubble handler only
      fires in free play), `showPauseScreen` (re-renders itself as the return
      target for in-game Settings + Exit), `returnToMainMenu` (a `menuConfirm`
      → `manualSave()` + `location.reload()`; cancel just drops the scrim and
      reveals Pause), a factored `inGameSettingsCtx(onBack)` + `closeInGameMenu`
      shared by the ⚙ button and Pause→Settings, and the title Exit button now
      opens the Exit dialog (`fromGame:false`, so "Exit to main menu" is hidden).
      Imports trimmed: `showFarewell` dropped (exitscreen.ts owns it now),
      `menuConfirm` added.
    - `index.html`: the ⏸ `#pauseBtn` in the tools row; Pause (`#opening.paused`
      dimmed scrim + `.pause-panel`/`.pause-feedback`) and Exit (`.exit-panel`)
      CSS on the existing tokens.
  - **Systems / functions:** no new save key. The in-game menu gate is the
    existing `menuOpen` flag (added in commit 2's Settings work) — Pause and the
    Exit dialog set it, so game-time and the townsfolk freeze while either is up.
  - **Behavior:** Esc or the ⏸ button pauses the game (clock + NPCs freeze) over
    a dimmed view of the farm. Save saves in place; Settings opens over pause and
    returns to it; Return to Main Menu confirms, autosaves, and reloads to the
    title where Continue picks the game straight back up; Exit opens the
    three-way dialog. "Exit fully" saves and shows the warm "The farm will wait
    for you — you can close this tab" farewell. The title's Exit button opens the
    same dialog without the in-game-only "Exit to main menu" option.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright (17/17): Esc AND the ⏸ button open Pause
  and freeze the clock (360→360), which runs again on Resume (360→363); Save
  from pause restamps the manifest + flashes "Saved ✓"; Settings from pause
  returns to pause; the in-game Exit dialog shows Exit-to-menu + Exit-fully with
  Switch disabled; Exit fully shows the farewell (window.close stubbed, as the
  browser would block it); Return to Main Menu confirms (cancel keeps pause),
  reloads to a title with Continue enabled, and Continue resumes into the world;
  the title Exit dialog hides "Exit to main menu". Zero page/console errors.
  Reviewed screenshots confirm the pause-over-frozen-farm and exit-dialog looks.
- **Commit:** `<fill>` — Pause screen + Exit dialog + return to main menu
- **Follow-ups:** Return-to-menu uses `location.reload()` after autosave as the
  deliberate clean-teardown choice (a full in-memory session teardown across
  ~15 stores + the rAF loop would be far riskier for no player-visible gain);
  re-entry via Continue needs no page reload of its own. This completes Part E.

## Settings screen — time, gameplay, interface, audio, AI, saves
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part E #3, second of three commits. A full Settings screen
  reachable from the title AND in-game (⚙ HUD button, pausing time like
  dialogue): Time (day-length slider), Gameplay (end-of-day summary + guidance,
  respecting the one-way tutorial rule), Interface (HUD widget toggles, font
  size, high contrast, colorblind hook), Audio (stored-but-inert sliders), AI
  companion (the settings surface for the coming AI layer — master toggle, BYOK
  key, budget, 8 per-feature toggles, disabled Test connection), and Save
  management (save now / double-confirm delete / slot glance / locked language).
  Everything persists immediately; live-applying where possible.
- **Done:**
  - **Files:**
    - `src/ui/settingsscreen.ts` (NEW): `showSettings(ctx)` on the shared
      `screenShell`. Builders for slider/segmented/checkbox/select/volume rows.
      Day-length slider maps 8-48 real min/day → `dayLengthSeconds`; EOD +
      guidance segmented (Tutorial disabled + tooltipped when
      `tutorialAvailable` is false); Interface toggles call `applyHudPrefs()` /
      `applyGlobalPrefs()` live; Audio sliders write inert volumes under an
      honest "(no sound yet)" note; the AI block reads/writes `aiSettings.ts`
      (masked key + show/hide eye, number budget, 8 checkboxes greyed until the
      master is on, disabled Test connection tooltip "arrives with the AI
      layer"); Save block shows the slot manifest, Save now (with a "Saved ✓"
      flash), a two-modal `menuConfirm` double-confirm Delete, and a locked
      English `<select>`.
    - `src/systems/aiSettings.ts` (NEW): its OWN versioned key
      `wildhearth-ai-v1`, deliberately NOT in saves.ts's GAME_KEYS (survives New
      Game). `AiSettings` { enabled(false), apiKey(""), monthlyTokenBudget,
      features:Record<8,boolean> }, `AI_FEATURES` (the eight Part-D use cases),
      tolerant `loadAiSettings`/`saveAiSettings`/`setAiFeature`.
    - `src/ui/uiPrefs.ts` (NEW): `applyGlobalPrefs()` (stamps <html> with
      `font-large` / `high-contrast` classes + a `data-cb` colorblind attribute
      — the single future palette attachment point) and `applyHudPrefs()`
      (shows/hides #needsStrip / #minimapBox / #clockDial). Both read settings.ts.
    - `src/systems/settings.ts` (EXTENDED, v1→v2): new `hudNeeds`/`hudMinimap`/
      `hudClock`, `fontSize`, `highContrast`, `colorblind`, `volMusic`/`volSfx`/
      `volAmbient` fields with validators; additive migration (merge fills
      defaults). `FontSize`/`Colorblind` types.
    - `src/config.ts`: `DAY_LENGTH_MIN_MIN`(8)/`DAY_LENGTH_MAX_MIN`(48),
      `AI_SETTINGS_KEY`, `AI_TOKEN_BUDGET_DEFAULT`(200000).
    - `src/main.ts`: real `openSettingsFromMenu` (replaces the commit-1
      placeholder — `screenShell` import dropped) and `openSettingsInGame`
      (sets a new `menuOpen` flag → included in `timePaused`, drains queued
      input on close); `deleteSaveToTitle` (clearSavedGame + `location.reload()`
      for a guaranteed-clean teardown); the ⚙ `#settingsBtn` wired;
      `applyGlobalPrefs()` + `applyHudPrefs()` run once at boot.
    - `index.html`: the ⚙ `#settingsBtn` in the tools row (now `flex-wrap`);
      a Settings-screen CSS block (sections/rows/segmented/checkbox/slider/AI
      grid/danger button) + the accessibility block (`:root{--ui-fs}` font
      scale on key text, `:root.high-contrast` token overrides).
  - **Systems / functions:** new persistent key `wildhearth-ai-v1` (NOT game
    state); settings key bumped to v2 (additive). Live gate: `menuOpen` joins
    the `timePaused` set so in-game Settings freezes the clock + townsfolk.
  - **Behavior:** the ⚙ button (and the title menu's Settings) opens the screen;
    in-game it pauses time until closed. Day length changes the clock's pace on
    the spot; the summary/guidance choices apply live (Tutorial can't be picked
    once left); HUD toggles hide/show their widgets immediately; Large font and
    High contrast visibly restyle the UI and survive reloads; the AI key is
    masked with a reveal eye and stored only locally; Delete asks twice, then
    wipes the save and boots to a fresh title with Continue disabled. Every
    control persists the instant it changes and comes back after a reload.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright (26/26): Settings opens from the title;
  a spread of changes (needs-strip off, Large font, High contrast, Full summary,
  Aspiration, day length → 8, AI key + budget) all persist to localStorage and
  come back after a reload; `font-large`/`high-contrast` classes apply live and
  re-apply at boot; the AI key is `password` then `text` after the eye; in play
  the needs strip is hidden, the clock advances ~7 in-game min in 2.2s at 8
  min/day (proving the slider changes clock speed), and opening in-game Settings
  freezes the clock (368→368) then resumes; Delete double-confirms then reloads
  to a title with Continue disabled and the save key gone; zero page/console
  errors. Reviewed screenshots confirm clean section layout (incl. a fixed
  flex-basis bug that had ballooned the "AI features" label height).
- **Commit:** `<fill>` — Settings screen — time, gameplay, interface, audio, AI, saves
- **Follow-ups:** Audio + colorblind are honestly inert in v1 (stored, labeled
  "coming soon"/"no sound yet"); the AI Test-connection + feature calls light up
  with the AI layer (next block) reading `aiSettings.ts`. Font scale is applied
  to the menu/screen/dialogue/settings text surfaces (the readable UI), not
  every px in the in-world HUD. Pause + the Exit dialog + Return-to-menu are
  commit 3.

## Main menu — painted vista, logo, What's New, Help, Credits
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Part E #1-5, first of three commits. Replace the plain title
  gating with a real main title screen: a code-drawn dawn-farm vista + animated
  "Wildhearth" logo, and the button column (Continue with the save-slot glance,
  New Game with overwrite-confirm, What's New with an unseen badge, Settings,
  Help, Credits, Exit). Add a data-driven What's New changelog, a paged Help /
  Guide, and a Credits scroll. Settings + Exit are placeholders here (real
  screens land in commits 2-3).
- **Done:**
  - **Files:**
    - `src/art/vista.ts` (NEW): `drawVista(g,W,H,t)` — a warm sunrise farm scene
      (dawn gradient sky, low glowing sun with a breathing halo, drifting wrap-
      around clouds, gliding birds, three parallax hill bands, a farmhouse
      silhouette with lit windows + rising chimney smoke + a long dawn shadow,
      two trees, a leaning broken fence, a full-frame warm vignette).
      `drawLogo(g,cx,cy,scale,t)` — the "Wildhearth" wordmark in a warm gold
      gradient with a dark rounded outline + soft shadow + sheen, gently bobbing,
      with a heart-and-sprout motif above. All procedural (no assets).
    - `src/ui/mainmenu.ts` (NEW): `showMainMenu(cfg)` — full-screen vista canvas
      (its own rAF loop, self-stops when its canvas is disconnected; refits on
      resize) + a floating wood/gold button column. Continue shows
      "Season · Day N · C coins · saved Xh ago" from the slot manifest (disabled
      + dimmed with no save); New Game confirms an overwrite via `menuConfirm`
      when a save exists; What's New carries a `.menu-badge` with the unseen
      count. Arrow-key up/down focus nav. Also exports `menuConfirm` and
      `showFarewell` (the warm "you can close this tab" screen, reused by the
      commit-3 exit dialog).
    - `src/data/changelog.ts` (NEW): `CHANGELOG` — 10 player-facing milestones
      mined from this WORKLOG (character creation, wildlife, Maren's stall, the
      Harvest Festival, end-of-day summary, dialogue, relationships, needs, the
      4×-bigger world + townsfolk, the founding farm), newest first with integer
      ids. `newestChangelogId`/`unseenChangelogCount`/`isEntryNew`/
      `markChangelogSeen` drive the NEW tags + the menu badge against the new
      `settings.lastSeenChangelogId`.
    - `src/data/help.ts` (NEW): `HELP_PAGES` — five honest pages (Moving & doing
      things / Making a living / Looking after yourself / The market & townsfolk
      / Seasons, saving & settings).
    - `src/ui/whatsnew.ts`, `src/ui/helpscreen.ts`, `src/ui/credits.ts` (NEW):
      the three back-able screens. What's New snapshots the NEW set for the
      current view then marks all seen (clearing the badge); Help is tabbed;
      Credits is a short warm scroll ("made with love … all art drawn in code").
    - `src/ui/screen.ts` (NEW): `screenShell(title,onBack,opts)` — the shared
      wood/gold panel with a ‹ Back header + scrollable body; Esc and Back both
      return. Used by all four top-level screens (Settings reuses it in commit 2).
    - `src/ui/titlescreen.ts` (TRIMMED): `showTitle` removed (superseded by
      mainmenu.ts); keeps the shared `openingRoot`/`hideOpening` (the latter now
      also clears the overlay's class).
    - `src/systems/settings.ts` (EXTENDED): new `lastSeenChangelogId` field
      (default 0, junk-guarded) — additive, no version bump needed (load merges
      defaults). Survives New Game (settings are not game state).
    - `src/main.ts`: boot now calls `openMainMenu()` (was `showTitle`); the New
      Game chain is factored into `startNewGameFlow()`; Continue → `continueGame`;
      Settings → an inline `screenShell` "arriving in the next update" placeholder
      (commit 2 replaces it); Exit → `showFarewell` (commit 3 adds the dialog).
    - `index.html`: a Main-menu + back-able-screens CSS block (vista/overlay/
      button column, two-line Continue, badge, confirm modal, farewell, screen
      shell, What's New / Help / Credits styles), all on the existing tokens.
  - **Systems / functions:** no new save key; `lastSeenChangelogId` rides the
    existing settings key.
  - **Behavior:** at boot the player sees a warm animated sunrise-farm title
    screen with the gold Wildhearth logo. Continue is live only when a save
    exists and shows its season/day/coins/last-saved; New Game over a save asks
    to confirm the overwrite first, else goes straight to Character Creation.
    What's New lists the 10 updates with NEW tags on anything unseen and a count
    badge on the button that clears once opened. Help pages explain the game
    honestly; Credits is a short thank-you. Esc backs out of every sub-screen.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright (17/17): all 7 buttons present; Continue
  disabled with no save then enabled + showing "Spring · Day 1 · 50 coins ·
  saved just now" after a save + reload, and clicking it loads into live play
  (overlay hidden, scene "world"); vista canvas confirmed painted (pixel
  sample); What's New lists all 10 with 10 NEW tags and the badge (10) clears
  after viewing; Help shows 5 tabs and switches; Credits renders; New Game over
  a save shows the confirm dialog; New Game with no save reaches Character
  Creation; Esc navigation works throughout; zero page/console errors. A
  reviewed screenshot confirms the vista reads warm, legible, and inviting.
- **Commit:** `<fill>` — Main menu — painted vista, logo, What's New, Help, Credits
- **Follow-ups:** Settings + Exit are intentional placeholders this commit
  (Settings → a "coming soon" panel; Exit → the farewell screen directly). The
  ⚙ in-game Settings button (commit 2) and ⏸ pause / exit dialog / return-to-
  menu (commit 3) are the next two commits.

## Guidance Mode — tutorial steps, aspiration chains, none
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Guidance Mode engine (FABLE_PROMPT Part A #5 + Part E #5).
  Add the three-way picker (Tutorial / Aspiration / None) after the path choice;
  a Tutorial mode with the 4-step skeleton (wording per path), game-time paused
  while a step bubble is up, a persistent Help (?) icon, Skip = one-way switch
  to None (confirm first), progress persisted with a "Continue the tutorial?"
  load prompt, and completion → silent switch to None + a Memory Book entry +
  farewell; an Aspiration mode with one 3-step chain per path + a life-goal
  flavored line shown as a dismissible objective pill; and None = nothing. The
  mode is a live setting; switching TO Tutorial is blocked once left. Second of
  two interlocking commits (built on the Character Creation flow).
- **Done:**
  - **Files:**
    - `src/systems/settings.ts` (CHANGED): `guided: boolean` → `guidance:
      Guidance` ("tutorial"|"aspiration"|"none"), with a migration of the legacy
      boolean (guided → gentle Aspiration, open → None — never revives a forced
      tutorial on a mid-game save). New `guidanceMode()` / `setGuidance()`;
      `isGuided()` removed.
    - `src/systems/guidance.ts` (NEW): the engine's PROGRESS half — a
      per-playthrough `GuidanceProgress` store (own versioned `GUIDANCE_KEY`,
      in GAME_KEYS so New Game wipes it). Pure state + logic returning
      `GuidanceResult` (toasts / memories / advance / finishedTutorial):
      `loadGuidance`/`saveGuidance`/`resetGuidance`, `startTutorial`/
      `startAspiration`, `markLeftTutorial`, `tutorialInProgress`,
      `tutorialAvailable`, `currentTutorialStep`, `currentAspiration`,
      `notifyGuidance` (events → step progress), `tickGuidanceCoins`
      (coins-threshold steps).
    - `src/data/guidance.ts` (NEW): all content — `tutorialSteps(path)` (the
      4-step skeleton, step-1 wording per path), `aspirationChain(path)` (3-step
      chains: Fisher catch 3→sell→save 40; Farmer plant 3→harvest→repair/expand;
      Musician busk 3→30 from tips→buy; Keeper cook 2→sell→save 45),
      `aspirationDoneMemory`, and `lifeGoalAspirationLine` (the five life-goal
      flavor lines).
    - `src/ui/guidance.ts` (NEW): all DOM — the three-way `showGuidancePicker`,
      the tutorial step bubble (`setTutorialBubble`, dismiss/Help toggle,
      `tutorialBubbleShown` for the clock gate), `setHelpVisible`, the dismissible
      aspiration `setAspirationPill`, and the shared modal
      `showGuidancePrompt`/`hideGuidancePrompt`/`isGuidancePromptOpen` (used for
      both the Continue-Tutorial load prompt and the Skip confirm).
    - `src/ui/newgame.ts`: the interim `showTutorialToggle` removed (the picker
      replaces it).
    - `src/systems/saveSlots.ts`: manifest `guided?: boolean` → `guidance?:
      Guidance` (migrated on read); `stampSave` takes the mode.
    - `src/systems/interact.ts`: `InteractCtx.guidanceEvent` added; fired on a
      repair and on a plot expansion (Farmer aspiration "repair or expand").
    - `src/systems/saves.ts`, `src/config.ts`: `GUIDANCE_KEY` +
      `TUTORIAL_MOVE_SECONDS` (3).
    - `src/main.ts`: the guidance orchestration (`refreshGuidanceUI`,
      `applyGuidanceResult`, `fireGuidance`, `tickGuidance`,
      `startGuidanceForNewGame`, `skipTutorial`, `continueGame`,
      `guidanceClockFrozen`); the New-Game flow ends at `showGuidancePicker`;
      `newGameReset(character, mode)` sets the mode + wipes progress; real action
      handlers (catch/plant/harvest/busk/cook) + the shop sale/buy callbacks +
      move fire guidance events; the in-game minute loop is gated by
      `guidanceClockFrozen()`; `timePaused` includes the guidance prompt; the
      old `firstTip()`/first-catch hint removed; a factored `makeCtx()`; dev
      bridge gains `guidance()`, `guidanceMode()`, `fireG`, `castPond`,
      `openStallDev`, `newGameWith(path, mode)`.
    - `index.html`: DOM + wood/gold chrome for the tutorial bubble, Help icon,
      aspiration pill, and the shared guidance modal.
  - **Systems / functions:** new save key `wildhearth-guidance-v1`; `Guidance`
    type; the Guidance engine + content; `GuidanceEvent` union
    (move/catch/plant/harvest/busk/cook/sale/buy/repair). Time-freeze: the
    in-game clock (needs decay + day rollover) pauses while a tutorial step
    bubble is shown; movement/actions stay live so steps can complete.
  - **Behavior:** After choosing a path, the player picks Tutorial, Aspiration,
    or None. **Tutorial** shows a transparent step bubble (get your bearings →
    do your path's action → sell → buy), pausing game-time while it's up; a "Got
    it" hides it (time resumes) and a persistent Help (?) re-shows it; "Skip
    Tutorial" asks to confirm, then switches to None one-way (never returns);
    finishing all four steps quietly switches to None with a congratulation, a
    Memory Book entry, and "The farm is yours. Make of it what you will."
    Reloading mid-tutorial asks "Continue the tutorial?" (Yes / Aspiration /
    None). **Aspiration** shows a small dismissible objective pill for a 3-step
    chain drawn from the path (plus a one-time life-goal line); each step
    completes on the real action and toasts, and finishing logs a Memory Book
    entry — no rewards beyond flavor. **None** shows nothing. The mode is a live
    setting the future Settings screen can write.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright drove the real game (36/36 + a 5-check
  full-UI smoke): Tutorial (Fisher) — all four steps completed on the REAL
  action (real WASD walking, a real fishing catch, a real stall sale, a real
  stall purchase), the in-game clock froze while the bubble was up and resumed
  on dismiss, Help re-showed it, finishing switched to None + logged the Memory
  entry + locked the tutorial; Skip confirmed and switched one-way; a
  mid-tutorial reload showed the "Continue the tutorial?" prompt and resumed;
  Aspiration showed the objective pill and its first step completed on real
  catches then advanced; None stayed clean; and the full New-Game UI reached
  play through the three-way picker. Zero page/console errors.
- **Commit:** `<fill>` — Guidance Mode — tutorial steps, aspiration chains, none
- **Follow-ups:** The Settings screen that would let the player switch modes
  mid-game is a later block — the setting + `tutorialAvailable()` guard are live
  and ready for it. Aspiration's "sell to Maren" / "buy something nice" steps
  accept any sale / any purchase (not a specific NPC/item) in v1.

## Character creation — identity, appearance presets, paths & life goals
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** Character Creation flow v1 (FABLE_PROMPT Part A #10 + Part E
  #4). Replace the MVP's single-tool newgame placeholder with the real flow:
  identity (name/age/gender), curated appearance presets with a live rig
  preview + Randomize, four Starting Paths (Fisher/Farmer/Musician/Animal-
  Keeper) each granting a kit + seeding a skill, and a five-option Life-goal.
  Re-order per DECISIONS "Opening flow" + VISION: creation → intro → farm
  reveal → path + life-goal → guidance → play. Persist a versioned, tolerant
  `character` on meta; old (pre-character) saves keep working via a synthesized
  default. First of two interlocking commits (guidance engine follows).
- **Done:**
  - **Files:**
    - `src/systems/meta.ts` (EXTENDED): new persisted types `Gender`, `Path`
      (fisher/farmer/musician/keeper), `LifeGoal` (family/independence/
      community/mastery/fortune), `Appearance` (rig-relevant subset),
      `CharacterIdentity`, `Character`. `StarterTool` gains `"pot"` (Keeper).
      `Meta` now carries `character: Character | null`. `DEFAULT_APPEARANCE`
      (the straw-hat farmer), `characterForPath()`, and a tolerant
      `loadMeta`/`saveMeta` that revives a stored character field and, for old
      saves that only have a `starterTool`, **synthesizes** a default character
      (tool→path) so downstream code always has one. `saveMeta` keeps
      `starterTool` in sync with `character.path`.
    - `src/entities/player.ts` (CHANGED): `DEFAULT_PLAYER_RIG` is now derived
      from `rigFromCharacter(null)`; new exported `rigFromCharacter(c)` builds a
      `RigParams` from a character's `Appearance` (fixed v1 scale/adult profile/
      neutral limbs), falling back to `DEFAULT_APPEARANCE`.
    - `src/data/paths.ts` (NEW): the four `PATHS` (title, tool, iconId, seeded
      skill, kit, blurb, note), `STARTER_FOOD` (berries ×3 — the universal 2-3
      days of food), `pathById()`, plus `LIFE_GOALS` + `lifeGoalById()`.
    - `src/ui/charcreation.ts` (NEW): `showCharacterCreation(onDone)` — the
      identity+appearance screen. Name inputs (first/last/optional nickname,
      capped) + 🎲 Randomize, age stepper (18-70), gender toggle, and curated
      preset rows (5 skins, the rig's 5 hair styles, 6 hair colours, 3 builds,
      4 outfit schemes). A canvas runs a live `drawRig` idle-breathing preview
      that slowly turns between facings and updates on every change.
    - `src/ui/newgame.ts` (REWRITTEN): the old single-tool `showStarterChoice`
      is replaced by `showPathAndGoal(onDone)` — four code-drawn path cards +
      five life-goal chips. `showTutorialToggle` kept as the interim guidance
      step (Commit 2 replaces it with the three-way picker).
    - `src/art/icons.ts`: new `paintPot` + `paintPail` painters, registered for
      the `pot`/`pail` Keeper-kit items (path card icon + backpack).
    - `src/systems/inventory.ts`: `ITEM_NAMES` for `pot` ("Cooking pot") and
      `pail` ("Feed pail").
    - `src/art/characters.ts`: `drawFarmer(g, p, t, rig?)` now takes the live
      rig (defaults to `DEFAULT_PLAYER_RIG`).
    - `src/main.ts`: new opening-flow wiring (creation → intro → reveal →
      path/goal → toggle → play); `playerRigParams` rebuilt from the character
      on load + New Game and passed to both `drawFarmer` calls; `newGameReset`
      now takes a `Character`, grants the path kit + `STARTER_FOOD` + 50 coins,
      seeds the path's skill, and stores the character; `firstTip()` gains a
      `pot` (Keeper) case; dev bridge gains `newGameWith(path)`, `meta()`,
      `skillOf`, `invOf`.
    - `index.html`: wood/gold chrome for the creation + path/goal screens
      (`.cc-*`, `.choice-card.sel`, `.goal-row`, `.cc-goal`).
  - **Systems / functions:** `rigFromCharacter`, `characterForPath`,
    `pathById`, `lifeGoalById`; `PATHS`/`LIFE_GOALS`/`STARTER_FOOD` content;
    `showCharacterCreation`, `showPathAndGoal`. No new save key — the character
    rides on the existing `META_KEY` (versioned, tolerant). `newGameReset`
    signature: `(tool, guided)` → `(character, guided)`.
  - **Behavior:** New Game now opens a real Character Creation screen: the
    player names herself, sets age/gender, and dresses a live code-drawn
    preview from curated presets (with a dice to randomize everything). After
    the skippable intro and the farm reveal she picks one of four Starting
    Paths — each grants its kit (Fisher: rod; Farmer: hoe + 3 corn-seed
    packets; Musician: lute; Keeper: feed pail + cooking pot), seeds its skill
    to 10, and every path also gets 50 coins + 3 berries of food — and a
    life-goal. Her chosen look is who she is in the world from then on. Old
    saves Continue exactly as before (a default character is synthesized for
    them); a New Game started from an old save wipes and reseeds cleanly.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright drove the real game (37/37 checks):
  full New-Game UI flow (creation with preset changes + a proven live-preview
  update on outfit change + Randomize, intro skip, farm reveal before the path
  choice, path + life-goal, guidance); all four kits land correctly (tool +
  skill 10 + 50 coins + 3 berries, plus corn-seeds×3 for Farmer and the pail
  for Keeper) with the path/goal stored; an old pre-character save Continues
  with coins/inventory intact and a synthesized farmer character; and New Game
  from an old save reseeds. Zero page/console errors.
- **Commit:** `<fill>` — Character creation — identity, appearance presets,
  paths & life goals
- **Follow-ups:** The stored `age`, `gender`, and `nickname` aren't surfaced
  in-world yet (no dialogue/HUD reads them in v1) — they're persisted and
  ready. Rig `age` profile is always "adult" for created characters (the 18-70
  number is stored but doesn't bend the rig toward "elder"). Guidance is still
  the interim guided/open toggle — replaced by the three-way engine in the
  next commit.

## Seasonal wildlife — butterflies, songbirds, rabbits, deer by season & weather
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** ROADMAP_EXPANSION's "Wild animals along the road/river"
  block — ambient, non-interactive-except-fleeing critters, migratory per
  DECISIONS' World section ("spring butterflies, summer birds, winter
  mammals"), changing with season AND weather.
- **Done:**
  - **Files:**
    - `src/data/wildlife.ts` (new) — `WildlifeKind` = `"butterfly" |
      "songbird" | "rabbit" | "deer" | "duck" | "hare"`; `WildlifeDef {id,
      kind, regions, seasons, weather, maxCount, speed}`; `WILDLIFE` table,
      one row per kind: butterfly (spring+summer, farm/road/market,
      clear/fog), songbird (spring–autumn, forest/road/farm,
      clear/fog/rain), rabbit (spring only, farm/road), duck (summer only,
      river — on the water itself), deer (autumn+winter, forest/road), hare
      (winter only, farm/road). "Storm" is never in any row's weather list —
      nothing is out in a storm. `maxCount`/`speed` are read from `config.ts`
      (see below) so the WHEN/WHERE data stays separate from the numeric
      tuning, matching the fish/crop/forage table convention.
    - `src/config.ts` — new "Seasonal wildlife" section:
      `WILDLIFE_MAX_COUNT`/`WILDLIFE_SPEED` (per-kind records),
      `WILDLIFE_RAIN_BIRD_MULT` (0.4 — "fewer birds" in rain, scales
      songbird/duck caps without a separate table column),
      `WILDLIFE_SPAWN_CHANCE` (0.05/sec — gradual repopulation, never a
      burst), `WILDLIFE_FLEE_RADIUS` (85px), `WILDLIFE_DESPAWN_RANGE`
      (240px), `WILDLIFE_FLEE_SPEED_MULT` (2.4×), `WILDLIFE_WANDER_RADIUS`
      (60px), `WILDLIFE_DESPAWN_SECONDS` (0.5s fade/fly-off).
    - `src/entities/wildlife.ts` (new) — `WildlifeInst` (position, home
      point, wander target, dist for the rig's walk cycle, fleeing/
      despawning flags, per-instance color/antler-flag). `createWildlife()`,
      `updateWildlife(list, season, weather, player, dt)`: population
      maintenance (fades out any instance whose kind fell out of season/
      weather, or is over a just-shrunk cap), gradual repopulation (each
      eligible def occasionally tries to fill an empty slot via
      `pickSpawnPoint()`, which reuses `world/collision.ts`'s `blocked()`
      for land creatures and `inWater()` for ducks — no separate rejection-
      zone table), then per-instance movement: butterflies/ducks are pure
      ambient wander (recentred on their spawn point, never drifting across
      the map); songbirds "fly off" (a quick despawn) when the player closes
      within `WILDLIFE_FLEE_RADIUS`; rabbits/hares/deer run directly away
      (recomputed every frame) and despawn once they've put
      `WILDLIFE_DESPAWN_RANGE` between themselves and their spawn point.
      `activeDefs(season, weather)` (storm always returns `[]`) exported for
      reuse/testing.
    - `src/art/wildlife.ts` (new) — `drawWildlife(g, inst, time)`, the
      depth-sort dispatcher: butterflies get a bespoke `drawButterfly` (2
      wing ellipses flapping on a fast sine + a thin body + a tiny ground
      shadow); songbird/duck reuse `animalRig.ts`'s `drawBird` with new
      `SONGBIRD_RIG`/`DUCK_RIG` presets; rabbit/hare/deer reuse
      `drawQuadruped` with new `RABBIT_RIG`/`HARE_RIG`/`DEER_RIG` (+
      `DEER_BUCK_RIG`, antlers on roughly half of spawned deer) presets —
      never a new rendering engine, per that file's own header comment.
      Despawning instances fade (alpha from `despawnT`) and, for airborne
      kinds, visibly lift as they fade (a stand-in for "flying away").
    - `src/art/animalRig.ts` — `QuadrupedParams` gains an `antlers?: boolean`
      field; `drawQuadruped` draws a simple branching main-beam + one tine
      per side when set (deer bucks only) — a small additive variant, the
      existing `horns` rendering (cow) is untouched.
    - `src/main.ts` — `const wildlife: WildlifeInst[] = createWildlife();`
      (module-level, not persisted — purely ambient, regenerates each
      session like the townsfolk's positions do); `updateWildlife(...)`
      called unconditionally alongside `updateAnimals` (ambience runs even
      behind the opening screens); each instance pushed into the depth-
      sorted `ents` array in `draw()`, same pattern as cows/hens. Dev bridge:
      `wildlife` (the live array) exposed on `window.__wh` for inspection.
  - **Behavior:** in spring, butterflies flutter over the farm/road/market
    and songbirds + rabbits appear; in summer, butterflies + songbirds +
    ducks on the river; in autumn, songbirds + deer near the forest/road; in
    winter, hares + deer only (no insects/birds). Rain despawns insects and
    thins bird counts; storm empties the sky entirely. Getting close to a
    rabbit/hare/deer sends it running away until it's out of sight; getting
    close to a songbird makes it fly off. None of it is collectible or
    tied to any skill yet.
  - **Systems / functions:** no new save keys — wildlife is intentionally
    ephemeral (not part of any save), same non-persistence choice as the
    townsfolk's live positions.
- **Verify (Playwright, headless Chromium + the dev `__wh` bridge, polling
  `window.__wh.wildlife` rather than fixed sleeps since spawn timing is
  probabilistic):** forced spring+clear and waited for population — got
  butterflies, songbirds, AND rabbits together, matching the spring mix;
  forcing rain despawned every butterfly within its ~0.5s fade while
  songbirds/rabbits remained; forcing winter (a separate run, ~90s of live
  ticking) produced BOTH hares and deer with no butterfly/rabbit/duck
  leaking in; walking the player next to a spawned rabbit set its `fleeing`
  flag true and it despawned within a few seconds of running; forcing storm
  brought the live (non-despawning) count to 0. No console/page errors in
  any run. A screenshot with the player teleported next to a spawned deer
  (winter forest) confirms the visual: a tall, thin-legged quadruped with
  the shared outline/shadow, reading clearly against the tree-lined
  forest floor.
- **Build:** `npm run build` — ✅ passing
- **Commit:** `577f242` — "Seasonal wildlife — butterflies, songbirds, rabbits, deer by season & weather"
- **Follow-ups:** binoculars-gated sighting/Collections wiring (deliberately
  NOT built here, per the block's own scope note — that's the Riverside
  Fisherwoman block) would turn these sightings into Memory Book entries.
  Rough edge: the `WILDLIFE_MAX_COUNT`/`WILDLIFE_SPEED` config constants
  were added to `src/config.ts` a commit early (alongside the fish-stall
  block's own config addition, before this block's files existed) — a minor
  commit-hygiene slip, not a functional one; nothing in that earlier commit
  referenced them, so the build was green throughout.

## Fish-stall NPC — Maren buys fish at the market
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** DECISIONS' "Selling paths" #2 (NPC stalls of matching
  specialty) — build the FIRST one: Maren's fish stall at the market buys
  fish. Structure the wiring so a second path (Tobin/produce) is additive.
- **Done:**
  - **Files:**
    - `src/systems/shop.ts` — new `NpcStallTrade` interface `{ npcId,
      stallSign, categoryId, closedLine }` + `NPC_STALL_TRADES` table, one
      ACTIVE row: `{ npcId: "maren", stallSign: "fish", categoryId:
      "fishing", closedLine: "Maren's off today — the market square misses
      her." }`. This IS the "per-stall {stallId, npcId, buysCategory} table"
      the block asked for — a produce-stall row later is one more entry here.
    - `src/systems/sellCategories.ts` — `SellCategory` gains a `label` field
      (plural noun for stall UI, e.g. "fish"; `fishing`'s is `"fish"`); new
      `categoryById(id)` and `categoryItemIds(id)` exports — the latter is
      what Maren's window reads (the category's raw item list), independent
      of `sellableGoodIds`'s player-capability gate, since Maren buys fish
      whether or not the player is on a "fishing path".
    - `src/systems/interact.ts` — `MARKET_STALLS` entries covered by
      `NPC_STALL_TRADES` are excluded from the old decorative Look-only
      `marketStalls` array; new `registerNpcStall(trade, npc, stallDef)`
      registers the stall as a live interactable: `hit`/`inReach` on the
      stall's rect (same box math the old lookProp used), `actions()` reads
      `npc.state` LIVE each call — `"atWork"` → `{id:"trade", label:"Trade
      with <Name>", run: c.openNpcTrade(trade)}`; anything else (closed day,
      off hours, festival) → `{id:"trade", label: trade.closedLine, run: c.toast(...)}`
      — so the HUD prompt itself reads as the closed line when she's off, no
      separate UI path needed. `InteractCtx` gains `openNpcTrade(trade)`.
    - `src/ui/shopwindow.ts` — parameterized rather than forked: a module
      `mode: {kind:"player"} | {kind:"npc", npcName, categoryId, onSale}`.
      New `openNpcStallWindow(npcName, categoryId, onSale)` sets npc mode;
      `render()` branches on it — title becomes "🐟 <Name>'s stall", the Buy
      section (`#shopBuyLabel`/`#shopBuy`) hides entirely, the sell list
      reads `categoryItemIds(categoryId)` instead of the union
      `sellableIds()`, the empty-bag message and the bulk-sell button's label
      ("Sell all fish" vs "Sell everything") are mode-aware. The per-row Sell
      button and "Sell all X" both call `onSale()` in npc mode instead of the
      farm stall's `memoryFn("first_sale", ...)` — everything else (price
      lookup via `GOOD_PRICES`, `sellGood()`, daylog logging) is byte-for-byte
      the same code path as the farm stall.
    - `index.html` — `#shopWindow`'s `<h2>` gets `id="shopTitle"`; the "Buy"
      `.shop-section` div gets `id="shopBuyLabel"` (both needed so
      shopwindow.ts can toggle them).
    - `src/config.ts` — `NPC_SALE_FRIENDSHIP_BUMP = 3` (Relationship engine
      section): the first-sale bump, applied via the existing `dialogueBump()`
      (also marks contact — no separate `markContact` call needed).
    - `src/main.ts` — registers each `NPC_STALL_TRADES` row after the NPC
      roster exists; new `openStallRect: Rect | null` generalizes the old
      "walking away from STALL closes the window" check to whichever stall
      (farm or NPC) is currently open; `openPlayerStall()` wraps
      `openShopWindow()` to set `openStallRect = STALL`; `openNpcStallTrade
      (trade)` re-checks the NPC is `"atWork"` (belt-and-braces — the
      interactable's own action already gates this) then calls
      `openNpcStallWindow`; `onNpcSale(npcId)` is the first-sale hook: an
      `addMemory(..., "first_sale_<npcId>", ...)` guard (once-only, mirrors
      the farm stall's own idempotent memory call) around a `dialogueBump`
      Friendship bump + a toast reaction ("<Name> gives a small approving
      nod. (+3 ♥)") + any heart-event thresholds crossed. Dev bridge:
      `stallActions(npcId)` (read the stall's current action list without a
      click) and `tradeWith(npcId)` (opens the trade the same way a real
      click would, going through the same live gate).
  - **Behavior:** with fish/junk in the bag during Maren's work hours,
    interacting with the fish stall (or with Maren herself, since her `Talk`
    interactable is separate and unaffected) opens a sell-only window listing
    exactly the `fishing` category's items at table prices, with a "Sell all
    fish" button; selling pays coins and logs to the day ledger exactly like
    the farm stall. On her closed day (Tuesday)/off hours/festival, the stall
    reads "Maren's off today — the market square misses her." as both the
    reach prompt and the click's toast, and no window opens. The first sale
    to her ever writes a Memory Book entry, bumps Friendship by 3, and shows
    a reaction toast.
- **Verify (Playwright, headless Chromium via a scratch `pwtest` project +
  the dev `__wh` bridge):** fresh game, calendar forced to a Wednesday
  10:00 (Maren `atWork`) → `stallActions("maren")` returned `"Trade with
  Maren"`; gave carp/fish/corn, teleported the player to the stall's anchor,
  `tradeWith("maren")` opened the window — title "🐟 Maren's stall", sell
  rows showed ONLY "Common Carp ×3" / "Fish ×2" (corn correctly absent), buy
  section hidden, bulk button read "Sell all fish"; clicking Sell paid 9
  coins (3×3) with no console errors; forced Tuesday (Maren's closed day) →
  `stallActions` returned the exact closed line, `tradeWith` left the window
  `display:none`. A separate run confirmed Friendship 0→3 and
  `dayLog().newMemories` containing "Your first sale to Maren, at the
  stall." on the actual first sale. A real `"e"`-keypress at the farm's OWN
  stall (not a bridge shortcut) confirmed it is byte-for-byte unchanged:
  title "🛒 Market stall", buy section visible with 10 stock rows, sell list
  still shows both remaining fish AND farming goods (the union behavior).
- **Build:** `npm run build` — ✅ passing
- **Commit:** `88d22e8` — "Fish-stall NPC — Maren buys fish at the market"
- **Follow-ups:** none for this block. Tobin's produce stall (`farming`
  category) is deliberately NOT built — per the block's own scope note, it's
  meant to be the next additive `NPC_STALL_TRADES` row once a `farming`
  `SellCategory` exists, not built preemptively here.

## Festival engine — Harvest Festival at the market square
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #6) Festival engine. DECISIONS: one festival, day
  15 of a season, in the stall-area; open decision "which festival" not yet
  picked. **Decision made this block: Harvest Festival, autumn, mid-season.**
  Since seasons are 10 days (DECISIONS default) not 15+, the day is resolved
  as `festivalDay = min(15, ceil(DAYS_PER_SEASON/2))` — day 5 today, would
  honor day 15 outright if seasons are ever tuned to 15+ days. Framework
  supports adding more festivals later (Solstice/Moon are DECISIONS' open v5
  list) without a rewrite.
- **Done:**
  - **Files:**
    - `src/data/festivals.ts` (new) — `FestivalDef` { id, name, seasonIndex,
      day, theme }; `FESTIVALS` table, one entry: `{ id: "harvest", name:
      "Harvest Festival", seasonIndex: 2 (autumn), day: HARVEST_FESTIVAL_DAY,
      theme: "harvest" }`, `HARVEST_FESTIVAL_DAY` computed from the formula
      above (not hardcoded — re-derives correctly if `DAYS_PER_SEASON` ever
      changes).
    - `src/systems/calendar.ts` — `DAYS_PER_SEASON` now exported (was a
      private const) so festivals.ts's formula can read it.
    - `src/systems/festival.ts` (new) — `activeFestival(cal)` (the festival
      def if RIGHT NOW is within its 09:00-21:00 window, else null) and
      `isFestivalDay(cal)` (true all day, for the HUD pill/flavor that should
      read "festival day" from dawn regardless of the hour). Pure lookup
      against the fixed table — no state, no persistence.
    - `src/config.ts` — new `FESTIVAL_START_HOUR = 9`, `FESTIVAL_END_HOUR = 21`.
    - `src/systems/schedule.ts` — `NpcState` gains `"festival"`; `resolveState`
      takes an optional `festival` flag and returns `"festival"` for any awake
      state during festival hours (sleep schedule untouched — the festival
      never keeps anyone up past their normal bedtime); `placeFor`'s new
      `"festival"` case sends everyone to `socialSpot(idx)` around the well
      EXCEPT the musician (Liora), who goes to `BUSK_SPOT` to perform — unlike
      plain Sunday `"socializing"`, this ignores the forager's usual "stays in
      the forest" exception, so Ada joins the crowd too.
    - `src/entities/npc.ts` — `initNpcPositions`/`updateNpcs` compute
      `!!activeFestival(cal)` once per call and thread it into `resolveState`;
      `idleFacing`/`poseFor` gain a `"festival"` case (face the well; Liora's
      pose is `"busking"`, everyone else gets the same idle/talking gesture
      mix as socializing).
    - `src/world/zones.ts` — `FESTIVAL_LANTERN_SPOTS` (4, ringing the well)
      and `FESTIVAL_HARVEST_CLUSTERS` (3, just outside that ring) — world
      layout, per project convention.
    - `src/art/festival.ts` (new) — `drawBunting` (a sagging, swaying string
      of triangular pennants between the four market stalls, warm autumn
      palette, drawn as an overhead layer like the fence/hedges), `drawLantern
      Pole` (a wooden pole + a flickering glowing paper lantern), `drawHarvest
      Cluster` (two pumpkins + a bound wheat sheaf, deterministic per position).
    - `src/main.ts` — imports + wires all of the above: `stepGameMinute`
      raises the `festival_today` world flag (1-day duration) on the morning
      a festival falls; `draw()` paints the bunting overhead and pushes
      lantern poles/harvest clusters into the depth-sorted `ents` array, all
      gated on `activeFestival(calendar)`; `updateHud` gets a 5th arg,
      `isFestivalDay(calendar)?.name`, for the HUD pill; a new `festivalGreeted
      Day` guard fires a toast + `remember("first_harvest_festival", ...)`
      the first time each day the player enters the market region during
      festival hours (the Memory Book entry only ever writes once). Dev
      bridge: `gotoFestival(hour)` (time-travels straight to the festival's
      date + re-snaps the townsfolk) and `isFestivalNow()`.
    - `src/data/dialogue/shared.ts` — one new unconditional-but-flagged
      `FESTIVAL_LINE` (`flag: "festival_today"`), appended by `genericOpenings()`
      so every NPC (all 10, no per-NPC authoring needed) can say it; it
      competes on equal footing with each NPC's own same-specificity lines
      via the existing anti-repetition rotation (see Follow-ups).
  - **Systems / functions:** no new save keys — festival state is a pure date
    lookup (nothing to persist) plus the existing `worldFlags` store's
    `festival_today` entry (1-day, self-expiring like every other flag).
  - **Behavior:** on the festival's date, 09:00-21:00: all 10 townsfolk leave
    their normal routine and gather at the market square around the well
    (Liora performs at the busking spot instead); bunting/lantern poles/
    harvest clusters decorate the square; the HUD calendar pill reads e.g.
    "Autumn · Day 5 · 🎉 Harvest Festival!" all day; any NPC's dialogue can
    open with the shared festival line while the flag is active; the first
    time the player enters the market during festival hours each day, a toast
    plays, and the very first time ever, a Memory Book entry is written. The
    next day, everyone and everything is back to normal.
- **Build:** `npm run build` — ✅ passing
- **Commit:** (filled in below after committing)
- **Verification:** Playwright against the dev server via the dev bridge
  (`gotoFestival(10)`): `activeFestival`/`isFestivalNow()` true, HUD pill
  read "Autumn · Day 5 · 🎉 Harvest Festival!", all 10 NPCs' `.state` read
  `"festival"` and none were indoors, Liora's pose read `"busking"`; a
  screenshot at the well showed bunting across all 4 stalls, 2+ visible
  lantern glows, 3 harvest clusters, and the whole roster gathered.
  Repeating `talk('maren')` 6x showed the shared festival line surfacing in
  the rotation alongside her own season/region lines (confirms the flag
  condition wires through the existing dialogue engine). Entering the market
  region fired the market-entry toast then the once-only Memory Book entry
  (confirmed via the toast queue and the Memory Book's Memories tab).
  `advanceDay()` into the next date: `isFestivalNow()` false, every NPC's
  state read `"asleep"` (midnight) with no `"festival"` anywhere, HUD pill
  back to plain "Autumn · Day 6" — the day after is fully back to normal.
- **Follow-ups:** the shared festival line is NOT guaranteed to win the
  opening-line pick over an NPC's own same-specificity season/region lines —
  by design, ties at the top specificity are broken by the existing per-NPC
  rotation counter (anti-repetition), so the festival line surfaces as ONE of
  the rotation's candidates, not an override. If the product owner wants the
  festival line to always dominate on its day, the dialogue engine's
  specificity scoring would need a tie-break priority for flag conditions —
  out of scope for this block. Also unrelated, noticed in passing: `endTalk()`
  /`closeDialogue()` doesn't clear an NPC's `talkTimer`, so a conversation
  ended early via the dev bridge holds that NPC's `.state` resolution frozen
  for the remainder of `NPC_TALK_SECONDS` (~3.4s) — pre-existing Dialogue
  engine behavior, not touched here, flagged for whoever picks it up.

## End-of-day summary — none/quick/full with day ledger
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #7) End-of-day summary engine. Player setting
  none/quick/full-with-achievements (DECISIONS). A day ledger accumulates the
  cheap seams main.ts already owns; on day rollover, show per the setting.
  "full" auto-pauses game-time until dismissed (same gating as the dialogue
  box); a night slept through shows it only after the fade completes.
- **Done:**
  - **Files:**
    - `src/systems/daylog.ts` (new) — `DayLog` { coinsEarned, coinsSpent,
      itemsSold, catches, harvests, forages, dishesCooked, skillGains
      (Record<skillId,points>), newDiscoveries (string[]), newMemories
      (string[]), relationshipChanges (Record<npcId,{friendship,romance}>) };
      `freshDayLog()`/`resetDayLog()`; `logCoinsEarned/logCoinsSpent/
      logItemsSold/logCatch/logHarvest/logForage/logDishCooked/logSkillGain/
      logDiscovery/logMemory/logRelationshipChange`; `topActivityLine()` for
      the quick summary's one-line highlight. Not persisted — a plain object
      main.ts owns and resets every in-game day (explicit-passing, like every
      other store).
    - `src/systems/settings.ts` — new `EndOfDaySummary` type + `Settings.
      endOfDaySummary` field (default `"quick"`), validated on load (falls
      back to the default on junk); new `endOfDaySummaryMode()` accessor.
    - `src/config.ts` — new `EOD_QUICK_SHOW_SECONDS = 5` (how long the quick
      pill stays up before fading).
    - `src/ui/dayendpanel.ts` (new) — `initDayEndPanel()`, `showQuickSummary`/
      `updateQuickSummary` (a small auto-fading pill, non-blocking), `showFull
      Summary`/`isDayEndOpen` (a proper wood/gold modal listing every non-zero
      ledger line + an "Achievements today" section for new discoveries/
      memories; dismiss by click anywhere on it, Esc, or Enter).
    - `index.html` — `#eodQuick` pill, `#eodScrim` + `#eodPanel` modal (new
      CSS block matching the existing wood/gold token system).
    - `src/ui/shopwindow.ts` — two new optional callback params on
      `initShopWindow` (`logSale`, `logPurchase`), called at the existing
      sell/sell-everything/buy/buy-livestock success branches — the primary
      trade loop now feeds the ledger without shopwindow.ts owning daylog.ts.
    - `src/main.ts` — owns the live `dayLog` object; hooks it into `record()`
      (discoveries), `remember()` + `fireHeart()` (memories), `giveGiftFlow`/
      `doInteraction`/`applyDialogueEffect`'s friendship case (relationship
      deltas), the fishing/foraging/busking/cooking/farming-harvest completion
      handlers (catches/forages/dishesCooked/harvests/coinsEarned + per-skill
      gains), `handleCollapse`'s fee (coinsSpent), and the shop callbacks
      above. `stepGameMinute()` now returns a `DayEndSnapshot | null` (season/
      day of the day that just ended + a shallow-copied ledger) exactly on
      rollover, then resets the ledger; `presentDayEnd()` reads the setting
      and shows quick/full/nothing. The three time-skip paths (sleep/nap/
      collapse) collect any pending snapshot during the fade and present it
      only in the `onDone` callback — after the screen fades back in, never
      behind it. `isDayEndOpen()` joins `isDialogueOpen()` in the single
      `timePaused` gate that already froze NPCs/player/autosave for dialogue.
      Dev bridge: `dayLog()`, `setEodMode()`, `dayEndOpen()`, `advanceDay()`
      (fast-forwards through the real minute loop to the next rollover).
  - **Systems / functions:** no new save keys — `dayLog` is intentionally
    unpersisted; `endOfDaySummary` rides on the existing settings key.
  - **Behavior:** the player can set none/quick/full (today: via the dev
    bridge / a future Settings screen — same state as `dayLengthSeconds` and
    `guided` before their screens existed). "quick" shows a small 3-line pill
    (day header, coin net, top activity) that fades on its own and never
    pauses anything. "full" opens a proper panel listing every non-zero stat
    for the day just ended plus new discoveries/memories, freezes game-time
    and the townsfolk until dismissed (click/Esc/Enter). "none" is silent.
    Sleeping through midnight shows the panel only once the wake-up fade
    completes.
- **Build:** `npm run build` — ✅ passing
- **Commit:** (filled in below after committing)
- **Verification:** Playwright against the dev server via the dev bridge:
  gifting Maren + a friendly chat with Tobin populated `relationshipChanges`
  (`maren: +20 friendship`, `tobin: +3 friendship`) and the first-gift memory;
  `setEodMode('full')` + `advanceDay()` opened the modal with those exact
  lines plus the achievement, froze an NPC's world position while open, and
  Esc closed it; `setEodMode('quick')` + `advanceDay()` showed the 3-line
  pill without opening the blocking panel; `setEodMode('none')` showed
  neither; the setting value survived a full page reload.
- **Follow-ups:** relationship NEGLECT DECAY (the daily "no contact" drift)
  is deliberately NOT folded into `relationshipChanges` — only active
  interactions (gifts/categorized/dialogue) are logged, since decay is
  passive and would clutter the "today's activity" framing; a future pass
  could add it as a separate "faded" line if wanted. Building/Husbandry/
  Gardening skill gains (all three live in `systems/interact.ts`, not
  main.ts) aren't logged to `skillGains` — kept in scope per the block's
  explicit "cheap seams main.ts already owns"; wiring them later just needs
  an extra `InteractCtx` hook mirroring `toast`/`memory`. No dedicated
  Settings-screen toggle yet (Part E) — same gap as `dayLengthSeconds`/
  `guided` today.

## Save system — manifest, manual save icon, 10-minute autosave
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #11) Save/load system. Every store already writes
  localStorage continuously on change; add on top: a slot manifest (v5-multi-
  slot-forward-compat, one slot in v1), a manual save via a HUD icon, and an
  autosave every 10 real minutes (paused while game-time is paused). The
  tutorial-in-progress marker rides along in the manifest for a future load
  prompt, no UI yet.
- **Done:**
  - **Files:**
    - `src/systems/saveSlots.ts` (new) — `SlotManifest` { version, slot (always
      1 in v1), lastSavedAt (real epoch ms), calendarStamp {season, day},
      coins, guided? }; `loadSlot()` (tolerant read) and `stampSave(cal, coins,
      guided)`. Comments spell out the v5 path (array of manifests + `-slotN`
      key suffixes) without building it.
    - `src/config.ts` — new `AUTOSAVE_SECONDS = 600` and `SLOT_KEY =
      "wildhearth-slot-v1"`.
    - `src/systems/saves.ts` — `SLOT_KEY` added to `GAME_KEYS` so New Game
      wipes the manifest (no stale "last saved" stamp from the ended life).
    - `index.html` — a 💾 `#saveBtn` joins the `#tools` icon row (same
      `.tool-btn` chrome as map/skills/book/bag).
    - `src/main.ts` — `saveAllStores()` force-calls every store's save
      function (economy/skills/farm/plots/garden/livestock/calendar/weather/
      flags/needs/relationships/collections/memories); `manualSave()` runs it
      + `stampSave()` + a "Game saved." toast, wired to `#saveBtn` click;
      `autosaveTick()` is the same path with a quieter "Autosaved." toast. A
      real-seconds accumulator (`autosaveAccum` against a mutable
      `autosaveSeconds`, seeded from the config constant) ticks only inside
      the same gated block that already pauses on the title screen/dialogue,
      so the timer holds while game-time is paused. Dev bridge additions:
      `saveNow`, `autosaveNow`, `setAutosaveSeconds` (lets verification shrink
      the interval without touching config.ts).
  - **Systems / functions:** new save key `wildhearth-slot-v1`; no changes to
    any existing store's on-disk shape (the manifest is a new, independent key).
  - **Behavior:** clicking 💾 (or the dev bridge) saves every live store at
    once, stamps the manifest, and toasts "Game saved."; the same path fires
    automatically every 10 real minutes of active play (not while the title
    screen or a dialogue has time paused) with a quieter toast; New Game wipes
    the manifest along with the rest of the game-state keys.
- **Build:** `npm run build` — ✅ passing
- **Commit:** (filled in below after committing)
- **Verification:** Playwright against the Vite dev server, driven through
  the dev bridge (`window.__wh`) plus a real click on `#saveBtn`: New Game →
  manifest absent; click 💾 → manifest present with `lastSavedAt`/season/day/
  coins/guided and the "Game saved." toast text; `setAutosaveSeconds(0.3)` +
  a ~0.7s wait → manifest re-stamped with a newer `lastSavedAt` (autosave
  fired on its own); New Game again → manifest absent again.
- **Follow-ups:** none — v5 multi-slot and the "Continue Tutorial?" load
  prompt are deliberately left as comments/an unused manifest field, not code.

## Dialogue engine — condition-keyed lines, choice turns, bottom-box
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #4, mechanical layer) The Dialogue engine. Condition-
  keyed opening lines with MOST-SPECIFIC-MATCH-WINS (season / weather / dayOfWeek /
  phase / region / friendship-tier / romance-tier / flag / farm-repaired);
  specificity = matched-field count; ties → deterministic pick that VARIES between
  conversations via a per-NPC rotation counter (anti-repetition). Unconditional
  fallbacks so nothing is silent. Choice-based turns (2-3 choices, DECISIONS),
  shallow trees (1-3 turns), Farewell always last. Reads ONE
  `getWorldContext(sources,{npcId})` snapshot per turn. Bottom-box UI (wood/gold
  chrome), NPC name header + line + numbered choice buttons (click + keys 1-3, Esc).
  Auto-pause: game-time + NPC movement freeze while the window is open. AI seam:
  every displayed line routes through `renderNpcLine(req)` (v1 verbatim). Talk
  action opens the window instead of the canned toast; markContact + Social-need
  bump on conversation END. Tuning in config.
- **Done:**
  - **Files:**
    - `src/systems/dialogue.ts` (NEW): the engine. Types `LineConditions` /
      `LineEntry` / `LineSet` / `DialogueChoice` / `DialogueNode` / `NpcDialogue` /
      `ChoiceEffect`. `tierOf()` (0-3, >= semantics), `pickLine()` (most-specific by
      matched-field count, ties broken by a caller-supplied rotation index),
      `presentedChoices()` (caps to 2-3 + guarantees `FAREWELL`), `matchSpecificity`
      (per-field match incl. `farmRepaired` reading the farm slice), and the AI seam
      `renderNpcLine(req)` — the single choke-point Part-D §D2 wraps later.
    - `src/data/dialogue/shared.ts` (NEW): `genericOpenings(personality)` folds the
      existing `PERSONALITY_LINES` into unconditional `{}` fallbacks (old toast lines
      KEPT, not deleted); `smallTalkBranch(personality)` = the shared 2-turn tree
      (per-personality reply pool); `shopBranch(pitch)` for merchants; compact
      line-builders (`season`/`rainy`/`weatherLine`/`atPhase`/`warm`/`warmAny`/`here`/
      `farmWhole`/`topic`).
    - `src/data/dialogue/{maren,tobin,sera,henrik,petra,liora,bram,ada,finn,jonas}.ts`
      (NEW, 10): per-NPC opening tables (4 seasonal + ≥2 weather + friendship-warmer +
      region/work line + generics) and a personality small-talk tree. Maren/Tobin/Sera
      add a "What do you buy here?" shop branch. Maren + Henrik carry farm-repaired
      reactions (read the farm slice). Jonas demonstrates the world-topic-flag loop
      ("Heard any news?" sets `market_buzz`, then opens on it). Finn's lines are
      kid-appropriate (romance is structurally impossible on a kid).
    - `src/data/dialogue/index.ts` (NEW): id→dialogue registry + a personality
      skeleton fallback for any file-less NPC.
    - `src/ui/dialoguebox.ts` (NEW): the bottom-box turn state machine. `initDialogue`
      (hooks: `worldFor` / `applyEffect` / `onOpen` / `onClose`), `openDialogue(def)`,
      `closeDialogue()`, `isDialogueOpen()`. Per-NPC session rotation Map; capture-
      phase keys (1-3 pick, Esc closes) that beat other panels' handlers.
    - `index.html`: `#dialogueBox` (+ `#dlgName`/`#dlgText`/`#dlgChoices`) inside
      `#gameArea`, styled with the shared chrome tokens (wood border, gold header,
      cell-edge choice buttons with a gold key chip).
    - `src/systems/worldContext.ts`: `CalendarSlice.dayOfWeek` added (0-6, from
      `absoluteDay`) so the day-of-week condition reads the one snapshot.
    - `src/systems/relationships.ts`: `dialogueBump()` — a tiny Friendship nudge from a
      warm choice (no per-category diminishing), returns crossed thresholds, marks
      contact.
    - `src/entities/npc.ts`: `startTalking(n, px?, py?)` now optionally faces the
      player + holds the talking pose (kept synced to the open window). Retired
      `npcGreeting` + the unused `lineIdx` field (superseded by the engine).
    - `src/main.ts`: `onTalk` opens the dialogue window (was: canned toast); wired
      `initDialogue` hooks (one npc-scoped snapshot per turn, `playerRegion()` as the
      location slice); `applyDialogueEffect` (friendship bump / topic flag / contact +
      fires heart events); tick auto-pause (`isDialogueOpen()` freezes time + NPC
      updates + drains queued world input); dev bridge `talk`/`endTalk`/`dlgOpen`/
      `setFriendship`/`flag`/`repairFarm`.
    - `src/config.ts`: `DIALOGUE_MAX_CHOICES` (3), `DIALOGUE_FRIENDSHIP_BUMP` (2),
      `DIALOGUE_TOPIC_FLAG_DAYS` (3).
  - **Systems / functions:** condition-keyed line selection (specificity = matched
    fields, rotation tie-break), shallow choice trees, `renderNpcLine` AI seam,
    dialogue-open auto-pause gate. No new save key (rotation is session-scoped;
    topic flags persist via the existing `worldFlags` key).
  - **Behavior:** talking to any townsperson now opens a bottom-box conversation: an
    opening line chosen for the moment (season/weather/time/region/relationship/farm
    state), 2-3 choices by click OR keys 1-3, replies over 1-3 turns, Farewell/Esc to
    close. Repeat talks in the same conditions surface different generics. The clock
    and the townsfolk freeze while the window is open. Merchants explain their stall;
    Maren/Henrik react once your farm is fully mended.
- **Build:** `npm run build` — ✅ passing.
- **Verify:** Playwright (fresh game, dev bridge) — 16/16: opening line + 3 choices
  in the box; click AND number-key selection; clean close; anti-repeat (3 distinct
  openings of 4); rain line beats generic; friendship≥50 warmer wins; farm-repaired
  wins as most-specific; clock frozen while open (360→360) then resumes (→363); NPC
  holds the talking pose; Finn (kid) talks with age-appropriate lines and no romance
  interactions; zero page/console errors; existing save loads via Continue.
- **Commit:** 63140f4 — Dialogue engine — condition-keyed lines, choice turns, bottom-box
- **Follow-ups:** Rotation is in-memory (session-scoped) by design — persisting a
  per-NPC said-history is the Part-D anti-repetition store (AI_ARCHITECTURE §D7), not
  needed here. Trees are intentionally shallow personality skeletons + 3 shop
  branches; richer per-NPC bespoke trees can grow incrementally. `renderNpcLine` is
  the sole hook the AI dialogue-variation layer wraps.

## Relationship engine — two axes, trait-derived gifts, depth-based decay
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #3) The Relationship engine. Per-NPC record
  `{ friendship 0-100, romance 0-100, giftsThisWeek, lastInteractDay, … }`,
  versioned store, explicit-passing, kid romance structurally impossible.
  Trait-DERIVED gift preferences (not hand-authored per NPC) → 5-tier rating at
  runtime. Gift deltas loved +35 / liked +20 / neutral +8 / disliked −10 /
  hated −20; weekly cap 2 (refuse before consuming); birthday ×2 + cap-exempt,
  with a `birthday` on every NPC. Categorized interactions (Friendly / Funny /
  Romantic / Blunt) with per-personality lines and per-day diminishing returns;
  Romantic only for candidate adults at Friendship ≥ 20. Give-a-gift chooser.
  Depth-dependent neglect decay. Heart-event thresholds (25/50/75) → toast +
  Memory Book, once each, via a forward-compat seam. World Context relationship
  slice (drop the `_query` underscore). Subtle ♥/⚭ readout on the NPC pill.
  Tuning in config.ts.
- **Done:**
  - **Files:**
    - `src/systems/relationships.ts` (NEW): the engine. `Relationships { byId }`
      + `Relationship` record; versioned/tolerant load/save/reset on key
      `wildhearth-relationships-v1`. `giveGift()` (refusal BEFORE consume;
      Friendship-only in v1; birthday ×2 + cap-exempt), `applyInteraction()`
      (axis + per-day diminishing per category), `markContact()`,
      `decayRelationships()` (depth-based, year-wrap-safe via a captured
      ended-day), `readRelationship()`/`relationshipSummary()` (non-mutating
      reads), `ThresholdEvent`/`Axis` types.
    - `src/systems/heartEvents.ts` (NEW): the v1 heart-event seam —
      `heartEvent(def, ev)` → `{ memoryKey, memoryText, toast }`. v5 grows this
      into scripted `data/heartEvents/*.ts` scenes without touching callers.
    - `src/data/traitPreferences.ts` (NEW): item→category/price classifier built
      from the live fish/junk/crops/forage/recipe tables; `giftTier(def, itemId)`
      derives the 5-tier rating from the NPC's role + personality trait rules
      (fish-trade loves rare fish / likes common; naturalist loves forage, hates
      junk; performer loves dishes & shiny; grower loves crops; merchant likes
      high-value; everyone dislikes junk). `giftInfo`/`isGiftable`.
    - `src/data/interactions.ts` (NEW): 8 interactions across 4 categories with
      per-interaction axis/delta, and `interactionLine(category, personality)`
      scripted responses (per-personality with a generic fallback).
    - `src/data/npcs.ts`: added a required `birthday { seasonIndex, day }` to
      every NPC (spread across the 4 seasons, days 1-10), plus `isBirthday()`.
    - `src/ui/giftchooser.ts` (NEW) + `index.html`: a small `#giftChooser` panel
      (shop chrome) listing held giftable goods with icons; `openGiftChooser`/
      `closeGiftChooser`/`isGiftChooserOpen`. Tools/seeds never listed.
    - `src/systems/interact.ts`: `InteractCtx` gains `relationships`, `calendar`,
      `openGiftFor`, `doInteraction`; `registerNpc` now builds Talk / Give a gift
      / the categorized interactions (Romantic gated), Look. Left-click/E stays
      Talk.
    - `src/systems/worldContext.ts`: `relationships?` source + `relationship?`
      slice; `_query` → `query` (first real consumer of the scoping parameter).
    - `src/art/characters.ts`: `drawNpc` takes an optional `NpcRelReadout`; the
      name pill shows a subtle `♥{friendship}` (· `⚭{romance}` for candidates)
      line once a bond exists.
    - `src/config.ts`: `GIFT_DELTAS`, `BIRTHDAY_GIFT_MULT`, `GIFTS_PER_WEEK`,
      `RARE_FISH_PRICE`, `ROMANCE_UNLOCK_FRIENDSHIP`, `RELATIONSHIP_DECAY_*`,
      `RELATIONSHIP_THRESHOLDS`, `INTERACT_DIMINISH`, and `RELATIONSHIPS_KEY`.
    - `src/systems/saves.ts`: `RELATIONSHIPS_KEY` added to `GAME_KEYS` (New Game
      clears it).
    - `src/main.ts`: load relationships; `onTalk` marks contact; `giveGiftFlow`
      (consume + tiered reaction toast + first-gift memory + heart events),
      `openGiftFor`, `doInteraction`, `fireHeart`; daily decay hooked into
      `stepGameMinute` with the ended-day captured before the clock advances;
      reset on New Game; relationship source + nearby-NPC query into the
      per-frame World Context; pill readout wired; dev bridge hooks
      (`relOf`/`giftTo`/`openGift`/`interactWith`/`npcActions`/`rollDay`).
    - `docs/WORLD_CONTEXT.md`: Relationships row → **Built**.
    - `docs/ROADMAP_EXPANSION.md`: the relationships block + the gift/decay
      tuning-anchor block marked `[x]`.
  - **Systems / functions:** new save key `wildhearth-relationships-v1`; two
    independent axes per NPC; trait-derived tiers computed at runtime (no
    per-NPC gift lists); gift deltas + weekly cap + birthday ×2; categorized
    interactions with per-category-per-day diminishing returns; depth-based
    neglect decay (−2 below 30, −1 at 30-60, −0.25 above 60, never < 0); heart
    thresholds fired once per NPC/axis (persisted `fired` ledger); relationship
    slice in World Context.
  - **Behavior:** Right-click an NPC → Talk / Give a gift / Chat / Ask about
    their day / Tell a joke / Playful jest / Tease / Grumble together (+ Compliment
    / Flirt for romantic candidates once you're friends) / Look. Gifts move
    Friendship by how well they suit that person's trade and temperament — a rare
    fish thrills Maren, a truffle delights the herbalist, junk offends her; the
    3rd gift in a week is gently refused (item kept); a birthday gift lands
    double. Interactions nudge the right axis and taper off if you repeat the
    same kind that day. Ignoring someone lets the bond drift down, slower the
    deeper it runs. Crossing 25/50/75 pops a heart moment into the Memory Book,
    once. A subtle ♥ (· ⚭) readout sits under the name of anyone you've begun to
    know. All persists across reload; New Game forgets everyone.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright drove the real game via the dev bridge
  (18/18 core checks + 5 supplemental, 0 page errors): carp→Maren liked +20,
  koi→Maren loved +35, off-trait dish→Maren neutral +8, truffle→Ada loved +35,
  junk→Ada hated (clamped 0); 3rd weekly gift refused without consuming;
  birthday ×2 (+40) then a normal +20 same day; Chat +3 → +1.5 → +0.5 → 0
  diminishing; Compliment moves Romance not Friendship; Romantic hidden on Sera
  (non-candidate), Finn (kid, romance never shown), and Maren below Friendship
  20 (shown at 20); decay held on the contact day then −2 the next; threshold 25
  wrote exactly one Memory Book entry; survived reload; New Game emptied the
  store. The gift-chooser DOM was also driven end-to-end (rows exclude the rod +
  seeds; clicking Give applied the gift and consumed one item).
- **Commit:** `909ff49` — Relationship engine — two axes, trait-derived gifts, depth-based decay
- **Follow-ups:** Gifts move only Friendship in v1 (a logged judgment call —
  the Romantic interaction category is what moves Romance); v5 can route gifts
  to Romance for a committed bond. Scripted `data/dialogue/*.ts` and
  `data/heartEvents/*.ts` scenes remain their own later blocks (this ships the
  toast+memory seam they grow from).

## Needs engine — 7 needs, collapse, warnings, mood hooks
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #2) The Needs engine. 7 needs (hunger, thirst,
  energy, hygiene, bathroom, mood, social), each 0-100, per DECISIONS' 7-need
  list. Versioned store (New Game = comfortable). Per-in-game-minute decay,
  modified by action / season / weather; **mood is derived** from the other six
  + a recent-social-contact bonus. Restoration: eat (edible items), drink (well
  + basin), sleep (bed, "until morning"/"nap" via the REAL advanceMinute loop
  with a fade-to-black, never a clock teleport), wash (basin), outhouse (new
  code-drawn prop behind the farmhouse), social (talk seam), a rest-chair
  trickle. Escalating threshold warnings (25/10) + an always-visible HUD needs
  strip that pulses when low. Collapse at zero (physical) = fade, wake at the
  bed 06:00, coin fee (clamped ≥0), no death; bathroom-zero = an accident (mood/
  hygiene hit, no fee). Mood scales skill-gain chance + busking payout. NPC
  comments on a low need via the existing proximity/onTalk seams. World Context
  `needs?` slice. All tuning in config.ts.
- **Done:**
  - **Files:**
    - `src/systems/needs.ts` (NEW): the engine. `NeedsState` (versioned, tolerant
      load/save/reset, key `wildhearth-needs-v1`); `NeedId`, `PHYSICAL_NEEDS`,
      `ALL_NEEDS`, `NEED_LABELS`. `decayNeeds()` (per-minute drain w/ season+
      weather multiplier table living here, knobs in config; energy RECOVERS
      while sleeping, others drain at a reduced rate down to a floor);
      `recomputeMood()` (avg + worst-need weight + social glow − weather drag −
      accident penalty); `moodPerfMult()` (0.75/1.0/1.1 skill+busk multiplier);
      `applyExertion()` / `applyWalk()`; `restore()`/`drink`/`wash`/`useOuthouse`/
      `rest`; edible table (`edibleHunger`/`isEdible` — cooked dishes > crops >
      forage; raw fish/junk excluded); `socialContact()` (per-NPC per-day
      diminishing); `collectWarnings()` (hysteresis 25/10); `criticalNeed()`/
      `applyAccident()`/`collapseRecover()`; `needsRecord()` (World Context slice).
    - `src/art/needsicons.ts` (NEW): `drawNeedsStrip()` — 7 code-drawn glyphs
      (apple/droplet/bolt/bubbles/toilet-roll/speech/smiley; the smiley's mouth
      curves with mood) each with a status fill-bar (green/amber/red) and a
      pulsing alert plate under any need <25.
    - `src/ui/fade.ts` (NEW): `initFade()`/`fadeThrough(atBlack, msg, onDone)` —
      the fade-to-black overlay wrapping a synchronous time skip.
    - `src/config.ts`: `NEEDS_KEY` + the full needs tuning block (start baseline,
      per-need decay, sleep floor/recover, season/weather multipliers, mood
      weights/glow/weather-drag/perf-mult thresholds, exertion table, walk cost,
      eat/drink/wash/outhouse/rest amounts, social base/diminish, accident hits,
      `COLLAPSE_FEE`/`COLLAPSE_RECOVER`).
    - `src/systems/saves.ts`: `NEEDS_KEY` added to `GAME_KEYS` (New Game clears it).
    - `src/systems/worldContext.ts`: `needs?: NeedsState` source + `needs?:
      Record<string, number>` slice, populated via `needsRecord()`.
    - `src/systems/skills.ts`: `gainSkill(s, id, chanceMult = 1)` — mood scales
      the success chance (clamped to [0.01, 1]); Gain Guard unaffected.
    - `src/world/zones.ts`: `OUTHOUSE` rect (west of the farmhouse).
    - `src/art/buildings.ts`: `drawOuthouse()` — weathered planks, mono-pitch
      roof, crescent-moon door, shadow+outline.
    - `src/world/collision.ts`: outhouse blocks its lower ~75% (structure rule).
    - `src/systems/interact.ts`: `InteractCtx` gains `needs`, `sleep`, `nap`;
      well gets a Drink action; basin → Wash/Drink; bed → Sleep-until-morning/Nap;
      rest corner → Sit and rest; new `outhouseSpot` (Use the outhouse); the
      three interior `spot()` stubs replaced with real interactables; building/
      husbandry/gardening skill gains now pass `moodPerfMult(c.needs)`.
    - `src/entities/npc.ts`: `npcNeedComment(def, needId)` — the comment hook
      (2-3 lines per need, motherly-baker flavour), used by main's proximity.
    - `src/ui/hud.ts`: `updateNeedsStrip(record, time)` — dpr-crisp strip canvas +
      per-cell tooltip readback.
    - `src/ui/backpack.ts`: right-click an edible slot → an "Eat <name>" context
      menu; `initBackpack(economy, eat)` takes the eat callback (explicit-passed).
    - `index.html`: `#needsStrip` (top-left, wood/gold chrome) + `#fade` overlay
      + their CSS.
    - `src/main.ts`: `const needs = loadNeeds()`; `resetNeeds` in `newGameReset`;
      `stepGameMinute()` (single source of truth for a minute — used by both the
      live tick and the sleep/collapse skip); `liveMinute()` (decay+warnings+
      collapse); `sleepUntilMorning`/`napAnHour`/`wakeAtBed`/`handleCollapse`/
      `handleAccident`/`maybeNpcComment`; `eatItem`; exertion+mood wired into the
      fishing/foraging/busking/cooking/farming completion hooks; busking payout
      ×mood; walk-energy per frame; `onTalk` → `socialContact`; per-frame
      `recomputeMood`; `needs` added to the World Context source; outhouse drawn
      + depth-sorted; dev `__wh` bridge extended with needs verification hooks.
  - **Systems / functions:** save key `wildhearth-needs-v1`; `NeedsState` +
    ~25 exported functions in `needs.ts`; `gainSkill` gained a `chanceMult`
    param; World Context `needs` slice; `OUTHOUSE` zone + `drawOuthouse` painter.
  - **Behavior:** all 7 needs are always visible on the HUD strip and drain over
    time (faster in winter/summer/storm per need). The player can eat edibles
    from the bag, drink at the well or basin, wash at the basin, use a new
    outhouse, sit to rest, and sleep the night away in bed (fade to black, wakes
    at 06:00 a day later). Escalating "you're getting hungry / you feel faint"
    warnings fire at 25 then 10. Ignoring a physical need to zero collapses the
    player — a fade, a helper's fee (15 coins, never negative), and waking at the
    bed — while a zeroed bathroom is a mortifying accident instead. Low mood makes
    skills gain slower and busking pay less; high mood the reverse. Nearby NPCs
    remark on a low need ("You look exhausted, dear.").
- **Build:** `npm run build` — ✅ passing.
- **Verify:** Playwright against the dev bridge — 21/21 checks: New Game
  comfortable → drain → eat/drink/wash/outhouse/sleep each restore; sleep →
  06:00 + day roll + weather reroll (clear→rain) + energy 100; warnings at 25/10;
  forced hunger-collapse 20→5 coins & wakes at the bed (interior, ROOM_ENTRY);
  mood mult 0.75 low / 1.1 high; Henrik comments "You look exhausted, dear.";
  needs survive reload; New Game resets to 80; no page errors.
- **Commit:** 146f3e4 — "Needs engine — 7 needs, collapse, warnings, mood hooks"
- **Follow-ups:**
  - Weather visual layer + day/night tint (Part B #8/#9) will make the mood
    weather-drag legible on screen; today it's mechanical only.
  - Dedicated needs *icons in the sidebar side-panel* (DECISIONS' configurable
    panel) could later mirror the always-on strip — not needed for v1.
  - Busking-payout mood scaling is verified via the shared `moodPerfMult` (the
    same multiplier the skill-gain check exercised), not a separate live-busk
    Playwright run (busk completion isn't reachable from the dev bridge).

## NPC engine — 10 townsfolk with weekly schedules on the shared rig
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part A #1) The NPC engine. 10 distinct NPCs (fixed roster,
  logged for owner review), each a full entity on the shared humanoid rig with a
  weekly, day-of-week-varying schedule driving a state machine (atHome / atWork /
  atMarket / socializing / asleep), waypoint movement, profession poses, a
  proximity "Talk to <name>" one-liner via a single `onTalk` seam (the real
  dialogue engine is the next block), a tiny v5-forward weather stub, and
  v5-forward identity placeholders. No relationships/gifting/dialogue-trees/stall
  trading (all later). No persistence (deterministic from the clock).
- **Done:**
  - **Files:**
    - `src/data/npcs.ts` (NEW): the roster as pure data. `NpcDef` type +
      `AgeBand` / `Personality` / `Role` unions; **kid safety is structural** —
      `NpcDef = NpcCommon & ({ageBand:"kid"} | {ageBand:"adult"|"elder";
      romantic:boolean})`, so a `romantic` flag on a kid is a compile error, not
      a convention. `isRomantic(def)`. The 10 `NPCS` (each with distinct
      `RigParams`, home/work anchors, wake/sleep/work hours, optional
      `closedDay`, and v5-forward `family?`/`backstory?`/`heartEvents?` typed &
      undefined). `PERSONALITY_LINES` (2-3 canned lines per personality).
      NPC route tables: `FOREST_CORNERS`, `ADA_FOREST_REST`, `JONAS_ROUTE`,
      `BRAM_FARM_SPOT`/`BRAM_MARKET_SPOT`.
    - `src/systems/schedule.ts` (NEW): the clock-driven engine. `NpcState`;
      `dayOfWeek(cal)` / `dayName(cal)` (7-day Sun–Sat week from `absoluteDay`);
      `daySchedule(def, dow)` (computes the per-day `{startHour,state}` table);
      `resolveState(def, dow, hour)`; `placeFor(def, state, dow, idx)` (resolves
      the world point per state — stall/forest-corner-by-day/handyman-split/
      well-ring/plaza-wander/home); `scheduleWeatherTweak(def, state, weather)`
      (v5-forward stub: a storm sends outdoor NPCs home, nothing else yet).
    - `src/entities/npc.ts` (NEW): the entity + movement. `Npc` interface,
      `createNpcs()`, `initNpcPositions()` (snap to the schedule's here-and-now),
      `updateNpcs(npcs, cal, weather, player, dt)` (resolve state → on change set
      a waypoint route → straight-line lerp at `NPC_WALK_SPEED` → hold the
      state's pose), waypoint routing (`buildRoute` skirts forest trees via the
      passage spine; peddler patrols `JONAS_ROUTE`, direction by day parity),
      pose/facing derivation, and the talk seam `startTalking` / `npcGreeting` /
      `npcById`.
    - `src/art/characters.ts`: added `drawNpc(g, n, t, showLabel)` — the shared
      rig plus a code-drawn name pill shown only when the player is near/hovering.
    - `src/systems/interact.ts`: added `registerNpc(npc, all, onTalk)` — each NPC
      is a live-position "Talk to <name>" interactable, inert while `indoors`,
      routed through the single `onTalk` seam.
    - `src/main.ts`: instantiate + snap + register the NPCs; `updateNpcs` each
      tick (ambient, like animals); depth-sort non-indoor NPCs into the `ents`
      list with the near/hover-gated label; `onTalk(npc)` seam (canned line +
      `startTalking`); re-snap NPCs on New Game; a **dev-only** `__wh` test
      bridge (`import.meta.env.DEV`, tree-shaken from production — bundle size
      unchanged).
    - `src/config.ts`: `NPC_WALK_SPEED` (52), `NPC_ARRIVE` (4), `NPC_REACH` (46),
      `NPC_TALK_SECONDS` (3.4).
    - `src/vite-env.d.ts` (NEW): `/// <reference types="vite/client" />` so
      `import.meta.env.DEV` is typed (and literally replaced → tree-shaken).
  - **Roster (logged for owner review):** 1 Maren (fish stall, brisk-warm, ♥),
    2 Tobin (produce, cheerful-chatty, ♥), 3 Sera (general goods, precise, —),
    4 Henrik (elder neighbour farmer, gruff-kind, —), 5 Petra (baker, warm-
    motherly, —), 6 Liora (musician, dreamy-performer, ♥), 7 Bram (carpenter,
    quiet-craftsman, ♥), 8 Ada (elder herbalist/forager, shy-naturalist, —),
    9 Finn (kid fisher apprentice, eager, — never romanceable, enforced by type),
    10 Jonas (peddler, gossipy-connector, —). 4 romantic candidates per
    DECISIONS "Romantic NPCs v1: 3-4". Closed days: Maren Tue, Tobin Thu,
    Sera Sat.
  - **Behavior:** the town is alive with AI off — stallkeepers stand their
    stalls in work hours (each with a different closed day), Liora busks near the
    square (never on the player's busk spot), Ada forages a different forest
    corner each day, Finn fishes off the lake dock (after-school on weekdays, all
    day weekends), Jonas walks the farm↔market road (direction alternates by
    day), Petra bakes at her cottage and works the square mid-day, Henrik & Bram
    work the neighbour farm. Everyone gathers at the well on Sunday morning and
    sleeps at home at night (~22:00–06:00, ±1h). Talking shows a personality
    one-liner and turns the NPC to face you.
- **Build:** `npm run build` — ✅ passing.
- **Verify (Playwright, dayLength temporarily 90s, restored):** market Monday
  13:00 = 5 townsfolk doing distinct things (3 stalls + Petra browsing + Liora
  busking); Ada foraging in the forest; Finn fishing on the dock; night 23:00 =
  all 10 indoors; a closed day differs (Maren atWork@stall Mon vs socializing@
  well Tue); talked to 3 NPCs (Liora/Henrik/Bram — 3 distinct lines, each turns
  to the talking pose); Sunday 10:00 = all 10 socializing at the well; reload →
  Continue loads the existing save. No page errors. Screenshots reviewed.
- **Commit:** bb70e96 — "NPC engine — 10 townsfolk with weekly schedules on the shared rig"
- **Follow-ups:**
  - No persistence needed (schedules are deterministic from the clock) — noted
    per the block; nothing to save/load for NPCs.
  - The `onTalk` seam is a single canned-line stub; the next block swaps its body
    for the dialogue engine without touching `registerNpc`/`drawNpc`/movement.
  - `isRomantic()` and the `family`/`backstory`/`heartEvents` fields exist for
    v5 but have no consumer yet (the relationships / Heart-Events blocks).
  - Sped-up verification (dayLength ≤ ~40s) can out-run the longest NPC walk
    (Bram cottage→neighbour-farm ~17s) between hourly state changes; at the real
    default pace (1440s) it never happens. Not a bug at shipping settings.
  - The dev-only `__wh` bridge is compiled out of production; harmless in dev.

## Segmented rig — jointed player, poseable actions, rigged animals
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (Part B #6) Replace the static player/animal painters with a
  shared, jointed, poseable rig system, keeping the Cute-Fantasy look (shared
  dark OUTLINE, elliptical drop shadow, warm palette). Humanoid rig for the
  player (and, next block, the 10 NPCs) parameterised so distinct characters
  are cheap; walk cycle keyed to DISTANCE moved (phase = dist/stride); distinct
  pose functions (idle/walking/fishing/hoeing/foraging/busking/talking/
  sleeping); animals refactored to parameterised four-legged / bird rigs, built
  so Part-C animals are variants not new engines; painter interface kept narrow
  so a future sprite-swap stays local.
- **Done:**
  - **Files:**
    - `src/art/rig.ts` (NEW): the humanoid rig. Exports `RigParams` (scale,
      build slim/average/round, legLength, armLength, skin, hair style +
      color, `Outfit` {torso/torsoStyle/legs/legStyle/accent/shoes}, age
      kid/adult/elder, hatColor), the `PoseName` union, `Facing`, the
      `drawRig(g,x,y,facing,params,pose,phase,t)` single entry point, and
      `RIG_STRIDE`. Limbs are capsules anchored at both joints (root→hand /
      hip→foot) so nothing detaches at any zoom; upper body bobs/leans while
      legs stay grounded; head/hair (short/ponytail/bun/bald/hat) + face per
      facing; held-tool shapes (rod/hoe/lute/basket) drawn inline per pose.
    - `src/art/animalRig.ts` (NEW): `drawQuadruped` + `drawBird` with
      `QuadrupedParams` / `BirdParams`, `QUAD_STRIDE` / `BIRD_STRIDE`, and
      ready presets `COW_RIG` / `HEN_RIG`. Cow: 4 legs on a trot gait, body
      spots, ears/horns/tail/snout params, head graze-bob when idle, tail
      flick. Hen: two stepping legs, flapping wing on move, comb/beak/eye,
      peck. Param shapes cover pig/sheep/duck/cat/dog/rabbit as variants.
    - `src/art/characters.ts` (REWRITTEN): now thin adapters — `drawFarmer`
      → `drawRig` with `DEFAULT_PLAYER_RIG` and pose/dist from the entity;
      `drawCow`/`drawHen` → the animal rigs. main.ts's draw/depth-sort is
      unchanged (same exported names, same feet anchors).
    - `src/entities/player.ts`: `Player` gains `pose: PoseName` and
      `dist: number` (accumulated travel for the distance-keyed walk cycle,
      banked in `updatePlayer`); new exported `DEFAULT_PLAYER_RIG` reproducing
      the established straw-hat farmer (one place, later fed by Character
      Creation).
    - `src/entities/animals.ts`: `Cow`/`Hen` gain `dist` + `moving` (and hen
      `flip`); `updateAnimals` banks distance and sets `moving` for the rigs.
    - `src/main.ts`: derives `player.pose` each frame from the live activity
      flags (fishing.casting → fishing, foraging.picking → foraging,
      farmwork.working → hoeing, busking.playing → busking, moving → walking,
      else idle) — no new state machine.
  - **Systems / functions:** no save keys touched (rig fields are runtime
    state, not persisted); `RigParams`/`PoseName`/`Outfit`/`QuadrupedParams`/
    `BirdParams` types; `drawRig`/`drawQuadruped`/`drawBird`; stride constants.
  - **Behavior:** the player is now a jointed character that walks (legs/arms
    swing on distance, subtle torso bob), casts with a rod arced over the
    water, bends and swings a hoe while tilling, crouches with a basket at a
    bush, and strums a lute at the busk spot; talking + sleeping poses exist
    for the coming NPC/needs blocks. The cow walks on a gait with a flicking
    tail and grazing head-bob; the hen steps and flaps. Reads as the same
    farmer as before, just alive.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** temporary rig gallery (deleted) reviewed via Playwright —
  all 8 poses distinct/readable, walk limbs swing across phases, left/right
  mirroring, min (0.84) & max (5.28) zoom with no detached limbs, 6 NPC-variety
  param sets all distinct, cow + hen animate. In-game (Playwright): idle,
  mid-walk ×2 phases, fishing at the pond, hoeing on a field cell, foraging at
  a bush, busking at the market square, cow + hens in the yard, min/max zoom,
  and a seeded pre-existing save loaded (coins 137, backpack carp×4 + berries
  ×6, cow + 2 hens spawned) — no page/console errors in any run.
- **Commit:** <hash + message — fill in after committing>
- **Follow-ups:** up/down facing reuse the front profile (eyes shift, no
  dedicated back-of-head walk) — matches the pre-existing single-orientation
  art; add if a later pass wants true 4-dir. NPCs (next block) call `drawRig`
  directly with their own `RigParams`. Full standalone tool painters (rod/hoe/
  lute/etc.) arrive in Part C; the rig currently draws minimal inline shapes.

## docs — session planning: ROADMAP_TO_V5 + AI_ARCHITECTURE + PROPOSALS
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** (from `docs/FABLE_PROMPT.md`, "Docs to produce during this
  session" #2-4) Three planning docs, each written by a dedicated subagent.
- **Done (docs only):**
  - **Files:**
    - `docs/ROADMAP_TO_V5.md` (NEW): the v1→v5 product arc — per version:
      theme, every system's state, the gap from the previous version,
      dependencies, scope estimate, risks. v1/v5 anchored to DECISIONS.md;
      v2 (town opens) / v3 (crafting+professions+appearance) / v4
      (family+living economy) interpolated by dependency order.
    - `docs/AI_ARCHITECTURE.md` (NEW): Part D blueprint — `src/systems/ai/`
      module tree behind an AICtx facade, BYOK browser-direct Anthropic
      transport, all 8 use cases with prompts/context/cost/fallbacks,
      closed NPCAction union + validator, budget/cache/rate limits, mock
      provider + deterministic testing, v1→v5 evolution.
    - `docs/PROPOSALS.md` (NEW): 22 proposals across mechanics / features /
      improvements / content, each with target version + build surface.
    - `docs/HANDOFF.md`: what-was-built, decisions #4-9, subagent registry.
  - **Behavior:** none — documentation only.
- **Build:** `npm run build` — ✅ (no source change).
- **Commit:** docs — session planning: ROADMAP_TO_V5 + AI_ARCHITECTURE + PROPOSALS
- **Follow-ups:** owner reviews PROPOSALS.md + the judgment calls logged in
  HANDOFF decisions #8-9.

## World expansion v1 — road, market stalls, forest passage, river & lake
- **Date:** 2026-07-07 (v1-foundation)
- **Block given:** World expansion v1 (from the supervisor's block prompt):
  grow the single farm scene into the v1 world per DECISIONS "Areas in v1" —
  farm (unchanged, at the west) + a dirt road east past one established
  neighbour farm + a stall-road market square (4 distinct stalls, a well,
  5-6 cottages, the relocated busk spot) + a forest passage branching north +
  a river down the east edge widening into a south-east lake with a dock.
  Add a `regionAt()` helper + a `location` slice to WorldContext; keep the
  farm's internal layout and all saves working; NOT the town.
- **Done:**
  - **Files:**
    - `src/config.ts`: world grew to `MW=108, MH=30` (3456x960 px, ~4x the old
      area, one canvas — both sides < 4096, no chunking needed); added
      `ROAD_W`; `MINIMAP_SCALE` 0.14 -> 0.11 (readable at the wider aspect).
    - `src/world/zones.ts`: the whole new layout — `Region` type + `regionAt()`;
      `ROAD_SEGMENTS` (+`onRoad`), `HEDGES` (farm's east natural bound with a
      road gap), `NEIGHBOR` (cared-for house+barn), `MARKET_STALLS` (4 typed
      variants), `WELL`, `COTTAGES` (6), `FOREST_TREES`, `ROADSIDE_TREES`,
      `WORLD_TREES` (combined), `FOREST_BUSHES`, `RIVER`/`LAKE`/`DOCK`
      (+`inWater`/`onDock`), `FISH_SPOTS` (river x2 + lake), `STRUCTURES`
      (lower-75% collidables), `Rect` type/`rect()` helper; relocated
      `BUSK_SPOT` to the market + `OLD_BUSK_SIGN` at the farm.
    - `src/world/collision.ts`: blocks the new structures/hedges/well/forest &
      roadside trees, and river+lake water (dock excepted) via `inWater`.
    - `src/world/ground.ts`: paints packed-dirt road, darker forest floor +
      leaf litter, the market apron + well cobbles, river/lake water with sandy
      banks; ambient-prop scatter scaled by area (`AREA_K`) with rejection
      zones around every new region's water/road/buildings/props + a per-region
      palette (forest leaves, waterside pebbles, forest-biased mushrooms).
    - `src/art/buildings.ts`: `drawHouse`/`drawBarn`/`drawStall` now take an
      optional rect (farm calls unchanged); `drawStall` takes awning/accent/sign
      so the 4 market stalls read distinct (fish/produce/goods/empty); new
      `drawCottage`, `drawWell`.
    - `src/art/props.ts`: new `drawHedge`, `drawDock`, `drawBuskSign`,
      `drawOpenWaterShimmer` (river+lake surface + fishing-spot ripples).
    - `src/systems/fishing.ts`: `FishingState.location` + `startCast(..., loc)`
      so `resolveCatch` rolls the pond/river/lake table for where you cast.
    - `src/systems/foraging.ts`: `createBushes()` now includes `FOREST_BUSHES`
      (foraged as "forest", like the farm-edge cluster).
    - `src/systems/interact.ts`: river/lake fishing spots (pass location, rod-
      gated like the pond), decorative Look-only market stalls/cottages/well/
      old busk sign; pond cast now passes "pond".
    - `src/systems/worldContext.ts`: `location?: Region` source + slice
      (Block-6 recipe).
    - `src/main.ts`: draws river/lake shimmer, the dock (ground level), hedges,
      neighbour farm, market stalls, cottages, well, busk sign, and all
      `WORLD_TREES` (depth-sorted); passes `fishing.location` to `resolveCatch`
      and the player's `regionAt()` region into `getWorldContext`.
    - `src/ui/minimap.ts`: static layer now renders the whole world (forest/
      market/road tints, river+lake+dock, farm + neighbour + market buildings,
      all trees, hedges).
    - `docs/WORLD_CONTEXT.md`: data-owner table Location row -> **Built**.
  - **Systems / functions:** `regionAt`, `onRoad`, `inWater`, `onDock`,
    `WORLD_TREES`, `FISH_SPOTS`; `FishingState.location`; WorldContext
    `location` slice. No new save keys — no persisted store changed, so every
    existing save loads unchanged.
  - **Behavior:** the farm is now the west corner of a large open scene. A dirt
    road exits east through a hedge gap past a thriving neighbour farm to a
    market square (4 stalls, a well, 6 cottages, and the busk spot — busking now
    only works here, per DECISIONS; the farm keeps a signpost pointing here). A
    forest passage branches north (denser trees, forageable "forest" bushes,
    darker floor). A river runs the east edge into a south-east lake with a
    walkable dock; fishing works at designated river and lake spots (correct
    location table) while the farm pond still fishes as "pond". Water is
    impassable except the dock. The minimap shows the whole world; the debug
    panel (backtick) shows the current region.
- **Build:** `npm run build` — ✅ passing.
- **Verified (Playwright, in-browser):** walked/teleported the full loop and
  screenshotted every region (reviewed: road reads as packed dirt, market reads
  as a plaza with distinct stalls, forest is dense/dark, river+lake+dock read
  right, farm untouched, no floating props). Debug panel location correct in all
  5 regions (farm/road/forest/market/river). Forest foraging picked berries;
  river & lake spots both landed catches while the pond gave a pond-only species
  (Bluegill) — confirming per-location routing; busking at the market earned
  coins; walking east into the lake stopped at x≈79.95T (water impassable, lake
  at 80T); a save reloaded via Continue. Temp teleport/pos hooks used only for
  screenshots were removed before commit.
- **Follow-ups:** market stalls/cottages/well are decorative (Look-only) — NPC
  trading/entry and the "real sell menu at the market" are their own later
  blocks. Lake fish table has no low-skill species, so early lake catches fall
  back to carp (expected). Farm→market is a ~10-13s walk, not the block's
  aspirational 20-40s — capped by staying at ~4x area / one <4096px canvas at
  the current 150px/s speed (a deliberate trade; "hours of walking" is the v5
  aim).

## docs — v1-foundation baseline: DECISIONS + FABLE_PROMPT + doc sync + HANDOFF
- **Date:** 2026-07-06 (v1-foundation, session start)
- **Block given:** (from `docs/FABLE_PROMPT.md`, "Doc sync — before any code")
  Commit the product owner's uploaded docs; smart-merge ROADMAP_EXPANSION
  (never lose an [x] tick); replace VISION if the uploaded copy is newer.
- **Done (docs only):**
  - **Files:**
    - `docs/DECISIONS.md` (NEW to git): the product-decision record from the
      design sessions — now the tie-breaker source of truth for scope.
    - `docs/FABLE_PROMPT.md` (NEW to git): this session's work order, kept
      for the record.
    - `docs/ROADMAP_EXPANSION.md`: smart merge — kept every accurate `[x]`
      tick from the uploaded copy (all cross-checked against real commits;
      the repo's copy had them reset since the batch-3 baseline upload) AND
      restored the two repo-only chunks describing built work the uploaded
      copy lacked (the ticked stall-selling block; the HUD block's
      minutes/day-length amendment). Union of blocks, union of ticks.
    - `docs/VISION.md`: the uploaded copy's single change (starting coins
      50 → 15 in the anchor table) was REJECTED as stale — DECISIONS.md
      says 50, commits `8d58520`/`ff95174` decided and shipped 50. Repo
      copy kept unchanged. Flagged OWNER PLEASE CONFIRM in HANDOFF.md.
    - `docs/HANDOFF.md` (NEW): the session's master continuity doc —
      session context, doc-sync resolutions, autonomous-decision log,
      subagent registry, how-to-continue. Updated throughout the session.
  - **Behavior:** none — documentation only.
- **Build:** `npm run build` — ✅ (no source change).
- **Commit:** docs — v1-foundation baseline: DECISIONS + FABLE_PROMPT + doc sync + HANDOFF
- **Follow-ups:** none.

## Stall selling — driven by the player's chosen path (Fishing)
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 3)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Stall selling — driven
  by the player's chosen path, starting with Fishing") Make the sell surface
  path-aware as a first-class concept — capability-gated (owns a rod / has
  fished), never a frozen day-one label — with fish/junk routed through the
  new lookup and structured so a second category is a small additive
  registration. **Scope: Fishing only**, per the explicit note.
- **Done:**
  - **Files:**
    - `src/systems/sellCategories.ts` (NEW): `SellCategory { id, applies(ctx),
      itemIds }` + `SELL_CATEGORIES` (just `fishing` for now) +
      `sellableGoodIds(ctx)` — the dispatch: goods claimed by NO category
      pass through (their categories arrive in later blocks); an applying
      category adds its goods; output preserves `GOOD_PRICES` order so
      fisher-side rows render exactly as before. Fishing's capability check:
      owns a rod, OR the Memory Book records any caught species, OR the bag
      holds legacy generic fish. Fishing claims all 12 species + 3 junk +
      legacy "fish".
    - `src/ui/shopwindow.ts`: the sell list reads the injected
      `sellable()` lookup instead of flat `GOOD_PRICES`; **"Sell everything"
      now sells only what the stall shows** (hidden-category goods stay in
      the bag) — it previously used `economy.sellAllGoods`, which would have
      silently sold hidden fish.
    - `src/main.ts`: composes the context (`{ inv, collections }`) into
      `initShopWindow`.
  - **Generalizability (the block's inspection criterion):** adding Farming
    later = one new `SellCategory` entry (id, capability check, item ids) in
    `SELL_CATEGORIES` — `sellableGoodIds`, the shop window, and main are
    untouched. The claimed-set and pass-through are derived, not hand-listed.
  - **Behavior:** a fisher's stall is pixel-identical to before. A player
    with no fishing capability doesn't see fish/junk rows or fish UI framing
    at all — and Sell-everything can't touch such goods — but the moment
    they buy a rod (or have ever landed a catch), the fish counter is theirs.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 6/6: rod owner sells carp/junk/
  berries exactly as today (2 carp → +6 coins); a hoe-life player holding
  seeded carp+tin sees neither row while berries/corn still sell, and Sell
  everything earned exactly the visible 16 leaving carp+tin in the bag;
  buying a rod surfaced the fish rows in the same window; a rodless player
  whose Memory Book records a catch still sells fish (has-fished capability).
- **Commit:** Stall selling — driven by the player's chosen path (Fishing)
- **Follow-ups:** `economy.sellAllGoods` is now uncalled (kept for
  compatibility; remove or repoint when the next category block lands).
  Farming/eggs and Performer behaviors are the next blocks, one at a time.

## Visual pass II — shared outlines + richer grass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 3)
- **Block given:** (batch-3 instruction) Push toward the reference look:
  (1) a consistent dark outline stroke around every drawn shape via a shared
  helper — the identified highest-impact cheap technique; (2) grass-blade
  tufts + tiny flower dots baked into the pre-rendered ground; (3) confirm
  every entity has the soft drop shadow, extend where missing.
- **Done:**
  - **Files:**
    - `src/art/shapes.ts`: the game-wide outline defined ONCE — `OUTLINE`
      (rgba(43,32,19,.62)) + `OUTLINE_W` (1.6) with three helpers:
      `outline(g)` (strokes the current path right after a fill), `oRect`,
      `oEllipse`. No per-object stroke styling anywhere.
    - Applied across every major silhouette: player (torso, head, hat),
      cow (body, head), hen (body, head), tree trunks + canopy blobs, bush
      blobs, every fence post (incl. leaning ones), ripe crop ears, flower
      beds, the busk hat, house/barn walls (contour on `drawPlankWall`),
      both shingled gables (contour stroked outside the clip), doors,
      chimney, the stall counter + awning. Deliberately NOT outlined: tiny
      specks (grass blades, soil crumbs, sprouts) and pre-existing stroked
      details, which would turn to mud at 1.6px.
    - `src/world/ground.ts`: 240 grass tufts (3-5 blades fanning from a
      base point, two greens) + 320 tiny pastel flower dots, deterministic,
      painted before the yard/field/pond layers so those areas stay clean —
      zero per-frame cost like batch 2's props.
  - **Shadow audit:** every drawn entity already carries the shared
    elliptical `shadow()` — player, cow, hen, trees, bushes, house, barn,
    stall. Nothing was missing; nothing duplicated. (Ground decals —
    stones/leaves/mushrooms/flower beds — correctly cast none.)
  - **Behavior:** purely visual. The farm reads dramatically closer to the
    reference: every object pops from the ground with the same soft dark
    contour, and the grass is textured with tufts and flower specks instead
    of flat green.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** screenshots reviewed full-farm and zoomed (outlined
  farmer/buildings/fence/trees/crops; tufted, dotted grass; weathered-roof
  contour crisp outside the shingle clip). Functional smoke: field prompts
  live, zero page errors.
- **Commit:** Visual pass II — shared outlines + richer grass
- **Follow-ups:** the interior room deliberately kept its softer look (it
  has its own light language); revisit with the Housing tier-2 pass.

## Fix: starting coins = 50
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 3)
- **Block given:** (batch-3 instruction) VISION.md's price anchor table now
  decides starting coins = 50 (was 15 in the old doc, 0 in code — a conflict
  batch 2 flagged). Update the code to match; verify a fresh New Game starts
  with exactly 50, in-browser.
- **Done:** `STARTING_COINS = 50` in `config.ts` (with the anchor-table
  reference); `newGameReset` in `main.ts` seeds `economy.coins` from it
  instead of 0. Nothing else touches starting money.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 2/2: a New Game over a seeded
  999-coin old life starts at exactly 50 (HUD and persisted save both
  checked), and the 50 survives reload + Continue.
- **Commit:** Fix: starting coins = 50
- **Follow-ups:** none. (VISION says "enough for exactly one starter-tool
  choice" — 50 comfortably covers the 12-coin tools; the anchor number wins.)

## Farm environment detail pass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 2)
- **Block given:** (batch-2 instruction) Richer visual texture on existing
  farm objects, fully code-drawn: furrowed tilled soil, weathered/patched vs.
  repaired shingle roofs, vertical plank wall striping, multi-tone tree
  canopies, procedurally scattered ambient props (leaves/stones/mushrooms,
  no gameplay function), drop shadows under entities if missing.
- **Done:**
  - **Files:**
    - `src/art/props.ts` — `drawTilledTile`: four gently-waved furrow rows
      (dark groove + lit crest) with per-tile deterministic wobble and soil
      crumbs, still darker/damp when watered. `drawTree`: a true three-tone
      blob-clustered canopy — dark under-layer, mid-tone body, sunlit top
      clusters — with subtle per-tree tint variation and a bark seam.
    - `src/art/buildings.ts` — new shared helpers: `drawPlankWall` (vertical
      planks with alternating tone, thin seams, occasional knots —
      deterministic, never shimmers) applied to the house and barn walls;
      `drawShingleRoof` (overlapping offset shingle rows, per-shingle tone
      jitter, row shadow lines) applied to both gables — **weathered state
      (pre-repair) gets stronger jitter and missing-shingle gaps; repaired
      reads neat and even**. The existing rundown extras (roof hole + patch
      plank, boarded window, barn boards) draw on top unchanged.
    - `src/world/ground.ts` — `scatterAmbientProps`: 42 stones (faceted grey
      pairs), 56 fallen leaves (tinted ovals with midribs), 7 mushrooms,
      baked once into the pre-rendered ground (zero per-frame cost) with a
      fixed seed and rejection zones covering the field at its **maximum
      expanded size**, pond, buildings, path, bushes, flower beds, and the
      busking spot — so props can never sit under interactables or block
      anything (nothing in the ground layer collides by construction).
    - Drop shadows under entities: **already present** (`shadow()` in
      drawFarmer/drawCow/drawHen) — verified, not duplicated.
  - **Behavior:** purely visual — the farm reads richer at every zoom: soil
    has furrows under every crop, roofs are shingled and visibly weathered
    until repaired, walls are planked wood, canopies have depth, and the
    grass is quietly alive with leaves, stones, and the odd mushroom.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** screenshots reviewed at both farm states and zoomed
  (weathered vs. neat shingles contrast; furrows + five crop palettes over
  them; planks + knots up close; props scattered on grass but absent from
  field/pond/paths). Functional smoke in-browser: field prompts (Till) still
  live after the art pass; zero page errors during play.
- **Commit:** Farm environment detail pass
- **Follow-ups:** the WORLD_MAP.md rundown-farm concrete details (coop, well,
  missing fence section, sparkle spots, broken bridge, mine on the horizon,
  visible road) are now unblocked by the new doc but belong to their own
  ROADMAP block — not folded into this purely-textural pass.

## UI/HUD exterior design pass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 2)
- **Block given:** (batch-2 instruction) A general visual redesign of the UI
  chrome, consistent across every window: a circular sun/moon clock dial
  replacing the flat time pill, shared panel chrome (rounded corners, subtle
  border, drop shadow), on-screen icon buttons as the primary way into
  windows (VISION Controls — speced, never built), and the same outlined
  rounded treatment on item cells and toasts.
- **Done:**
  - **Files:**
    - `src/ui/clockdial.ts` (NEW, built by a parallel subagent to spec): a
      pure canvas painter — hour-blended sky face (night→dawn→day→dusk), a
      sun with a soft glow traveling a 6:00→19:00 arc / a crescent moon on
      the night arc, horizon line, HH:MM in the lower half, wood+gold rings
      with a 60° season-tinted tick, and subtle rain/storm/fog marks. Driven
      by the same per-frame `getWorldContext()` snapshot (types only).
    - `src/ui/hud.ts`: a dpr-crisp 64px `#clockDial` canvas redrawn each
      frame; the date pill drops the time ("Spring · Day 4") — time lives on
      the dial; weather pill unchanged.
    - `index.html`: a design-token block (`:root` — ink/gold/wood/panel
      gradient/hairline/cell tokens, two shadow recipes) with grouped
      overrides so **all four floating windows + minimap share one chrome**
      (2px wood border, 14px radius, gold hairline inset, soft drop shadow,
      gold headers with hairline underlines); pills/prompt/toast get the same
      outlined treatment; tool/zoom buttons unified with hover/active states;
      the HUD restructured to dial + info column; skills panel default
      geometry adjusted (top 470, list 150px) so nine skills clear the tools
      row.
    - **Icon-first windows:** a new 🗺 map tool button (the minimap was
      keyboard-only); all four windows now open primarily by icon with
      keys as secondary (VISION Controls). **Fixes a real batch-1 bug:** the
      Memory Book had claimed key M, colliding with the minimap — the book
      is now B (`ui/memorybook.ts`), the map keeps M (`ui/minimap.ts`, which
      also gained the button wiring + active state).
  - **Behavior:** the HUD corner is now a small painted clock — sun arcs
    across a day-blue face, a crescent moon rides the night, the ring's top
    tick shows the season, rain/storm/fog mark the face — beside compact
    coins/date/weather pills. Every window, pill, toast, and button shares
    one wood-and-gold chrome language with soft shadows under everything
    that floats.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 6/6 functional: the dial
  canvas actually paints (3168 opaque px); the date pill dropped the time;
  all four tool icons toggle their windows; **M toggles only the map and B
  only the book** (each panel's visibility checked against the other's
  stability); computed styles confirm identical border/radius/shadow across
  backpack/skills/book. Eye review of screenshots: noon full-HUD, dawn
  (peach face, low sun), night (crescent moon), rain marks — all legible at
  64px.
- **Commit:** UI/HUD exterior design pass
- **Follow-ups:** the toast's green success tint was unified into the shared
  chrome (pale-green text on panel dark) — flag if the old solid green was
  preferred. Quest-log icon joins the tools row when quests exist.

## Farm plot expansion — money-gated
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1, batch 2)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Farm plot expansion —
  money-gated") Buy expansions that grow the usable farm area; plain
  money-gating, discrete steps, immediately visible payoff; exact
  size/price/tier count TBD during implementation.
- **Implementation decisions (the TBDs), with reasoning:**
  - **Two tiers**, each a full-width 2-row strip **south** of the field, so
    the fenced area stays one clean rectangle and the fence visibly leaps
    outward on purchase (the block's visible-transformation principle). Each
    tier adds 22 tiles (+20% of the 110-tile base).
  - **Prices 120 / 180** (`PLOT_EXPANSION_PRICES` in config): the block says
    "above a fence-repair-scale purchase (10), closer to an animal-tier
    spend" — tier 1 sits between the hen (45) and cow (175); tier 2 at cow
    tier, escalating since it permanently doubles-down on capacity.
  - **Sold at the farmhouse hub** beside repairs — the same
    money-into-visible-farm-growth family; no doc names another vendor.
  - Two decorative trees south of the field moved to rows 20.8/21 in
    `zones.ts` so the tier-2 fence never swallows them.
- **Done:**
  - **Files:** `zones.ts` (`PLOT_EXPANSIONS` strips + `fieldBounds(tiers)`,
    tree nudge), `renovation.ts` (`FarmState.plotTiers`, tolerant load, reset
    to 0), `config.ts` (prices), `farming.ts` (`stripCells`/`expansionCells`;
    `loadPlots(tiers)` builds base+strips in tier order so saved cells map
    positionally; `resetPlots` truncates back to the base 110), `interact.ts`
    ("Expand the field (price)" on the farmhouse when a next tier exists —
    coins check, `plotTiers`+1, `expandFarm()` callback, Memory Book
    `first_expansion` entry; plot interactables now use a module id counter
    and guard on live-array membership so New-Game-dropped cells go inert),
    `props.ts` (`drawFence` takes live bounds), `minimap.ts`
    (`setMinimapField` repaints the static layer), `main.ts` (farm loads
    before plots; `expandFarm` materializes+registers the new strip, saves,
    updates the minimap).
  - **Behavior:** the farmhouse offers "Expand the field (120)"; buying it
    drops 120 coins, the fence and minimap jump southward instantly, and 22
    new wild tiles are tillable on the spot. Tier 2 (180) follows; after it
    the offer disappears. All of it persists; New Game shrinks the farm back.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 8/8: tier-1 offer/purchase
  (350→230 coins, 110→132 persisted cells, screenshot of the leapt fence),
  tier-2 (230→50, 154 cells), no tier 3 offered, **a cell at store index 143
  (tier-2 strip by construction) tilled through normal play**, and the broke
  refusal changing nothing. Minimap growth visible in screenshots.
- **Commit:** Farm plot expansion — money-gated
- **Follow-ups:** expansion ground keeps the grass texture (the pre-rendered
  ground doesn't repaint) — tilled tiles read fine on it; a dirt underlay
  could join a future ground pass.

## HUD — weather indicator
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "HUD - weather
  indicator") A small weather indicator next to (or directly below) the
  calendar readout showing `wc.weather` — plain text label first pass,
  reusing the same per-frame snapshot (no second `getWorldContext()` call).
  Not the visual weather layer.
- **Done:** a `#weather` pill in the HUD (index.html) rendering
  "☀ Clear / 🌧 Rain / ⛈ Storm / 🌫 Fog" from the snapshot already built in
  `tick()`; `updateHud` gains the optional `WeatherSlice`. Layout: the HUD
  row now wraps so the weather pill sits directly below the calendar (the
  spec's "or directly below") and the minimap moved down 36px to clear it.
  Also ticks the older combined "HUD — Calendar & Weather indicator" block —
  both its halves now exist via the split blocks.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 4/4 (fast 6s days): the seeded
  Storm showed immediately; across ~15 in-game days the label always matched
  the live weather store; every label change coincided exactly with a day
  rollover (the daily reroll — the block's "changes at the correct point"
  criterion); multiple states observed. Screenshot reviewed (clean two-row
  HUD, minimap clear).
- **Commit:** HUD — weather indicator
- **Follow-ups:** the visual weather layer (rain particles, sky tint) remains
  its own future polish item, as the block states.

## Dev tool — World Context inspector
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Dev tool — World
  Context inspector") A toggle-able debug overlay dumping the full
  `getWorldContext()` snapshot as readable text — backtick key (confirmed
  free in `engine/input.ts`), monospace on a translucent box, refreshed every
  frame while visible, never player-reachable.
- **Done:** `src/ui/debugpanel.ts` (NEW) — a fixed `<pre>` created in code
  (no player-facing markup), Backquote toggles; `updateDebugPanel(wc)` is fed
  the SAME per-frame snapshot the HUD uses (never a second
  `getWorldContext()` call, honoring the weather-block rule). Two lines in
  `main.ts`.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 5/5: hidden by default;
  backtick shows a dump carrying the real seeded state (coins 77, fog with
  daysSinceChange 2, spring dawn, all six slices present); the dump advanced
  live (375 → 412 in-game minutes over 1.5 real seconds at a 60s day);
  backtick hides it again. Screenshots on/off reviewed.
- **Commit:** Dev tool — World Context inspector
- **Follow-ups:** future slices (relationships, needs) appear automatically —
  it prints whatever the snapshot carries.

## Cooking skill, extended
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Cooking skill,
  extended") The minimal one-recipe version exists; build it out — more
  recipes using 2+ inventory items → 1 cooked item, sellable for more than
  the raw ingredients.
- **Done:** `src/data/recipes.ts` only — five multi-ingredient recipes join
  the same table the hearth already reads: Root stew (potato+carrot → 14,
  floor 5), Corn chowder (corn+potato → 15, floor 10), Forest sauté
  (mushroom+wild garlic → 9, floor 15), Fisher's supper (carp+sorrel → 10,
  floor 20), Berry pie (2 berries+wheat → 13, floor 25). Every dish prices
  above its raw-ingredient total; prices/names/icons flow through the
  existing table-driven plumbing with zero code changes.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 6/6: at the hearth with mixed
  ingredients the compote cooked first; Root stew was offered once its floor
  (5 ≤ Cooking 6) and BOTH ingredients were held, consumed both and produced
  the dish; the floor-25 Berry pie stayed hidden at Cooking 6 despite its
  ingredients being present; the stew sold at 14 (> 10 raw) in the stall menu.
- **Commit:** Cooking skill, extended
- **Follow-ups:** none — new dishes are one table row each.

## The Memory Book system
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "The Memory Book
  system") `systems/collections.ts` — a generic tracked-category engine (add
  entry, X/Y discovered), never one-off code per category;
  `systems/memories.ts` — a life-event log (timestamp + flavor text);
  `ui/memorybook.ts` — one window, two tabs, opened via an on-screen icon.
- **Done:**
  - **Files:**
    - `src/systems/collections.ts` (NEW): the generic engine — a `CATEGORIES`
      table + `discover()` (returns true only on FIRST discovery),
      `discoveredCount`, persisted on `wildhearth-collections-v1`.
      **Adaptation, documented:** the spec's first three categories
      (birds/animals/flowers) have no content source until the
      binoculars-sighting mechanic (Riverside Fisherwoman block, skipped this
      run) — so the first LIVE categories are fish (12) and wild finds (11),
      which the spec explicitly says plug into the same engine; the bird/
      animal/flower categories are one table row each when sightings land.
    - `src/systems/memories.ts` (NEW): curated once-per-key life events with
      an in-game date stamp (season + day), on `wildhearth-memories-v1`.
      Deliberately curated, per the spec's anti-Sims-3-log warning.
    - `src/ui/memorybook.ts` + index.html (NEW): a draggable/resizable gump
      (makePanel, like skills/backpack) with Collections/Memories tabs,
      opened from a new 📖 tool icon or key M; re-renders at most 1×/sec
      while open.
    - Event wiring: ten curated firsts — first catch/forage/harvest/busk/
      cook (main.ts), first repair + farm-made-whole (doRepair via a new
      `InteractCtx.memory` hook), first flowers (flower beds), first sale +
      first animal (`initShopWindow` gains a memory callback). Fish/forage
      discoveries log from the catch/pick handlers with a "New in your book"
      toast on first sighting only.
    - Both keys in `GAME_KEYS`; New Game wipes the book.
  - **Behavior:** a 📖 Memory Book opens anywhere: Collections shows "Fish
    2/12"-style progress with named, icon'd entries per discovery; Memories
    reads like a diary — "Spring, Day 4 — Your first catch…" — each moment
    recorded exactly once with its in-game date, surviving reload.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 8/8: empty book shows 0/12 +
  0/11 with empty states; four casts recorded 2 distinct species (junk
  correctly excluded) and exactly one first_catch memory stamped Spring Day
  4; both tabs render the real content; everything persists across reload.
  Screenshot reviewed (gump, tabs, dated entry, active tool icon).
- **Commit:** The Memory Book system
- **Follow-ups:** birds/animals/flowers categories + the diegetic "book sits
  at the rest corner" flavor arrive with the binoculars/sighting mechanic;
  minerals with mining (both blocked on skipped blocks).

## Camera zoom
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Camera zoom")
  `engine/camera.ts` gets zoom in/out — a mouse scroll-wheel handler on the
  game canvas and an on-screen button pair for touch, adjusting the existing
  scale within reasonable min/max bounds.
- **Done:**
  - `src/engine/camera.ts`: a player `userZoom` factor multiplies the
    automatic fit; `adjustZoom(steps)` clamps it to
    `CAM_USER_ZOOM_MIN/MAX` (0.6–2.4, step 0.15 — knobs in config).
  - `src/main.ts`: wheel listener on the canvas (preventDefault, notch = one
    step) + `#zoomIn`/`#zoomOut` click wiring.
  - `index.html`: a stacked ＋/− button pair bottom-right of the play area,
    styled like the existing tool buttons.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 5/5, measured by counting the
  farmer's exact shirt-tone pixels on the live canvas (sprite area scales
  with zoom²): baseline 398px → 1326px after five wheel-ups → 128px zoomed
  out → unchanged after 20 more wheel-downs (min clamp holds) → 982px after
  six ＋-button presses (touch path). Screenshot reviewed at max zoom-in.
- **Commit:** Camera zoom
- **Follow-ups:** zoom level is session-only (not persisted) — the spec
  doesn't ask for persistence; noted in case it's wanted later.

## Toast/notification queue
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Toast/notification
  queue") Toasts share one slot with no queueing — simultaneous events
  visually collide. Add a simple queue: one at a time, short delay between.
- **Done:** `src/ui/hud.ts` only — `toast()` enqueues instead of overwriting;
  `updateToast` shows each for 2.2s with a 0.3s gap before the next. A soft
  cap (4 waiting) drops the oldest message so an event burst (rapid fishing)
  can't leave minutes-stale toasts playing. No caller changes — same API.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 4/4: two back-to-back repairs
  fired two toasts that played in order ("roof is whole" → "light back in")
  with a visible gap and no clobbering. Bonus proof: on the first run the
  guided tip toast — which the old single-slot code would have clobbered —
  correctly queued and played first.
- **Commit:** Toast/notification queue
- **Follow-ups:** none.

## Complete the base skill set — 4 new skills + the Gain Guard
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Complete the base skill
  set") Add Animal Husbandry, Cooking, Building/Renovation, and Ornamental
  Gardening — each wired to a real mechanic — and patch the gain algorithm
  with a UO-style Gain Guard (consecutive failed gain-rolls force a success
  past a threshold), applied to all 9 skills uniformly.
- **Done:**
  - **Files:**
    - `src/systems/skills.ts`: SKILL_NAMES grows to 9; `Skill` gains a
      persisted `fails` counter; **gainSkill is now chance-based** — success
      chance `1 - value/100`, flat `SKILL_GAIN_BASE` (0.3) on success. The old
      code always gained a shrinking amount, so "failed gain-rolls" didn't
      exist; this conversion preserves the expected pace exactly (chance ×
      flat ≡ old shrinking gain) while giving the Guard something to guard.
      Past `GAIN_GUARD_FAILS` (4) consecutive misses the next roll is forced.
      Cap-draining unchanged, applied on success.
    - **Building**: `doRepair` in `interact.ts` rolls a Building gain per
      repair (the gap the block names). `InteractCtx` gains `skillPopup` so
      systems-level actions can float the "+0.3" without importing UI.
    - **Cooking (minimal)**: `src/data/recipes.ts` (berry compote: 2 berries
      → dish selling 6 > raw 4) + `src/systems/cooking.ts` (timed activity
      mirroring fishing; `COOK_TIME` 1.2s) + the interior hearth now offers
      "Cook X" per cookable recipe; completion consumes ingredients, adds the
      dish, rolls Cooking. Dish prices/names/icons table-driven (steaming-bowl
      painter). This unblocks the Keeper path's forage→cook→sell loop.
    - **Animal Husbandry**: owned cow/hens are interactables now
      (`registerAnimal` — live-position hit/reach, guarded against New-Game
      cleared arrays); Feed consumes 1 corn (`FEED_GAIN_ITEM`) and rolls
      Husbandry.
    - **Ornamental Gardening**: `src/systems/gardening.ts` (3 flower beds by
      the house on `wildhearth-garden-v1`, `FLOWER_BEDS` in zones), flower
      seeds at the stall (3), planting rolls Gardening; beds bloom over
      `FLOWER_GROW_DAYS` (0.5 day) and stay in bloom; `drawFlowerBed` paints
      earth → seedlings → swaying wildflowers.
    - `saves.ts`: `GARDEN_KEY` **and `PLOTS_KEY`** added to `GAME_KEYS`
      (plots key was missed in the crop unit — caught here).
    - **Fix found by verification:** the interior unit had left the front
      door's reach as the whole house rect, so "Go inside" shadowed the repair
      hub's E-prompt everywhere near the house. Door reach is now only the
      strip in front of the door; repairs prompt normally elsewhere.
  - **Behavior:** nine skills, all real: repairs train Building, the hearth
    cooks (and sells) a first dish, bought animals are fed your own corn for
    Husbandry, and flower beds bloom by the house for Gardening. Skill gains
    are rolls now — but a dry streak self-corrects within 5 uses at any level.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 14/14: all nine names in the
  skills window; a repair took Building 0→0.3 (deterministic at value 0);
  cooking consumed 2 berries → compote in bag + Cooking 0→0.3; feeding the hen
  consumed corn + Husbandry 0→0.3; planting flowers Gardening 0→0.3, the bed
  bloomed in its half-day and the bloom survived reload; and the Gain Guard
  held — 6 casts at Fishing 99 (1% chance) still gained ≥0.3. The interior
  suite re-ran green (7/7) after the door-reach fix.
- **Commit:** Complete the base skill set — 4 new skills + the Gain Guard
- **Follow-ups:** the gain-model conversion makes near-100 progress faster
  than the old guaranteed-but-tiny gains (a forced 0.3 every ≤5 uses vs 0.01
  per use) — flagged for tuning review; the block's spec demanded the Guard,
  which requires chance-based rolls. Cooking depth continues in "Cooking
  skill, extended".

## Foraging variety pass
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Foraging variety pass")
  Many more wild fruit/vegetable types (not just one generic berry), each with
  rarity/location/season tags in `data/forage.ts`, following `data/fish.ts`.
- **Done:**
  - **Files:**
    - `src/data/forage.ts` (NEW): 11 finds — berries (legacy id kept, floor-0
      all-season fallback), wild garlic, brown mushroom, sorrel, hazelnuts,
      wild strawberries, elderflower, wintergreens, rosehips, chanterelle,
      truffle (floor 60, weight 2 — the rare prize). Each: price, weight,
      skill floor, "forest" location tag, season tags, icon descriptor.
    - `src/systems/foraging.ts`: `resolveForage(skill, season, location)` —
      weighted roll over the eligible finds.
    - `src/main.ts`: the pick handler rolls the table (season + skill aware);
      the Foraging extra-find bonus stays on top; toasts name the find.
    - `src/systems/economy.ts`/`inventory.ts`: prices/names from the table
      (`BERRY_PRICE` retired from config).
    - `src/art/icons.ts`: four tinted forage silhouettes (cluster/cap/sprig/
      nut) shared across the table; berries keep their classic icon.
    - `src/systems/interact.ts`: bushes renamed "Forage bush" / action
      "Forage" with season-neutral flavor.
  - **Behavior:** every pick is a real find now — spring gives garlic and
    mushrooms alongside berries, autumn adds hazelnuts/rosehips/chanterelles,
    winter has wintergreens and (at high skill) truffles, and each sells at
    its own table price. Skill floors keep the rich finds gated.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 9/9: skill-0 spring picks stay
  in the floor-0 in-season set; autumn at skill 90 excludes spring/summer/
  winter-only finds and reaches gated ones (chanterelle observed); winter
  yields only winter-eligible finds and more than berries; forage sells at
  table prices in the stall menu (Chanterelle 8, Rosehips 5 verified rows).
- **Commit:** Foraging variety pass
- **Follow-ups:** the wild-fruit→farmable-seed bridge belongs to the Riverside
  Fisherwoman block (skipped this run); the table's location tags are ready
  for it and for new regions.

## Crop/farming variety pass — active tending
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Crop/farming variety
  pass") Two changes together: crop variety (a good number of types, fruits and
  vegetables, gated by Farming skill and season) and **active tending replacing
  passive timer growth** — planted crops need watering to progress; neglected
  crops grow slower or wilt outright. Also fulfils WORLD_CONTEXT Block 4's
  standing follow-up: rain now auto-waters outdoor plots.
- **Done:**
  - **Files:**
    - `src/data/crops.ts` (NEW): 9 crops (corn, carrot, potato, wheat, tomato,
      strawberry, winter root, pumpkin, melon) — each with seed id/name/price,
      produce price, `growDays` (watered in-game days to ripen), Farming skill
      floor (0–40), planting seasons, and a field/icon palette. Legacy generic
      "seeds" resolve to corn via `cropBySeed` (compat shim).
    - `src/systems/farming.ts` (rewritten): `PlotCell` gains `cropId`,
      `watered`, `dryDays`; new states incl. `wilted`; new work kinds `water` +
      `clear`; **the field persists** on `wildhearth-plots-v1`
      (`loadPlots`/`savePlots`/`resetPlots`, in `GAME_KEYS`) — also closing the
      MVP gap where crops vanished on reload; `updatePlots` advances **watered
      cells only** (growth = growDays × dayLengthSeconds, Farming still
      shortens it); `rollPlotsDay` (once per in-game day, after the weather
      reroll): hand-water drains, dry days bank, `WILT_DRY_DAYS`=3 wilts the
      crop, and **rain waters every growing cell for free**.
    - `src/systems/interact.ts`: plot menus rebuilt — Till; one "Plant X seeds"
      entry per distinct packet held (skill-floor + season refusals with clear
      toasts); Water (only when thirsty); Harvest; Clear for wilted; Look shows
      crop, %, and watered/thirsty.
    - `src/systems/shop.ts`: generic seed packet replaced by per-crop packets,
      **stocked only in their planting seasons**; `ShopEntry.seasons` +
      `initShopWindow` gets a season getter. `SEEDS_PRICE`/`CORN_PRICE`/
      `CROP_GROW_TIME` retired from config (data-table driven); `WATER_TIME`/
      `CLEAR_TIME`/`WILT_DRY_DAYS`/`PLOTS_KEY` added.
    - `src/art/props.ts`: watered soil reads darker/damp; `drawCropTile` tinted
      per crop palette; new `drawWiltedTile` (grey-brown drooped stalks).
    - `src/art/icons.ts`: tinted seed packets + a generic produce painter per
      crop (corn keeps its bespoke icon).
    - `src/systems/economy.ts`/`inventory.ts`: produce prices/names from the
      table (seeds deliberately not sellable back).
    - `src/main.ts`: plots load/persist; the five work completions (till/plant/
      water/harvest/clear) with rain-aware planting; `rollPlotsDay` on the
      day rollover; palette/watered/wilted-aware field drawing.
  - **Behavior:** nine crops with real seasonal identity — the stall stocks
    only what can be planted now, planting checks your Farming skill and the
    season, a fresh planting on a rainy day starts watered, hand-watering is a
    daily chore that visibly darkens the soil, three dry days kill the crop
    (Clear and start over), and the whole field — crops, watering, wilt —
    survives a reload.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 19/19 across 7 scenarios: the
  full till→plant→water→ripen→harvest arc with a mid-growth reload preserving
  crop+watered state; rainy-day planting auto-watered with no Water action
  offered; skill-floor refusal (melon at Farming 0); season refusal (pumpkin in
  spring); 3 consecutive dry days wilting the crop (through random rain days —
  observed rain-waterings en route, which is the system working) and Clear
  resetting the tile; spring vs winter stall stock; legacy "seeds" planting
  corn.
- **Commit:** Crop/farming variety pass — active tending
- **Follow-ups:** resolves the WORLD_CONTEXT Block 4 / Weather-block follow-up
  (rain→watering is now a real mechanical effect). Weeding/fertilizing depth
  and yield-scaling are future extensions the block names but doesn't require.

## House interior — first pass, deliberately bare and broken
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "House interior — first
  pass, deliberately bare and broken") The house becomes enterable; minimum
  viable rooms, each functional but rundown: soot-blackened hearth + rusty pot
  + empty shelf, cracked basin on a wobbly stand + empty bucket, straw bed with
  one threadbare blanket and no pillow, a short-legged chair + crate table,
  bare walls with a crack letting in a line of light at certain times of day,
  creaky/rotten floorboards.
- **Done:**
  - **Files:**
    - `src/world/zones.ts`: `HOUSE_DOOR` (matches drawHouse's door), `ROOM`
      (10×7-tile interior coordinate space), spot rects `R_HEARTH`/`R_BASIN`/
      `R_BED`/`R_REST`/`R_DOOR`, `ROOM_ENTRY`.
    - `src/world/collision.ts`: scene-aware collision — `Scene` type,
      `setCollisionScene()` (module-level, camera.ts precedent), interior walls
      + bed/basin/crate blocking; the world path unchanged.
    - `src/engine/camera.ts`: `applyCamera` takes optional bounds; a scene
      smaller than the viewport (the room) is centred instead of corner-pinned.
    - `src/art/interior.ts` (NEW): the whole room painter — plank floor with two
      split rotten boards, bare walls, the wall crack with a **day/dawn-gated
      light shaft** (reads day-phase), sooty hearth + rusty pot + empty shelf,
      cracked clay basin on a splay-legged stand + bucket, straw mattress +
      threadbare blanket (worn patch, no pillow), tilted short-leg chair +
      crate table, worn exit mat.
    - `src/systems/interact.ts`: `scene` field on Interactable + scene-filtered
      `hitTest`/`reachable`; new interactables — front door ("Go inside",
      registered before the house hub so the small hotspot wins), four interior
      Look spots with flavor text, and the exit mat ("Go outside", ordered
      before the rest corner so it wins their overlap; rest corner reach
      tightened). `InteractCtx` gains `enterHouse`/`leaveHouse`.
    - `src/main.ts`: scene state + `enterHouse()`/`leaveHouse()` (position
      swap, collision-scene switch, pending/menu cleanup), scene passed to all
      hit/reach lookups, `drawInteriorScene()` (centred room on darkness,
      dimmer vignette), minimap update paused indoors, shared `drawVignette`.
  - **Behavior:** clicking the farmhouse door (or E beside it) steps inside a
    small, centred room containing exactly the five specced spots, each
    inspectable with honest tier-1 flavor; the wall crack visibly leaks light
    during day/dawn; the exit mat walks you back out at the front door. World
    objects (pond/stall/plots) are unreachable indoors and vice versa. The
    interior is the future home of Cooking (hearth — next unit) and the Needs
    system (skipped this run; see AUTORUN notes).
  - **Not persisted:** which scene you're in — a reload starts outside (the
    spec doesn't ask for indoor save-position; noted here for honesty).
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 7/7: door offers "Go inside";
  all four spots found and Look-ed (exact flavor lines asserted); no world
  interactable leaks into the interior; exit via the mat returns to the yard
  with the door prompt back. Screenshots reviewed: centred room, hearth/bed/
  basin/chair/crate/mat all render, light shaft visible at noon.
- **Commit:** House interior — first pass, deliberately bare and broken
- **Follow-ups:** hearth Cook action lands with the base-skill-set unit; needs
  restoration at these spots waits on the Needs system (skipped — social need
  has no restoration path until NPCs exist).

## Fish variety (rich tier — 10+ species) + junk catches + the rod gate
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Fish variety (rich tier —
  10+ species) + junk catches") `data/fish.ts` species table (rarity weight,
  Fishing-skill floor, where/when tags), `data/junk.ts`, `systems/fishing.ts`
  rolls both tables; plus the fix: fishing must hard-require an owned rod.
- **Done:**
  - **Files:**
    - `src/data/fish.ts` (NEW): 12 species — Common Carp, Perch, Bluegill,
      Sunfish, Crucian Carp, Weather Loach (rain/storm-only), Pike, Silver Eel
      (autumn), Golden Koi, Moonfish (fog-only), Sturgeon (lake/boat — tagged
      for future zones, unreachable from the pond), Elder Carp (floor 90 pond
      legend). Each: price, weight, skillFloor, location tags
      (pond/river/lake/boat), optional season/weather tags, icon palette.
    - `src/data/junk.ts` (NEW): old boot / empty tin / tangled rope, token
      1-coin value (the spec's "no sell value (or a token amount)" — token
      chosen so junk never permanently clogs the bag).
    - `src/systems/fishing.ts`: `resolveCatch(skill, season, weather, location)`
      — junk odds `JUNK_CHANCE_BASE` 0.35 → `JUNK_CHANCE_MIN` 0.05 at skill 100,
      then a weighted roll over species filtered by location/floor/season/
      weather. Bite speed was already skill-scaled (slow bites at low skill).
    - `src/systems/interact.ts`: the rod gate — the pond's Fish action refuses
      without an owned rod ("You need a fishing rod — the stall sells one.").
    - `src/systems/shop.ts` + config: rod added to stall stock (`ROD_PRICE` 12,
      unique — same basic-tool tier as the hoe) so the hard gate never
      dead-ends a non-rod start; VISION's "everyone can fish a little" then
      holds via purchase.
    - `src/systems/economy.ts` / `inventory.ts`: `GOOD_PRICES`/`ITEM_NAMES` now
      build from the data tables (legacy generic "fish" stays priced for old
      saves).
    - `src/art/icons.ts`: parameterized fish-silhouette painter tinted per
      species palette; boot/tin/rope painters.
    - `src/main.ts`: the catch handler resolves against the tables using live
      skill + season + weather and toasts the actual species/junk by name.
  - **Behavior:** casting without a rod is refused with a shop hint; the stall
    sells a rod for 12. Catches are real species now — low skill sees junk
    (~35%) and commons; high skill sees junk rarely and reaches Pike/Koi/Elder;
    season and weather genuinely matter (Bluegill vanishes in winter, Crucian
    appears; Weather Loach only bites in rain; Moonfish only in fog). Every
    species sells at its own table price.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 20/20 across 7 scenarios: the
  rod gate refusal; buying the rod (20→8 coins) then landing a real catch;
  20 catches at skill 0 spring/clear → only Carp/Perch/Bluegill + 6 junk;
  25 catches at skill 95 → no out-of-season/weather species, high-floor
  species present, 1 junk; winter → Bluegill/Koi gone + Crucian present; rain
  → Weather Loach caught; species sell rows show table prices (Carp 3, Koi 14).
- **Commit:** Fish variety (rich tier) + junk catches + the rod gate
- **Follow-ups:** catch quality tiers, bait, and rod tiers belong to the
  Riverside Fisherwoman block (skipped this run — needs the river/NPC systems).
  River/lake/boat location tags are already in the table for when zones grow.

## Fix: no free animals
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "Fix: no free animals")
  The demo cow/hens contradict "nothing is free" — remove the default spawn;
  wire them into the MVP shop as buyable, with their own price and a coop/
  barn-repair prerequisite.
- **Done:**
  - **Files:**
    - `src/systems/livestock.ts` (NEW): `Livestock { version, cow, hens }`,
      load/save/reset on `wildhearth-livestock-v1` (added to config + `saves.ts`
      `GAME_KEYS`). New Game empties the yard.
    - `src/entities/animals.ts`: `createAnimals(owned)` spawns only purchased
      animals; new `spawnCow()`/`spawnHen()` (hens jitter so a flock spreads).
    - `src/systems/shop.ts`: `ShopEntry.livestock` kind; SHOP_STOCK adds Hen 45
      / Cow 175 (`HEN_PRICE`/`COW_PRICE` in config, per the price anchor table:
      first hen 40-50, first cow 150-200); new `tryBuyLivestock` — barn-gated
      ("no-barn"), coins-checked, never touches the backpack, one cow max
      (unique like the hoe), hens repeatable.
    - `src/ui/shopwindow.ts`: livestock buy rows (hen shows "(have N)"),
      barn-broken refusal toast ("Mend the barn first — animals need a sound
      home."), haggling discount + Haggling practice on success;
      `initShopWindow` now takes farm/livestock/onAnimalBought.
    - `src/main.ts`: loads livestock, spawns owned animals at boot, pushes a
      new cow/hen into the live arrays on purchase, clears both on New Game.
    - `src/art/icons.ts`: hen + cow shop icons. `ITEM_NAMES`: Hen/Cow.
  - **Behavior:** a new life starts with an empty yard. The stall sells hens
    (45) and one cow (175) — refused until the barn is mended; a purchase
    deducts coins, the animal appears in the yard immediately, and the flock
    survives reload. Prerequisite note: the block says "coop/barn-repair";
    no coop exists in the world yet (it arrives with the rundown detail pass,
    currently skipped for its missing WORLD_MAP.md source), so the mended barn
    — the named alternative — is the gate for both animals.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 10/10: new game has an empty
  livestock store and visibly empty yard (screenshot); shop lists Hen 45 / Cow
  175; barn-broken purchase refused with the right toast and no coin/store
  change; after barn repair a hen purchase deducts 45 and spawns (screenshot),
  a second hen grows the flock, the cow deducts 175 and leaves the shop row
  (unique); all of it persists across reload + Continue.
- **Commit:** Fix: no free animals
- **Follow-ups:** Animal Husbandry skill wiring (feeding) belongs to the
  "Complete the base skill set" block; eggs/milk production belongs to the
  animal-husbandry-expansion block (needs crafting).

## docs — reconcile stale ROADMAP_EXPANSION blocks with built work
- **Date:** 2026-07-04 (autorun/wildhearth-batch-1)
- **Block given:** autorun instruction — small corrections traceable to the docs.
  Two ROADMAP_EXPANSION.md blocks describe systems that were already built and
  verified during the World Context Infrastructure work but still read "not
  started".
- **Done (docs only):** ticked "The Season system itself" (satisfied by
  `systems/calendar.ts` + the day-length setting; noted the season-change-event
  convention) and "World Context Infrastructure — build these 4 together"
  (satisfied by WORLD_CONTEXT.md Blocks 1-6, commits 8c81d32…9e28515; noted the
  rain→crop effect intentionally waits for active tending).
- **Build:** `npm run build` — ✅ (no source change).
- **Commit:** docs — reconcile stale ROADMAP_EXPANSION blocks with built work
- **Follow-ups:** the older combined "HUD — Calendar & Weather indicator" block
  stays open until the weather-indicator half ships.

## HUD — season, day & time display (with real minutes + day-length setting)
- **Date:** 2026-07-04
- **Block given:** (from `docs/ROADMAP_EXPANSION.md`, "HUD - season, day & time
  display") A small always-visible readout of season / day / time — the first
  real, visible consumer of `getWorldContext()`. Build one `WorldContext`
  snapshot per frame in `tick()` and feed `wc.calendar` into `hud.ts`'s existing
  `updateHud` pattern. **Amendment folded in before first commit:** (1) add real
  minutes to `calendar.ts` (`minute` field + `advanceMinute` replacing
  `advanceHour`, still firing weather/flag daily work once per day); (2) add a
  real `dayLengthSeconds` setting driving the tick pace instead of the fixed
  `GAME_HOUR_SECONDS` constant; (3) show `HH:MM`.
- **Done:**
  - **Files:**
    - `index.html`: a second `.pill` (`#calendar`) inside the existing `#hud`,
      plus one CSS line (`#calendar{font-size:13px;white-space:nowrap}`).
    - `src/ui/hud.ts`: extended the existing `updateHud` to take an optional
      `CalendarSlice` and render `Season · Day N · HH:MM` (zero-padded); no new
      update mechanism.
    - `src/main.ts`: builds one snapshot per frame where `updateHud` is called —
      `getWorldContext({ economy, skills, farm, calendar, weather, flags: worldFlags })`
      — and passes `wc.calendar`. The world-time loop is renamed
      `hourAccum`→`minuteAccum`, its interval read from `dayLengthSeconds()/(24*60)`
      each frame, advancing via `advanceMinute`; weather reroll + flag prune fire
      on its `newDay` return.
    - `src/systems/calendar.ts`: added `minute` to `CalendarState`
      (`fresh`/`load`/`reset` extended the same way as `hour`/`day`); replaced
      `advanceHour` with `advanceMinute(c)` which rolls minute→hour→day→season and
      returns `true` only when a new day begins.
    - `src/systems/settings.ts`: `Settings` gained `dayLengthSeconds` (default
      1440 = 24 real min/day, matching the prior pace) + a clamped
      `dayLengthSeconds()` accessor (1s floor).
    - `src/config.ts`: removed the now-unused `GAME_HOUR_SECONDS`.
    - `src/systems/worldContext.ts`: `minute` added to `CalendarSlice` and its
      populate.
    - `docs/ROADMAP_EXPANSION.md`: block ticked `[x]` in the working tree, but
      **not staged into this commit** — the entire HUD-blocks section is part of
      the product owner's uncommitted edits to that file (HEAD is 214 lines vs
      1101 in the working tree), so staging it would have pulled in ~887 lines of
      their in-progress work. The tick rides along with their eventual
      `ROADMAP_EXPANSION.md` commit.
  - **Systems / functions:** `getWorldContext` gains its first permanent call
    site; `CalendarState`/`CalendarSlice` carry `minute`; `advanceMinute`
    replaces `advanceHour` (returns new-day, so daily work stays once/day, not
    once/minute); `dayLengthSeconds` is a live setting that controls the clock.
  - **Behavior:** the HUD always shows `Season · Day N · HH:MM`, updating every
    in-game minute (~1 real second at the default pace) with days and seasons
    rolling over live and surviving reload. The passage of time is now a real,
    changeable setting (no UI yet) rather than a hardcoded constant.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 9/9 (fast/slow runs seeded via the
  `dayLengthSeconds` setting — no source instrumentation): default day length is
  1440s when unset; the HUD shows `HH:MM` matching the calendar; minutes visibly
  move within a few real seconds (06:00→06:03 over 3s); 80/80 samples matched the
  live calendar including minutes; days rolled over live (14 distinct days) with
  hour/minute always in range; season also advanced spring→summer; the
  minute-precise calendar survived reload; and halving `dayLengthSeconds` ~doubled
  the pace (60s→73 min/3s vs 30s→144 min/3s, ratio 1.97).
- **Commit:** HUD — season, day & time display (real minutes + day-length setting)
- **Follow-ups:** no settings UI yet — `dayLengthSeconds` is real and controls the
  pace but can only be changed by editing the saved setting; a settings screen is
  a later UI block. Next agreed work: the HUD weather indicator block (not started
  yet).

## World Context Block 6 — recipe closed; Infrastructure (Blocks 1-6) complete
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 6 — the "add a new data
  source" recipe) Block 6 has no code of its own; it's the reusable three-edit
  pattern (`worldContext.ts` + `main.ts` + `saves.ts`, plus the per-NPC
  `query.npcId` scoping note) that future subsystems follow to join World
  Context. Close it out: re-check the recipe against what Blocks 3-5 actually
  did and fix any drift, mark Calendar/Weather/World-event-flags as Built in the
  data-owner table, and tick Block 6.
- **Done (docs only — no code change):**
  - **Files:**
    - `docs/WORLD_CONTEXT.md`: data-owner table now lists Calendar, Weather, and
      World event flags as **Built** (with their real files/shapes) instead of
      "being built in this file"; Block 6 ticked `[x]`; and the recipe text was
      corrected for drift found against the shipped code (see below).
    - `docs/WORKLOG.md`: this entry.
  - **Doc drift fixed:**
    - Recipe step 2 claimed the new source is passed "at whatever call site
      currently calls `getWorldContext(...)`" — but there is **no permanent call
      site**: Blocks 1-5 ship no consumer (the debug calls used to verify each
      were removed). Reworded to say the first real call will be the dialogue
      system's, and to add the field to that literal when it exists.
    - The per-NPC scoping note showed the second parameter as `query`; the
      shipped signature is `_query` (underscored, unused). Noted that the
      underscore is dropped when the first consumer reads it.
    - Recipe step 1 now records that a slice may be optional (as
      `calendar`/`weather`) or required-with-default (as `flags`, `{}` when no
      source) — matching what actually shipped.
    - Recipe step 3 now mentions hooking daily-rollover work (weather reroll,
      flag prune) into the `calendar.hour === 0` block, which Blocks 4-5 did.
  - **Behavior:** none — documentation only. `getWorldContext()` and its five
    live slices (coins, skills, farm, calendar, weather, flags) are unchanged.
  - **Milestone:** the World Context Infrastructure package (Blocks 1-6) in
    `docs/WORLD_CONTEXT.md` is now **complete** — every block built, verified,
    and committed; the doc is closed out. World Context is a working data layer
    any future system can read via one `getWorldContext(sources)` call.
- **Build:** `npm run build` — ✅ passing (no source changed).
- **Commit:** World Context Block 6 — recipe closed; Infrastructure complete
- **Follow-ups:** none for World Context. Next agreed work is **UI** (not the
  dialogue system or any ROADMAP_EXPANSION block yet).

## Block 5 follow-up — absolute day counter for flag expiry
- **Date:** 2026-07-04
- **Resolves:** the Follow-up recorded on the "World Context Block 5 — World
  event flags" entry (flag durations were keyed on `calendar.day`, the
  day-of-season 1–10 counter, so a duration crossing a season boundary was
  imprecise — a flag could effectively never expire because `day` resets 10→1).
- **Block given:** (product-owner instruction) Add `absoluteDay(c)` to
  `calendar.ts` returning `seasonIndex * DAYS_PER_SEASON + day`, and pass it
  instead of `calendar.day` at the world-flags call sites in `main.ts` and
  `worldContext.ts`. `worldFlags.ts` internals (a plain-number `expiresOnDay`)
  don't change. Verify a season-spanning duration expires at the right absolute
  day.
- **Done:**
  - **Files:**
    - `src/systems/calendar.ts`: added `absoluteDay(c: CalendarState): number`
      (`seasonIndex * DAYS_PER_SEASON + day`) — a monotonic day count across
      seasons.
    - `src/main.ts`: the daily-rollover prune now passes
      `pruneExpired(worldFlags, absoluteDay(calendar))`; imports `absoluteDay`.
    - `src/systems/worldContext.ts`: the `flags` slice now uses
      `activeFlagsRecord(sources.flags, absoluteDay(sources.calendar))` (0 when
      no calendar); imports `absoluteDay`.
    - `docs/WORKLOG.md`: marked the Block 5 follow-up resolved.
  - **Systems / functions:** new `absoluteDay` accessor; no change to
    `worldFlags.ts` (its `expiresOnDay`/comparisons stay plain numbers — they're
    just now fed an absolute day). No save-shape change; existing flag saves
    remain readable (numbers compare fine, only the reference frame widened).
  - **Behavior:** world-flag expiry is now measured on a continuous day count,
    so a flag set late in a season with a multi-day duration stays active across
    the season boundary and expires on the correct day instead of lingering
    forever.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright (5/5, temporary fast cadence + a
  `window.__wf` hook keyed on `absoluteDay`, both since reverted): a flag set on
  spring day 8 (absolute day 8) with a 5-day duration was active exactly while
  absoluteDay < 13 (hasFlag and the World Context slice agreeing on every
  sample), stayed active into summer after the season rolled over (absolute days
  11–12), was sampled across the spring→summer boundary, and expired precisely
  at absolute day 13 (summer day 3) — not early, not never.
- **Commit:** Block 5 follow-up — absolute day counter for flag expiry
- **Follow-ups:** none. Next: Block 6 (the "add a data source" recipe — no code
  of its own), pending your go-ahead.

## World Context Block 5 — World event flags
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 5 — World event flags)
  A generic, expiring "something just happened" mechanism. Create
  `systems/worldFlags.ts` (a versioned *set* of entries), add `WORLD_FLAGS_KEY`
  to config + `saves.ts`'s `GAME_KEYS`, instantiate/reset it in `main.ts` and
  `pruneExpired` on the daily rollover, and add a `flags` slice to World
  Context. Done when setting a flag makes it appear in
  `getWorldContext(...).flags`, it disappears on its own after the given number
  of in-game days (via `hasFlag`), and it survives save/reload.
- **Done:**
  - **Files:**
    - `src/systems/worldFlags.ts` (NEW): `WorldFlags { version, entries[] }`
      with `load/save/resetWorldFlags`, `setFlag` (expiry = currentDay +
      durationDays), `hasFlag`, `pruneExpired` (drops entries past their day),
      and `activeFlagsRecord` (→ `Record<string, boolean>` of still-active
      flags). Exactly the spec's code.
    - `src/config.ts`: added `WORLD_FLAGS_KEY = "wildhearth-flags-v1"` (matching
      the existing key convention).
    - `src/systems/saves.ts`: added `WORLD_FLAGS_KEY` to `GAME_KEYS`.
    - `src/main.ts`: `const worldFlags = loadWorldFlags()` beside the other
      stores; `resetWorldFlags(worldFlags)` in `newGameReset()`; and
      `pruneExpired(worldFlags, calendar.day)` on the daily rollover (same
      `calendar.hour === 0` call site as Block 4's weather reroll).
    - `src/systems/worldContext.ts`: imported `activeFlagsRecord`/`WorldFlags`,
      enabled the `flags?: WorldFlags` source, added a required
      `flags: Record<string, boolean>` to `WorldContext`, and populated it via
      `sources.flags ? activeFlagsRecord(sources.flags, sources.calendar?.day ?? 0) : {}`.
    - `docs/WORLD_CONTEXT.md`: Block 5 ticked `[x]`.
  - **Systems / functions:** new save key `wildhearth-flags-v1`; a reusable
    expiring-flag store (`setFlag`/`hasFlag`/`pruneExpired`/`activeFlagsRecord`);
    World Context now always carries a `flags` record (`{}` when no source).
    `setFlag`/`hasFlag` are exported for future callers (dialogue, quests, NPC
    reactions) but have no in-game caller yet.
  - **Behavior:** no player-facing change — infrastructure. Any future system
    can mark a transient world fact (e.g. `setFlag(worldFlags, "fixed_bridge",
    4, calendar.day)`) and read it back through World Context until it expires;
    the daily prune keeps the saved list from growing forever.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, 7/7 (temporary fast cadence + a
  `window.__wf` hook over the app's live `worldFlags`, both since reverted): a
  new game had no active flags; setting one made it appear in
  `getWorldContext().flags` and in localStorage; a 2-day flag (set on day 1)
  vanished from the slice and reported `hasFlag=false` by day 3 while a
  100-day flag stayed; `pruneExpired` removed the expired entry from storage;
  and the live flag survived a reload + Continue.
- **Commit:** World Context Block 5 — World event flags
- **Follow-ups:** ~~flag durations use `calendar.day` (day-of-season, 1–10) as
  the clock, so a duration crossing a season boundary is imprecise~~ **RESOLVED
  by "Block 5 follow-up — absolute day counter for flag expiry" (below/newer).**
  Also: Block 6 is the reusable "add a data source" recipe (no code of its
  own), pending your go-ahead.

## World Context Block 4 — Weather
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 4 — Weather) Create
  `systems/weather.ts` in the same shape as `calendar.ts`; add `WEATHER_KEY` to
  config, add it to `saves.ts`'s `GAME_KEYS`, instantiate + reset in `main.ts`
  and reroll it on each new in-game day (season-weighted), and expose a
  `weather` slice from World Context. The spec also notes a real mechanical
  effect (skip manual watering on rainy days) — per the product-owner
  instruction it is NOT wired yet (its farming.ts active-tending host block
  hasn't landed) and is recorded under Follow-ups instead.
- **Done:**
  - **Files:**
    - `src/systems/weather.ts` (NEW): `WeatherState { version, kind,
      daysSinceChange }` with `loadWeather/saveWeather/resetWeather`, a
      per-season weighted `WEATHER_TABLE`, `rollWeather`, `rollDailyWeather`
      (reroll for the day; `daysSinceChange` climbs on a repeat, resets to 0 on
      a change), and `isRaining`. Exactly the spec's code.
    - `src/config.ts`: added `WEATHER_KEY = "wildhearth-weather-v1"` (matching
      the existing key convention).
    - `src/systems/saves.ts`: added `WEATHER_KEY` to `GAME_KEYS`.
    - `src/main.ts`: `const weather = loadWeather()` beside the other stores;
      `resetWeather(weather)` in `newGameReset()`; the `tick()` hour loop now
      calls `rollDailyWeather(weather, currentSeason(calendar))` whenever
      `advanceHour` rolls the hour to 0 (a new day) — the "check
      `calendar.hour === 0` at the call site" option, leaving Block 3's
      `advanceHour` untouched. Also imports `currentSeason` from calendar.
    - `src/systems/worldContext.ts`: imported the weather types, enabled the
      `weather?: WeatherState` source, added a `WeatherSlice` (`state`,
      `daysSinceChange`) to `WorldContext`, and populated it in
      `getWorldContext()` (mapping `kind` → `state`, per the data-owner table).
    - `docs/WORLD_CONTEXT.md`: Block 4 ticked `[x]`.
  - **Systems / functions:** new save key `wildhearth-weather-v1`; new
    `WeatherState` + `WeatherKind`; season-weighted daily reroll; World Context
    now surfaces a live `weather` slice. `isRaining` is exported but not yet
    consumed (see Follow-ups).
  - **Behavior:** each new in-game day the weather rerolls, weighted by the
    current season (spring/summer lean clear with some rain, autumn adds fog,
    winter adds storm + fog). Persisted, and reset to clear on New Game. No
    visible/mechanical effect yet — it feeds World Context for now.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via Playwright, two phases (both green). Variety
  (temporary fast cadence + a calendar/weather debug log, since reverted, 7/7):
  93 days across all four seasons produced no impossible season/weather pair,
  all four kinds appeared, storm only ever occurred in winter, `clear` was the
  modal kind (66/20/5/2 clear/rain/fog/storm) matching the weightings, and
  `daysSinceChange` both reset to 0 and climbed. Persistence (shipping build,
  3/3): a seeded storm/5 loaded unchanged on Continue, survived a reload, and
  New Game reset it to clear/0.
- **Commit:** World Context Block 4 — Weather
- **Follow-ups:** ~~the real mechanical effect is deferred — when the crop
  active-tending block lands, use `isRaining(weather)` to skip manual
  watering~~ **RESOLVED by "Crop/farming variety pass — active tending"
  (newer entry): rain now auto-waters growing plots each day.**

## World Context Block 3 — Calendar & time
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 3 — Calendar & time)
  Create `systems/calendar.ts` in the same shape as `renovation.ts` (versioned
  state, `fresh()`, load/save/reset on a new key, tolerant of junk); add
  `CALENDAR_KEY` to config, add it to `saves.ts`'s `GAME_KEYS`, instantiate +
  reset it in `main.ts` and advance it once per in-game hour from `tick()`, and
  expose a `calendar` slice from World Context. Done when hour/day/season
  advance, survive save/reload, and `getWorldContext(...).calendar` reflects
  season/day/hour/phase.
- **Done:**
  - **Files:**
    - `src/systems/calendar.ts` (NEW): `CalendarState { version, seasonIndex,
      day, hour }` with `loadCalendar/saveCalendar/resetCalendar`,
      `currentSeason`, `currentPhase`, and `advanceHour` (rolls the day at hour
      0 and the season after `DAYS_PER_SEASON=10`, returning `seasonChanged` for
      Block 4). Exactly the spec's code.
    - `src/config.ts`: added `CALENDAR_KEY = "wildhearth-calendar-v1"` (matching
      the existing key convention) and `GAME_HOUR_SECONDS = 60` (real seconds
      per in-game hour — the tick cadence; placeholder pace, kept in config per
      the no-inline-tuning rule).
    - `src/systems/saves.ts`: added `CALENDAR_KEY` to `GAME_KEYS`, so New Game
      clears it.
    - `src/main.ts`: `const calendar = loadCalendar()` next to the other
      stores; `resetCalendar(calendar)` in `newGameReset()`; a `hourAccum`
      accumulator in `tick()` calls `advanceHour(calendar)` once per
      `GAME_HOUR_SECONDS` of actual play (inside the not-opening gate, so time
      only passes in-game).
    - `src/systems/worldContext.ts`: imported the calendar accessors/types,
      enabled the `calendar?: CalendarState` source, added a `CalendarSlice`
      (`season/day/hour/phase`) to `WorldContext`, and populated it in
      `getWorldContext()`.
    - `docs/WORLD_CONTEXT.md`: Block 3 ticked `[x]`.
  - **Systems / functions:** new save key `wildhearth-calendar-v1`; new
    `CalendarState` + `Season`/`DayPhase` unions; `advanceHour` day/season
    rollover; World Context now surfaces a live `calendar` slice.
  - **Behavior:** in-game time now runs during play — an hour every 60s, a day
    every 10 days into the next season — persisted and reset on New Game. No
    visible UI yet (that's a later block); it exists to feed World Context and,
    next, Weather.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via a temporary fast cadence + calendar debug
  log driven by Playwright (10/10): a new game started in spring; hour advanced
  through the day (phase mapping correct on every snapshot); the day rolled and
  the season changed spring→summer after 10 days; the advanced calendar (457
  in-game hours) was byte-identical after a reload and Continue was offered.
  Cadence restored to 60 and the debug log removed; clean build re-confirmed.
- **Commit:** World Context Block 3 — Calendar & time
- **Follow-ups:** none. Next: Block 4 (Weather), pending your go-ahead.

## World Context Block 2 — getWorldContext()
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 2 — `getWorldContext()`,
  the working-system milestone) Add the function below the Block 1 types; a
  pure snapshot builder over the live `sources`. Wire a temporary debug log in
  `main.ts` to confirm real coins/skills/farm flow and update, then remove it.
  Done when the logged context is real and accurate and updates as you earn
  coins / gain a skill / pay for a repair.
- **Done:**
  - **Files:**
    - `src/systems/worldContext.ts`: added `getWorldContext(sources, query)`
      below the Block 1 types — builds a `WorldContext` snapshot (version, coins
      from `economy.coins`, a `skills` id→value record from `skills.list`, and
      the four-flag `farm` slice). Pure, no stored state, no caching.
    - `docs/WORLD_CONTEXT.md`: Block 2 ticked `[x]`.
  - **Systems / functions:** `getWorldContext()` — the single "what's true
    right now?" read. The `_query` param (the Block 6 per-NPC hook) is present
    but unused for now. No permanent call site yet and no save keys; the
    temporary `main.ts` debug log used to verify it was removed, so `main.ts`
    is unchanged by this block.
  - **Behavior:** no player-facing change — infrastructure. The first real
    consumer will be the dialogue system in `ROADMAP_EXPANSION.md`; until then
    the function is exported and unused (still tree-shaken from the bundle).
- **Build:** `npm run build` — ✅ passing.
- **Verification:** in-browser via a temporary debug log driven by Playwright:
  baseline snapshot matched seeded state (coins 200, fishing 5, farm all
  false); after walking to the farmhouse and patching the roof the next
  snapshot read coins 175 + farm.roof true; 5 snapshots confirmed it recomputes
  each call. Debug log then removed and the clean build re-confirmed.
- **Commit:** World Context Block 2 — getWorldContext()
- **Follow-ups:** none. Next: Block 3 (Calendar & time), pending your go-ahead.

## World Context Block 1 — shared types
- **Date:** 2026-07-04
- **Block given:** (from `docs/WORLD_CONTEXT.md`, Block 1 — Shared types)
  Create `src/systems/worldContext.ts` with the World Context types at the top
  of the same file that will implement `getWorldContext()` (this codebase keeps
  types and functions together, e.g. `renovation.ts`). Done when it compiles
  with no runtime code yet (just the interfaces) and nothing else imports it.
- **Done:**
  - **Files:**
    - `src/systems/worldContext.ts` (NEW): the World Context type layer only —
      no runtime code yet.
    - `docs/WORLD_CONTEXT.md` (NEW to git): the standalone build spec, renamed
      from the mistyped `World.md`; Block 1 ticked `[x]`.
  - **Systems / functions:** interfaces `WorldContextSources` (economy, skills,
    farm now; calendar/weather/flags commented in for Blocks 3-5),
    `WorldContextQuery` (the `npcId` scoping hook for Block 6), `FarmSlice`, and
    `WorldContext`. No functions, no save keys, no module-level state — pure
    types following the explicit-`sources` convention (no registry).
  - **Behavior:** none yet — this is infrastructure. Nothing imports it, so it
    is tree-shaken out of the bundle; it exists for Block 2's function and the
    future systems that will read a world snapshot.
- **Build:** `npm run build` — ✅ passing.
- **Commit:** World Context Block 1 — shared types
- **Follow-ups:** none — Block 2 adds `getWorldContext()` to the same file.

## Step 9 — Save/load hardening
- **Date:** 2026-07-04
- **Block given:** (from `docs/ROADMAP_MVP.md`, Step 9 — Save/load hardening)
  - Version the save schema (`SAVE_KEY` + a `version` field already scaffolded
    in `economy.ts` — extend the same pattern to inventory, skills, farm-repair
    state, starter choice).
  - One explicit "new game" vs "continue" entry point.
  - Checkpoint: this is the MVP finish line. Closing and reopening the browser
    preserves everything above.
- **Done:**
  - **Files:**
    - `src/systems/meta.ts` (NEW): the playthrough-origin store — records the
      starter choice (the roadmap's one missing store), versioned and
      junk-tolerant. Now owns the `StarterTool` type.
    - `src/systems/saves.ts` (NEW): the persistence hub — knows the whole set
      of game-state keys; `hasSavedGame()` and `clearSavedGame()`.
    - `src/config.ts`: added `META_KEY = "wildhearth-meta-v1"`.
    - `src/ui/newgame.ts`: imports `StarterTool` from `systems/meta` and
      re-exports it (the type is persisted game origin, not a UI concept), so
      existing importers are unchanged.
    - `src/systems/settings.ts`: added a `version` field and a non-object
      parse guard (a bare/junk value now falls back to defaults instead of
      being spread over them).
    - `src/main.ts`: loads meta (`const meta = loadMeta()`); the title screen
      is gated on `hasSavedGame()` instead of raw key presence; `newGameReset`
      calls `clearSavedGame()` first, then re-seeds and stamps
      `meta.starterTool` + `saveMeta`; the guided first-tip (`firstTip()`) is
      tailored to the chosen starter tool; dropped the now-unused `SAVE_KEY`
      import.
    - `docs/ROADMAP_MVP.md`: Step 9 marked (DONE) with the dated note.
  - **Systems / functions:**
    - New save key `wildhearth-meta-v1` (`META_KEY`).
    - New type `Meta { version, starterTool }`; `StarterTool` union relocated
      to `systems/meta`. New fns `loadMeta()`, `saveMeta()`.
    - `saves.ts`: `hasSavedGame()` (present-and-parseable check), and
      `clearSavedGame()` over the `GAME_KEYS` set (economy, skills, renovation,
      meta — deliberately excludes settings + UI layout).
    - `settings.ts`: `Settings` now carries `version`.
    - `main.ts`: `firstTip()`; `newGameReset` now wipes-then-seeds and persists
      the starter choice.
  - **Behavior:** Continue is offered only when a real, parseable save exists —
    a corrupt save now falls back to New Game rather than a broken Continue.
    Closing and reopening restores coins, backpack, skills, farm repairs, and
    the remembered starter choice exactly. New Game wipes all game state (via
    one `clearSavedGame()` call) yet keeps player settings and panel layout;
    the guided first-tip now points at the livelihood the chosen tool unlocks.
    A fully corrupt localStorage boots cleanly to the title with no errors.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright, 14/14 checks + a corrupt-boot probe:
  corrupt-save gating, a full new-game → fish → reload → Continue round-trip
  restoring Fishing 10.3 and the caught fish exactly, starter-choice
  persistence + tailored tip surviving Continue, New Game wiping
  coins/bag/skills/farm while preserving UI panel layout, and a clean boot
  with every key corrupted (zero page errors).
- **Commit:** `3947c66` — Step 9 — save/load hardening
- **Follow-ups:** none. This is the MVP finish line — every ROADMAP_MVP.md
  checkpoint is now complete; next work is `docs/ROADMAP_EXPANSION.md`.

## Step 8 — Farm repair (tier-1 visible renovation)
- **Date:** 2026-07-04
- **Block given:** (from `docs/ROADMAP_MVP.md`, Step 8 — Farm repair
  (visible renovation, tier 1 only))
  - `src/art/buildings.ts`: add a "rundown" paint variant for the house
    (patched roof hole, boarded window, broken-plank fence) alongside the
    existing normal state.
  - `src/systems/renovation.ts`: 3–4 fixed repair actions (fix fence, patch
    roof, fix door), each costs coins + requires being near the farmhouse,
    flips one rundown flag to fixed and swaps the painter output.
  - Checkpoint: the farm visibly changes as a direct result of money earned
    — the renovation arc from VISION.md is now real, not just described.
- **Done:**
  - **Files:**
    - `src/systems/renovation.ts` (NEW): the farm-repair state module — four
      per-part flags, load/save/reset, persisted on its own versioned key.
    - `src/config.ts`: added `REPAIR_COST = { roof: 25, window: 15, barn: 30,
      fence: 10 }` (tuning for the four repairs) and `RENOVATION_KEY =
      "wildhearth-farm-v1"` (the new save key).
    - `src/art/buildings.ts`: `drawHouse` signature changed from a single
      `rundown` bool to per-part `(g, roofOk = true, windowOk = true)` — the
      roof-hole-and-patch is gated by `!roofOk`, the boarded window by
      `!windowOk`, so each defect can clear independently. `drawBarn` changed
      to `(g, barnOk = true)` (missing plank + loose door board gated by
      `!barnOk`).
    - `src/art/props.ts`: `drawFence` changed to `(g, fenceOk = true)` with an
      internal `const rundown = !fenceOk` (broken-plank gap + leaning posts
      now clear when the field fence is mended).
    - `src/systems/interact.ts`: added the farmhouse as a clickable
      renovation hub — `REPAIRS` table, `doRepair()`, the `house`
      `Interactable`, and `farm` on `InteractCtx`; imports `saveEconomy`,
      `saveFarm`, `REPAIR_COST`, and `HOUSE`.
    - `src/main.ts`: loads the farm state (`const farm = loadFarm()`), passes
      `farm` into the interaction context, resets it on New Game
      (`resetFarm(farm)`), and drives the three painters from the flags
      (`drawFence(ctx, farm.fence)`, `drawHouse(ctx, farm.roof, farm.window)`,
      `drawBarn(ctx, farm.barn)`); the old blanket `FARM_RUNDOWN` const is
      removed.
    - `docs/ROADMAP_MVP.md`: Step 8 marked (DONE) with the dated completion
      note (carried over from the build session).
  - **Systems / functions:**
    - New save key `wildhearth-farm-v1` (`RENOVATION_KEY`).
    - New type `FarmState { version, roof, window, barn, fence }` and the
      `FarmPart = "roof" | "window" | "barn" | "fence"` union.
    - New functions in `renovation.ts`: `loadFarm()`, `saveFarm()`,
      `resetFarm()` (New Game → all broken), `repairsLeft()`.
    - `interact.ts`: `doRepair(c, part)` — checks coins against
      `REPAIR_COST[part]`, deducts + `saveEconomy`, flips the flag +
      `saveFarm`, toasts the result; new `farm: FarmState` field on
      `InteractCtx`; the `house` interactable's `actions()` lists only the
      still-broken repairs (priority roof → window → barn → fence) plus Look.
    - Painter signatures changed to read per-part flags (see Files).
  - **Behavior:** The farm starts fully rundown (roof hole + patch, boarded
    window, missing barn plank + crooked door board, broken-plank fence +
    leaning posts). Walking up to the farmhouse offers a paid repair for each
    still-broken part — left-click / E does the next one, right-click lists
    them all (Patch the roof 25 / Reglaze the window 15 / Mend the barn 30 /
    Mend the fence 10). Each repair deducts coins, flips its flag, and swaps
    the art on that structure instantly. Too few coins → a "Not enough coins
    — that repair costs N." refusal with no flag change. Once every part is
    mended the house only offers Look. Repairs (and the spent coins) persist
    across reload; New Game wipes the farm back to fully rundown.
- **Build:** `npm run build` — ✅ passing.
- **Verification:** headless Playwright drove the real game (11/11 checks):
  rundown start, all four repairs with correct coin deductions (200 → 120)
  and live visual swaps, the broke-player refusal, Look-only once whole, and
  persistence across reload; New Game reset to rundown.
- **Commit:** `c420f8c` — Step 8 — Farm repair (tier-1 renovation)
- **Follow-ups:** The Building/Renovation *skill* is not yet wired to these
  repair actions — repairing currently trains no skill and applies no
  skill-based discount. Deferred to the "Complete the base skill set" block
  in `docs/ROADMAP_EXPANSION.md`.
