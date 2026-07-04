import { SETTINGS_KEY } from "../config";

/**
 * Player-facing settings. Stored separately from game state so a new game
 * keeps them. `guided` is the tutorial toggle from the opening sequence —
 * a normal, changeable setting, not a one-time flag.
 */

export interface Settings { version: number; guided: boolean; dayLengthSeconds: number }

// dayLengthSeconds = real seconds for one full in-game day. Default 1440
// (24 real minutes/day) matches the pace before the setting existed.
const DEFAULTS: Settings = { version: 1, guided: true, dayLengthSeconds: 1440 };
let cached: Settings | null = null;

export function loadSettings(): Settings {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    // tolerate junk / a bare value: only merge a real object over the defaults
    cached = parsed && typeof parsed === "object"
      ? { ...DEFAULTS, ...(parsed as Partial<Settings>), version: 1 }
      : { ...DEFAULTS };
  } catch { cached = { ...DEFAULTS }; }
  return cached!;
}

export function saveSettings(patch: Partial<Settings>) {
  cached = { ...loadSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cached)); } catch { /* private mode */ }
}

export function isGuided(): boolean { return loadSettings().guided; }

/** Real seconds per in-game day, clamped to a sane floor so the tick loop
 *  can't be driven into a pathological number of catch-up steps. */
export function dayLengthSeconds(): number {
  const d = loadSettings().dayLengthSeconds;
  return typeof d === "number" && d > 0 ? Math.max(1, d) : DEFAULTS.dayLengthSeconds;
}
