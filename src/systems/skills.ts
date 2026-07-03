import { SKILLS_KEY, SKILL_GAIN_BASE } from "../config";

/**
 * UO-style skills: 0.0-100.0 per skill, three-state lock (up/down/locked).
 * Gains come from use, with diminishing returns near 100. No overall cap
 * yet — the cap and full lock enforcement arrive in MVP Step 7; for now
 * only "up" skills gain (locked/down never move, matching UO intuition).
 */

export type SkillLock = "up" | "down" | "locked";
export interface Skill { id: string; value: number; lock: SkillLock }
export interface Skills { list: Skill[] }

export const SKILL_NAMES: Record<string, string> = {
  fishing: "Fishing",
  foraging: "Foraging",
  farming: "Farming",
  busking: "Busking",
  haggling: "Haggling",
};

const SKILL_IDS = Object.keys(SKILL_NAMES);

export function createSkills(): Skills {
  return { list: SKILL_IDS.map((id) => ({ id, value: 0, lock: "up" as SkillLock })) };
}

export function loadSkills(): Skills {
  const fresh = createSkills();
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    if (!raw) return fresh;
    const data = JSON.parse(raw) as { version?: number; list?: Skill[] };
    if (Array.isArray(data.list)) {
      for (const s of data.list) {
        const mine = fresh.list.find((f) => f.id === s.id);
        if (mine && typeof s.value === "number") {
          mine.value = Math.max(0, Math.min(100, s.value));
          if (s.lock === "up" || s.lock === "down" || s.lock === "locked") mine.lock = s.lock;
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

/**
 * Grants use-based gain with diminishing returns near 100.
 * Returns the amount actually gained (0 if locked/down or already maxed).
 */
export function gainSkill(s: Skills, id: string): number {
  const sk = getSkill(s, id);
  if (!sk || sk.lock !== "up" || sk.value >= 100) return 0;
  const gain = Math.max(0.01, SKILL_GAIN_BASE * (1 - sk.value / 100));
  const applied = Math.min(gain, 100 - sk.value);
  sk.value = Math.round((sk.value + applied) * 10) / 10;
  saveSkills(s);
  return Math.round(applied * 10) / 10;
}

/** Cycles a skill's lock up -> down -> locked -> up (UO-style arrow toggle). */
export function cycleLock(s: Skills, id: string): SkillLock | null {
  const sk = getSkill(s, id);
  if (!sk) return null;
  sk.lock = sk.lock === "up" ? "down" : sk.lock === "down" ? "locked" : "up";
  saveSkills(s);
  return sk.lock;
}
