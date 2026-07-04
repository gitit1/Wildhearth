import { FISH_TIME_MIN, FISH_TIME_MAX, FISHING_BITE_REDUCTION, JUNK_CHANCE_BASE, JUNK_CHANCE_MIN } from "../config";
import { FISH, type FishLocation } from "../data/fish";
import { JUNK } from "../data/junk";
import type { Season } from "./calendar";
import type { WeatherKind } from "./weather";

/** Fishing: start near the pond, wait for a bite, land a catch. */
export interface FishingState { casting: boolean; timer: number }

export interface Catch { kind: "fish" | "junk"; id: string }

export function createFishing(): FishingState {
  return { casting: false, timer: 0 };
}

/** Higher Fishing skill (0-100) shortens the wait for a bite. */
export function startCast(f: FishingState, fishingSkill = 0) {
  f.casting = true;
  const wait = FISH_TIME_MIN + Math.random() * (FISH_TIME_MAX - FISH_TIME_MIN);
  f.timer = wait * (1 - FISHING_BITE_REDUCTION * (fishingSkill / 100));
}

/** Returns true exactly on the tick a fish is caught. */
export function updateFishing(f: FishingState, dt: number): boolean {
  if (!f.casting) return false;
  f.timer -= dt;
  if (f.timer <= 0) { f.casting = false; return true; }
  return false;
}

export function cancelCast(f: FishingState) { f.casting = false; }

function weightedPick<T extends { weight: number }>(table: T[]): T {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of table) { if ((r -= e.weight) <= 0) return e; }
  return table[table.length - 1]!;
}

/**
 * Rolls what the line actually brought up (fish-variety block): junk odds
 * shrink with skill, then a weighted roll over the species eligible right
 * here and now — location tag, skill floor, season, weather all filter.
 * Low skill sees junk and commons; high skill reaches the rare entries.
 */
export function resolveCatch(
  skill: number, season: Season, weather: WeatherKind, location: FishLocation = "pond",
): Catch {
  const junkChance = JUNK_CHANCE_BASE - (JUNK_CHANCE_BASE - JUNK_CHANCE_MIN) * (skill / 100);
  if (Math.random() < junkChance) return { kind: "junk", id: weightedPick(JUNK).id };

  const eligible = FISH.filter((s) =>
    s.locations.includes(location) &&
    skill >= s.skillFloor &&
    (!s.seasons || s.seasons.includes(season)) &&
    (!s.weather || s.weather.includes(weather)));
  // carp (floor 0, all seasons) keeps this non-empty; guard anyway
  if (eligible.length === 0) return { kind: "fish", id: "carp" };
  return { kind: "fish", id: weightedPick(eligible).id };
}
