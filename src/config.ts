/** Global tuning knobs. Change values here, not inside systems. */
export const T = 32;                    // tile size in px
// World expansion v1: the farm is the west corner of a much larger open scene
// (farm -> road -> market -> forest -> river/lake). v2 BLOCK #3 extends the map
// SOUTH (MH 30 -> 46) to add the coastal TOWN region below the market: a cobbled
// town street, an inn, specialised merchants, NPC homes, a seafront + town dock.
// 108x46 tiles = 3456x1472 px — both sides still well under the 4096 canvas cap.
export const MW = 108, MH = 46;         // map size in tiles
export const WORLD_W = MW * T, WORLD_H = MH * T;
export const ROAD_W = 2.4;              // dirt road width in tiles

export const PLAYER_SPEED = 150;        // px/sec

export const STARTING_COINS = 50;       // a new life's purse (VISION price anchor table)
export const COW_SPEED = 22, HEN_SPEED = 30;
// Part C content-library commit 2: pig/sheep/duck wander speeds (px/sec) —
// duck paddles about like a hen, pig plods slower than the cow, sheep between.
export const DUCK_SPEED = 26, PIG_SPEED = 16, SHEEP_SPEED = 20;

// NPCs (10 townsfolk, weekly schedules — NPC-engine block). Deterministic from
// the clock, so no persistence; these are pure feel/tuning knobs.
export const NPC_WALK_SPEED = 52;       // px/sec — a townsperson's stroll (well under the player's 150)
export const NPC_ARRIVE = 4;            // px: close enough to a waypoint to advance
export const NPC_REACH = 46;            // px: close enough to be offered "Talk to <name>"
export const NPC_TALK_SECONDS = 3.4;    // how long an NPC faces you & holds the talking pose after Talk

export const FISH_PRICE = 3;            // coins per legacy generic fish (old saves)
export const FISH_TIME_MIN = 1.2;       // seconds until a bite
export const FISH_TIME_MAX = 3.0;
export const FISHING_BITE_REDUCTION = 0.5; // bite-time fraction removed at Fishing 100
export const ROD_PRICE = 12;            // shop: fishing rod (basic-tool tier, same as the hoe)
export const JUNK_CHANCE_BASE = 0.35;   // junk-catch odds at Fishing 0...
export const JUNK_CHANCE_MIN = 0.05;    // ...falling to this at Fishing 100

// ---- Rod tiers + bait (v2 BLOCK #6 slice 2 — the Riverside Fisherwoman's gear).
//      Rods scale up from the basic 12c tool; bait sits on VISION's price table
//      ("cheap 2-3 / rare-shifting 8-12"). The Master Rod is trust-gated: Nerys
//      only sells it once she trusts your technique — a lesson count OR a proven
//      Fishing skill (slice 3 wires the lessons). Data lives in
//      data/fishinggear.ts; these are the tuning knobs. ------------------------
export const RIVER_ROD_PRICE = 30;      // Nerys' better rod (upper basic-tool band)
export const MASTER_ROD_PRICE = 75;     // her own make — a mid-game sink, trust-gated
export const BAIT_WORMS_PRICE = 3;      // cheap everyday bait (VISION "cheap 2-3")
export const BAIT_SPINNER_PRICE = 10;   // rare-shifting lure (VISION "rare-shifting 8-12")
export const MASTER_ROD_LESSONS = 3;    // lessons from Nerys that earn her trust for the Master Rod...
export const MASTER_ROD_SKILL = 55;     // ...or a Fishing skill high enough that she trusts it anyway
// ---- Teaching (v2 BLOCK #6 slice 3 — the VISION pillar "skills rise from
//      deliberate learning… faster than grinding"). A paid lesson from Nerys is a
//      deterministic Fishing bump (respecting the skill caps), diminishing as the
//      skill climbs, capped to one lesson per teacher per in-game day so it paces
//      like a real apprenticeship rather than buying mastery outright. ----------
export const LESSON_PRICE = 18;         // coins per fishing lesson from Nerys
export const LESSON_GAIN_BASE = 5;      // lesson bump at Fishing 0 (≈16 successful grinds)...
export const LESSON_GAIN_MIN = 1;       // ...never less than this, so a lesson always teaches something

export const FORAGE_TIME = 1.2;         // seconds to pick a bush (per-item prices live in data/forage.ts)
export const BUSH_RESPAWN = 25;         // seconds until a picked bush regrows
export const FORAGE_BASE_YIELD = 1;     // berries per pick (Foraging skill adds a bonus chance)

export const HOE_PRICE = 12;            // shop: first tool (unlocks farming, Step 5)
// (per-crop seed prices live in data/crops.ts)

export const BUSK_TIME = 3;             // seconds per street performance
export const BUSK_TIP_MIN = 1;          // tip roll: BUSK_TIP_MIN..BUSK_TIP_BASE_MAX at skill 0
export const BUSK_TIP_BASE_MAX = 3;
export const BUSK_TIP_SKILL_BONUS = 5;  // extra random tip range unlocked at Busking 100
export const HAGGLE_MAX_DISCOUNT = 0.25; // shop discount at Haggling 100

export const REPAIR_COST = { roof: 25, window: 15, barn: 30, fence: 10 } as const; // farm renovation, Step 8

export const HEN_PRICE = 45;            // livestock (price anchor: first hen 40-50)
export const COW_PRICE = 175;           // livestock (price anchor: first cow 150-200)
// Part C content-library commit 2: three more barn-gated animals, priced on
// the same anchor scale between the hen (45) and the cow (175).
export const DUCK_PRICE = 35, PIG_PRICE = 90, SHEEP_PRICE = 110;
// Animal-produce daily yield (the barn's collection loop, VISION §122): a fed,
// owned animal leaves ONE base good in the barn each morning. Per-unit SELL
// prices on the VISION anchor scale — an egg is a coin or two, milk a modest
// staple, wool a bit more. Base produce only (no cheese/cloth crafting — that's
// a v3+ chain, out of scope). Data (id/name/species) lives in data/produce.ts.
// NOTE: the pig's produce is the EXISTING forage truffle (data/forage.ts, price
// 18) — it has no entry here so there stays exactly one truffle price/sell path.
export const PRODUCE_PRICES = { milk: 12, egg: 4, duck_egg: 5, wool: 14 } as const;
// Farm plot expansions: above fence-repair scale (10), at animal-tier spends —
// tier 1 lands between hen and cow, tier 2 at cow tier. Each adds 22 tiles (+20%).
export const PLOT_EXPANSION_PRICES = [120, 180] as const;

export const TILL_TIME = 1.0;           // seconds to till a plot tile
export const PLANT_TIME = 0.7;          // seconds to plant seeds
export const HARVEST_TIME = 0.8;        // seconds to harvest
export const WATER_TIME = 0.6;          // seconds to water a growing tile
export const CLEAR_TIME = 0.8;          // seconds to clear a wilted crop
export const WILT_DRY_DAYS = 3;         // consecutive unwatered days before a crop wilts
export const COOK_TIME = 1.2;           // seconds to cook a dish at the hearth
// Interior "chore" activities that used to be an instant stat+toast (GF-1): now
// short placed states with interim motion (lean/bob + code-drawn particles), so
// wash/sit read as real actions. The need restore + toast fire on COMPLETION.
export const WASH_TIME = 2.0;           // seconds scrubbing at the basin
export const SIT_TIME = 2.6;            // seconds resting in the chair
export const FLOWER_SEEDS_PRICE = 3;    // shop: a packet of mixed flower seeds
export const FLOWER_GROW_DAYS = 0.5;    // in-game days for a flower bed to bloom
export const FEED_GAIN_ITEM = "corn";   // what feeding an animal consumes (a crop of your own)
export const FARMING_GROW_REDUCTION = 0.4; // grow-time fraction removed at Farming 100
// (per-crop grow times & prices now live in data/crops.ts)

