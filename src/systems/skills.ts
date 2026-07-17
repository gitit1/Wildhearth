import {
  SKILLS_KEY, SKILL_GAIN_BASE, SKILL_CAP, GAIN_GUARD_FAILS,
  SKILL_DECAY_IDLE_DAYS, SKILL_DECAY_PER_DAY, SKILL_TIER_FLOORS,
} from "../config";

/**
 * UO-style skills: 0.0-100.0 per skill, three-state lock (up/down/locked),
 * total budget SKILL_CAP paid for by "down" skills at the cap. Gains are
 * chance-based per use (chance shrinks toward 100 — same expected pace as
 * the old always-gain diminishing amounts) with a UO-style Gain Guard: a
 * handful of failed rolls in a row forces the next one to succeed.
 *
 * Neglect-decay (DECISIONS "Decay: unused skills decay slowly"): each skill
 * counts the in-game days since it was last exercised (`idleDays`); past a grace
 * window it slowly loses points per idle day, floored at the bottom of the score
 * TIER it has reached (Novice/Skilled/Expert) so earned tiers are never lost.
 */

export type SkillLock = "up" | "down" | "locked";
export interface Skill { id: string; value: number; lock: SkillLock; fails: number; idleDays: number }
export interface Skills { list: Skill[] }

/** Score tier (DECISIONS "0-100 per skill + tiers Novice/Skilled/Expert"). */
export type SkillTier = "Novice" | "Skilled" | "Expert";
export function skillTier(value: number): SkillTier {
  if (value >= SKILL_TIER_FLOORS[1]) return "Expert";
  if (value >= SKILL_TIER_FLOORS[0]) return "Skilled";
  return "Novice";
}
/** The lowest value the current tier keeps — neglect-decay never crosses it. */
function tierFloor(value: number): number {
  if (value >= SKILL_TIER_FLOORS[1]) return SKILL_TIER_FLOORS[1];
  if (value >= SKILL_TIER_FLOORS[0]) return SKILL_TIER_FLOORS[0];
  return 0;
}

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
  // AX-2: the 10th skill — trained by chopping trees (the wood chain). Higher
  // tiers chop a touch faster and Expert drops an extra log (see config.ts).
  // Auto-listed by the skills window (it reads this map); a pre-AX-2 save simply
  // starts it at 0 (loadSkills seeds every id in SKILL_IDS, merges stored values).
  woodcutting: "Woodcutting",
};

const SKILL_IDS = Object.keys(SKILL_NAMES);

export function createSkills(): Skills {
  return { list: SKILL_IDS.map((id) => ({ id, value: 0, lock: "up" as SkillLock, fails: 0, idleDays: 0 })) };
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
          mine.idleDays = typeof s.idleDays === "number" ? Math.max(0, Math.floor(s.idleDays)) : 0;
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
 *
 * `chanceMult` scales the success chance — the Needs engine passes a mood
 * multiplier (VISION #13: "mood affects work performance / skill gain rate").
 * A poor mood makes gains rarer; a great one, slightly more common.
 */
export function gainSkill(s: Skills, id: string, chanceMult = 1): number {
  const sk = getSkill(s, id);
  if (!sk) return 0;
  sk.idleDays = 0;   // any use of the skill resets its neglect-decay clock
  if (sk.lock !== "up" || sk.value >= 100) { saveSkills(s); return 0; }

  // the gain-chance roll, with the Gain Guard pity counter
  const chance = Math.max(0.01, Math.min(1, (1 - sk.value / 100) * chanceMult));
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

/**
 * Deliberate learning — a PAID lesson from a teacher NPC (VISION §skills:
 * "Skills also rise from deliberate learning — a teacher NPC… which is faster
 * than grinding"). Unlike gainSkill this is DETERMINISTIC (you paid, you learn):
 * it adds a fixed `amount`, no gain-roll, no Gain-Guard. It still RESPECTS THE
 * CAPS — the 0-100 per-skill ceiling and the total SKILL_CAP budget (freeing room
 * from "down"-marked skills exactly as gainSkill does). Locked skills don't move.
 * Any lesson also resets the neglect-decay clock. Returns the amount applied.
 */
export function teachSkill(s: Skills, id: string, amount: number): number {
  const sk = getSkill(s, id);
  if (!sk) return 0;
  sk.idleDays = 0;
  if (sk.lock === "locked" || sk.value >= 100) { saveSkills(s); return 0; }

  let applied = r1(Math.min(amount, 100 - sk.value));
  const capRoom = Math.max(0, r1(SKILL_CAP - totalSkills(s)));
  if (applied > capRoom) {
    // free the difference from "down" skills, richest first (mirrors gainSkill)
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

/**
 * Neglect-decay (DECISIONS "unused skills decay slowly") — call once per new
 * in-game day (mirrors decayRelationships). Every non-locked skill banks an idle
 * day; once idle past SKILL_DECAY_IDLE_DAYS it sheds SKILL_DECAY_PER_DAY points
 * per idle day, but never below the floor of the score tier it has reached
 * (Novice/Skilled/Expert), so an earned tier is never lost. Locked skills are
 * frozen and never decay. `days` folds a multi-day skip (sleeping) into one call.
 * Returns the ids that actually lost points (caller may surface a gentle note).
 */
export function decaySkills(s: Skills, days = 1): string[] {
  const decayed: string[] = [];
  for (const sk of s.list) {
    if (sk.lock === "locked") continue;         // frozen skills never decay
    sk.idleDays += days;
    const over = sk.idleDays - SKILL_DECAY_IDLE_DAYS;   // idle days past the grace window
    if (over <= 0 || sk.value <= 0) continue;
    const floor = tierFloor(sk.value);
    if (sk.value <= floor) continue;            // already resting on its tier boundary
    const next = r1(Math.max(floor, sk.value - SKILL_DECAY_PER_DAY * Math.min(over, days)));
    if (next < sk.value) { sk.value = next; decayed.push(sk.id); }
  }
  saveSkills(s);
  return decayed;
}

/** Cycles a skill's lock up -> down -> locked -> up (UO-style arrow toggle). */
export function cycleLock(s: Skills, id: string): SkillLock | null {
  const sk = getSkill(s, id);
  if (!sk) return null;
  sk.lock = sk.lock === "up" ? "down" : sk.lock === "down" ? "locked" : "up";
  saveSkills(s);
  return sk.lock;
}
