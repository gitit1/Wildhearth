/**
 * Segmented, poseable humanoid rig — the single painter for EVERY two-legged
 * character in the game (player now, the 10 NPCs next block). Jointed segments
 * (head, torso, two arms, two legs) are drawn as the established rounded
 * code-shapes with the shared dark OUTLINE + elliptical drop shadow, so the
 * Cute-Fantasy look carries over unchanged — the character is just alive now.
 *
 * Design intent (so NPCs are cheap and a future sprite-swap stays local):
 *  - `RigParams` fully describes an individual's look (build, proportions,
 *    skin, hair, outfit, age). 10 distinct NPCs = 10 small param objects.
 *  - `drawRig(g, x, y, facing, params, pose, phase, t)` is the ONE narrow
 *    entry point. Swapping to sprites later means reimplementing this single
 *    function; nothing else in the game touches limb geometry.
 *  - The walk cycle is keyed to DISTANCE MOVED (phase = dist / stride), not
 *    wall-clock time, so animation speed always matches actual travel.
 *
 * Pure art constants live here; gameplay-tuning values live in config.ts.
 */
import { roundR, outline, shadow, castShadow } from "./shapes";

const TAU = Math.PI * 2;

// facing matches Player.dir: 0 up, 1 right, 2 down, 3 left
export type Facing = 0 | 1 | 2 | 3;

export type BodyBuild = "slim" | "average" | "round";
export type HairStyle = "short" | "ponytail" | "bun" | "bald" | "hat";
export type AgeProfile = "kid" | "adult" | "elder";

export type PoseName =
  | "idle" | "walking" | "fishing" | "hoeing"
  | "foraging" | "busking" | "talking" | "sleeping";

export interface Outfit {
  torso: string;         // shirt / tunic / dress body color (also sleeve color)
  torsoStyle?: number;   // 0 plain, 1 vest/collar, 2 apron
  legs: string;          // trousers / skirt color
  legStyle?: number;     // 0 trousers, 1 skirt
  accent?: string;       // belt / trim color
  shoes?: string;        // foot color (defaults to a dark boot)
}

export interface RigParams {
  scale: number;         // overall size (1 = the player's default size)
  build: BodyBuild;      // torso / shoulder width
  legLength: number;     // multiplier around 1
  armLength: number;     // multiplier around 1
  skin: string;
  hair: HairStyle;
  hairColor: string;
  outfit: Outfit;
  age: AgeProfile;       // kid = big head + short legs, elder = slight stoop
  hatColor?: string;     // used when hair === "hat"
}

// px of travel per FULL leg cycle (two steps). Pure animation cadence.
export const RIG_STRIDE = 34;

const BUILD: Record<BodyBuild, { hip: number; sh: number }> = {
  slim:    { hip: 3.0, sh: 5.4 },
  average: { hip: 3.6, sh: 6.4 },
  round:   { hip: 4.4, sh: 7.7 },
};

/** A rounded capsule between two points — both ends anchored, so a limb can
 *  swing about its root joint without ever detaching (no gap at any zoom). */
function capsule(
  g: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, w: number, fill: string,
) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 0.001;
  g.save();
  g.translate(ax, ay);
  g.rotate(Math.atan2(dy, dx));
  g.fillStyle = fill;
  roundR(g, 0, -w / 2, len, w, Math.min(w / 2, len / 2));
  g.fill();
  outline(g);
  g.restore();
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

interface Limbs {
  lFoot: [number, number]; rFoot: [number, number];
  lHand: [number, number]; rHand: [number, number];
  ux: number; uy: number;          // upper-body offset (lean x, bob/crouch y)
  tool: "rod" | "hoe" | "lute" | "basket" | null;
}

/**
 * The one painter. Draws the rig standing on (x, y) — the same anchor the old
 * static painter used, so depth-sort offsets in main.ts are unchanged.
 *  @param facing  Player.dir (0 up / 1 right / 2 down / 3 left)
 *  @param phase   accumulated WALK cycles (distance / stride); used by walking
 *  @param t       wall-clock seconds (idle breathing + action rhythms)
 */
