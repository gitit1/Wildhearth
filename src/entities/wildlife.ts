/**
 * Seasonal wildlife: lightweight, ambient entities (ROADMAP's "Wild animals
 * along the road/river" block). State + movement only — no drawing (that's
 * art/wildlife.ts). Mirrors entities/animals.ts's cow/hen pattern (a wander
 * timer + a target reroll), plus population management keyed to the CURRENT
 * season + weather: species that fall out of season/weather fade out,
 * eligible species gradually refill toward their cap (never a burst spawn).
 *
 * Butterflies and ducks are pure ambience (no player reaction — ducks are
 * safely out on the water anyway). Songbirds/rabbits/hares/deer react to the
 * player getting close: songbirds "fly off" (a quick despawn), the ground
 * mammals flee in a straight line away from the player, then despawn once
 * they've put enough distance between themselves and their spawn point.
 *
 * Cheap by design: no pathfinding, a handful of instances at once, plain
 * arithmetic per frame.
 */
import {
  T, MH, WORLD_W, WORLD_H,
  WILDLIFE_SPEED, WILDLIFE_RAIN_BIRD_MULT, WILDLIFE_SPAWN_CHANCE, WILDLIFE_FLEE_RADIUS,
  WILDLIFE_DESPAWN_RANGE, WILDLIFE_FLEE_SPEED_MULT, WILDLIFE_WANDER_RADIUS, WILDLIFE_DESPAWN_SECONDS,
} from "../config";
import { WILDLIFE, type WildlifeDef, type WildlifeKind } from "../data/wildlife";
import { blocked } from "../world/collision";
import { ROAD_SEGMENTS, RIVER, LAKE, inWater, type Region } from "../world/zones";
import type { Season } from "../systems/calendar";
import type { WeatherKind } from "../systems/weather";

export interface WildlifeInst {
  defId: string;
  kind: WildlifeKind;
  x: number; y: number;
  homeX: number; homeY: number;   // spawn point — ambient wander recenters here; despawn range is measured from it
  tx: number; ty: number;         // current wander/flee target
  wanderT: number;                // seconds until the next ambient target reroll
  dist: number;                   // travel px, feeds the shared rig's distance-keyed walk cycle
  flip: boolean;
  moving: boolean;
  fleeing: boolean;
  despawning: boolean;
  despawnT: number;               // seconds left in the fade/fly-off animation
  t: number;                      // seconds alive — idle animation phase (bob, flutter, peck)
  peck: number;                   // bird peck timer (parity with the hen rig)
  color: string;                  // butterfly wing tint (unused by other kinds)
  hasAntlers: boolean;            // deer only — not every deer is a buck
}

const BUTTERFLY_COLORS = ["#f2a03c", "#e85a7a", "#f2d857", "#9a7ad0", "#eef0f6"];

// kinds that notice the player at all, and the subset of those that flee on
// foot (vs. songbird's quick fly-off despawn)
const REACTIVE: ReadonlySet<WildlifeKind> = new Set(["songbird", "rabbit", "hare", "deer"]);
const RUNS_AWAY: ReadonlySet<WildlifeKind> = new Set(["rabbit", "hare", "deer"]);
const AIRBORNE: ReadonlySet<WildlifeKind> = new Set(["butterfly", "songbird", "duck"]);

function regionSample(region: Region): [number, number] {
  switch (region) {
    case "farm": return [T + Math.random() * 33 * T, T + Math.random() * (MH - 2) * T];
    case "forest": return [48 * T + Math.random() * 16 * T, T + Math.random() * 16 * T];
    case "market": return [58 * T + Math.random() * 34 * T, 13 * T + Math.random() * (MH - 14) * T];
    case "road": {
      const seg = ROAD_SEGMENTS[(Math.random() * ROAD_SEGMENTS.length) | 0]!;
      return [seg.x - 20 + Math.random() * (seg.w + 40), seg.y - 20 + Math.random() * (seg.h + 40)];
    }
    case "river": {
      const body = Math.random() < 0.5 ? RIVER : LAKE;
      return [body.x + Math.random() * body.w, body.y + Math.random() * body.h];
    }
  }
}

/** A handful of tries at a legal spot for this kind: land creatures avoid
 *  buildings/trees/water (reuses the player's own collision check — no
 *  separate rejection-zone table to maintain); ducks must actually be ON
 *  the water, since they float rather than walk. */
function pickSpawnPoint(def: WildlifeDef): [number, number] | null {
  for (let tries = 0; tries < 6; tries++) {
    const region = def.regions[(Math.random() * def.regions.length) | 0]!;
    const [x, y] = regionSample(region);
    if (x < T || y < T || x > WORLD_W - T || y > WORLD_H - T) continue;
    if (def.kind === "duck") { if (!inWater(x, y)) continue; }
    else if (blocked(x, y)) continue;
    return [x, y];
  }
  return null;
}

function spawn(def: WildlifeDef): WildlifeInst | null {
  const p = pickSpawnPoint(def);
  if (!p) return null;
  const [x, y] = p;
  return {
    defId: def.id, kind: def.kind, x, y, homeX: x, homeY: y, tx: x, ty: y,
    wanderT: Math.random() * 2, dist: 0, flip: false, moving: false, fleeing: false,
    despawning: false, despawnT: 0, t: Math.random() * 10, peck: 0,
    color: BUTTERFLY_COLORS[(Math.random() * BUTTERFLY_COLORS.length) | 0]!,
    hasAntlers: Math.random() < 0.5,
  };
}

