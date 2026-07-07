/**
 * NPC "current thought" templates — the FLAT FALLBACK for Part D feature #4
 * (AI_ARCHITECTURE §D4). Each personality carries a handful of one-line thoughts
 * with `{season}` / `{weather}` slots, filled from the live world snapshot so the
 * canned pool still reads as reactive ("Rain again — the stall smells of wet
 * wood."). features/thoughts.ts picks one deterministically per NPC per in-game
 * day; with AI on it may replace the pick with a generated line, but this pool is
 * always complete on its own.
 */
import type { Personality } from "./npcs";
import type { Season } from "../systems/calendar";
import type { WeatherKind } from "../systems/weather";

/** A short weather phrase for slot-fills (reads naturally mid-sentence). */
const WEATHER_PHRASE: Record<WeatherKind, string> = {
  clear: "the clear sky",
  rain: "the rain",
  storm: "the storm",
  fog: "the fog",
};

export const THOUGHT_TEMPLATES: Record<Personality, string[]> = {
  "brisk-warm": [
    "The {season} tides run their own way — no use rushing them.",
    "{weather} today. Fish don't mind it half so much as folk do.",
    "Good hauls lately. I ought to send more up to town before it turns.",
    "My hands never quite lose the smell of the sea. I've stopped minding.",
    "A quiet corner of the market and a fair catch — that's plenty for me.",
  ],
  "cheerful-chatty": [
    "Wonder who'll stop by the stall today. Half the fun is the talking.",
    "{weather} or shine, the square's always got a story going round.",
    "Best {season} produce I've grown yet, if I say so myself!",
    "I gave away three turnips in gossip already. Worth every one.",
    "One day the whole square will be stalls, shoulder to shoulder. Imagine the noise!",
  ],
  "precise-practical": [
    "Stock counted, ledger square. A tidy start to a {season} day.",
    "{weather} means fewer customers — I'll use the quiet to reorganise.",
    "Everything in its place. That's how a stall stays sound.",
    "Someone moved my measures again. Small things, but they add up.",
    "A day that balances at dusk is a good day. I ask for no more.",
  ],
  "gruff-kind": [
    "Back aches, crops grow. Same as every {season}. Mustn't grumble.",
    "{weather}'s coming on. The field'll want minding before it sets in.",
    "Old place next door's looking better by the week. Does me good to see.",
    "Land doesn't work itself. Never has. Never will.",
    "Forty {season}s on this plot, and it still surprises me now and again.",
  ],
  "warm-motherly": [
    "The bread came out lovely today. Whole square smells of it.",
    "{weather} out — a day for a warm loaf and a warmer word.",
    "That young farmer looks worn thin. I ought to send some bread over.",
    "My grandmother baked in weather far worse than this {season} chill.",
    "There's always room by my oven for one more cold soul.",
  ],
  "dreamy-performer": [
    "There's a melody in {weather} today, if you listen for it.",
    "A {season} tune keeps slipping just past my fingers. I'll catch it.",
    "A coin tossed by someone who truly listened — that's the real pay.",
    "I heard a traveller hum something once. I've been chasing it ever since.",
    "The square has its own song. Most folk just never stop to hear it.",
  ],
  "quiet-craftsman": [
    "Good timber, this. It'll hold long after I'm gone.",
    "{weather} swells the wood. A joint's only as good as its fit.",
    "Something always needs mending. Suits me fine.",
    "Show me something broken. That's the only talking I'm good at.",
    "A {season} to work slow and get it right. No sooner than dusk.",
  ],
  "shy-naturalist": [
    "The forest's been kind this {season}. Quiet, the way I like it.",
    "{weather} brings the shy things out. You just have to wait, and hush.",
    "This root's good for a cough. The woods give, if you ask them gently.",
    "The square's too loud for me. I'll keep to my trees.",
    "Leave the woods no poorer than you found them. That's the whole of it.",
  ],
  "eager-apprentice": [
    "Today's the day I land a big one. I can feel it!",
    "{weather}? Doesn't scare me. A real fisher casts in anything!",
    "Maren says I'm getting better. She actually SAID it!",
    "One more cast. Just one more. Okay, maybe two.",
    "Best fisher on the whole {season} lake — that's gonna be me. You'll see!",
  ],
  "gossipy-connector": [
    "Heard three new things on the road this morning. Who to tell first?",
    "{weather} keeps folk home, and home is where the good gossip brews.",
    "The old farm's getting fixed up — everyone's talking. I started half of it.",
    "A {season} for travelling. The roads know everything, if you walk them.",
    "News is like fish: best passed along fresh.",
  ],
};

/** Fill a template's `{season}` / `{weather}` slots from the live snapshot. */
export function fillThought(template: string, season: Season, weather: WeatherKind): string {
  return template
    .replace(/\{season\}/g, season)
    .replace(/\{weather\}/g, WEATHER_PHRASE[weather] ?? "the weather");
}
