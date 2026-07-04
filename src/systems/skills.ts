import { SKILLS_KEY, SKILL_GAIN_BASE, SKILL_CAP, GAIN_GUARD_FAILS } from "../config";

/**
 * UO-style skills: 0.0-100.0 per skill, three-state lock (up/down/locked),
 * total budget SKILL_CAP paid for by "down" skills at the cap. Gains are
 * chance-based per use (chance shrinks toward 100 — same expected pace as
 * the old always-gain diminishing amounts) with a UO-style Gain Guard: a
 * handful of failed rolls in a row forces the next one to succeed.
 */

export type SkillLock = "up" | "down" | "locked";
export interface Skill { id: string; value: number; lock: SkillLock; fails: number }
export interface Skills { list: Skill[] }

export const SKILL_NAMES: Record<string, string> = {
  fishing: "Fishing",
  foraging: "Foraging",
  farming: "Farming",
  busking: "Busking",
  haggling: "Haggling",
  husbandry: "Animal Husbandry",
  cooking: "Cooking",
  building: "Building",
  gardening: "Gardening",
};

const SKILL_IDS = Object.keys(SKILL_NAMES);

export function createSkills(): Skills {
  return { list: SKILL_IDS.map((id) => ({ id, value: 0, lock: "up" as SkillLock, fails: 0 })) };
}

export function loadSkills(): Skills {
  const fresh = createSkills();
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as { version?: number; list?: Partial<Skill>[] };
    if (Array.isArray(data.list)) {
      for (const s of data.list) {
        const mine = fresh.list.find((f) => f.id === s.id);
        if (mine && typeof s.value === "number") {
          mine.value = Math.max(0, Math.min(100, s.value));
          if (s.lock === "up" || s.lock === "down" || s.lock === "locked") mine.lock = s.lock;
          mine.fails = typeof s.fails === "number" ? Math.max(0, Math.floor(s.fails)) : 0;
        }
      }
    }
  } catch { /* corrupted save -> fresh skills */ }
  return fresh;
}

export function saveSkills(s: Skills) {
  try { localStorage.setItem(SKILLS_KEY, JSON.stringify({ version: 1, list: s.list })); }
  catch { /* private mode */ }
}

export function getSkill(s: Skills, id: string): Skill | null {
  return s.list.find((x) => x.id === id) ?? null;
}

export function skillValue(s: Skills, id: string): number {
  return getSkill(s, id)?.value ?? 0;
}

export function totalSkills(s: Skills): number {
  return r1(s.list.reduce((sum, x) => sum + x.value, 0));
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Rolls a use-based gain, UO-style. The roll's success chance shrinks as the
 * skill climbs (1 - value/100 — the same expected pace as the old always-gain
 * diminishing amounts: chance × flat gain ≡ old shrinking gain). The Gain
 * Guard tracks consecutive failed rolls per skill and forces a success past
 * GAIN_GUARD_FAILS, so a streak of bad luck never reads as a dead skill.
 * Under the total cap: only "up" skills gain; at the cap, gains are paid for
 * by draining "down"-marked skills — with nothing marked down, nothing gains.
 * Locked skills never move. Returns the amount actually gained (0 if none).
 */
export function gainSkill(s: Skills, id: string): number {
  const sk = getSkill(s, id);
  if (!sk || sk.lock !== "up" || sk.value >= 100) return 0;

  // the gain-chance roll, with the Gain Guard pity counter
  const chance = Math.max(0.01, 1 - sk.value / 100);
  const forced = sk.fails >= GAIN_GUARD_FAILS;
  if (!forced && Math.random() >= chance) {
    sk.fails += 1;
    saveSkills(s);
    return 0;
  }
  sk.fails = 0;

  let applied = r1(Math.min(SKILL_GAIN_BASE, 100 - sk.value));
  const capRoom = Math.max(0, r1(SKILL_CAP - totalSkills(s)));
  if (applied > capRoom) {
    // free the difference from "down" skills, richest first
    let need = r1(applied - capRoom);
    let freed = 0;
    const downs = s.list
      .filter((x) => x.lock === "down" && x.value > 0 && x.id !== id)
      .sort((a, b) => b.value - a.value);
    for (const d of downs) {
      if (freed >= need) break;
      const take = r1(Math.min(d.value, need - freed));
      d.value = r1(d.value - take);
      freed = r1(freed + take);
    }
    applied = r1(capRoom + freed);
  }
  if (applied <= 0) { saveSkills(s); return 0; }
  sk.value = r1(sk.value + applied);
  saveSkills(s);
  return applied;
}

/** Cycles a skill's lock up -> down -> locked -> up (UO-style arrow toggle). */
export function cycleLock(s: Skills, id: string): SkillLock | null {
  const sk = getSkill(s, id);
  if (!sk) return null;
  sk.lock = sk.lock === "up" ? "down" : sk.lock === "down" ? "locked" : "up";
  saveSkills(s);
  return sk.lock;
}
