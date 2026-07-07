import { AI_DEVNOTES_KEY, AI_DEVNOTES_STALE_DAYS } from "../../../config";

/**
 * Improvement observation (Part D feature #8, AI_ARCHITECTURE §D8) — dev-facing,
 * default OFF (its own checkbox). This v1 version spends NO tokens: it keeps
 * plain-code counters of what the player does (which activities, how recently)
 * and renders human-readable observations for the debug panel's "Dev
 * observations" section. It is never shown to the player.
 *
 * The AI-summarization step ("player skipped fishing 5 sessions — this hook may
 * be weak", phrased by the model) is deliberately deferred to v2; v1 stops at the
 * plain-code notes so it costs nothing and can run without a key. Persisted
 * per-playthrough on `AI_DEVNOTES_KEY` (saves.ts GAME_KEYS).
 */

interface DevData {
  version: 1;
  firstDay: number;
  lastUsed: Record<string, number>;   // activity kind -> last in-game day used
  totals: Record<string, number>;     // activity kind -> total count
}

/** The activities we watch, with a human label. */
const WATCHED: Array<{ id: string; label: string }> = [
  { id: "fish", label: "fishing" },
  { id: "farm", label: "farming" },
  { id: "busk", label: "busking" },
  { id: "forage", label: "foraging" },
  { id: "cook", label: "cooking" },
  { id: "sell", label: "selling" },
  { id: "talk", label: "talking to townsfolk" },
  { id: "gift", label: "gift-giving" },
];

export interface DevNotes {
  /** Count one activity use on the given in-game day (no-op-cheap, token-free). */
  observe(kind: string, day: number): void;
  /** Human-readable observations for the debug panel, given the current day. */
  notes(day: number): string[];
  reset(): void;
}

function fresh(): DevData { return { version: 1, firstDay: -1, lastUsed: {}, totals: {} }; }

function load(): DevData {
  try {
    const raw = localStorage.getItem(AI_DEVNOTES_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<DevData>;
    const out = fresh();
    out.firstDay = typeof p.firstDay === "number" ? p.firstDay : -1;
    if (p.lastUsed && typeof p.lastUsed === "object")
      for (const [k, v] of Object.entries(p.lastUsed)) if (typeof v === "number") out.lastUsed[k] = v;
    if (p.totals && typeof p.totals === "object")
      for (const [k, v] of Object.entries(p.totals)) if (typeof v === "number") out.totals[k] = v;
    return out;
  } catch { return fresh(); }
}

export function createDevNotes(): DevNotes {
  const data = load();
  const persist = () => { try { localStorage.setItem(AI_DEVNOTES_KEY, JSON.stringify(data)); } catch { /* private mode */ } };

  return {
    observe(kind, day) {
      if (data.firstDay < 0) data.firstDay = day;
      data.lastUsed[kind] = day;
      data.totals[kind] = (data.totals[kind] ?? 0) + 1;
      persist();
    },
    notes(day) {
      const out: string[] = [];
      // most / least engaged with
      let most: string | null = null, mostN = 0;
      for (const w of WATCHED) {
        const n = data.totals[w.id] ?? 0;
        if (n > mostN) { mostN = n; most = w.label; }
      }
      if (most) out.push(`Most-used: ${most} (${mostN}×).`);
      // stale hooks — used at least once, but not lately
      for (const w of WATCHED) {
        const last = data.lastUsed[w.id];
        if (last === undefined) continue;
        const gap = day - last;
        if (gap >= AI_DEVNOTES_STALE_DAYS) out.push(`${cap(w.label)} last done ${gap} days ago — this hook may be going cold.`);
      }
      // never touched at all (only once she's played a few days)
      if (data.firstDay >= 0 && day - data.firstDay >= AI_DEVNOTES_STALE_DAYS) {
        const never = WATCHED.filter((w) => (data.totals[w.id] ?? 0) === 0).map((w) => w.label);
        if (never.length) out.push(`Never tried: ${never.join(", ")}.`);
      }
      out.push("(AI summarization of these observations is a v2 step.)");
      return out;
    },
    reset() { data.firstDay = -1; data.lastUsed = {}; data.totals = {}; persist(); },
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
