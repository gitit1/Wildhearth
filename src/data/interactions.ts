/**
 * Categorized social interactions (Relationship engine, Part A #3). Not one
 * generic "talk" — a handful of specific actions grouped under Friendly / Funny
 * / Romantic / Blunt. Each is a small affection delta on one axis plus a
 * scripted response flavoured by the NPC's personality. Romantic ones only
 * surface for romantic-candidate adults once Friendship is high enough (that
 * gate lives at the menu; this file is pure content + the axis/delta data).
 *
 * Delta ranges (from the block spec): Friendly/Funny/Blunt move Friendship
 * +2..+4; Romantic moves Romance +3..+5. The exact per-interaction value is
 * content here (like a fish's price lives in data/fish.ts); the diminishing-
 * returns MULTIPLIER that halves a repeat is the tuning knob (config).
 */
import type { Personality } from "./npcs";

export type InteractCategory = "friendly" | "funny" | "romantic" | "blunt";

export interface InteractionDef {
  id: string;
  category: InteractCategory;
  label: string;
  axis: "friendship" | "romance";
  base: number;   // full-strength delta before the per-day diminishing multiplier
}

export const INTERACTIONS: InteractionDef[] = [
  { id: "chat", category: "friendly", label: "Chat", axis: "friendship", base: 3 },
  { id: "askday", category: "friendly", label: "Ask about their day", axis: "friendship", base: 4 },
  { id: "joke", category: "funny", label: "Tell a joke", axis: "friendship", base: 3 },
  { id: "jest", category: "funny", label: "Playful jest", axis: "friendship", base: 2 },
  { id: "compliment", category: "romantic", label: "Compliment", axis: "romance", base: 4 },
  { id: "flirt", category: "romantic", label: "Flirt", axis: "romance", base: 5 },
  { id: "tease", category: "blunt", label: "Tease", axis: "friendship", base: 2 },
  { id: "grumble", category: "blunt", label: "Grumble together", axis: "friendship", base: 3 },
];

export function interactionById(id: string): InteractionDef | undefined {
  return INTERACTIONS.find((i) => i.id === id);
}

// A short response line per (category, personality). Falls back to a generic
// per-category line so a personality never goes silent.
const GENERIC: Record<InteractCategory, string[]> = {
  friendly: ["a good, easy word between you.", "they warm to the company."],
  funny: ["that earns a laugh.", "they can't help a grin."],
  romantic: ["they glance away, cheeks a little warm.", "a soft, pleased smile."],
  blunt: ["they snort — fair enough.", "a wry look, no offence taken."],
};

const LINES: Record<InteractCategory, Partial<Record<Personality, string[]>>> = {
  friendly: {
    "brisk-warm": ["\"Good to see you — quick word, then back to it.\"", "\"Fish are biting and so's my mood today.\""],
    "cheerful-chatty": ["\"Oh, don't get me started — but do, please!\"", "\"I've a hundred things to tell you!\""],
    "precise-practical": ["\"A fair morning for a fair chat.\"", "\"Well said. Orderly mind, you.\""],
    "gruff-kind": ["\"Hmph. Suppose the talk's welcome.\"", "\"You're alright, you know.\""],
    "warm-motherly": ["\"Come, sit, tell me everything, dear.\"", "\"You brighten an old kitchen, you do.\""],
    "dreamy-performer": ["\"Your voice has a nice rhythm to it.\"", "\"I'll put this moment in a song.\""],
    "quiet-craftsman": ["\"Mm. Good to talk. Briefly.\"", "\"Aye. Well met.\""],
    "shy-naturalist": ["\"Oh — hello. I don't mind you, at least.\"", "\"You're gentler than most. The birds notice.\""],
    "eager-apprentice": ["\"You came to talk to ME? Brilliant!\"", "\"Tell me everything about the big catches!\""],
    "gossipy-connector": ["\"Have I got news — and you've got ears!\"", "\"Stick around, the roads tell me plenty.\""],
  },
  funny: {
    "brisk-warm": ["\"Ha! Off you go, jester.\""],
    "cheerful-chatty": ["\"HA! Oh that's a keeper, that one!\"", "\"Stop, stop — my sides!\""],
    "precise-practical": ["\"...Yes. Technically funny. I approve.\""],
    "gruff-kind": ["\"Heh. Alright, that got me.\"", "\"Don't quit the farm for comedy, mind.\""],
    "warm-motherly": ["\"Oh you cheeky thing!\"", "\"Bless you, you've made my day.\""],
    "dreamy-performer": ["\"A perfect little bit — encore!\"", "\"I'll steal that for the crowd.\""],
    "quiet-craftsman": ["\"...Heh.\"", "\"That one lands. Nice joint of a joke.\""],
    "shy-naturalist": ["\"Oh! A laugh escaped me. How embarrassing.\""],
    "eager-apprentice": ["\"HAHA! You're the funniest grown-up ever!\""],
    "gossipy-connector": ["\"Oh I'm telling everyone that one!\""],
  },
  romantic: {
    "brisk-warm": ["\"Careful now — you'll turn my head.\"", "\"...That was kind. Unusually kind.\""],
    "cheerful-chatty": ["\"Oh! Well now. Say that again, slower?\"", "\"You've a way with words, you.\""],
    "dreamy-performer": ["\"You feel like the bridge of a love song.\"", "\"Stay a moment — the light's on you just so.\""],
    "quiet-craftsman": ["\"...I'm no good with words. But — thank you.\"", "\"You make a quiet man want to speak.\""],
  },
  blunt: {
    "brisk-warm": ["\"Cheek! ...Fine, I'll allow it.\""],
    "cheerful-chatty": ["\"Oi! ...Alright, that was a good one.\""],
    "precise-practical": ["\"Noted, and returned with interest.\""],
    "gruff-kind": ["\"Ha! Grumbling's the only honest sport.\"", "\"Aye, the young ones today, don't get me started.\""],
    "warm-motherly": ["\"You rascal. Come here.\""],
    "quiet-craftsman": ["\"Fair jab. I've had worse from the wood.\""],
    "shy-naturalist": ["\"You tease — but kindly, I think.\""],
    "eager-apprentice": ["\"Hey! ...Okay okay, one day I'll get YOU.\""],
    "gossipy-connector": ["\"Ha! Trading barbs — my favourite currency.\""],
  },
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]!;

/** A scripted response line for this category, flavoured by personality. */
export function interactionLine(category: InteractCategory, personality: Personality): string {
  const lines = LINES[category][personality];
  return lines && lines.length ? pick(lines) : pick(GENERIC[category]);
}
