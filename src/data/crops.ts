import type { Season } from "../systems/calendar";

/**
 * Crop table (crop-variety block, extended to 18 in Part C content-library
 * commit 1): fruits and vegetables both, gated by Farming skill floor and
 * season, mirroring data/fish.ts. `growDays` counts WATERED in-game days to
 * harvest — unwatered days don't count at all (active tending: nothing
 * finishes itself for free). `palette` drives the shared field/icon painters;
 * `shape` picks the harvested-item (backpack icon) silhouette; `growth` picks
 * the IN-FIELD growing-plant silhouette (drawCropTile in art/props.ts) — three
 * distinct shapes so the field doesn't read as "the same stalk in 18 colors":
 * tall-stalk (upright, corn/grain/leafy-root style), bushy (a leafy mound,
 * potato/tomato/cabbage style), vine (a low trailing runner, melon/squash/
 * strawberry style). Seed price is consistently ~50% of produce price,
 * matching the original 9's ratio.
 */

export type CropGrowthShape = "tall-stalk" | "bushy" | "vine";

export interface CropType {
  id: string;                 // the harvested produce item id
  name: string;
  seedId: string;
  seedName: string;
  seedPrice: number;
  price: number;              // produce sell price
  growDays: number;           // watered in-game days from planting to ready
  skillFloor: number;         // minimum Farming skill to plant
  seasons: Season[];          // when it can be planted (and is stocked)
  palette: { stalk: string; leaf: string; fruit: string };
  shape: "round" | "long";
  growth: CropGrowthShape;
}

