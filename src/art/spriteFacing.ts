/**
 * Shared 8-direction facing + walk-cycle helpers for the PixelLab character
 * bridges (art/spriteChar.ts for the heroine, art/spriteNpc.ts for the NPCs).
 * Extracted so the two bridges share ONE hysteresis/frame implementation
 * instead of copy-pasting it.
 *
 * The player holds a single module-level sector; each NPC holds its own (a
 * per-id map) — so `nextSector` is a PURE update the caller stores wherever it
 * likes. Canvas y is DOWN (so +y = south).
 */

/** 8 sprite directions in atan2(dy, dx) sector order: 0 = east, 2 = south,
 *  4 = west, 6 = north (matches the packed sheets' frame keys). */
export const DIR8 = [
  "east", "south-east", "south", "south-west",
  "west", "north-west", "north", "north-east",
] as const;
export type Dir8 = (typeof DIR8)[number];

/**
 * Update a held 8-direction sector from a movement vector, with hysteresis:
 * the facing only flips once the movement angle drifts past the current
 * sector's edge (π/8) plus `hyst` radians — so a near-diagonal wobble doesn't
 * strobe between two directions. A zero vector holds the current sector.
 */
export function nextSector(cur: number, mvx: number, mvy: number, hyst: number): number {
  if (mvx === 0 && mvy === 0) return cur;
  const ang = Math.atan2(mvy, mvx);
  const c = cur * (Math.PI / 4);
  let d = ang - c;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (Math.abs(d) > Math.PI / 8 + hyst) {
    let s = Math.round(ang / (Math.PI / 4)) % 8;
    if (s < 0) s += 8;
    return s;
  }
  return cur;
}

/** Distance-keyed walk frame index (0..frames-1), the same phase model the rig
 *  uses — animation speed always matches actual travel, never wall-clock. */
export function walkFrame(dist: number, stride: number, frames: number): number {
  return Math.floor(Math.max(0, dist) / stride) % frames;
}

/** A cardinal Facing (0 up, 1 right, 2 down, 3 left — the NPC/player `dir`) to
 *  its DIR8 sector index (up→north 6, right→east 0, down→south 2, left→west 4).
 *  Used for a standing/talking NPC, whose stored facing is only cardinal. */
export function cardinalSector(facing: 0 | 1 | 2 | 3): number {
  return facing === 0 ? 6 : facing === 1 ? 0 : facing === 2 ? 2 : 4;
}
