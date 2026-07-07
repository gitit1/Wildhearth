import type { AiSettings, AiFeatureId } from "../aiSettings";
import { AI_CACHE_TTL_MS, AI_CACHE_TTL_DEFAULT, AI_PROSE_MAX } from "../../config";
import {
  anthropicProvider, mockProvider, noneProvider, aiMockRequested, estimateTokens,
  type AiProvider, type AiProviderKind, type AiErrorKind, type AiResult,
} from "./provider";
import { createBudget, type Budget } from "./budget";
import { createRateLimiter, type RateLimiter } from "./rateLimit";
import { createCache, cacheKey, type AiCache } from "./cache";
import { validateText, validateNpcAction, type NpcAction, type ActionRefs } from "./schema";

/**
 * The facade (AI_ARCHITECTURE §1). `createAiCtx(aiSettings)` wires provider +
 * budget + rateLimit + cache + validation together behind two calls the rest of
 * the game uses. Explicit-passing per the project convention (InteractCtx /
 * WorldContextSources) — main.ts owns the one instance; no singletons.
 *
 * The overriding rule (VISION "principle zero"): with AI off, EVERY path
 * resolves fast and safely. `enabled(feature)` is false → callers never await
 * anything; `request`/`requestAction` short-circuit to a typed failure so the
 * caller uses its scripted fallback. No console noise, no pending work.
 */

export interface AiText { ok: true; text: string; cached: boolean; }
export interface AiActionOk { ok: true; action: NpcAction; cached: boolean; }
export interface AiFail { ok: false; error: AiErrorKind; message: string; }

export type AiTextResult = AiText | AiFail;
export type AiActionResult = AiActionOk | AiFail;

/** One request. `npcId` scopes rate-limiting + caching; `cacheSalient` is the
 *  stable slice of context that identical moments share (defaults to `user`). */
export interface AiRequestSpec {
  system: string;
  user: string;
  maxTokens: number;
  npcId?: string;
  cacheSalient?: string;
  cache?: boolean;      // default true
  maxLen?: number;      // prose length cap (validateText)
  refs?: ActionRefs;    // referential checks for actions (optional)
  seed?: number;        // deterministic-mock seed
}

export interface AiCtx {
  readonly providerKind: AiProviderKind;
  /** True only when the master toggle is on, this feature is opted-in, and a
   *  usable provider exists. Callers MUST check this before awaiting. */
  enabled(feature: AiFeatureId): boolean;
  /** Prose feature: returns sanitized, length-capped text or a typed failure. */
  request(feature: AiFeatureId, spec: AiRequestSpec): Promise<AiTextResult>;
  /** Structured feature: returns a validated NpcAction or a typed failure. */
  requestAction(feature: AiFeatureId, spec: AiRequestSpec): Promise<AiActionResult>;
  /** Settings "Test connection": one tiny real (or mock) call, bypassing the
   *  master toggle + feature flags so a key can be validated before opt-in. */
  testConnection(): Promise<AiTextResult>;
}

export interface AiCtxOptions {
  /** Force the mock provider (verification / `?aimock`). Default: auto-detect URL. */
  mock?: boolean;
  /** Seeded rng in the mock (default true). */
  deterministic?: boolean;
  /** Wired to ui/hud toast by main.ts; the facade owns the "used up" message. */
  onToast?: (msg: string) => void;
  now?: () => number;
}

function ttlFor(feature: AiFeatureId): number {
  return (AI_CACHE_TTL_MS as Record<string, number>)[feature] ?? AI_CACHE_TTL_DEFAULT;
}

