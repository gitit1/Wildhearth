/**
 * Per-NPC dialogue registry (Dialogue engine, Part A #4). One table per roster
 * NPC, keyed by id. `getNpcDialogue()` returns an NPC's table, or — as a
 * belt-and-braces safety net for any future NPC added without a file — a bare
 * personality skeleton so a Talk is never empty.
 */
import type { NpcDef } from "../npcs";
import type { NpcDialogue } from "../../systems/dialogue";
import { genericOpenings, smallTalkBranch } from "./shared";

import maren from "./maren";
import tobin from "./tobin";
import sera from "./sera";
import henrik from "./henrik";
import petra from "./petra";
import liora from "./liora";
import bram from "./bram";
import ada from "./ada";
import finn from "./finn";
import jonas from "./jonas";
import nerys from "./nerys";

const REGISTRY: Record<string, NpcDialogue> = {
  maren, tobin, sera, henrik, petra, liora, bram, ada, finn, jonas, nerys,
};

/** Fallback for an NPC with no authored file — openings + a small-talk tree
 *  built straight from its personality tag. */
function skeleton(def: NpcDef): NpcDialogue {
  const st = smallTalkBranch(def.personality);
  return { openings: genericOpenings(def.personality), root: st.root, nodes: st.nodes };
}

export function getNpcDialogue(def: NpcDef): NpcDialogue {
  return REGISTRY[def.id] ?? skeleton(def);
}
