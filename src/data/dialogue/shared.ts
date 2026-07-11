/**
 * Shared dialogue scaffolding for the condition-keyed engine (systems/
 * dialogue.ts). Two jobs:
 *
 *  - `genericOpenings(personality)` folds each personality's canned one-liners
 *    (data/npcs.ts PERSONALITY_LINES — kept, not deleted, per the block's "your
 *    call" on the old toast greeting) into UNCONDITIONAL `{}` opening fallbacks,
 *    so every NPC has a personality-true safety net and nothing is ever silent.
 *
 *  - `smallTalkBranch(personality)` builds the little 2-turn choice tree every
 *    NPC gets, flavoured per personality. Merchants (Maren/Tobin/Sera) layer a
 *    shop branch on top in their own files via `shopBranch()`.
 *
 * All lines are short (1-2 sentences), warm, English.
 */
import type { Personality } from "../npcs";
import { PERSONALITY_LINES } from "../npcs";
import type { Season, DayPhase } from "../../systems/calendar";
import type { WeatherKind } from "../../systems/weather";
import type { Region } from "../../world/zones";
import type { LineEntry, DialogueChoice, DialogueNode } from "../../systems/dialogue";

const u = (text: string): LineEntry => ({ conditions: {}, text });

/** The Harvest Festival's one shared opening line (Festival engine, Part A
 *  #6) — usable by EVERY NPC via `genericOpenings()`. Conditioned on the
 *  `festival_today` world flag (main.ts raises it on the festival's morning),
 *  so its single matched field naturally outranks the unconditional `{}`
 *  personality generics it's appended alongside, without needing its own
 *  per-NPC authoring. */
const FESTIVAL_LINE: LineEntry = {
  conditions: { flag: "festival_today" },
  text: "\"Happy Harvest Festival! Isn't the square lovely today?\"",
};

/** Personality one-liners → unconditional opening fallbacks (reused content),
 *  plus the shared festival line every NPC can say. */
export function genericOpenings(p: Personality): LineEntry[] {
  return [...PERSONALITY_LINES[p].map(u), FESTIVAL_LINE];
}

// ---- compact opening-line builders (keep the per-NPC files readable) --------
// Contextual variants carry >= 2 matched fields where they must out-rank the
// 1-field seasonal generics (weather / warmth / farm-repaired) — the engine's
// specificity is a plain matched-field count, so more context = a higher rank.

/** A per-season generic (1 field). Every NPC ships all four. */
export const season = (s: Season, text: string): LineEntry => ({ conditions: { season: s }, text });
/** A season+rain variant (2 fields → beats the seasonal generic when it rains). */
export const rainy = (s: Season, text: string): LineEntry => ({ conditions: { season: s, weather: "rain" }, text });
/** A cross-season weather variant (1 field). */
export const weatherLine = (w: WeatherKind, text: string): LineEntry => ({ conditions: { weather: w }, text });
/** A time-of-day variant (1 field). */
export const atPhase = (p: DayPhase, text: string): LineEntry => ({ conditions: { phase: p }, text });
/** A season+Friendship≥tier-2 warmer variant (2 fields). */
export const warm = (s: Season, text: string): LineEntry => ({ conditions: { season: s, friendshipTier: 2 }, text });
/** A cross-season warmer variant (1 field). */
export const warmAny = (text: string): LineEntry => ({ conditions: { friendshipTier: 2 }, text });
/** A "you're in my patch" region/work line (1 field). */
export const here = (r: Region, text: string): LineEntry => ({ conditions: { region: r }, text });
/** Reacts to the player's farm being fully mended, in this region (2 fields,
 *  reads the farm slice). */
export const farmWhole = (r: Region, text: string): LineEntry => ({ conditions: { farmRepaired: true, region: r }, text });
/** Reacts to an active world topic flag (1 field). */
export const topic = (flag: string, text: string): LineEntry => ({ conditions: { flag }, text });

// ---- the shared small-talk tree --------------------------------------------

interface SmallTalk {
  howBeen: string;    // reply to "How have you been?"
  warmClose: string;  // reply after the player answers warmly (nudges Friendship)
  favor: string;      // reply to "Anything I can do?" (a terminal beat)
}

