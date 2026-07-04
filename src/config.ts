/** Global tuning knobs. Change values here, not inside systems. */
export const T = 32;                    // tile size in px
export const MW = 34, MH = 24;          // map size in tiles
export const WORLD_W = MW * T, WORLD_H = MH * T;

export const PLAYER_SPEED = 150;        // px/sec
export const COW_SPEED = 22, HEN_SPEED = 30;

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
export const MINIMAP_SCALE = 0.14;      // minimap px per world px

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
export const UI_KEY = "wildhearth-ui-v2";    // panel positions/sizes (not game state; v2: sidebar layout)
