import { AI_SETTINGS_KEY, AI_TOKEN_BUDGET_DEFAULT } from "../config";

/**
 * AI companion settings (Part E #3 — the SETTINGS SURFACE for the AI layer that
 * lands next, per docs/AI_ARCHITECTURE.md). Stored under its OWN versioned key,
 * NOT in saves.ts's GAME_KEYS — the player's provider key, budget, and
 * per-feature opt-ins are durable preferences that must survive a New Game.
 *
 * BYOK, honest defaults: the master switch is OFF, so no tokens are ever spent
 * unless she turns it on. The eight per-feature toggles map 1:1 to Part D's use
 * cases; they default ON only once the master is on. Nothing here CALLS a
 * provider in v1 — this module just remembers the choices for the AI engine.
 */

/** The eight AI features (Part D). `id` is the stored key; `label` is UI text. */
export const AI_FEATURES = [
  { id: "backstories", label: "Backstories" },
  { id: "dialogue", label: "Dialogue variation" },
  { id: "quests", label: "Quest generation" },
  { id: "thoughts", label: "NPC inner thoughts" },
  { id: "arcs", label: "Story arcs" },
  { id: "narration", label: "Event narration" },
  { id: "memory", label: "Anti-repetition memory" },
  { id: "improve", label: "Improvement notes" },
] as const;

export type AiFeatureId = (typeof AI_FEATURES)[number]["id"];

/** Depth/cost dial (AI_ARCHITECTURE §4) — maps to a model tier in config's
 *  AI_MODEL_BY_DEPTH. Higher = richer + pricier. Default "standard" (Haiku). */
export type AiDepth = "standard" | "rich" | "deepest";
export const AI_DEPTHS: ReadonlyArray<{ id: AiDepth; label: string; note: string }> = [
  { id: "standard", label: "Standard", note: "Fast & thrifty" },
  { id: "rich", label: "Rich", note: "Warmer, more varied" },
  { id: "deepest", label: "Deepest", note: "The most depth" },
];

const AI_SETTINGS_VERSION = 2;   // v2 adds the depth dial

export interface AiSettings {
  version: number;
  enabled: boolean;                          // master switch (default off)
  apiKey: string;                            // BYOK, stored only in this browser
  monthlyTokenBudget: number;                // soft monthly cap
  depth: AiDepth;                            // depth/cost dial (default "standard")
  features: Record<AiFeatureId, boolean>;    // per-feature opt-ins
}

function freshFeatures(on: boolean): Record<AiFeatureId, boolean> {
  const f = {} as Record<AiFeatureId, boolean>;
  for (const feat of AI_FEATURES) f[feat.id] = on;
  // Improvement-observation (#8) is dev-facing — off by default even when the
  // master toggle is on, per AI_ARCHITECTURE §D8. She opts into it explicitly.
  f.improve = false;
  return f;
}

const AI_DEPTH_IDS = new Set<AiDepth>(["standard", "rich", "deepest"]);

const DEFAULTS: AiSettings = {
  version: AI_SETTINGS_VERSION,
  enabled: false,
  apiKey: "",
  monthlyTokenBudget: AI_TOKEN_BUDGET_DEFAULT,
  depth: "standard",
  features: freshFeatures(true),   // all on, but gated behind `enabled`
};

let cached: AiSettings | null = null;

export function loadAiSettings(): AiSettings {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    const p = (raw ? JSON.parse(raw) : {}) as Partial<AiSettings>;
    const features = freshFeatures(true);
    if (p.features && typeof p.features === "object") {
      for (const feat of AI_FEATURES)
        if (typeof (p.features as Record<string, unknown>)[feat.id] === "boolean")
          features[feat.id] = (p.features as Record<string, boolean>)[feat.id]!;
    }
    cached = {
      version: AI_SETTINGS_VERSION,
      enabled: p.enabled === true,
      apiKey: typeof p.apiKey === "string" ? p.apiKey : "",
      monthlyTokenBudget:
        typeof p.monthlyTokenBudget === "number" && p.monthlyTokenBudget >= 0
          ? Math.round(p.monthlyTokenBudget) : AI_TOKEN_BUDGET_DEFAULT,
      // v1 saves had no depth → migrate to the default tier
      depth: AI_DEPTH_IDS.has(p.depth as AiDepth) ? (p.depth as AiDepth) : "standard",
      features,
    };
  } catch {
    cached = { ...DEFAULTS, features: freshFeatures(true) };
  }
  return cached!;
}

export function saveAiSettings(patch: Partial<AiSettings>) {
  // Mutate the cached object IN PLACE (rather than replacing it) so any live
  // holder of the reference — notably the AI facade built in main.ts — sees the
  // change without being rebuilt. `features` is replaced wholesale by callers.
  const cur = loadAiSettings();
  Object.assign(cur, patch, { version: AI_SETTINGS_VERSION });
  cached = cur;
  try { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(cur)); } catch { /* private mode */ }
}

/** Toggle one feature and persist. */
export function setAiFeature(id: AiFeatureId, on: boolean) {
  const cur = loadAiSettings();
  saveAiSettings({ features: { ...cur.features, [id]: on } });
}
