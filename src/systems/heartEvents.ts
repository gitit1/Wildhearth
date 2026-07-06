/**
 * Heart events (Relationship engine, Part A #3) — the forward-compat seam that
 * v5 will grow into scripted scenes. Crossing a relationship threshold (25/50/
 * 75, once per NPC per axis) produces one of these; for v1 the event IS the
 * toast + a Memory Book entry. Later, this same (NPC, axis, threshold) key can
 * dispatch a full played-out scene instead of a line — nothing above here
 * changes when it does.
 */
import type { NpcDef } from "../data/npcs";
import type { Axis, ThresholdEvent } from "./relationships";

export interface HeartEventPresentation { memoryKey: string; memoryText: string; toast: string }

const FRIENDSHIP_TEXT: Record<number, (name: string) => string> = {
  25: (n) => `You and ${n} have become real friends.`,
  50: (n) => `${n} counts you a close friend now.`,
  75: (n) => `${n} trusts you like family.`,
};

const ROMANCE_TEXT: Record<number, (name: string) => string> = {
  25: (n) => `Something's kindling between you and ${n}.`,
  50: (n) => `You and ${n} have grown close — more than friends.`,
  75: (n) => `${n}'s heart is yours, plain as day.`,
};

function textFor(name: string, axis: Axis, threshold: number): string {
  const table = axis === "romance" ? ROMANCE_TEXT : FRIENDSHIP_TEXT;
  return table[threshold]?.(name) ?? `You and ${name} have grown closer.`;
}

/** Turns a crossed threshold into its v1 presentation (memory + toast). The
 *  memory key is unique per (NPC, axis, threshold) so it writes exactly once. */
export function heartEvent(def: NpcDef, ev: ThresholdEvent): HeartEventPresentation {
  const text = textFor(def.name, ev.axis, ev.threshold);
  return {
    memoryKey: `heart-${def.id}-${ev.axis}-${ev.threshold}`,
    memoryText: text,
    toast: `♥ ${text}`,
  };
}
