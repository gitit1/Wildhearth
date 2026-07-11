import { AI_DIALOGUE_MAX_TOKENS, AI_DIALOGUE_LINE_MAX } from "../../../config";
import { renderNpcLine, tierOf, type RenderReq } from "../../dialogue";
import type { WorldContext } from "../../worldContext";
import type { AiCtx } from "../aiCtx";
import type { AntiRepetition } from "../antiRepetition";

/**
 * Dialogue variation (Part D feature #2, AI_ARCHITECTURE §D2) — the flagship.
 *
 * `render()` is SYNCHRONOUS and never blocks (VISION principle zero): it returns
 * an already-available variation for this (npc, line-context) if one has been
 * prefetched, otherwise the scripted line VERBATIM — and fires an async prefetch
 * so the NEXT occurrence is varied. A used variation is consumed and recorded in
 * anti-repetition, so the same moment never repeats the same words.
 *
 * The prompt (built here, the one place per feature) anchors on the scripted line
 * as the semantic target: "rephrase, same meaning, ≤2 sentences, stay in
 * character", grounded in the NPC sheet + backstory + current thought + arc notes
 * + relationship tier + season/weather/time/region, with the anti-repetition
 * exclusions. Validation + length cap happen in the facade's `request()`.
 */

export interface NpcSheet {
  name: string;
  profession: string;
  personality: string;
  backstory: string;
}

export interface DialogueVariation {
  /** Sync choke-point: variation-if-ready (consumed) else scripted + prefetch. */
  render(req: RenderReq): string;
  /** Proximity prefetch of a specific line the player is about to hear. */
  prefetch(npcId: string, purpose: "opening" | "reply", scriptedText: string, wc: WorldContext): void;
  /** Is a variation staged for this exact moment? (verification helper) */
  isReady(npcId: string, purpose: "opening" | "reply", scriptedText: string, wc: WorldContext): boolean;
  /** The most recent user prompt built (verification helper — inspect grounding). */
  lastPrompt(): string | null;
}

export interface DialogueVariationDeps {
  ai: AiCtx;
  antiRep: AntiRepetition;
  /** NPC character sheet (name/profession/personality/backstory), or null. */
  sheetFor: (id: string) => NpcSheet | null;
  /** The NPC's current thought if known (no side effects), else null. */
  thoughtHint: (id: string) => string | null;
  /** Plain-code story-arc notes for this NPC (feature #6; empty until it lands). */
  arcNotes: (id: string) => string[];
}

const SYSTEM =
  "You re-voice a single line of dialogue for a villager in Wildhearth, a warm, " +
  "cozy pre-industrial farming village. Keep the SAME meaning as the scripted " +
  "line; only change the wording to fit this character's voice and the moment. " +
  "At most two sentences. No modern things, no magic, no violence. Reply with " +
  "the spoken line only — no quotation marks, no narration.";

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** A coarse world bucket: near-identical moments share a key (and a prefetch). */
function bucket(wc: WorldContext): string {
  const c = wc.calendar;
  const w = wc.weather?.state ?? "clear";
  const fr = tierOf(wc.relationship?.friendship ?? 0);
  const rep = wc.reputation?.tier ?? "?";
  return `${c?.season ?? "?"}|${c?.phase ?? "?"}|${w}|f${fr}|r${rep}|${wc.location ?? "?"}`;
}

function keyFor(npcId: string, purpose: string, scripted: string, wc: WorldContext): string {
  return `${npcId}|${purpose}|${bucket(wc)}|${hash(scripted)}`;
}

function tierWord(v: number): string {
  return v >= 75 ? "close" : v >= 50 ? "warm" : v >= 25 ? "friendly" : "new acquaintance";
}

