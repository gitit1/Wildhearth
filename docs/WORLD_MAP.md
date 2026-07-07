# World Map — what's been checked, what hasn't

A tracking sheet, not lore. Update this whenever we (Claude + the person)
walk through a new part of the world in chat or lock down real content for
one. Status meanings:
- ✅ **Detailed** — concrete content exists in VISION.md/ROADMAP_*.md, not
  just a name on a list.
- 🟡 **Named, not detailed** — we know it exists and roughly what it's for,
  but haven't walked through the specifics yet.
- ⬜ **Not yet touched** — mentioned once in passing at most.

| Location | Status | Where it's written up |
|---|---|---|
| The Farm (rundown state) | ✅ | VISION Opening Arc/Sequence, ROADMAP_EXPANSION Phase 0 item below — **built**; farmhouse + barn now PixelLab sprite-sourced (flat-front, dual-path with the code painter) |
| The Farm (renovated states) | 🟡 | VISION #8 Housing tiers — tiers named, exact visual milestones not walked through |
| House interior | ✅ | VISION #13 Needs + ROADMAP_EXPANSION Phase 0 item 5 — bare/broken tier-1 state fully detailed and **built**; every furniture piece + the room backdrop now sprite-sourced (dual-path) |
| Market/dock area | ✅ | ROADMAP_EXPANSION Phase 0 item 3 — **built and walkable**: 4 themed stalls (fish/produce/goods/empty, each its own PixelLab sprite), a well, 6 distinct cottage sprite variants, the busking spot |
| River (fishing) | ✅ | Fishing/junk mechanics — **the river/lake/dock region itself is built and walkable** (fishing spots tagged river/lake). The Riverside Fisherwoman (dialogue/shop/teaching/boats) + bird-watching + boat-gated fish/diving + sailing described here is NOT part of the built 10-NPC roster and remains unbuilt — ROADMAP_EXPANSION Phase 1 item 5 |
| Forest edge (foraging) | ✅ | Foraging mechanic detailed and **built**; the forest passage itself is now built and walkable (location-tagged finds), branching north off the market road |
| Deep forest / treasure spots | ⬜ | Named as a region in VISION, no content |
| Mine | ⬜ | Sits in a mountain region (not a flat opening) — accessibility even still an open question (see OPEN_QUESTIONS.md) |
| Town | 🟡 | Building list named (inn, 3 merchants, 5–8 homes) in ROADMAP_EXPANSION Phase 1, not walked through as a place; confirmed to be coastal — a seafront belongs near the town, not the farm. Distinct from the now-built market square above (v1's commerce hub, not the coastal town itself) |
| Coast (near town) | ⬜ | Named as its own region in VISION, no content yet — distinct from the river |
| Road (farm → town) | ✅ | Confirmed to exist + at least one neighboring farm — **the farm→market segment is built and walkable**, incl. the neighboring farm's own established sprite house (whitewash walls/slate roof, distinct from the player's farmhouse) and seasonal ambient wildlife (built game-wide, region-gated). Gradual minimap reveal and continuing on to an actual town via paid fast travel remain 🟡/not yet built — ROADMAP_EXPANSION Phase 1 items 1–2 |
| First NPC roster | 🟡 | **Built:** 10 townsfolk with weekly schedules, all sprite-sourced (see `docs/WORKLOG.md`) — Maren, Tobin, Sera, Henrik, Petra, Liora, Bram, Ada, Finn, Jonas. The Riverside Fisherwoman as originally conceived is NOT among them (no NPC currently holds that role); the 5–8 additional town NPCs are still ⬜, tracked in OPEN_QUESTIONS.md |

## Farm — concrete details locked in during the imaginary walkthrough
These came out of playing through the opening in chat and need to be
formally in ROADMAP_EXPANSION now (see Phase 0 there), not just here:
- Broken/empty chicken coop — visible, no hen yet.
- Barn door hanging on one hinge.
- A fence section that's simply *missing*, not just damaged — you can see
  where it used to be.
- An old well with a rusted bucket.
- Faint sparkle spots in the dirt at forageable/dig-adjacent areas — a
  visual hint at buried treasure, needs a digging tool to actually access.
- A broken bridge blocking a shortcut into the deeper forest — repairing
  it later is a real unlock, not just a visual upgrade.
- The mine entrance is visible on the horizon from the farm, even though
  reaching/using it may be gated behind the town (open question).
- The dirt road out of the farm is visible leading toward town from day
  one, even before the player has walked it.

## Next places to walk through together
House interior — done. Road, market, river/lake/dock, and forest edge —
**now built in code** (see the table above), superseding a chat
walkthrough. What's left, in the same "how a player would actually move"
order: **the town** (still 🟡, not yet walked or built), then coast / deep
forest / the mine (⬜).
