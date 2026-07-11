import type { Season } from "../systems/calendar";
import type { Region } from "../world/zones";
import { FISH } from "./fish";
import { CROPS } from "./crops";
import { FORAGE } from "./forage";
import { FLOWERS } from "./flowers";
import { JUNK } from "./junk";

/**
 * Quest content (R6). Authored quest definitions + the small "AI-eligible"
 * dynamic template family the D3 offer generator flavours. Pure DATA — the
 * engine (systems/quests.ts) reads it, main.ts wires the rewards. No behaviour
 * here.
 *
 * A quest is a giver (one of the 10 townsfolk), a title/description, an ordered
 * list of STEPS, a REWARD (coins / items / friendship), and optional
 * AVAILABILITY conditions. Steps are SEQUENTIAL — one active at a time, its
 * progress tracked — mirroring the Guidance engine's step model so the two read
 * coherently. Steps come in two flavours:
 *
 *  - ACTIVITY steps (event-driven counters): catch / harvest / forage / cook /
 *    busk / sell / talk / reach. They advance when the matching world event
 *    fires (the same seams inventory/fishing/farming/dialogue already emit).
 *  - POSSESSION steps (passive, live-checked): gather (a specific item) /
 *    gatherAny (a whole category, e.g. "any 5 fish"). Satisfied while the bag
 *    holds enough; the items are CONSUMED when the quest is turned in. This is
 *    how a "bring me X" delivery works.
 *
 * A quest with `turnIn: true` (the default when it has a giver) becomes
 * "ready" once every step is satisfied and is CLAIMED by talking to the giver
 * (dialogue integration). A quest with `turnIn: false` auto-completes the
 * instant its steps are done (used for self-directed/tutorial-arc goals).
 */

// ---- item categories (for gatherAny + AI templates) ------------------------

export type ItemCategory = "fish" | "crop" | "forage" | "flower" | "junk";

/** Membership sets built once from the data tables — a gatherAny step counts
 *  every held item whose id is in the category. */
export const CATEGORY_IDS: Record<ItemCategory, ReadonlySet<string>> = {
  fish: new Set(FISH.map((f) => f.id)),
  crop: new Set(CROPS.map((c) => c.id)),
  forage: new Set(FORAGE.map((f) => f.id)),
  flower: new Set(FLOWERS.map((f) => f.id)),
  junk: new Set(JUNK.map((j) => j.id)),
};

export const CATEGORY_NAME: Record<ItemCategory, string> = {
  fish: "fish", crop: "produce", forage: "wild pickings", flower: "flowers", junk: "odd findings",
};

export function idsInCategory(cat: ItemCategory): string[] {
  return [...CATEGORY_IDS[cat]];
}

// ---- steps -----------------------------------------------------------------

/** Activity steps advance on a matching QuestEvent; possession steps are
 *  live-checked against the bag. `count` defaults to 1. `label` is the
 *  checklist line shown in the quest log. */
export type QuestStep =
  | { kind: "catch"; count: number; label: string }
  | { kind: "harvest"; count: number; label: string }
  | { kind: "forage"; count: number; label: string }
  | { kind: "cook"; count: number; label: string }
  | { kind: "busk"; count: number; label: string }
  | { kind: "sell"; count: number; label: string }
  | { kind: "talk"; npcId: string; label: string }
  | { kind: "reach"; region: Region; label: string }
  | { kind: "gather"; itemId: string; count: number; label: string }
  | { kind: "gatherAny"; category: ItemCategory; count: number; label: string };

/** A step that carries items the giver keeps on turn-in (gather / gatherAny). */
export function isPossessionStep(s: QuestStep): boolean {
  return s.kind === "gather" || s.kind === "gatherAny";
}

/** How many are needed for a step (talk/reach are single, count 1). */
export function stepGoal(s: QuestStep): number {
  return "count" in s ? s.count : 1;
}

// ---- rewards ---------------------------------------------------------------

export interface QuestReward {
  coins?: number;
  items?: Array<{ id: string; qty: number }>;
  friendship?: number;   // Friendship added with the GIVER on completion
}

// ---- availability ----------------------------------------------------------

export interface QuestAvailability {
  minDay?: number;                              // absolute day the quest can first appear
  season?: Season;                              // only offered in this season
  skill?: { id: string; min: number };          // player skill gate
  relationship?: { min: number };               // min Friendship with the giver
  requires?: string;                            // quest id that must be completed first
}

export type QuestKind = "tutorial" | "story" | "side";

export interface QuestDef {
  id: string;
  giver: string;                 // NPC id (must exist in data/npcs.ts)
  title: string;
  description: string;
  steps: QuestStep[];
  reward: QuestReward;
  kind: QuestKind;
  turnIn?: boolean;              // default true (claimed at the giver); false = auto-complete
  repeatable?: boolean;         // may be taken again after completion
  availability?: QuestAvailability;
  /** Eligible to be surfaced (flavoured) by the D3 AI offer generator. Such a
   *  quest is NEVER offered on its own — only after a validated AI offer names
   *  it. With AI off it is inert (byte-identical). */
  ai?: boolean;
}

// ---- the authored roster ---------------------------------------------------