function buildUser(
  sheet: NpcSheet, purpose: string, scripted: string, wc: WorldContext,
  thought: string | null, notes: string[], exclusions: string[],
): string {
  const c = wc.calendar;
  const rel = wc.relationship;
  const lines: string[] = [
    `Character: ${sheet.name}, ${sheet.profession} (${sheet.personality.replace(/-/g, " ")}).`,
    `Backstory: ${sheet.backstory.slice(0, 220)}`,
  ];
  if (thought) lines.push(`Right now they're thinking: ${thought}`);
  if (rel) lines.push(`They regard the player as a ${tierWord(rel.friendship)}.`);
  if (wc.reputation && wc.reputation.tier !== "Unknown")
    lines.push(`Around town the player is ${wc.reputation.tier.toLowerCase()} — that reputation colours how warmly they're greeted.`);
  if (c) lines.push(`It is ${c.season}, ${c.phase}${wc.weather ? `, weather ${wc.weather.state}` : ""}${wc.location ? `, at the ${wc.location}` : ""}.`);
  if (notes.length) lines.push(`Things they've quietly noticed about the player: ${notes.join("; ")}.`);
  lines.push(``);
  lines.push(`${purpose === "opening" ? "Greeting" : "Reply"} to re-voice (keep the meaning): "${scripted}"`);
  if (exclusions.length) lines.push(`Do not reuse these earlier phrasings: ${exclusions.map((e) => `"${e}"`).join(" ")}`);
  lines.push(``);
  lines.push(`Reply with only ${sheet.name}'s line.`);
  return lines.join("\n");
}

export function createDialogueVariation(deps: DialogueVariationDeps): DialogueVariation {
  const { ai, antiRep } = deps;
  const store = new Map<string, string>();   // salient key -> staged variation (session)
  const inflight = new Set<string>();
  let lastUserPrompt: string | null = null;

  function fire(npcId: string, purpose: "opening" | "reply", scripted: string, wc: WorldContext, key: string) {
    if (store.has(key) || inflight.has(key)) return;
    if (!ai.enabled("dialogue")) return;
    const sheet = deps.sheetFor(npcId);
    if (!sheet) return;
    inflight.add(key);
    const user = buildUser(sheet, purpose, scripted, wc, deps.thoughtHint(npcId), deps.arcNotes(npcId), antiRep.recentLines(npcId));
    lastUserPrompt = user;
    void (async () => {
      try {
        const res = await ai.request("dialogue", {
          system: SYSTEM,
          user,
          maxTokens: AI_DIALOGUE_MAX_TOKENS,
          npcId,
          cacheSalient: key,
          maxLen: AI_DIALOGUE_LINE_MAX,
        });
        if (res.ok && res.text !== scripted && !antiRep.isNearDuplicate(npcId, res.text)) store.set(key, res.text);
      } finally {
        inflight.delete(key);
      }
    })();
  }

  return {
    render(req) {
      const scripted = renderNpcLine(req);   // the seam's base — scripted verbatim
      if (!ai.enabled("dialogue")) return scripted;
      const purpose = req.purpose;
      const key = keyFor(req.npcId, purpose, scripted, req.worldContext);
      const staged = store.get(key);
      if (staged && !antiRep.isNearDuplicate(req.npcId, staged)) {
        store.delete(key);                   // consume — never say the same twice
        antiRep.recordLine(req.npcId, staged);
        // stage the NEXT one so a third visit is varied too
        fire(req.npcId, purpose, scripted, req.worldContext, key);
        return staged;
      }
      fire(req.npcId, purpose, scripted, req.worldContext, key);
      return scripted;
    },

    prefetch(npcId, purpose, scriptedText, wc) {
      if (!ai.enabled("dialogue")) return;
      fire(npcId, purpose, scriptedText, wc, keyFor(npcId, purpose, scriptedText, wc));
    },

    isReady(npcId, purpose, scriptedText, wc) {
      return store.has(keyFor(npcId, purpose, scriptedText, wc));
    },

    lastPrompt() { return lastUserPrompt; },
  };
}