const SMALL_TALK: Record<Personality, SmallTalk> = {
  "brisk-warm": {
    howBeen: "\"Busy — the good kind. Fish don't wait, and neither do I.\"",
    warmClose: "\"Ha. You're easy to talk to. Come by again.\"",
    favor: "\"Bring me a fine catch someday and we'll call it square.\"",
  },
  "cheerful-chatty": {
    howBeen: "\"Oh, wonderful, terrible, wonderful again — you know how it goes!\"",
    warmClose: "\"See, this is why I like you. Off you pop, then!\"",
    favor: "\"Just keep stopping to chat — that's favour enough for me.\"",
  },
  "precise-practical": {
    howBeen: "\"Orderly. Stock counted, ledger square. I can't complain.\"",
    warmClose: "\"A sensible sort, you. I appreciate that.\"",
    favor: "\"Nothing at present. I'll tell you plainly if that changes.\"",
  },
  "gruff-kind": {
    howBeen: "\"Back aches, crops grow. Same as ever. Mustn't grumble — much.\"",
    warmClose: "\"Hmph. You're decent company. Don't let it go to your head.\"",
    favor: "\"Mind your own land well. That's all the help anyone needs.\"",
  },
  "warm-motherly": {
    howBeen: "\"Oh, on my feet since dawn, dear, but the bread came out lovely.\"",
    warmClose: "\"Bless you. You've a good heart — I can always tell.\"",
    favor: "\"Just eat properly and come warm yourself by my oven now and then.\"",
  },
  "dreamy-performer": {
    howBeen: "\"Chasing a melody that won't sit still. But it's a fine chase.\"",
    warmClose: "\"You've a good ear for listening. That's rarer than you'd think.\"",
    favor: "\"Stay for a song sometime — that's the only coin I truly want.\"",
  },
  "quiet-craftsman": {
    howBeen: "\"Working. Wood's honest. Keeps a man out of trouble.\"",
    warmClose: "\"...Aye. Good talk. Better than most.\"",
    favor: "\"If something of yours breaks, bring it. I'll see to it.\"",
  },
  "shy-naturalist": {
    howBeen: "\"Oh — quiet, mostly. The forest's been kind this week.\"",
    warmClose: "\"You don't crowd a person. The birds trust you too, I think.\"",
    favor: "\"Tread gently out there. That's a kindness to us both.\"",
  },
  "eager-apprentice": {
    howBeen: "\"SO good! I almost landed a huge one, THIS big, I swear!\"",
    warmClose: "\"You're the best! I'm gonna tell Maren you came by!\"",
    favor: "\"Teach me a fishing trick someday? Please please please?\"",
  },
  "gossipy-connector": {
    howBeen: "\"Oh, I've been everywhere and heard everything. Ask me anything!\"",
    warmClose: "\"You and me, we should talk more. You HEAR things, I can tell.\"",
    favor: "\"Pass a bit of news along now and then. Keeps the roads lively.\"",
  },
  "weathered-sage": {
    howBeen: "\"The river and I go on much the same. Slow, steady, and in no hurry to change.\"",
    warmClose: "\"You've got a still way about you. The fish trust that. So do I.\"",
    favor: "\"Bring me a rare catch or some odd thing the water gave up, and I'll count us square.\"",
  },
};

/** The 2-turn tree shared by all NPCs (merchants add a shop branch on top). */
export function smallTalkBranch(p: Personality): { root: DialogueChoice[]; nodes: Record<string, DialogueNode> } {
  const t = SMALL_TALK[p];
  return {
    root: [
      { label: "How have you been?", npcReply: [u(t.howBeen)], next: "warm" },
      { label: "Anything I can do for you?", npcReply: [u(t.favor)], effect: { kind: "contact" } },
    ],
    nodes: {
      warm: {
        choices: [
          { label: "Glad to hear it.", npcReply: [u(t.warmClose)], effect: { kind: "friendship" } },
        ],
      },
    },
  };
}

// ---- the merchant shop branch (Maren / Tobin / Sera) ------------------------

/** A "What do you sell here?" branch that explains the stall (no trading yet).
 *  `pitch` is the keeper's own description of their wares. */
export function shopBranch(pitch: string): { choice: DialogueChoice; nodes: Record<string, DialogueNode> } {
  return {
    choice: {
      label: "What do you buy here?",
      npcReply: [{ conditions: {}, text: pitch }],
      next: "shopMore",
    },
    nodes: {
      shopMore: {
        choices: [
          {
            label: "I'll be back to trade.",
            npcReply: [{ conditions: {}, text: "\"You do that. The stall's not going anywhere.\"" }],
            effect: { kind: "contact" },
          },
        ],
      },
    },
  };
}
