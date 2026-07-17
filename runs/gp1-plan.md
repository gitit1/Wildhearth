# GP-1 plan (path-dependent farm + verb matrix + Woodcutting)

Branch: v1-foundation. Two commits, push after each. Master untouched. ZERO PixelLab gens.

## Key code facts discovered
- Farm structures today: BARN (zones.ts rect, drawn main.ts 2890, storage interactable interact.ts `barn`, renovation part "barn"). No "coop shed" exists in code. No "garden beds" concept — FLOWER_BEDS (3 ornamental beds) are the closest = the "garden beds".
- Established-farm props in WORLD_PROPS (zones.ts): firewood, wheelbarrow(solid), crate-barn(solid), barrel-barn(solid), sack, hay-bale(solid), scarecrow(solid). Keep always: birdhouse-yard, bucket, flower-pot (base homey yard). Market/town carts are NOT farm props — leave them.
- Persistence: renovation FarmState has its OWN key (RENOVATION_KEY, internal version:1) — NOT the global SAVE_KEY. Add `manifest` field there → grandfathering by presence check, no SAVE_KEY bump.
- newGameReset (main 2162) calls resetFarm(farm) (2191); path available via character.path. Draw farm main 2883-2941. Collision world/collision.ts uses BARN (line45) + PROP_BLOCKERS(56).
- repairsLeft/renovation: renovation.ts repairsLeft = roof+window+barn. REPAIRS list in interact.ts house actions includes barn. farm_whole memory at repairsLeft===0.
- Animal shelter: animals.ts BARN_SHELTER_X/Y (15.8,13.6). Produce collected via barn storage window (openBarnStorage). Keeper with no barn: can feed(husbandry) but can't open storage → produce inaccessible. LOG as follow-up (future buy/build barn). Not solved here.
- watering-can: forward-content item (inventory.ts "no mechanic yet", not sold/obtainable) → SKIP the Water gate (rule: unlock item doesn't exist → skip).
- Chop: completeChop (main 1106) yields wood, NO skill gain today. CHOP_TIME/CHOP_YIELD in config.
- Sit/chores: chores.ts (wash/sit), beginSit/standUpFromSeat interior-only. rest(needs) = +REST_ENERGY +socialGlow(REST_GLOW).
- Eat: eatItem(id) main 917 = restore hunger. edibleHunger/isEdible in needs.ts. No table interactable today.
- Hearth fire drawn cold (interior.ts paintHearth). Stoked glow overlay → add in drawInteriorScene (main 2999) reading a `hearthStoked` flag; reset on new-day.
- Dev bridge __wh: newGameWith(path,mode), objActions(id), openMenu(id), runInteract, treesState, skillOf, giveCoins, buyDev, advanceDay. verify port 5199, lib.mjs.

## COMMIT 1 — FARM-START-1
- NEW src/data/farmStart.ts: FarmManifest {barn,coop:boolean; beds:number; establishedProps:boolean}. FARM_START_MANIFEST per Path: fisher/musician={false,false,0,false}; farmer={false,false,3,false}; keeper={false,true,0,false}. LEGACY_FARM_MANIFEST={true,false,3,true}. farmManifestForPath(path).
- zones.ts: add COOP rect (~14.6,10.8 size 2.2,1.9). Tag established props with establishedFarm:true. Export a helper to get farmyard prop set.
- renovation.ts: FarmState.manifest; loadFarm revives (p.manifest ?? LEGACY); resetFarm(f, manifest); repairsLeft counts barn only if manifest.barn.
- art/buildings.ts: drawCoop(g, r, ok) code-drawn small rundown coop (zero gens).
- interact.ts: module farmManifest + setFarmManifest(m). barn hit/reach gated on manifest.barn; add coop interactable (Look) gated on manifest.coop; flowerbeds gated on i<manifest.beds; notable established props gated on manifest.establishedProps. House REPAIRS skip barn when !manifest.barn.
- main.ts: draw barn only if farm.manifest.barn; draw coop if manifest.coop; flowerbeds i<beds; skip established props when !establishedProps; setFarmManifest on boot + newGameReset; collision setFarmManifest.
- collision.ts: setFarmCollisionManifest(m); gate BARN + COOP + established prop blockers.
- Verify: fisher=base only; farmer=beds; keeper=coop; old fixture save=barn+storage. Screenshots 1920x1080.

## COMMIT 2 — AX-2
- skills.ts SKILL_NAMES += woodcutting:"Woodcutting" (auto in list; old saves get 0). SKILL_CAP stays 250.
- config.ts: woodcutting tuning (chop time mult by tier, +1 log at Expert), STOKE mood glow + wood cost, EAT_AT_TABLE bonus.
- completeChop: gainSkill("woodcutting"); chop time/yield read woodcutting tier (Expert +1 log, higher=faster).
- Stump Sit (tree interactable when chopped): world sit → small energy tick (reuse rest()).
- Bench Sit: market/town benches (WORLD_PROPS bench) become interactable w/ Sit.
- Plots: menuOnActivate; Till greyed "Needs a hoe"; Plant greyed "Needs seeds"; Water ungated; Harvest/Clear.
- Hearth: add "Stoke the fire" greyed "Needs wood logs"; consumes 1 wood → hearthStoked (evening glow) + mood bump.
- Table: R_TABLE from furniture; "Eat at the table" greyed "Needs something to eat"; better mood/food than standing.
- Verify: chop→woodcutting gains; stump sit; hearth greyed then works; plot greyed gates. Screenshots.

## Follow-ups to log
- Keeper w/ coop but no barn cannot COLLECT animal produce (storage gated on barn). Needs future buy/build-barn or coop-egg collection.
- "wheelbarrow + cart": no farm cart exists; interpreted as wheelbarrow only. Market/town carts untouched.
