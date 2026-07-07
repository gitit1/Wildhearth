import { AI_QUEST_MAX_TOKENS, AI_QUEST_MIN_INTERVAL_DAYS } from "../../../config";
import type { WorldContext } from "../../worldContext";
import type { AiCtx } from "../aiCtx";

/**
 * Quest generation — validated STUB (Part D feature #3, AI_ARCHITECTURE §D3).
 *
 * v1 has no quest system (fixed quests are a v2 block), so this proves the
 * end-to-end pipeline WITHOUT surfacing anything to the player: at most once per
 * in-game day, when the feature is on, it builds a quest-offer prompt from world
 * state, asks via `requestAction`, validates against the CLOSED `offer_quest`
 * schema, and stashes the result for the debug panel ("Latest AI quest offer (v2
 * preview)"). Nothing is ever shown to the player or applied to game state.
 *
 * This hands v2 a working generator: the prompt builder + the validated round-trip
 * are exactly what a real quest system will call — it just needs a quest catalog
 * and a UI to accept the offer.
 */

export interface QuestOffer {
  questId: string;
  title: string;
  text: string;
  reward: number;
  day: number;     // in-game absolute day it was generated
}

export interface QuestStub {
  /** Day-rollover hook: attempt a generation if the min interval has passed. */
  maybeGenerateDaily(wc: WorldContext, absoluteDay: number): void;
  /** The latest validated offer, for the debug panel. Never shown to the player. */
  latest(): QuestOffer | null;
  reset(): void;
}

const SYSTEM =
  "You are a quest designer for Wildhearth, a warm pre-industrial farming village. " +
  "Propose one small, gentle errand an NPC might offer the player, fitting the " +
  "world state. No combat, no danger. Return a single offer_quest action: " +
  "{ type:'offer_quest', questId (a short slug), title, text (one or two sentences), " +
  "reward (coins, 0-500) }.";

function topSkill(skills: Readonly<Record<string, number>>): string {
  let best = "none", bestV = -1;
  for (const [k, v] of Object.entries(skills)) if (v > bestV) { bestV = v; best = k; }
  return best;
}

function buildPrompt(wc: WorldContext): string {
  const c = wc.calendar;
  const w = wc.weather;
  const farmParts = Object.entries(wc.farm).filter(([, v]) => !v).map(([k]) => k);
  return [
    `World state:`,
    c ? `- Season ${c.season}, day ${c.day}, ${c.phase}` : ``,
    w ? `- Weather ${w.state} (${w.daysSinceChange} days running)` : ``,
    `- Player coins: ${wc.coins}`,
    `- Strongest skill: ${topSkill(wc.skills)}`,
    farmParts.length ? `- Farm still needs: ${farmParts.join(", ")}` : `- Farm fully repaired`,
    ``,
    `Propose one fitting quest offer as an offer_quest action.`,
  ].filter(Boolean).join("\n");
}

export function createQuestStub(ai: AiCtx): QuestStub {
  let last: QuestOffer | null = null;
  let lastAttemptDay = -Infinity;

  return {
    maybeGenerateDaily(wc, absoluteDay) {
      if (!ai.enabled("quests")) return;
      if (absoluteDay - lastAttemptDay < AI_QUEST_MIN_INTERVAL_DAYS) return;
      lastAttemptDay = absoluteDay;
      void (async () => {
        const res = await ai.requestAction("quests", {
          system: SYSTEM,
          user: buildPrompt(wc),
          maxTokens: AI_QUEST_MAX_TOKENS,
          cacheSalient: `quest:${absoluteDay}`,
          // no questExists ref — there is no catalog in v1; the slug shape is
          // still validated by the schema.
        });
        if (res.ok && res.action.type === "offer_quest") {
          const a = res.action;
          last = { questId: a.questId, title: a.title, text: a.text, reward: a.reward, day: absoluteDay };
        }
      })();
    },
    latest() { return last; },
    reset() { last = null; lastAttemptDay = -Infinity; },
  };
}
