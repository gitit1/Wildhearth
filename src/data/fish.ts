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
  // ===== original 12 (ids frozen for old saves) =====
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

  // ===== variety push (R3): 12 → 50. Fills every location/season/weather/skill
  // niche the framework already supports — pond stays richly stocked across the
  // skill curve, while river/lake/boat tables are populated so the moment those
  // fishing spots land in a zone they "just work". Prices follow the existing
  // curve (floor-0 commons 2-4, mid 5-14, premium 15-25, legendary 25+). =====

  // ---- pond, low floor: commons that thicken the early game ----
  { id: "minnow",   name: "Minnow",       price: 2,  weight: 32, skillFloor: 0,
    locations: ["pond", "river"], palette: { body: "#9fb0b8", belly: "#d2dbdd", tail: "#7f9098" } },
  { id: "gudgeon",  name: "Gudgeon",      price: 3,  weight: 24, skillFloor: 0,
    locations: ["pond"], palette: { body: "#9a8f70", belly: "#cbc2a4", tail: "#7a7054" } },
  { id: "rudd",     name: "Rudd",         price: 4,  weight: 18, skillFloor: 8,
    locations: ["pond", "lake"], seasons: ["summer"],
    palette: { body: "#b8783a", belly: "#e0c07a", tail: "#c94036" } },
  { id: "ricefish", name: "Ricefish",     price: 4,  weight: 14, skillFloor: 10,
    locations: ["pond"], seasons: ["summer"],
    palette: { body: "#d9c86a", belly: "#f0e6a8", tail: "#b8a34a" } },
  { id: "tench",    name: "Tench",        price: 6,  weight: 14, skillFloor: 15,
    locations: ["pond", "lake"], palette: { body: "#5a6a3a", belly: "#93a06a", tail: "#45522c" } },
  { id: "mistcarp", name: "Mist Carp",    price: 6,  weight: 10, skillFloor: 18,
    locations: ["pond"], weather: ["fog"],
    palette: { body: "#a8b0b8", belly: "#dfe4e8", tail: "#868e97" } },
  { id: "goldfish", name: "Goldfish",     price: 7,  weight: 8,  skillFloor: 20,
    locations: ["pond"], seasons: ["spring", "summer"],
    palette: { body: "#e88a2a", belly: "#f6c878", tail: "#d0691a" } },
  { id: "icefish",  name: "Icefish",      price: 8,  weight: 10, skillFloor: 22,
    locations: ["pond"], seasons: ["winter"],
    palette: { body: "#bcd6e0", belly: "#eaf4f8", tail: "#9ab8c4" } },
  { id: "ide",      name: "Ide",          price: 8,  weight: 9,  skillFloor: 30,
    locations: ["pond", "river"], palette: { body: "#c0a850", belly: "#e6d68e", tail: "#9e8838" } },

  // ---- river: a stream table across the whole floor curve ----
  { id: "roach",    name: "Roach",        price: 3,  weight: 30, skillFloor: 0,
    locations: ["river", "pond"], palette: { body: "#8fa0a8", belly: "#cdd6d8", tail: "#c25a4a" } },
  { id: "dace",     name: "Dace",         price: 4,  weight: 20, skillFloor: 5,
    locations: ["river"], palette: { body: "#9fb2ba", belly: "#d6dfe2", tail: "#7f929a" } },
  { id: "bream",    name: "Bream",        price: 5,  weight: 16, skillFloor: 10,
    locations: ["river", "lake"], palette: { body: "#a89860", belly: "#d6c890", tail: "#87764a" } },
  { id: "chub",     name: "Chub",         price: 5,  weight: 15, skillFloor: 12,
    locations: ["river"], palette: { body: "#7f8a70", belly: "#b6bd9c", tail: "#636e56" } },
  { id: "barbel",   name: "Barbel",       price: 8,  weight: 10, skillFloor: 25,
    locations: ["river"], palette: { body: "#b0985e", belly: "#ddc98e", tail: "#8f7a44" } },
  { id: "brown_trout", name: "Brown Trout", price: 9, weight: 9, skillFloor: 30,
    locations: ["river"], seasons: ["spring"],
    palette: { body: "#9a7a46", belly: "#d6b878", tail: "#7a5e34" } },
  { id: "grayling", name: "Grayling",     price: 10, weight: 8,  skillFloor: 35,
    locations: ["river"], seasons: ["autumn"],
    palette: { body: "#8f96b0", belly: "#c6cbe0", tail: "#6f7690" } },
  { id: "rainbow_trout", name: "Rainbow Trout", price: 11, weight: 7, skillFloor: 40,
    locations: ["river", "lake"],
    palette: { body: "#7fa0b0", belly: "#e0b0b8", tail: "#5f8090" } },
  { id: "lamprey",  name: "Lamprey",      price: 11, weight: 6,  skillFloor: 50,
    locations: ["river"], weather: ["rain"],
    palette: { body: "#5a5048", belly: "#8a8078", tail: "#3f382f" } },
  { id: "salmon",   name: "Salmon",       price: 16, weight: 4,  skillFloor: 55,
    locations: ["river"], seasons: ["autumn"],
    palette: { body: "#c07456", belly: "#e8b09a", tail: "#9e5a3f" } },
  { id: "thunder_eel", name: "Thunder Eel", price: 19, weight: 3, skillFloor: 65,
    locations: ["river"], weather: ["storm"],
    palette: { body: "#4a5a6a", belly: "#8090a0", tail: "#33404d" } },

  // ---- lake: still water, mid-to-high floors ----
  { id: "whitefish", name: "Whitefish",   price: 9,  weight: 9,  skillFloor: 30,
    locations: ["lake"], seasons: ["winter"],
    palette: { body: "#c2ccd2", belly: "#eef2f4", tail: "#9fa9af" } },
  { id: "zander",   name: "Zander",       price: 12, weight: 6,  skillFloor: 45,
    locations: ["lake"], palette: { body: "#8a8a5a", belly: "#c0c090", tail: "#6a6a40" } },
  { id: "lake_trout", name: "Lake Trout", price: 13, weight: 6,  skillFloor: 50,
    locations: ["lake"], palette: { body: "#5f7060", belly: "#98a898", tail: "#455244" } },
  { id: "burbot",   name: "Burbot",       price: 15, weight: 4,  skillFloor: 55,
    locations: ["lake"], seasons: ["winter"], weather: ["storm"],
    palette: { body: "#6a5f42", belly: "#a09266", tail: "#4c4430" } },
  { id: "glassfish", name: "Glassfish",   price: 17, weight: 3,  skillFloor: 60,
    locations: ["lake"], weather: ["fog"],
    palette: { body: "#bcd0d8", belly: "#e6f0f4", tail: "#9ab2bc" } },
  { id: "arctic_char", name: "Arctic Char", price: 18, weight: 3, skillFloor: 65,
    locations: ["lake"], seasons: ["winter"],
    palette: { body: "#8a5a5a", belly: "#d69090", tail: "#6a4242" } },
  { id: "golden_perch", name: "Golden Perch", price: 24, weight: 2, skillFloor: 78,
    locations: ["lake"], palette: { body: "#d8a828", belly: "#f0d878", tail: "#b08818" } },
  { id: "leviathan_eel", name: "Leviathan Eel", price: 40, weight: 1, skillFloor: 95,
    locations: ["lake", "boat"], weather: ["storm"],
    palette: { body: "#3a4250", belly: "#6a7686", tail: "#262c38" } },

  // ---- boat: deep/open water, the high end (all unreachable until a boat zone) ----
  { id: "herring",  name: "Herring",      price: 5,  weight: 18, skillFloor: 20,
    locations: ["boat"], palette: { body: "#a8b8c0", belly: "#dfe8ec", tail: "#8898a0" } },
  { id: "flounder", name: "Flounder",     price: 10, weight: 8,  skillFloor: 35,
    locations: ["boat"], palette: { body: "#9a8a6a", belly: "#c8bc9c", tail: "#7a6c4e" } },
  { id: "mackerel", name: "Mackerel",     price: 10, weight: 9,  skillFloor: 40,
    locations: ["boat"], palette: { body: "#5a7a8a", belly: "#a8c0c8", tail: "#3f5a68" } },
  { id: "cod",      name: "Cod",          price: 12, weight: 7,  skillFloor: 45,
    locations: ["boat"], seasons: ["winter"],
    palette: { body: "#9aa07a", belly: "#c8cca8", tail: "#7a8058" } },
  { id: "sea_bass", name: "Sea Bass",     price: 14, weight: 6,  skillFloor: 50,
    locations: ["boat"], palette: { body: "#6a7680", belly: "#a6b2ba", tail: "#4c5860" } },
  { id: "halibut",  name: "Halibut",      price: 20, weight: 2,  skillFloor: 70,
    locations: ["boat"], palette: { body: "#5f5a50", belly: "#948e80", tail: "#443f36" } },
  { id: "tuna",     name: "Bluefin Tuna", price: 26, weight: 2,  skillFloor: 80,
    locations: ["boat"], seasons: ["summer"],
    palette: { body: "#3f5a78", belly: "#8aa0b8", tail: "#2a3f56" } },
  { id: "swordfish", name: "Swordfish",   price: 30, weight: 1,  skillFloor: 88,
    locations: ["boat"], palette: { body: "#4a5a68", belly: "#8a9aa8", tail: "#333f4a" } },

  // ---- fog/foggy pond legendary + a rare spring/summer ornamental ----
  { id: "ghostfish", name: "Ghostfish",   price: 22, weight: 2,  skillFloor: 72,
    locations: ["pond", "lake"], weather: ["fog"],
    palette: { body: "#d0d6e0", belly: "#f2f4fa", tail: "#aab2c2" } },
  { id: "rainbow_koi", name: "Rainbow Koi", price: 28, weight: 1, skillFloor: 85,
    locations: ["pond"], seasons: ["spring", "summer"],
    palette: { body: "#d64a7a", belly: "#f0c0d0", tail: "#4a8ac9" } },
];

export function fishById(id: string): FishSpecies | null {
  return FISH.find((f) => f.id === id) ?? null;
}