export const SKILL_GAIN_BASE = 0.3;     // points gained on a successful gain-roll
export const GAIN_GUARD_FAILS = 4;      // consecutive failed rolls before the next is forced (UO-style pity)
export const SKILL_CAP = 250;           // total skill budget (placeholder for MVP's 5 skills)
export const STARTER_SKILL_SEED = 10;   // starting value of the skill matching the starter tool
// Neglect-decay (DECISIONS "Decay: unused skills decay slowly"): a skill unused
// for SKILL_DECAY_IDLE_DAYS in-game days then loses SKILL_DECAY_PER_DAY points
// per further idle day — but never falls below the bottom of the score TIER it
// has reached (Novice/Skilled/Expert), so earned tiers aren't lost. Locked
// skills never decay.
export const SKILL_DECAY_IDLE_DAYS = 4;   // grace: idle days before decay begins
export const SKILL_DECAY_PER_DAY = 0.2;   // points lost per idle day past the grace
export const SKILL_TIER_FLOORS = [33, 66] as const;  // Skilled / Expert entry (Novice floor is 0)

export const INVENTORY_SLOTS = 12;      // backpack size (upgradeable post-MVP)
export const MINIMAP_SCALE = 0.19;      // minimap px per world px — retuned for the town-era 108x46 world (0.11 dated from the smaller map and rendered it unreadably dense)
// The UO-style corner RADAR — a small always-on crop of the world AROUND the
// player (the big world map above is the on-demand overview). RADAR_SCALE is
// its zoom: 0.5 => one tile = 16 radar px => the window shows ~11x9 tiles of
// local surroundings, readable at a glance.
export const RADAR_W = 176, RADAR_H = 148;   // radar canvas (CSS px)
export const RADAR_SCALE = 0.5;              // radar px per world px (zoom)

// ===========================================================================
//  Needs engine (Part A #2) — 7 needs, each 0-100. All tuning lives here; the
//  season/weather/exertion TABLES (which condition touches which need) live in
//  systems/needs.ts, but every magnitude below is a knob.
// ===========================================================================
export const NEED_START = 80;           // New Game / "comfortable" baseline for every need
// base drain per IN-GAME MINUTE for the six tracked needs (mood is DERIVED, not decayed).
// A full day is 1440 min; at these rates a comfortable need reaches its 25 warning
// in roughly 0.6-1 in-game day, and 0 in a bit over a day — noticeable, not oppressive.
export const NEED_DECAY = {
  hunger: 0.05, thirst: 0.07, energy: 0.045,
  hygiene: 0.03, bathroom: 0.08, social: 0.025,
} as const;
export const NEED_SLEEP_DECAY_MULT = 0.35; // needs still drain while asleep, but slower (DECISIONS)
export const NEED_SLEEP_FLOOR = 5;         // sleep never drains a need below this (you don't faint in your sleep)
export const ENERGY_SLEEP_RECOVER = 0.22;  // energy regained per in-game minute asleep (~a full night = a full bar)
// season / weather decay multipliers (stacked multiplicatively onto the base rate)
export const NEED_WINTER_ENERGY_MULT = 1.35; // winter tires you faster...
export const NEED_WINTER_HUNGER_MULT = 1.25; // ...and burns more fuel
export const NEED_SUMMER_THIRST_MULT = 1.4;  // summer heat = thirstier
export const NEED_STORM_ENERGY_MULT = 1.3;   // a storm is exhausting...
export const NEED_STORM_HUNGER_MULT = 1.2;   // ...and hungry work
// mood is DERIVED from the other six + a recent-good-moment bonus + a weather drag
export const MOOD_WORST_WEIGHT = 0.4;      // how hard the single lowest need drags mood down
export const MOOD_SOCIAL_BONUS = 12;       // max mood lift from a recent chat / rest (fades)
export const MOOD_GLOW_MINUTES = 180;      // in-game minutes the good-moment glow takes to fade
export const MOOD_WEATHER_DRAG = { clear: 0, rain: 4, storm: 8, fog: 6 } as const; // fog/rain mild drag
export const MOOD_PENALTY_DECAY = 0.3;     // a one-off mood dip (an accident) fades this much per minute
export const REST_GLOW = 0.5;              // a sit-down tops the good-moment glow to at most this
// mood performance multipliers — wired into skill-gain CHANCE and busking PAYOUT
export const MOOD_LOW_THRESH = 25, MOOD_HIGH_THRESH = 75;
export const MOOD_LOW_MULT = 0.75, MOOD_HIGH_MULT = 1.1;
// exertion: extra drain applied the moment an action finishes (energy + hygiene)
export const EXERTION = {
  fishing:  { energy: 2, hygiene: 1 },
  farmwork: { energy: 3, hygiene: 3 },
  busking:  { energy: 2, hygiene: 1 },
  foraging: { energy: 2, hygiene: 2 },
} as const;
export const WALK_ENERGY_PER_1000PX = 1.2; // slight energy cost of covering distance on foot
// restoration
export const EAT_DISH = 40, EAT_CROP = 18, EAT_FORAGE = 10; // hunger restored by cooked / crop / wild edibles
export const DRINK_RESTORE = 100;          // the well / basin bucket — free, fills thirst
export const WASH_RESTORE = 100;           // a wash at the basin fills hygiene
export const OUTHOUSE_RESTORE = 100;       // relief at the outhouse
export const REST_ENERGY = 8;              // a short sit in the rest corner
export const SOCIAL_TALK_BASE = 14;        // social gained from a chat...
export const SOCIAL_TALK_DIMINISH = 0.5;   // ...halved for each further chat with the SAME NPC that day
// accident (bathroom hits 0): embarrassing, not a collapse — small hits, no coin cost
export const ACCIDENT_HYGIENE_HIT = 22;
export const ACCIDENT_MOOD_HIT = 16;
export const ACCIDENT_BATHROOM_RESET = 55;
// collapse (hunger / thirst / energy hits 0): temporary, coin cost, wake at the bed 06:00
export const COLLAPSE_FEE = 15;            // helper's fee (VISION anchor-table scale); clamped to coins held
export const COLLAPSE_RECOVER = 30;        // every physical need bumped to at least this on waking

// ===========================================================================
//  Relationship engine (Part A #3) — two independent axes per NPC (Friendship
//  0-100, Romance 0-100). Every magnitude below is a tuning knob; the tuned
//  numbers are the anchors from ROADMAP_EXPANSION's "Gift point values &
//  dynamic relationship decay — tuning anchor" block.
// ===========================================================================
// 5-tier gift deltas (per gift, on a 0-100 axis).
export const GIFT_DELTAS = { loved: 35, liked: 20, neutral: 8, disliked: -10, hated: -20 } as const;
export const BIRTHDAY_GIFT_MULT = 2;         // a birthday gift's tier delta is doubled...
export const GIFTS_PER_WEEK = 2;             // ...and one birthday gift is exempt from this Sun-Sat weekly cap
export const RARE_FISH_PRICE = 8;            // a fish selling at/above this reads as a "rare" gift (trait prefs)
export const ROMANCE_UNLOCK_FRIENDSHIP = 20; // Romantic interactions stay hidden below this Friendship
// Depth-dependent neglect decay: per no-contact in-game day, an axis drifts down
// FASTER when shallow, barely at all when deep (a spouse never needs "feeding").
export const RELATIONSHIP_DECAY_LOW = 2;     // axis < 30 → -2/day
export const RELATIONSHIP_DECAY_MID = 1;     // 30-60   → -1/day
export const RELATIONSHIP_DECAY_HIGH = 0.25; // > 60    → -0.25/day
export const RELATIONSHIP_DECAY_MID_FLOOR = 30;
export const RELATIONSHIP_DECAY_HIGH_FLOOR = 60;
// Heart-event tiers: crossing one UPWARD on either axis fires once per NPC per axis.
export const RELATIONSHIP_THRESHOLDS = [25, 50, 75] as const;
// Categorized-interaction diminishing returns: multiplier by prior uses of the
// SAME category with the SAME NPC today (2nd ~half, 3rd ~a trickle, 4th+ nothing).
export const INTERACT_DIMINISH = [1, 0.5, 0.15] as const;
// First sale to an NPC-specialty stall (fish-buyer, and future produce/etc.
// stalls) — a small, contact-marking Friendship bump via dialogueBump(), same
// mechanism a warm dialogue choice uses (see DIALOGUE_FRIENDSHIP_BUMP above).
export const NPC_SALE_FRIENDSHIP_BUMP = 3;

