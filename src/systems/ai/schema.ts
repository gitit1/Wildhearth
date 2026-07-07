import {
  AI_ACTION_TEXT_MAX, AI_NOTE_MAX, AI_QUEST_TITLE_MAX, AI_PROSE_MAX,
  AI_REWARD_COINS_MAX, AI_PRICE_MAX, AI_ID_MAX,
} from "../../config";

/**
 * The closed action contract (AI_ARCHITECTURE §5 / VISION "NPC brain").
 *
 * The model never returns prose the game shows verbatim: it returns ONE action
 * from a closed union, and `validateNpcAction` is the real backstop against a
 * player trying to break character (VISION's documented pitfall). Everything
 * here is a PURE function — no I/O, no state, no config beyond the numeric
 * bounds in config.ts — so it is trivially unit-testable and can never throw
 * into game code (invalid input → a typed failure the caller falls back on).
 *
 * Deviation from AI_ARCHITECTURE §5: `offer_quest.reward` is a plain coin count
 * (bounded by AI_REWARD_COINS_MAX) rather than a structured Reward object — the
 * reward-item catalog does not exist yet; this stays forward-compatible.
 */

export type NpcMood = "warm" | "neutral" | "wary" | "sad" | "glad" | "tired";
const MOODS = new Set<NpcMood>(["warm", "neutral", "wary", "sad", "glad", "tired"]);

export type NpcAction =
  | { type: "say"; text: string; mood?: NpcMood }
  | { type: "sell"; itemId: string; price: number; text: string }
  | { type: "haggle_response"; accept: boolean; counterOffer?: number; text: string }
  | { type: "offer_quest"; questId: string; title: string; text: string; reward: number }
  | { type: "gossip"; aboutNpcId: string; text: string }
  | { type: "teach"; skillId: string; text: string }
  | { type: "memory_update"; note: string };

export type NpcActionType = NpcAction["type"];

/** Optional referential checkers — supplied once the catalogs exist (Block 6+).
 *  When absent, referential integrity is skipped; structure/bounds/text always run. */