export function createAiCtx(settings: AiSettings, opts: AiCtxOptions = {}): AiCtx {
  const mock = opts.mock ?? aiMockRequested();
  const hasKey = settings.apiKey.trim().length > 0;

  const provider: AiProvider = mock
    ? mockProvider(opts.deterministic ?? true)
    : settings.enabled && hasKey
      ? anthropicProvider(settings.apiKey.trim(), settings.depth)
      : noneProvider();

  const budget: Budget = createBudget(settings.monthlyTokenBudget, opts.now);
  const rate: RateLimiter = createRateLimiter(undefined, undefined, opts.now);
  const cache: AiCache = createCache(undefined, opts.now);

  // The budget toast fires once per month, not on every blocked call.
  let budgetToastMonth: string | null = null;
  const budgetToast = () => {
    const mk = budget.snapshot().monthKey;
    if (budgetToastMonth === mk) return;
    budgetToastMonth = mk;
    opts.onToast?.("AI budget for this month is used up.");
  };

  // `?aimock` forces the mock provider AND is treated as master-on, so the whole
  // AI path can be exercised in verification/QA without flipping real settings.
  // A real player is always gated by her own master toggle (mock is false).
  const masterOn = settings.enabled || mock;
  const enabled = (feature: AiFeatureId): boolean =>
    masterOn && settings.features[feature] === true && provider.kind !== "none";

  /** Shared pipeline: cache → rate → budget → provider → record. Returns the raw
   *  provider result (validation happens per-mode in the callers). `cached` text
   *  short-circuits before any of the caps. */
  async function run(feature: AiFeatureId, spec: AiRequestSpec, json: boolean):
    Promise<{ hit: string; cached: true } | { result: AiResult; cached: false } | { fail: AiFail }> {
    const useCache = spec.cache !== false;
    const key = cacheKey(feature, spec.npcId ?? "", spec.cacheSalient ?? spec.user);
    if (useCache) {
      const hit = cache.get(key);
      if (hit !== null) return { hit, cached: true };
    }
    if (!rate.allow(spec.npcId ?? feature)) return { fail: { ok: false, error: "rate-limit", message: "Too many AI calls just now" } };
    const estimate = estimateTokens(spec.system, spec.user, spec.maxTokens);
    if (!budget.canSpend(estimate)) { budgetToast(); return { fail: { ok: false, error: "budget", message: "Monthly AI budget reached" } }; }

    const result = await provider.complete({
      system: spec.system, user: spec.user, maxTokens: spec.maxTokens, json,
      feature, seed: spec.seed,
    });
    if (result.ok) budget.record(result.usage);
    return { result, cached: false };
  }

  const cacheStore = (feature: AiFeatureId, spec: AiRequestSpec, text: string) => {
    if (spec.cache === false) return;
    const key = cacheKey(feature, spec.npcId ?? "", spec.cacheSalient ?? spec.user);
    cache.set(key, text, ttlFor(feature));
  };

  return {
    providerKind: provider.kind,
    enabled,

    async request(feature, spec): Promise<AiTextResult> {
      if (!enabled(feature)) return { ok: false, error: "ai-off", message: "AI is off" };
      const r = await run(feature, spec, false);
      if ("fail" in r) return r.fail;
      if (r.cached) return { ok: true, text: r.hit, cached: true };
      if (!r.result.ok) return { ok: false, error: r.result.error, message: r.result.message };
      const v = validateText(r.result.text, spec.maxLen ?? AI_PROSE_MAX);
      if (!v.ok) return { ok: false, error: "bad-response", message: v.reason };
      cacheStore(feature, spec, v.value);
      return { ok: true, text: v.value, cached: false };
    },

    async requestAction(feature, spec): Promise<AiActionResult> {
      if (!enabled(feature)) return { ok: false, error: "ai-off", message: "AI is off" };
      const r = await run(feature, spec, true);
      if ("fail" in r) return r.fail;
      // Cached actions are re-validated (cheap) rather than stored parsed.
      if (r.cached) {
        const v = validateNpcAction(r.hit, spec.refs);
        return v.ok ? { ok: true, action: v.value, cached: true } : { ok: false, error: "bad-response", message: v.reason };
      }
      if (!r.result.ok) return { ok: false, error: r.result.error, message: r.result.message };
      const v = validateNpcAction(r.result.text, spec.refs);
      if (!v.ok) return { ok: false, error: "bad-response", message: v.reason };
      cacheStore(feature, spec, r.result.text);
      return { ok: true, action: v.value, cached: false };
    },

    async testConnection(): Promise<AiTextResult> {
      // Build a provider directly so the key can be validated before the master
      // toggle is flipped on. ?aimock → instant mock success.
      const testProvider: AiProvider = mock
        ? mockProvider(opts.deterministic ?? true)
        : hasKey
          ? anthropicProvider(settings.apiKey.trim(), settings.depth)
          : noneProvider();
      if (testProvider.kind === "none") {
        return { ok: false, error: "ai-off", message: "Enter your API key first." };
      }
      const res = await testProvider.complete({
        system: "You are testing a connection. Reply with exactly the requested words.",
        user: "Say 'The hearth is warm.'",
        maxTokens: 20,
        feature: "test",
      });
      if (!res.ok) return { ok: false, error: res.error, message: res.message };
      if (res.usage) budget.record(res.usage);
      const v = validateText(res.text, 60);
      if (!v.ok) return { ok: false, error: "bad-response", message: v.reason };
      return { ok: true, text: v.value, cached: false };
    },
  };
}
