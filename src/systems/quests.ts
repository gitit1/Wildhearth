import { QUESTS_KEY } from "../config";
import {
  QUESTS, questById, isPossessionStep, stepGoal, CATEGORY_IDS,
  type QuestDef, type QuestStep, type QuestReward,
} from "../data/quests";
import type { Season } from "./calendar";
import type { Region } from "../world/zones";

/**
 * Quest engine (R6) — the PROGRESS + lifecycle half. Pure state + logic; no UI,
 * no toasts, no economy. Every side-effect (coins/items/friendship granted,
 * items consumed on turn-in, celebratory toast/memory) is RETURNED as a
 * QuestResult the caller (main.ts) applies — the exact pattern the Guidance and
 * Dialogue engines use.
 *
 * Two step flavours (see data/quests.ts):
 *  - ACTIVITY steps advance via `notifyQuests(ev)` when a world event fires.
 *  - POSSESSION steps (gather / gatherAny) are live-checked each tick against
 *    the bag via `refreshQuests(heldCount)`; their items are consumed on
 *    turn-in.
 *
 * Steps are SEQUENTIAL. A quest is "ready" when its last step is satisfied. A
 * quest with `turnIn` (default true when it has a giver) is CLAIMED at the giver
 * (dialogue); one with `turnIn:false` auto-completes the tick it's ready.
 *
 * Versioned, tolerant store under QUESTS_KEY (in saves.ts's GAME_KEYS — a New
 * Game wipes it). Nothing at import time; main.ts owns the live object.
 */

export type QuestStatus = "active" | "completed";

export interface QuestState {
  id: string;
  status: QuestStatus;
  step: number;                 // index of the active step (== steps.length when all done)
  progress: number;             // counter for the ACTIVE activity step (possession steps compute live)
  acceptedDay: number;
  completedDay: number;         // -1 while active
  completions: number;          // how many times finished (for repeatables)
}

/** An AI-flavoured pending offer (D3). Names an AI-eligible template + the
 *  flavoured words + the clamped reward. Persisted so it survives a reload. */
export interface AiOffer {
  questId: string;              // must be an AI template id in data/quests.ts
  title: string;
  description: string;
  rewardCoins: number;          // clamped to the template's bounds by the caller
  day: number;
}

export interface QuestLog {
  version: 1;
  quests: Record<string, QuestState>;
  aiOffer: AiOffer | null;
}

function fresh(): QuestLog {
  return { version: 1, quests: {}, aiOffer: null };
}

// ---- persistence (relationships.ts shape: versioned, tolerant) -------------

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function normalizeState(id: string, s: Partial<QuestState>): QuestState | null {
  if (!questById(id)) return null;   // drop states for quests that no longer exist
  const status: QuestStatus = s.status === "completed" ? "completed" : "active";
  return {
    id,
    status,
    step: Math.max(0, Math.floor(num(s.step, 0))),
    progress: Math.max(0, Math.floor(num(s.progress, 0))),
    acceptedDay: Math.floor(num(s.acceptedDay, 0)),
    completedDay: Math.floor(num(s.completedDay, -1)),
    completions: Math.max(0, Math.floor(num(s.completions, status === "completed" ? 1 : 0))),
  };
}

function normalizeOffer(o: Partial<AiOffer> | null | undefined): AiOffer | null {
  if (!o || typeof o !== "object") return null;
  const q = typeof o.questId === "string" ? questById(o.questId) : null;
  if (!q || !q.ai) return null;   // only a live AI template survives
  return {
    questId: q.id,
    title: typeof o.title === "string" && o.title ? o.title : q.title,
    description: typeof o.description === "string" && o.description ? o.description : q.description,
    rewardCoins: Math.max(0, Math.floor(num(o.rewardCoins, q.reward.coins ?? 0))),
    day: Math.floor(num(o.day, 0)),
  };
}