// ===========================================================================
//  Customers-to-your-stall (v2 economy block #1) — townsfolk who walk to the
//  player's OWN market stall with want-table-driven demand and buy at a small
//  premium over the flat stall price, so tending the stall pays off. Every
//  magnitude a knob; Reputation (the NEXT block) is deliberately absent here.
// ===========================================================================
// The town's shop hours: the window in which townsfolk will walk up to the
// player's stall. With V2-B2's town residents populating the seafront square all
// day, custom now spans these natural morning-to-dusk hours (it used to feel
// afternoon-only because the coastal town was empty until the 15:00 visit block).
export const CUSTOMER_MARKET_START = 9;   // shop opens ~09:00
export const CUSTOMER_MARKET_END = 18;    // …and closes ~18:00
export const CUSTOMER_DAILY_CAP = 6;      // most sales customers bring you in one day
export const CUSTOMER_MAX_CONCURRENT = 2; // most customers queued at your stall at once
export const CUSTOMER_PREMIUM = 1.3;      // they pay 1.3x the flat GOOD_PRICES rate
export const CUSTOMER_QTY_MAX = 3;        // most units one customer buys of a good
export const CUSTOMER_SPAWN_GAP_MIN = 25; // in-game minutes between spawn attempts
export const CUSTOMER_SPAWN_CHANCE = 0.6; // odds a due attempt actually produces one
export const CUSTOMER_PATIENCE_MIN = 90;  // in-game minutes a customer waits before leaving
export const CUSTOMER_TEND_TILES = 5;     // player must be within this (tiles) of her stall
export const CUSTOMER_FRIENDSHIP_BUMP = 1; // small repeatable Friendship nudge per sale

// ===========================================================================
//  Town Reputation / Fame (v2 economy block #2) — a single town-wide 0-100
//  number (UO fame/karma), independent of any one NPC's Friendship and of the
//  Haggling skill. It RISES on good custom (served customers, quests, festival
//  turnout, generous gifts) and dips gently when a customer is left waiting.
//  It then MODULATES the customer economy: how much they pay, how many come,
//  how often. Every magnitude a knob. DECISIONS' forgiving tone: losses are
//  smaller than the matching gain, and idle decay can never demote a tier.
// ===========================================================================
export const REP_GAIN_SALE = 1.5;         // fame per customer served at your stall
export const REP_GAIN_QUEST = 4;          // fame per quest completed (word gets around)
export const REP_GAIN_FESTIVAL = 3;       // fame for turning up at a festival (once/day)
export const REP_GAIN_GIFT = 0.5;         // fame per warmly-received gift (loved/liked only)
export const REP_LOSS_TIMEOUT = 1;        // fame lost when a customer gives up waiting (gentle)
export const REP_DECAY_IDLE_DAYS = 5;     // days with no fame-earning act before idle decay starts
export const REP_DECAY_PER_DAY = 0.5;     // fame shed per idle day — FLOORED at the current tier's min
export const REP_PREMIUM_MIN = 1.15;      // customer price multiplier at fame 0
export const REP_PREMIUM_MAX = 1.45;      // customer price multiplier at fame 100
export const REP_DAILY_CAP_BONUS_MAX = 4; // extra daily customer sales at fame 100 (on top of the base cap)
export const REP_SPAWN_CHANCE_BONUS_MAX = 0.25; // extra spawn odds at fame 100 (added to CUSTOMER_SPAWN_CHANCE)
export const REP_BUY_DISCOUNT_MAX = 0.12; // town-merchant purchase discount at fame 100 (VISION "better opening prices")

// ===========================================================================
//  Coastal town merchants (v2 BLOCK #3) — the specialised town shops. The
//  fishmonger + greengrocer BUY their speciality from the player at a
//  reputation-scaled premium (reuses reputationPremium, the customer band); the
//  general store SELLS tools/seeds (better/year-round stock vs the seasonal farm
//  stall) at a reputation-scaled discount. Shops trade during daytime hours.
// ===========================================================================
export const TOWN_SHOP_OPEN_HOUR = 8;    // town shops open at this hour...
export const TOWN_SHOP_CLOSE_HOUR = 20;  // ...and shut at this one (sleep at the inn is later town life)

// ===========================================================================
//  Fast travel (v2 BLOCK #4) — paid carriage/ferry hops between discovered
//  minimap nodes. VISION §9: walking discovers the world; once a place has been
//  reached on foot it becomes a quick-travel node "for a small coin cost" (an
//  old-world coachman, not a free warp). VISION price table anchors the fare at
//  3-5 coins per trip; time still ticks (no teleport-out-of-the-clock), scaled
//  with distance so a cross-map hop eats a chunk of the day but never all of it.
// ===========================================================================
export const TRAVEL_FARE_MIN = 3;          // coins for the shortest hop (VISION anchor 3-5)
export const TRAVEL_FARE_MAX = 5;          // coins for the longest hop
export const TRAVEL_FARE_PER_TILE = 0.04;  // fare ramp per tile of distance (min→max across the map)
export const TRAVEL_MIN_MINUTES = 20;      // even a short carriage ride costs some clock time
export const TRAVEL_MINUTES_PER_TILE = 1.0;// in-game minutes per tile travelled
export const TRAVEL_MAX_MINUTES = 90;      // cap: a cross-map hop never blows a whole day

// ===========================================================================
//  Transportation vendors (v2 BLOCK #5) — the town STABLE sells old-world
//  transport (VISION §9: horses, carriages, boats — "available to buy from
//  early game, gated by money"). ROADMAP_TO_V5 §v2: "boats (Fisherwoman), then
//  horses/carriages tied to a town stable." Owned transport has REAL effects,
//  not just a ledger entry:
//   - a HORSE she can mount/dismount for faster overland travel + stamina-free
//     walking + a cheaper fast-travel fare (she rides part of the way herself);
//   - a CARRIAGE (her own coach) — fast travel costs no coachman fare at all;
//   - a ROWBOAT — unlocks the dock "take the boat out" interaction (the entry
//     point to the Riverside Fisherwoman's boat/diving/net epic — see §v2).
//  Prices sit on the anchor scale as mid-game sinks (VISION table: the cow at
//  150-200 is a "real, multi-session savings target"; transport is a peer
//  aspiration): the rowboat is the entry buy, the horse a solid saving, the
//  carriage the luxury top. Every magnitude below is a tuning knob.
// ===========================================================================
export const ROWBOAT_PRICE = 160;         // entry transport — a modest boat (below the cow tier)
export const HORSE_PRICE = 240;           // a solid mid-game saving (just past the cow)
export const CARRIAGE_PRICE = 360;        // the luxury: your own coach — the top transport sink
export const MOUNT_SPEED_MULT = 1.7;      // overland walk speed while mounted on the horse
export const HORSE_FARE_DISCOUNT = 0.4;   // fraction shaved off a fast-travel fare when you own a horse
export const CARRIAGE_FARE_DISCOUNT = 1.0;// your own coach: fares are free (still costs clock time, no teleport)

// ===========================================================================
//  Dialogue engine (Part A #4, mechanical layer) — condition-keyed opening
//  lines + shallow choice trees, shown in the bottom-box. Every magnitude a knob.
// ===========================================================================
export const DIALOGUE_MAX_CHOICES = 3;       // choices shown per turn (DECISIONS: 2-3)
export const DIALOGUE_FRIENDSHIP_BUMP = 2;   // a warm choice nudges Friendship by this (small)
export const DIALOGUE_TOPIC_FLAG_DAYS = 3;   // how long a "we talked about X" topic flag stays fresh

