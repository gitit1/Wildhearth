/**
 * The 10 townsfolk of Wildhearth v1 — pure DATA (identity, look, home/work
 * anchors, schedule shape, canned personality lines). No behavior lives here;
 * `systems/schedule.ts` reads this to decide where each NPC should be, and
 * `entities/npc.ts` turns that into a moving, poseable rig entity.
 *
 * Design intent (mirrors rig.ts's cheap-NPC goal):
 *  - Each NPC is one small `NpcDef` object. Distinct looks = distinct RigParams
 *    (build / hair / outfit colors per role, age-appropriate proportions via
 *    the rig's `age`). Adding an 11th NPC later is one more entry, nothing else.
 *  - Kid safety is STRUCTURAL: the type makes a romantic flag on a "kid"
 *    impossible to write (see `NpcDef` below), not merely discouraged.
 *  - v5-forward identity fields (`family` / `backstory` / `heartEvents`) exist
 *    now, typed and undefined for all 10, so v5's Heart-Event / family features
 *    don't force a schema break.
 *
 * Roster is logged for owner review in docs/WORKLOG.md.
 */
import { T } from "../config";
import type { RigParams } from "../art/rig";

export type AgeBand = "kid" | "adult" | "elder";

export type Personality =
  | "brisk-warm" | "cheerful-chatty" | "precise-practical" | "gruff-kind"
  | "warm-motherly" | "dreamy-performer" | "quiet-craftsman" | "shy-naturalist"
  | "eager-apprentice" | "gossipy-connector";

/** Drives place resolution + work pose in schedule.ts / npc.ts. */
export type Role =
  | "stall-fish" | "stall-produce" | "stall-goods"
  | "farmer" | "baker" | "musician" | "handyman"
  | "forager" | "fisher-kid" | "peddler";

interface NpcCommon {
  id: string;
  name: string;
  gender: "female" | "male";
  profession: string;            // human-readable role name
  personality: Personality;
  role: Role;
  blurb: string;                 // the "Look" one-liner
  rig: RigParams;                // its distinct look
  home: readonly [number, number];
  work: readonly [number, number];
  wake: number;                  // base wake hour (jittered ±1h per NPC in schedule.ts)
  sleep: number;                 // base bedtime hour
  workStart: number;
  workEnd: number;
  closedDay?: number;            // day-of-week (0=Sunday) this stall/trade is shut
  // Birthday: a ×2, cap-exempt gift day (Relationship engine). Spread across the
  // year; any day 1-10 given 10-day seasons (festival is day 15, unreachable here).
  birthday: { seasonIndex: number; day: number };
  // ---- v5-forward identity placeholders: typed, undefined for all 10 -------
  family?: string[];
  backstory?: string;
  heartEvents?: string[];
}

/**
 * Kid safety enforced by the compiler: only adults & elders can carry a
 * `romantic` flag at all. `{ ageBand: "kid", romantic: true }` is a type error
 * — a kid literally has no romance field to set, so no future edit can slip a
 * romanceable child into the roster.
 */
export type NpcDef = NpcCommon &
  ( | { ageBand: "kid" }
    | { ageBand: "adult" | "elder"; romantic: boolean } );

/** Safe read of the romance flag (kids narrow to `false`). */
export function isRomantic(def: NpcDef): boolean {
  return def.ageBand !== "kid" && def.romantic;
}

/** True when a given season-index + day-of-season is this NPC's birthday. */
export function isBirthday(def: NpcDef, seasonIndex: number, day: number): boolean {
  return def.birthday.seasonIndex === seasonIndex && def.birthday.day === day;
}

const P = (xT: number, yT: number): readonly [number, number] => [xT * T, yT * T];

