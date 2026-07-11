/**
 * Teaching (v2 BLOCK #6 slice 3) — the VISION pillar "skills also rise from
 * deliberate learning — a teacher NPC… which is faster than grinding." This is
 * the small persistent LEDGER + cadence rules; main.ts orchestrates the actual
 * paid lesson (coin sink + `teachSkill` bump + toasts) from Nerys' dialogue
 * service option, because that needs the economy + skills it doesn't own here.
 *
 * A lesson is paced to one per teacher per in-game day (an apprenticeship, not a
 * shortcut to mastery) and its Fishing bump diminishes as the skill climbs. The
 * lesson COUNT also earns Nerys' trust for the Master Rod (config MASTER_ROD_
 * LESSONS). Store convention matches transport.ts/discovery.ts: versioned,
 * corrupt-tolerant, private-mode safe, nothing at import time.
 */
import { TEACHING_KEY, LESSON_GAIN_BASE, LESSON_GAIN_MIN } from "../config";
import { absoluteDay, type CalendarState } from "./calendar";

export interface Teaching {
  version: 1;
  /** per teacher NPC id → lessons taken + the last in-game day one was taken. */
  lessons: Record<string, { count: number; lastDay: number }>;
}

function fresh(): Teaching {
  return { version: 1, lessons: {} };
}

export function loadTeaching(): Teaching {
  try {
    const raw = localStorage.getItem(TEACHING_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Teaching>;
    const out = fresh();
    if (p.lessons && typeof p.lessons === "object") {
      for (const [id, rec] of Object.entries(p.lessons)) {
        const r = rec as Partial<{ count: number; lastDay: number }>;
        out.lessons[id] = {
          count: Math.max(0, Math.floor(typeof r.count === "number" ? r.count : 0)),
          lastDay: Math.floor(typeof r.lastDay === "number" ? r.lastDay : 0),
        };
      }
    }
    return out;
  } catch {
    return fresh();
  }
}

export function saveTeaching(t: Teaching) {
  try { localStorage.setItem(TEACHING_KEY, JSON.stringify(t)); } catch { /* private mode */ }
}

/** New Game: forget every lesson ever taken. */
export function resetTeaching(t: Teaching) {
  t.lessons = {};
  saveTeaching(t);
}

/** How many lessons the player has taken from this teacher (earns rod trust). */
export function lessonsTaken(t: Teaching, npcId: string): number {
  return t.lessons[npcId]?.count ?? 0;
}

/** One lesson per teacher per in-game day. */
export function canLearnToday(t: Teaching, npcId: string, cal: CalendarState): boolean {
  return (t.lessons[npcId]?.lastDay ?? -1) !== absoluteDay(cal);
}

/** The Fishing points a lesson grants at the current skill — faster than
 *  grinding (0.3/success), diminishing as it climbs, always at least the floor. */
export function lessonGain(currentSkill: number): number {
  return Math.max(LESSON_GAIN_MIN, Math.round(LESSON_GAIN_BASE * (1 - currentSkill / 100)));
}

/** Record that a lesson was taken today (bumps the count + stamps the day). */
export function recordLesson(t: Teaching, npcId: string, cal: CalendarState) {
  const rec = t.lessons[npcId] ?? { count: 0, lastDay: -1 };
  rec.count += 1;
  rec.lastDay = absoluteDay(cal);
  t.lessons[npcId] = rec;
  saveTeaching(t);
}