export const CLICK_ARRIVE = 5;          // px: close enough to a click-to-move target
export const DRAG_THRESHOLD = 10;       // px of travel before a press is a joystick drag, not a tap

// Camera zoom (CSS px per world px). Retuned for a CLOSER, UO-like framing
// (GF-1): the old 1.4–2.2 / ref-900 band showed ~16–17 tiles vertically and the
// heroine read as ~7–8% of viewport height — the world felt distant. The band
// below lands ~9–12 tiles visible vertically on a 1920×1080 desktop at the
// standard 88% viewport (heroine ≈11–13% of viewport height, ≈UO's ~12.5%).
// Effective autoZoom = clamp(canvasBackingWidth / CAM_ZOOM_REF_W, MIN, MAX); the
// MIN floor keeps a shrunk window / phone from zooming out to a distant dollhouse.
export const CAM_ZOOM_MIN = 2.0;        // camera zoom (CSS px per world px) bounds
export const CAM_ZOOM_MAX = 3.3;
export const CAM_ZOOM_REF_W = 620;      // window width where zoom starts growing past min
export const CAM_USER_ZOOM_MIN = 0.6;   // player zoom factor bounds (wheel / +− buttons)...
export const CAM_USER_ZOOM_MAX = 1.8;
export const CAM_USER_ZOOM_STEP = 0.12; // ...changed by this much per wheel notch / button press
// Interior camera boost (GF-1): the 320×224 ROOM floated as a small lit island
// in a black void at the outdoor zoom. This multiplies the auto-zoom while
// inside so the room fills most of the view (~70–80% of viewport height); the
// hard-black surround is replaced by a warm-dark vignette (see drawInteriorScene).
export const INTERIOR_ZOOM = 1.22;

// ===========================================================================
//  Save system (Part A #11) — continuous per-store saves already happen on
//  every mutation; these are the extra "force everything now" moments.
// ===========================================================================
export const AUTOSAVE_SECONDS = 600;    // 10 real minutes between autosaves (DECISIONS: "Save")

// Settings screen (Part E #3) — the Day-length slider maps real MINUTES/day in
// this range onto dayLengthSeconds (minutes × 60). Default 24 min = 1440s.
export const DAY_LENGTH_MIN_MIN = 8;
export const DAY_LENGTH_MAX_MIN = 48;
// AI companion settings (Part E #3 / AI_ARCHITECTURE) — its OWN versioned key,
// deliberately NOT in saves.ts's GAME_KEYS: the AI config (BYOK, budget,
// per-feature toggles) is a durable preference that survives a New Game.
export const AI_SETTINGS_KEY = "wildhearth-ai-v1";
export const AI_TOKEN_BUDGET_DEFAULT = 200000;   // monthly token cap default

// ===========================================================================
//  AI foundation (Part D commit 1) — provider / budget / cache / rate knobs.
//  See docs/AI_ARCHITECTURE.md. The whole layer is inert with the master
//  toggle off (aiSettings.enabled === false, the default); nothing below runs.
//  These two keys are ALSO deliberately outside saves.ts's GAME_KEYS — the
//  spend ledger and the response cache are per-machine, not per-save-slot.
// ===========================================================================
export const AI_BUDGET_KEY = "wildhearth-ai-budget-v1";  // monthly token ledger (own key)
export const AI_CACHE_KEY = "wildhearth-ai-cache-v1";    // response cache (own key)

// AI feature stores (Part D features). Unlike the budget/cache above, these ARE
// per-playthrough — they live in saves.ts's GAME_KEYS so a New Game wipes them.
export const AI_ANTIREP_KEY = "wildhearth-ai-antirep-v1";     // per-NPC said-history (feature #7)
export const AI_BACKSTORY_KEY = "wildhearth-ai-backstory-v1"; // generated backstories, frozen once (#1)
export const AI_ARCS_KEY = "wildhearth-ai-arcs-v1";           // play-pattern tracker (#6)
export const AI_DEVNOTES_KEY = "wildhearth-ai-devnotes-v1";   // dev observations (#8)

// Anti-repetition (#7): how many recent items to keep + feed the "don't reuse" block.
export const AI_ANTIREP_LINES = 8;        // recent AI-line gists kept per NPC
export const AI_ANTIREP_SCRIPTED = 6;     // recent scripted line texts kept per NPC (cross-session variety)
export const AI_ANTIREP_PROMPT_LINES = 4; // how many gists go into a prompt's exclusion block
export const AI_DEDUP_OVERLAP = 0.6;      // token-set overlap at/above which a new line reads as a repeat

// Dialogue variation (#2) — prefetch + prompt sizing.
export const AI_PREFETCH_DWELL_SECONDS = 2;   // linger this long in talk range before prefetching an opening
export const AI_PREFETCH_COOLDOWN_MS = 20_000; // min gap between proximity prefetches of the SAME npc
export const AI_DIALOGUE_MAX_TOKENS = 120;    // a rephrased line is short
export const AI_DIALOGUE_LINE_MAX = 240;      // hard length cap on a variation (chars)

// NPC inner thoughts (#4).
export const AI_THOUGHT_MAX_TOKENS = 60;
export const AI_THOUGHT_MAX = 160;            // a thought is one short sentence
export const AI_THOUGHT_BUBBLE_CHANCE = 0.15; // odds an idle NPC voices a thought when the player lingers
export const AI_THOUGHT_BUBBLE_COOLDOWN = 0.006; // per-frame gate (like need comments) so it's occasional

// Backstories (#1).
export const AI_BACKSTORY_MAX_TOKENS = 320;
export const AI_BACKSTORY_MAX = 600;          // generated backstory length cap (chars)
export const AI_BACKSTORY_PAGE_CHARS = 200;   // split a long backstory into pages of about this size

// World-event narration (#5).
export const AI_NARRATION_MAX_TOKENS = 80;
export const AI_NARRATION_MAX = 200;

// Quest generation stub (#3) — v2 preview only, never shown to the player.
export const AI_QUEST_MAX_TOKENS = 220;
export const AI_QUEST_MIN_INTERVAL_DAYS = 1;  // at most one quest-offer attempt per in-game day

// Story-arc detector (#6) — plain-code thresholds for emitting an "arc note".
export const AI_ARC_VISIT_NOTE_MIN = 3;       // talks to one NPC on the same weekday before "she visits X on <day>s"
export const AI_ARC_LIVELIHOOD_MIN = 12;      // activity count before it reads as the player's "main livelihood"

// Improvement observation (#8) — plain-code, token-free dev notes.
export const AI_DEVNOTES_STALE_DAYS = 4;      // an activity untouched this many in-game days reads as "skipped"

// Browser-direct transport (BYOK). Plain fetch, not the SDK, to keep the bundle
// lean (deviation from AI_ARCHITECTURE §2, which sketches the @anthropic-ai/sdk).
export const AI_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const AI_ANTHROPIC_VERSION = "2023-06-01";
export const AI_REQUEST_TIMEOUT_MS = 8000;   // per-call wall clock before abort
export const AI_MAX_RETRIES = 1;             // one retry on 429/5xx with backoff
export const AI_RETRY_BACKOFF_MS = 600;      // base backoff before the single retry

// Depth/cost dial (aiSettings.depth) → model tier. Request shape is identical on
// every tier (no temperature/top_p/thinking — those 400 on Opus 4.8 / Sonnet 5),
// so the dial is a one-line model swap. Model IDs verified against the claude-api
// reference (cached 2026-06-24).
export const AI_MODEL_BY_DEPTH = {
  standard: "claude-haiku-4-5-20251001",  // default: cheap, fast, low latency
  rich:     "claude-sonnet-5",            // narrative-rich features
  deepest:  "claude-opus-4-8",            // top dial, opt-in
} as const;

