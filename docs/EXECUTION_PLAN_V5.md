# EXECUTION PLAN — v1 closeout → v5

**Who this is for:** the executing agent (Opus), handed the wheel by the
product owner with the directive *"run, as far as I'm concerned, up to v5."*
This is the **operational build-order**: numbered blocks, gates, acceptance
criteria, and verification recipes. The **strategy** — why each version is
shaped the way it is, the full system matrix, dependencies, and risks — lives
in `ROADMAP_TO_V5.md`; read it once before starting and again at every
version boundary. Where the two disagree, this file wins on *order and
mechanics*, ROADMAP_TO_V5 wins on *scope and intent*.

Written 2026-07-11 (session 4/5, branch `v1-foundation`) by Fable, from the
live state of the repo — not from older docs' aspirations.

---

## 0. The executor's contract (read first, obey always)

These are the standing rules distilled from `CLAUDE.md`, `DECISIONS.md`, and
four sessions of the owner's direct feedback. Breaking any of them has
historically caused rework.

1. **One block = one commit = one WORKLOG entry.** Finish the block, run
   `npm run build` (must pass), write the `docs/WORKLOG.md` entry (its header
   explains the required detail level), `git add -A`, commit with the entry's
   title. **Do not push** — every commit this arc stays local on
   `v1-foundation` until the owner asks for a push. Never split code and
   WORKLOG into separate commits.
2. **The game must be runnable after every block.** No block may leave the
   game broken "until the next block lands." If a block is too big to keep
   that promise, split it here first.
3. **Dual-path art, forever.** Every sprite-backed visual keeps its
   code-drawn painter as a runtime fallback; the game must boot and play with
   zero PNG files. New sprites go under `src/assets/pixellab/<category>/`
   (the manifest auto-globs `./**/*.png` — no manifest edit needed). New
   world visuals get a code painter FIRST, sprite second.
4. **Tuning values in `src/config.ts`, world layout in
   `src/world/zones.ts`** — never inline. Persistence via the
   `systems/economy.ts` versioned-store pattern (`GAME_KEYS`). Entities hold
   state, `art/` holds looks, `systems/` hold rules.
5. **Design Principle Zero:** the mechanical simulation runs with zero AI
   calls. Every AI feature ships with a scripted fallback that is genuinely
   good, and sits behind the existing per-feature toggles + BYOK settings.
6. **Verify with your eyes.** Every player-facing block ends with a
   screenshot (or scripted assertion run) via the puppeteer harness (§6).
   "Build green" alone is NOT done. Send the owner the screenshot for
   anything she'd want to see (new screens, new regions, new art).
7. **Everything is English** (UI, code, comments, docs). Chat with the owner
   may be Hebrew; files never are.
8. **The owner is not a worker.** Never hand her manual steps. She reviews
   results and makes gated decisions (§2) — that's all.
9. **Old saves must survive.** Every new persisted store is versioned and
   additive. Loading a pre-block save must never crash or wipe. When a block
   changes save shape, test: new game + a save from before the block.
10. **Delegation:** heavy independent work goes to subagents, BUT only **one
    repo-writing agent at a time** (parallel repo writers caused git races).
    PixelLab *generation* agents that write only to the scratchpad are safe
    to parallelize. Message a running agent to correct course rather than
    killing it (proven pattern: the truffle-collision fix).
11. **Milestone ritual:** at every version boundary (and any owner-visible
    milestone) — update `docs/GAME_OVERVIEW.md` status tags, refresh the
    version's section in `ROADMAP_TO_V5.md`, append to the session handoff
    in `runs/`, and republish the owner's Hebrew reading-hub Artifact.

---

## 1. Where the build actually is (2026-07-11)

v1 is **functionally complete** and far ahead of ROADMAP_TO_V5's "mid-v1"
snapshot. Built and verified: the four core engines (NPC ×10, Needs ×7,
Relationships 2-axis, Dialogue+AI with BYOK layer), quests + Guidance modes,
character creation, the Harvest Festival (day 5), calendar/weather/
worldContext spine, all 9 base skills with decay, the UO-classic window
system, the full sprite layer across all three mediums (character matrix /
environment / ground tiles), everything-pixels (192 item icons + every world
object), the animal-produce loop (barn), the player stall in the coastal
town with a working customer loop, and a 4-screen polish pass (pixel title,
trade, day-end, char-creation). PixelLab balance ≈ 7,000 gens (Tier 3).

