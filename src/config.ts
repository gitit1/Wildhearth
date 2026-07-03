/** Global tuning knobs. Change values here, not inside systems. */
export const T = 32;                    // tile size in px
export const MW = 34, MH = 24;          // map size in tiles
export const WORLD_W = MW * T, WORLD_H = MH * T;

export const PLAYER_SPEED = 150;        // px/sec
export const COW_SPEED = 22, HEN_SPEED = 30;

export const FISH_PRICE = 3;            // coins per fish at the stall
export const FISH_TIME_MIN = 1.2;       // seconds until a bite
export const FISH_TIME_MAX = 3.0;

export const INVENTORY_SLOTS = 12;      // backpack size (upgradeable post-MVP)
export const MINIMAP_SCALE = 0.14;      // minimap px per world px

export const CLICK_ARRIVE = 5;          // px: close enough to a click-to-move target
export const DRAG_THRESHOLD = 10;       // px of travel before a press is a joystick drag, not a tap

export const SAVE_KEY = "wildhearth-save-v1";
export const UI_KEY = "wildhearth-ui-v1";    // panel positions/sizes (not game state)
