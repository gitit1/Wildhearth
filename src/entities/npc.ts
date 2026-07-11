/**
 * The NPC entity: state + movement, no drawing (that's art/characters.ts's
 * `drawNpc`, which paints the shared rig). Each tick an NPC:
 *  1. asks schedule.ts for its scheduled state (weather-tweaked),
 *  2. when that state CHANGES, picks a walk target and a waypoint route,
 *  3. walks the route by straight-line lerp at NPC_WALK_SPEED,
 *  4. on arrival, holds the state's pose (work pose / talking gesture / idle).
 *
 * Movement is waypoint-only — routes are chosen to keep NPCs on legal ground
 * (the market plaza & roads are open; the forager routes along the forest
 * passage spine; the peddler patrols road nodes), so there's no per-tile
 * collision resolution. An NPC "at home" or "asleep" that has arrived is
 * `indoors` and simply isn't rendered — the simplest honest way to show them
 * inside without an interior for every cottage.
 */
import { T, NPC_WALK_SPEED, NPC_ARRIVE, NPC_TALK_SECONDS } from "../config";
import type { Facing, PoseName } from "../art/rig";
import type { CalendarState } from "../systems/calendar";
import type { WeatherState } from "../systems/weather";
import { activeFestival } from "../systems/festival";
import { WELL } from "../world/zones";
import { NPCS, JONAS_ROUTE, type NpcDef, type Personality } from "../data/npcs";
import {
  dayOfWeek, resolveState, placeFor, scheduleWeatherTweak, type NpcState,
} from "../systems/schedule";
import type { CustomerWant } from "../systems/customers";

/** An active visit to the PLAYER's own market stall (v2 customers block): the
 *  NPC walks to a spot in front of her counter and holds there until she serves
 *  them or their patience runs out (both driven from main.ts). */
export interface CustomerVisit {
  spot: readonly [number, number];
  want: CustomerWant;
  arrived: boolean;
  patience: number;   // in-game minutes left before they give up and wander off
}

export interface Npc {
  def: NpcDef;
  i: number;                       // roster index (spreads social/market spots)
  x: number; y: number;
  facing: Facing;
  state: NpcState;
  pose: PoseName;
  dist: number;                    // travel px — drives the rig's distance-keyed walk cycle
  moving: boolean;
  indoors: boolean;                // at home/asleep & arrived -> not rendered, not interactable
  route: Array<[number, number]>;  // remaining waypoints to the target
  talkTimer: number;               // >0 while facing the player & holding "talking"
  gestureT: number;                // drives occasional socializing gestures
  patrolIdx: number;               // peddler patrol cursor
  patrolDir: 1 | -1;
  visit: CustomerVisit | null;     // set while this NPC is a customer at the player's stall
}

export function createNpcs(): Npc[] {
  return NPCS.map((def, i) => ({
    def, i,
    x: def.home[0], y: def.home[1],
    facing: 2 as Facing, state: "asleep" as NpcState, pose: "idle" as PoseName,
    dist: 0, moving: false, indoors: true, route: [],
    talkTimer: 0, gestureT: Math.random() * 10,
    patrolIdx: 0, patrolDir: 1, visit: null,
  }));
}

/** Snap every NPC to where its schedule says it should be RIGHT NOW, so a fresh
 *  load (or a New Game) doesn't start everyone sprinting from their beds. */
export function initNpcPositions(npcs: Npc[], cal: CalendarState, weather: WeatherState) {
  const dow = dayOfWeek(cal);
  const festival = !!activeFestival(cal);
  for (const n of npcs) {
    const state = scheduleWeatherTweak(n.def, resolveState(n.def, dow, cal.hour, festival), weather);
    const place = placeFor(n.def, state, dow, n.i);
    n.state = state;
    n.x = place[0]; n.y = place[1];
    n.route = []; n.moving = false; n.visit = null;
    n.indoors = state === "atHome" || state === "asleep";
    n.facing = idleFacing(n, state);
    n.pose = poseFor(n, state);
  }
}

