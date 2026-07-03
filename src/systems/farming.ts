import { T, TILL_TIME, PLANT_TIME, HARVEST_TIME, CROP_GROW_TIME, FARMING_GROW_REDUCTION } from "../config";
import { PLOT } from "../world/zones";

/**
 * Farming: till (needs the hoe) -> plant (consumes seeds) -> grow -> harvest.
 * Work actions run on a short timer, mirroring fishing casts and foraging
 * picks; crop growth advances per-frame, faster with higher Farming skill.
 */

export type CellState = "wild" | "tilled" | "growing" | "ready";
export interface PlotCell { x: number; y: number; state: CellState; growth: number }

export type WorkKind = "till" | "plant" | "harvest";
export interface FarmWork { working: boolean; timer: number; cell: PlotCell | null; kind: WorkKind | null }

export const WORK_TIMES: Record<WorkKind, number> = {
  till: TILL_TIME, plant: PLANT_TIME, harvest: HARVEST_TIME,
};

export function createPlots(): PlotCell[] {
  const cells: PlotCell[] = [];
  for (let r = 0; r < PLOT.rows; r++)
    for (let c = 0; c < PLOT.cols; c++)
      cells.push({ x: PLOT.x + (c + 0.5) * T, y: PLOT.y + (r + 0.5) * T, state: "wild", growth: 0 });
  return cells;
}

export function createFarmWork(): FarmWork {
  return { working: false, timer: 0, cell: null, kind: null };
}

export function startWork(w: FarmWork, cell: PlotCell, kind: WorkKind) {
  if (w.working) return;
  w.working = true;
  w.timer = WORK_TIMES[kind];
  w.cell = cell;
  w.kind = kind;
}

export function cancelWork(w: FarmWork) { w.working = false; w.cell = null; w.kind = null; }

/** Returns {cell, kind} exactly on the tick a work action completes. */
export function updateFarmWork(w: FarmWork, dt: number): { cell: PlotCell; kind: WorkKind } | null {
  if (!w.working || !w.cell || !w.kind) return null;
  w.timer -= dt;
  if (w.timer > 0) return null;
  const done = { cell: w.cell, kind: w.kind };
  cancelWork(w);
  return done;
}

/** Advances growing crops; higher Farming skill shortens the grow time. */
export function updatePlots(cells: PlotCell[], dt: number, farmingSkill: number) {
  const growTime = CROP_GROW_TIME * (1 - FARMING_GROW_REDUCTION * (farmingSkill / 100));
  for (const c of cells) {
    if (c.state !== "growing") continue;
    c.growth += dt / growTime;
    if (c.growth >= 1) { c.growth = 1; c.state = "ready"; }
  }
}
