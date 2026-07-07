import type { Path, LifeGoal } from "../systems/meta";

/**
 * Guidance Mode content (Part A #5) — the Tutorial's four-step skeleton (wording
 * adapts to the chosen path) and one 3-step Aspiration chain per path, plus a
 * life-goal flavored line. Pure content; the engine (systems/guidance.ts) reads
 * it. Warm, concise, English.
 */

export interface TutorialStep {
  title: string;
  body: string;
  doneToast: string;         // celebrated when the step completes
}

// Step 1 (first action) wording per path; steps 0/2/3 share a skeleton with a
// small per-path flourish on the sale line.
const ACTION: Record<Path, TutorialStep> = {
  fisher:   { title: "Your first catch", body: "Click the pond (or the river spots) to cast your rod and wait for a bite.", doneToast: "A catch! That's a sellable good in your bag." },
  farmer:   { title: "Work the soil", body: "Click a plot to till it with your hoe, then plant one of your corn seeds.", doneToast: "Planted! It'll want watering as it grows." },
  musician: { title: "Play a tune", body: "Head to the busking spot in the market square and click it to perform.", doneToast: "Coins for a song — your first tips." },
  keeper:   { title: "Cook something", body: "Step into the farmhouse and use the hearth to cook with what you've foraged.", doneToast: "A warm dish — worth more than its parts." },
};

const SALE_HINT: Record<Path, string> = {
  fisher: "Sell your catch — walk to a market stall (or Maren's fish stall) and Trade.",
  farmer: "Sell your produce — walk to a market stall and Trade.",
  musician: "You've earned coins already — walk to a market stall and try selling any goods you've gathered.",
  keeper: "Sell your dish — walk to a market stall and Trade.",
};

export function tutorialSteps(path: Path): TutorialStep[] {
  return [
    {
      title: "Get your bearings",
      body: "Walk around your new farm. Use WASD, the arrow keys, or click the ground to move there.",
      doneToast: "You've found your feet. Now — let's earn a living.",
    },
    ACTION[path],
    {
      title: "Your first sale",
      body: SALE_HINT[path],
      doneToast: "Sold! Watch the coins land in your purse.",
    },
    {
      title: "Your first purchase",
      body: "Spend those coins — open a market stall's Trade window and buy something you need.",
      doneToast: "That's the whole loop — earn, sell, spend. You've got the rhythm of it.",
    },
  ];
}

export const TUTORIAL_STEP_COUNT = 4;

// ---- Aspiration chains -----------------------------------------------------

export type AspMetric = "catch" | "sale" | "coins" | "plant" | "harvest" | "repair" | "busk" | "tips" | "cook" | "buy";

export interface AspirationStep {
  metric: AspMetric;
  goal: number;
  text: string;              // objective label (a running (n/goal) is appended when goal > 1)
  done: string;              // toast when this step completes
}

const CHAINS: Record<Path, AspirationStep[]> = {
  fisher: [
    { metric: "catch", goal: 3, text: "Catch 3 fish", done: "Three good catches — Maren will want those." },
    { metric: "sale", goal: 1, text: "Sell your catch at a stall", done: "Sold! Coins in your purse at last." },
    { metric: "coins", goal: 40, text: "Save 40 coins", done: "40 coins saved — a real start on a better rod." },
  ],
  farmer: [
    { metric: "plant", goal: 3, text: "Plant 3 crops", done: "Three seeds in the ground — now they grow." },
    { metric: "harvest", goal: 1, text: "Harvest a crop", done: "The first harvest from your own soil." },
    { metric: "repair", goal: 1, text: "Repair or expand the farm", done: "The farm's a little more truly yours now." },
  ],
  musician: [
    { metric: "busk", goal: 3, text: "Busk 3 times", done: "Three tunes played — the square knows your face." },
    { metric: "tips", goal: 30, text: "Earn 30 coins from tips", done: "30 coins in tips — your music pays." },
    { metric: "buy", goal: 1, text: "Buy something nice", done: "A little reward, honestly earned." },
  ],
  keeper: [
    { metric: "cook", goal: 2, text: "Cook 2 dishes", done: "Two dishes done — the hearth earns its keep." },
    { metric: "sale", goal: 1, text: "Sell a dish", done: "A cooked meal sells for more than its parts." },
    { metric: "coins", goal: 45, text: "Save 45 coins toward a hen", done: "45 coins — nearly a hen of your own." },
  ],
};

export function aspirationChain(path: Path): AspirationStep[] {
  return CHAINS[path];
}

const CHAIN_DONE: Record<Path, string> = {
  fisher: "You found your feet as a fisher — the water provides.",
  farmer: "You found your feet as a farmer — the land provides.",
  musician: "You found your feet as a musician — the square provides.",
  keeper: "You found your feet in the kitchen — your own two hands provide.",
};

export function aspirationDoneMemory(path: Path): string {
  return CHAIN_DONE[path];
}

// ---- life-goal flavour (shown once when Aspiration begins) ------------------

const GOAL_LINE: Record<LifeGoal, string> = {
  family:       "You want a full home one day — it starts with a roof of your own.",
  independence: "You mean to owe nothing to no one — every coin you earn is yours.",
  community:    "You want to belong here — the market's a good place to be seen.",
  mastery:      "You mean to master a craft — repetition and care are the whole secret.",
  fortune:      "You're after real wealth — small sales now, a fortune in time.",
};

export function lifeGoalAspirationLine(goal: LifeGoal): string {
  return GOAL_LINE[goal];
}
