import { SETTINGS_KEY } from "../config";

/**
 * Player-facing settings. Stored separately from game state so a new game
 * keeps them. `guided` is the tutorial toggle from the opening sequence —
 * a normal, changeable setting, not a one-time flag.
 */

export interface Settings { version: number; guided: boolean }

const DEFAULTS: Settings = { version: 1, guided: true };
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