// ---- 2-3 canned lines per personality (rotated on each Talk this block; the
//      real dialogue engine is the NEXT block and swaps in at the onTalk seam) -
export const PERSONALITY_LINES: Record<Personality, string[]> = {
  "brisk-warm": [
    "Fresh off the line today — you fishing too, then?",
    "No time to dawdle, but I'm glad you stopped by.",
    "Cold morning. Good one for the fish, mind you.",
  ],
  "cheerful-chatty": [
    "Beautiful day for it, isn't it? Isn't it!",
    "Best turnips this side of the river, if I say so myself.",
    "Oh, you should've seen the square yesterday — buzzing!",
  ],
  "precise-practical": [
    "Everything in its place. That's how the stall stays sound.",
    "If you need it, I likely stock it. If not, I'll know who does.",
    "Measure twice, buy once. That's the rule.",
  ],
  "gruff-kind": [
    "Hmph. Land doesn't work itself, you know.",
    "You're the one on the old place. It'll come good — with work.",
    "Weather's turning. Mind your crops.",
  ],
  "warm-motherly": [
    "You look like you could use a warm loaf, dear.",
    "Eat something, would you? All skin and worry, you are.",
    "The oven's on — whole square smells of it.",
  ],
  "dreamy-performer": [
    "Do you hear it? The square has its own melody.",
    "I'm chasing a tune that keeps slipping away...",
    "Toss a coin or just listen — either one feeds a musician.",
  ],
  "quiet-craftsman": [
    "Mm. Good timber, this.",
    "A joint's only as good as its fit.",
    "I'll have it mended by dusk. No sooner.",
  ],
  "shy-naturalist": [
    "Oh — you startled me. And the sparrows.",
    "This herb? Good for a cough. The forest gives, if you ask kindly.",
    "I don't come to the square much. Too loud for me.",
  ],
  "eager-apprentice": [
    "Maren says I'll land a big one someday. Today, maybe!",
    "Did you see that?! Almost had it! Almost!",
    "I'm going to be the best fisher on the lake. You'll see!",
  ],
  "gossipy-connector": [
    "Heard the produce stall's got a new crop in — pass it on!",
    "Everyone's talking about the old farm getting fixed up. That you?",
    "I go where the roads go, and the roads know everything.",
  ],
};

// ---- NPC route / waypoint tables (co-located with the roster since they're
//      NPC layout, not world layout). schedule.ts & npc.ts read these. ---------

/** Ada's foraging corners in the forest passage; she works a different one each
 *  day-of-week (dow % length). Chosen to sit beside the forest bushes, clear of
 *  trunk collision. */
export const FOREST_CORNERS: ReadonlyArray<readonly [number, number]> = [
  P(51.8, 8), P(58.5, 6.5), P(55.5, 11.4), P(50.8, 14.8), P(59.2, 13.2),
];
/** Where Ada keeps to when she "socializes" — she's shy of the square, so her
 *  version of gathering is a quiet forest clearing, never the well. */
export const ADA_FOREST_REST: readonly [number, number] = P(56, 16);

/** Jonas's farm↔market patrol nodes (all on the road/square, so straight
 *  segments between neighbours stay on legal ground). Direction alternates by
 *  day-of-week. */
export const JONAS_ROUTE: ReadonlyArray<readonly [number, number]> = [
  P(19, 22.5), P(30, 22.5), P(34.5, 22.5), P(45, 22.5), P(57, 22.5), P(64, 21.5), P(67, 22.3),
];

/** Bram fixes the neighbour farm on Mondays, and the market's shabby empty
 *  stall the rest of the week. */
export const BRAM_FARM_SPOT: readonly [number, number] = P(47.5, 20.8);
export const BRAM_MARKET_SPOT: readonly [number, number] = P(75.7, 18.35);

// ---- the 10 ----------------------------------------------------------------
// Homes: the six square cottages + Henrik's neighbour farmhouse, Ada's forest
// nook, Finn's lakeside spot, Jonas's roadside. Work spots stand just IN FRONT
// of the relevant building so the rig reads clearly (3/4 view; behind the
// counter it would be occluded by the awning).