What that means: **v1 needs a short closeout, not a build phase.** The bulk
of this plan is v2 onward.

---

## 2. Owner gates — decisions that BLOCK specific blocks

Ask the owner **only when the gated block is next up**, not all at once. Do
not build past a gate on guesses.

| Gate | Decision needed | Blocks gated |
|---|---|---|
| **G1 — Character rebuild** | Go-ahead for the face-locked Medium sprite-matrix rebuild (~1,570 gens). She explicitly deferred it ("not now, no body sizes, later"). | V1-C3. Do NOT start, cost, or "probe" this again without her yes. |
| **G2 — Mine access** | Mine reachable from farm/forest, or gated behind the town smith? (Open in DECISIONS.) | V3-B2 (mine region) and anything referencing the mountains. |
| **G3 — Town custom hours** | Stall custom is currently 15:00–18:00 with decorative (uninhabited) town homes. Widen hours / add residents? | V2-B2 resolves this by design (residents make all-day custom natural) — confirm she's happy with that resolution when V2-B2 ships. |
| **G4 — Push** | Nothing is pushed without her explicit ask. | Every push, always. |

Everything else DECISIONS lists as "open" (weather event specifics, farm
direction-map) is resolvable by the executor's judgment inside the relevant
block — note the choice in WORKLOG Follow-ups so she can veto.

---

## 3. Phase V1-C — v1 closeout (small)

> Theme: seal v1 as a *finished version*, not a trail of sessions.

- **V1-C1 — v1 audit & seal.** Sweep `GAME_OVERVIEW.md` for any 🔵/🟡 that
  ROADMAP_TO_V5 assigns to v1 and is genuinely missing (expected: none or
  trivia). Fix stragglers, refresh GAME_OVERVIEW status tags to honest 🟢,
  mark v1 SEALED in ROADMAP_TO_V5's v1 section.
  *Accept:* GAME_OVERVIEW has no un-annotated v1 gap; build green; full
  new-game smoke run (title → char-create → day 1 → sleep → day-end) passes
  in the harness with zero console errors.
- **V1-C2 — save-compat harness.** Add a tiny DEV-only save fixture +
  harness script that loads a canned v1 save and asserts boot + HUD + zone.
  This is the regression net every later version leans on.
  *Accept:* script exits 0 on v1-foundation HEAD.
- **V1-C3 — [GATE G1] character face-lock rebuild (Medium).** Only on the
  owner's go-ahead. Rebuild the character matrix with the locked face
  descriptor per the probe architecture recorded in
  `memory/char-medium-code-rig.md` + `runs/handoff-2026-07-11.md`
  (~1,570 gens, Medium body size only). Until G1 opens, the shipped matrix
  is the look — do not touch it.

---

## 4. Phase V2 — The town opens

> Theme (ROADMAP_TO_V5 §v2): the world becomes a *place* — town with real
> residents and merchants, customers with wants, Reputation, the Riverside
> Fisherwoman's full kit, transportation + paid fast travel.

Build order (each bullet = one block/commit; split further if needed):

- **V2-B1 — Town becomes real estate.** Extend the existing coastal-town
  strip in `zones.ts` into the full speced town: inn (enterable), seafront,
  town square with busking spot, 3+ specialized merchant stalls, 5–8 homes.
  Sprites via the proven building pipeline (~1 gen/variant; check
  `buildings/` AND `buildings/spare/` before generating — redundancy
  happened once). Code painters first, dual-path.
  *Accept:* walkable, collision-clean, depth-sorted; screenshot to owner.
- **V2-B2 — Residents & schedules.** Assign homes to existing/new NPCs;
  extend the schedule engine so town NPCs move home↔work↔square across the
  day; stall custom widens naturally beyond 15:00–18:00 (closes G3).
  *Accept:* harness observes ≥3 NPCs in distinct schedule states across a
  scripted day; a customer buys outside the old window.
