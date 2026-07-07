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
// First sale to an NPC-specialty stall (fish-buyer, and future produce/etc.
// stalls) — a small, contact-marking Friendship bump via dialogueBump(), same
// mechanism a warm dialogue choice uses (see DIALOGUE_FRIENDSHIP_BUMP above).
export const NPC_SALE_FRIENDSHIP_BUMP = 3;

// ===========================================================================
//  Dialogue engine (Part A #4, mechanical layer) — condition-keyed opening
//  lines + shallow choice trees, shown in the bottom-box. Every magnitude a knob.
// ===========================================================================
export const DIALOGUE_MAX_CHOICES = 3;       // choices shown per turn (DECISIONS: 2-3)
export const DIALOGUE_FRIENDSHIP_BUMP = 2;   // a warm choice nudges Friendship by this (small)
export const DIALOGUE_TOPIC_FLAG_DAYS = 3;   // how long a "we talked about X" topic flag stays fresh

export const CLICK_ARRIVE = 5;          // px: close enough to a click-to-move target
export const DRAG_THRESHOLD = 10;       // px of travel before a press is a joystick drag, not a tap

export const CAM_ZOOM_MIN = 1.4;        // camera zoom (CSS px per world px) bounds
export const CAM_ZOOM_MAX = 2.2;
export const CAM_ZOOM_REF_W = 900;      // window width where zoom starts growing past min
export const CAM_USER_ZOOM_MIN = 0.6;   // player zoom factor bounds (wheel / +− buttons)...
export const CAM_USER_ZOOM_MAX = 2.4;
export const CAM_USER_ZOOM_STEP = 0.15; // ...changed by this much per wheel notch / button press

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
export const SLOT_KEY = "wildhearth-slot-v1";        // save-slot manifest (Save system, Part A #11)
export const GUIDANCE_KEY = "wildhearth-guidance-v1"; // tutorial/aspiration progress (Guidance Mode engine)

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
export const PARTICLE_BURST_COUNTS = { splash: 8, leafpuff: 7, glint: 6 } as const;
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
