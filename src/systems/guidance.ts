import { GUIDANCE_KEY, TUTORIAL_MOVE_SECONDS } from "../config";
import type { Path } from "./meta";
import type { Guidance } from "./settings";
import {
  tutorialSteps, aspirationChain, aspirationDoneMemory, TUTORIAL_STEP_COUNT,
  type TutorialStep, type AspMetric,
} from "../data/guidance";

/**
 * Guidance Mode engine (Part A #5) — the PROGRESS half. The MODE
 * (tutorial/aspiration/none) lives in settings.ts (a New-Game-persistent
 * setting); this store is per-playthrough game state (wiped by New Game, in
 * saves.ts's GAME_KEYS). Pure state + logic, no UI and no toasts — every
 * side-effect is returned as a GuidanceResult the caller (main.ts) applies, the
 * same pattern the dialogue effects use.
 */

export interface GuidanceProgress {
  version: number;
  tutorialStep: number;      // 0..TUTORIAL_STEP_COUNT (== count → complete)
  tutorialDone: boolean;
  leftTutorial: boolean;     // true once Tutorial is ever left (skip/switch/finish) — blocks returning
  moveSeconds: number;       // real seconds walked, toward the "get your bearings" step
  aspirationStep: number;    // 0..chain.length (== length → complete)
  aspirationDone: boolean;
  aspProgress: number;       // progress within the ACTIVE aspiration step only
}

/** Events the world fires; the engine maps them to step progress. */
export type GuidanceEvent =
  | { kind: "move"; seconds: number }
  | { kind: "catch" } | { kind: "plant" } | { kind: "harvest" }
  | { kind: "busk"; tip: number } | { kind: "cook" }
  | { kind: "sale" } | { kind: "buy" } | { kind: "repair" };

/** What the caller must apply (toasts / Memory Book entries / mode switch). */
export interface GuidanceResult {
  toasts: string[];
  memories: Array<[string, string]>;   // key, text — deduped once-only by the Memory Book
  advanced: boolean;                    // a step advanced this call (force-refresh the bubble)
  finishedTutorial: boolean;            // → main switches to None + the farewell line
}

const empty = (): GuidanceResult => ({ toasts: [], memories: [], advanced: false, finishedTutorial: false });

function fresh(): GuidanceProgress {
  return {
    version: 1, tutorialStep: 0, tutorialDone: false, leftTutorial: false,
    moveSeconds: 0, aspirationStep: 0, aspirationDone: false, aspProgress: 0,
  };
}

export function loadGuidance(): GuidanceProgress {
  const f = fresh();
  try {
    const raw = localStorage.getItem(GUIDANCE_KEY);
    if (!raw) return f;
    const d = JSON.parse(raw) as Partial<GuidanceProgress>;
    return {
      version: 1,
      tutorialStep: clampInt(d.tutorialStep, 0, TUTORIAL_STEP_COUNT),
      tutorialDone: d.tutorialDone === true,
      leftTutorial: d.leftTutorial === true,
      moveSeconds: typeof d.moveSeconds === "number" && d.moveSeconds >= 0 ? d.moveSeconds : 0,
      aspirationStep: clampInt(d.aspirationStep, 0, 99),
      aspirationDone: d.aspirationDone === true,
      aspProgress: typeof d.aspProgress === "number" && d.aspProgress >= 0 ? d.aspProgress : 0,
    };
  } catch { return f; }
}

export function saveGuidance(g: GuidanceProgress) {
  try { localStorage.setItem(GUIDANCE_KEY, JSON.stringify({ ...g, version: 1 })); }
  catch { /* private mode */ }
}

/** New Game: wipe progress in place (keeps main's single object reference). */
export function resetGuidance(g: GuidanceProgress) {
  Object.assign(g, fresh());
  saveGuidance(g);
}

function clampInt(v: unknown, lo: number, hi: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo;
}

// ---- lifecycle -------------------------------------------------------------

export function startTutorial(g: GuidanceProgress) {
  g.tutorialStep = 0; g.tutorialDone = false; g.moveSeconds = 0;
  saveGuidance(g);
}

export function startAspiration(g: GuidanceProgress) {
  g.aspirationStep = 0; g.aspirationDone = false; g.aspProgress = 0;
  saveGuidance(g);
}

/** Mark Tutorial as left (skip / switch away / finish) so it can't be re-entered. */
export function markLeftTutorial(g: GuidanceProgress) {
  g.leftTutorial = true;
  saveGuidance(g);
}

/** True while a Tutorial is chosen and unfinished (used for the load prompt). */
export function tutorialInProgress(mode: Guidance, g: GuidanceProgress): boolean {
  return mode === "tutorial" && !g.tutorialDone;
}