export function drawRig(
  g: CanvasRenderingContext2D,
  x: number, y: number,
  facing: Facing,
  p: RigParams,
  pose: PoseName,
  phase: number,
  t: number,
) {
  const s = p.scale;
  const age = p.age;
  const headMul = age === "kid" ? 1.28 : 1;
  const legMul  = age === "kid" ? 0.72 : age === "elder" ? 0.93 : 1;
  const torsoMul = age === "kid" ? 0.84 : 1;
  const armMul  = age === "kid" ? 0.82 : 1;

  const b = BUILD[p.build];
  const footY = 14 * s;
  const legLen = 12 * s * p.legLength * legMul;
  const hipY = footY - legLen;
  const torsoLen = 10 * s * torsoMul;
  const shoulderY = hipY - torsoLen;
  const headR = 7 * s * headMul;
  const stoop = age === "elder" ? 1.6 * s : 0;
  const headY = shoulderY - headR - 1 * s + stoop;
  const armLen = 11 * s * p.armLength * armMul;
  const hipHalf = b.hip * s, shHalf = b.sh * s;

  // a short skewed cast shadow (Part B #3), distinct from the under-feet
  // ellipse just below — a person is short, so this stays subtle
  castShadow(g, x, y + 13 * s, 7 * s, 13 * s);
  // drop shadow — always under the feet, at ground level
  shadow(g, x, y + 13 * s, (10 + (p.build === "round" ? 2 : 0)) * s, 4.3 * s);

  if (pose === "sleeping") { drawSleeping(g, x, y, p, s); return; }

  g.save();
  g.translate(x, y);
  const flip = facing === 3 ? -1 : 1;
  g.scale(flip, 1);
  const face: Facing = facing === 3 ? 1 : facing;   // internal facing after mirror

  // ---- leg roots (lower body, never bobbed) & arm roots (upper body) ----
  const hipLX = -hipHalf * 0.75, hipRX = hipHalf * 0.75;
  const shTopY = shoulderY + 1 * s;
  const shLX = -shHalf * 0.86, shRX = shHalf * 0.86;

  const L = poseLimbs(pose, phase, t, s, {
    hipLX, hipRX, footY, shLX, shRX, shTopY, armLen, shoulderY,
  });

  const sleeve = p.outfit.torso;
  const skin = p.skin;
  const shoe = p.outfit.shoes ?? "#4b3a26";
  const trouser = p.outfit.legs;
  const legW = 4.6 * s, armW = 3.9 * s;

  // ---- LEGS (behind torso) ----
  drawLeg(g, hipLX, hipY, L.lFoot, legW, trouser, shoe, s);
  drawLeg(g, hipRX, hipY, L.rFoot, legW, trouser, shoe, s);

  // ---- BACK ARM (behind torso) ----
  drawArm(g, shLX + L.ux, shTopY + L.uy, L.lHand, armW, sleeve, skin, s);

  // ---- TORSO ----
  drawTorso(g, shHalf, shoulderY, hipY, hipHalf, L.ux, L.uy, p, s);

  // lute sits across the chest, ON the torso, under the front (strumming) arm
  if (L.tool === "lute") drawLute(g, L.ux, shoulderY + L.uy, s);

  // ---- FRONT ARM (over torso) ----
  drawArm(g, shRX + L.ux, shTopY + L.uy, L.rHand, armW, sleeve, skin, s);

  // held tools that read in front of the hands
  if (L.tool === "rod") drawRod(g, L.rHand, t, s);
  if (L.tool === "hoe") drawHoe(g, L.rHand, L.lHand, s);
  if (L.tool === "basket") drawBasket(g, L.rHand, s);

  // ---- HEAD + HAIR ----
  drawHead(g, headY + L.uy, headR, L.ux, face, p, s);

  g.restore();
}

/** Per-pose limb targets. Walking swings on `phase` (distance); idle/action
 *  poses breathe/repeat on `t`. Everything is a distinct readable silhouette. */
