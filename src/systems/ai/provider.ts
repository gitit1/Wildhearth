import {
  AI_ANTHROPIC_URL, AI_ANTHROPIC_VERSION, AI_REQUEST_TIMEOUT_MS,
  AI_MAX_RETRIES, AI_RETRY_BACKOFF_MS, AI_MODEL_BY_DEPTH,
} from "../../config";
import type { AiDepth } from "../aiSettings";
import { mulberry32 } from "../../engine/rng";

/**
 * Transport layer (AI_ARCHITECTURE §2). Three providers behind one interface:
 *
 *   anthropic — direct browser fetch to api.anthropic.com (BYOK). Plain fetch,
 *               NOT @anthropic-ai/sdk (deviation from the doc — keeps the bundle
 *               lean and avoids a Node-oriented dependency). The documented
 *               opt-in header `anthropic-dangerous-direct-browser-access: true`
 *               is what lets the call succeed from a page.
 *   mock      — deterministic canned responses, zero network. Used by tests and
 *               when `?aimock` is in the URL. Seeded mulberry32 in deterministic
 *               mode so a given (feature, prompt) always yields the same text.
 *   none      — instantly rejects with a typed "ai-off" result. Selected when
 *               the master toggle is off or no key is set.
 *
 * Every path resolves to a typed AiResult and NEVER throws into game code.
 */

export type AiProviderKind = "anthropic" | "mock" | "none";

export type AiErrorKind =
  | "ai-off"      // provider is none (master off / no key)
  | "budget"      // monthly token cap reached (surfaced by the facade)
  | "rate-limit"  // local rate cap, or a 429 from the API
  | "timeout"     // aborted after AI_REQUEST_TIMEOUT_MS
  | "network"     // fetch threw (offline, DNS, or a CORS block)
  | "auth"        // 401/403 — bad or missing key
  | "server"      // 5xx
  | "bad-response"; // non-JSON / empty / unparseable body

export interface AiUsage { inputTokens: number; outputTokens: number; }

export interface AiRequest {
  system: string;
  user: string;
  maxTokens: number;
  /** JSON-response mode: append a JSON-only instruction to the system prompt so
   *  the caller can parse the body (AI_ARCHITECTURE uses structured outputs; we
   *  steer via the prompt to keep the request shape identical on every tier). */
  json?: boolean;
  /** Override the depth-derived model (rarely needed). */
  model?: string;
  /** Deterministic-mock inputs (ignored by the anthropic provider). */
  feature?: string;
  seed?: number;
}

export type AiResult =
  | { ok: true; text: string; usage: AiUsage; model: string; provider: AiProviderKind }
  | { ok: false; error: AiErrorKind; message: string; provider: AiProviderKind };

export interface AiProvider {
  readonly kind: AiProviderKind;
  complete(req: AiRequest): Promise<AiResult>;
}

const JSON_INSTRUCTION =
  "\n\nReply with a single JSON object and nothing else — no prose, no markdown, no code fences.";

const err = (error: AiErrorKind, message: string, provider: AiProviderKind): AiResult =>
  ({ ok: false, error, message, provider });

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Rough token estimate (chars/4). Good enough for budget gating. */
export function estimateTokens(system: string, user: string, maxTokens: number): number {
  return Math.ceil((system.length + user.length) / 4) + maxTokens;
}

// --- none -------------------------------------------------------------------

export function noneProvider(): AiProvider {
  return {
    kind: "none",
    complete: async () => err("ai-off", "AI is off", "none"),
  };
}

// --- anthropic (browser-direct) ---------------------------------------------

