import type { Path, LifeGoal, StarterTool } from "../systems/meta";
import { STARTER_SKILL_SEED } from "../config";

/**
 * Starting Paths (Character Creation) — the four identities a new life can
 * begin as. Each grants a kit (tool + path-specific items) and seeds its
 * preferred skill to STARTER_SKILL_SEED. ALL paths additionally get the
 * universal STARTER_FOOD + STARTING_COINS (granted in main's newGameReset),
 * per DECISIONS' "Starting kit". Pure content — no logic — so adding a fifth
 * path later is one more entry here.
 */

export interface PathDef {
  id: Path;
  title: string;             // "Fisher"
  tool: StarterTool;         // rod / hoe / lute / pot — kept in sync on meta.starterTool
  iconId: string;            // item id the card's code-drawn icon paints
  skill: string;             // the skill seeded to STARTER_SKILL_SEED
  skillLabel: string;        // "Fishing"
  kit: ReadonlyArray<readonly [string, number]>;   // path-specific items (excl. food + coins)
  blurb: string;
  note: string;              // the small "+10 …" tag under the card
}

/** 2-3 days of food every path starts with (DECISIONS "Starting kit"). */
export const STARTER_FOOD: ReadonlyArray<readonly [string, number]> = [["berries", 3]];

export const PATHS: PathDef[] = [
  {
    id: "fisher", title: "Fisher", tool: "rod", iconId: "rod",
    skill: "fishing", skillLabel: "Fishing",
    kit: [["rod", 1]],
    blurb: "Live off the water's quiet patience. You start with a rod and a few berries.",
    note: `+${STARTER_SKILL_SEED} Fishing`,
  },
  {
    id: "farmer", title: "Farmer", tool: "hoe", iconId: "hoe",
    skill: "farming", skillLabel: "Farming",
    kit: [["hoe", 1], ["corn-seeds", 3]],
    blurb: "Work the land from day one — a hoe and three packets of corn seed.",
    note: `+${STARTER_SKILL_SEED} Farming`,
  },
  {
    id: "musician", title: "Musician", tool: "lute", iconId: "lute",
    skill: "busking", skillLabel: "Busking",
    kit: [["lute", 1]],
    blurb: "Sing for your supper at the square. You start with an instrument in hand.",
    note: `+${STARTER_SKILL_SEED} Busking`,
  },
  {
    id: "keeper", title: "Animal-Keeper", tool: "pot", iconId: "pot",
    skill: "cooking", skillLabel: "Cooking",
    kit: [["pail", 1], ["pot", 1]],
    blurb: "Forage, cook, and sell — save toward your first hen. A feed pail and a cooking pot.",
    note: `+${STARTER_SKILL_SEED} Cooking · the pail waits for animals`,
  },
];

export function pathById(id: Path): PathDef {
  return PATHS.find((p) => p.id === id) ?? PATHS[0]!;
}

export interface LifeGoalDef { id: LifeGoal; title: string; blurb: string }

/** The five Aspirations (DECIDED this session — logged in WORKLOG). Aspiration
 *  mode reads the chosen one for a flavored line; nothing mechanical hangs on
 *  it in v1. */
export const LIFE_GOALS: LifeGoalDef[] = [
  { id: "family",       title: "Family",       blurb: "A full home — someone to share it all with." },
  { id: "independence", title: "Independence", blurb: "Owe nothing to no one. Stand on your own two feet." },
  { id: "community",    title: "Community",    blurb: "Belong here. Become one of Wildhearth's own." },
  { id: "mastery",      title: "Mastery",      blurb: "Perfect a craft until few in the land can match you." },
  { id: "fortune",      title: "Fortune",      blurb: "Turn these few coins into real, lasting wealth." },
];

export function lifeGoalById(id: LifeGoal): LifeGoalDef {
  return LIFE_GOALS.find((g) => g.id === id) ?? LIFE_GOALS[0]!;
}