/** The future Settings screen calls this before offering "Tutorial". */
export function tutorialAvailable(g: GuidanceProgress): boolean {
  return !g.leftTutorial && !g.tutorialDone;
}

// ---- read the current step / objective (for the UI) ------------------------

export function currentTutorialStep(g: GuidanceProgress, path: Path): TutorialStep | null {
  if (g.tutorialDone) return null;
  return tutorialSteps(path)[g.tutorialStep] ?? null;
}

/** The active objective's pill text; `coins` feeds the running counter on the
 *  coins-threshold step. Null when the chain is complete. */
export function currentAspiration(g: GuidanceProgress, path: Path, coins: number): string | null {
  if (g.aspirationDone) return null;
  const step = aspirationChain(path)[g.aspirationStep];
  if (!step) return null;
  if (step.goal <= 1) return step.text;
  const p = step.metric === "coins" ? coins : g.aspProgress;
  return `${step.text} (${Math.min(p, step.goal)}/${step.goal})`;
}

// ---- progress from events --------------------------------------------------

const ACTION_METRIC: Record<Path, GuidanceEvent["kind"]> = {
  fisher: "catch", farmer: "plant", musician: "busk", keeper: "cook",
};

export function notifyGuidance(g: GuidanceProgress, mode: Guidance, path: Path, ev: GuidanceEvent): GuidanceResult {
  if (mode === "tutorial" && !g.tutorialDone) return tutorialEvent(g, path, ev);
  if (mode === "aspiration" && !g.aspirationDone) return aspirationEvent(g, path, ev);
  return empty();
}

/** Coins-threshold aspiration steps advance passively — called each frame. */
export function tickGuidanceCoins(g: GuidanceProgress, mode: Guidance, path: Path, coins: number): GuidanceResult {
  if (mode !== "aspiration" || g.aspirationDone) return empty();
  const step = aspirationChain(path)[g.aspirationStep];
  if (step && step.metric === "coins" && coins >= step.goal) return advanceAspiration(g, path);
  return empty();
}

function tutorialEvent(g: GuidanceProgress, path: Path, ev: GuidanceEvent): GuidanceResult {
  const step = g.tutorialStep;
  let complete = false;
  if (step === 0) {
    // move fires every frame while walking — accumulate WITHOUT persisting each
    // tick (restarting the 3s walk after a reload is harmless), save on complete
    if (ev.kind === "move") { g.moveSeconds += ev.seconds; if (g.moveSeconds >= TUTORIAL_MOVE_SECONDS) complete = true; else return empty(); }
  } else if (step === 1) {
    complete = ev.kind === ACTION_METRIC[path];
  } else if (step === 2) {
    complete = ev.kind === "sale";
  } else if (step === 3) {
    complete = ev.kind === "buy";
  }
  if (!complete) return empty();
  return advanceTutorial(g, path);
}

function advanceTutorial(g: GuidanceProgress, path: Path): GuidanceResult {
  const res = empty();
  const done = tutorialSteps(path)[g.tutorialStep];
  if (done) res.toasts.push(done.doneToast);
  g.tutorialStep += 1;
  g.moveSeconds = 0;
  res.advanced = true;
  if (g.tutorialStep >= TUTORIAL_STEP_COUNT) {
    g.tutorialDone = true;
    g.leftTutorial = true;   // finishing counts as leaving — no going back
    res.finishedTutorial = true;
    res.memories.push(["tutorial_done", "You learned the rhythm of the farm — your first days, taken in hand."]);
  }
  saveGuidance(g);
  return res;
}

function aspInc(metric: AspMetric, ev: GuidanceEvent): number {
  if (metric === "tips") return ev.kind === "busk" ? ev.tip : 0;
  return ev.kind === metric ? 1 : 0;
}

function aspirationEvent(g: GuidanceProgress, path: Path, ev: GuidanceEvent): GuidanceResult {
  const step = aspirationChain(path)[g.aspirationStep];
  if (!step || step.metric === "coins") { return empty(); }   // coins handled by the tick
  const inc = aspInc(step.metric, ev);
  if (inc <= 0) return empty();
  g.aspProgress += inc;
  if (g.aspProgress >= step.goal) return advanceAspiration(g, path);
  saveGuidance(g);
  return empty();
}

function advanceAspiration(g: GuidanceProgress, path: Path): GuidanceResult {
  const res = empty();
  const chain = aspirationChain(path);
  const done = chain[g.aspirationStep];
  if (done) res.toasts.push(done.done);
  g.aspirationStep += 1;
  g.aspProgress = 0;
  res.advanced = true;
  if (g.aspirationStep >= chain.length) {
    g.aspirationDone = true;
    res.memories.push(["aspiration_done", aspirationDoneMemory(path)]);
  }
  saveGuidance(g);
  return res;
}