export const CROPS: CropType[] = [
  // ---- original 9 (skillFloor 0-40) ----
  { id: "corn", name: "Corn", seedId: "corn-seeds", seedName: "Corn seeds", seedPrice: 3,
    price: 5, growDays: 2, skillFloor: 0, seasons: ["spring", "summer", "autumn"],
    palette: { stalk: "#3f6a22", leaf: "#528a2c", fruit: "#e8c85a" }, shape: "long", growth: "tall-stalk" },
  { id: "carrot", name: "Carrot", seedId: "carrot-seeds", seedName: "Carrot seeds", seedPrice: 2,
    price: 4, growDays: 1, skillFloor: 0, seasons: ["spring", "autumn"],
    palette: { stalk: "#4a7a2a", leaf: "#5f9a38", fruit: "#e07830" }, shape: "long", growth: "tall-stalk" },
  { id: "potato", name: "Potato", seedId: "potato-seeds", seedName: "Seed potatoes", seedPrice: 3,
    price: 6, growDays: 2, skillFloor: 0, seasons: ["spring", "autumn"],
    palette: { stalk: "#44682e", leaf: "#587f3c", fruit: "#c9a86a" }, shape: "round", growth: "bushy" },
  { id: "wheat", name: "Wheat", seedId: "wheat-seeds", seedName: "Wheat seeds", seedPrice: 2,
    price: 4, growDays: 2, skillFloor: 5, seasons: ["spring", "summer", "autumn"],
    palette: { stalk: "#a08a3a", leaf: "#c2ab52", fruit: "#e0c878" }, shape: "long", growth: "tall-stalk" },
  { id: "tomato", name: "Tomato", seedId: "tomato-seeds", seedName: "Tomato seeds", seedPrice: 4,
    price: 7, growDays: 2, skillFloor: 10, seasons: ["summer"],
    palette: { stalk: "#3f6a2a", leaf: "#548538", fruit: "#c94036" }, shape: "round", growth: "bushy" },
  { id: "strawberry", name: "Strawberry", seedId: "strawberry-seeds", seedName: "Strawberry seeds", seedPrice: 5,
    price: 9, growDays: 2, skillFloor: 20, seasons: ["spring"],
    palette: { stalk: "#3d6626", leaf: "#4f8030", fruit: "#d13a56" }, shape: "round", growth: "vine" },
  { id: "winterroot", name: "Winter root", seedId: "winterroot-seeds", seedName: "Winter root seeds", seedPrice: 5,
    price: 10, growDays: 2, skillFloor: 25, seasons: ["winter"],
    palette: { stalk: "#5a6a55", leaf: "#748570", fruit: "#c8bfe0" }, shape: "long", growth: "tall-stalk" },
  { id: "pumpkin", name: "Pumpkin", seedId: "pumpkin-seeds", seedName: "Pumpkin seeds", seedPrice: 6,
    price: 12, growDays: 3, skillFloor: 30, seasons: ["autumn"],
    palette: { stalk: "#4c6a2a", leaf: "#5f8536", fruit: "#dd8030" }, shape: "round", growth: "vine" },
  { id: "melon", name: "Melon", seedId: "melon-seeds", seedName: "Melon seeds", seedPrice: 7,
    price: 14, growDays: 3, skillFloor: 40, seasons: ["summer"],
    palette: { stalk: "#3f6a2a", leaf: "#4f8030", fruit: "#7ec46a" }, shape: "round", growth: "vine" },

  // ---- new 9 (Part C content-library commit 1) — fill out every season
  // (winter went from 1 crop to 4) + two premium high-floor entries for
  // late-game texture (glass gem corn, moonmelon). ----
  { id: "cabbage", name: "Cabbage", seedId: "cabbage-seeds", seedName: "Cabbage seeds", seedPrice: 3,
    price: 6, growDays: 2, skillFloor: 8, seasons: ["spring", "autumn"],
    palette: { stalk: "#3d6626", leaf: "#5f9a45", fruit: "#a8c47a" }, shape: "round", growth: "bushy" },
  { id: "turnip", name: "Turnip", seedId: "turnip-seeds", seedName: "Turnip seeds", seedPrice: 3,
    price: 6, growDays: 1, skillFloor: 5, seasons: ["winter"],
    palette: { stalk: "#4a7a4a", leaf: "#6aa25a", fruit: "#e0d0e8" }, shape: "round", growth: "tall-stalk" },
  { id: "pepper", name: "Pepper", seedId: "pepper-seeds", seedName: "Pepper seeds", seedPrice: 4,
    price: 8, growDays: 2, skillFloor: 15, seasons: ["summer"],
    palette: { stalk: "#3d6626", leaf: "#4f8030", fruit: "#e2861f" }, shape: "long", growth: "bushy" },
  { id: "squash", name: "Squash", seedId: "squash-seeds", seedName: "Squash seeds", seedPrice: 5,
    price: 10, growDays: 2, skillFloor: 20, seasons: ["autumn"],
    palette: { stalk: "#3f6a2a", leaf: "#4f8030", fruit: "#d9b56a" }, shape: "round", growth: "vine" },
  { id: "eggplant", name: "Eggplant", seedId: "eggplant-seeds", seedName: "Eggplant seeds", seedPrice: 5,
    price: 10, growDays: 2, skillFloor: 25, seasons: ["summer"],
    palette: { stalk: "#3d5a2a", leaf: "#4f7a30", fruit: "#5a3a6e" }, shape: "long", growth: "bushy" },
  { id: "parsnip", name: "Parsnip", seedId: "parsnip-seeds", seedName: "Parsnip seeds", seedPrice: 6,
    price: 12, growDays: 2, skillFloor: 35, seasons: ["winter"],
    palette: { stalk: "#5a6a55", leaf: "#748570", fruit: "#e8dfc0" }, shape: "long", growth: "tall-stalk" },
  { id: "beet", name: "Beet", seedId: "beet-seeds", seedName: "Beet seeds", seedPrice: 7,
    price: 14, growDays: 3, skillFloor: 45, seasons: ["autumn"],
    palette: { stalk: "#4a2a3a", leaf: "#6a8a3a", fruit: "#8a2540" }, shape: "round", growth: "tall-stalk" },
  { id: "glass-gem-corn", name: "Glass gem corn", seedId: "glass-gem-corn-seeds", seedName: "Glass gem corn seeds", seedPrice: 9,
    price: 18, growDays: 3, skillFloor: 50, seasons: ["autumn"],
    palette: { stalk: "#7a6a2a", leaf: "#8a9a4a", fruit: "#b03a8a" }, shape: "long", growth: "tall-stalk" },
  { id: "moonmelon", name: "Moonmelon", seedId: "moonmelon-seeds", seedName: "Moonmelon seeds", seedPrice: 11,
    price: 22, growDays: 3, skillFloor: 60, seasons: ["winter"],
    palette: { stalk: "#3a4a5a", leaf: "#4a5f6a", fruit: "#cfe0ea" }, shape: "round", growth: "vine" },

  // ---- variety push (R3): 18 → 20. Two crops with NO ripe sprite in
  // src/assets/pixellab/crops/, so drawCropTile's `crops/ripe-<id>` lookup
  // misses and the code plant painter draws them — dual-path fallback verified
  // (CLAUDE.md hard rule #1). Lettuce fills the leafy-green gap; garlic the
  // allium/curing gap and thickens winter. ----
  { id: "lettuce", name: "Lettuce", seedId: "lettuce-seeds", seedName: "Lettuce seeds", seedPrice: 3,
    price: 6, growDays: 1, skillFloor: 10, seasons: ["spring", "summer"],
    palette: { stalk: "#3d6626", leaf: "#6aa83a", fruit: "#8ac25a" }, shape: "round", growth: "bushy" },
  { id: "garlic", name: "Garlic", seedId: "garlic-seeds", seedName: "Garlic cloves", seedPrice: 5,
    price: 10, growDays: 2, skillFloor: 18, seasons: ["autumn", "winter"],
    palette: { stalk: "#6a7a4a", leaf: "#8aa05a", fruit: "#eae2d0" }, shape: "long", growth: "tall-stalk" },
];

export function cropById(id: string): CropType | null {
  return CROPS.find((c) => c.id === id) ?? null;
}

export function cropBySeed(seedId: string): CropType | null {
  // legacy shim: pre-variety saves hold generic "seeds", which were corn
  if (seedId === "seeds") return cropById("corn");
  return CROPS.find((c) => c.seedId === seedId) ?? null;
}
