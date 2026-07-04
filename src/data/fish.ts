import type { Season } from "../systems/calendar";
import type { WeatherKind } from "../systems/weather";

/**
 * Fish species table (fish-variety block). Each species has a rarity weight,
 * a required Fishing-skill floor (below it the species simply can't be
 * caught), tags for WHERE it appears (pond today; river/lake/boat exist as
 * tags now so future zones just work) and WHEN (season/weather — absent tag
 * = any). `palette` feeds the shared parameterized icon painter.
 */

export type FishLocation = "pond" | "river" | "lake" | "boat";

export interface FishSpecies {
  id: string;
  name: string;
  price: number;
  weight: number;                 // rarity weight in the roll (higher = more common)
  skillFloor: number;             // minimum Fishing skill to catch it at all
  locations: FishLocation[];
  seasons?: Season[];             // absent = all seasons
  weather?: WeatherKind[];        // absent = any weather
  palette: { body: string; belly: string; tail: string };
}

export const FISH: FishSpecies[] = [
  { id: "carp",     name: "Common Carp",  price: 3,  weight: 30, skillFloor: 0,
    locations: ["pond", "river"], palette: { body: "#8a9a6a", belly: "#c2cba0", tail: "#6f7f52" } },
  { id: "perch",    name: "Perch",        price: 4,  weight: 24, skillFloor: 0,
    locations: ["pond", "river"], palette: { body: "#6fa8c9", belly: "#a8cde3", tail: "#5b90ad" } },
  { id: "bluegill", name: "Bluegill",     price: 3,  weight: 26, skillFloor: 0,
    locations: ["pond"], seasons: ["spring", "summer"],
    palette: { body: "#5878b8", belly: "#9ab2dd", tail: "#46609a" } },
  { id: "sunfish",  name: "Sunfish",      price: 4,  weight: 18, skillFloor: 10,
    locations: ["pond"], seasons: ["summer"],
    palette: { body: "#d9a441", belly: "#efd39a", tail: "#b8862f" } },
  { id: "crucian",  name: "Crucian Carp", price: 5,  weight: 16, skillFloor: 15,
    locations: ["pond"], seasons: ["autumn", "winter"],
    palette: { body: "#a08a52", belly: "#cfc099", tail: "#84713f" } },
  { id: "loach",    name: "Weather Loach", price: 7, weight: 10, skillFloor: 30,
    locations: ["pond"], weather: ["rain", "storm"],
    palette: { body: "#7a6a58", belly: "#b0a28c", tail: "#5f5244" } },
  { id: "pike",     name: "Pike",         price: 9,  weight: 8,  skillFloor: 40,
    locations: ["pond", "river", "lake"],
    palette: { body: "#5f7f4a", belly: "#a3b98a", tail: "#48633a" } },
  { id: "eel",      name: "Silver Eel",   price: 10, weight: 7,  skillFloor: 45,
    locations: ["pond", "river"], seasons: ["autumn"],
    palette: { body: "#8f96a3", belly: "#c6cbd4", tail: "#70766f" } },
  { id: "koi",      name: "Golden Koi",   price: 14, weight: 4,  skillFloor: 60,
    locations: ["pond"], seasons: ["spring", "summer"],
    palette: { body: "#e0912f", belly: "#f4c98a", tail: "#c2711d" } },
  { id: "moonfish", name: "Moonfish",     price: 18, weight: 2,  skillFloor: 75,
    locations: ["pond"], weather: ["fog"],
    palette: { body: "#c9cfe8", belly: "#eef0fa", tail: "#a3abd0" } },
  { id: "sturgeon", name: "Sturgeon",     price: 22, weight: 2,  skillFloor: 85,
    locations: ["lake", "boat"],   // waits for deeper water — unreachable from the pond
    palette: { body: "#5c6470", belly: "#98a0ab", tail: "#454c56" } },
  { id: "elder",    name: "Elder Carp",   price: 25, weight: 1,  skillFloor: 90,
    locations: ["pond"],
    palette: { body: "#7a5a80", belly: "#bda3c2", tail: "#5d4262" } },
];

export function fishById(id: string): FishSpecies | null {
  return FISH.find((f) => f.id === id) ?? null;
}
