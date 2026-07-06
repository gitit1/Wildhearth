/**
 * Dialogue engine (Part A #4, mechanical layer) — the AI-free skeleton the
 * Part-D layer later enriches. Two ideas:
 *
 *  1. Condition-keyed opening lines, MOST-SPECIFIC-MATCH-WINS. A line carries a
 *     set of conditions (season / weather / day-of-week / phase / region /
 *     friendship-or-romance tier / world flag / farm-repaired). Specificity =
 *     how many condition fields a line matches; the line with the most matched
 *     fields wins. Ties are broken by a per-NPC rotation counter so repeat
 *     conversations don't repeat the same generic (anti-repetition is a north
 *     star). Every NPC ships unconditional `{}` fallbacks, so nothing is silent.
 *
 *  2. Shallow choice trees. After the opening the player picks one of 2-3
 *     choices; the NPC replies (its reply is condition-keyed too), and the tree
 *     advances 1-3 turns. "Farewell" is always available as the last option.
 *
 * The engine reads ONE `getWorldContext(sources, { npcId })` snapshot per turn
 * (built by the caller and handed in) — it never re-derives season/weather/etc.
 * itself. See docs/ROADMAP_EXPANSION.md "Dialogue authoring — condition-keyed"
 * and docs/AI_ARCHITECTURE.md §D2.
 */
import { DIALOGUE_MAX_CHOICES } from "../config";
import type { Season, DayPhase } from "./calendar";
import type { WeatherKind } from "./weather";
import type { Region } from "../world/zones";
import type { WorldContext } from "./worldContext";

// ---- tiers ------------------------------------------------------------------

export type Tier = 0 | 1 | 2 | 3;   // <25 / <50 / <75 / 75+

/** Friendship/Romance (0-100) → a 0-3 tier. A tier CONDITION matches when the
 *  NPC's current tier is at or above it, so a "tier-2 warmer" line keeps firing
 *  once past 50, not only in the 50-74 band. */
export function tierOf(v: number): Tier {
  return v >= 75 ? 3 : v >= 50 ? 2 : v >= 25 ? 1 : 0;
}

// ---- line tables ------------------------------------------------------------

export interface LineConditions {
  season?: Season;
  weather?: WeatherKind;
  dayOfWeek?: number;          // 0 = Sunday … 6 = Saturday
  phase?: DayPhase;
  region?: Region;             // the region the PLAYER is standing in
  friendshipTier?: Tier;       // matches when current Friendship tier >= this
  romanceTier?: Tier;          // matches when current Romance tier >= this
  flag?: string;               // matches when this world flag is active
  farmRepaired?: boolean;      // reads the farm slice: all four parts mended
}

export interface LineEntry {
  conditions: LineConditions;
  text: string;
}

/** A pool the picker resolves against for the current moment. */
export type LineSet = LineEntry[];

// ---- choice trees -----------------------------------------------------------

export type ChoiceEffect =
  | { kind: "friendship"; amount?: number }   // small Friendship nudge (default config knob)
  | { kind: "contact" }                        // marks contact only (no axis move)
  | { kind: "flag"; key: string; days?: number };  // sets a short-lived world topic flag

export interface DialogueChoice {
  label: string;
  npcReply?: LineSet;   // the NPC's response (condition-keyed); absent = keep the current line
  effect?: ChoiceEffect;
  next?: string;        // id into `nodes` for a follow-up turn of choices
  end?: boolean;        // closes the conversation (Farewell)
}

export interface DialogueNode {
  choices: DialogueChoice[];
}

export interface NpcDialogue {
  openings: LineSet;                       // resolved for the first line each conversation
  root: DialogueChoice[];                  // the opening turn's choices
  nodes?: Record<string, DialogueNode>;    // deeper turns, reached via choice.next
}

/** Always-available graceful exit — appended when a node offers no `end` choice. */
export const FAREWELL: DialogueChoice = { label: "Farewell", end: true };

/** The choices actually shown for a turn: cap to the 2-3 budget and guarantee a
 *  Farewell as the last option. When a node already offers an explicit `end`
 *  choice we trust its authoring; otherwise we reserve the last slot for Farewell. */
export function presentedChoices(choices: DialogueChoice[]): DialogueChoice[] {
  if (choices.some((c) => c.end)) return choices.slice(0, DIALOGUE_MAX_CHOICES);
  return [...choices.slice(0, DIALOGUE_MAX_CHOICES - 1), FAREWELL];
}

// ---- condition-keyed selection ---------------------------------------------

/** Number of matched condition fields, or -1 if any present field fails. A
 *  field whose world-context slice is absent counts as a non-match (safe). */
function matchSpecificity(c: LineConditions, wc: WorldContext): number {
  let n = 0;
  if (c.season !== undefined) { if (wc.calendar?.season !== c.season) return -1; n++; }
  if (c.weather !== undefined) { if (wc.weather?.state !== c.weather) return -1; n++; }
  if (c.dayOfWeek !== undefined) { if (wc.calendar?.dayOfWeek !== c.dayOfWeek) return -1; n++; }
  if (c.phase !== undefined) { if (wc.calendar?.phase !== c.phase) return -1; n++; }
  if (c.region !== undefined) { if (wc.location !== c.region) return -1; n++; }
  if (c.friendshipTier !== undefined) {
    if (tierOf(wc.relationship?.friendship ?? 0) < c.friendshipTier) return -1; n++;
  }
  if (c.romanceTier !== undefined) {
    if (tierOf(wc.relationship?.romance ?? 0) < c.romanceTier) return -1; n++;
  }
  if (c.flag !== undefined) { if (!wc.flags[c.flag]) return -1; n++; }
  if (c.farmRepaired !== undefined) {
    const done = !!(wc.farm.roof && wc.farm.window && wc.farm.barn && wc.farm.fence);
    if (done !== c.farmRepaired) return -1; n++;
  }
  return n;
}

/** A hard backstop so a mis-authored table is never silent. NPC tables always
 *  carry `{}` generics, so this should not be reached in practice. */
const FALLBACK_LINE = "Good day to you.";

/**
 * Picks the most-specific matching line for the moment. Among lines tied at the
 * top specificity, `rotation` (a per-NPC counter the caller bumps each pick)
 * selects one — so two conversations in identical conditions surface different
 * generics as long as more than one exists.
 */
export function pickLine(set: LineSet, wc: WorldContext, rotation: number): string {
  let best = -1;
  const winners: string[] = [];
  for (const e of set) {
    const s = matchSpecificity(e.conditions, wc);
    if (s < 0) continue;
    if (s > best) { best = s; winners.length = 0; winners.push(e.text); }
    else if (s === best) winners.push(e.text);
  }
  if (winners.length === 0) return FALLBACK_LINE;
  const i = ((rotation % winners.length) + winners.length) % winners.length;
  return winners[i]!;
}

// ---- AI seam (do NOT build the AI here) ------------------------------------

export interface RenderReq {
  npcId: string;
  scriptedText: string;
  worldContext: WorldContext;
  purpose: "opening" | "reply";
}

/**
 * The single choke-point every displayed NPC line passes through. v1 returns the
 * scripted text verbatim. The Part-D dialogue-variation layer (docs/
 * AI_ARCHITECTURE.md §D2) wraps THIS function to re-render the words in the NPC's
 * voice for the current mood/relationship/weather — nothing above it changes when
 * it does, and with AI off it stays exactly this pass-through.
 */
export function renderNpcLine(req: RenderReq): string {
  return req.scriptedText;
}
