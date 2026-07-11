/**
 * Rod/bait RULES (v2 BLOCK #6 slice 2). Turns what the player OWNS + HOLDS into
 * the concrete bonuses a single cast gets. Pure logic over the inventory + the
 * data tables (data/fishinggear.ts); the fishing loop (systems/fishing.ts) and
 * the interact "Fish" action consume these numbers, and ui/fisherwindow.ts sells
 * the gear.
 *
 * A rod's bonus only pays off at/above its skillFloor (VISION §skills: "tools
 * require a skill floor to pay off, or they're wasted"). Bait is spent one unit
 * per cast; the cheapest held bait is preferred so a costly rare lure is never
 * silently burned.
 */
import { ROD_TIERS, BAITS, type RodTier, type Bait } from "../data/fishinggear";
import { countItem, type Inventory } from "./inventory";

/** The best (highest-tier) rod the player owns; the basic rod is the floor. */
export function bestRod(inv: Inventory): RodTier {
  let best = ROD_TIERS[0]!;   // basic
  for (const r of ROD_TIERS) if (r.tier > best.tier && countItem(inv, r.id) > 0) best = r;
  return best;
}

/** Fishing is a hard tool-gate: ANY owned rod opens it (not only the basic id). */
export function ownsAnyRod(inv: Inventory): boolean {
  return ROD_TIERS.some((r) => countItem(inv, r.id) > 0);
}

/** The cheapest bait the player holds — the everyday bait is spent before a
 *  costly rare lure, so the player keeps control of when the rare bait is used. */
export function pickBait(inv: Inventory): Bait | null {
  const held = BAITS.filter((b) => countItem(inv, b.id) > 0).sort((a, b) => a.price - b.price);
  return held[0] ?? null;
}

/** What one cast actually gets, resolved from owned rod + held bait + skill. */
export interface CastGear {
  biteMult: number;       // multiplies the remaining bite-time in startCast
  qualityBonus: number;   // added to effective Fishing in resolveCatch (junk ↓, reach rarer)
  rareBias: number;       // bias toward rarer eligible fish in resolveCatch
  consumeBaitId: string | null;   // bait to remove from the bag on this cast
  baitName: string | null;
  rodName: string;
  rodPays: boolean;       // false when the rod is above the player's skill (wasted)
}

export function computeCastGear(inv: Inventory, fishingSkill: number): CastGear {
  const rod = bestRod(inv);
  const rodPays = fishingSkill >= rod.skillFloor;
  let biteMult = rodPays ? rod.biteMult : 1;
  let qualityBonus = rodPays ? rod.quality : 0;
  let rareBias = 0;

  let consumeBaitId: string | null = null;
  let baitName: string | null = null;
  const bait = pickBait(inv);
  if (bait) {
    consumeBaitId = bait.id;
    baitName = bait.name;
    // bait always shortens the bite (that's what bait does); its QUALITY/rare
    // bias only pay off at/above its own floor (a rare lure below skill is wasted
    // on the rare shift, but still draws a bite).
    biteMult *= bait.biteMult;
    if (fishingSkill >= bait.skillFloor) {
      qualityBonus += bait.quality;
      rareBias = Math.max(rareBias, bait.rareBias);
    }
  }
  return { biteMult, qualityBonus, rareBias, consumeBaitId, baitName, rodName: rod.name, rodPays };
}