function poseLimbs(
  pose: PoseName, phase: number, t: number, s: number,
  a: { hipLX: number; hipRX: number; footY: number; shLX: number; shRX: number; shTopY: number; armLen: number; shoulderY: number },
): Limbs {
  const { hipLX, hipRX, footY, shLX, shRX, shTopY, armLen, shoulderY } = a;
  const rest: Limbs = {
    lFoot: [hipLX, footY], rFoot: [hipRX, footY],
    lHand: [shLX - 0.4 * s, shTopY + armLen], rHand: [shRX + 0.4 * s, shTopY + armLen],
    ux: 0, uy: 0, tool: null,
  };

  switch (pose) {
    case "walking": {
      const w = Math.sin(phase * TAU);
      const legSwing = 3.4 * s, armSwing = 3.0 * s;
      return {
        lFoot: [hipLX + w * legSwing, footY - Math.max(0, w) * 1.2 * s],
        rFoot: [hipRX - w * legSwing, footY - Math.max(0, -w) * 1.2 * s],
        lHand: [shLX - w * armSwing, shTopY + armLen],
        rHand: [shRX + w * armSwing, shTopY + armLen],
        ux: 0, uy: -Math.abs(Math.sin(phase * TAU)) * 1.3 * s, tool: null,
      };
    }
    case "idle": {
      const br = Math.sin(t * 2.1);
      return { ...rest, uy: br * 0.6 * s };
    }
    case "fishing": {
      return {
        lFoot: [hipLX - 1 * s, footY], rFoot: [hipRX + 1.6 * s, footY],
        rHand: [shRX + 7 * s, shoulderY + 2 * s],   // front hand out over the water
        lHand: [shLX + 3.5 * s, shoulderY + 5.5 * s], // guiding hand at the chest
        ux: 0.8 * s, uy: Math.sin(t * 2) * 0.4 * s, tool: "rod",
      };
    }
    case "hoeing": {
      const sw = Math.sin(t * 4.2);
      const down = Math.max(0, sw);
      const hy = shoulderY + 5 * s + down * 8 * s;
      const hx = shRX + 4 * s + sw * 2 * s;
      return {
        lFoot: [hipLX - 1.2 * s, footY], rFoot: [hipRX + 2 * s, footY],
        rHand: [hx, hy], lHand: [hx - 3.4 * s, hy + 1.2 * s],
        ux: 1.4 * s, uy: 1.5 * s + down * 2.5 * s, tool: "hoe",
      };
    }
    case "foraging": {
      const rk = Math.sin(t * 3);
      return {
        lFoot: [hipLX + 1 * s, footY - 1 * s], rFoot: [hipRX - 0.5 * s, footY],
        rHand: [shRX + 5.5 * s, shTopY + armLen + 4 * s + rk * 1.2 * s], // reaching into the bush
        lHand: [shLX + 1 * s, shTopY + armLen],
        ux: 1.2 * s, uy: 3.6 * s, tool: "basket",   // crouched
      };
    }
    case "busking": {
      const strum = Math.sin(t * 7.5);
      return {
        lFoot: [hipLX, footY], rFoot: [hipRX, footY],
        rHand: [shRX + 2.5 * s + strum * 2.2 * s, shoulderY + 7.5 * s], // strumming arm
        lHand: [shLX + 5.5 * s, shoulderY + 4 * s],                     // fretting hand on the neck
        ux: Math.sin(t * 2) * 0.9 * s, uy: 0, tool: "lute",
      };
    }
    case "talking": {
      const ge = Math.sin(t * 3);
      return {
        ...rest,
        rHand: [shRX + 2.5 * s + Math.max(0, ge) * 2.5 * s, shTopY + armLen - Math.max(0, ge) * 6 * s],
        uy: Math.sin(t * 2) * 0.5 * s,
      };
    }
    default:
      return rest;
  }
}

// ---- segment painters ---------------------------------------------------

function drawLeg(
  g: CanvasRenderingContext2D, rootX: number, rootY: number,
  foot: [number, number], w: number, trouser: string, shoe: string, s: number,
) {
  capsule(g, rootX, rootY, foot[0], foot[1] - 1.5 * s, w, trouser);
  // boot
  g.fillStyle = shoe;
  g.beginPath(); g.ellipse(foot[0], foot[1] - 0.5 * s, w * 0.62, w * 0.5, 0, 0, TAU); g.fill(); outline(g);
}

function drawArm(
  g: CanvasRenderingContext2D, rootX: number, rootY: number,
  hand: [number, number], w: number, sleeve: string, skin: string, s: number,
) {
  capsule(g, rootX, rootY, hand[0], hand[1], w, sleeve);
  dot(g, hand[0], hand[1], w * 0.62, skin); outline(g);
}

