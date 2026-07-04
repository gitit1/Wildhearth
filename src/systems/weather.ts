import { WEATHER_KEY } from "../config";
import { type Season } from "./calendar";

export type WeatherKind = "clear" | "rain" | "storm" | "fog"; // extend later

export interface WeatherState {
  version: 1;
  kind: WeatherKind;
  daysSinceChange: number;
}

function fresh(): WeatherState {
  return { version: 1, kind: "clear", daysSinceChange: 0 };
}

export function loadWeather(): WeatherState {
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<WeatherState>;
    const validKinds: WeatherKind[] = ["clear", "rain", "storm", "fog"];
    return {
      version: 1,
      kind: validKinds.includes(p.kind as WeatherKind) ? (p.kind as WeatherKind) : "clear",
      daysSinceChange: typeof p.daysSinceChange === "number" ? p.daysSinceChange : 0,
    };
  } catch {
    return fresh();
  }
}

export function saveWeather(w: WeatherState) {
  try { localStorage.setItem(WEATHER_KEY, JSON.stringify(w)); }
  catch { /* private mode */ }
}

export function resetWeather(w: WeatherState) {
  const f = fresh();
  w.kind = f.kind; w.daysSinceChange = f.daysSinceChange;
  saveWeather(w);
}

// Placeholder table — tune during implementation. Each season maps to a
// weighted list of [kind, weight] pairs.
const WEATHER_TABLE: Record<Season, Array<[WeatherKind, number]>> = {
  spring: [["clear", 6], ["rain", 4]],
  summer: [["clear", 8], ["rain", 2]],
  autumn: [["clear", 5], ["rain", 4], ["fog", 1]],
  winter: [["clear", 6], ["storm", 2], ["fog", 2]],
};

function rollWeather(season: Season): WeatherKind {
  const table = WEATHER_TABLE[season];
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [kind, weight] of table) { if ((r -= weight) <= 0) return kind; }
  return "clear";
}

/** Call once per new in-game day (when calendar's advanceHour() rolls a
 *  day). Rerolls weather for the day using the current season. */
export function rollDailyWeather(w: WeatherState, season: Season) {
  const next = rollWeather(season);
  w.daysSinceChange = next === w.kind ? w.daysSinceChange + 1 : 0;
  w.kind = next;
  saveWeather(w);
}

export function isRaining(w: WeatherState): boolean {
  return w.kind === "rain" || w.kind === "storm";
}
