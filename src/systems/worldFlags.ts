import { WORLD_FLAGS_KEY } from "../config";

interface FlagEntry { key: string; expiresOnDay: number }
export interface WorldFlags { version: 1; entries: FlagEntry[] }

function fresh(): WorldFlags { return { version: 1, entries: [] }; }

export function loadWorldFlags(): WorldFlags {
  try {
    const raw = localStorage.getItem(WORLD_FLAGS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<WorldFlags>;
    const entries = Array.isArray(p.entries)
      ? p.entries.filter((e): e is FlagEntry =>
          !!e && typeof e.key === "string" && typeof e.expiresOnDay === "number")
      : [];
    return { version: 1, entries };
  } catch {
    return fresh();
  }
}

export function saveWorldFlags(f: WorldFlags) {
  try { localStorage.setItem(WORLD_FLAGS_KEY, JSON.stringify(f)); }
  catch { /* private mode */ }
}

export function resetWorldFlags(f: WorldFlags) {
  f.entries = [];
  saveWorldFlags(f);
}

/** Sets a flag true for durationDays in-game days from currentDay. */
export function setFlag(f: WorldFlags, key: string, durationDays: number, currentDay: number) {
  const existing = f.entries.find((e) => e.key === key);
  const expiresOnDay = currentDay + durationDays;
  if (existing) existing.expiresOnDay = expiresOnDay;
  else f.entries.push({ key, expiresOnDay });
  saveWorldFlags(f);
}

export function hasFlag(f: WorldFlags, key: string, currentDay: number): boolean {
  const e = f.entries.find((x) => x.key === key);
  return !!e && e.expiresOnDay > currentDay;
}

/** Call occasionally (e.g. once per in-game day) to drop expired entries
 *  so the saved list doesn't grow forever. */
export function pruneExpired(f: WorldFlags, currentDay: number) {
  const before = f.entries.length;
  f.entries = f.entries.filter((e) => e.expiresOnDay > currentDay);
  if (f.entries.length !== before) saveWorldFlags(f);
}

export function activeFlagsRecord(f: WorldFlags, currentDay: number): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const e of f.entries) if (e.expiresOnDay > currentDay) out[e.key] = true;
  return out;
}
