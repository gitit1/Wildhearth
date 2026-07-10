import type { Season } from "../systems/calendar";

/**
 * Ornamental flower species (R3 variety push, flowers 0 → 20). Decorative
 * garden blooms, distinct from the food crops in data/crops.ts: you buy a
 * species' seed packet (nothing is free), plant it in a flower bed, water it,
 * and it blooms over `growDays` WATERED in-game days; a bloom can be cut for a
 * sellable flower. Planting/watering/harvesting all train the Gardening skill.
 *
 * `palette` drives both the backpack icon (art/icons.ts paintFlower) and the
 * in-world bed painter (art/props.ts drawFlowerBed) code fallback; `sprite`
 * names which foliage/flowers-*.png family the in-world bloom reuses when
 * present (dual-path — the code painter draws it with zero PNGs). Seed price is
 * ~50% of the cut-flower price, matching the crop-table convention.
 */

export type FlowerSpriteFamily = "red" | "yellow" | "purple" | "mixed";

export interface FlowerSpecies {
  id: string;                 // the cut-flower produce item id
  name: string;
  seedId: string;
  seedName: string;
  seedPrice: number;
  price: number;              // cut-flower sell price
  growDays: number;           // watered in-game days from planting to bloom
  skillFloor: number;         // minimum Gardening skill to plant
  seasons: Season[];          // when it can be planted (and is stocked)
  sprite: FlowerSpriteFamily; // foliage/flowers-<family> reused for the in-world bloom
  palette: { petal: string; center: string; leaf: string };
}

const LEAF = "#4a7a2a";