// Response cache: LRU cap + per-feature TTLs (ms). Repeated identical moments
// (a player mashing the same choice) return the last result instead of re-billing.
export const AI_CACHE_MAX = 200;
export const AI_CACHE_TTL_MS = {
  dialogue: 2 * 60_000, narration: 2 * 60_000, thoughts: 10 * 60_000,
  quests: 60 * 60_000, arcs: 60 * 60_000, backstories: 24 * 60 * 60_000,
  memory: 10 * 60_000, improve: 60 * 60_000,
} as const;
export const AI_CACHE_TTL_DEFAULT = 5 * 60_000;

// Rate discipline (VISION cost-pitfalls): per-key session cap + global per-minute
// cap. "Key" is an npcId for NPC features, or the feature name otherwise.
export const AI_RATE_KEY_PER_SESSION = 12;   // calls per npc/feature this session
export const AI_RATE_GLOBAL_PER_MIN = 20;    // calls/min across everything

// Validation caps (schema.ts). Prose is capped; actions REJECT oversized text.
export const AI_ACTION_TEXT_MAX = 280;       // say/sell/haggle/quest/gossip/teach line
export const AI_NOTE_MAX = 200;              // memory_update note
export const AI_QUEST_TITLE_MAX = 80;
export const AI_PROSE_MAX = 400;             // default validateText() cap
export const AI_REWARD_COINS_MAX = 500;      // offer_quest reward bound
export const AI_PRICE_MAX = 999;             // sell price / haggle counter-offer bound
export const AI_ID_MAX = 48;                 // itemId/questId/skillId/aboutNpcId length

// ===========================================================================
//  Guidance Mode engine (Part A #5) — Tutorial / Aspiration / None. Tutorial
//  freezes the in-game clock while a step bubble is up (DECISIONS). All content
//  (step wording, aspiration chains) lives in data/guidance.ts; the knobs here.
// ===========================================================================
export const TUTORIAL_MOVE_SECONDS = 3;   // real seconds of walking that clears the "get your bearings" step

// ===========================================================================
//  End-of-day summary engine (Part A #7) — DECISIONS: "End-of-day summary:
//  player setting — none/quick/full-with-achievements".
// ===========================================================================
export const EOD_QUICK_SHOW_SECONDS = 5;   // how long the "quick" pill stays up before fading

// ===========================================================================
//  Festival engine (Part A #6) — v1: one festival (Harvest, autumn). Framework
//  supports adding more later (data/festivals.ts). See systems/festival.ts.
// ===========================================================================
export const FESTIVAL_START_HOUR = 9;    // festival is "on" 09:00-21:00 the day it falls
export const FESTIVAL_END_HOUR = 21;

// ===========================================================================
//  Seasonal wildlife (ambient, non-interactive-except-fleeing) — ROADMAP's
//  "Wild animals along the road/river" block. WHEN/WHERE each species can
//  appear (season/region/weather) is data, living in data/wildlife.ts; the
//  numeric knobs below (population, speed, flee/despawn feel) live here.
// ===========================================================================
export const WILDLIFE_MAX_COUNT = { butterfly: 6, songbird: 4, rabbit: 4, deer: 3, duck: 4, hare: 4 } as const;
export const WILDLIFE_SPEED     = { butterfly: 34, songbird: 26, rabbit: 46, deer: 50, duck: 22, hare: 48 } as const;
export const WILDLIFE_RAIN_BIRD_MULT = 0.4;   // "fewer birds" in rain — scales songbird/duck caps down
export const WILDLIFE_SPAWN_CHANCE = 0.05;    // odds/second an empty slot tries to (re)populate — gradual, not a burst
export const WILDLIFE_FLEE_RADIUS = 85;       // px: player distance that triggers flee/fly-off (rabbit/hare/deer/songbird)
export const WILDLIFE_DESPAWN_RANGE = 240;    // px fled from its spawn point before a fleeing critter vanishes
export const WILDLIFE_FLEE_SPEED_MULT = 2.4;  // fleeing speed = the species' base speed * this
export const WILDLIFE_WANDER_RADIUS = 60;     // px: how far ambient wander picks a new target from home
export const WILDLIFE_DESPAWN_SECONDS = 0.5;  // fly-off/fade-out duration before removal

