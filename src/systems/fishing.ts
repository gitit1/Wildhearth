import { FISH_TIME_MIN, FISH_TIME_MAX, FISHING_BITE_REDUCTION, JUNK_CHANCE_BASE, JUNK_CHANCE_MIN } from "../config";
import { FISH, type FishLocation } from "../data/fish";
import { JUNK } from "../data/junk";
import type { Season } from "./calendar";
import type { WeatherKind } from "./weather";

/** Rod/bait bonuses fixed at cast time (v2 BLOCK #6 slice 2) so the catch rolls
 *  with the same gear the player cast with, even if the bag changes mid-cast. */
export interface CatchGear { qualityBonus: number; rareBias: number }
const NO_GEAR: CatchGear = { qualityBonus: 0, rareBias: 0 };

/** Fishing: start near a fishing spot, wait for a bite, land a catch. The spot
 *  remembers WHERE it is (pond/river/lake) so the catch rolls the right table. */
export interface FishingState { casting: boolean; timer: number; location: FishLocation; gear: CatchGear }

export interface Catch { kind: "fish" | "junk"; id: string }

export function createFishing(): FishingState {
  return { casting: false, timer: 0, location: "pond", gear: { ...NO_GEAR } };
}

/** Higher Fishing skill (0-100) shortens the wait for a bite; `biteMult` folds in
 *  the rod + bait's own reel-speed (rod/bait block). `gear` carries the quality +
 *  rare-bias bonuses through to resolveCatch. */
export function startCast(
  f: FishingState, fishingSkill = 0, location: FishLocation = "pond",
  biteMult = 1, gear: CatchGear = NO_GEAR,
) {
  f.casting = true;
  f.location = location;
  f.gear = gear;
  const wait = FISH_TIME_MIN + Math.random() * (FISH_TIME_MAX - FISH_TIME_MIN);
  f.timer = wait * (1 - FISHING_BITE_REDUCTION * (fishingSkill / 100)) * biteMult;
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

/** Weighted pick with a rare-bias: each entry's weight is boosted in proportion
 *  to its skillFloor (rarer = higher floor), scaled by `bias` (0..1). At bias 0
 *  this is exactly the plain weighted pick. */
function weightedPickBiased<T extends { weight: number; skillFloor: number }>(table: T[], bias: number): T {
  if (bias <= 0) return weightedPick(table);
  const boosted = table.map((e) => ({ e, w: e.weight * (1 + bias * (e.skillFloor / 20)) }));
  const total = boosted.reduce((sum, b) => sum + b.w, 0);
  let r = Math.random() * total;
  for (const b of boosted) { if ((r -= b.w) <= 0) return b.e; }
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
  qualityBonus = 0, rareBias = 0,
): Catch {
  // rod + bait raise the EFFECTIVE Fishing this cast rolls with (junk odds fall,
  // higher-floor species come into reach) — capped to the 0-100 skill range.
  const eff = Math.max(0, Math.min(100, skill + qualityBonus));
  const junkChance = JUNK_CHANCE_BASE - (JUNK_CHANCE_BASE - JUNK_CHANCE_MIN) * (eff / 100);
  if (Math.random() < junkChance) return { kind: "junk", id: weightedPick(JUNK).id };

  const eligible = FISH.filter((s) =>
    s.locations.includes(location) &&
    eff >= s.skillFloor &&
    (!s.seasons || s.seasons.includes(season)) &&
    (!s.weather || s.weather.includes(weather)));
  // carp (floor 0, all seasons) keeps this non-empty; guard anyway
  if (eligible.length === 0) return { kind: "fish", id: "carp" };
  return { kind: "fish", id: weightedPickBiased(eligible, rareBias).id };
}