export function loadQuests(): QuestLog {
  try {
    const raw = localStorage.getItem(QUESTS_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<QuestLog>;
    const out = fresh();
    if (p.quests && typeof p.quests === "object") {
      for (const [id, s] of Object.entries(p.quests as Record<string, Partial<QuestState>>)) {
        const st = s && typeof s === "object" ? normalizeState(id, s) : null;
        if (st) out.quests[id] = st;
      }
    }
    out.aiOffer = normalizeOffer(p.aiOffer);
    return out;
  } catch {
    return fresh();
  }
}

export function saveQuests(log: QuestLog) {
  try { localStorage.setItem(QUESTS_KEY, JSON.stringify(log)); } catch { /* private mode */ }
}

/** New Game: forget every quest (keeps main's single object reference). */
export function resetQuests(log: QuestLog) {
  log.quests = {};
  log.aiOffer = null;
  saveQuests(log);
}

// ---- results (applied by the caller) ---------------------------------------

export interface QuestResult {
  toasts: string[];
  /** Rewards to grant on the completed quests, in order. */
  grants: Array<{ questId: string; reward: QuestReward; giver: string; title: string }>;
  /** Items to CONSUME from the bag on turn-in (possession steps). */
  consume: Array<{ id: string; qty: number }>;
  /** A step just advanced or a quest just completed — force-refresh the UI. */
  changed: boolean;
  /** Memory Book entries (key, text) for finished story quests. */
  memories: Array<[string, string]>;
}

const empty = (): QuestResult => ({ toasts: [], grants: [], consume: [], changed: false, memories: [] });

// ---- world event → progress ------------------------------------------------

/** The quest-relevant events main.ts already fires elsewhere. */
export type QuestEvent =
  | { kind: "catch" } | { kind: "harvest" } | { kind: "forage" }
  | { kind: "cook" } | { kind: "busk" } | { kind: "sell"; count: number }
  | { kind: "talk"; npcId: string } | { kind: "reach"; region: Region };

/** Does this activity step match this event? (possession steps never do). */
function activityMatches(step: QuestStep, ev: QuestEvent): number {
  switch (step.kind) {
    case "catch": return ev.kind === "catch" ? 1 : 0;
    case "harvest": return ev.kind === "harvest" ? 1 : 0;
    case "forage": return ev.kind === "forage" ? 1 : 0;
    case "cook": return ev.kind === "cook" ? 1 : 0;
    case "busk": return ev.kind === "busk" ? 1 : 0;
    case "sell": return ev.kind === "sell" ? ev.count : 0;
    case "talk": return ev.kind === "talk" && ev.npcId === step.npcId ? 1 : 0;
    case "reach": return ev.kind === "reach" && ev.region === step.region ? 1 : 0;
    default: return 0;   // gather / gatherAny are possession steps
  }
}

/** How many of a possession step the bag currently satisfies. */
function possessionHeld(step: QuestStep, held: (id: string) => number): number {
  if (step.kind === "gather") return held(step.itemId);
  if (step.kind === "gatherAny") {
    let n = 0;
    for (const id of CATEGORY_IDS[step.category]) n += held(id);
    return n;
  }
  return 0;
}

/** True when EVERY step of an active quest is satisfied (ready to turn in). */
export function isReady(log: QuestLog, id: string, held: (id: string) => number): boolean {
  const st = log.quests[id];
  const def = questById(id);
  if (!st || !def || st.status !== "active") return false;
  return st.step >= def.steps.length;
}

/**
 * Advance active quests on a world event. Only the ACTIVE step of each active
 * quest can advance; when it fills, the step index moves on (skipping over any
 * already-satisfied possession steps is handled by refreshQuests). Auto-
 * completes `turnIn:false` quests whose steps are all done.
 */
export function notifyQuests(log: QuestLog, ev: QuestEvent, held: (id: string) => number): QuestResult {
  const res = empty();
  for (const id in log.quests) {
    const st = log.quests[id]!;
    if (st.status !== "active") continue;
    const def = questById(id);
    if (!def) continue;
    const step = def.steps[st.step];
    if (!step || isPossessionStep(step)) continue;   // possession steps handled by refresh
    const inc = activityMatches(step, ev);
    if (inc <= 0) continue;
    st.progress = Math.min(stepGoal(step), st.progress + inc);
    res.changed = true;
    if (st.progress >= stepGoal(step)) advanceStep(def, st, res);
  }
  if (res.changed) { autoComplete(log, res, held); saveQuests(log); }
  return res;
}

/**
 * Live-check possession steps against the bag each tick (cheap). Advances the
 * active step of any quest whose possession requirement is now met, and auto-
 * completes `turnIn:false` quests. Returns changed=false on the common no-op.
 */
export function refreshQuests(log: QuestLog, held: (id: string) => number): QuestResult {
  const res = empty();
  for (const id in log.quests) {
    const st = log.quests[id]!;
    if (st.status !== "active") continue;
    const def = questById(id);
    if (!def) continue;
    // Walk forward over any satisfied possession steps (held items can satisfy
    // several at once, e.g. re-checking after a reload).
    let moved = false;
    while (st.step < def.steps.length) {
      const step = def.steps[st.step]!;
      if (!isPossessionStep(step)) break;   // an activity step blocks until its event fires
      if (possessionHeld(step, held) < stepGoal(step)) break;
      advanceStep(def, st, res); moved = true;
    }
    if (moved) res.changed = true;
  }
  if (res.changed) { autoComplete(log, res, held); saveQuests(log); }
  return res;
}

/** Move to the next step; celebrate the finished step. Does NOT grant rewards. */
function advanceStep(def: QuestDef, st: QuestState, res: QuestResult) {
  const finished = def.steps[st.step];
  st.step += 1;
  st.progress = 0;
  if (st.step >= def.steps.length) {
    if (wantsTurnIn(def)) res.toasts.push(`Quest ready to turn in: “${def.title}” — see ${giverName(def)}.`);
  } else if (finished) {
    // a subtle nudge when an intermediate step of a multi-step quest completes
    res.toasts.push(`✓ ${finished.label}`);
  }
}

/** Auto-complete any ready `turnIn:false` quest right where it finished. */
function autoComplete(log: QuestLog, res: QuestResult, held: (id: string) => number) {
  for (const id in log.quests) {
    const st = log.quests[id]!;
    const def = questById(id);
    if (!def || st.status !== "active") continue;
    if (st.step >= def.steps.length && !wantsTurnIn(def))
      finishQuest(log, st, def, res, held);
  }
}

export function wantsTurnIn(def: QuestDef): boolean {
  return def.turnIn !== false;   // default true
}

// ---- lifecycle -------------------------------------------------------------

/** Accept a quest (a fresh state, or a re-run of a repeatable). */
export function acceptQuest(log: QuestLog, id: string, day: number): boolean {
  const def = questById(id);
  if (!def) return false;
  const cur = log.quests[id];
  if (cur && cur.status === "active") return false;
  if (cur && cur.status === "completed" && !def.repeatable) return false;
  log.quests[id] = {
    id, status: "active", step: 0, progress: 0,
    acceptedDay: day, completedDay: -1,
    completions: cur?.completions ?? 0,
  };
  // Clear the AI offer once its quest is taken.
  if (log.aiOffer?.questId === id) log.aiOffer = null;
  saveQuests(log);
  return true;
}

/** Abandon an active SIDE quest (story/tutorial quests aren't abandonable). */
export function abandonQuest(log: QuestLog, id: string): boolean {
  const st = log.quests[id];
  const def = questById(id);
  if (!st || !def || st.status !== "active" || def.kind !== "side") return false;
  delete log.quests[id];
  saveQuests(log);
  return true;
}

/** Turn in a ready quest at its giver — grants rewards + consumes delivered
 *  items. Returns null (with no side effects) if it isn't actually ready. */
export function turnInQuest(log: QuestLog, id: string, held: (id: string) => number): QuestResult | null {
  const st = log.quests[id];
  const def = questById(id);
  if (!st || !def || st.status !== "active") return null;
  if (st.step < def.steps.length) return null;   // not all steps done
  const res = empty();
  finishQuest(log, st, def, res, held);
  saveQuests(log);
  return res;
}

/** Grant rewards, record consumption, mark completed (or re-arm a repeatable). */
function finishQuest(log: QuestLog, st: QuestState, def: QuestDef, res: QuestResult, held: (id: string) => number) {
  // consume every possession step's items (delivery)
  for (const step of def.steps) {
    if (step.kind === "gather") res.consume.push({ id: step.itemId, qty: step.count });
    else if (step.kind === "gatherAny") pushCategoryConsume(res, step.category, step.count, held);
  }
  res.grants.push({ questId: def.id, reward: def.reward, giver: def.giver, title: def.title });
  res.toasts.push(`Quest complete: “${def.title}”!`);
  if (def.kind === "story")
    res.memories.push([`quest_${def.id}`, `You finished a favour for ${giverName(def)}: “${def.title}”.`]);
  res.changed = true;
  st.status = "completed";
  st.completedDay = st.acceptedDay;   // approximate; the Completed tab shows titles, not dates
  st.completions += 1;
  if (log.aiOffer?.questId === def.id) log.aiOffer = null;
}

/** Choose which specific category items to consume (cheapest/first held). */
function pushCategoryConsume(res: QuestResult, cat: keyof typeof CATEGORY_IDS, count: number, held: (id: string) => number) {
  let remaining = count;
  for (const id of CATEGORY_IDS[cat]) {
    if (remaining <= 0) break;
    const have = held(id);
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    res.consume.push({ id, qty: take });
    remaining -= take;
  }
}

// ---- reads for the UI + dialogue -------------------------------------------

function giverName(def: QuestDef): string {
  // The dialogue/UI layer has the real display names; the engine stays giver-id
  // based. Every roster id IS the lowercased name (maren, henrik, …), so a
  // capitalised id is the right display name for a toast without coupling the
  // engine to data/npcs.
  return def.giver.charAt(0).toUpperCase() + def.giver.slice(1);
}

/** Every active quest state (for the log's Active tab). */
export function activeQuests(log: QuestLog): QuestState[] {
  return Object.values(log.quests).filter((s) => s.status === "active");
}

/** Every completed quest state (for the log's Completed tab). */
export function completedQuests(log: QuestLog): QuestState[] {
  return Object.values(log.quests).filter((s) => s.status === "completed");
}

export function questState(log: QuestLog, id: string): QuestState | null {
  return log.quests[id] ?? null;
}

/** Live progress for a step: how many of its goal are met right now. */
export function stepProgress(def: QuestDef, st: QuestState, stepIndex: number, held: (id: string) => number): number {
  if (stepIndex < st.step) return stepGoal(def.steps[stepIndex]!);   // past steps are done
  if (stepIndex > st.step) return 0;                                  // future steps not started
  const step = def.steps[stepIndex];
  if (!step) return 0;
  return isPossessionStep(step)
    ? Math.min(stepGoal(step), possessionHeld(step, held))
    : st.progress;
}

// ---- availability + offering ----------------------------------------------

export interface AvailCtx {
  absoluteDay: number;
  season: Season;
  skillValue: (id: string) => number;
  friendship: (npcId: string) => number;
}

/** Is a quest currently offerable BY ITS GIVER? (not active, not completed
 *  unless repeatable, availability met). AI templates are excluded — they only
 *  surface via a validated AI offer (see aiOfferFor). */
export function isOfferable(log: QuestLog, def: QuestDef, ctx: AvailCtx): boolean {
  if (def.ai) return false;                       // dynamic templates: AI-gated only
  const st = log.quests[def.id];
  if (st?.status === "active") return false;
  if (st?.status === "completed" && !def.repeatable) return false;
  const a = def.availability;
  if (a) {
    if (a.minDay !== undefined && ctx.absoluteDay < a.minDay) return false;
    if (a.season !== undefined && ctx.season !== a.season) return false;
    if (a.skill && ctx.skillValue(a.skill.id) < a.skill.min) return false;
    if (a.relationship && ctx.friendship(def.giver) < a.relationship.min) return false;
    if (a.requires && log.quests[a.requires]?.status !== "completed") return false;
  }
  return true;
}

/** Authored quests a giver can offer right now (excludes AI templates). */
export function offerableFor(log: QuestLog, npcId: string, ctx: AvailCtx): QuestDef[] {
  return QUESTS.filter((q) => q.giver === npcId && isOfferable(log, q, ctx));
}

/** The pending AI offer for a giver, if any (a validated dynamic template). */
export function aiOfferFor(log: QuestLog, npcId: string): AiOffer | null {
  if (!log.aiOffer) return null;
  const def = questById(log.aiOffer.questId);
  if (!def || def.giver !== npcId) return null;
  const st = log.quests[def.id];
  if (st?.status === "active") return null;
  if (st?.status === "completed" && !def.repeatable) return null;
  return log.aiOffer;
}

/** Active quests whose GIVER is this NPC and which are ready to turn in. */
export function turnInReadyFor(log: QuestLog, npcId: string, held: (id: string) => number): QuestState[] {
  return activeQuests(log).filter((st) => {
    const def = questById(st.id);
    return def && def.giver === npcId && wantsTurnIn(def) && st.step >= def.steps.length && isReady(log, st.id, held);
  });
}

/** Set (or clear) the AI offer. Caller has already validated the template id +
 *  clamped the reward. */
export function setAiOffer(log: QuestLog, offer: AiOffer | null) {
  log.aiOffer = offer;
  saveQuests(log);
}
