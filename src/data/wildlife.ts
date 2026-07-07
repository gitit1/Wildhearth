import { WILDLIFE_MAX_COUNT, WILDLIFE_SPEED } from "../config";
import type { Season } from "../systems/calendar";
import type { WeatherKind } from "../systems/weather";
import type { Region } from "../world/zones";

/**
 * Seasonal wildlife spawn table (ROADMAP's "Wild animals along the
 * road/river" block) — ambient, non-interactive-except-fleeing critters that
 * make the world read alive and change with season + weather (DECISIONS:
 * "Wildlife in world: migratory, changes with seasons"). Purely data: WHEN
 * (seasons), WHERE (regions), and under WHAT weather each kind can appear.
 * `entities/wildlife.ts` reads this table to spawn/despawn; the numeric
 * population/speed knobs it references live in config.ts, same split the
 * rest of the content tables (fish/crops/forage) use for skill floors vs.
 * global tuning.
 *
 * No skill/collection wiring yet — sighting these for the Memory Book needs
 * the binoculars mechanic (Riverside Fisherwoman block), not built here.
 */

export type WildlifeKind = "butterfly" | "songbird" | "rabbit" | "deer" | "duck" | "hare";

export interface WildlifeDef {
  id: string;
  kind: WildlifeKind;
  regions: Region[];
  seasons: Season[];
  weather: WeatherKind[];   // "storm" is never listed — nothing is out in a storm
  maxCount: number;
  speed: number;            // px/sec wander/flee speed
}

export const WILDLIFE: WildlifeDef[] = [
  {
    // spring + summer: flutters over the farm's flower beds, the roadside
    // verge, and the open market square
    id: "butterfly", kind: "butterfly",
    regions: ["farm", "road", "market"],
    seasons: ["spring", "summer"],
    weather: ["clear", "fog"],
    maxCount: WILDLIFE_MAX_COUNT.butterfly, speed: WILDLIFE_SPEED.butterfly,
  },
  {
    // spring through autumn (migrates off before winter) — forest edge, the
    // road, and the farm's open ground
    id: "songbird", kind: "songbird",
    regions: ["forest", "road", "farm"],
    seasons: ["spring", "summer", "autumn"],
    weather: ["clear", "fog", "rain"],
    maxCount: WILDLIFE_MAX_COUNT.songbird, speed: WILDLIFE_SPEED.songbird,
  },
  {
    // spring only — replaced by hares once winter turns their coats
    id: "rabbit", kind: "rabbit",
    regions: ["farm", "road"],
    seasons: ["spring"],
    weather: ["clear", "fog", "rain"],
    maxCount: WILDLIFE_MAX_COUNT.rabbit, speed: WILDLIFE_SPEED.rabbit,
  },
  {
    // summer, on the river/lake itself
    id: "duck", kind: "duck",
    regions: ["river"],
    seasons: ["summer"],
    weather: ["clear", "fog", "rain"],
    maxCount: WILDLIFE_MAX_COUNT.duck, speed: WILDLIFE_SPEED.duck,
  },
  {
    // autumn (forest/road) through winter — deer stay out longer than the birds
    id: "deer", kind: "deer",
    regions: ["forest", "road"],
    seasons: ["autumn", "winter"],
    weather: ["clear", "fog", "rain"],
    maxCount: WILDLIFE_MAX_COUNT.deer, speed: WILDLIFE_SPEED.deer,
  },
  {
    // winter only — the season's mammal, no insects/birds alongside it
    id: "hare", kind: "hare",
    regions: ["farm", "road"],
    seasons: ["winter"],
    weather: ["clear", "fog", "rain"],
    maxCount: WILDLIFE_MAX_COUNT.hare, speed: WILDLIFE_SPEED.hare,
  },
];
