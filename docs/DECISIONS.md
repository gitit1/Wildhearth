# Wildhearth — Product Decisions (from design sessions)

**How to read this:** every entry has v1 (what to build now) and v5 (product-complete vision).
If a topic only lists v1, it means v5 = the maximum reasonable version of that thing.

---

## The character
- **Character creation screen** — dedicated, with all choices below
- **Age:** 18+, chosen on screen
- **Gender:** male/female binary
- **Appearance:** curated preset set in v1 (skin/hair/eyes/body/height). v5 = full Sims-style spectrum
- **Name:** first + last + optional nickname
- **Backstory:** none in v1. v5 = multiple backstories tied to personality/life-goals
- **Starting Path:** player picks one — Fisher / Farmer / Musician / Animal-Keeper — gets both a starter-kit AND a preferred skill
- **Personality system:** none in v1. v5 = full personality axes with in-game evolution
- **Life-goal (Aspiration):** short list in v1 (family / independence / community — TBD which). v5 = full multi-goal system, player picks single OR multiple
- **Prior life:** unemployed before arriving at the farm
- **Multi-character (Sims-style multiple playable characters):** v5+, not v1
- **Appearance change during play:** in-house wardrobe, in-town hairdresser (when town exists), in-market clothes stall. 5 outfits per gender, start with one, buy others. v5 = tattoos, makeup, full customization

## Opening flow (after "New Game" click)
Order: Character Creation → Guidance Mode selection → straight to farm (no cutscene in v1)
- **Guidance Mode:** three options — Tutorial (step-by-step) / Aspiration (goal-driven, background) / None (fully free)
- **Switching Guidance Mode:** can leave Tutorial anytime → Aspiration/None. Cannot return to Tutorial (one-shot)
- **Starting point:** outside the house, early morning
- **Starting season:** spring
- **Time behavior:** in Tutorial time pauses per step. Aspiration/None = time flows immediately
- **Tutorial style:** transparent bubbles, explicit "Skip Tutorial" button on every step
- **Tutorial first step:** UI orientation (movement, action, selling, saving)
- **Tutorial save behavior:** state saved. Next load asks "continue Tutorial?" or "switch to Aspiration/None"
- **Starting kit:** 50 coins + path-specific tools + one outfit + 2-3 days of food

## World
- **Areas in v1:** the farm + adjacent stall-road area (multiple distinct stalls) + small forest passage + lake/river area
- **Areas at v5:** all the above + town + true forest + mountains + expanded world (northern/southern regions)
- **World structure:** network with multiple roads from farm to different directions
- **Direction mapping from farm:** TBD — separate design task
- **Size v1:** medium-to-large (Stardew-to-UO scale — hours of walking end-to-end)
- **Transitions:** open world, no loading screens
- **Camera:** fixed continuous follow (v1). Rotatable camera at v5
- **Locked areas:** mostly open world, few locked points (caves, protected zones)
- **Seasons:** 4 full seasons active from v1
- **Season length:** player setting (default 10 days)
- **In-game hours:** 24 full hours, can act at night
- **Sleep:** any hour. Physical needs continue during sleep. Tired = long sleep, not tired = short
- **Sleep locations v1:** home only. v5 = home + friends' houses + inn
- **Wildlife in world:** migratory, changes with seasons (spring butterflies, summer birds, winter mammals)
- **Foraging resources:** trees + minerals + wild herbs + earth-mineral deposits
- **Weather v1:** full — clear/cloudy/rain/storm/fog. Active at night too. Affects gameplay
- **Festivals v1:** one festival, day 15 of season, in the stall-area
- **v5 festivals:** four (one per season)
- **Mine location:** unresolved — open decision

## Town & NPCs
- **v1:** 10 NPCs. v5: 50+
- **NPC depth v1:** name + profession + personality + daily schedule + work/role
- **NPC depth v5:** + family + backstory + individual preferences + Heart Events + full inter-NPC relationships
- **Schedule v1:** varies by day-of-week. v5: also reacts to season + weather
- **Families v1:** independent NPCs (no families). v5: full families with children
- **Marriage/romance:** open to all NPCs of appropriate age, all gender combinations
- **Romantic NPCs v1:** 3-4. v5: all appropriate-age NPCs
- **NPC mix v1:** blend of profession-based AND personality-based (both types)
- **Story-arcs:** none in v1 directly, but NPCs lead player to stories via quest-chains at v5
- **Language:** English only. Other languages TBD
- **Dialogue v1:** choice-based (2-3 responses per turn)
- **Dialogue v5:** deep dialogue trees with branches affecting relationships/memory/future
- **AI in dialogue v1:** dynamic AI-driven natural conversation
- **AI in dialogue v5:** each choice leads to different narrative path with consequences
- **Relationship v1:** 2 axes (Friendship + Romance 0-100) + gift preferences
- **Relationship v5:** + event memory + Heart Events + NPC-to-NPC relationships + reputation impact + rumors
- **Marriage v1:** no marriage. v5: marriage + children + shared pets + full family
- **Gifts v1:** 5-tier preferences (loved/liked/neutral/disliked/hated). v5: contextual preferences (season/weather/specific-item)
- **Pet acquisition:** in-town/adoption during play, not at start

