# COHESION-1 wave — implementation plan + resume state (2026-07-17)

Goal: make the LIVE game match the owner-approved cohesion probes (scratchpad/
cohesion/COHESION-BOARD.png + HOUSE-BOARD.png). Port the probe code faithfully.
ZERO PixelLab gens — all code (ground.ts + props/shapes) + one post-process script.

## The five parts (spec = scratchpad/cohesion-diagnosis.md)
- A. Nature grounding — strip baked sand apron from tree/boulder(/bush) PNGs
     (scripts/strip-nature-apron.mjs, wedge mask ported from scene1.mjs) +
     paintNatureGrounding(g) baking wornRing + contactAO + groundCluster per
     tree/boulder/bush position, on BOTH ground render paths.
- B. Terrain transitions — replace rectInsetTiles+edgeThr threshold for soil
     (ROAD_SEGMENTS/farmPath), field, plaza, water with domain-warped SDF finger
     transition (sd = edgeToBoundary + (fbm-0.5)*amp; fill sd<0). Keep pickTile bags.
- C. Worn paths/plaza — wear gradient + twin ruts (baked per-pixel) + edge-aware
     scatter (pebbles/cracks center, tufts shoulders) + plaza moss-in-grout + seam
     + half-buried cobbles.
- D. Water banks — wet-earth bank band + 1px sheen for RIVER/LAKE/POND/TOWN_SEA;
     scatterWaterEdgeDecor even→CLUSTERED.
- E. Building grounding — baseGrounding laces tufts OVER the sprite bottom-silhouette
     chevron (per-column lowest opaque row, cached spriteBaseEdge), densest at 3
     corners, densify BASE_TUFT_MAX; replace scuffOne oval + wearApron with lightened
     organic SDF worn-GRASS field (~#766c4e, α≤0.4); contact AO hugs base chevron.

## Reference implementations (PORT these)
- scratchpad/cohesion/lib.mjs — noise01/edgeThr/fbm/vnoise/tuft/contactAO/pxDot/grade
- scene1.mjs neutraliseApron+wornRing+groundCluster (A)
- scene2.mjs edgeField/centerline + worn path + tuft clustering (B/C)
- scene3.mjs shoreY + wet bank + clustered reeds/rocks (D)
- scene4.mjs edgeX + moss-grout + seam + half-buried cobbles (C plaza)
- scene5.mjs baseEdge/hugAO/laceTufts/wornField (E)

## Files
- scripts/strip-nature-apron.mjs (NEW)
- src/world/ground.ts (A paintNatureGrounding, B transitions, C paths/plaza, D water+scatter)
- src/art/sprites.ts (spriteBaseEdge cache — E)
- src/art/shapes.ts (baseGrounding chevron+hugAO — E)
- src/art/buildings.ts (wire chevron, drop wide contactShadow on sprite path — E)
- src/config.ts (BASE_TUFT_MAX densify — E)

## Key facts
- Ground bakes ONCE (paintGround) into an offscreen canvas; tiled path (PNGs) OR
  painterly fallback (zero-PNG). Nature grounding + building grounding both run
  on BOTH. Sub-rect getImageData/putImageData pattern (see scuffOne/wearSeg).
- Nature positions: WORLD_TREES, BUSHES+FOREST_BUSHES, WORLD_PROPS boulder-*.
- Tree scale 0.82, boulder scale 0.5/0.55, bush 0.5. Aprons: oak/birch=sand,
  pine/boulder=grass disc; bushes ~none (strip = sand-test-only, no wedge).
- Strip changes sprite anchors (foot→roots) — expected, minor down-shift.
- Verify harness: verify/lib.mjs (PORT 5199, headless Edge), __wh.warp/newGameWith/
  gotoFestival. Model shots on verify/shot-w2c-diag.mjs. Dev port 7777.
- Grade stays global (daynight). Build: `npm run build`.

## Verification gates
build; verify:smoke; verify:save; gp1-farmstart (4 paths+legacy); zero-PNG boot;
1920x1080 real-flow shots (farm day+dusk, tree/rock base, grass↔path, lake shore,
plaza edge, farmhouse base) LOOKED AT vs boards; farm-dusk vs uo-mock-screen-v3.

## Resume state
- [ ] A strip script + nature grounding
- [ ] B transitions
- [ ] C paths/plaza
- [ ] D water
- [ ] E buildings
- [ ] full verify + WORKLOG + commit + push v1-foundation
