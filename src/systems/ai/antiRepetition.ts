import {
  AI_ANTIREP_KEY, AI_ANTIREP_LINES, AI_ANTIREP_SCRIPTED,
  AI_ANTIREP_PROMPT_LINES, AI_DEDUP_OVERLAP,
} from "../../config";

/**
 * Anti-repetition memory (Part D feature #7, AI_ARCHITECTURE §D7). Infrastructure
 * every generative feature reads and writes, so it lives at the top of `ai/`
 * rather than under `features/`. It has TWO jobs:
 *
 *  (a) Feed the prompts: `recentLines(npc)` is the "do not reuse these phrasings"
 *      block; after a generated line is shown, `recordLine()` remembers it, and
 *      `isNearDuplicate()` rejects a fresh line too close to a recent one (token-
 *      set overlap) so a retried/cached line never reads as a repeat.
 *
 *  (b) Persist scripted variety: the dialogue engine's tie-break rotation was
 *      session-only. `recordScripted()` / `recentScripted()` remember the last
 *      few authored lines an NPC actually said, so the picker can avoid them
 *      ACROSS sessions — variety that survives a reload, not just a session.
 *
 * Persisted on its OWN versioned key that IS listed in saves.ts's GAME_KEYS: the
 * said-history is per-playthrough (a New Game meets everyone fresh), unlike the
 * budget ledger / response cache which are per-machine. Tolerant, private-mode
 * safe, never throws into game code.
 */

interface NpcMemory { lines: string[]; scripted: string[]; }
interface Store { version: 1; byId: Record<string, NpcMemory>; }

export interface AntiRepetition {
  /** Recent AI-line texts for an NPC — the prompt "don't reuse" exclusion block. */
  recentLines(npcId: string): string[];
  /** Remember a generated line actually shown (bounded ring, persisted). */
  recordLine(npcId: string, text: string): void;
  /** The recent authored lines an NPC said — the picker avoids these for variety. */
  recentScripted(npcId: string): Set<string>;
  /** Remember an authored line actually shown (bounded ring, persisted). */
  recordScripted(npcId: string, text: string): void;
  /** True when `text` overlaps a recent AI line enough to read as a repeat. */
  isNearDuplicate(npcId: string, text: string): boolean;
  /** New Game: forget everything everyone ever said. */
  reset(): void;
  /** Total remembered lines across all NPCs (verification helper). */
  size(): number;
}

function freshMem(): NpcMemory { return { lines: [], scripted: [] }; }
function fresh(): Store { return { version: 1, byId: {} }; }

function load(): Store {
  try {
    const raw = localStorage.getItem(AI_ANTIREP_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Store>;
    const out = fresh();
    if (p.byId && typeof p.byId === "object") {
      for (const [id, m] of Object.entries(p.byId as Record<string, Partial<NpcMemory>>)) {
        out.byId[id] = {
          lines: Array.isArray(m?.lines) ? m!.lines.filter((x): x is string => typeof x === "string") : [],
          scripted: Array.isArray(m?.scripted) ? m!.scripted.filter((x): x is string => typeof x === "string") : [],
        };
      }
    }
    return out;
  } catch { return fresh(); }
}

/** lowercase word set, punctuation stripped — the unit of the overlap check. */
function tokenSet(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));
}

/** overlap = |A∩B| / min(|A|,|B|) — 1 means one line's meaningful words are a
 *  subset of the other's; robust to length differences. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

export function createAntiRepetition(): AntiRepetition {
  const store = load();

  const persist = () => {
    try { localStorage.setItem(AI_ANTIREP_KEY, JSON.stringify(store)); } catch { /* private mode */ }
  };
  const mem = (id: string): NpcMemory => (store.byId[id] ??= freshMem());

  const pushBounded = (arr: string[], text: string, cap: number) => {
    const t = text.trim();
    if (!t) return;
    // drop an exact prior copy so it moves to the front, then cap
    const i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
    arr.push(t);
    while (arr.length > cap) arr.shift();
  };

  return {
    recentLines(npcId) {
      const m = store.byId[npcId];
      if (!m) return [];
      return m.lines.slice(-AI_ANTIREP_PROMPT_LINES);
    },
    recordLine(npcId, text) {
      pushBounded(mem(npcId).lines, text, AI_ANTIREP_LINES);
      persist();
    },
    recentScripted(npcId) {
      const m = store.byId[npcId];
      return new Set(m ? m.scripted : []);
    },
    recordScripted(npcId, text) {
      pushBounded(mem(npcId).scripted, text, AI_ANTIREP_SCRIPTED);
      persist();
    },
    isNearDuplicate(npcId, text) {
      const m = store.byId[npcId];
      if (!m || m.lines.length === 0) return false;
      const cand = tokenSet(text);
      for (const prior of m.lines) if (overlap(cand, tokenSet(prior)) >= AI_DEDUP_OVERLAP) return true;
      return false;
    },
    reset() {
      store.byId = {};
      persist();
    },
    size() {
      let n = 0;
      for (const id in store.byId) n += store.byId[id]!.lines.length;
      return n;
    },
  };
}
