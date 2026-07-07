import { AI_NARRATION_MAX, AI_NARRATION_MAX_TOKENS } from "../../../config";
import type { AiCtx } from "../aiCtx";

/**
 * World-event narration (Part D feature #5, AI_ARCHITECTURE §D5). Hooks the
 * memorable moments the game already fires — a rare/first catch, a relationship
 * threshold crossing, festival arrival, the season's first storm, an NPC's
 * birthday — and, when the feature is on, adds a one-sentence unique narration.
 *
 * Two entry points, both fully GATED behind the feature (with it off this module
 * is a no-op, so today's behaviour is unchanged):
 *  - `enrich(evt)`: the moment already toasted its own scripted line (e.g. a
 *    heart-event toast). We fire an AI narration and, when it lands, toast the
 *    narrated line and attach a flavor sentence to the Memory Book entry.
 *  - `announce(evt)`: a NEW moment with no existing toast (first storm, birthday).
 *    When enabled it toasts the authored fallback immediately, then enriches.
 *
 * Narration is generated ONCE per event key (session cache + the facade's own
 * response cache via `cacheSalient`), never templated across repeats. Async and
 * non-blocking — nothing waits on it; the Memory Book flavor attaches late.
 */

export interface NarrationEvent {
  /** Stable event key — narrated once, then reused. */
  key: string;
  /** A short description of the event for the prompt. */
  prompt: string;
  /** Authored line for a NEW event (announce mode); ignored by enrich. */
  fallback?: string;
  /** Memory Book entry to attach the narrated flavor to, if any. */
  memoryKey?: string;
}

export interface Narration {
  enrich(evt: NarrationEvent): void;
  announce(evt: NarrationEvent): void;
  reset(): void;
}

export interface NarrationDeps {
  ai: AiCtx;
  toast: (msg: string) => void;
  /** Attach a flavor line to a Memory Book entry (no-op if the entry is gone). */
  attachFlavor: (memoryKey: string, flavor: string) => void;
}

const SYSTEM =
  "You narrate a single memorable moment in Wildhearth, a warm, cozy pre-industrial " +
  "farming village, in ONE evocative sentence. No modern things, no magic, no " +
  "violence. Reply with just the sentence.";

export function createNarration(deps: NarrationDeps): Narration {
  const { ai, toast, attachFlavor } = deps;
  const cache = new Map<string, string>();   // eventKey -> narrated line (session)

  function fire(evt: NarrationEvent, announceFallback: boolean) {
    if (!ai.enabled("narration")) return;    // fully gated → AI-off unchanged
    const got = cache.get(evt.key);
    if (got) { toast(got); if (evt.memoryKey) attachFlavor(evt.memoryKey, got); return; }
    if (announceFallback && evt.fallback) toast(evt.fallback);
    void (async () => {
      const res = await ai.request("narration", {
        system: SYSTEM,
        user: evt.prompt,
        maxTokens: AI_NARRATION_MAX_TOKENS,
        cacheSalient: evt.key,
        maxLen: AI_NARRATION_MAX,
      });
      if (res.ok) {
        cache.set(evt.key, res.text);
        toast(res.text);                                    // the narrated line arrives
        if (evt.memoryKey) attachFlavor(evt.memoryKey, res.text);
      }
    })();
  }

  return {
    enrich(evt) { fire(evt, false); },
    announce(evt) { fire(evt, true); },
    reset() { cache.clear(); },
  };
}
