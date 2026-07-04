import {
  T, TILL_TIME, PLANT_TIME, HARVEST_TIME, WATER_TIME, CLEAR_TIME,
  WILT_DRY_DAYS, FARMING_GROW_REDUCTION, PLOTS_KEY,
} from "../config";
import { PLOT } from "../world/zones";
import { cropById } from "../data/crops";

/**
 * Farming: till (needs the hoe) -> plant (consumes a seed packet) -> tend ->
 * harvest. Tending is ACTIVE (crop-variety block): a crop only grows on days
 * it has been watered; a rained-on day waters itself; three consecutive dry
 * days and it wilts outright. Work actions run on a short timer, mirroring
 * fishing casts and foraging picks. Plot state persists on its own key.
 */

export type CellState = "wild" | "tilled" | "growing" | "ready" | "wilted";
export interface PlotCell {
  x: number; y: number;
  state: CellState;
  growth: number;           // 0..1 across the crop's watered growDays
  cropId: string | null;    // which crop is planted (growing/ready/wilted)
  watered: boolean;         // watered (by hand or rain) today
  dryDays: number;          // consecutive unwatered days
}

export type WorkKind = "till" | "plant" | "water" | "harvest" | "clear";
export interface FarmWork {
  working: boolean; timer: number;
  cell: PlotCell | null; kind: WorkKind | null;
  seedId: string | null;    // which seed packet a plant action uses
}

export const WORK_TIMES: Record<WorkKind, number> = {
  till: TILL_TIME, plant: PLANT_TIME, water: WATER_TIME, harvest: HARVEST_TIME, clear: CLEAR_TIME,
};

function freshCells(): PlotCell[] {
  const cells: PlotCell[] = [];
  for (let r = 0; r < PLOT.rows; r++)
    for (let c = 0; c < PLOT.cols; c++)
      cells.push({
        x: PLOT.x + (c + 0.5) * T, y: PLOT.y + (r + 0.5) * T,
        state: "wild", growth: 0, cropId: null, watered: false, dryDays: 0,
      });
  return cells;
}

interface SavedCell { s: CellState; g: number; c: string | null; w: boolean; d: number }

/** Loads the field, tolerant of junk/missing saves (fresh wild field). */
export function loadPlots(): PlotCell[] {
  const cells = freshCells();
  try {
    const raw = localStorage.getItem(PLOTS_KEY);
    if (!raw) return cells;
    const p = JSON.parse(raw) as { version?: number; cells?: SavedCell[] };
    if (!Array.isArray(p.cells)) return cells;
    for (let i = 0; i < cells.length && i < p.cells.length; i++) {
      const s = p.cells[i];
      if (!s || typeof s.s !== "string") continue;
      const cell = cells[i]!;
      cell.state = (["wild", "tilled", "growing", "ready", "wilted"] as CellState[]).includes(s.s) ? s.s : "wild";
      cell.growth = typeof s.g === "number" ? Math.max(0, Math.min(1, s.g)) : 0;
      cell.cropId = typeof s.c === "string" && cropById(s.c) ? s.c : null;
      cell.watered = !!s.w;
      cell.dryDays = typeof s.d === "number" ? s.d : 0;
      // a planted state without a known crop can't be resumed — back to tilled
      if ((cell.state === "growing" || cell.state === "ready" || cell.state === "wilted") && !cell.cropId) {
        cell.state = "tilled"; cell.growth = 0;
      }
    }
  } catch { /* corrupted save -> fresh field */ }
  return cells;
}

export function savePlots(cells: PlotCell[]) {
  const data = {
    version: 1,
    cells: cells.map((c): SavedCell => ({ s: c.state, g: c.growth, c: c.cropId, w: c.watered, d: c.dryDays })),
  };
  try { localStorage.setItem(PLOTS_KEY, JSON.stringify(data)); } catch { /* private mode */ }
}

/** New Game: the whole field back to wild. */
export function resetPlots(cells: PlotCell[]) {
  for (const c of cells) {
    c.state = "wild"; c.growth = 0; c.cropId = null; c.watered = false; c.dryDays = 0;
  }
  savePlots(cells);
}

export function createFarmWork(): FarmWork {
  return { working: false, timer: 0, cell: null, kind: null, seedId: null };
}

export function startWork(w: FarmWork, cell: PlotCell, kind: WorkKind, seedId: string | null = null) {
  if (w.working) return;
  w.working = true;
  w.timer = WORK_TIMES[kind];
  w.cell = cell;
  w.kind = kind;
  w.seedId = seedId;
}

export function cancelWork(w: FarmWork) { w.working = false; w.cell = null; w.kind = null; w.seedId = null; }

/** Returns {cell, kind, seedId} exactly on the tick a work action completes. */
export function updateFarmWork(w: FarmWork, dt: number): { cell: PlotCell; kind: WorkKind; seedId: string | null } | null {
  if (!w.working || !w.cell || !w.kind) return null;
  w.timer -= dt;
  if (w.timer > 0) return null;
  const done = { cell: w.cell, kind: w.kind, seedId: w.seedId };
  cancelWork(w);
  return done;
}

/**
 * Advances WATERED growing crops only (active tending). A crop needs
 * `growDays` watered in-game days; higher Farming skill shortens that.
 * Returns true if any cell became ready (so the caller can persist).
 */
export function updatePlots(cells: PlotCell[], dt: number, farmingSkill: number, daySeconds: number): boolean {
  let ripened = false;
  for (const c of cells) {
    if (c.state !== "growing" || !c.watered || !c.cropId) continue;
    const crop = cropById(c.cropId);
    if (!crop) continue;
    const total = crop.growDays * daySeconds * (1 - FARMING_GROW_REDUCTION * (farmingSkill / 100));
    c.growth += dt / total;
    if (c.growth >= 1) { c.growth = 1; c.state = "ready"; ripened = true; }
  }
  return ripened;
}

/**
 * The day turning over (call once per new in-game day, AFTER the weather
 * reroll): rain waters every growing crop for free; a crop that went the
 * whole previous day unwatered banks a dry day, and past WILT_DRY_DAYS it
 * wilts outright. Hand-watering is per-day, so yesterday's water drains.
 */
export function rollPlotsDay(cells: PlotCell[], raining: boolean) {
  for (const c of cells) {
    if (c.state !== "growing") continue;
    if (c.watered) { c.watered = false; c.dryDays = 0; }
    else {
      c.dryDays += 1;
      if (c.dryDays >= WILT_DRY_DAYS) { c.state = "wilted"; c.growth = 0; }
    }
    if (c.state === "growing" && raining) { c.watered = true; c.dryDays = 0; }
  }
  savePlots(cells);
}