// ===========================================================================
//  PixelLab sprite integration (dual-path) — the heroine player + static
//  building/interior sprites (src/assets/pixellab/). CLAUDE.md hard rule #1:
//  every sprite-backed visual keeps its code-drawn painter as a runtime
//  fallback (PNG when present+loaded, painter otherwise), so the game runs
//  fully with zero sprite files. These knobs tune the sprite path when active.
//  See docs/PIXELLAB_ASSETS.md.
// ===========================================================================
// --- Character render mode (LOCKED 2026-07-10 by the product owner). All
//     characters (player + the 10 NPCs) render through the upgraded code rig
//     (art/rig.ts): 3-tone shading, expressive face, volumetric hair, cloth
//     detail, all four facings + walk. The PixelLab CHARACTER sprites (heroine
//     + NPC sheets) are kept as an OFF-by-default dual-path FALLBACK — nothing
//     deleted, the game still boots with zero PNGs. Rationale: PixelLab can't
//     decompose a character into recolourable/poseable parts, so the rig (which
//     wears the player's exact chosen colours + every outfit silhouette) is the
//     truer "her character, her design" path. The ENVIRONMENT stays sprites.
//     Flip this to `true` to restore sprite-primary character rendering (the
//     sheets + both draw bridges are intact); the runtime dev toggles
//     __wh.spriteMode / __wh.npcSpriteMode still flip it live per-session. ---
//     R1 UPDATE (2026-07-11, product-owner's top ask): flipped to `true`. This
//     now selects the CURATED MATRIX player look (art/spriteChar.ts): the player
//     picks gender × hairstyle(5) × outfit(5) + hair shade(3), rendered from the
//     50-combo generated matrix (src/assets/pixellab/characters/matrix/). It
//     resolves the owner's three complaints (profile nose / male=female / hair-
//     over-body) by construction. The code rig stays the automatic zero-PNG
//     fallback (missing/undecoded sheet → rig for that frame), so boot with zero
//     PNGs still works. Setting also re-enables the NPC sprite sheets (spriteNpc
//     reads this same flag) so ALL characters are sprites again. Flip to `false`
//     to return to the all-rig look; __wh.spriteMode / __wh.npcSpriteMode still
//     flip either live per-session for A/B. ---
export const CHARACTER_SPRITES_PRIMARY = true;
// --- Curated matrix player sprite (art/spriteChar.ts). Cells are 68×68 with a
//     ~53px character (feet ~row 60); this scale renders her at ~43px apparent
//     height = the code rig's hat-top-to-boot, so she stands at NPC/rig scale.
//     Retune here if she reads too big/small next to an NPC. ---
export const SPRITE_MATRIX_SCALE = 0.82;      // world px per sprite px
// Skin-tone recolour is OFF (shipped "coming soon" in the creator). The runtime
// H&S recolour preserves each pixel's LIGHTNESS by design, so it can only shift
// skin hue/saturation — it cannot actually darken a light-peach base into a
// deeper tone (verified R1). Hair recolour (keyed vivid purple → 3 naturals) is
// unaffected and ships. Flip true only if a lightness-aware skin remap lands.
export const SPRITE_MATRIX_SKIN = false;
// --- Player heroine sprite (art/spriteChar.ts). The generated sheet is 84x84
//     with the character ~42-44px tall — the SAME apparent height as the code
//     rig (hat-top to boot ≈ 43px), so native 1:1 world pixels (scale 1) plant
//     her feet on the rig's exact ground line. ---
export const SPRITE_PLAYER_SCALE = 1.0;       // world px per sprite px (1 = native 1:1, matches the rig's height)
// The 4 alternate hairstyle sheets (bun/short/ponytail/cropped) are 92px cells
// (vs the hat sheet's 84px), with a ~46px character; this scale renders them at
// ~42px = the hat heroine's apparent height (84/92 ≈ 0.913). Retune here if a
// hatless heroine reads too big/small next to the established hat sprite.
export const SPRITE_HAIRSTYLE_SCALE = 0.91;
export const SPRITE_PLAYER_FOOT_DY = 15;      // world y below player.y where the sprite's foot row plants (rig boots ≈ y+15.8)
export const SPRITE_WALK_STRIDE = 7;          // px of travel per walk frame (6-frame loop ≈ 42px; keyed to player.dist like the rig)
export const SPRITE_IDLE_FPS = 4;             // breathing idle cadence (4-frame loop = 1s)
export const SPRITE_FACING_HYSTERESIS = 0.14; // rad past a sector edge before the 8-dir facing flips (kills near-diagonal flicker)
// --- NPC sprites (art/spriteNpc.ts). Each NPC has its OWN packed sheet
//     (characters/<id>.sheet.png, cell 72-92px per generation). The per-NPC
//     scale below calibrates each sprite's character height to the heroine's
//     (~45px on-screen = "player height"): adults ≈ 1× player, the two elders
//     (henrik/ada) a touch shorter, Finn (kid) clearly smaller. These were
//     computed from each sheet's measured silhouette height (packsheets.mjs
//     anchors) — retune here, not in the bridge. SPRITE_NPC_SCALE is a global
//     multiplier for quick A/B. Foot/shadow use the NPC's rig.scale so the
//     sprite plants exactly where the rig fallback would (no pop on fallback). ---
export const SPRITE_NPC_SCALE = 1.0;          // global multiplier over the per-NPC scales
export const SPRITE_NPC_FOOT_DY = 14;         // world y (× rig.scale) below npc.y where the sprite foot row plants (matches rig footY)
export const SPRITE_NPC_WALK_STRIDE = 7;      // px of travel per walk frame (6-frame loop ≈ 42px; keyed to npc.dist)
export const SPRITE_NPC_SCALES: Record<string, number> = {
  maren: 0.94, tobin: 0.94, sera: 0.98, henrik: 0.91, petra: 0.92,
  liora: 1.12, bram: 0.98, ada: 0.95, finn: 0.97, jonas: 0.98,
};
// --- Static building/interior sprites (art/buildings.ts, art/interior.ts).
//     Scale is world px per sprite px; each sprite is aligned base-on-ground,
//     centred on its zone rect. The 192x176 / 208x176 / 64x80 sheets were sized
//     to the HOUSE / BARN / R_HEARTH rects, so ~1.0 fits with a little roof
//     overhang (as the painter already overhangs today). ---
export const SPRITE_HOUSE_SCALE = 1.0;
export const SPRITE_BARN_SCALE = 1.0;
export const SPRITE_HEARTH_SCALE = 1.0;
// --- Wave 2: interior room backdrop, furniture, market stalls + well. Same
//     "measure the alpha bbox, scale footprint ≈ zone rect" recipe; the room
//     backdrop is a full-bleed background (not a footprint sprite), so it's
//     placed by offset only (SPRITE_ROOM_SCALE stays 1.0 — see art/interior.ts). ---
export const SPRITE_ROOM_SCALE = 1.0;
export const SPRITE_BASIN_SCALE = 0.92;
export const SPRITE_CHAIR_CRATE_SCALE = 1.12;
export const SPRITE_BED_SCALE = 1.21;
export const SPRITE_STALL_SCALE = 0.77;
export const SPRITE_WELL_SCALE = 1.05;
// --- "Everything-pixels" audit batch: code-drawn holdouts the owner caught on
//     sight get PixelLab sprites (dual-path over the existing painters). Each
//     scale maps the downloaded PNG onto its zone rect: outhouse 64x96 -> the
//     ~35x54 OUTHOUSE rect; hedge segment 64x48 -> the ~1.4-tile-wide HEDGES
//     band, tiled down each strip. ---
export const SPRITE_OUTHOUSE_SCALE = 0.56;
export const SPRITE_HEDGE_SCALE = 0.7;
// Town buildings: inn art is sized to its 6-tile-wide (192px) rect -> scale 1.0
// (roof/upper storey overhang above, same recipe as the house/barn); stable art
// (160px) maps onto its ~3.8-tile (122px) rect.
export const SPRITE_INN_SCALE = 1.0;
export const SPRITE_STABLE_SCALE = 0.76;
// Props: busk signpost (48x64 art onto the small post+board), base-on-ground.
// The dock is a top-down flat deck drawn stretched to fill its DOCK/TOWN_DOCK
// rect (posts baked in at the south end), so it needs no scale knob.
export const SPRITE_BUSK_SIGN_SCALE = 0.5;
// Flower-bed soil FIXTURE (64×48 empty round wooden bed) drawn CENTERED on the
// bed point; the per-species seedlings/blooms still layer on top in code, so
// this replaces only the code-drawn soil oval (~30px wide → scale 0.5).
export const SPRITE_FLOWER_BED_SCALE = 0.5;
// Festival decorations: the harvest cluster (64px art onto its ~33px footprint)
// and the lantern pole (48×64; the warm flicker GLOW stays code-drawn over the
// unlit paper-lantern sprite). Festival-only, base-on-ground.
export const SPRITE_HARVEST_CLUSTER_SCALE = 0.5;
export const SPRITE_FESTIVAL_LANTERN_SCALE = 0.62;
// --- Building variety batch: 6 distinct market cottages (art/buildings.ts
//     COTTAGE_SPRITES), one scale for every variant (all cottage canvases are
//     the same 112x128 size, same "footprint <= zone rect" recipe as above;
//     each variant's own cx/foot anchor is what actually differs per art). ---
export const SPRITE_COTTAGE_SCALE = 0.8;
// --- Farm-animal sprites (art/spriteAnimal.ts). Each livestock species has its
//     OWN packed sheet (animals/<kind>.sheet.png, scripts/packsheets.mjs).
//     Quadrupeds (cow/pig/sheep) carry a full walk cycle (frame count read off
//     the sheet's own `anims` entry at runtime, not hardcoded — the cow's
//     happens to be 7 frames where pig/sheep are 6); birds (hen/duck) are
//     ROTATIONS ONLY (no skeleton/walk animation) — a small code-driven
//     waddle (bob + tilt) stands in for a walk cycle so a moving hen/duck
//     doesn't visually freeze. Per-species scale + ground-plane offset were
//     computed from each sheet's measured silhouette height (packsheets.mjs's
//     logged `silhouette=`) so the sprite's apparent height AND foot/shadow
//     line match the code rig's own geometry (art/animalRig.ts's COW_RIG/
//     PIG_RIG/SHEEP_RIG/HEN_RIG/DUCK_RIG presets, at each preset's existing
//     `scale`) — so toggling the dev A/B fallback never pops. ---
export const SPRITE_ANIMAL_WALK_STRIDE = 9;   // px of travel per walk frame (quadrupeds)
export const SPRITE_ANIMAL_SCALES: Record<"cow" | "pig" | "sheep" | "hen" | "duck", number> = {
  cow: 0.57, pig: 0.39, sheep: 0.50, hen: 0.62, duck: 0.47,
};
// Ground-plane geometry per species: `dy` is world px below the entity's x/y
// where feet plant AND the under-shadow ellipse centres (both the sprite path
// and the rig agree here); `rx`/`ry` are the shadow ellipse radii — all three
// mirror art/animalRig.ts's own drawQuadruped/drawBird shadow() call for that
// species' preset (the same "duplicate the rig's shadow numbers as plain
// constants" approach art/spriteNpc.ts uses for the humanoid rig).
export const SPRITE_ANIMAL_GROUND: Record<"cow" | "pig" | "sheep" | "hen" | "duck", { dy: number; rx: number; ry: number }> = {
  cow:   { dy: 15.0, rx: 18.9,  ry: 4.5 },
  pig:   { dy: 9.9,  rx: 13.39, ry: 3.63 },
  sheep: { dy: 11.7, rx: 15.12, ry: 4.05 },
  hen:   { dy: 9.35, rx: 7.0,   ry: 2.8 },
  duck:  { dy: 7.14, rx: 5.2,   ry: 2.08 },
};
export const SPRITE_BIRD_WADDLE_AMP = 1;      // px of the waddle bob, +/-
export const SPRITE_BIRD_WADDLE_TILT = 0.08;  // radians of waddle tilt, +/-
export const SPRITE_BIRD_WADDLE_STRIDE = 10;  // px of travel per waddle cycle

