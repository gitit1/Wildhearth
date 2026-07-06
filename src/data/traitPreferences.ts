/**
 * Trait-derived gift preferences (Relationship engine, Part A #3). NOT a
 * hand-authored gift list per NPC — instead each NPC's personality + profession
 * traits map to preferences over item CATEGORIES, and `giftTier()` derives the
 * 5-tier rating (loved/liked/neutral/disliked/hated) at runtime from those
 * traits plus the item data tables (fish/forage/crops/dishes prices).
 *
 * The item's data table decides its category and price; the NPC's trait rules
 * decide how they feel about that category (with a price threshold for the
 * "rare fish → loved, common fish → liked" shape). Anything no rule matches is
 * neutral. This means adding an item to any table, or an 11th NPC, needs no
 * change here — the mapping is derived, not enumerated.
 */
import { FISH } from "./fish";
import { JUNK } from "./junk";
import { CROPS } from "./crops";
import { FORAGE } from "./forage";
import { RECIPES } from "./recipes";
import { FISH_PRICE, RARE_FISH_PRICE } from "../config";
import type { NpcDef, Personality, Role } from "./npcs";

export type GiftRating = "loved" | "liked" | "neutral" | "disliked" | "hated";
export type GiftCategory = "fish" | "junk" | "crop" | "forage" | "dish";

export interface GiftItemInfo { category: GiftCategory; price: number }

// One id → {category, price} lookup, built once from the live data tables so a
// new species/crop/recipe is classified automatically.
const ITEM_INFO: Record<string, GiftItemInfo> = {
  fish: { category: "fish", price: FISH_PRICE },   // legacy generic fish (pre-variety saves)
  ...Object.fromEntries(FISH.map((f) => [f.id, { category: "fish" as const, price: f.price }])),
  ...Object.fromEntries(JUNK.map((j) => [j.id, { category: "junk" as const, price: j.price }])),
  ...Object.fromEntries(CROPS.map((c) => [c.id, { category: "crop" as const, price: c.price }])),
  ...Object.fromEntries(FORAGE.map((f) => [f.id, { category: "forage" as const, price: f.price }])),
  ...Object.fromEntries(RECIPES.map((r) => [r.id, { category: "dish" as const, price: r.price }])),
};

/** Category + price for a giftable good, or null for tools/seeds/unknowns —
 *  i.e. exactly the "sellable goods are giftable, tools are not" rule. */
export function giftInfo(itemId: string): GiftItemInfo | null {
  return ITEM_INFO[itemId] ?? null;
}

/** Is this item something the player can give as a gift at all? */
export function isGiftable(itemId: string): boolean {
  return itemId in ITEM_INFO;
}

// ---- the trait → category-preference rules ---------------------------------
// A rule matches an item when the categories agree (or the rule is "any") and
// the item's price clears `minPrice` (when set). More specific rules (a set
// price floor, higher first) win over generic ones; trait rules win over the
// everyone-baseline for equal specificity.
interface PrefRule { category: GiftCategory | "any"; minPrice?: number; rating: GiftRating }

// Profession/role traits — the primary driver of taste.
const ROLE_PREFS: Record<Role, PrefRule[]> = {
  // fish trade: rare catches thrill them, any fish is welcome
  "stall-fish": [{ category: "fish", minPrice: RARE_FISH_PRICE, rating: "loved" }, { category: "fish", rating: "liked" }],
  "fisher-kid": [{ category: "fish", minPrice: RARE_FISH_PRICE, rating: "loved" }, { category: "fish", rating: "liked" }],
  // growers love their own trade (produce), like a wild find
  "stall-produce": [{ category: "crop", rating: "loved" }, { category: "forage", rating: "liked" }],
  "farmer": [{ category: "crop", rating: "loved" }, { category: "forage", rating: "liked" }],
  // baker: a cooked dish is the finest gift; raw ingredients are welcome too
  "baker": [{ category: "dish", rating: "loved" }, { category: "crop", rating: "liked" }, { category: "forage", rating: "liked" }],
  // performer: loves cooked dishes & "shiny" (high-value) things
  "musician": [{ category: "dish", rating: "loved" }, { category: "any", minPrice: 14, rating: "liked" }],
  // craftsman likes raw crops/materials
  "handyman": [{ category: "crop", rating: "liked" }, { category: "forage", rating: "liked" }],
  // naturalist: forage finds are treasure, junk is an offence
  "forager": [{ category: "forage", rating: "loved" }, { category: "crop", rating: "liked" }, { category: "junk", rating: "hated" }],
  // general merchants value anything worth good coin
  "stall-goods": [{ category: "any", minPrice: 12, rating: "liked" }],
  "peddler": [{ category: "any", minPrice: 12, rating: "liked" }],
};

// Personality traits — a lighter overlay that stacks on top of the role.
const PERSONALITY_PREFS: Partial<Record<Personality, PrefRule[]>> = {
  "warm-motherly": [{ category: "dish", rating: "loved" }, { category: "crop", rating: "liked" }],
  "dreamy-performer": [{ category: "any", minPrice: 14, rating: "liked" }],   // shiny things
  "shy-naturalist": [{ category: "forage", rating: "loved" }, { category: "junk", rating: "hated" }],
  "quiet-craftsman": [{ category: "crop", rating: "liked" }, { category: "forage", rating: "liked" }],
  "precise-practical": [{ category: "any", minPrice: 12, rating: "liked" }],
  "gossipy-connector": [{ category: "any", minPrice: 12, rating: "liked" }],
};

// Everyone dislikes junk unless a trait overrides it (the naturalist hates it).
const BASELINE: PrefRule[] = [{ category: "junk", rating: "disliked" }];

function traitRules(def: NpcDef): PrefRule[] {
  return [...(PERSONALITY_PREFS[def.personality] ?? []), ...ROLE_PREFS[def.role]];
}

const specificity = (r: PrefRule) => (r.minPrice ?? 0);

/** The 5-tier rating this NPC gives an item, derived from their traits + the
 *  item's data-table category/price. Non-giftable items default to neutral. */
export function giftTier(def: NpcDef, itemId: string): GiftRating {
  const info = giftInfo(itemId);
  if (!info) return "neutral";
  const rules = [...traitRules(def), ...BASELINE];
  const matches = rules.filter(
    (r) => (r.category === "any" || r.category === info.category) &&
      (r.minPrice === undefined || info.price >= r.minPrice),
  );
  if (matches.length === 0) return "neutral";
  // most specific first; stable sort keeps trait rules ahead of the baseline
  // for equal specificity (so a naturalist's "junk hated" beats "junk disliked")
  matches.sort((a, b) => specificity(b) - specificity(a));
  return matches[0]!.rating;
}
