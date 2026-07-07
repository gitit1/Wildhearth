import { AI_THOUGHT_MAX, AI_THOUGHT_MAX_TOKENS } from "../../../config";
import type { NpcDef } from "../../../data/npcs";
import { THOUGHT_TEMPLATES, fillThought } from "../../../data/thoughts";
import type { WorldContext } from "../../worldContext";
import { mulberry32 } from "../../../engine/rng";
import type { AiCtx } from "../aiCtx";

/**
 * NPC "current thought" (Part D feature #4, AI_ARCHITECTURE §D4). Each NPC holds
 * one thought, refreshed at most once per in-game day, LAZILY — computed only
 * when about to be shown ("What's on your mind?", or the ambient bubble). The
 * flat fallback is a deterministic pick from data/thoughts.ts filled with live
 * season/weather; with AI on, a one-sentence generated line replaces it for the
 * rest of that day when it arrives (never blocks — the template shows now).
 *
 * Not persisted: a thought is cheap and day-scoped, so a reload simply
 * recomputes today's. `reset()` clears the in-memory cache on a New Game.
 */

interface Held { dayKey: string; text: string; aiTried: boolean; }

export interface Thoughts {
  /** The NPC's thought for the current in-game day (computes + may refresh once). */
  current(def: NpcDef, wc: WorldContext): string;
  /** The already-computed thought, or null — no compute, no AI (prompt feed). */
  peek(id: string): string | null;
  /** New Game: forget every current thought. */
  reset(): void;
}

const SYSTEM =
  "You voice a single passing thought for a villager in Wildhearth, a warm, cozy " +
  "pre-industrial farming village. No modern things, no magic, no violence. One " +
  "short present-tense sentence, in the character's own voice. Prose only.";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function dayKeyOf(wc: WorldContext): string {
  return wc.calendar ? `${wc.calendar.season}-${wc.calendar.day}` : "d0";
}

/** Deterministic template pick + slot-fill for (npc, day) — stable all day, but
 *  a different thought tomorrow. */
function templateThought(def: NpcDef, wc: WorldContext, dayKey: string): string {
  const pool = THOUGHT_TEMPLATES[def.personality];
  const rng = mulberry32(hash(`${def.id}|${dayKey}`));
  const t = pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
  const season = wc.calendar?.season ?? "spring";
  const weather = wc.weather?.state ?? "clear";
  return fillThought(t, season, weather);
}

function buildPrompt(def: NpcDef, wc: WorldContext): string {
  const c = wc.calendar;
  const w = wc.weather;
  return [
    `Give one passing thought ${def.name} might have right now.`,
    ``,
    `Name: ${def.name}`,
    `Profession: ${def.profession}`,
    `Personality: ${def.personality.replace(/-/g, " ")}`,
    c ? `Season: ${c.season}, ${c.phase}` : ``,
    w ? `Weather: ${w.state}` : ``,
    ``,
    `Reply with only the thought — one short sentence.`,
  ].filter(Boolean).join("\n");
}

export function createThoughts(ai: AiCtx): Thoughts {
  const held = new Map<string, Held>();

  const refreshAi = (def: NpcDef, wc: WorldContext, dayKey: string) => {
    void (async () => {
      const res = await ai.request("thoughts", {
        system: SYSTEM,
        user: buildPrompt(def, wc),
        maxTokens: AI_THOUGHT_MAX_TOKENS,
        npcId: def.id,
        cacheSalient: `thought:${def.id}:${dayKey}`,
        maxLen: AI_THOUGHT_MAX,
      });
      const cur = held.get(def.id);
      // Only apply if we're still on the same day it was requested for.
      if (res.ok && cur && cur.dayKey === dayKey) held.set(def.id, { ...cur, text: res.text });
    })();
  };

  return {
    current(def, wc) {
      const dayKey = dayKeyOf(wc);
      const cur = held.get(def.id);
      if (cur && cur.dayKey === dayKey) return cur.text;
      // stale (or first time this day): template now, fire one AI refresh for the day
      const text = templateThought(def, wc, dayKey);
      const aiTried = ai.enabled("thoughts");
      held.set(def.id, { dayKey, text, aiTried });
      if (aiTried) refreshAi(def, wc, dayKey);
      return text;
    },
    peek(id) { return held.get(id)?.text ?? null; },
    reset() { held.clear(); },
  };
}