// --- Tree sprites (art/props.ts drawTree dual-path). The 128x160 tree PNGs
//     (trees/<species>-<season>) have their trunk base near the bottom-centre;
//     TREE_SPRITE_SCALE is world-px per sprite-px, tuned so the on-screen tree
//     is about the code painter's size (canopy content ~145 sprite-px tall ->
//     ~80 screen-px). Per-tree flip/scale jitter (deterministic from position)
//     multiplies this so a forest never looks like stamped clones. The trunk
//     base stays planted on the tree's (x,y) depth/collision anchor through the
//     jitter. TREE_SPRITE_JITTER bounds the per-tree uniform-scale spread. ---
export const SPRITE_TREE_SCALE = 0.55;        // world px per sprite px
export const SPRITE_TREE_JITTER = 0.12;       // +/- uniform-scale variation (0.88..1.12)

// --- Crop sprites (52-sprite-px plants on 32-px tiles). The PLANT is a sprite
//     when present, drawn OVER the always-code-drawn tilled tile; its measured
//     alpha-bbox base pixel is planted at (tile-centre-x, tile-centre-y +
//     SPRITE_CROP_BASE_DY) so the soil clod sits low on the tilled soil. SCALE
//     is world-px per sprite-px, tuned so the tallest ripe plant (~46 sprite-px
//     of content) reads at ~30 screen-px, about the tile size. ---
export const SPRITE_CROP_SCALE = 0.66;        // world px per sprite px
export const SPRITE_CROP_BASE_DY = 8;         // plant base offset below tile centre

// --- Foliage bush sprites (art/props.ts drawBush dual-path). The 64x56 bush
//     PNGs (foliage/bush, -pink, -white, berry-bush) sit base-on-ground on the
//     bush's (x,y). SCALE is world-px per sprite-px (0.5 -> ~32x28 on-screen,
//     about the code bush's size); per-position flip + uniform-scale jitter
//     (deterministic from position) keeps a hedgerow from reading as clones. A
//     full (unpicked) bush draws its seeded colour variant; a picked one drops
//     to the plain green bush so the "nothing to forage" state stays legible. ---
export const SPRITE_BUSH_SCALE = 0.5;         // world px per sprite px
export const SPRITE_BUSH_JITTER = 0.12;       // +/- uniform-scale variation

// --- World props (art/props.ts drawProp + drawFence dual-path). Props are
//     anchored base-on-ground (measured alpha-bbox) on their (x,y); SCALE is
//     the default world-px per sprite-px (per-prop overrides live in the
//     WORLD_PROPS table). Fence tiles the 96x48 fence PNG along the field
//     perimeter when present + intact, else the code rail painter. ---
export const SPRITE_PROP_SCALE = 0.46;        // default world px per sprite px for props
export const SPRITE_FENCE_SCALE = 0.5;        // fence segment scale (96x48 -> ~48x24 tiled)

// --- Ambient foliage scatter (art/scatter.ts). A deterministic, position-
//     seeded sprinkle of small foliage sprites across appropriate zones (grass
//     tufts, the odd wildflower/fern, forest mushrooms/moss, shore reeds + lake
//     lily-pads), OFF paths / tilled soil / building footprints / the dock /
//     interaction spots. DENSITY is the per-grid-cell spawn probability (raise
//     for lusher, lower for sparser); GRID is the sampling step in px. Every
//     scatter item is NON-colliding + depth-sorted; a missing sprite simply
//     doesn't draw (zero-PNG fallback). ---
export const FOLIAGE_SCATTER_DENSITY = 0.20;  // per-cell spawn probability (moderate, not jungle)
export const FOLIAGE_SCATTER_GRID = 44;       // px grid step for scatter sampling
export const SPRITE_SCATTER_SCALE = 0.5;      // default world px per sprite px for scatter
export const SPRITE_SCATTER_JITTER = 0.18;    // +/- uniform-scale variation per scatter item

export const SAVE_KEY = "wildhearth-save-v1";
export const SKILLS_KEY = "wildhearth-skills-v1";
export const SETTINGS_KEY = "wildhearth-settings-v1";
export const RENOVATION_KEY = "wildhearth-farm-v1";  // per-part farm repair state (Step 8)
export const META_KEY = "wildhearth-meta-v1";        // playthrough origin: starter choice (Step 9)
export const CALENDAR_KEY = "wildhearth-calendar-v1"; // season/day/hour (World Context Block 3)
export const WEATHER_KEY = "wildhearth-weather-v1";  // daily weather (World Context Block 4)
export const WORLD_FLAGS_KEY = "wildhearth-flags-v1"; // expiring event flags (World Context Block 5)
export const LIVESTOCK_KEY = "wildhearth-livestock-v1"; // owned animals (no-free-animals fix)
export const PLOTS_KEY = "wildhearth-plots-v1";      // field state incl. crops/watering (crop-variety block)
export const GARDEN_KEY = "wildhearth-garden-v1";    // ornamental flower beds (base-skill-set block)
export const STORAGE_KEY = "wildhearth-storage-v1";  // barn storage chest (R5 — the barn's first real use)
export const PRODUCE_KEY = "wildhearth-produce-v1";  // animal-produce state: fed-today flags + overnight pending/delivered (barn collection loop)
export const COLLECTIONS_KEY = "wildhearth-collections-v1"; // Memory Book: discoveries
export const MEMORIES_KEY = "wildhearth-memories-v1";       // Memory Book: life events
export const NEEDS_KEY = "wildhearth-needs-v1";             // 7 needs (hunger/thirst/energy/hygiene/bathroom/mood/social)
export const RELATIONSHIPS_KEY = "wildhearth-relationships-v1"; // per-NPC Friendship/Romance (Relationship engine)
export const SLOT_KEY = "wildhearth-slot-v1";        // save-slot manifest (Save system, Part A #11)
export const GUIDANCE_KEY = "wildhearth-guidance-v1"; // tutorial/aspiration progress (Guidance Mode engine)
export const QUESTS_KEY = "wildhearth-quests-v1";    // quest log: accepted/active/completed + AI offer (R6 quest system)
export const CUSTOMERS_KEY = "wildhearth-customers-v1"; // daily customer ledger (v2: customers come to your stall)
export const REPUTATION_KEY = "wildhearth-reputation-v1"; // town-wide Fame 0-100 (v2 block #2)
export const DISCOVERY_KEY = "wildhearth-discovery-v1"; // fast-travel nodes reached on foot (v2 block #4)
export const TRANSPORT_KEY = "wildhearth-transport-v1"; // owned transport: rowboat/horse/carriage (v2 block #5)
export const TEACHING_KEY = "wildhearth-teaching-v1"; // paid lessons taken per teacher NPC (v2 block #6 slice 3)

// ===========================================================================
//  Quest system (R6) — authored quests + AI dynamic offers → one quest log.
//  Content (quest defs) lives in data/quests.ts; the engine in systems/
//  quests.ts. These are the tuning knobs.
// ===========================================================================
export const QUEST_AI_OFFER_MIN_INTERVAL_DAYS = 2; // at most one AI-generated offer attempt per this many in-game days
export const QUEST_AI_REWARD_CLAMP = 0.5;          // AI-proposed reward is clamped to template.reward × [1-this, 1+this]

