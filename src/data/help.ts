/**
 * Help / Guide content (Part E #3) — short, warm, honest pages for the lost
 * player. Each page is a title + a few paragraphs (and optional bullet lines).
 * Concise and true to what's actually in the game today — no promises about
 * features that aren't here yet. Pure data; helpscreen.ts renders it.
 */

export interface HelpPage {
  id: string;
  icon: string;            // a single emoji for the tab
  title: string;
  intro: string;           // a sentence or two
  points: string[];        // short practical bullets
}

export const HELP_PAGES: HelpPage[] = [
  {
    id: "move",
    icon: "🚶",
    title: "Moving & doing things",
    intro:
      "You explore an open world with no loading screens. The farm is your home; " +
      "a road runs east to the market, the forest, and the water.",
    points: [
      "Move with WASD or the arrow keys — or just click the ground to walk there.",
      "Click an object (a fishing spot, a plot, a person) to walk over and use it.",
      "Right-click an object for a little menu of everything you can do with it.",
      "The E key (or the ✋ button) uses whatever you're standing next to.",
      "Scroll the wheel — or the + / − buttons — to zoom the camera.",
    ],
  },
  {
    id: "living",
    icon: "🎣",
    title: "Making a living",
    intro:
      "You start nearly broke and buy every tool yourself. Pick away at whatever earns — " +
      "there's no salary, only the work of your own hands.",
    points: [
      "Fish the pond, river spots, or lake — bait, place and season all change the catch.",
      "Forage the hedgerows and forest for berries, herbs and finds.",
      "Till a plot, plant seeds, water them, and harvest when they're ready.",
      "Cook what you gather at the farmhouse hearth — dishes are worth more than parts.",
      "Busk at the market square for coins, if you've an instrument and the knack.",
      "Sell at a market stall (or to a matching trader, like Maren for fish).",
      "Every action quietly builds the matching skill — the more you do, the better you get.",
    ],
  },
  {
    id: "needs",
    icon: "💤",
    title: "Looking after yourself",
    intro:
      "You have real needs — hunger, thirst, energy, cleanliness, the bathroom, mood and company. " +
      "Watch the little strip of icons at the top-left.",
    points: [
      "Eat food from your bag to restore hunger; drink at the well for thirst.",
      "Wash at the basin, and use the outhouse before it becomes urgent.",
      "Sleep in your bed to recover energy — any hour; tired means a longer sleep.",
      "A chat, a rest, and good weather lift your mood, which colours how well you work.",
      "Let a need hit zero and you'll stumble — no harm done, but it costs you time (and maybe a coin or two).",
    ],
  },
  {
    id: "town",
    icon: "🧑‍🌾",
    title: "The market & the townsfolk",
    intro:
      "Ten people live and work along the road. They keep their own daily routines and will " +
      "talk with you about the weather, the season, and — as you grow closer — themselves.",
    points: [
      "Walk up to someone and Talk to start a conversation; pick a reply with the mouse or keys 1-3.",
      "Give gifts and spend time together to build friendship — everyone has their own tastes.",
      "Traders buy what matches their stall; your own farm stall sells a bit of everything.",
      "The market is open every day. Come back often — people remember you.",
    ],
  },
  {
    id: "world",
    icon: "🍂",
    title: "Seasons, saving & settings",
    intro:
      "A year turns through four seasons, and the world changes with them — weather, wildlife, " +
      "and what grows. Your progress is kept safe as you play.",
    points: [
      "Each season lasts several in-game days; weather shifts daily and affects your work.",
      "The game autosaves as you play, and you can save any time with the 💾 button.",
      "Open Settings (the ⚙ button) to set day length, the summary, guidance, and more.",
      "Press Esc — or the ⏸ button — to pause, save, or step back to the main menu.",
    ],
  },
];
