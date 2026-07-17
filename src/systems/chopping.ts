import { CHOP_TIME } from "../config";

/**
 * Chopping a tree (AX-1) — a short PLACED busy state, the same shape as the
 * fishing / foraging / cooking / chore states: a flag + a countdown + the
 * completion signal on the tick the timer runs out. main.ts derives the swing
 * pose from `active` and emits wood-chip particles at the tree while it runs;
 * on completion it yields the wood, turns the tree to a stump, and persists.
 *
 * `treeIndex` is which WORLD_TREES entry is being felled — carried through so
 * completion knows which tree to stump without a second lookup. Pure timing;
 * everything mechanical lives in main.ts, kept trivially replaceable when the
 * real W3 chop animation lands (the REAL-ANIMATIONS LAW).
 */
export interface ChopState {
  active: boolean;
  timer: number;      // seconds remaining
  total: number;      // full duration (progress fraction, if ever needed)
  treeIndex: number;  // WORLD_TREES index being felled (-1 when idle)
}

export function createChop(): ChopState {
  return { active: false, timer: 0, total: 0, treeIndex: -1 };
}

/** `duration` lets the caller scale the swing time by Woodcutting tier (AX-2);
 *  it defaults to the base CHOP_TIME. */
export function startChop(c: ChopState, treeIndex: number, duration: number = CHOP_TIME) {
  if (c.active) return;
  c.active = true;
  c.treeIndex = treeIndex;
  c.total = duration;
  c.timer = c.total;
}

export function cancelChop(c: ChopState) {
  c.active = false;
  c.treeIndex = -1;
  c.timer = 0;
}

/** Returns the felled tree's index on the exact tick chopping completes, else
 *  null. */
export function updateChop(c: ChopState, dt: number): number | null {
  if (!c.active) return null;
  c.timer -= dt;
  if (c.timer > 0) return null;
  const i = c.treeIndex;
  c.active = false;
  c.treeIndex = -1;
  return i;
}
