import type { Season } from "../systems/calendar";

/**
 * Crop table (crop-variety block): fruits and vegetables both, gated by
 * Farming skill floor and season, mirroring data/fish.ts. `growDays` counts
 * WATERED in-game days to harvest — unwatered days don't count at all
 * (active tending: nothing finishes itself for free). `palette` drives the
 * shared field/icon painters; `shape` picks the produce silhouette.
 */

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
}

export const CROPS: CropType[] = [
  { id: "corn", name: "Corn", seedId: "corn-seeds", seedName: "Corn seeds", seedPrice: 3,
    price: 5, growDays: 2, skillFloor: 0, seasons: ["spring", "summer", "autumn"],
    palette: { stalk: "#3f6a22", leaf: "#528a2c", fruit: "#e8c85a" }, shape: "long" },
  { id: "carrot", name: "Carrot", seedId: "carrot-seeds", seedName: "Carrot seeds", seedPrice: 2,
    price: 4, growDays: 1, skillFloor: 0, seasons: ["spring", "autumn"],
    palette: { stalk: "#4a7a2a", leaf: "#5f9a38", fruit: "#e07830" }, shape: "long" },
  { id: "potato", name: "Potato", seedId: "potato-seeds", seedName: "Seed potatoes", seedPrice: 3,
    price: 6, growDays: 2, skillFloor: 0, seasons: ["spring", "autumn"],
    palette: { stalk: "#44682e", leaf: "#587f3c", fruit: "#c9a86a" }, shape: "round" },
  { id: "wheat", name: "Wheat", seedId: "wheat-seeds", seedName: "Wheat seeds", seedPrice: 2,
    price: 4, growDays: 2, skillFloor: 5, seasons: ["spring", "summer", "autumn"],
    palette: { stalk: "#a08a3a", leaf: "#c2ab52", fruit: "#e0c878" }, shape: "long" },
  { id: "tomato", name: "Tomato", seedId: "tomato-seeds", seedName: "Tomato seeds", seedPrice: 4,
    price: 7, growDays: 2, skillFloor: 10, seasons: ["summer"],
    palette: { stalk: "#3f6a2a", leaf: "#548538", fruit: "#c94036" }, shape: "round" },
  { id: "strawberry", name: "Strawberry", seedId: "strawberry-seeds", seedName: "Strawberry seeds", seedPrice: 5,
    price: 9, growDays: 2, skillFloor: 20, seasons: ["spring"],
    palette: { stalk: "#3d6626", leaf: "#4f8030", fruit: "#d13a56" }, shape: "round" },
  { id: "winterroot", name: "Winter root", seedId: "winterroot-seeds", seedName: "Winter root seeds", seedPrice: 5,
    price: 10, growDays: 2, skillFloor: 25, seasons: ["winter"],
    palette: { stalk: "#5a6a55", leaf: "#748570", fruit: "#c8bfe0" }, shape: "long" },
  { id: "pumpkin", name: "Pumpkin", seedId: "pumpkin-seeds", seedName: "Pumpkin seeds", seedPrice: 6,
    price: 12, growDays: 3, skillFloor: 30, seasons: ["autumn"],
    palette: { stalk: "#4c6a2a", leaf: "#5f8536", fruit: "#dd8030" }, shape: "round" },
  { id: "melon", name: "Melon", seedId: "melon-seeds", seedName: "Melon seeds", seedPrice: 7,
    price: 14, growDays: 3, skillFloor: 40, seasons: ["summer"],
    palette: { stalk: "#3f6a2a", leaf: "#4f8030", fruit: "#7ec46a" }, shape: "round" },
];

export function cropById(id: string): CropType | null {
  return CROPS.find((c) => c.id === id) ?? null;
}

export function cropBySeed(seedId: string): CropType | null {
  // legacy shim: pre-variety saves hold generic "seeds", which were corn
  if (seedId === "seeds") return cropById("corn");
  return CROPS.find((c) => c.seedId === seedId) ?? null;
}