function drawTorso(
  g: CanvasRenderingContext2D, shHalf: number, shoulderY: number, hipY: number,
  hipHalf: number, ux: number, uy: number, p: RigParams, s: number,
) {
  const top = shoulderY + uy;
  const h = hipY - shoulderY + hipHalf * 1.3;
  g.fillStyle = p.outfit.torso;
  roundR(g, -shHalf + ux, top, shHalf * 2, h, shHalf * 0.7);
  g.fill(); outline(g);

  // subtle front shading band
  g.fillStyle = "rgba(0,0,0,.10)";
  g.fillRect(-shHalf + ux, top + h * 0.42, shHalf * 2, h * 0.16);

  // outfit style flourishes
  if (p.outfit.torsoStyle === 2) {                // apron
    g.fillStyle = "rgba(255,255,255,.55)";
    roundR(g, -shHalf * 0.6 + ux, top + h * 0.2, shHalf * 1.2, h * 0.62, 2 * s);
    g.fill(); outline(g);
  } else if (p.outfit.torsoStyle === 1) {         // vest / collar
    g.fillStyle = p.outfit.accent ?? "rgba(0,0,0,.18)";
    g.beginPath();
    g.moveTo(ux, top);
    g.lineTo(ux - shHalf * 0.5, top + h * 0.5);
    g.lineTo(ux + shHalf * 0.5, top + h * 0.5);
    g.closePath(); g.fill();
  }
  // belt
  if (p.outfit.accent) {
    g.fillStyle = p.outfit.accent;
    g.fillRect(-shHalf + ux, hipY - 1.4 * s + uy, shHalf * 2, 2.4 * s);
  }
}

function drawHead(
  g: CanvasRenderingContext2D, headY: number, headR: number, ux: number,
  face: Facing, p: RigParams, s: number,
) {
  // head
  g.fillStyle = p.skin;
  g.beginPath(); g.arc(ux, headY, headR, 0, TAU); g.fill(); outline(g);

  // face (never on the back / up view)
  if (face !== 0) {
    g.fillStyle = "#2a2a30";
    const ey = headY - 0.6 * s;
    if (face === 2) {
      dot(g, ux - 2.6 * s, ey, 1.1 * s, "#2a2a30");
      dot(g, ux + 2.6 * s, ey, 1.1 * s, "#2a2a30");
    } else {                                        // facing right (or mirrored left)
      dot(g, ux + 1.4 * s, ey, 1.1 * s, "#2a2a30");
      dot(g, ux + 3.6 * s, ey, 1.1 * s, "#2a2a30");
    }
  }

  drawHair(g, headY, headR, ux, face, p, s);
}