export interface ActionRefs {
  itemExists?: (id: string) => boolean;
  questExists?: (id: string) => boolean;
  skillExists?: (id: string) => boolean;
  npcExists?: (id: string) => boolean;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(value: T): Validation<T> => ({ ok: true, value });
const fail = <T>(reason: string): Validation<T> => ({ ok: false, reason });

// --- text hygiene -----------------------------------------------------------

/** Strip markup (tags, code fences, emphasis, list/quote markers), collapse
 *  whitespace, trim. Never throws; empty-in → empty-out. */
export function sanitizeText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, " ")        // html-ish tags
    .replace(/[`*]/g, "")            // code fences / bold-italic
    .replace(/^\s*[#>\-]+\s?/gm, "") // markdown headings / quotes / list bullets
    .replace(/\s+/g, " ")
    .trim();
}

/** A slug-like identifier: letters/digits/_/- only, non-empty, length-capped. */
function isValidId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= AI_ID_MAX && /^[a-z0-9_-]+$/i.test(v);
}

const OFF_CHARACTER = /\b(as an ai|i am an ai|language model|system prompt|assistant said|openai|anthropic|chatgpt)\b/i;

/** Cheap heuristic: does this line break the pre-industrial fiction or leak the
 *  harness? A hit is treated as off-character and rejected (AI_ARCHITECTURE §5.3). */
export function looksOffCharacter(text: string): boolean {
  return OFF_CHARACTER.test(text);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Reject any key not in the allowed set for this action (strict extra-field guard). */
function noExtraKeys(obj: Record<string, unknown>, allowed: string[]): boolean {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) return false;
  return true;
}

// --- prose validator (pure-text features) -----------------------------------

/** For features that show a single line of prose: sanitize, reject empty /
 *  off-character, and CAP length (does not reject long — it truncates). */
export function validateText(raw: unknown, maxLen = AI_PROSE_MAX): Validation<string> {
  const t = sanitizeText(raw);
  if (!t) return fail("empty");
  if (looksOffCharacter(t)) return fail("off-character");
  return ok(t.length > maxLen ? t.slice(0, maxLen).trimEnd() : t);
}

// --- action validator (closed union) ----------------------------------------

/** Validate one NpcAction. Accepts a JSON string or an already-parsed object.
 *  Strict: unknown type / wrong field type / extra field / oversized text /
 *  out-of-bounds number / bad id → typed failure so the caller uses scripted
 *  content. Text on the accepted action is sanitized in place. Unlike
 *  validateText, oversized action text is REJECTED, not truncated. */
export function validateNpcAction(input: unknown, refs: ActionRefs = {}): Validation<NpcAction> {
  let obj: unknown = input;
  if (typeof input === "string") {
    try { obj = JSON.parse(input); } catch { return fail("not-json"); }
  }
  if (!isPlainObject(obj)) return fail("not-object");

  const type = obj.type;
  if (typeof type !== "string") return fail("missing-type");

  // shared text check: string, sanitizes to non-empty, in-character, not oversized
  const checkLine = (v: unknown, max: number): Validation<string> => {
    if (typeof v !== "string") return fail("text-not-string");
    if (v.length > max) return fail("text-oversized");
    const t = sanitizeText(v);
    if (!t) return fail("text-empty");
    if (t.length > max) return fail("text-oversized");
    if (looksOffCharacter(t)) return fail("off-character");
    return ok(t);
  };

  switch (type) {
    case "say": {
      if (!noExtraKeys(obj, ["type", "text", "mood"])) return fail("extra-field");
      const line = checkLine(obj.text, AI_ACTION_TEXT_MAX);
      if (!line.ok) return line;
      if (obj.mood !== undefined && !MOODS.has(obj.mood as NpcMood)) return fail("bad-mood");
      return ok({ type: "say", text: line.value, ...(obj.mood ? { mood: obj.mood as NpcMood } : {}) });
    }
    case "sell": {
      if (!noExtraKeys(obj, ["type", "itemId", "price", "text"])) return fail("extra-field");
      if (!isValidId(obj.itemId)) return fail("bad-itemId");
      if (typeof obj.price !== "number" || !Number.isFinite(obj.price) || obj.price < 0 || obj.price > AI_PRICE_MAX)
        return fail("bad-price");
      if (refs.itemExists && !refs.itemExists(obj.itemId)) return fail("unknown-item");
      const line = checkLine(obj.text, AI_ACTION_TEXT_MAX);
      if (!line.ok) return line;
      return ok({ type: "sell", itemId: obj.itemId, price: Math.round(obj.price), text: line.value });
    }
    case "haggle_response": {
      if (!noExtraKeys(obj, ["type", "accept", "counterOffer", "text"])) return fail("extra-field");
      if (typeof obj.accept !== "boolean") return fail("bad-accept");
      let counter: number | undefined;
      if (obj.counterOffer !== undefined) {
        if (typeof obj.counterOffer !== "number" || !Number.isFinite(obj.counterOffer) ||
            obj.counterOffer < 0 || obj.counterOffer > AI_PRICE_MAX) return fail("bad-counterOffer");
        counter = Math.round(obj.counterOffer);
      }
      const line = checkLine(obj.text, AI_ACTION_TEXT_MAX);
      if (!line.ok) return line;
      return ok({ type: "haggle_response", accept: obj.accept, text: line.value,
        ...(counter !== undefined ? { counterOffer: counter } : {}) });
    }
    case "offer_quest": {
      if (!noExtraKeys(obj, ["type", "questId", "title", "text", "reward"])) return fail("extra-field");
      if (!isValidId(obj.questId)) return fail("bad-questId");
      if (refs.questExists && !refs.questExists(obj.questId)) return fail("unknown-quest");
      const title = checkLine(obj.title, AI_QUEST_TITLE_MAX);
      if (!title.ok) return title;
      const line = checkLine(obj.text, AI_ACTION_TEXT_MAX);
      if (!line.ok) return line;
      if (typeof obj.reward !== "number" || !Number.isFinite(obj.reward) || obj.reward < 0 || obj.reward > AI_REWARD_COINS_MAX)
        return fail("bad-reward");
      return ok({ type: "offer_quest", questId: obj.questId, title: title.value, text: line.value, reward: Math.round(obj.reward) });
    }
    case "gossip": {
      if (!noExtraKeys(obj, ["type", "aboutNpcId", "text"])) return fail("extra-field");
      if (!isValidId(obj.aboutNpcId)) return fail("bad-aboutNpcId");
      if (refs.npcExists && !refs.npcExists(obj.aboutNpcId)) return fail("unknown-npc");
      const line = checkLine(obj.text, AI_ACTION_TEXT_MAX);
      if (!line.ok) return line;
      return ok({ type: "gossip", aboutNpcId: obj.aboutNpcId, text: line.value });
    }
    case "teach": {
      if (!noExtraKeys(obj, ["type", "skillId", "text"])) return fail("extra-field");
      if (!isValidId(obj.skillId)) return fail("bad-skillId");
      if (refs.skillExists && !refs.skillExists(obj.skillId)) return fail("unknown-skill");
      const line = checkLine(obj.text, AI_ACTION_TEXT_MAX);
      if (!line.ok) return line;
      return ok({ type: "teach", skillId: obj.skillId, text: line.value });
    }
    case "memory_update": {
      if (!noExtraKeys(obj, ["type", "note"])) return fail("extra-field");
      const note = checkLine(obj.note, AI_NOTE_MAX);
      if (!note.ok) return note;
      return ok({ type: "memory_update", note: note.value });
    }
    default:
      return fail("unknown-type");
  }
}
