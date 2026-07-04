import { META_KEY } from "../config";

/**
 * Playthrough meta — one-time origin facts chosen at New Game, kept so the
 * game can remember *how* this life began even after its effects (the tool in
 * the bag, the seeded skill) have long since changed. Versioned and
 * junk-tolerant like every other store (Step 9 save hardening).
 */

export type StarterTool = "hoe" | "rod" | "lute";

export interface Meta { version: number; starterTool: StarterTool | null }

const FRESH: Meta = { version: 1, starterTool: null };

function isTool(v: unknown): v is StarterTool {
  return v === "hoe" || v === "rod" || v === "lute";
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...FRESH };
    const d = JSON.parse(raw) as Partial<Meta>;
    return { version: 1, starterTool: isTool(d.starterTool) ? d.starterTool : null };
  } catch {
    return { ...FRESH };
  }
}

export function saveMeta(m: Meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify({ version: 1, starterTool: m.starterTool })); }
  catch { /* private mode */ }
}
