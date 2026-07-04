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
];

export function forageById(id: string): ForageItem | null {
  return FORAGE.find((f) => f.id === id) ?? null;
}
