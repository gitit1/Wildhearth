/**
 * Rod tiers + bait (v2 BLOCK #6 slice 2) — the Riverside Fisherwoman's gear.
 * Pure DATA; systems/fishinggear.ts turns ownership + the held bait into the
 * concrete cast bonuses, and ui/fisherwindow.ts sells these rows.
 *
 * Design (VISION §fishing gear + price table + skills §"tools require a skill
 * floor to pay off, or they're wasted"):
 *  - RODS are unique inventory items. The basic `rod` (general store, 12c) is
 *    still the hard tool-gate for fishing at all. Nerys sells BETTER rods that
 *    raise catch quality (fewer junk, reach rarer species) + reel a hair faster
 *    — but a rod's bonus only pays off at/above its `skillFloor`; used below it
 *    the rod behaves like the basic one (wasted, per VISION). The top "Master
 *    Rod" is trust-gated ("she trusts your technique" — a lesson count OR a
 *    proven Fishing skill; see systems/teaching.ts + config).
 *  - BAIT is a consumable (stacks). One unit is spent per cast; it shortens the
 *    bite and, for the rare-shifting tier, biases the roll toward rarer fish.
 *    The everyday cheap bait is preferred automatically so a costly rare bait is
 *    never silently burned (systems/fishinggear.ts `pickBait`).
 */
import {
  ROD_PRICE, RIVER_ROD_PRICE, MASTER_ROD_PRICE,
  BAIT_WORMS_PRICE, BAIT_SPINNER_PRICE,
} from "../config";

export interface RodTier {
  id: string;          // inventory item id (unique)
  tier: number;        // 0 basic, 1 river, 2 master
  name: string;
  icon: string;
  price: number;
  skillFloor: number;  // Fishing at/above which the rod's bonus pays off (else wasted)
  quality: number;     // effective-Fishing bonus added to the catch roll when the floor is met
  biteMult: number;    // multiplies remaining bite-time (a better rod reels faster; <1 = quicker)
  soldByNerys: boolean;// tier 0 comes from the general store; tiers 1-2 are hers
  trustGated: boolean; // tier 2 needs her trust (lesson count / proven skill) before she'll sell it
  blurb: string;       // shop line
  boughtLine: string;  // toast on purchase
}

/** Ordered basic → master. The basic rod is listed for lookup (best-owned-rod
 *  resolution + the fishing gate); it is NOT sold by Nerys. */
export const ROD_TIERS: readonly RodTier[] = [
  {
    id: "rod", tier: 0, name: "Fishing rod", icon: "🎣", price: ROD_PRICE,
    skillFloor: 0, quality: 0, biteMult: 1, soldByNerys: false, trustGated: false,
    blurb: "A plain rod. It'll catch you a fish.",
    boughtLine: "A fishing rod — the water's open to you now.",
  },
  {
    id: "river_rod", tier: 1, name: "River Rod", icon: "🎣", price: RIVER_ROD_PRICE,
    skillFloor: 15, quality: 12, biteMult: 0.85, soldByNerys: true, trustGated: false,
    blurb: "Springier, truer — fewer snags, and the good fish notice. Wants Fishing 15 to pay off.",
    boughtLine: "The River Rod is yours. Feel how it wants to work the water.",
  },
  {
    id: "master_rod", tier: 2, name: "Master Rod", icon: "🎣", price: MASTER_ROD_PRICE,
    skillFloor: 40, quality: 25, biteMult: 0.72, soldByNerys: true, trustGated: true,
    blurb: "Her own make. Reads the deep pools where the rare ones lie. Wants Fishing 40 in the hand that holds it.",
    boughtLine: "Her own Master Rod, in your hands. \"Mind you're worthy of it.\"",
  },
];

export interface Bait {
  id: string;
  name: string;
  icon: string;
  price: number;
  biteMult: number;    // multiplies remaining bite-time (attracts a quicker bite)
  quality: number;     // effective-Fishing bonus for this cast (fewer junk / reach a little rarer)
  rareBias: number;    // 0..1 bias toward rarer (higher-floor) eligible fish
  skillFloor: number;  // the rare-shifting tier wants some skill before its rare bias pays off
  blurb: string;
  soldByNerys: boolean;
}

/** Cheapest first — systems/fishinggear.ts spends the cheapest held bait per
 *  cast so a rare lure is never auto-wasted. */
export const BAITS: readonly Bait[] = [
  {
    id: "worms", name: "Worm Bait", icon: "🪱", price: BAIT_WORMS_PRICE,
    biteMult: 0.7, quality: 4, rareBias: 0, skillFloor: 0,
    blurb: "A tin of worms. The line barely settles before something bites.",
    soldByNerys: true,
  },
  {
    id: "spinner", name: "Spinner Lure", icon: "✨", price: BAIT_SPINNER_PRICE,
    biteMult: 0.85, quality: 10, rareBias: 0.6, skillFloor: 20,
    blurb: "A bright river lure — it turns the rare, wary fish. Wants a Fishing 20 hand to work it.",
    soldByNerys: true,
  },
];

export function rodTier(id: string): RodTier | null {
  return ROD_TIERS.find((r) => r.id === id) ?? null;
}
export function baitById(id: string): Bait | null {
  return BAITS.find((b) => b.id === id) ?? null;
}
