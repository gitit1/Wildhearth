/** Global tuning knobs. Change values here, not inside systems. */
export const T = 32;                    // tile size in px
// World expansion v1: the farm is the west corner of a much larger open scene
// (farm -> road -> market -> forest -> river/lake). 108x30 tiles = 3456x960 px
// — ~4x the old 34x24 area, still one canvas (both sides well under 4096).
export const MW = 108, MH = 30;         // map size in tiles
export const WORLD_W = MW * T, WORLD_H = MH * T;
export const ROAD_W = 2.4;              // dirt road width in tiles

export const PLAYER_SPEED = 150;        // px/sec

export const STARTING_COINS = 50;       // a new life's purse (VISION price anchor table)
export const COW_SPEED = 22, HEN_SPEED = 30;

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
export const FLOWER_SEEDS_PRICE = 3;    // shop: a packet of mixed flower seeds
export const FLOWER_GROW_DAYS = 0.5;    // in-game days for a flower bed to bloom
export const FEED_GAIN_ITEM = "corn";   // what feeding an animal consumes (a crop of your own)
export const FARMING_GROW_REDUCTION = 0.4; // grow-time fraction removed at Farming 100
// (per-crop grow times & prices now live in data/crops.ts)

export const SKILL_GAIN_BASE = 0.3;     // points gained on a successful gain-roll
export const GAIN_GUARD_FAILS = 4;      // consecutive failed rolls before the next is forced (UO-style pity)
export const SKILL_CAP = 250;           // total skill budget (placeholder for MVP's 5 skills)
export const STARTER_SKILL_SEED = 10;   // starting value of the skill matching the starter tool

export const INVENTORY_SLOTS = 12;      // backpack size (upgradeable post-MVP)
export const MINIMAP_SCALE = 0.11;      // minimap px per world px (scaled up for the wider v1 world)

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

export const CLICK_ARRIVE = 5;          // px: close enough to a click-to-move target
export const DRAG_THRESHOLD = 10;       // px of travel before a press is a joystick drag, not a tap

export const CAM_ZOOM_MIN = 1.4;        // camera zoom (CSS px per world px) bounds
export const CAM_ZOOM_MAX = 2.2;
export const CAM_ZOOM_REF_W = 900;      // window width where zoom starts growing past min
export const CAM_USER_ZOOM_MIN = 0.6;   // player zoom factor bounds (wheel / +− buttons)...
export const CAM_USER_ZOOM_MAX = 2.4;
export const CAM_USER_ZOOM_STEP = 0.15; // ...changed by this much per wheel notch / button press

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
export const COLLECTIONS_KEY = "wildhearth-collections-v1"; // Memory Book: discoveries
export const MEMORIES_KEY = "wildhearth-memories-v1";       // Memory Book: life events
export const NEEDS_KEY = "wildhearth-needs-v1";             // 7 needs (hunger/thirst/energy/hygiene/bathroom/mood/social)
export const RELATIONSHIPS_KEY = "wildhearth-relationships-v1"; // per-NPC Friendship/Romance (Relationship engine)
export const UI_KEY = "wildhearth-ui-v2";    // panel positions/sizes (not game state; v2: sidebar layout)
