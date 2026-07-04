/**
 * Non-fish catches (fish-variety block): UO-style "you caught junk" outcomes.
 * Token 1-coin sell value so a junk haul never permanently clogs the bag.
 */

export interface JunkItem { id: string; name: string; price: number; weight: number }

export const JUNK: JunkItem[] = [
  { id: "boot", name: "Old boot",     price: 1, weight: 5 },
  { id: "tin",  name: "Empty tin",    price: 1, weight: 4 },
  { id: "rope", name: "Tangled rope", price: 1, weight: 3 },
];

export function junkById(id: string): JunkItem | null {
  return JUNK.find((j) => j.id === id) ?? null;
}