export function updateNpcs(
  npcs: Npc[], cal: CalendarState, weather: WeatherState, player: { x: number; y: number }, dt: number,
) {
  const dow = dayOfWeek(cal);
  const festival = !!activeFestival(cal);
  for (const n of npcs) {
    n.gestureT += dt;

    // being talked to: pause the routine, turn to the player, hold the gesture
    if (n.talkTimer > 0) {
      n.talkTimer -= dt;
      n.facing = facingTo(n.x, n.y, player.x, player.y);
      n.moving = false;
      n.pose = "talking";
      continue;
    }

    // customer at the player's stall: walk to the counter spot, then hold there
    // facing it. main.ts sets the visit (spawn), and clears it (serve/timeout).
    if (n.visit) {
      n.indoors = false;
      if (!n.visit.arrived) {
        stepAlong(n, dt);
        if (!n.moving) { n.visit.arrived = true; n.facing = 0; }  // arrived: face the counter (north)
        n.pose = n.moving ? "walking" : "idle";
      } else {
        n.moving = false;
        n.facing = 0;
        n.pose = "idle";
      }
      continue;
    }

    // resolve the scheduled state; on a CHANGE, choose a fresh target + route
    const desired = scheduleWeatherTweak(n.def, resolveState(n.def, dow, cal.hour, festival), weather);
    if (desired !== n.state) {
      n.state = desired;
      n.indoors = false;                       // step out; re-set true only on home arrival
      if (n.def.role === "peddler" && desired === "atWork") {
        // patrol direction alternates by day; start from the near end
        n.patrolDir = dow % 2 === 0 ? 1 : -1;
        n.patrolIdx = n.patrolDir === 1 ? 0 : JONAS_ROUTE.length - 1;
        n.route = [];
      } else {
        n.route = buildRoute(n.def, n.x, n.y, placeFor(n.def, desired, dow, n.i));
      }
    }

    // the peddler keeps the loop topped up while working
    if (n.def.role === "peddler" && n.state === "atWork" && n.route.length === 0)
      n.route = [nextPatrol(n)];

    stepAlong(n, dt);

    // arrived home -> go indoors (invisible); otherwise face something sensible
    if (!n.moving) {
      if (n.state === "atHome" || n.state === "asleep") n.indoors = true;
      else n.facing = idleFacing(n, n.state);
    }
    n.pose = poseFor(n, n.state);
  }
}

/** Walk toward the next waypoint; shift it off on arrival. */
function stepAlong(n: Npc, dt: number) {
  if (n.route.length === 0) { n.moving = false; return; }
  const [tx, ty] = n.route[0]!;
  const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
  if (d <= NPC_ARRIVE) {
    n.route.shift();
    if (n.route.length === 0) { n.moving = false; return; }
    return;
  }
  const step = Math.min(NPC_WALK_SPEED * dt, d);
  n.facing = facingTo(n.x, n.y, tx, ty);
  n.x += (dx / d) * step;
  n.y += (dy / d) * step;
  n.dist += step;
  n.moving = true;
}

/** Advance the peddler's patrol cursor, bouncing at either end. */
function nextPatrol(n: Npc): [number, number] {
  const p = JONAS_ROUTE[n.patrolIdx]!;
  const node: [number, number] = [p[0], p[1]];
  n.patrolIdx += n.patrolDir;
  if (n.patrolIdx >= JONAS_ROUTE.length) { n.patrolIdx = JONAS_ROUTE.length - 2; n.patrolDir = -1; }
  else if (n.patrolIdx < 0) { n.patrolIdx = 1; n.patrolDir = 1; }
  return node;
}

/** Waypoints to a destination. Straight line for everyone in the open plaza/
 *  road; the forager skirts the trees by routing along the forest passage spine
 *  (x≈55) before stepping to a corner (or down to road level to leave). */
function buildRoute(def: NpcDef, fromX: number, fromY: number, dest: [number, number]): Array<[number, number]> {
  if (def.role === "forager") {
    const spineX = 55 * T;
    const inForest = dest[0] < 64 * T && dest[1] < 20 * T;
    const wp: Array<[number, number]> = [[spineX, fromY]];
    wp.push(inForest ? [spineX, dest[1]] : [spineX, 22 * T]);
    wp.push([dest[0], dest[1]]);
    return dedupe(wp);
  }
  return [[dest[0], dest[1]]];
}

function dedupe(wp: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const p of wp) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > NPC_ARRIVE) out.push(p);
  }
  return out;
}

function facingTo(fx: number, fy: number, tx: number, ty: number): Facing {
  const dx = tx - fx, dy = ty - fy;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy >= 0 ? 2 : 0);
}

/** Which way an idle NPC faces: socializers face the group (the well), workers
 *  face "outward" (stallkeepers toward customers, Finn out over the lake).
 *  Festival day: everyone (Ada included — she's part of the crowd today) faces
 *  the well, except Liora, who faces her audience from the busking spot. */
function idleFacing(n: Npc, state: NpcState): Facing {
  if (state === "festival")
    return n.def.role === "musician" ? 2 : facingTo(n.x, n.y, WELL.cx, WELL.cy);
  if (state === "socializing")
    return n.def.role === "forager" ? 2 : facingTo(n.x, n.y, WELL.cx, WELL.cy);
  if (state === "atWork" && n.def.role === "fisher-kid") return 1; // east, over the water
  return 2;
}

