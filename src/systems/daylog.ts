/**
 * End-of-day ledger (End-of-day summary engine, Part A #7) — a plain,
 * NOT-persisted accumulator object main.ts owns and resets every in-game
 * day. Every cheap seam main.ts already touches (catch/harvest/forage/cook
 * completion, a sale/purchase at the stall, a discovery, a memory, a
 * relationship change) calls one of the log*() helpers below; on day
 * rollover main.ts snapshots it for the summary panel (see ui/dayendpanel.ts),
 * then resets it for the day ahead. Explicit-passing, no singleton, nothing
 * persisted — a missed reload never loses more than the day's own ledger.
 */

export interface RelationshipDelta { friendship: number; romance: number }

export interface DayLog {
  coinsEarned: number;
  coinsSpent: number;
  itemsSold: number;
  catches: number;                          // fish landed (junk excluded — matches collections)
  harvests: number;
  forages: number;
  dishesCooked: number;
  skillGains: Record<string, number>;       // skill id -> points gained today
  newDiscoveries: string[];                 // Collections: display names discovered today
  newMemories: string[];                    // Memory Book: entry text added today
  relationshipChanges: Record<string, RelationshipDelta>;   // npc id -> net delta today
}

export function freshDayLog(): DayLog {
  return {
    coinsEarned: 0, coinsSpent: 0, itemsSold: 0, catches: 0, harvests: 0,
    forages: 0, dishesCooked: 0, skillGains: {}, newDiscoveries: [],
    newMemories: [], relationshipChanges: {},
  };
}

/** Resets IN PLACE (main.ts holds one live object, like every other store). */
export function resetDayLog(log: DayLog): void {
  Object.assign(log, freshDayLog());
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function logCoinsEarned(log: DayLog, n: number): void { if (n > 0) log.coinsEarned += n; }
export function logCoinsSpent(log: DayLog, n: number): void { if (n > 0) log.coinsSpent += n; }
export function logItemsSold(log: DayLog, n: number): void { if (n > 0) log.itemsSold += n; }
export function logCatch(log: DayLog): void { log.catches += 1; }
export function logHarvest(log: DayLog): void { log.harvests += 1; }
export function logForage(log: DayLog): void { log.forages += 1; }
export function logDishCooked(log: DayLog): void { log.dishesCooked += 1; }

export function logSkillGain(log: DayLog, skillId: string, amount: number): void {
  if (amount <= 0) return;
  log.skillGains[skillId] = round1((log.skillGains[skillId] ?? 0) + amount);
}

export function logDiscovery(log: DayLog, name: string): void { log.newDiscoveries.push(name); }
export function logMemory(log: DayLog, text: string): void { log.newMemories.push(text); }

export function logRelationshipChange(
  log: DayLog, npcId: string, axis: "friendship" | "romance", delta: number,
): void {
  if (delta === 0) return;
  const rec = (log.relationshipChanges[npcId] ??= { friendship: 0, romance: 0 });
  rec[axis] = round1(rec[axis] + delta);
}

/** The single "top activity" line the quick summary leans on — whichever
 *  countable activity happened most, falling back to coins/skills/quiet. */
export function topActivityLine(log: DayLog): string {
  const counted: Array<[string, number]> = [
    ["fish caught", log.catches], ["crops harvested", log.harvests],
    ["things foraged", log.forages], ["dishes cooked", log.dishesCooked],
  ];
  const top = counted.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (top[1] > 0) return `${top[1]} ${top[0]}`;
  if (log.itemsSold > 0) return `${log.itemsSold} item${log.itemsSold === 1 ? "" : "s"} sold`;
  if (Object.keys(log.skillGains).length > 0) return "skills practiced";
  return "a quiet day";
}
