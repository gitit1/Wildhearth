import { WASH_TIME, SIT_TIME } from "../config";

/**
 * Interior "chore" activities (GF-1 fix 3) — washing at the basin and sitting in
 * the rest chair. These used to be an instant stat+toast; they are now short
 * PLACED states so the heroine reads as actually doing them (a lean/bob + code-
 * drawn particles for wash, a seated breathing sway for sit — main.ts derives
 * the pose from `active`+`kind` and drives the interim motion). Mirrors the
 * fishing/foraging/cooking state shape: a flag + a countdown + a completion
 * signal on the tick the timer runs out. The need restore + toast fire on
 * COMPLETION (main.ts), not on start.
 *
 * The placement (glide onto the seat, stand up onto a free spot, face the spot)
 * lives in main.ts — this module is pure timing, kept trivially replaceable when
 * real W3 sprite frames land.
 */

export type ChoreKind = "wash" | "sit";

export interface ChoreState {
  active: boolean;
  kind: ChoreKind | null;
  timer: number;   // seconds remaining
  total: number;   // full duration (for a progress fraction, if ever needed)
}

export function createChores(): ChoreState {
  return { active: false, kind: null, timer: 0, total: 0 };
}

export function startChore(c: ChoreState, kind: ChoreKind) {
  if (c.active) return;
  c.active = true;
  c.kind = kind;
  c.total = kind === "wash" ? WASH_TIME : SIT_TIME;
  c.timer = c.total;
}

export function cancelChore(c: ChoreState) {
  c.active = false;
  c.kind = null;
  c.timer = 0;
}

/** Returns the chore kind on the exact tick it completes, else null. */
export function updateChore(c: ChoreState, dt: number): ChoreKind | null {
  if (!c.active) return null;
  c.timer -= dt;
  if (c.timer > 0) return null;
  const k = c.kind;
  c.active = false;
  c.kind = null;
  return k;
}