- **V2-B3 — Customers & wants.** Generalize the single Maren row into
  `systems/customers.ts`: want-tables driving which NPCs walk to the
  player's stall, when, and what they pay premiums for.
  *Accept:* scripted day shows ≥2 distinct customers with different wants;
  economy numbers land inside the price-anchor bands.
- **V2-B4 — Reputation.** `systems/reputation.ts` — town-wide Fame,
  independent of per-NPC bonds and of Haggling; feeds customer frequency and
  greeting tone. Persisted, versioned.
- **V2-B5 — Town merchants.** Specialized buy/sell per merchant (fish /
  produce / goods at minimum) on the existing trade window; sell-category
  dispatch already built to extend (`systems/sellCategories.ts`).
- **V2-B6 — Riverside Fisherwoman, part 1.** The NPC herself at the lake:
  identity, schedule, dialogue, her fishing shop, teaching (first
  Teacher-NPC instance), and barter's first live instance (rare aquatic
  items — her trait-derived loved gifts).
- **V2-B7 — Fisherwoman part 2: rod tiers + bait.** Rod tier gating on fish
  species (extends the existing hard rod gate), a bait system feeding catch
  odds. Config-driven.
- **V2-B8 — Fisherwoman part 3: boat, diving, net, sailing.** The boat as
  the first transportation; deep-water fishing spots; a simple code-drawn
  underwater transition for diving.
- **V2-B9 — Binoculars + collections + aquarium.** Bird/animal/flower
  sightings into the Memory Book collections engine (built); a home aquarium
  for duplicate rare catches.
- **V2-B10 — Transportation + paid fast travel.** Horses/carriages via a
  town stable vendor (money-gated, per "nothing is free"); paid fast travel
  to discovered locations off the minimap.
- **V2-B11 — Wardrobe.** Hairdresser + clothes stall in town: swap among the
  matrix's existing 5 hairstyles / 5 outfits / 3 hair shades in-play. Uses
  ONLY existing matrix assets — no new character gens (respects G1).
- **V2-B12 — Town-wide festival + inn sleep.** The Harvest Festival gains
  town-NPC participation; sleeping at the inn becomes a paid second sleep
  location (Needs hook).
- **V2-SEAL** — milestone ritual (§0.11), full smoke + save-compat run, owner
  screenshot tour of the town.

---

## 5. Phase V3 — Crafting, professions & appearance

> Theme: depth of *making* and *becoming*. Widest content version.

- **V3-B1 — Crafting engine.** `systems/crafting.ts` generic chain engine +
  3–4 authored chains (wheat→flour→bread, wool→yarn→cloth, milk→cheese —
  inputs already exist via farming + the barn produce loop). Crafted >
  raw margins, tuned against the anchor table.
