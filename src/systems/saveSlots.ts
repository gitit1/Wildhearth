import { SLOT_KEY } from "../config";
import { currentSeason, type CalendarState, type Season } from "./calendar";

/**
 * Save-slot manifest (Save system, Part A #11) — a small "is there a game,
 * and what did it look like last time" record, separate from the per-store
 * save data every system already keeps on its own key. Refreshed only by the
 * manual save icon and the periodic autosave (never by the continuous
 * per-action saves the individual stores do on every mutation).
 *
 * v5-forward note: v1 ships exactly ONE slot. When multi-slot arrives, this
 * becomes an array of manifests (one per slot) and every key in
 * saves.ts's GAME_KEYS gets a `-slotN` suffix; the shape of a single
 * manifest below does not need to change to get there — just widen from
 * "one" to "many" and thread a slot number through the existing calls.
 */
export interface SlotManifest {
  version: number;
  slot: number;                                // always 1 in v1
  lastSavedAt: number;                          // real epoch ms
  calendarStamp: { season: Season; day: number };
  coins: number;
  /** Tutorial-in-progress marker, carried straight from settings.guided so a
   *  future "Continue Tutorial?" load prompt can read it without touching
   *  game state — see settings.ts. */
  guided?: boolean;
}

function isSeason(v: unknown): v is Season {
  return v === "spring" || v === "summer" || v === "autumn" || v === "winter";
}

/** The last-saved manifest, or null if no game has ever been saved (or the
 *  entry is corrupt) — main.ts uses this for "is there a game to continue?"
 *  richer than the plain boolean saves.ts's hasSavedGame() gives today. */
export function loadSlot(): SlotManifest | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SlotManifest> & { calendarStamp?: Partial<SlotManifest["calendarStamp"]> };
    if (typeof p.lastSavedAt !== "number") return null;
    return {
      version: 1,
      slot: 1,
      lastSavedAt: p.lastSavedAt,
      calendarStamp: {
        season: isSeason(p.calendarStamp?.season) ? p.calendarStamp!.season : "spring",
        day: typeof p.calendarStamp?.day === "number" ? p.calendarStamp!.day : 1,
      },
      coins: typeof p.coins === "number" ? p.coins : 0,
      guided: typeof p.guided === "boolean" ? p.guided : undefined,
    };
  } catch {
    return null;
  }
}

/** Refreshes the manifest right after a full-store save (manual or auto). */
export function stampSave(cal: CalendarState, coins: number, guided: boolean): void {
  const manifest: SlotManifest = {
    version: 1,
    slot: 1,
    lastSavedAt: Date.now(),
    calendarStamp: { season: currentSeason(cal), day: cal.day },
    coins,
    guided,
  };
  try { localStorage.setItem(SLOT_KEY, JSON.stringify(manifest)); } catch { /* private mode */ }
}
