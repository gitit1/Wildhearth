import { AI_ARCS_KEY, AI_ARC_VISIT_NOTE_MIN, AI_ARC_LIVELIHOOD_MIN } from "../../../config";

/**
 * Story-arc weaving — v1 light (Part D feature #6, AI_ARCHITECTURE §D5). A small
 * PLAIN-CODE play-pattern tracker: per-NPC talk counts by weekday, and activity
 * counters (casts / harvests / busks / forages / sales). A pure-code detector
 * turns those into short "arc notes" — "you visit me most on Fridays", "fishing
 * is the player's main livelihood" — which feed the dialogue-variation prompt so
 * NPCs can subtly acknowledge the player's patterns.
 *
 * No AI, no tokens here — just counters. Persisted per-playthrough on `AI_ARCS_KEY`
 * (in saves.ts's GAME_KEYS). With AI off the notes are simply never read (the
 * dialogue-variation prompt is the only consumer), so no scripted content changes.
 */

export type ActivityKind = "cast" | "harvest" | "busk" | "forage" | "sale";

interface ArcData {
  version: 1;
  talks: Record<string, number[]>;       // npcId -> counts indexed by day-of-week (0=Sun..6=Sat)
  activity: Record<string, number>;      // ActivityKind -> total count
}

export interface ArcTracker {
  recordTalk(npcId: string, dayOfWeek: number): void;
  recordActivity(kind: ActivityKind): void;
  /** Arc notes for one NPC's dialogue prompt: their visit-pattern + the player's
   *  livelihood. Empty until a pattern is strong enough to be worth voicing. */
  notesFor(npcId: string): string[];
  reset(): void;
  /** A read-only copy for the dev-observations panel / verification. */
  snapshot(): { talks: Record<string, number[]>; activity: Record<string, number> };
}

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LIVELIHOOD: Record<string, string> = {
  cast: "fishing is the player's main livelihood",
  harvest: "farming is the player's main livelihood",
  busk: "playing music is how the player mostly gets by",
  forage: "foraging is the player's main livelihood",
};

function fresh(): ArcData { return { version: 1, talks: {}, activity: {} }; }

function load(): ArcData {
  try {
    const raw = localStorage.getItem(AI_ARCS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<ArcData>;
    const out = fresh();
    if (p.talks && typeof p.talks === "object")
      for (const [id, arr] of Object.entries(p.talks))
        if (Array.isArray(arr)) out.talks[id] = arr.map((n) => (typeof n === "number" && n >= 0 ? n : 0)).slice(0, 7);
    if (p.activity && typeof p.activity === "object")
      for (const [k, n] of Object.entries(p.activity)) if (typeof n === "number" && n >= 0) out.activity[k] = n;
    return out;
  } catch { return fresh(); }
}

export function createArcs(): ArcTracker {
  const data = load();
  const persist = () => { try { localStorage.setItem(AI_ARCS_KEY, JSON.stringify(data)); } catch { /* private mode */ } };

  /** The player's dominant livelihood note, if any activity is clearly ahead. */
  function livelihoodNote(): string | null {
    let best: string | null = null, bestN = 0;
    for (const [k, n] of Object.entries(data.activity)) if (n > bestN) { bestN = n; best = k; }
    if (best && bestN >= AI_ARC_LIVELIHOOD_MIN && LIVELIHOOD[best]) return LIVELIHOOD[best]!;
    return null;
  }

  return {
    recordTalk(npcId, dayOfWeek) {
      const dow = ((dayOfWeek % 7) + 7) % 7;
      const arr = (data.talks[npcId] ??= [0, 0, 0, 0, 0, 0, 0]);
      arr[dow] = (arr[dow] ?? 0) + 1;
      persist();
    },
    recordActivity(kind) {
      data.activity[kind] = (data.activity[kind] ?? 0) + 1;
      persist();
    },
    notesFor(npcId) {
      const notes: string[] = [];
      const arr = data.talks[npcId];
      if (arr) {
        let bestDow = -1, bestN = 0;
        for (let i = 0; i < 7; i++) if ((arr[i] ?? 0) > bestN) { bestN = arr[i]!; bestDow = i; }
        if (bestN >= AI_ARC_VISIT_NOTE_MIN && bestDow >= 0) notes.push(`visits me most on ${DOW[bestDow]}s`);
      }
      const liv = livelihoodNote();
      if (liv) notes.push(liv);
      return notes;
    },
    reset() { data.talks = {}; data.activity = {}; persist(); },
    snapshot() { return { talks: { ...data.talks }, activity: { ...data.activity } }; },
  };
}
