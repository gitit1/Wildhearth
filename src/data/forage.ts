import type { Season } from "../systems/calendar";

/**
 * Wild forage table (foraging-variety block), following data/fish.ts: each
 * find has a rarity weight, a Foraging-skill floor, season tags (absent =
 * any) and a location tag (forest today; more as the world grows). Berries
 * keep their legacy id — old saves and the floor-0 fallback both stay valid.
 * `icon` drives the shared parameterized painter.
 */

export type ForageLocation = "forest";

export interface ForageItem {
  id: string;
  name: string;
  price: number;
  weight: number;
  skillFloor: number;
  locations: ForageLocation[];
  seasons?: Season[];              // absent = all seasons
  icon: { color: string; kind: "cluster" | "cap" | "sprig" | "nut" };
}

export const FORAGE: ForageItem[] = [
  { id: "berries",         name: "Berries",           price: 2,  weight: 30, skillFloor: 0,
    locations: ["forest"], icon: { color: "#c2385a", kind: "cluster" } },
  { id: "wild_garlic",     name: "Wild garlic",       price: 3,  weight: 20, skillFloor: 0,
    locations: ["forest"], seasons: ["spring"], icon: { color: "#dfe8d0", kind: "sprig" } },
  { id: "mushroom",        name: "Brown mushroom",    price: 3,  weight: 22, skillFloor: 0,
    locations: ["forest"], seasons: ["spring", "autumn"], icon: { color: "#a97b4a", kind: "cap" } },
  { id: "sorrel",          name: "Sorrel",            price: 3,  weight: 18, skillFloor: 5,
    locations: ["forest"], seasons: ["spring", "summer", "autumn"], icon: { color: "#5f9a38", kind: "sprig" } },
  { id: "hazelnuts",       name: "Hazelnuts",         price: 4,  weight: 16, skillFloor: 10,
    locations: ["forest"], seasons: ["autumn"], icon: { color: "#8a5f38", kind: "nut" } },
  { id: "wild_strawberry", name: "Wild strawberries", price: 5,  weight: 14, skillFloor: 15,
    locations: ["forest"], seasons: ["spring", "summer"], icon: { color: "#d13a56", kind: "cluster" } },
  { id: "elderflower",     name: "Elderflower",       price: 4,  weight: 14, skillFloor: 20,
    locations: ["forest"], seasons: ["spring", "summer"], icon: { color: "#efe9d0", kind: "cluster" } },
  { id: "wintergreens",    name: "Wintergreens",      price: 6,  weight: 12, skillFloor: 20,
    locations: ["forest"], seasons: ["winter"], icon: { color: "#4a7a62", kind: "sprig" } },
  { id: "rosehips",        name: "Rosehips",          price: 5,  weight: 12, skillFloor: 25,
    locations: ["forest"], seasons: ["autumn", "winter"], icon: { color: "#c9502e", kind: "cluster" } },
  { id: "chanterelle",     name: "Chanterelle",       price: 8,  weight: 8,  skillFloor: 40,
    locations: ["forest"], seasons: ["autumn"], icon: { color: "#e0a12f", kind: "cap" } },
  { id: "truffle",         name: "Truffle",           price: 18, weight: 2,  skillFloor: 60,
    locations: ["forest"], seasons: ["autumn", "winter"], icon: { color: "#4a3a30", kind: "nut" } },

  // ---- variety push (R3): 11 → 25. Fills the seasonal foraging curve (every
  // season now yields a spread from floor-0 commons to premium finds), reusing
  // the four existing tinted silhouettes (cluster / cap / sprig / nut). ----
  { id: "dandelion",       name: "Dandelion greens",  price: 2,  weight: 22, skillFloor: 0,
    locations: ["forest"], seasons: ["spring", "summer"], icon: { color: "#7fae2e", kind: "sprig" } },
  { id: "clover",          name: "Wild clover",       price: 2,  weight: 20, skillFloor: 0,
    locations: ["forest"], seasons: ["spring", "summer"], icon: { color: "#5f9a48", kind: "sprig" } },
  { id: "nettle",          name: "Nettle",            price: 3,  weight: 16, skillFloor: 5,
    locations: ["forest"], seasons: ["spring", "summer"], icon: { color: "#3f7a3a", kind: "sprig" } },
  { id: "raspberry",       name: "Wild raspberries",  price: 4,  weight: 16, skillFloor: 6,
    locations: ["forest"], seasons: ["summer"], icon: { color: "#c23a5a", kind: "cluster" } },
  { id: "blackberry",      name: "Blackberries",      price: 4,  weight: 14, skillFloor: 8,
    locations: ["forest"], seasons: ["summer", "autumn"], icon: { color: "#3a2a4a", kind: "cluster" } },
  { id: "wild_mint",       name: "Wild mint",         price: 4,  weight: 14, skillFloor: 8,
    locations: ["forest"], seasons: ["summer"], icon: { color: "#5aa87a", kind: "sprig" } },
  { id: "acorns",          name: "Acorns",            price: 3,  weight: 16, skillFloor: 8,
    locations: ["forest"], seasons: ["autumn"], icon: { color: "#9a6a38", kind: "nut" } },
  { id: "chamomile",       name: "Chamomile",         price: 5,  weight: 12, skillFloor: 12,
    locations: ["forest"], seasons: ["summer"], icon: { color: "#f0e8c0", kind: "cluster" } },
  { id: "fiddlehead",      name: "Fiddleheads",       price: 6,  weight: 10, skillFloor: 15,
    locations: ["forest"], seasons: ["spring"], icon: { color: "#6f9a3a", kind: "sprig" } },
  { id: "chestnuts",       name: "Sweet chestnuts",   price: 6,  weight: 10, skillFloor: 18,
    locations: ["forest"], seasons: ["autumn"], icon: { color: "#7a4a28", kind: "nut" } },
  { id: "cranberries",     name: "Cranberries",       price: 6,  weight: 10, skillFloor: 22,
    locations: ["forest"], seasons: ["autumn", "winter"], icon: { color: "#a8203a", kind: "cluster" } },
  { id: "birch_sap",       name: "Birch sap",         price: 8,  weight: 7,  skillFloor: 28,
    locations: ["forest"], seasons: ["winter", "spring"], icon: { color: "#dfe2d0", kind: "sprig" } },
  { id: "pine_nuts",       name: "Pine nuts",         price: 10, weight: 6,  skillFloor: 30,
    locations: ["forest"], seasons: ["winter"], icon: { color: "#c9a86a", kind: "nut" } },
  { id: "morel",           name: "Morel",             price: 12, weight: 4,  skillFloor: 35,
    locations: ["forest"], seasons: ["spring"], icon: { color: "#8a6a44", kind: "cap" } },
  { id: "porcini",         name: "Porcini",           price: 14, weight: 3,  skillFloor: 45,
    locations: ["forest"], seasons: ["autumn"], icon: { color: "#b0804a", kind: "cap" } },
];

export function forageById(id: string): ForageItem | null {
  return FORAGE.find((f) => f.id === id) ?? null;
}