/** Which table rows are eligible RIGHT NOW. A storm always empties the sky,
 *  regardless of what an individual row's `weather` list says. */
export function activeDefs(season: Season, weather: WeatherKind): WildlifeDef[] {
  if (weather === "storm") return [];
  return WILDLIFE.filter((d) => d.seasons.includes(season) && d.weather.includes(weather));
}

/** A def's live population cap right now — rain thins bird numbers (DECISIONS:
 *  "Rain: insects gone, fewer birds") without needing a separate table column. */
function effectiveMax(def: WildlifeDef, weather: WeatherKind): number {
  if (weather === "rain" && (def.kind === "songbird" || def.kind === "duck"))
    return Math.max(0, Math.round(def.maxCount * WILDLIFE_RAIN_BIRD_MULT));
  return def.maxCount;
}

export function createWildlife(): WildlifeInst[] {
  return [];
}

export function updateWildlife(
  list: WildlifeInst[], season: Season, weather: WeatherKind,
  player: { x: number; y: number }, dt: number,
) {
  const active = activeDefs(season, weather);
  const activeIds = new Set(active.map((d) => d.id));

  // ---- population maintenance: fade out anything no longer valid, or over
  // its (possibly just-shrunk) cap
  const countByDef = new Map<string, number>();
  for (const w of list) if (!w.despawning) countByDef.set(w.defId, (countByDef.get(w.defId) ?? 0) + 1);
  for (const w of list) {
    if (w.despawning) continue;
    if (!activeIds.has(w.defId)) { w.despawning = true; w.despawnT = WILDLIFE_DESPAWN_SECONDS; continue; }
    const def = WILDLIFE.find((d) => d.id === w.defId)!;
    const cap = effectiveMax(def, weather);
    const have = countByDef.get(w.defId) ?? 0;
    if (have > cap) { w.despawning = true; w.despawnT = WILDLIFE_DESPAWN_SECONDS; countByDef.set(w.defId, have - 1); }
  }

  // ---- gradual repopulation: each eligible def occasionally tries to fill
  // an empty slot — a slow trickle, never a burst
  for (const def of active) {
    const have = list.filter((w) => w.defId === def.id && !w.despawning).length;
    if (have < effectiveMax(def, weather) && Math.random() < WILDLIFE_SPAWN_CHANCE * dt) {
      const inst = spawn(def);
      if (inst) list.push(inst);
    }
  }

  // ---- per-instance update
  for (const w of list) {
    w.t += dt;

    if (w.despawning) {
      w.despawnT -= dt;
      if (RUNS_AWAY.has(w.kind)) moveToward(w, w.tx, w.ty, WILDLIFE_SPEED[w.kind] * WILDLIFE_FLEE_SPEED_MULT, dt);
      continue;
    }

    const distToPlayer = Math.hypot(player.x - w.x, player.y - w.y);
    if (!w.fleeing && REACTIVE.has(w.kind) && distToPlayer < WILDLIFE_FLEE_RADIUS) {
      if (!RUNS_AWAY.has(w.kind)) { w.despawning = true; w.despawnT = WILDLIFE_DESPAWN_SECONDS; continue; } // songbird: quick fly-off
      w.fleeing = true;
    }

    if (w.fleeing) {
      // run directly away from the player, recomputed every frame in case
      // they're still closing in
      const dx = w.x - player.x, dy = w.y - player.y, d = Math.hypot(dx, dy) || 1;
      w.tx = w.x + (dx / d) * 80; w.ty = w.y + (dy / d) * 80;
      moveToward(w, w.tx, w.ty, WILDLIFE_SPEED[w.kind] * WILDLIFE_FLEE_SPEED_MULT, dt);
      if (Math.hypot(w.x - w.homeX, w.y - w.homeY) > WILDLIFE_DESPAWN_RANGE) {
        w.despawning = true; w.despawnT = 0.01;   // fled far enough — gone almost at once, no fade needed
      }
      continue;
    }

    // ambient wander-graze, recentred on the spawn point so nothing drifts
    // clear across the map
    w.wanderT -= dt;
    if (w.wanderT <= 0) {
      w.wanderT = 2 + Math.random() * 3;
      w.tx = w.homeX + (Math.random() * 2 - 1) * WILDLIFE_WANDER_RADIUS;
      w.ty = w.homeY + (Math.random() * 2 - 1) * WILDLIFE_WANDER_RADIUS;
      if (w.kind === "songbird" || w.kind === "duck") w.peck = Math.random() < 0.4 ? 0.6 : 0;
    }
    moveToward(w, w.tx, w.ty, WILDLIFE_SPEED[w.kind], dt);
    w.peck = Math.max(0, w.peck - dt);
  }

  // ---- remove fully-faded / far-fled instances
  for (let i = list.length - 1; i >= 0; i--) if (list[i]!.despawning && list[i]!.despawnT <= 0) list.splice(i, 1);
}

function moveToward(w: WildlifeInst, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
  w.moving = d > 2;
  if (!w.moving) return;
  const step = Math.min(speed * dt, d);
  w.x += (dx / d) * step; w.y += (dy / d) * step;
  w.flip = dx < 0;
  w.dist += step;
}

export { AIRBORNE };
