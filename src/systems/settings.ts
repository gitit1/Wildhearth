import { SETTINGS_KEY } from "../config";

/**
 * Player-facing settings. Stored separately from game state so a new game
 * keeps them. `guidance` is the Guidance Mode (Part A #5) picked in the opening
 * sequence — Tutorial (step-by-step), Aspiration (background objectives), or
 * None (fully free). It is a normal, changeable setting, not a one-time flag,
 * except that switching TO Tutorial is blocked once left (enforced by the
 * Guidance engine, not here).
 */

/** End-of-day summary engine (Part A #7) — how much the day-rollover panel
 *  shows: nothing, a quick 3-line toast, or the full wood/gold panel with
 *  every non-zero ledger line + today's achievements. */
export type EndOfDaySummary = "none" | "quick" | "full";

/** Guidance Mode (Part A #5). */
export type Guidance = "tutorial" | "aspiration" | "none";

export interface Settings {
  version: number; guidance: Guidance; dayLengthSeconds: number;
  endOfDaySummary: EndOfDaySummary;
  /** What's New (Part E #2): the highest changelog id the player has seen, so
   *  newer entries can be tagged NEW and the menu can badge unseen updates.
   *  0 (or absent) = nothing seen yet. */
  lastSeenChangelogId: number;
}

function isEodMode(v: unknown): v is EndOfDaySummary {
  return v === "none" || v === "quick" || v === "full";
}
function isGuidance(v: unknown): v is Guidance {
  return v === "tutorial" || v === "aspiration" || v === "none";
}

// dayLengthSeconds = real seconds for one full in-game day. Default 1440
// (24 real minutes/day) matches the pace before the setting existed.
const DEFAULTS: Settings = {
  version: 1, guidance: "none", dayLengthSeconds: 1440, endOfDaySummary: "quick",
  lastSeenChangelogId: 0,
};
let cached: Settings | null = null;

export function loadSettings(): Settings {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    // tolerate junk / a bare value: only merge a real object over the defaults
    const p = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const merged: Settings = { ...DEFAULTS, ...(p as Partial<Settings>), version: 1 };
    if (!isEodMode(merged.endOfDaySummary)) merged.endOfDaySummary = DEFAULTS.endOfDaySummary;
    if (typeof merged.lastSeenChangelogId !== "number" || !Number.isFinite(merged.lastSeenChangelogId))
      merged.lastSeenChangelogId = 0;
    if (!isGuidance(merged.guidance)) {
      // migrate the legacy boolean `guided`: guided → gentle Aspiration (safe to
      // enable on an existing save — non-modal), open → None. Never revives a
      // forced tutorial on a mid-game save.
      merged.guidance = typeof p.guided === "boolean"
        ? (p.guided ? "aspiration" : "none")
        : DEFAULTS.guidance;
    }
    delete (merged as Partial<Settings> & { guided?: unknown }).guided;
    cached = merged;
  } catch { cached = { ...DEFAULTS }; }
  return cached!;
}

export function saveSettings(patch: Partial<Settings>) {
  cached = { ...loadSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cached)); } catch { /* private mode */ }
}

/** The current Guidance Mode. */
export function guidanceMode(): Guidance { return loadSettings().guidance; }

/** Set the Guidance Mode (the future Settings screen writes this too). */
export function setGuidance(g: Guidance) { saveSettings({ guidance: g }); }

export function endOfDaySummaryMode(): EndOfDaySummary { return loadSettings().endOfDaySummary; }

/** Real seconds per in-game day, clamped to a sane floor so the tick loop
 *  can't be driven into a pathological number of catch-up steps. */
export function dayLengthSeconds(): number {
  const d = loadSettings().dayLengthSeconds;
  return typeof d === "number" && d > 0 ? Math.max(1, d) : DEFAULTS.dayLengthSeconds;
}
