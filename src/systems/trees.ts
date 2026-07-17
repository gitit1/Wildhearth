import { WORLD_TREES } from "../world/zones";
import { TREE_GATHER_CHANCE, TREE_GATHER_DAILY_CAP, TREE_REGROW_DAYS, TREES_KEY } from "../config";
import { treeSpeciesAt, type TreeSpecies } from "../art/props";

/**
 * Trees become interactable (IX-1 audit fix #1: they used to be draw-only,
 * clicking was dead). "Look" always works; broadleaf trees (anything but the
 * evergreen pine — see treeGatherable) also offer a light "Gather" for a
 * twig or an acorn.
 *
 * AX-1 adds the real wood economy on top: with an axe owned, ANY tree can be
 * "Chop"ped — it drops wood logs and becomes a STUMP, which regrows after
 * TREE_REGROW_DAYS so the world never permanently deforests.
 *
 * Two kinds of runtime state, split by persistence need:
 *  - `gathered`/`day`: the daily gather tally — SESSION-only, mirroring
 *    systems/foraging.ts's berry bushes (reset to "full" on every reload).
 *  - `chopped`/`choppedDay`: the stump state — PERSISTED additively under
 *    TREES_KEY, so a felled tree stays a stump across a reload and regrows on
 *    schedule. A save WITHOUT the key (any pre-AX-1 save) = every tree intact
 *    (loadChoppedTrees applies nothing), so there is NO save-key bump.
 */
export interface WorldTreeState {
  x: number; y: number; species: TreeSpecies;
  gathered: number; day: number;      // session-only daily gather tally
  chopped: boolean; choppedDay: number;   // persisted stump state (choppedDay = absolute day it was felled)
}

export function createTrees(): WorldTreeState[] {
  return WORLD_TREES.map(([x, y]) => ({
    x, y, species: treeSpeciesAt(x, y), gathered: 0, day: -1, chopped: false, choppedDay: -1,
  }));
}

/** Pine is the one species with nothing in this game's item set to plausibly
 *  bear (no pinecone/pine-nut prop yet) — it stays Look-only. Every broadleaf
 *  species (default/oak/birch) gets the light Gather action. */
export function treeGatherable(species: TreeSpecies): boolean {
  return species !== "pine";
}

/** Every tree can be chopped for wood — evergreens included (prime timber). The
 *  gate is the AXE, not the species (unlike Gather, which is fruit-bearing only). */
export function treeChoppable(_species: TreeSpecies): boolean {
  return true;
}

/** Fell a tree: mark it a stump, stamped with the absolute day so regrowth can
 *  time itself. The caller (main.ts) yields the wood + persists. */
export function chopTree(t: WorldTreeState, today: number) {
  t.chopped = true;
  t.choppedDay = today;
}

/** Day-rollover hook: regrow any stump that has stood TREE_REGROW_DAYS. Returns
 *  true if anything changed (so the caller can persist). */
export function regrowTrees(trees: WorldTreeState[], today: number): boolean {
  let changed = false;
  for (const t of trees) {
    if (t.chopped && today - t.choppedDay >= TREE_REGROW_DAYS) {
      t.chopped = false; t.choppedDay = -1; changed = true;
    }
  }
  return changed;
}

/** Persist only the felled trees (index → day), keyed by their WORLD_TREES
 *  order — compact, and a missing entry simply means "intact". */
export function saveChoppedTrees(trees: WorldTreeState[]) {
  const felled = trees
    .map((t, i) => (t.chopped ? { i, d: t.choppedDay } : null))
    .filter((e): e is { i: number; d: number } => e !== null);
  try { localStorage.setItem(TREES_KEY, JSON.stringify(felled)); } catch { /* private mode */ }
}

/** Apply persisted stump state onto a fresh tree array. A pre-AX-1 save has no
 *  TREES_KEY, so nothing is applied and every tree stays intact (no key bump,
 *  no crash). */
export function loadChoppedTrees(trees: WorldTreeState[]) {
  try {
    const raw = localStorage.getItem(TREES_KEY);
    if (!raw) return;
    const felled = JSON.parse(raw) as Array<{ i: number; d: number }>;
    if (!Array.isArray(felled)) return;
    for (const e of felled) {
      const t = trees[e.i];
      if (t && typeof e.d === "number") { t.chopped = true; t.choppedDay = e.d; }
    }
  } catch { /* corrupt → every tree intact */ }
}

/** A tree's own tiny find table — twigs common, an acorn now and then. Kept
 *  separate from data/forage.ts on purpose (see systems/economy.ts's GOOD_PRICES
 *  comment) so this doesn't dilute bush-forage odds; "acorns" is the SAME item
 *  bushes/the stall already know, just handed out directly here (no season/
 *  skill-floor gate — that gate only governs bush-pick eligibility). */
const TREE_FINDS: ReadonlyArray<{ id: string; weight: number }> = [
  { id: "twigs", weight: 70 },
  { id: "acorns", weight: 30 },
];

export type GatherResult =
  | { ok: true; itemId: string }
  | { ok: false; reason: "cap" | "miss" };

/** One Gather attempt against `today` (the calendar's absolute day count):
 *  rolls the tree's daily tally over on a new day, then — cap permitting —
 *  a chance-based weighted find. An attempt always spends one of the day's
 *  tries, hit or miss (a real tree doesn't owe you a find every time you
 *  check under it), which is what keeps this "modest" rather than grindable. */
export function gatherTree(t: WorldTreeState, today: number): GatherResult {
  if (t.day !== today) { t.day = today; t.gathered = 0; }
  if (t.gathered >= TREE_GATHER_DAILY_CAP) return { ok: false, reason: "cap" };
  t.gathered += 1;
  if (Math.random() >= TREE_GATHER_CHANCE) return { ok: false, reason: "miss" };
  const total = TREE_FINDS.reduce((sum, f) => sum + f.weight, 0);
  let r = Math.random() * total;
  for (const f of TREE_FINDS) { if ((r -= f.weight) <= 0) return { ok: true, itemId: f.id }; }
  return { ok: true, itemId: TREE_FINDS[TREE_FINDS.length - 1]!.id };
}