export const FLOWERS: FlowerSpecies[] = [
  // ---- spring ----
  { id: "crocus", name: "Crocus", seedId: "crocus-seeds", seedName: "Crocus bulbs", seedPrice: 2,
    price: 4, growDays: 0.5, skillFloor: 0, seasons: ["spring"], sprite: "purple",
    palette: { petal: "#8a6ec2", center: "#e8c34f", leaf: LEAF } },
  { id: "primrose", name: "Primrose", seedId: "primrose-seeds", seedName: "Primrose seeds", seedPrice: 2,
    price: 4, growDays: 0.5, skillFloor: 0, seasons: ["spring"], sprite: "yellow",
    palette: { petal: "#f0d84a", center: "#e88a2a", leaf: LEAF } },
  { id: "tulip", name: "Tulip", seedId: "tulip-seeds", seedName: "Tulip bulbs", seedPrice: 3,
    price: 6, growDays: 1, skillFloor: 5, seasons: ["spring"], sprite: "red",
    palette: { petal: "#d64060", center: "#f0e0a0", leaf: LEAF } },
  { id: "daffodil", name: "Daffodil", seedId: "daffodil-seeds", seedName: "Daffodil bulbs", seedPrice: 3,
    price: 6, growDays: 1, skillFloor: 8, seasons: ["spring"], sprite: "yellow",
    palette: { petal: "#f2d040", center: "#e8862a", leaf: LEAF } },
  { id: "bluebell", name: "Bluebell", seedId: "bluebell-seeds", seedName: "Bluebell seeds", seedPrice: 4,
    price: 7, growDays: 1, skillFloor: 12, seasons: ["spring"], sprite: "purple",
    palette: { petal: "#5a6ec8", center: "#c0c8f0", leaf: LEAF } },
  { id: "forget_me_not", name: "Forget-me-not", seedId: "forget_me_not-seeds", seedName: "Forget-me-not seeds", seedPrice: 4,
    price: 8, growDays: 1, skillFloor: 15, seasons: ["spring"], sprite: "purple",
    palette: { petal: "#6a9ad8", center: "#f0e060", leaf: LEAF } },

  // ---- summer ----
  { id: "daisy", name: "Daisy", seedId: "daisy-seeds", seedName: "Daisy seeds", seedPrice: 2,
    price: 4, growDays: 0.5, skillFloor: 0, seasons: ["summer"], sprite: "mixed",
    palette: { petal: "#f4f0e6", center: "#e8c34f", leaf: LEAF } },
  { id: "marigold", name: "Marigold", seedId: "marigold-seeds", seedName: "Marigold seeds", seedPrice: 3,
    price: 6, growDays: 1, skillFloor: 5, seasons: ["summer"], sprite: "yellow",
    palette: { petal: "#e8942a", center: "#a85818", leaf: LEAF } },
  { id: "poppy", name: "Poppy", seedId: "poppy-seeds", seedName: "Poppy seeds", seedPrice: 4,
    price: 7, growDays: 1, skillFloor: 10, seasons: ["summer"], sprite: "red",
    palette: { petal: "#d43038", center: "#2a2420", leaf: LEAF } },
  { id: "cornflower", name: "Cornflower", seedId: "cornflower-seeds", seedName: "Cornflower seeds", seedPrice: 4,
    price: 7, growDays: 1, skillFloor: 12, seasons: ["summer"], sprite: "purple",
    palette: { petal: "#4a6ad0", center: "#3a4a80", leaf: LEAF } },
  { id: "lavender", name: "Lavender", seedId: "lavender-seeds", seedName: "Lavender seeds", seedPrice: 5,
    price: 9, growDays: 1.5, skillFloor: 20, seasons: ["summer"], sprite: "purple",
    palette: { petal: "#9a7ac8", center: "#7a5ea8", leaf: "#6a8a5a" } },
  { id: "sunflower", name: "Sunflower", seedId: "sunflower-seeds", seedName: "Sunflower seeds", seedPrice: 6,
    price: 11, growDays: 2, skillFloor: 25, seasons: ["summer"], sprite: "yellow",
    palette: { petal: "#f0c020", center: "#7a4a20", leaf: LEAF } },
  { id: "rose", name: "Rose", seedId: "rose-seeds", seedName: "Rose cuttings", seedPrice: 6,
    price: 12, growDays: 2, skillFloor: 30, seasons: ["summer"], sprite: "red",
    palette: { petal: "#d83a5a", center: "#a02038", leaf: LEAF } },

  // ---- autumn ----
  { id: "goldenrod", name: "Goldenrod", seedId: "goldenrod-seeds", seedName: "Goldenrod seeds", seedPrice: 3,
    price: 6, growDays: 1, skillFloor: 8, seasons: ["autumn"], sprite: "yellow",
    palette: { petal: "#e0b830", center: "#c09020", leaf: LEAF } },
  { id: "aster", name: "Aster", seedId: "aster-seeds", seedName: "Aster seeds", seedPrice: 4,
    price: 7, growDays: 1, skillFloor: 10, seasons: ["autumn"], sprite: "purple",
    palette: { petal: "#9a6ac8", center: "#f0d040", leaf: LEAF } },
  { id: "chrysanthemum", name: "Chrysanthemum", seedId: "chrysanthemum-seeds", seedName: "Chrysanthemum seeds", seedPrice: 5,
    price: 10, growDays: 1.5, skillFloor: 22, seasons: ["autumn"], sprite: "red",
    palette: { petal: "#d87028", center: "#e8b040", leaf: LEAF } },
  { id: "dahlia", name: "Dahlia", seedId: "dahlia-seeds", seedName: "Dahlia tubers", seedPrice: 7,
    price: 14, growDays: 2, skillFloor: 35, seasons: ["autumn"], sprite: "red",
    palette: { petal: "#c83060", center: "#f0d060", leaf: LEAF } },

  // ---- winter ----
  { id: "snowdrop", name: "Snowdrop", seedId: "snowdrop-seeds", seedName: "Snowdrop bulbs", seedPrice: 4,
    price: 8, growDays: 1, skillFloor: 10, seasons: ["winter"], sprite: "mixed",
    palette: { petal: "#eef2f0", center: "#a8c86a", leaf: "#5a7a52" } },
  { id: "hellebore", name: "Hellebore", seedId: "hellebore-seeds", seedName: "Hellebore seeds", seedPrice: 6,
    price: 12, growDays: 1.5, skillFloor: 25, seasons: ["winter"], sprite: "purple",
    palette: { petal: "#a87ac0", center: "#e8d860", leaf: "#5a7a52" } },
  { id: "camellia", name: "Camellia", seedId: "camellia-seeds", seedName: "Camellia cuttings", seedPrice: 8,
    price: 16, growDays: 2, skillFloor: 40, seasons: ["winter"], sprite: "red",
    palette: { petal: "#d84a68", center: "#f0e0c0", leaf: "#3a6a3a" } },
];

export function flowerById(id: string): FlowerSpecies | null {
  return FLOWERS.find((f) => f.id === id) ?? null;
}

export function flowerBySeed(seedId: string): FlowerSpecies | null {
  return FLOWERS.find((f) => f.seedId === seedId) ?? null;
}
