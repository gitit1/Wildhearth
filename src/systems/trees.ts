import { WORLD_TREES } from "../world/zones";
import { TREE_GATHER_CHANCE, TREE_GATHER_DAILY_CAP } from "../config";
import { treeSpeciesAt, type TreeSpecies } from "../art/props";

/**
 * Trees become interactable (IX-1 audit fix #1: they used to be draw-only,
 * clicking was dead). "Look" always works; broadleaf trees (anything but the
 * evergreen pine — see treeGatherable) also offer a light "Gather" for a
 * twig or an acorn. This is deliberately NOT a wood economy (no chopping, no
 * timber) — a small, chance-based forage top-up with its own tiny daily cap
 * per tree, reusing the existing item/inventory/skill plumbing
 * (systems/inventory.ts addItem, systems/skills.ts gainSkill).
 *
 * State is session-only, mirroring systems/foraging.ts's berry bushes (they
 * also reset to "full" on every reload, never persisted) — a tree's daily
 * gather tally isn't worth a save-file entry.
 */
export interface WorldTreeState { x: number; y: number; species: TreeSpecies; gathered: number; day: number }

export function createTrees(): WorldTreeState[] {
  return WORLD_TREES.map(([x, y]) => ({ x, y, species: treeSpeciesAt(x, y), gathered: 0, day: -1 }));
}

/** Pine is the one species with nothing in this game's item set to plausibly
 *  bear (no pinecone/pine-nut prop yet) — it stays Look-only. Every broadleaf
 *  species (default/oak/birch) gets the light Gather action. */
export function treeGatherable(species: TreeSpecies): boolean {
  return species !== "pine";
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