export const QUESTS: QuestDef[] = [
  // -- Maren, the fish-buyer: a tavern-night fish run (the classic delivery) --
  {
    id: "maren_tavern_night",
    giver: "maren",
    kind: "story",
    title: "Tavern Night",
    description:
      "\"The tavern's putting on a supper and they've begged me for fish — more than my nets can spare. Bring me five, any kind, and I'll see you right.\"",
    steps: [
      { kind: "gatherAny", category: "fish", count: 5, label: "Bring 5 fish to Maren" },
    ],
    reward: { coins: 40, friendship: 8 },
    availability: {},
  },

  // -- Petra, the baker: a bread-run — deliver wheat, get bread back ----------
  {
    id: "petra_bread_run",
    giver: "petra",
    kind: "story",
    title: "Petra's Bread Run",
    description:
      "\"My flour barrel's near empty and the mill's slow this week. Fetch me three sheaves of wheat, dear, and I'll send you home with a fresh-baked pie — warm from the oven.\"",
    steps: [
      { kind: "gather", itemId: "wheat", count: 3, label: "Deliver 3 wheat to Petra" },
    ],
    reward: { coins: 18, items: [{ id: "berry_pie", qty: 1 }], friendship: 8 },
    availability: {},
  },

  // -- Henrik, the neighbouring farmer: a barn-fix favour (timber) -----------
  {
    id: "henrik_barn_fix",
    giver: "henrik",
    kind: "story",
    title: "Henrik's Barn Favour",
    description:
      "\"My barn door's hanging by a nail and my back's not what it was. Gather me some good timber — a few armfuls of acorns and chestnuts for the shims, and a length of that tangled rope you fisherfolk always haul up. Then I'll fix it proper.\"",
    steps: [
      { kind: "gather", itemId: "acorns", count: 4, label: "Gather 4 acorns" },
      { kind: "gather", itemId: "rope", count: 1, label: "Find 1 length of rope (fish it up)" },
    ],
    reward: { coins: 55, friendship: 10 },
    availability: { skill: { id: "foraging", min: 5 } },
  },

  // -- Finn, the fishing-apprentice kid: "catch me something shiny" (junk!) ---
  {
    id: "finn_something_shiny",
    giver: "finn",
    kind: "side",
    title: "Something Shiny",
    description:
      "\"Maren says a REAL fisher lands treasure, not just fish! Fish me up something shiny — an old tin, maybe? I bet it's pirate treasure. Please please please?\"",
    steps: [
      { kind: "gather", itemId: "tin", count: 1, label: "Fish up an empty tin for Finn" },
    ],
    reward: { coins: 12, friendship: 12 },
    repeatable: true,
    availability: {},
  },

  // -- A seasonal festival-prep quest (autumn): Tobin dressing the square -----
  {
    id: "tobin_festival_prep",
    giver: "tobin",
    kind: "side",
    title: "Dressing the Square",
    description:
      "\"Harvest Festival's nearly on us and the square wants colour! Bring me four of your finest cut flowers and a fat pumpkin for the stall, and I'll make it worth your while.\"",
    steps: [
      { kind: "gatherAny", category: "flower", count: 4, label: "Bring 4 cut flowers" },
      { kind: "gather", itemId: "pumpkin", count: 1, label: "Bring 1 pumpkin" },
    ],
    reward: { coins: 60, friendship: 8 },
    availability: { season: "autumn" },
  },

  // -- A flower-themed quest for Liora, using the R3 gardening system ---------
  {
    id: "liora_a_song_in_bloom",
    giver: "liora",
    kind: "side",
    title: "A Song in Bloom",
    description:
      "\"I'm writing a tune about a garden, but I can't hear it — I need to hold the thing itself. Grow me a little posy, would you? Three flowers of your own raising. Then I'll play you what they sound like.\"",
    steps: [
      { kind: "gatherAny", category: "flower", count: 3, label: "Bring Liora 3 home-grown flowers" },
    ],
    reward: { coins: 30, friendship: 12 },
    availability: {},
  },

  // ---- AI-eligible dynamic templates (D3). Inert without a validated AI
  //      offer naming them; the giver + steps + a balanced reward are authored
  //      so a promoted offer is always safe. Their title/description double as
  //      the SCRIPTED FALLBACK when AI flavouring fails. -----------------------
  {
    id: "dyn_maren_fresh_catch",
    giver: "maren",
    kind: "side",
    title: "A Fresh Catch",
    description: "\"Trade's brisk and my buckets are low. Land me a few fresh fish and I'll pay a fair coin.\"",
    steps: [{ kind: "gatherAny", category: "fish", count: 3, label: "Bring Maren 3 fish" }],
    reward: { coins: 24, friendship: 5 },
    ai: true,
    availability: {},
  },
  {
    id: "dyn_ada_forage_run",
    giver: "ada",
    kind: "side",
    title: "The Forest's Gift",
    description: "\"The forest's been generous. Gather me a basket of wild pickings and I'll share what I know of them.\"",
    steps: [{ kind: "gatherAny", category: "forage", count: 4, label: "Bring Ada 4 wild pickings" }],
    reward: { coins: 28, friendship: 6 },
    ai: true,
    availability: {},
  },
  {
    id: "dyn_petra_harvest_help",
    giver: "petra",
    kind: "side",
    title: "For the Ovens",
    description: "\"A good bake wants good produce. Bring me a few of your crops and there's a warm reward in it.\"",
    steps: [{ kind: "gatherAny", category: "crop", count: 4, label: "Bring Petra 4 crops" }],
    reward: { coins: 26, friendship: 6 },
    ai: true,
    availability: {},
  },
];

// ---- lookups ---------------------------------------------------------------

const BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export function questById(id: string): QuestDef | null {
  return BY_ID[id] ?? null;
}

export function questExists(id: string): boolean {
  return id in BY_ID;
}

/** The AI-eligible dynamic template ids — the only quests an AI offer may name. */
export function aiTemplateIds(): string[] {
  return QUESTS.filter((q) => q.ai).map((q) => q.id);
}

export function isAiTemplate(id: string): boolean {
  return questById(id)?.ai === true;
}
