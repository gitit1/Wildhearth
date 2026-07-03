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

export const SAVE_KEY = "meshek-save-v1";
