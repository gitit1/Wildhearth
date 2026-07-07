/**
 * Authored NPC backstories — the FLAT FALLBACK for Part D feature #1 (see
 * docs/AI_ARCHITECTURE.md §D1). Every NPC ships a warm, complete 2-3 sentence
 * backstory here, so the "Tell me about yourself" dialogue choice always has
 * something true to say with AI off. Each is grounded in the NPC's profession +
 * personality (data/npcs.ts): why they came to Wildhearth, what they miss, what
 * they hope for. With AI on, features/backstory.ts asks for a RICHER version
 * seeded by these lines and freezes it in the save — but this is never a stub.
 */
export const BACKSTORY_SEEDS: Record<string, string> = {
  maren:
    "I grew up in a fishing town down the coast, hauling nets before I could read. " +
    "I came inland when the big boats crowded out the little ones, and set up my stall here where a fair catch still means something. " +
    "I miss the open sea some mornings — but I'd rather buy an honest fish from a friend than chase a fortune I don't need.",
  tobin:
    "I've never lived anywhere I couldn't talk to my neighbours over the fence, and Wildhearth had the friendliest fences I ever saw. " +
    "I came for the market and stayed for the people — half my turnips get given away in gossip before they're ever sold. " +
    "One day I'd like the whole square lined with stalls, everyone shouting their wares. Wouldn't that be a racket worth hearing?",
  sera:
    "I keep the general-goods stall, and I keep it well — a place for everything, and everything accounted for. " +
    "I came to Wildhearth after years clerking for a merchant house that valued ledgers over folk; here at least the sums add up AND the faces are kind. " +
    "I don't ask for much. A stall that balances at day's end, and quiet enough to hear myself think.",
  henrik:
    "I've farmed the plot beside yours for forty years, same as my father, and his before him. " +
    "I watched the old place next door — yours now — fall to ruin after the last family left, and it's grieved me every season since. " +
    "I'll not say it soft, but seeing you mend it does an old man good. Land wants working, not weeping over.",
  petra:
    "I learned to bake at my grandmother's elbow, and I've never found a trouble a warm loaf couldn't soften. " +
    "I came to Wildhearth a widow with an oven and a stubborn heart, and the square took me in like family. " +
    "I miss my grandmother's voice most days — but when the whole street smells of my bread by mid-morning, I feel her near.",
  liora:
    "I follow tunes the way other folk follow roads — I got to Wildhearth chasing a melody I heard a traveller hum, and never left. " +
    "I miss the cities sometimes, the great halls and the crowds, but a coin tossed by someone who truly listened is worth more than any of it. " +
    "I'm still chasing that one song, the one that keeps slipping away. I'll know it when I finally catch it.",
  bram:
    "I'm a carpenter. Wood's honest, and it doesn't argue — suits me. " +
    "I drifted into Wildhearth mending a broken cart wheel one autumn and found there was always something else needing fixed, so I put down my tools and stayed. " +
    "I don't say much. But show me something broken and I'll make it whole — that's the only talking I'm any good at.",
  ada:
    "I've spent my long life among the trees, learning which leaf mends a cough and which berry's best left alone. " +
    "I came to the woods near Wildhearth to be away from the noise of towns; the square's still too loud for me, but the forest here is kind. " +
    "I hope only to keep the old plant-lore alive a while longer, and to leave the woods no poorer than I found them.",
  finn:
    "Maren took me on as her fishing apprentice, and I'm going to be the best fisher on the whole lake — you'll see! " +
    "My folks live just up the way, but I'd sleep on the dock if they let me. There's always one more cast in me. " +
    "I almost landed a huge one last week, THIS big, I swear. Next time. Next time for sure.",
  jonas:
    "I'm a peddler by trade and a talker by nature — I walk every road between here and the coast, and I carry every rumour with me. " +
    "I don't rightly have a home; Wildhearth's square is as close as it gets, and I circle back to it like a swallow to the eaves. " +
    "What I hope for? To keep moving, keep listening, and always have a fresh bit of news to trade. The roads know everything, if you'll only walk them.",
};

/** The authored seed for an NPC, or a safe generic if one is somehow missing. */
export function backstorySeed(npcId: string, name: string): string {
  return BACKSTORY_SEEDS[npcId] ??
    `${name} keeps to their trade and their neighbours, and calls Wildhearth home.`;
}
