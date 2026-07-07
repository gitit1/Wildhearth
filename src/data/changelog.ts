import { loadSettings, saveSettings } from "../systems/settings";

/**
 * What's New (Part E #2) — a data-driven, player-facing changelog. Each entry is
 * written for the PLAYER ("the world grew four times bigger"), not in git-speak.
 * Newest first; the oldest sits at the bottom of the list. `id` is a simple
 * ascending integer — the highest id is "the newest thing", and everything with
 * an id above the player's `lastSeenChangelogId` gets a NEW tag + feeds the
 * menu badge. Appending a future update = one more entry with the next id.
 */

export interface ChangelogEntry {
  id: number;
  version: string;   // a short human tag, e.g. "Preview 7"
  date: string;      // YYYY-MM-DD, shown lightly
  title: string;
  summary: string;   // warm, player-readable — what changed for HER
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 10, version: "Preview 8", date: "2026-07-07",
    title: "Begin your own way",
    summary:
      "New Game now opens a proper character creator: name yourself, choose how you look, " +
      "and pick a starting path — Fisher, Farmer, Musician, or Animal-Keeper. Then choose how " +
      "much guidance you'd like, from a step-by-step tutorial to none at all.",
  },
  {
    id: 9, version: "Preview 7", date: "2026-07-07",
    title: "The wild comes alive",
    summary:
      "The land now changes with the seasons. Butterflies drift over the farm in spring, " +
      "songbirds and ducks arrive in summer, and deer and hares move through as the year turns cold. " +
      "Get too close and they'll startle away.",
  },
  {
    id: 8, version: "Preview 6", date: "2026-07-07",
    title: "Sell your catch at the market",
    summary:
      "Maren the fishmonger keeps a stall in the market square and will buy your fish — " +
      "on the days she's working. Sell to her a few times and she'll start to warm to you.",
  },
  {
    id: 7, version: "Preview 5", date: "2026-07-06",
    title: "The Harvest Festival",
    summary:
      "Once a year, mid-autumn, the whole town gathers in the square for the Harvest Festival — " +
      "bunting overhead, lanterns lit, and a tune in the air. Come and be part of it.",
  },
  {
    id: 6, version: "Preview 4", date: "2026-07-06",
    title: "Look back on your day",
    summary:
      "When a day ends you can now see a summary of it — coins earned, things caught, grown and " +
      "cooked, and any little firsts worth remembering. Choose none, a quick glance, or the full " +
      "story in Settings (coming soon).",
  },
  {
    id: 5, version: "Preview 3", date: "2026-07-06",
    title: "Townsfolk who talk back",
    summary:
      "The ten people along the road now hold real conversations — their lines shift with the season, " +
      "the weather, the time of day, and how well they know you. Say hello often and they won't repeat themselves.",
  },
  {
    id: 4, version: "Preview 3", date: "2026-07-06",
    title: "Make friends — and maybe more",
    summary:
      "Give gifts and spend time with people to build friendships, each with their own tastes. " +
      "A few of the townsfolk are open to something warmer than friendship, in time.",
  },
  {
    id: 3, version: "Preview 2", date: "2026-07-05",
    title: "Mind yourself",
    summary:
      "You're a person now, not just a pair of hands: hunger, thirst, rest, cleanliness and company " +
      "all matter. Eat well, drink at the well, wash up, sleep at home, and don't work yourself to collapse.",
  },
  {
    id: 2, version: "Preview 2", date: "2026-07-05",
    title: "The world grew four times bigger",
    summary:
      "The farm is now the western corner of a much larger world. Follow the dirt road east to a " +
      "market square of stalls, past a little forest and down to the river and lake — hours of walking, " +
      "no loading screens. Ten townsfolk now live and work along the way.",
  },
  {
    id: 1, version: "Preview 1", date: "2026-07-03",
    title: "Welcome to Wildhearth",
    summary:
      "A rundown farm, empty pockets, and a whole life ahead. Fish the pond, forage the hedgerows, " +
      "till a field, cook at the hearth, busk for coins, and slowly mend the old place into a home.",
  },
];

/** The newest entry's id — "everything up to here is what's current". */
export function newestChangelogId(): number {
  return CHANGELOG.reduce((m, e) => Math.max(m, e.id), 0);
}

/** How many entries the player hasn't seen since last opening What's New. */
export function unseenChangelogCount(): number {
  const seen = loadSettings().lastSeenChangelogId ?? 0;
  return CHANGELOG.filter((e) => e.id > seen).length;
}

/** True for an entry the player hasn't seen yet (drives the per-entry NEW tag). */
export function isEntryNew(entry: ChangelogEntry): boolean {
  return entry.id > (loadSettings().lastSeenChangelogId ?? 0);
}

/** Mark the whole changelog as seen (called when the screen opens). */
export function markChangelogSeen(): void {
  saveSettings({ lastSeenChangelogId: newestChangelogId() });
}
