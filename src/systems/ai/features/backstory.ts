import { AI_BACKSTORY_KEY, AI_BACKSTORY_MAX, AI_BACKSTORY_MAX_TOKENS } from "../../../config";
import type { NpcDef } from "../../../data/npcs";
import { backstorySeed } from "../../../data/backstories";
import type { AiCtx } from "../aiCtx";

/**
 * NPC backstory generation (Part D feature #1, AI_ARCHITECTURE §D1).
 *
 * Flat fallback: the authored seed in data/backstories.ts — a complete, warm
 * 2-3 sentence backstory for every NPC. With AI on, on an NPC's first meaningful
 * interaction we ask ONCE for a richer version grounded in the seed + sheet,
 * validate it, and FREEZE it in a per-playthrough store (never rerolled, per the
 * doc's "backstory permanence" call). `text()` returns the generated version if
 * present, otherwise the seed — so callers never branch on whether AI ran.
 *
 * The store is persisted on its own key that IS in saves.ts's GAME_KEYS: a
 * generated backstory is canon for THIS life and a New Game starts fresh.
 * All prompt building lives here (the per-feature "one place" rule).
 */

interface StoreData { version: 1; byId: Record<string, string>; }

export interface Backstory {
  /** The generated backstory if one was frozen, else the authored seed. */
  text(def: NpcDef): string;
  /** The authored seed, always (used to seed the generation prompt). */
  seed(def: NpcDef): string;
  /** True once a richer version has been frozen for this NPC. */
  isGenerated(id: string): boolean;
  /** First meaningful interaction: generate ONCE in the background (never blocks,
   *  never rerolls). No-op with the feature off or if already generated. */
  ensureGenerated(def: NpcDef): void;
  /** New Game: drop every generated backstory (seeds remain). */
  reset(): void;
}

function fresh(): StoreData { return { version: 1, byId: {} }; }

function load(): StoreData {
  try {
    const raw = localStorage.getItem(AI_BACKSTORY_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<StoreData>;
    const out = fresh();
    if (p.byId && typeof p.byId === "object")
      for (const [id, v] of Object.entries(p.byId)) if (typeof v === "string" && v) out.byId[id] = v;
    return out;
  } catch { return fresh(); }
}

const AGE_WORD: Record<string, string> = { kid: "a child", adult: "an adult", elder: "an elder" };

/** The system prompt: the setting rules that keep a backstory in-world. Stable,
 *  so the facade's prompt cache can hold it across NPCs. */
const SYSTEM =
  "You write short character backstories for townsfolk in Wildhearth, a warm, " +
  "cozy pre-industrial farming village — think rustic cottages, market stalls, " +
  "fishing, foraging and hearths. No modern technology, no cities of glass, no " +
  "magic, no violence. Write in a gentle, grounded voice. Reply with prose only.";

/** The per-NPC generation prompt, seeded by the authored backstory. One place,
 *  per the AI_ARCHITECTURE prompts note. */
function buildPrompt(def: NpcDef): string {
  return [
    `Write a richer first-person backstory for this villager, 3 to 4 warm sentences.`,
    `Stay true to the seed below — deepen it, do not contradict it, invent no anachronisms.`,
    ``,
    `Name: ${def.name}`,
    `Profession: ${def.profession}`,
    `Personality: ${def.personality.replace(/-/g, " ")}`,
    `Age: ${AGE_WORD[def.ageBand] ?? def.ageBand}`,
    ``,
    `Seed backstory: "${backstorySeed(def.id, def.name)}"`,
    ``,
    `Reply with only ${def.name}'s backstory, in their own voice.`,
  ].join("\n");
}

export function createBackstory(ai: AiCtx): Backstory {
  const store = load();
  const inflight = new Set<string>();
  const persist = () => {
    try { localStorage.setItem(AI_BACKSTORY_KEY, JSON.stringify(store)); } catch { /* private mode */ }
  };

  return {
    text(def) { return store.byId[def.id] ?? backstorySeed(def.id, def.name); },
    seed(def) { return backstorySeed(def.id, def.name); },
    isGenerated(id) { return !!store.byId[id]; },

    ensureGenerated(def) {
      if (store.byId[def.id] || inflight.has(def.id)) return;   // frozen already / in progress
      if (!ai.enabled("backstories")) return;                   // flat fallback stands
      inflight.add(def.id);
      void (async () => {
        try {
          const res = await ai.request("backstories", {
            system: SYSTEM,
            user: buildPrompt(def),
            maxTokens: AI_BACKSTORY_MAX_TOKENS,
            npcId: def.id,
            cacheSalient: `backstory:${def.id}`,
            maxLen: AI_BACKSTORY_MAX,
          });
          // Freeze ONLY on success; a failure leaves the seed in place and lets a
          // later interaction try again — but never overwrites a frozen one.
          if (res.ok && !store.byId[def.id]) { store.byId[def.id] = res.text; persist(); }
        } finally {
          inflight.delete(def.id);
        }
      })();
    },

    reset() { store.byId = {}; persist(); },
  };
}
