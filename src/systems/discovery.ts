/**
 * Discovery ledger + fast-travel nodes (v2 BLOCK #4, ROADMAP_TO_V5 §v2 —
 * "minimap fast travel"; VISION §9 Transportation). Walking is still the ONLY
 * way to reveal the world: a named location becomes a quick-travel node the
 * first time the player physically reaches its region on foot. This module
 * owns the pure RULES half — the node table, the discovered-set store, and the
 * distance→fare / distance→time maths — while main.ts drives discovery from the
 * region-change seam it already runs (block #3's first-town greeting is now one
 * case of a general ledger) and owns the paid, faded travel itself.
 *
 * A node maps 1:1 to a world Region (farm / market / forest / river-lake /
 * town), so "reached this region" == "discovered this node". The farm is
 * discovered from the start (she wakes there). Store convention matches
 * reputation.ts / customers.ts: versioned, tolerant of corrupt saves,
 * private-mode safe, nothing runs at import time.
 */
import {
  T, TRAVEL_FARE_MIN, TRAVEL_FARE_MAX, TRAVEL_FARE_PER_TILE,
  TRAVEL_MIN_MINUTES, TRAVEL_MINUTES_PER_TILE, TRAVEL_MAX_MINUTES, DISCOVERY_KEY,
} from "../config";
import { BUSK_SPOT, TOWN_SQUARE, DOCK, type Region } from "../world/zones";

/** A fast-travel destination. `region` is what the player must reach on foot to
 *  discover it; `x`/`y` is the walkable arrival point (verified non-colliding). */
export interface TravelNode {
  id: string;
  label: string;
  region: Region;
  x: number;
  y: number;
  icon: string;   // parchment-pin glyph
}

/**
 * The five named locations of the v1/v2 world. Arrival points are all verified
 * walkable (blocked() === false) — see scratchpad/v2-block4 verify harness:
 *  - farm    : the player's own spawn tile (13,9.2)
 *  - market  : the busking spot in the market square (a known-clear tile)
 *  - forest  : a clearing inside the northern forest band
 *  - dock    : the lake fishing dock deck (isOnDock → walkable)
 *  - town    : the coastal town square
 */
export const TRAVEL_NODES: readonly TravelNode[] = [
  { id: "farm",   label: "Home Farm",     region: "farm",   x: 13 * T,   y: 9.2 * T,  icon: "🏡" },
  { id: "market", label: "Market Square", region: "market", x: BUSK_SPOT[0], y: BUSK_SPOT[1], icon: "🏪" },
  { id: "forest", label: "Forest Edge",   region: "forest", x: 54 * T,   y: 8 * T,    icon: "🌲" },
  { id: "dock",   label: "Lake Dock",     region: "river",  x: DOCK.x + DOCK.w / 2, y: DOCK.y + DOCK.h * 0.55, icon: "🎣" },
  { id: "town",   label: "Coastal Town",  region: "town",   x: TOWN_SQUARE[0], y: TOWN_SQUARE[1], icon: "⚓" },
] as const;

export function nodeById(id: string): TravelNode | undefined {
  return TRAVEL_NODES.find((n) => n.id === id);
}

/** The node whose region a point sits in, if any (used to skip travelling to
 *  where you already stand). */
export function nodeForRegion(region: Region): TravelNode | undefined {
  return TRAVEL_NODES.find((n) => n.region === region);
}

export interface Discovery {
  version: 1;
  discovered: string[];   // node ids reached on foot (farm seeded from the start)
}

const validIds = new Set(TRAVEL_NODES.map((n) => n.id));

function fresh(): Discovery {
  return { version: 1, discovered: ["farm"] };   // she wakes on the farm — it's known from minute one
}

// ---- persistence ------------------------------------------------------------

export function loadDiscovery(): Discovery {
  try {
    const raw = localStorage.getItem(DISCOVERY_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Discovery>;
    const ids = Array.isArray(p.discovered) ? p.discovered.filter((id) => validIds.has(id)) : [];
    if (!ids.includes("farm")) ids.push("farm");
    return { version: 1, discovered: [...new Set(ids)] };
  } catch {
    return fresh();
  }
}

export function saveDiscovery(d: Discovery) {
  try { localStorage.setItem(DISCOVERY_KEY, JSON.stringify(d)); } catch { /* private mode */ }
}

/** New Game: the world is unknown again — only the farm underfoot. */
export function resetDiscovery(d: Discovery) {
  d.discovered = ["farm"];
  saveDiscovery(d);
}

// ---- reads ------------------------------------------------------------------

export function isDiscovered(d: Discovery, id: string): boolean {
  return d.discovered.includes(id);
}

/** Distance (in tiles) from a world point to a node's arrival point. */
function tileDist(fx: number, fy: number, node: TravelNode): number {
  return Math.hypot(node.x - fx, node.y - fy) / T;
}

/** The carriage fare for a hop from (fx,fy) to `node`: the VISION 3-5 anchor,
 *  ramped by distance and clamped. One source of truth so the confirm prompt
 *  SHOWS exactly what main.ts CHARGES. */
export function travelFare(fx: number, fy: number, node: TravelNode): number {
  const raw = TRAVEL_FARE_MIN + tileDist(fx, fy, node) * TRAVEL_FARE_PER_TILE;
  return Math.round(Math.max(TRAVEL_FARE_MIN, Math.min(TRAVEL_FARE_MAX, raw)));
}

/** In-game minutes the hop consumes (time still ticks — no clock teleport). */
export function travelMinutes(fx: number, fy: number, node: TravelNode): number {
  const raw = tileDist(fx, fy, node) * TRAVEL_MINUTES_PER_TILE;
  return Math.round(Math.max(TRAVEL_MIN_MINUTES, Math.min(TRAVEL_MAX_MINUTES, raw)));
}

// ---- writes -----------------------------------------------------------------

/**
 * Mark the node for a region discovered. Returns the node IF this was its first
 * discovery (so the caller can celebrate with a memory + toast), else null.
 * No-op for regions that aren't travel nodes (road) or already discovered.
 */
export function discoverRegion(d: Discovery, region: Region): TravelNode | null {
  const node = nodeForRegion(region);
  if (!node || d.discovered.includes(node.id)) return null;
  d.discovered.push(node.id);
  saveDiscovery(d);
  return node;
}