- **V3-B2 — [GATE G2] Mountains/mine region.** New region in `zones.ts`
  (access per the owner's G2 answer), Mining skill (first expansion skill),
  rarity-by-depth, minerals/treasure collection page.
- **V3-B3 — Professions & appearance.** Tailoring/Fashion + Hairdressing/
  Styling as real skills with stations in town; appearance change beyond
  day-one presets flows through THEM (v3's "first real customization
  moment"). Matrix-asset-only for character visuals unless G1 has opened.
- **V3-B4 — House storage.** Cabinets/boxes/wardrobes in the house interior;
  persisted container inventories.
- **V3-B5 — Employee hire.** Rent/hire an NPC to run the player's stall
  (wages vs. coverage trade-off).
- **V3-B6 — Active haggling.** The back-and-forth negotiation (the passive
  skill discount already ships); haggling skill shapes merchant *tone* via
  the dialogue layer, scripted fallback included.
- **V3-B7 — Tier-2 renovation.** Template-based room/furniture upgrades —
  the first visible contrast against the bare tier-1 interior.
- **V3-B8 — Second festival** (owner picks theme from DECISIONS' list —
  quick ask, not a formal gate) + deeper heart events + more romanceables.
- **V3-SEAL** — milestone ritual, smoke + save-compat, economy re-balance
  pass (crafting margins × employees × haggling interact — verify the
  poverty pacing survives).

---

## 6. Phase V4 — Family, home & a living economy

- **V4-B1 — Marriage & cohabitation.** Partnership on top of the v1
  relationship engine; partner moves in (needs tier-2 home minimum).
- **V4-B2 — Children.** Birth → growth stages; schedule/needs/save ripple is
  the known risk — design the time-axis in config before coding.
- **V4-B3 — NPC↔NPC webs + rumors.** Observable inter-NPC relationships;
  gossip feeds the dialogue layer; reputation ripples.
- **V4-B4 — Tier-3 freeform housing.** Freeform furniture placement +
  persistence + collection display. Large UI task — split into placement
  engine / catalog / persistence sub-blocks.
- **V4-B5 — Dynamic prices begin.** Season + supply shifting off the fixed
  anchors, hard-bounded around the anchor table so the earned-economy pillar
  survives.
- **V4-B6 — Husbandry-crafting expansion + pets depth + family/shared
  mounts.**
- **V4-B7 — Third festival + coast content + relationship-driven quests.**
- **V4-SEAL** — milestone ritual; family art extends the SAME character
  matrix (children = new matrix rows, costed and owner-approved before
  generating).

---

## 7. Phase V5 — Product-complete

Mostly *scaling*, not inventing. Blocks: **V5-B1** world expansion
(north/south regions, true forest, coast fully realized, rotatable-camera
option) · **V5-B2** NPC roster → 50+ with families/backstories (AI-assisted
authoring, human-coherence pass) · **V5-B3** full personality axes +
in-game evolution wired into dialogue/gifts/relationships · **V5-B4** full
health system (diseases/injuries, no death, soft consequences) · **V5-B5**
second save slot + multi-character (architecture is ready; migration test
mandatory) · **V5-B6** full character-creation spectrum + S/M/L matrix body
sizes + expanded hair/outfit rows (the big generation wave — cost it, get
owner sign-off) · **V5-B7** fourth festival + fully dynamic economy
(supply+demand+reputation) · **V5-B8** the juice pass (secondary motion,
particles, floating numbers, ambient life) · **V5-SEAL** — final ritual +
full regression sweep.

---

## 8. Verification playbook (how every block proves itself)

- **Harness:** puppeteer-core + local Edge
  (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`), driving
  a Vite dev server. Canonical driver pattern:
  `scratchpad/action-fix/drive.mjs` from session 4 (a minimal copy is the
  `dayend-shot.mjs` pattern: goto → `waitForFunction(window.__wh)` →
  `__wh.*` calls → screenshot → assert zero pageerrors/console-errors).
- **DEV bridge:** extend `window.__wh` in `src/main.ts` behind
  `import.meta.env.DEV` (dead-code-eliminated in prod) with whatever hooks a
  block needs (`newGameWith`, `showDayEnd`, time-warp, teleport, forced
  weather/day). Add hooks freely; never ship them outside DEV.
- **Definition of done per block:** build green + WORKLOG entry + harness
  run clean + screenshot reviewed (and sent to the owner when player-facing)
  + old-save load clean.
- **PixelLab:** `create_map_object` BASIC for world objects; gate downloads
  on the download endpoint returning 200 (not 423); fetch by object id.
  Before generating anything, check the target category folder AND
  `*/spare/` for existing assets. Log every spend; balance ≈7,000 gens —
  review time, not budget, is the bottleneck.

---

## 9. Sizing honesty

ROADMAP_TO_V5's totals (~50–70 dev-weeks v1→v5) were calibrated to
human-paced weeks; actual session throughput has run far ahead of that.
Ignore the calendar numbers; respect the *ratios* (v3 and v5 are the heavy
versions) and the block order. The real pacing constraints are: the owner's
review bandwidth, PixelLab generation review, and the AI layer's
cost/quality tuning from v2 onward (more NPCs = the first real stress test
of caching + per-NPC rate limits).