function drawHair(
  g: CanvasRenderingContext2D, headY: number, headR: number, ux: number,
  face: Facing, p: RigParams, s: number,
) {
  const hc = p.hairColor;
  switch (p.hair) {
    case "hat": {
      const brim = p.hatColor ?? "#e0be5c";
      g.fillStyle = brim;
      g.beginPath(); g.ellipse(ux, headY - headR * 0.6, headR * 1.55, headR * 0.55, 0, 0, TAU); g.fill(); outline(g);
      g.beginPath(); g.ellipse(ux, headY - headR * 1.05, headR * 0.9, headR * 0.62, 0, 0, TAU); g.fill(); outline(g);
      g.fillStyle = "rgba(0,0,0,.16)";
      g.fillRect(ux - headR * 0.9, headY - headR * 1.0, headR * 1.8, 2 * s);
      break;
    }
    case "short": {
      g.fillStyle = hc;
      g.beginPath();
      g.arc(ux, headY, headR + 0.6 * s, Math.PI * 1.02, Math.PI * 1.98);
      g.arc(ux, headY - headR * 0.15, headR * 0.9, Math.PI * 1.9, Math.PI * 1.1, true);
      g.closePath(); g.fill(); outline(g);
      break;
    }
    case "ponytail": {
      g.fillStyle = hc;
      // behind the head
      g.beginPath(); g.ellipse(ux - headR * 1.05, headY + headR * 0.25, headR * 0.5, headR * 0.9, 0.3, 0, TAU); g.fill(); outline(g);
      // cap
      g.beginPath(); g.arc(ux, headY, headR + 0.6 * s, Math.PI, TAU); g.fill(); outline(g);
      break;
    }
    case "bun": {
      g.fillStyle = hc;
      g.beginPath(); g.arc(ux, headY - headR * 0.95, headR * 0.55, 0, TAU); g.fill(); outline(g); // bun on top
      g.beginPath(); g.arc(ux, headY, headR + 0.5 * s, Math.PI, TAU); g.fill(); outline(g);       // cap
      break;
    }
    case "bald": {
      g.fillStyle = hc;                              // faint side fringe only
      g.beginPath(); g.arc(ux, headY + headR * 0.1, headR + 0.4 * s, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      break;
    }
  }
}

// ---- held tools (minimal code shapes; full tool painters land in Part C) --

function drawRod(g: CanvasRenderingContext2D, hand: [number, number], t: number, s: number) {
  const [hx, hy] = hand;
  const tipX = hx + 15 * s, tipY = hy - 15 * s;
  g.strokeStyle = "#6b4a2b"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(hx - 4 * s, hy + 4 * s); g.lineTo(tipX, tipY); g.stroke();
  g.strokeStyle = "rgba(240,240,240,.85)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX + 4 * s, hy + 12 * s + Math.sin(t * 5) * 2); g.stroke();
}

function drawHoe(g: CanvasRenderingContext2D, rHand: [number, number], lHand: [number, number], s: number) {
  const [hx, hy] = rHand;
  const topX = lHand[0] - 4 * s, topY = lHand[1] - 12 * s;
  const botX = hx + 6 * s, botY = hy + 12 * s;
  g.strokeStyle = "#7a5330"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(topX, topY); g.lineTo(botX, botY); g.stroke();
  // blade
  g.fillStyle = "#9aa0a6";
  g.save(); g.translate(botX, botY); g.rotate(0.5);
  roundR(g, 0, -1.5 * s, 7 * s, 3.5 * s, 1 * s); g.fill(); outline(g);
  g.restore();
}

function drawLute(g: CanvasRenderingContext2D, ux: number, chestY: number, s: number) {
  g.save(); g.translate(ux + 3.5 * s, chestY + 7 * s); g.rotate(0.55);
  g.strokeStyle = "#7a4e20"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(1 * s, -1 * s); g.lineTo(13 * s, -9 * s); g.stroke();          // neck (drawn first, body over its base)
  g.fillStyle = "#b9802f";
  g.beginPath(); g.ellipse(0, 0, 6.4 * s, 4.9 * s, 0, 0, TAU); g.fill(); outline(g);      // body
  g.fillStyle = "#2a1c10"; g.beginPath(); g.arc(1 * s, -0.3 * s, 1.5 * s, 0, TAU); g.fill(); // sound hole
  g.strokeStyle = "rgba(40,20,8,.5)"; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(4 * s, 3 * s); g.lineTo(7 * s, -5 * s); g.stroke();              // strings hint
  g.restore();
}

function drawBasket(g: CanvasRenderingContext2D, hand: [number, number], s: number) {
  const [hx, hy] = hand;
  g.fillStyle = "#b98a4e";
  roundR(g, hx - 4 * s, hy - 1 * s, 8 * s, 5 * s, 1.5 * s); g.fill(); outline(g);
  g.strokeStyle = "#8a6636"; g.lineWidth = 1.4 * s;
  g.beginPath(); g.arc(hx, hy - 1 * s, 4 * s, Math.PI, TAU); g.stroke();   // handle
}

function drawSleeping(g: CanvasRenderingContext2D, x: number, y: number, p: RigParams, s: number) {
  // lying on the ground, head to the left; zzz handled by the caller/needs block
  g.save(); g.translate(x, y + 6 * s);
  // body under a simple blanket
  capsule(g, -4 * s, 0, 13 * s, 0, 10 * s, p.outfit.legs);
  capsule(g, -6 * s, -1 * s, 4 * s, -1 * s, 9 * s, p.outfit.torso);
  // head
  g.fillStyle = p.skin;
  g.beginPath(); g.arc(-9 * s, -1 * s, 6 * s, 0, TAU); g.fill(); outline(g);
  // closed eye
  g.strokeStyle = "#2a2a30"; g.lineWidth = 1.2 * s;
  g.beginPath(); g.moveTo(-11 * s, -1.5 * s); g.lineTo(-8.5 * s, -1.5 * s); g.stroke();
  g.restore();
}