export function anthropicProvider(apiKey: string, depth: AiDepth): AiProvider {
  const model = AI_MODEL_BY_DEPTH[depth];
  return {
    kind: "anthropic",
    async complete(req: AiRequest): Promise<AiResult> {
      const useModel = req.model ?? model;
      const system = req.json ? req.system + JSON_INSTRUCTION : req.system;
      const body = JSON.stringify({
        model: useModel,
        max_tokens: req.maxTokens,
        system,
        messages: [{ role: "user", content: req.user }],
      });

      for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
        try {
          const res = await fetch(AI_ANTHROPIC_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": AI_ANTHROPIC_VERSION,
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body,
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (res.status === 429 || res.status >= 500) {
            if (attempt < AI_MAX_RETRIES) { await wait(AI_RETRY_BACKOFF_MS * (attempt + 1)); continue; }
            return err(res.status === 429 ? "rate-limit" : "server",
              `HTTP ${res.status}`, "anthropic");
          }
          if (res.status === 401 || res.status === 403) {
            return err("auth", await errText(res, "Invalid API key"), "anthropic");
          }
          if (!res.ok) {
            return err("bad-response", await errText(res, `HTTP ${res.status}`), "anthropic");
          }

          const data = await res.json().catch(() => null) as AnthropicResponse | null;
          const text = extractText(data);
          if (!data || text === null) return err("bad-response", "Empty or unparseable response", "anthropic");
          return {
            ok: true, text, provider: "anthropic", model: data.model ?? useModel,
            usage: {
              inputTokens: data.usage?.input_tokens ?? 0,
              outputTokens: data.usage?.output_tokens ?? 0,
            },
          };
        } catch (e) {
          clearTimeout(timer);
          if (e instanceof DOMException && e.name === "AbortError") {
            return err("timeout", "Request timed out", "anthropic");
          }
          // A thrown fetch (TypeError) is offline / DNS / or a CORS block —
          // indistinguishable from JS, so we report it as a network error.
          if (attempt < AI_MAX_RETRIES) { await wait(AI_RETRY_BACKOFF_MS * (attempt + 1)); continue; }
          return err("network", e instanceof Error ? e.message : "Network error", "anthropic");
        }
      }
      return err("network", "Network error", "anthropic");
    },
  };
}

interface AnthropicResponse {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Concatenate the text blocks of a Messages response; null if none. */
function extractText(data: AnthropicResponse | null): string | null {
  if (!data || !Array.isArray(data.content)) return null;
  const parts = data.content.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text!);
  if (parts.length === 0) return null;
  const joined = parts.join("").trim();
  return joined.length ? joined : null;
}

async function errText(res: Response, fallback: string): Promise<string> {
  try {
    const j = await res.json() as { error?: { message?: string } };
    return j?.error?.message ?? fallback;
  } catch { return fallback; }
}

// --- mock (deterministic, zero network) -------------------------------------

const MOCK_LINES = [
  "The nets came up light today, but the morning was kind.",
  "You've a good eye for the water — I'll say that much.",
  "Rain's coming. I can smell it off the reeds.",
  "Sit a while. The fish won't miss you.",
  "Careful on the far rocks — they're slick this time of year.",
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mockProvider(deterministic = true): AiProvider {
  return {
    kind: "mock",
    async complete(req: AiRequest): Promise<AiResult> {
      // The connection test asks for one fixed line — answer it so ?aimock
      // proves the whole path end-to-end without a network call.
      if (req.feature === "test") {
        return mockOk("The hearth is warm.", req);
      }
      const seed = deterministic ? hashStr(`${req.feature ?? ""}|${req.user}|${req.seed ?? 0}`) : (Math.random() * 2 ** 32) | 0;
      const rng = mulberry32(seed);
      if (req.json) {
        const line = MOCK_LINES[Math.floor(rng() * MOCK_LINES.length)];
        return mockOk(JSON.stringify({ type: "say", text: line }), req);
      }
      const line = MOCK_LINES[Math.floor(rng() * MOCK_LINES.length)];
      return mockOk(line, req);
    },
  };
}

function mockOk(text: string, req: AiRequest): AiResult {
  return {
    ok: true, text, provider: "mock", model: "mock",
    usage: { inputTokens: Math.ceil((req.system.length + req.user.length) / 4), outputTokens: Math.ceil(text.length / 4) },
  };
}

/** True when `?aimock` is in the URL — forces the mock provider + seeded rng.
 *  Used by verification harnesses and manual QA; documented in AI_ARCHITECTURE §9. */
export function aiMockRequested(): boolean {
  try {
    return typeof location !== "undefined" && new URLSearchParams(location.search).has("aimock");
  } catch { return false; }
}
