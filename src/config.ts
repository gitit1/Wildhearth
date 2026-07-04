/** Global tuning knobs. Change values here, not inside systems. */
export const T = 32;                    // tile size in px
export const MW = 34, MH = 24;          // map size in tiles
export const WORLD_W = MW * T, WORLD_H = MH * T;

export const PLAYER_SPEED = 150;        // px/sec
export const COW_SPEED = 22, HEN_SPEED = 30;

export const FISH_PRICE = 3;            // coins per fish at the stall
export const FISH_TIME_MIN = 1.2;       // seconds until a bite
export const FISH_TIME_MAX = 3.0;
export const FISHING_BITE_REDUCTION = 0.5; // bite-time fraction removed at Fishing 100

export const BERRY_PRICE = 2;           // coins per berry at the stall
export const FORAGE_TIME = 1.2;         // seconds to pick a bush
export const BUSH_RESPAWN = 25;         // seconds until a picked bush regrows
export const FORAGE_BASE_YIELD = 1;     // berries per pick (Foraging skill adds a bonus chance)

export const HOE_PRICE = 12;            // shop: first tool (unlocks farming, Step 5)
export const SEEDS_PRICE = 3;           // shop: one packet of seeds

export const BUSK_TIME = 3;             // seconds per street performance
export const BUSK_TIP_MIN = 1;          // tip roll: BUSK_TIP_MIN..BUSK_TIP_BASE_MAX at skill 0
export const BUSK_TIP_BASE_MAX = 3;
export const BUSK_TIP_SKILL_BONUS = 5;  // extra random tip range unlocked at Busking 100
export const HAGGLE_MAX_DISCOUNT = 0.25; // shop discount at Haggling 100

export const REPAIR_COST = { roof: 25, window: 15, barn: 30, fence: 10 } as const; // farm renovation, Step 8

export const CORN_PRICE = 5;            // coins per harvested corn at the stall
export const TILL_TIME = 1.0;           // seconds to till a plot tile
export const PLANT_TIME = 0.7;          // seconds to plant seeds
export const HARVEST_TIME = 0.8;        // seconds to harvest
export const CROP_GROW_TIME = 30;       // seconds from planting to ready (at Farming 0)
export const FARMING_GROW_REDUCTION = 0.4; // grow-time fraction removed at Farming 100

export const SKILL_GAIN_BASE = 0.3;     // gain per use at skill 0, shrinking toward 100
export const SKILL_CAP = 250;           // total skill budget (placeholder for MVP's 5 skills)
export const STARTER_SKILL_SEED = 10;   // starting value of the skill matching the starter tool

export const INVENTORY_SLOTS = 12;      // backpack size (upgradeable post-MVP)
export const MINIMAP_SCALE = 0.14;      // minimap px per world px

export const CLICK_ARRIVE = 5;          // px: close enough to a click-to-move target
export const DRAG_THRESHOLD = 10;       // px of travel before a press is a joystick drag, not a tap

export const CAM_ZOOM_MIN = 1.4;        // camera zoom (CSS px per world px) bounds
export const CAM_ZOOM_MAX = 2.2;
export const CAM_ZOOM_REF_W = 900;      // window width where zoom starts growing past min

export const SAVE_KEY = "wildhearth-save-v1";
export const SKILLS_KEY = "wildhearth-skills-v1";
export const SETTINGS_KEY = "wildhearth-settings-v1";
export const RENOVATION_KEY = "wildhearth-farm-v1";  // per-part farm repair state (Step 8)
export const META_KEY = "wildhearth-meta-v1";        // playthrough origin: starter choice (Step 9)
export const CALENDAR_KEY = "wildhearth-calendar-v1"; // season/day/hour (World Context Block 3)
export const WEATHER_KEY = "wildhearth-weather-v1";  // daily weather (World Context Block 4)
export const WORLD_FLAGS_KEY = "wildhearth-flags-v1"; // expiring event flags (World Context Block 5)
export const UI_KEY = "wildhearth-ui-v2";    // panel positions/sizes (not game state; v2: sidebar layout)