## Day-in-game & needs
- **Needs v1:** hunger, thirst, energy, hygiene, bathroom, mood, social
- **Collapse at zero:** temporary — costs coins (no death)
- **Needs v5+:** + full health system with diseases and injuries
- **Needs rate:** affected by actions + season + weather (realistic simulation)
- **Livelihoods:** through gameplay actions themselves. No NPC-issued salaries
- **Need reminders:** engine + visual warnings + NPCs commenting ("you look tired")
- **Sleep enforcement:** none — player chooses when
- **Housemates v1:** player lives alone
- **Housemates v5:** partner + children + pet
- **Daily missions:** depends on Guidance Mode (Tutorial=step-by-step, Aspiration=background-related, None=none)
- **End-of-day summary:** player setting — none/quick/full-with-achievements
- **Pause:** dedicated button + auto-pause during dialogue/important events
- **Real-time to in-game day:** based on player's day-length setting. Tutorial pauses game-time per step
- **Time organizer:** weekly, 7 days (Sunday-Saturday). Day of week affects NPC schedules and market days
- **Market day v1:** open every day. v5: special market days, week-long fairs, harvest festival
- **Special events display (Heart Events, quests):** live animation + journal entry + achievement tracker
- **Hiring NPCs to work for you:** not in v1, arrives v3+

## Work & professions
- **Skills v1:** 8 — Fishing, Farming, Foraging, Music, Cooking, Animal-Keeping, Renovation, Ornamental-Gardening
- **Skills v5:** 21 full skills per ROADMAP_EXPANSION appendix
- **Score system v1:** 0-100 per skill + tiers (Novice/Skilled/Expert). v5: + specializations, records
- **Skill gain:** use + success/failure + paid training with NPC trainers
- **Decay:** unused skills decay slowly
- **Overall cap:** yes, forces specialization (UO-style)
- **Skill locking:** player can lock/mark-descending (UO classic)
- **Actions design (universal principle):**
  - Simple formula-based (no complex minigames)
  - Smart choices affect outcome: bait, tool, location, season, time-of-day
  - Rarity comes from context knowledge, not luck
  - Better tools = better odds
  - Each collection: 20 varieties in v1, 50+ at v5
- **All 8 skills available day one** (kit + preferred skill from starting path)
- **Music profession:** requires instrument + skill training. Path "Musician" gets both free
- **Music income v1:** only at stall-area

## Trade & economy
- **Currency:** single — "coins"
- **Bank/storage v1:** backpack only. v3+: house storage (cabinets, boxes, wardrobes) + items as decorations (Sims + UO hybrid)
- **Prices v1:** fixed. v5: fully dynamic (season + supply + demand + reputation)
- **Haggling v1:** no. Fixed price. Haggling skill = v3+
- **Selling paths (universal principle):**
  1. Your own stall (in stall-area or on-farm) — primary. v3+ can hire employee
  2. NPC stalls of matching specialty (fisher-stall buys fish, produce-stall buys crops)
  3. Town (v3+)
  - Priority: your stall → specialty stall → other stalls (may refuse)
  - Direct sale to random NPCs = NO, unless that NPC has their own trading business in that area (like the Fisherwoman at the lake)

## HUD, screens, UI
- **HUD content:** small fixed items always visible (clock, coins, need icons). Player-configurable side panel for opening (mood, backpack, skills, map, journal, NPC messages, anything else)
- **Screen behavior:** drag-open, minimize, close (UO/Sims style — this is what's already in code, don't rebuild)
- **Screen close:** X button + clicking outside the screen
- **Backpack display:** grid of icons with details (UO/Sims/The Last of Us style)
- **Skills display:** list with value + tier (standard game convention)
- **Map v1:** simple with areas. v3+: NPCs live on it + personal markers
- **Settings entry:** ⚙️ button in HUD
- **Save button:** separate icon in HUD
- **NPC dialogue display:** bubble OR bottom-box — Fable's choice per style
- **System notifications:** matches dialogue style — Fable's choice
- **Fonts/visual style:** Fable's choice — should match "3/4 rich Cute Fantasy" aesthetic

## Save
- Automatic every 10 real minutes
- Manual save available via HUD icon
- One save slot in v1. Second slot in v5

## Exit menu
Three options: "Exit to main menu" + "Exit fully" + "Switch to another game" (implies save slots / multi-character future)

## Aesthetic direction
- **Style:** rich 3/4 top-down (Stardew Valley depth level)
- **Not:** true isometric, not 3D, not flat top-down
- **Reference aesthetic:** Cute Fantasy pixel-art — visible dark outlines, warm palette, multi-tone tree canopies, elliptical shadows on entities, diagonal cast shadows on tall objects, textured tilled soil, weathered vs repaired variants
- **Language:** English

---

## Universal principles (apply to all systems)

1. **Rich variety over simplicity** — 20 varieties per collection in v1, growing to 50+ at v5
2. **Context knowledge over random luck** — rare items appear when player masters the right conditions
3. **Player choice at every configuration level** — HUD content, day length, end-of-day summary all configurable
4. **Actions have consequences that matter** — every action feeds skills, needs, relationships, economy
5. **v1 = playable and complete standalone** without AI layer — AI enhances, doesn't gatekeep
6. **All actions are simple mechanically, deep contextually** — click + formula, with choices that matter

---

## Open decisions still on the table

- Mine location (accessible from farm/forest, or through town?)
- Which festival for v1 (Harvest / Solstice / Moon)
- Exact life-goal list for v1 Aspiration screen
- Direction map from farm to each area
- Weather event specifics (what happens in storm? in fog?)
- 10 NPCs mix for v1 (which professions + personalities)
