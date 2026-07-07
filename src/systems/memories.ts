import { MEMORIES_KEY } from "../config";
import { currentSeason, type CalendarState, type Season } from "./calendar";

/**
 * Memories — the life-event half of the Memory Book: a CURATED log of
 * moments that mattered (first sale, first animal, the farm made whole),
 * each stamped with the in-game date. Deliberately curated, not an
 * everything-logger — that's a documented failure mode this design avoids.
 */

export interface MemoryEntry {
  key: string; text: string; season: Season; day: number;
  /** Optional AI event-narration flavor line (Part D #5). The canonical `text`
   *  never changes; this is an extra sentence attached late if generated in time. */
  flavor?: string;
}
export interface Memories { version: number; entries: MemoryEntry[] }

function fresh(): Memories {
  return { version: 1, entries: [] };
}

export function loadMemories(): Memories {
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Memories>;
    const entries = Array.isArray(p.entries)
      ? p.entries
          .filter((e): e is MemoryEntry =>
            !!e && typeof e.key === "string" && typeof e.text === "string" &&
            typeof e.day === "number" && typeof e.season === "string")
          .map((e) => (typeof e.flavor === "string" ? e : { key: e.key, text: e.text, season: e.season, day: e.day }))
      : [];
    return { version: 1, entries };
  } catch {
    return fresh();
  }
}

export function saveMemories(m: Memories) {
  try { localStorage.setItem(MEMORIES_KEY, JSON.stringify(m)); } catch { /* private mode */ }
}

export function resetMemories(m: Memories) {
  m.entries = [];
  saveMemories(m);
}

/** Writes a memory once per key (a "first" only happens once).
 *  Returns true when the entry was actually added. */
export function addMemory(m: Memories, key: string, text: string, cal: CalendarState): boolean {
  if (m.entries.some((e) => e.key === key)) return false;
  m.entries.push({ key, text, season: currentSeason(cal), day: cal.day });
  saveMemories(m);
  return true;
}

/** Attaches an AI event-narration flavor line to an existing memory (Part D #5),
 *  once — the canonical text is never touched. Returns true if attached. */
export function attachMemoryFlavor(m: Memories, key: string, flavor: string): boolean {
  const e = m.entries.find((x) => x.key === key);
  if (!e || e.flavor) return false;
  e.flavor = flavor;
  saveMemories(m);
  return true;
}
