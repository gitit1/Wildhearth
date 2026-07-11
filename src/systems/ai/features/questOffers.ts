import {
  AI_QUEST_MAX_TOKENS, QUEST_AI_OFFER_MIN_INTERVAL_DAYS, QUEST_AI_REWARD_CLAMP,
} from "../../../config";
import { isAiTemplate } from "../../../data/quests";
import type { AiOffer } from "../../quests";
import type { WorldContext } from "../../worldContext";
import type { AiCtx } from "../aiCtx";

/**
 * D3 — AI dynamic quest offers (AI_ARCHITECTURE §D3), promoted from the v1 stub.
 *
 * Occasionally (at day rollover, at most once per N in-game days), when the
 * feature is on, this asks the model to pick + FLAVOUR one of the authored
 * AI-eligible quest TEMPLATES (data/quests.ts, `ai:true`) to fit the current
 * world state. The returned `offer_quest` action is validated against the
 * CLOSED schema with referential integrity (`questId` must be an AI template),
 * and its `reward` is clamped into the template's balanced band. On success the
 * offer is surfaced (via `onOffer`) so the giver NPC offers it in dialogue.
 *
 * Safety rails (VISION "principle zero"):
 *  - With the master toggle / feature OFF, `ai.enabled("quests")` is false, so
 *    NOTHING runs — no call, no offer, the game is byte-identical.
 *  - On ANY failure (call error, invalid JSON, off-catalog questId, off-
 *    character text) a SCRIPTED fallback offer is surfaced instead — a rotated
 *    authored template with its own words + reward. So an enabled feature still
 *    delivers a coherent, safe offer.
 *  - The accepted quest's STEPS and the GRANTED reward are always the authored
 *    template's; the model only supplies the giver's flavour words. The clamped
 *    reward is validated/stored (forward-compat + the debug readout) but the
 *    authoritative payout stays authored.
 */

/** What a giver's eligible template looks like to this feature (built by main
 *  from the quest defs + live quest state). */
export interface TemplateInfo {
  id: string;
  giver: string;
  title: string;
  description: string;
  rewardCoins: number;
}

export interface QuestOfferInfo {
  questId: string;
  title: string;
  description: string;
  rewardCoins: number;
  source: "ai" | "fallback";
  day: number;
}

export interface QuestOffers {
  /** Day-rollover hook: maybe generate one offer (fire-and-forget). `eligible`
   *  is the set of AI templates that could be surfaced right now. */
  maybeGenerateDaily(wc: WorldContext, absoluteDay: number, eligible: TemplateInfo[]): void;
  /** The latest offer built (for the debug panel). */
  latest(): QuestOfferInfo | null;
  reset(): void;
}

const SYSTEM =
  "You are a quest designer for Wildhearth, a warm pre-industrial farming village. " +
  "You will be given a SHORT MENU of errands an NPC could offer the player, each " +
  "with an id. Pick the ONE that best fits the world state and rewrite its title " +
  "and one- or two-sentence pitch in that NPC's warm voice. No combat, no danger. " +
  "Return a single offer_quest action: { type:'offer_quest', questId (EXACTLY one of " +
  "the menu ids), title, text (the NPC's pitch), reward (coins) }.";

function topSkill(skills: Readonly<Record<string, number>>): string {
  let best = "none", bestV = -1;
  for (const [k, v] of Object.entries(skills)) if (v > bestV) { bestV = v; best = k; }
  return best;
}

function buildPrompt(wc: WorldContext, eligible: TemplateInfo[]): string {
  const c = wc.calendar, w = wc.weather;
  const menu = eligible.map((t) => `- ${t.id} (from ${t.giver}): ${t.title} — ${t.description}`).join("\n");
  return [
    `World state:`,
    c ? `- Season ${c.season}, day ${c.day}, ${c.phase}` : ``,
    w ? `- Weather ${w.state} (${w.daysSinceChange} days running)` : ``,
    `- Player coins: ${wc.coins}`,
    `- Strongest skill: ${topSkill(wc.skills)}`,
    ``,
    `Errand menu (pick ONE id):`,
    menu,
    ``,
    `Return one offer_quest action naming exactly one menu id.`,
  ].filter(Boolean).join("\n");
}

/** Clamp an AI-proposed reward into the template's balanced band. */
function clampReward(proposed: number, base: number): number {
  const lo = Math.round(base * (1 - QUEST_AI_REWARD_CLAMP));
  const hi = Math.round(base * (1 + QUEST_AI_REWARD_CLAMP));
  return Math.max(lo, Math.min(hi, Math.round(proposed)));
}

export function createQuestOffers(ai: AiCtx, opts: { onOffer: (offer: AiOffer) => void }): QuestOffers {
  let last: QuestOfferInfo | null = null;
  let lastAttemptDay = -Infinity;
  let rotation = 0;

  /** Surface a scripted fallback offer from a rotated eligible template. */
  function fallback(eligible: TemplateInfo[], day: number): void {
    if (eligible.length === 0) return;
    const t = eligible[((rotation++ % eligible.length) + eligible.length) % eligible.length]!;
    emit({ questId: t.id, title: t.title, description: t.description, rewardCoins: t.rewardCoins, source: "fallback", day });
  }

  function emit(info: QuestOfferInfo): void {
    last = info;
    opts.onOffer({ questId: info.questId, title: info.title, description: info.description, rewardCoins: info.rewardCoins, day: info.day });
  }

  return {
    maybeGenerateDaily(wc, day, eligible) {
      if (!ai.enabled("quests")) return;                              // AI off → byte-identical
      if (day - lastAttemptDay < QUEST_AI_OFFER_MIN_INTERVAL_DAYS) return;
      if (eligible.length === 0) return;
      lastAttemptDay = day;
      void (async () => {
        const res = await ai.requestAction("quests", {
          system: SYSTEM,
          user: buildPrompt(wc, eligible),
          maxTokens: AI_QUEST_MAX_TOKENS,
          cacheSalient: `quest:${day}`,
          refs: { questExists: isAiTemplate },   // questId must be an AI template
        });
        if (res.ok && res.action.type === "offer_quest") {
          const a = res.action;
          const tmpl = eligible.find((t) => t.id === a.questId);
          if (tmpl) {
            emit({
              questId: tmpl.id, title: a.title, description: a.text,
              rewardCoins: clampReward(a.reward, tmpl.rewardCoins),
              source: "ai", day,
            });
            return;
          }
        }
        fallback(eligible, day);   // any failure / off-menu id → scripted offer
      })();
    },
    latest() { return last; },
    reset() { last = null; lastAttemptDay = -Infinity; rotation = 0; },
  };
}
