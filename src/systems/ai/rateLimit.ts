import { AI_RATE_KEY_PER_SESSION, AI_RATE_GLOBAL_PER_MIN } from "../../config";

/**
 * Rate discipline (AI_ARCHITECTURE §7.2 / VISION cost-pitfalls). Two caps, both
 * in-memory (so "per session" = until reload — the natural session boundary for
 * a no-server browser game):
 *
 *   - per-key session cap: N calls per key (an npcId for NPC features, or the
 *     feature name otherwise) — stops one curious player rapid-firing dialogue
 *     at a single NPC from dominating spend.
 *   - global calls-per-minute cap: a sliding 60s window across everything.
 *
 * A call is only counted when `allow` returns true, so a blocked call (falling
 * back to scripted content) does not consume the budget of a future real one.
 */

export interface RateLimiter {
  /** Record-and-check: true if this call is under both caps (and counts it). */
  allow(key: string): boolean;
  reset(): void;
}

export function createRateLimiter(
  keyPerSession = AI_RATE_KEY_PER_SESSION,
  globalPerMin = AI_RATE_GLOBAL_PER_MIN,
  now: () => number = Date.now,
): RateLimiter {
  let perKey = new Map<string, number>();
  let recent: number[] = []; // timestamps within the last 60s

  return {
    allow(key: string): boolean {
      const t = now();
      // prune the sliding window
      const cutoff = t - 60_000;
      if (recent.length && recent[0] < cutoff) recent = recent.filter((ts) => ts >= cutoff);
      if (recent.length >= globalPerMin) return false;

      const used = perKey.get(key) ?? 0;
      if (used >= keyPerSession) return false;

      perKey.set(key, used + 1);
      recent.push(t);
      return true;
    },
    reset(): void {
      perKey = new Map();
      recent = [];
    },
  };
}