/** The pose the rig should draw for this NPC right now. */
function poseFor(n: Npc, state: NpcState): PoseName {
  if (n.talkTimer > 0) return "talking";
  if (n.moving) return "walking";
  switch (state) {
    case "atWork": return workPose(n.def.role);
    case "festival":
      // Liora performs for the crowd; everyone else mingles like socializing
      if (n.def.role === "musician") return "busking";
      return Math.sin(n.gestureT * 0.8 + n.i) > 0.62 ? "talking" : "idle";
    case "socializing":
      // occasional talking gesture at each other, otherwise a relaxed idle
      return Math.sin(n.gestureT * 0.8 + n.i) > 0.62 ? "talking" : "idle";
    default: return "idle";
  }
}

function workPose(role: NpcDef["role"]): PoseName {
  switch (role) {
    case "musician": return "busking";
    case "farmer":
    case "handyman": return "hoeing";
    case "forager": return "foraging";
    case "fisher-kid": return "fishing";
    case "peddler": return "walking";
    default: return "idle";           // stallkeepers & baker stand at their post
  }
}

// ---- talk seam (drives the dialogue engine — ui/dialoguebox.ts) ------------

/** Hold the talking pose for a few seconds; when the player's position is given
 *  (opening a conversation), turn to face them at once so the pose reads while
 *  the dialogue window is up (movement is frozen for the duration). */
export function startTalking(n: Npc, px?: number, py?: number) {
  n.talkTimer = NPC_TALK_SECONDS;
  if (px !== undefined && py !== undefined) {
    n.facing = facingTo(n.x, n.y, px, py);
    n.pose = "talking";
    n.moving = false;
  }
}

export function npcById(npcs: Npc[], id: string): Npc | undefined {
  return npcs.find((n) => n.def.id === id);
}

// ---- customer visits (v2 customers-to-your-stall block) ---------------------

/** Send an NPC to the player's stall as a customer: hand them a want and route
 *  them straight to the counter spot (they're already in the open plaza, so no
 *  waypoint skirting is needed). Cleared by clearVisit once served or bored. */
export function sendCustomer(n: Npc, spot: readonly [number, number], want: CustomerWant, patience: number) {
  n.visit = { spot, want, arrived: false, patience };
  n.route = [[spot[0], spot[1]]];
  n.moving = true;
  n.talkTimer = 0;
}

/** True once a summoned customer has reached the counter and is waiting. */
export function customerWaiting(n: Npc): boolean {
  return !!n.visit && n.visit.arrived;
}

/** End a visit (served or patience expired) and send the NPC back to whatever
 *  their schedule says they should be doing right now, so they don't freeze at
 *  the counter until the next scheduled state change. */
export function clearVisit(n: Npc, cal: CalendarState, weather: WeatherState) {
  n.visit = null;
  const dow = dayOfWeek(cal);
  const festival = !!activeFestival(cal);
  const state = scheduleWeatherTweak(n.def, resolveState(n.def, dow, cal.hour, festival), weather);
  n.state = state;
  n.route = buildRoute(n.def, n.x, n.y, placeFor(n.def, state, dow, n.i));
  n.moving = n.route.length > 0;
}

// ---- needs comment hook (Needs engine) -------------------------------------
// When the player stands near an NPC with a need running low, the NPC can pass
// a short remark ("You look exhausted, dear."). main.ts owns the proximity +
// once-per-need-per-day cooldown; this just supplies the LINE, flavoured by
// personality where it's cheap to do so.

const NEED_COMMENTS: Record<string, string[]> = {
  hunger: ["You look famished, friend.", "When did you last eat, hm?", "You've the pale look of an empty stomach."],
  thirst: ["You look parched.", "Get yourself a drink — you look dry as a bone."],
  energy: ["You look exhausted, dear.", "You're dead on your feet — get some rest.", "Long day? You look worn right through."],
  hygiene: ["Rough morning? You look a fright.", "A wash wouldn't go amiss, friend."],
  bathroom: ["You look a touch uncomfortable...", "You seem in a hurry — don't let me keep you!"],
  social: ["You look like you could use the company.", "Good to see a face — you seemed a little lonely."],
};

/** A short remark an NPC makes about the player's low need. Cheap personality
 *  flavour: the motherly baker always frets over food and rest. */
export function npcNeedComment(def: NpcDef, needId: string): string {
  const personality: Personality = def.personality;
  if (personality === "warm-motherly" && (needId === "hunger" || needId === "energy"))
    return needId === "hunger"
      ? "Eat something, would you? All skin and worry, you are."
      : "You're worn through — sit down, rest a while, dear.";
  const lines = NEED_COMMENTS[needId] ?? ["You alright there?"];
  return lines[Math.floor(Math.random() * lines.length)]!;
}