// ===========================================================================
//  Window system (UO-classic windows) — src/ui/windows/*. Everything on screen
//  is a draggable/resizable/minimizable/closable window on a desktop surface;
//  the game viewport itself is one. Every magnitude below is a tuning knob.
// ===========================================================================
export const WIN_SNAP_DIST = 12;        // px within a desktop/other-window edge that a drag snaps (hold Alt to bypass)
export const WIN_TITLEBAR_H = 26;       // px title-bar height (chrome)
export const WIN_RESIZE_HANDLE = 6;     // px invisible edge/corner grab band
export const WIN_MIN_VISIBLE = 52;      // px of a window's title bar that must stay on-screen (keep-on-screen rescue)
export const WIN_MIN_W = 200;           // default min content width for resizable windows
export const WIN_MIN_H = 120;           // default min content height for resizable windows
export const WIN_VIEWPORT_MIN_W = 360;  // the game viewport can't shrink below this (content px)
export const WIN_VIEWPORT_MIN_H = 260;
export const WIN_VIEWPORT_FILL = 0.88;  // "Classic" default: viewport fills ~88% of the desktop, centred
export const WIN_COZY_FILL = 0.72;      // "Cozy" preset: a smaller viewport with room to tile HUD windows around it
export const WIN_DOCK_STRIP_W = 156;    // width of a minimized title-strip in the bottom dock row
export const WIN_LAYOUT_KEY = "wildhearth-layout-v1"; // per-window rect/state + dock orientation (a preference, NOT game state)
export const WIN_LAYOUT_SAVE_DEBOUNCE_MS = 400;       // debounce before a layout change is written to disk
// "Scale panels" (Windows migration I) — the legacy makePanel convention of one
// CSS `--s` custom property driving every internal size (backpack/skills/memory
// book/shop/gift). createScaleWindow() (src/ui/windows/scalewindow.ts) maps a
// window resize to a uniform scale within this range, matching the old
// corner-grip's default bounds.
export const WIN_PANEL_SCALE_MIN = 0.6;
export const WIN_PANEL_SCALE_MAX = 2.5;

// ===========================================================================
//  Visual foundation (Part B, v1-foundation branch) — day/night, weather fx,
//  parallax skyline, ambient particles, cast shadows. Every magnitude here is
//  a knob; art/*.ts only ever receives plain numbers (hour/minute/season/
//  weather already resolved by main.ts) so the art layer never imports
//  systems/calendar.ts or systems/weather.ts directly.
// ===========================================================================

// ---- Day/night tint (commit 1, item 9) — continuous color grade, keyed to
// hour+minute (not the 4 stepped phases), blended across named keyframes.
export const DAYNIGHT_NIGHT_COLOR = [8, 14, 42] as const;     // deep blue, dark enough to actually darken
export const DAYNIGHT_NIGHT_ALPHA = 0.4;                      // ~35-40% darkening (DECISIONS aesthetic)
export const DAYNIGHT_DAWN_COLOR = [255, 178, 120] as const;  // warm peach lift
export const DAYNIGHT_DAWN_ALPHA = 0.16;
export const DAYNIGHT_DUSK_COLOR = [225, 130, 55] as const;   // amber
export const DAYNIGHT_DUSK_ALPHA = 0.20;
export const DAYNIGHT_INTERIOR_MULT = 0.45;                   // interiors get a milder version

// ---- Weather visual layer (commit 1, item 8) — rain/storm/fog. "cloudy" is
// named in DECISIONS' full weather list but WeatherKind (systems/weather.ts)
// doesn't have it yet (Part A #8 scope, not this batch) — see WORKLOG.
export const WEATHER_RAIN_COUNT = 120;              // screen-space pooled droplets
export const WEATHER_STORM_COUNT = 200;             // heavier rain in a storm
export const WEATHER_RAIN_FALL_SPEED = [0.55, 0.85] as const;  // screen-heights/sec
export const WEATHER_STORM_FALL_SPEED = [0.95, 1.35] as const;
export const WEATHER_RAIN_SLANT = 0.10;             // screen-widths/sec sideways wind-drift
export const WEATHER_STORM_SLANT = 0.30;            // storm wind bends streaks harder
export const WEATHER_RAIN_STREAK_LEN = 0.017;       // fraction of screen height per streak
export const WEATHER_STORM_STREAK_LEN = 0.028;
export const WEATHER_FOG_BANKS = 3;                 // drifting soft ellipses
export const WEATHER_FOG_SPEED = 0.014;             // screen-widths/sec drift
export const WEATHER_FOG_ALPHA = 0.16;
export const WEATHER_FOG_RADIUS = 0.42;             // fraction of screen width
export const WEATHER_LIGHTNING_CHANCE_PER_SEC = 0.045; // storm-only, occasional
export const WEATHER_LIGHTNING_FLASH_UP = 0.04;     // seconds to full white
export const WEATHER_LIGHTNING_FLASH_DOWN = 0.16;   // seconds fading back
export const WEATHER_LIGHTNING_DARK_BEAT = 0.32;    // a beat of extra darkness right after
export const WEATHER_LIGHTNING_DARK_ALPHA = 0.22;
export const WEATHER_TINT_ALPHA = { clear: 0, rain: 0.07, storm: 0.16, fog: 0.14 } as const; // ground-tone shift

// ---- Parallax background band (commit 2, item 7)
export const CAM_NORTH_SKY_MARGIN = 260;   // px of sky the camera may reveal beyond the world's north edge
export const PARALLAX_FACTOR = 0.3;        // background band scroll speed vs. the camera (< 1 = distant)

// ---- Ambient particle system (commit 2, item 10) — one pooled system,
// allocation-free per frame; drift emitters keyed to season/time, plus a
// `burst(kind,x,y)` API any painter/system can trigger for feedback sparkle.
export const PARTICLE_POOL_MAX = 160;          // total pool size (ambient + bursts share it)
export const PARTICLE_AMBIENT_MAX = 22;        // sparse cap for the active seasonal drift kind
export const PARTICLE_FIREFLY_MAX = 10;        // summer dusk/night only
export const PARTICLE_BURST_COUNTS = { splash: 8, leafpuff: 7, glint: 6, steam: 3 } as const;
export const PARTICLE_VIEWPORT_PAD = 40;       // px beyond the viewport edge before a drift particle recycles

// ---- Diagonal cast shadows (commit 3, item 3) — distinct from the under-
// entity ellipse (shapes.ts's `shadow()`); a skewed dark shape thrown toward
// the lower-right (fixed upper-left sun). Length/alpha read the same
// continuous clock as the day/night tint (main.ts computes it, art/ never
// imports the calendar).
export const CAST_SHADOW_ALPHA = 0.16;         // base alpha (spec: ~12-18%)
export const CAST_SHADOW_SKEW_X = 0.62;        // horizontal throw per unit of "rise" (object height)
export const CAST_SHADOW_SKEW_Y = 0.30;        // vertical throw per unit of "rise"
export const CAST_SHADOW_LEN_NOON = 0.55;      // shortest — solar noon
export const CAST_SHADOW_LEN_EDGE = 1.6;       // longest — dawn/dusk (low sun)
export const CAST_SHADOW_LEN_NIGHT = 0.3;      // moot — alpha fades to ~0 anyway
export const CAST_SHADOW_ALPHA_NIGHT = 0.05;   // near-invisible at night
export const CAST_SHADOW_ALPHA_DAY = 0.9;      // full strength by day (× CAST_SHADOW_ALPHA)

// ---- Title-screen vista (art/vista.ts) — the PIXEL-ART dawn scene ----
// Primary path draws the PixelLab landscape (ui/title-vista.png) scaled-to-
// cover with nearest-neighbour; the fallback rebuilds the scene in code into a
// low-resolution buffer, then upscales nearest-neighbour so every pixel is
// chunky. VISTA_PIXEL is roughly how many screen px one art-pixel spans in the
// code fallback (bigger = chunkier); the buffer width is clamped to stay both
// chunky and cheap.
export const VISTA_PIXEL = 5;                  // fallback: target art-pixel size in screen px
export const VISTA_BUF_MIN = 220;              // clamp: min low-res buffer width (px)
export const VISTA_BUF_MAX = 460;              // clamp: max low-res buffer width (px)
export const VISTA_LOGO_PIXEL = 3;             // logo wordmark: render at 1/this then upscale nearest-neighbour
