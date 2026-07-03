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

export const SKILL_GAIN_BASE = 0.3;     // gain per use at skill 0, shrinking toward 100

export const INVENTORY_SLOTS = 12;      // backpack size (upgradeable post-MVP)
export const MINIMAP_SCALE = 0.14;      // minimap px per world px

export const CLICK_ARRIVE = 5;          // px: close enough to a click-to-move target
export const DRAG_THRESHOLD = 10;       // px of travel before a press is a joystick drag, not a tap

export const CAM_ZOOM_MIN = 1.4;        // camera zoom (CSS px per world px) bounds
export const CAM_ZOOM_MAX = 2.2;
export const CAM_ZOOM_REF_W = 900;      // window width where zoom starts growing past min

export const SAVE_KEY = "wildhearth-save-v1";
export const SKILLS_KEY = "wildhearth-skills-v1";
export const UI_KEY = "wildhearth-ui-v1";    // panel positions/sizes (not game state)