export const NPCS: NpcDef[] = [
  {
    id: "maren", name: "Maren", gender: "female", ageBand: "adult", romantic: true,
    profession: "fish-buyer", personality: "brisk-warm", role: "stall-fish",
    blurb: "Maren, the fish-buyer — brisk hands, warm word, always faintly of the sea.",
    home: P(62.4, 22.35), work: P(63.7, 18.35),
    wake: 6, sleep: 22, workStart: 8, workEnd: 17, closedDay: 2, // Tuesday off
    birthday: { seasonIndex: 0, day: 3 },   // spring d3
    rig: {
      scale: 1, build: "average", legLength: 1, armLength: 1, skin: "#e3ac83",
      hair: "ponytail", hairColor: "#3a2a1a", age: "adult",
      outfit: { torso: "#2f6f7a", torsoStyle: 2, legs: "#33414d", accent: "#9c6b3f" },
    },
  },
  {
    id: "tobin", name: "Tobin", gender: "male", ageBand: "adult", romantic: true,
    profession: "produce-seller", personality: "cheerful-chatty", role: "stall-produce",
    blurb: "Tobin, the produce-seller — never met a stranger, never short of a story.",
    home: P(65.9, 28.35), work: P(67.7, 18.35),
    wake: 6, sleep: 23, workStart: 8, workEnd: 18, closedDay: 4, // Thursday off
    birthday: { seasonIndex: 0, day: 7 },   // spring d7
    rig: {
      scale: 1, build: "round", legLength: 1, armLength: 1, skin: "#e8b48a",
      hair: "short", hairColor: "#3a2a1a", age: "adult",
      outfit: { torso: "#5a9a48", torsoStyle: 1, legs: "#6b4a2b", accent: "#e2c24a" },
    },
  },
  {
    id: "sera", name: "Sera", gender: "female", ageBand: "adult", romantic: false,
    profession: "general-goods keeper", personality: "precise-practical", role: "stall-goods",
    blurb: "Sera, the general-goods keeper — everything squared away, nothing out of place.",
    home: P(77.4, 21.85), work: P(71.7, 18.35),
    wake: 6, sleep: 22, workStart: 9, workEnd: 18, closedDay: 6, // Saturday off
    birthday: { seasonIndex: 1, day: 2 },   // summer d2
    rig: {
      scale: 1, build: "slim", legLength: 1, armLength: 1, skin: "#d9a878",
      hair: "bun", hairColor: "#4a3520", age: "adult",
      outfit: { torso: "#8a6d9c", torsoStyle: 1, legs: "#3d3d46", accent: "#cbb28a" },
    },
  },
  {
    id: "henrik", name: "Henrik", gender: "male", ageBand: "elder", romantic: false,
    profession: "farmer", personality: "gruff-kind", role: "farmer",
    blurb: "Henrik, the neighbouring farmer — gruff as old bark, kind underneath.",
    home: P(41.5, 19.05), work: P(43.5, 20.4),
    wake: 5, sleep: 21, workStart: 7, workEnd: 17,
    birthday: { seasonIndex: 1, day: 8 },   // summer d8
    rig: {
      scale: 1, build: "average", legLength: 1, armLength: 1, skin: "#cf9f74",
      hair: "hat", hairColor: "#8a8172", hatColor: "#b59a5a", age: "elder",
      outfit: { torso: "#7a5330", legs: "#4a4a3a", accent: "#5d4630" },
    },
  },
  {
    id: "petra", name: "Petra", gender: "female", ageBand: "adult", romantic: false,
    profession: "baker", personality: "warm-motherly", role: "baker",
    blurb: "Petra, the baker — the square smells of her bread by mid-morning.",
    home: P(70.4, 28.65), work: P(70.4, 28.0),
    wake: 5, sleep: 22, workStart: 7, workEnd: 17,
    birthday: { seasonIndex: 2, day: 4 },   // autumn d4
    rig: {
      scale: 1, build: "round", legLength: 1, armLength: 1, skin: "#e8b48a",
      hair: "bun", hairColor: "#5b3b22", age: "adult",
      outfit: { torso: "#c26b4a", torsoStyle: 2, legs: "#7a5330", accent: "#b5843c" },
    },
  },
  {
    id: "liora", name: "Liora", gender: "female", ageBand: "adult", romantic: true,
    profession: "street musician", personality: "dreamy-performer", role: "musician",
    blurb: "Liora, the street musician — half here, half in whatever tune she's chasing.",
    home: P(61.9, 26.85), work: P(66.5, 22.2), // near the busk spot, never ON it
    wake: 8, sleep: 23, workStart: 12, workEnd: 20,
    birthday: { seasonIndex: 2, day: 9 },   // autumn d9
    rig: {
      scale: 1, build: "slim", legLength: 1.04, armLength: 1, skin: "#e3ac83",
      hair: "ponytail", hairColor: "#9c4a2a", age: "adult",
      outfit: { torso: "#6a4a8a", torsoStyle: 1, legs: "#3a4a7a", accent: "#e0be5c" },
    },
  },
  {
    id: "bram", name: "Bram", gender: "male", ageBand: "adult", romantic: true,
    profession: "carpenter", personality: "quiet-craftsman", role: "handyman",
    blurb: "Bram, the carpenter — says little, mends everything.",
    home: P(74.9, 28.15), work: P(75.7, 18.35),
    wake: 6, sleep: 22, workStart: 8, workEnd: 17,
    birthday: { seasonIndex: 3, day: 3 },   // winter d3
    rig: {
      scale: 1, build: "average", legLength: 1, armLength: 1.05, skin: "#c98a5a",
      hair: "short", hairColor: "#2a2018", age: "adult",
      outfit: { torso: "#4a6d8a", legs: "#5a4632", accent: "#7a5330" },
    },
  },
  {
    id: "ada", name: "Ada", gender: "female", ageBand: "elder", romantic: false,
    profession: "herbalist", personality: "shy-naturalist", role: "forager",
    blurb: "Ada, the herbalist — shy of the square, at home among the trees.",
    home: P(55, 3), work: P(55.5, 11.4),
    wake: 6, sleep: 21, workStart: 8, workEnd: 16,
    birthday: { seasonIndex: 3, day: 7 },   // winter d7
    rig: {
      scale: 0.97, build: "slim", legLength: 0.98, armLength: 1, skin: "#d9b48a",
      hair: "bun", hairColor: "#b8b0a0", age: "elder",
      outfit: { torso: "#5a7a4a", legs: "#4a5330", accent: "#8a6636" },
    },
  },
  {
    id: "finn", name: "Finn", gender: "male", ageBand: "kid",
    profession: "fishing apprentice", personality: "eager-apprentice", role: "fisher-kid",
    blurb: "Finn, Maren's fishing apprentice — all elbows and eagerness.",
    home: P(79, 22), work: P(83.5, 23.4), // out on the dock
    wake: 7, sleep: 21, workStart: 14, workEnd: 18, // weekdays after "school"; weekends handled in schedule.ts
    birthday: { seasonIndex: 0, day: 5 },   // spring d5
    rig: {
      scale: 0.82, build: "slim", legLength: 1, armLength: 1, skin: "#e8b48a",
      hair: "short", hairColor: "#6b4a2b", age: "kid",
      outfit: { torso: "#3f86a0", legs: "#4a5d8a", accent: "#2f6f7a" },
    },
  },
  {
    id: "jonas", name: "Jonas", gender: "male", ageBand: "adult", romantic: false,
    profession: "peddler", personality: "gossipy-connector", role: "peddler",
    blurb: "Jonas, the peddler — walks every road and carries every rumour.",
    home: P(57.5, 25), work: P(40, 22.5), // fallback; his real "work" is the JONAS_ROUTE patrol
    wake: 6, sleep: 23, workStart: 8, workEnd: 19,
    birthday: { seasonIndex: 1, day: 6 },   // summer d6
    rig: {
      scale: 1, build: "average", legLength: 1, armLength: 1, skin: "#d9a878",
      hair: "hat", hairColor: "#3a2a1a", hatColor: "#7a4e20", age: "adult",
      outfit: { torso: "#9a5a3a", torsoStyle: 1, legs: "#4a4038", accent: "#e2c24a" },
    },
  },
];
