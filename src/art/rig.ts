/**
 * Segmented, poseable humanoid rig — the single painter for EVERY two-legged
 * character in the game (player + the NPCs). Jointed segments (head, torso,
 * two arms, two legs) keep the established distance-keyed pose system, now
 * dressed with 3-tone-per-material shading, an expressive face, volumetric
 * shaded hair and cloth detail (folds / hems / straps / seams) — the quality
 * ported from the approved rig-upgrade spike, mapped across all four facings
 * and the walk cycle while preserving the RigParams contract.
 *
 * Design intent (so NPCs are cheap and a future sprite-swap stays local):
 *  - `RigParams` fully describes an individual's look (build, proportions,
 *    skin, hair, outfit, age, eye colour). N distinct NPCs = N param objects.
 *  - `drawRig(g, x, y, facing, params, pose, phase, t)` is the ONE narrow
 *    entry point. Swapping to sprites later means reimplementing this single
 *    function; nothing else in the game touches limb geometry.
 *  - The walk cycle is keyed to DISTANCE MOVED (phase = dist / stride), not
 *    wall-clock time, so animation speed always matches actual travel. The
 *    upper body bob (ux/uy) rides the head/face/hair/torso shading so nothing
 *    detaches mid-stride.
 *
 * Pure art constants live here; gameplay-tuning values live in config.ts.
 */
import { roundR, outline, shadow, castShadow, OUTLINE, OUTLINE_W } from "./shapes";

const TAU = Math.PI * 2;

// facing matches Player.dir: 0 up, 1 right, 2 down, 3 left
export type Facing = 0 | 1 | 2 | 3;

export type BodyBuild = "slim" | "average" | "round";
export type HairStyle = "short" | "ponytail" | "bun" | "bald" | "hat" | "long";
export type AgeProfile = "kid" | "adult" | "elder";

/**
 * `RigHair` was the rig-internal widening that let the painter draw the flowing
 * "long" style while `HairStyle` still excluded it (the sprite path's exhaustive
 * sheet map had no "long" base). Now that characters render rig-primary
 * (CHARACTER_SPRITES_PRIMARY), "long" is a first-class `HairStyle`; the sprite
 * bridge simply has no sheet for it and falls back to the rig. Kept as an alias
 * of `HairStyle` for source compatibility.
 */
export type RigHair = HairStyle;

export type PoseName =
  | "idle" | "walking" | "fishing" | "hoeing"
  | "foraging" | "busking" | "talking" | "sleeping"
  // GF-1: interior action poses. The sprite path (spriteChar.ts) gives each an
  // interim bob/lean + code overlay; the rig fallback has no bespoke limb case
  // (poseLimbs' `default` → neutral standing), which is a safe non-crashing
  // stand-in until real W3 frames arrive.
  | "washing" | "cooking" | "sitting";

/**
 * 8 distinct outfit-style SILHOUETTES (not just colour swaps) layered onto the
 * rig: a skirt/coat hem drawn over the legs + torso-level accents (apron, bib
 * straps, belt, vest, shawl, coat seam), all keyed off this one field.
 */
export type OutfitStyle =
  | "dress" | "tunic-skirt" | "overalls" | "shawl-dress" | "smock"
  | "tunic-belt" | "vest" | "coat";

export interface Outfit {
  torso: string;         // shirt / tunic / dress body color
  torsoStyle?: number;   // LEGACY numeric — retained for save-data tolerance
  legs: string;          // trousers / skirt color
  legStyle?: number;     // legacy, unused by rendering
  accent?: string;       // belt / trim / bib-strap / shawl / coat-seam color
  shoes?: string;        // foot color (defaults to a dark boot)
  style?: OutfitStyle;   // the 8-style system
  sleeve?: string;       // arm color when it differs from torso
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
  eyeColor?: string;     // iris colour (default a warm brown)
}

// px of travel per FULL leg cycle (two steps). Pure animation cadence.
export const RIG_STRIDE = 34;

const BUILD: Record<BodyBuild, { hip: number; sh: number }> = {
  slim:    { hip: 3.0, sh: 5.4 },
  average: { hip: 3.6, sh: 6.4 },
  round:   { hip: 4.4, sh: 7.7 },
};

// ---------------------------------------------------------------------------
//  Colour helpers — a 3-tone material derived from one base colour (HSL),
//  ported from the spike. Two lighter tones, two darker, plus a warm outline.
// ---------------------------------------------------------------------------
export interface Mat { base: string; hi: string; hi2: string; lo: string; lo2: string; line: string; }

function hexToRgb(h: string): [number, number, number] {
  h = h.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function cl(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function rgbToHex(r: number, g: number, b: number): string {
  const f = (v: number) => ("0" + cl(Math.round(v), 0, 255).toString(16)).slice(-2);
  return "#" + f(r) + f(g) + f(b);
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2; const d = mx - mn;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (!s) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const hk = (t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hk(h + 1 / 3); g = hk(h); b = hk(h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}
function shade(hex: string, dl: number, ds = 0): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return rgbToHex(...hslToRgb(h, cl(s + ds, 0, 1), cl(l + dl, 0, 1)));
}
export function mat(base: string): Mat {
  return {
    base,
    hi: shade(base, 0.09), hi2: shade(base, 0.17),
    lo: shade(base, -0.10), lo2: shade(base, -0.20),
    line: shade(base, -0.36, 0.05),
  };
}

// ---- tiny drawing primitives ---------------------------------------------

/** A rounded capsule between two points — both ends anchored (kept for the
 *  sleeping pose's simple blanket blocks). */
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

/** A 3-tone shaded capsule limb — base fill, a light stripe + shadow stripe
 *  clipped along its length, and joint ambient-occlusion at the root. Both
 *  ends anchored so a swinging limb never detaches from its joint. */
function shadedCapsule(
  g: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, w: number, m: Mat,
) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 0.001;
  const r = Math.min(w / 2, len / 2);
  g.save();
  g.translate(ax, ay);
  g.rotate(Math.atan2(dy, dx));
  g.save();
  roundR(g, 0, -w / 2, len, w, r); g.clip();
  g.fillStyle = m.base; g.fillRect(-2, -w, len + 4, w * 2);
  g.globalAlpha = 0.85;
  g.fillStyle = m.hi; g.fillRect(0, -w / 2, len, w * 0.36);
  g.fillStyle = m.lo; g.fillRect(0, w * 0.14, len, w * 0.36);
  g.globalAlpha = 0.5; g.fillStyle = m.lo2;
  g.beginPath(); g.ellipse(r * 0.7, 0, w * 0.72, w * 0.62, 0, 0, TAU); g.fill();
  g.globalAlpha = 1; g.restore();
  roundR(g, 0, -w / 2, len, w, r); outline(g);
  g.restore();
}

function ellp(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU);
}
function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, a = 1) {
  g.save(); g.globalAlpha = a; g.fillStyle = fill;
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.restore();
}
/** Clip to a path, flood-fill the base, run a shading callback inside the
 *  clip, then re-stroke the same path with the shared game outline. */
function part(g: CanvasRenderingContext2D, pathFn: () => void, m: Mat, shadeFn?: () => void) {
  g.save(); pathFn(); g.clip();
  g.fillStyle = m.base; g.fillRect(-400, -400, 800, 800);
  if (shadeFn) shadeFn();
  g.restore();
  pathFn(); outline(g);
}

interface Limbs {
  lFoot: [number, number]; rFoot: [number, number];
  lHand: [number, number]; rHand: [number, number];
  ux: number; uy: number;          // upper-body offset (lean x, bob/crouch y)
  tool: "rod" | "hoe" | "lute" | "basket" | null;
}

/** Everything a garment/head painter needs, gathered once per draw. */
interface RC {
  g: CanvasRenderingContext2D; s: number; ux: number; uy: number;
  shoulderY: number; hipY: number; footY: number; headY: number; headR: number;
  shHalf: number; hipHalf: number; face: Facing; age: AgeProfile;
  skin: Mat; hair: Mat; brow: Mat; torso: Mat; legs: Mat; shoe: Mat; accent: Mat;
  eye: string; hairStyle: RigHair; outfit: Outfit; hatColor?: string;
}

interface Plan {
  torso?: boolean; skirt?: { frac: number; flare: number }; coat?: boolean;
  apron?: boolean; belt?: boolean; bib?: boolean; vest?: boolean; shawl?: boolean;
}
function garmentPlan(style?: OutfitStyle): Plan {
  switch (style) {
    case "dress":        return { torso: true, skirt: { frac: 0.9, flare: 1.65 }, apron: true };
    case "shawl-dress":  return { torso: true, skirt: { frac: 0.9, flare: 1.6 }, shawl: true };
    case "tunic-skirt":  return { torso: true, skirt: { frac: 0.52, flare: 1.35 }, belt: true };
    case "smock":        return { torso: true, skirt: { frac: 0.46, flare: 1.45 }, apron: true };
    case "overalls":     return { torso: true, bib: true };
    case "tunic-belt":   return { torso: true, belt: true };
    case "vest":         return { torso: true, vest: true };
    case "coat":         return { coat: true };
    default:             return { torso: true };
  }
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

  castShadow(g, x, y + 13 * s, 7 * s, 13 * s);
  shadow(g, x, y + 13 * s, (10 + (p.build === "round" ? 2 : 0)) * s, 4.3 * s);

  if (pose === "sleeping") { drawSleeping(g, x, y, p, s); return; }

  g.save();
  g.translate(x, y);
  const flip = facing === 3 ? -1 : 1;
  g.scale(flip, 1);
  const face: Facing = facing === 3 ? 1 : facing;   // internal facing after mirror

  const hipLX = -hipHalf * 0.75, hipRX = hipHalf * 0.75;
  const shTopY = shoulderY + 1 * s;
  const shLX = -shHalf * 0.86, shRX = shHalf * 0.86;

  const L = poseLimbs(pose, phase, t, s, {
    hipLX, hipRX, footY, shLX, shRX, shTopY, armLen, shoulderY,
  });

  const skinM   = mat(p.skin);
  const hairM   = mat(p.hairColor);
  const browM   = mat(shade(p.hairColor, p.hair === "hat" ? -0.14 : -0.16));
  const torsoM  = mat(p.outfit.torso);
  const legsM   = mat(p.outfit.legs);
  const shoeM   = mat(p.outfit.shoes ?? "#4b3a26");
  const accentM = mat(p.outfit.accent ?? "#efe4cc");
  const sleeveM = mat(p.outfit.sleeve ?? p.outfit.torso);

  const rc: RC = {
    g, s, ux: L.ux, uy: L.uy,
    shoulderY, hipY, footY, headY, headR, shHalf, hipHalf, face, age,
    skin: skinM, hair: hairM, brow: browM, torso: torsoM, legs: legsM,
    shoe: shoeM, accent: accentM, eye: p.eyeColor ?? "#4a3520",
    hairStyle: p.hair, outfit: p.outfit, hatColor: p.hatColor,
  };

  const legW = 4.6 * s, armW = 3.9 * s;
  const plan = garmentPlan(p.outfit.style);
  const skirtLeg = plan.skirt && plan.skirt.frac > 0.75;   // long skirt darkens hidden legs
  const legTone = skirtLeg ? mat(shade(p.outfit.legs, -0.04)) : legsM;

  // ---- LEGS (behind everything) ----
  drawLeg(g, hipLX, hipY, L.lFoot, legW, legTone, shoeM, s);
  drawLeg(g, hipRX, hipY, L.rFoot, legW, legTone, shoeM, s);

  // ---- LOWER GARMENT (skirt or coat), over legs / under torso ----
  if (plan.coat) drawCoat(rc);
  else if (plan.skirt) drawSkirt(rc, plan.skirt);

  // ---- BACK ARM (behind torso) ----
  drawArm(g, shLX + L.ux, shTopY + L.uy, L.lHand, armW, sleeveM, skinM, s);

  // ---- TORSO ----
  if (plan.torso) drawTorso(rc);

  // ---- GARMENT ACCENTS (over torso, under front arm) ----
  if (plan.apron) drawApron(rc, plan);
  if (plan.belt)  drawBelt(rc);
  if (plan.bib)   drawBib(rc);
  if (plan.vest)  drawVest(rc);
  if (plan.shawl) drawShawl(rc);

  // lute sits across the chest, under the front (strumming) arm
  if (L.tool === "lute") drawLute(g, L.ux, shoulderY + L.uy, s);

  // ---- FRONT ARM (over torso) ----
  drawArm(g, shRX + L.ux, shTopY + L.uy, L.rHand, armW, sleeveM, skinM, s);

  if (L.tool === "rod") drawRod(g, L.rHand, t, s);
  if (L.tool === "hoe") drawHoe(g, L.rHand, L.lHand, s);
  if (L.tool === "basket") drawBasket(g, L.rHand, s);

  // ---- NECK + HEAD + HAIR + FACE ----
  drawNeck(rc);
  drawHeadHair(rc);

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
        rHand: [shRX + 7 * s, shoulderY + 2 * s],
        lHand: [shLX + 3.5 * s, shoulderY + 5.5 * s],
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
        rHand: [shRX + 5.5 * s, shTopY + armLen + 4 * s + rk * 1.2 * s],
        lHand: [shLX + 1 * s, shTopY + armLen],
        ux: 1.2 * s, uy: 3.6 * s, tool: "basket",
      };
    }
    case "busking": {
      const strum = Math.sin(t * 7.5);
      return {
        lFoot: [hipLX, footY], rFoot: [hipRX, footY],
        rHand: [shRX + 2.5 * s + strum * 2.2 * s, shoulderY + 7.5 * s],
        lHand: [shLX + 5.5 * s, shoulderY + 4 * s],
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

// ---- limb painters --------------------------------------------------------

function drawLeg(
  g: CanvasRenderingContext2D, rootX: number, rootY: number,
  foot: [number, number], w: number, legM: Mat, shoeM: Mat, s: number,
) {
  shadedCapsule(g, rootX, rootY, foot[0], foot[1] - 1.5 * s, w, legM);
  part(g, () => { ellp(g, foot[0], foot[1] - 0.5 * s, w * 0.66, w * 0.52); }, shoeM, () => {
    blob(g, foot[0] - w * 0.22, foot[1] - 1.1 * s, w * 0.42, w * 0.34, shoeM.hi, 0.8);
    blob(g, foot[0] + w * 0.24, foot[1] + 0.1 * s, w * 0.44, w * 0.32, shoeM.lo, 0.7);
  });
}

function drawArm(
  g: CanvasRenderingContext2D, rootX: number, rootY: number,
  hand: [number, number], w: number, sleeveM: Mat, skinM: Mat, s: number,
) {
  shadedCapsule(g, rootX, rootY, hand[0], hand[1], w, sleeveM);
  part(g, () => { ellp(g, hand[0], hand[1], w * 0.62, w * 0.62); }, skinM, () => {
    blob(g, hand[0] - w * 0.24, hand[1] - w * 0.2, w * 0.42, w * 0.42, skinM.hi, 0.8);
  });
}

// ---- torso + lower garment ------------------------------------------------

function drawTorso(rc: RC) {
  const { g, s, ux, uy, shoulderY, hipY, shHalf } = rc;
  const top = shoulderY + uy, waistY = hipY + uy;
  const H = waistY - top;
  const waistW = shHalf * 0.82;
  const torsoPath = () => {
    g.beginPath();
    g.moveTo(ux - shHalf, top + 1.5 * s);
    g.quadraticCurveTo(ux - shHalf - 0.4 * s, top, ux - shHalf * 0.7, top - 0.6 * s);
    g.lineTo(ux + shHalf * 0.7, top - 0.6 * s);
    g.quadraticCurveTo(ux + shHalf + 0.4 * s, top, ux + shHalf, top + 1.5 * s);
    g.lineTo(ux + waistW, waistY);
    g.quadraticCurveTo(ux, waistY + 2.2 * s, ux - waistW, waistY);
    g.closePath();
  };
  part(g, torsoPath, rc.torso, () => {
    blob(g, ux - shHalf * 0.42, top + H * 0.36, shHalf * 0.62, H * 0.5, rc.torso.hi, 0.85);
    blob(g, ux + shHalf * 0.52, top + H * 0.62, shHalf * 0.55, H * 0.5, rc.torso.lo, 0.7);
    blob(g, ux, waistY - 1.4 * s, shHalf * 1.3, 2.6 * s, rc.torso.lo2, 0.6);
    g.save(); g.globalAlpha = 0.5; g.strokeStyle = rc.torso.lo2; g.lineWidth = 0.8 * s;
    g.beginPath(); g.moveTo(ux - shHalf * 0.35, top + H * 0.2); g.lineTo(ux - shHalf * 0.28, waistY - 2 * s); g.stroke();
    g.beginPath(); g.moveTo(ux + shHalf * 0.36, top + H * 0.25); g.lineTo(ux + shHalf * 0.3, waistY - 2 * s); g.stroke();
    g.restore();
  });
}

function drawSkirt(rc: RC, sk: { frac: number; flare: number }) {
  const { g, s, ux, uy, hipY, footY, shHalf, outfit } = rc;
  const topY = hipY + uy - 0.5 * s;
  const botY = hipY + (footY - hipY) * sk.frac;
  const topW = shHalf * 0.82 + 0.6 * s, botW = shHalf * sk.flare;
  part(g, () => {
    g.beginPath();
    g.moveTo(ux - topW, topY);
    g.lineTo(ux + topW, topY);
    g.quadraticCurveTo(ux + botW + 1 * s, botY - 2 * s, ux + botW, botY);
    g.quadraticCurveTo(ux, botY + 1.8 * s, ux - botW, botY);       // scalloped hem
    g.quadraticCurveTo(ux - botW - 1 * s, botY - 2 * s, ux - topW, topY);
    g.closePath();
  }, rc.legs, () => {
    g.save(); g.globalAlpha = 0.55; g.strokeStyle = rc.legs.lo2; g.lineWidth = 1 * s;
    for (let i = -2; i <= 2; i++) {
      g.beginPath(); g.moveTo(ux + i * (topW * 0.4), topY + 1.5 * s); g.lineTo(ux + i * (botW * 0.4), botY - 1 * s); g.stroke();
    }
    g.restore();
    blob(g, ux - botW * 0.5, (topY + botY) / 2, botW * 0.5, (botY - topY) * 0.5, rc.legs.hi, 0.55);
    blob(g, ux + botW * 0.5, botY - 3 * s, botW * 0.6, (botY - topY) * 0.5, rc.legs.lo, 0.5);
    g.save(); g.globalAlpha = 0.6; g.strokeStyle = rc.legs.lo2; g.lineWidth = 1.1 * s;
    g.beginPath(); g.moveTo(ux - botW + 1 * s, botY - 0.6 * s); g.quadraticCurveTo(ux, botY + 1 * s, ux + botW - 1 * s, botY - 0.6 * s); g.stroke(); g.restore();
  });
  if (outfit.style === "tunic-skirt" && outfit.accent) {
    g.save(); g.strokeStyle = rc.accent.base; g.lineWidth = 1.1 * s;
    g.beginPath(); g.moveTo(ux - botW + 1.5 * s, botY - 2.2 * s); g.quadraticCurveTo(ux, botY - 0.8 * s, ux + botW - 1.5 * s, botY - 2.2 * s); g.stroke(); g.restore();
  }
}

function drawCoat(rc: RC) {
  const { g, s, ux, uy, shoulderY, hipY, footY, shHalf } = rc;
  const topY = shoulderY + uy - 0.6 * s;
  const waistY = hipY + uy;
  const botY = hipY + (footY - hipY) * 0.86;
  part(g, () => {
    g.beginPath();
    g.moveTo(ux - shHalf * 0.7, topY);
    g.lineTo(ux + shHalf * 0.7, topY);
    g.quadraticCurveTo(ux + shHalf + 0.5 * s, topY + 2 * s, ux + shHalf, waistY);
    g.lineTo(ux + shHalf * 1.15, botY);
    g.quadraticCurveTo(ux, botY + 1.8 * s, ux - shHalf * 1.15, botY);
    g.lineTo(ux - shHalf, waistY);
    g.quadraticCurveTo(ux - shHalf - 0.5 * s, topY + 2 * s, ux - shHalf * 0.7, topY);
    g.closePath();
  }, rc.torso, () => {
    blob(g, ux - shHalf * 0.5, waistY - 6 * s, shHalf * 0.6, 12 * s, rc.torso.hi, 0.7);
    blob(g, ux + shHalf * 0.6, botY - 8 * s, shHalf * 0.6, 14 * s, rc.torso.lo, 0.6);
  });
  // front seam + collar + buttons
  g.save(); g.strokeStyle = rc.accent.base; g.lineWidth = 1 * s;
  g.beginPath(); g.moveTo(ux, topY + 1 * s); g.lineTo(ux, botY - 1 * s); g.stroke(); g.restore();
  part(g, () => {
    g.beginPath();
    g.moveTo(ux - shHalf * 0.55, topY); g.lineTo(ux, topY + 3.6 * s); g.lineTo(ux + shHalf * 0.55, topY);
    g.lineTo(ux + shHalf * 0.32, topY - 0.4 * s); g.lineTo(ux, topY + 2.2 * s); g.lineTo(ux - shHalf * 0.32, topY - 0.4 * s);
    g.closePath();
  }, rc.accent);
  g.fillStyle = rc.accent.hi;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(ux, waistY - 4 * s + k * 4 * s, 0.7 * s, 0, TAU); g.fill(); }
}

// ---- garment accents ------------------------------------------------------

function drawApron(rc: RC, plan: Plan) {
  const { g, s, ux, uy, shoulderY, hipY, footY, shHalf } = rc;
  const topY = shoulderY + uy + 3.5 * s;
  const botY = (plan.skirt ? hipY + (footY - hipY) * plan.skirt.frac : hipY + 8 * s) - 4 * s;
  const wTop = shHalf * 0.44, wBot = shHalf * 0.66;
  part(g, () => {
    g.beginPath();
    g.moveTo(ux - wTop, topY); g.lineTo(ux + wTop, topY);
    g.lineTo(ux + wBot, botY - 2 * s);
    g.quadraticCurveTo(ux, botY + 0.8 * s, ux - wBot, botY - 2 * s);
    g.closePath();
  }, rc.accent, () => {
    blob(g, ux - wTop * 0.6, (topY + botY) / 2, wTop * 0.8, (botY - topY) * 0.42, rc.accent.hi, 0.6);
    blob(g, ux + wBot * 0.55, botY - 4 * s, wBot * 0.6, (botY - topY) * 0.4, rc.accent.lo, 0.55);
    blob(g, ux, hipY + uy - 0.5 * s, wBot * 1.1, 1.6 * s, rc.accent.lo2, 0.5);
    g.save(); g.globalAlpha = 0.5; g.strokeStyle = rc.accent.lo2; g.lineWidth = 0.7 * s;
    g.beginPath(); g.moveTo(ux - wBot * 0.7, botY - 6 * s); g.lineTo(ux + wBot * 0.7, botY - 6 * s); g.stroke(); g.restore();
  });
  // shoulder straps
  g.save(); g.lineCap = "round";
  [-1, 1].forEach((sn) => {
    g.strokeStyle = rc.accent.lo; g.lineWidth = 1.3 * s;
    g.beginPath(); g.moveTo(ux + sn * wTop * 0.7, topY + 0.3 * s); g.lineTo(ux + sn * shHalf * 0.5, shoulderY + uy - 1.2 * s); g.stroke();
    g.strokeStyle = rc.accent.hi; g.lineWidth = 0.6 * s;
    g.beginPath(); g.moveTo(ux + sn * wTop * 0.7, topY + 0.3 * s); g.lineTo(ux + sn * shHalf * 0.5, shoulderY + uy - 1.2 * s); g.stroke();
  });
  g.restore();
}

function drawBelt(rc: RC) {
  const { g, s, ux, uy, hipY, shHalf, outfit } = rc;
  const waistY = hipY + uy;
  const waistW = shHalf * 0.82;
  part(g, () => { roundR(g, ux - waistW - 0.4 * s, waistY - 2 * s, (waistW + 0.4 * s) * 2, 3 * s, 0.8 * s); },
    rc.accent, () => { blob(g, ux, waistY - 0.6 * s, waistW, 0.9 * s, rc.accent.hi, 0.7); });
  const buckle = mat(shade(outfit.accent ?? "#caa24a", -0.12));
  part(g, () => { roundR(g, ux - 1.6 * s, waistY - 1.6 * s, 3.2 * s, 2.4 * s, 0.6 * s); }, buckle);
}

function drawBib(rc: RC) {
  const { g, s, ux, uy, shoulderY, hipY, shHalf } = rc;
  const topY = shoulderY + uy + 3.5 * s, waistY = hipY + uy;
  part(g, () => { roundR(g, ux - shHalf * 0.55, topY, shHalf * 1.1, waistY - topY + 0.5 * s, 1.4 * s); },
    rc.legs, () => {
      blob(g, ux - shHalf * 0.25, topY + 3 * s, shHalf * 0.4, 6 * s, rc.legs.hi, 0.6);
      blob(g, ux + shHalf * 0.3, waistY - 4 * s, shHalf * 0.4, 6 * s, rc.legs.lo, 0.6);
    });
  g.save(); g.strokeStyle = rc.legs.lo; g.lineWidth = 1.8 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(ux - shHalf * 0.42, topY + 0.5 * s); g.lineTo(ux - shHalf * 0.66, shoulderY + uy - 2 * s); g.stroke();
  g.beginPath(); g.moveTo(ux + shHalf * 0.42, topY + 0.5 * s); g.lineTo(ux + shHalf * 0.66, shoulderY + uy - 2 * s); g.stroke();
  g.strokeStyle = rc.accent.hi; g.lineWidth = 1 * s;
  g.beginPath(); g.moveTo(ux - shHalf * 0.42, topY + 0.5 * s); g.lineTo(ux - shHalf * 0.64, shoulderY + uy - 2 * s); g.stroke();
  g.beginPath(); g.moveTo(ux + shHalf * 0.42, topY + 0.5 * s); g.lineTo(ux + shHalf * 0.64, shoulderY + uy - 2 * s); g.stroke();
  g.restore();
  g.fillStyle = rc.accent.hi;
  g.beginPath(); g.arc(ux - shHalf * 0.36, topY + 1.4 * s, 0.8 * s, 0, TAU); g.fill();
  g.beginPath(); g.arc(ux + shHalf * 0.36, topY + 1.4 * s, 0.8 * s, 0, TAU); g.fill();
}

function drawVest(rc: RC) {
  const { g, s, ux, uy, shoulderY, hipY, shHalf } = rc;
  const top = shoulderY + uy, waistY = hipY + uy;
  const waistW = shHalf * 0.82;
  part(g, () => {
    g.beginPath();
    g.moveTo(ux - shHalf * 0.9, top - 0.4 * s);
    g.lineTo(ux - shHalf * 0.28, top + 2 * s);
    g.lineTo(ux, waistY - 1 * s); g.lineTo(ux + shHalf * 0.28, top + 2 * s);
    g.lineTo(ux + shHalf * 0.9, top - 0.4 * s);
    g.lineTo(ux + waistW * 0.95, waistY);
    g.quadraticCurveTo(ux, waistY + 1.6 * s, ux - waistW * 0.95, waistY);
    g.closePath();
  }, rc.accent, () => {
    blob(g, ux - shHalf * 0.4, top + 6 * s, shHalf * 0.5, 7 * s, rc.accent.hi, 0.6);
    blob(g, ux + shHalf * 0.5, waistY - 4 * s, shHalf * 0.4, 7 * s, rc.accent.lo, 0.6);
  });
  g.fillStyle = rc.accent.hi;
  for (let k = 0; k < 2; k++) { g.beginPath(); g.arc(ux, top + 5 * s + k * 4 * s, 0.7 * s, 0, TAU); g.fill(); }
}

function drawShawl(rc: RC) {
  const { g, s, ux, uy, shoulderY, shHalf } = rc;
  const topY = shoulderY + uy - 0.6 * s;
  part(g, () => {
    g.beginPath();
    g.moveTo(ux - shHalf * 1.02, topY + 1.5 * s);
    g.quadraticCurveTo(ux, shoulderY + uy + 9 * s, ux + shHalf * 1.02, topY + 1.5 * s);
    g.quadraticCurveTo(ux, shoulderY + uy + 4.5 * s, ux - shHalf * 1.02, topY + 1.5 * s);
    g.closePath();
  }, rc.accent, () => {
    blob(g, ux, shoulderY + uy + 3 * s, shHalf * 0.7, 3.5 * s, rc.accent.hi, 0.55);
    blob(g, ux, shoulderY + uy + 6.5 * s, shHalf * 0.9, 2.4 * s, rc.accent.lo2, 0.6);
  });
  part(g, () => { ellp(g, ux, shoulderY + uy + 6.8 * s, 1.7 * s, 1.7 * s); }, rc.accent);
}

// ---- neck / head / hair / face -------------------------------------------

function drawNeck(rc: RC) {
  const { g, s, ux, uy, shoulderY, headY, headR } = rc;
  const top = headY + headR * 0.45, bot = shoulderY + uy + 1 * s;
  part(g, () => { roundR(g, ux - headR * 0.34, top, headR * 0.68, Math.max(2 * s, bot - top), 1.4 * s); },
    rc.skin, () => { blob(g, ux, bot - 1.2 * s, headR * 0.6, 1.8 * s, rc.skin.lo2, 0.6); });
}

function drawHeadHair(rc: RC) {
  const { g, ux, uy, headY, headR, face, hairStyle } = rc;
  const cx = ux, cy = headY + uy;

  drawHairBack(rc, cx, cy);

  // head skin
  part(g, () => { g.beginPath(); g.arc(cx, cy, headR, 0, TAU); }, rc.skin, () => {
    blob(g, cx - headR * 0.4, cy - headR * 0.1, headR * 0.6, headR * 0.55, rc.skin.hi, 0.7);
    blob(g, cx + headR * 0.45, cy + headR * 0.2, headR * 0.55, headR * 0.55, rc.skin.lo, 0.6);
    blob(g, cx, cy - headR * 0.7, headR * 0.95, headR * 0.4, rc.skin.lo2, 0.55);
    blob(g, cx, cy + headR * 0.78, headR * 0.7, headR * 0.28, rc.skin.lo, 0.5);
  });

  if (face !== 0) drawFace(rc, cx, cy);
  drawHairFront(rc, cx, cy);
  if (hairStyle === "hat") drawHat(rc, cx, cy);
}

function drawHairBack(rc: RC, cx: number, cy: number) {
  const { g, s, headR, hairStyle, hair } = rc;
  if (hairStyle === "bald" || hairStyle === "hat") return;

  // main volumetric mass behind the head (shows as hairline rim + crown)
  part(g, () => { ellp(g, cx, cy - headR * 0.15, headR + 1.3 * s, headR + 1.4 * s); }, hair, () => {
    blob(g, cx - headR * 0.4, cy - headR * 0.5, headR * 0.7, headR * 0.6, hair.hi2, 0.9);
    blob(g, cx + headR * 0.5, cy + headR * 0.2, headR * 0.7, headR * 0.7, hair.lo2, 0.7);
  });

  if (hairStyle === "ponytail") {
    drawPonytail(rc, cx, cy);
  } else if (hairStyle === "long") {
    part(g, () => {
      g.beginPath();
      g.moveTo(cx - headR * 1.12, cy);
      g.quadraticCurveTo(cx - headR * 1.45, cy + headR * 2.3, cx - headR * 0.68, cy + headR * 2.8);
      g.quadraticCurveTo(cx, cy + headR * 2.3, cx + headR * 0.68, cy + headR * 2.8);
      g.quadraticCurveTo(cx + headR * 1.45, cy + headR * 2.3, cx + headR * 1.12, cy);
      g.quadraticCurveTo(cx, cy + headR * 0.9, cx - headR * 1.12, cy); g.closePath();
    }, hair, () => {
      blob(g, cx - headR * 0.5, cy + headR * 1.2, headR * 0.35, headR * 1.3, hair.hi2, 0.6);
      blob(g, cx + headR * 0.7, cy + headR * 1.6, headR * 0.5, headR * 1.1, hair.lo2, 0.6);
      g.save(); g.globalAlpha = 0.6; g.strokeStyle = hair.hi; g.lineWidth = 0.7 * s;
      g.beginPath(); g.moveTo(cx - headR * 0.6, cy + headR * 0.4); g.lineTo(cx - headR * 0.75, cy + headR * 2.2); g.stroke();
      g.beginPath(); g.moveTo(cx + headR * 0.2, cy + headR * 0.5); g.lineTo(cx + headR * 0.35, cy + headR * 2.2); g.stroke();
      g.restore();
    });
  }
}

/**
 * A single clean pulled-back tail, drawn in the hair-BACK pass so the head/body
 * always occludes its root — reading as gathered-and-pulled-back, never as a
 * pair of ear-like side masses. Reads correctly per facing:
 *   - front (2): the tail hangs down the back (hidden by the body), so only a
 *     small tuft peeks past one side of the neck to signal "there's a tail".
 *   - profile (1): a full tail sweeps behind the skull (toward -x, the back).
 *   - back (0): a full tail hangs straight down the centre, fully visible.
 */
function drawPonytail(rc: RC, cx: number, cy: number) {
  const { g, headR, hair, face } = rc;
  const t = face === 1
    ? { x: cx - headR * 0.95, y: cy + headR * 0.72, rx: headR * 0.4, ry: headR * 1.12, rot: -0.26 }
    : face === 0
    ? { x: cx, y: cy + headR * 0.92, rx: headR * 0.44, ry: headR * 1.35, rot: 0 }
    : { x: cx - headR * 0.78, y: cy + headR * 0.62, rx: headR * 0.3, ry: headR * 0.72, rot: -0.18 };
  part(g, () => { ellp(g, t.x, t.y, t.rx, t.ry, t.rot); }, hair, () => {
    blob(g, t.x - headR * 0.14, t.y - headR * 0.42, headR * 0.22, headR * 0.66, hair.hi2, 0.7);
    blob(g, t.x + headR * 0.16, t.y + headR * 0.5, headR * 0.24, headR * 0.58, hair.lo2, 0.65);
  });
}

function drawHairFront(rc: RC, cx: number, cy: number) {
  const { g, s, headR, hairStyle, hair, face } = rc;
  if (hairStyle === "hat") return;

  if (hairStyle === "bald") {
    if (face !== 0) {
      g.save(); g.strokeStyle = hair.lo; g.lineWidth = 1 * s; g.globalAlpha = 0.7;
      g.beginPath(); g.arc(cx, cy + headR * 0.15, headR + 0.4 * s, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.restore();
    }
    return;
  }

  // BACK view — a full hair cap covers the skull (no face was drawn)
  if (face === 0) {
    part(g, () => { g.beginPath(); g.arc(cx, cy + headR * 0.05, headR + 0.6 * s, 0, TAU); }, hair, () => {
      blob(g, cx - headR * 0.35, cy - headR * 0.4, headR * 0.75, headR * 0.6, hair.hi2, 0.75);
      blob(g, cx + headR * 0.45, cy + headR * 0.35, headR * 0.7, headR * 0.7, hair.lo2, 0.7);
      g.save(); g.globalAlpha = 0.5; g.strokeStyle = hair.lo2; g.lineWidth = 0.7 * s;
      g.beginPath(); g.moveTo(cx, cy - headR * 0.9); g.lineTo(cx, cy + headR * 0.9); g.stroke();  // centre part
      g.restore();
    });
    if (hairStyle === "bun") {
      part(g, () => { g.beginPath(); g.arc(cx, cy - headR * 1.05, headR * 0.5, 0, TAU); }, hair, () => {
        blob(g, cx - headR * 0.15, cy - headR * 1.18, headR * 0.24, headR * 0.24, hair.hi2, 0.8);
      });
    }
    return;
  }

  const profile = face === 1;
  const browY = cy - headR * 0.30;

  // fringe / bangs across the forehead
  if (profile) {
    // side-swept fringe: mass over the top, a forelock toward the face (+x)
    part(g, () => {
      g.beginPath();
      g.moveTo(cx - headR * 1.0, cy - headR * 0.35);
      g.quadraticCurveTo(cx - headR * 0.5, cy - headR * 1.08, cx + headR * 0.35, cy - headR * 1.0);
      g.quadraticCurveTo(cx + headR * 0.95, cy - headR * 0.85, cx + headR * 0.98, cy - headR * 0.1);
      g.quadraticCurveTo(cx + headR * 0.7, browY + 1 * s, cx + headR * 0.5, browY - 0.4 * s);
      g.quadraticCurveTo(cx + headR * 0.2, browY - 1.2 * s, cx - headR * 0.2, cy - headR * 0.55);
      g.quadraticCurveTo(cx - headR * 0.7, cy - headR * 0.3, cx - headR * 1.0, cy - headR * 0.35);
      g.closePath();
    }, hair, () => {
      blob(g, cx - headR * 0.2, cy - headR * 0.78, headR * 0.55, headR * 0.35, hair.hi2, 0.8);
    });
  } else {
    part(g, () => {
      g.beginPath();
      g.moveTo(cx - headR * 0.92, cy - headR * 0.62);
      g.quadraticCurveTo(cx - headR * 0.5, cy - headR * 1.05, cx, cy - headR * 1.02);
      g.quadraticCurveTo(cx + headR * 0.5, cy - headR * 1.05, cx + headR * 0.92, cy - headR * 0.62);
      g.quadraticCurveTo(cx + headR * 0.72, browY + 1.2 * s, cx + headR * 0.45, browY - 0.4 * s);
      g.quadraticCurveTo(cx + headR * 0.28, browY + 1.6 * s, cx + headR * 0.06, browY - 0.2 * s);
      g.quadraticCurveTo(cx - headR * 0.14, browY + 1.7 * s, cx - headR * 0.34, browY - 0.3 * s);
      g.quadraticCurveTo(cx - headR * 0.55, browY + 1.4 * s, cx - headR * 0.72, browY - 0.6 * s);
      g.quadraticCurveTo(cx - headR * 0.88, cy - headR * 0.5, cx - headR * 0.92, cy - headR * 0.62);
      g.closePath();
    }, hair, () => {
      blob(g, cx - headR * 0.35, cy - headR * 0.78, headR * 0.5, headR * 0.35, hair.hi2, 0.85);
      g.save(); g.globalAlpha = 0.7; g.strokeStyle = hair.hi; g.lineWidth = 0.7 * s;
      g.beginPath(); g.moveTo(cx - headR * 0.5, cy - headR * 0.95); g.lineTo(cx - headR * 0.2, browY); g.stroke();
      g.beginPath(); g.moveTo(cx + headR * 0.15, cy - headR * 0.98); g.lineTo(cx + headR * 0.35, browY); g.stroke();
      g.strokeStyle = hair.lo2; g.globalAlpha = 0.5;
      g.beginPath(); g.moveTo(cx, cy - headR * 1.0); g.lineTo(cx - headR * 0.02, browY); g.stroke();
      g.restore();
    });
  }

  // side locks framing the cheeks (front-view LONG hair only — a ponytail is
  // pulled back, so it gets no cheek locks: that kept it reading as ears)
  if (!profile && hairStyle === "long") {
    [-1, 1].forEach((sn) => {
      part(g, () => {
        g.beginPath();
        g.moveTo(cx + sn * headR * 0.86, cy - headR * 0.5);
        g.quadraticCurveTo(cx + sn * headR * 1.06, cy + headR * 0.5, cx + sn * headR * 0.7, cy + headR * 1.5);
        g.quadraticCurveTo(cx + sn * headR * 0.45, cy + headR * 0.4, cx + sn * headR * 0.62, cy - headR * 0.4);
        g.closePath();
      }, hair, () => {
        g.save(); g.globalAlpha = 0.6; g.strokeStyle = hair.hi; g.lineWidth = 0.7 * s;
        g.beginPath(); g.moveTo(cx + sn * headR * 0.78, cy - headR * 0.2); g.lineTo(cx + sn * headR * 0.66, cy + headR * 0.8); g.stroke(); g.restore();
      });
    });
  }

  // bun on the crown
  if (hairStyle === "bun") {
    part(g, () => { g.beginPath(); g.arc(cx, cy - headR * 1.18, headR * 0.5, 0, TAU); }, hair, () => {
      blob(g, cx - headR * 0.15, cy - headR * 1.3, headR * 0.24, headR * 0.24, hair.hi2, 0.85);
      blob(g, cx + headR * 0.18, cy - headR * 1.05, headR * 0.24, headR * 0.24, hair.lo2, 0.7);
    });
    g.save(); g.strokeStyle = hair.lo; g.lineWidth = 0.8 * s; g.globalAlpha = 0.7;
    g.beginPath(); g.arc(cx, cy - headR * 0.92, headR * 0.2, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.restore();
  }

}

function drawFace(rc: RC, cx: number, cy: number) {
  const { g, s, headR, brow, eye, face, age } = rc;
  const eyeY = cy + headR * 0.10;
  const sRx = headR * 0.205, sRy = headR * 0.255;
  const iris = mat(eye);
  const profile = face === 1;

  // --- profile: a soft nose bump on the facing (+x) silhouette so the head
  //     reads dimensional. Filled skin extending past the head circle, then
  //     ONLY the outer contour stroked (no seam across the cheek). ---
  if (profile) {
    const nbY = eyeY + headR * 0.26;
    const bridge: [number, number] = [cx + headR * 0.86, nbY - headR * 0.24];
    const tip: [number, number]    = [cx + headR * 1.17, nbY + headR * 0.12];
    const under: [number, number]  = [cx + headR * 0.82, nbY + headR * 0.34];
    g.save();
    g.beginPath();
    g.moveTo(bridge[0], bridge[1]);
    g.quadraticCurveTo(cx + headR * 1.2, nbY - headR * 0.06, tip[0], tip[1]);
    g.quadraticCurveTo(cx + headR * 1.02, nbY + headR * 0.3, under[0], under[1]);
    g.closePath();
    g.fillStyle = rc.skin.base; g.fill();
    g.globalAlpha = 0.5; blob(g, cx + headR * 0.96, nbY + headR * 0.16, headR * 0.2, headR * 0.16, rc.skin.lo, 1);
    g.restore();
    g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W; g.lineCap = "round";
    g.beginPath();
    g.moveTo(bridge[0], bridge[1]);
    g.quadraticCurveTo(cx + headR * 1.2, nbY - headR * 0.06, tip[0], tip[1]);
    g.quadraticCurveTo(cx + headR * 1.02, nbY + headR * 0.3, under[0], under[1]);
    g.stroke();
  }

  // one eye per drawn slot; profile shows only the near (front) eye, enlarged
  const drawEye = (ex: number, k: number) => {
    const rx = sRx * k, ry = sRy * k;
    g.fillStyle = "#fbf6ee"; g.beginPath(); g.ellipse(ex, eyeY, rx, ry, 0, 0, TAU); g.fill();
    const iy = eyeY + headR * 0.045, ir = headR * 0.155 * k;
    g.fillStyle = iris.base; g.beginPath(); g.arc(ex, iy, ir, 0, TAU); g.fill();
    g.fillStyle = iris.lo2; g.beginPath(); g.arc(ex, iy + ir * 0.35, ir, Math.PI * 0.1, Math.PI * 0.9); g.fill();
    g.fillStyle = "#241a1a"; g.beginPath(); g.arc(ex, iy, headR * 0.078 * k, 0, TAU); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ex - headR * 0.06, iy - headR * 0.07, headR * 0.05 * k, 0, TAU); g.fill();
    g.strokeStyle = "#2a1c18"; g.lineWidth = 1 * s; g.lineCap = "round";
    g.beginPath(); g.ellipse(ex, eyeY, rx + 0.2 * s, ry + 0.2 * s, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.strokeStyle = brow.base; g.lineWidth = 1.2 * s;
    g.beginPath();
    g.moveTo(ex - rx * 1.05, eyeY - headR * 0.33);
    g.quadraticCurveTo(ex, eyeY - headR * 0.46, ex + rx * 1.05, eyeY - headR * 0.30);
    g.stroke();
  };

  if (profile) {
    drawEye(cx + headR * 0.42, 1.08);   // only the near eye
  } else {
    drawEye(cx - headR * 0.40, 1);
    drawEye(cx + headR * 0.40, 1);
  }

  // nose — a soft shadow tick (front only; profile uses the silhouette bump)
  if (!profile) {
    g.save(); g.globalAlpha = 0.55; g.strokeStyle = rc.skin.lo2; g.lineWidth = 1 * s; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx - 0.2 * s, eyeY + headR * 0.24); g.lineTo(cx + 0.3 * s, eyeY + headR * 0.42); g.stroke(); g.restore();
  } else {
    // a short nostril shadow tucked under the nose tip
    g.save(); g.globalAlpha = 0.5; g.strokeStyle = rc.skin.lo2; g.lineWidth = 1 * s; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx + headR * 0.78, eyeY + headR * 0.5); g.lineTo(cx + headR * 0.9, eyeY + headR * 0.52); g.stroke(); g.restore();
  }

  // mouth — nudged toward the facing edge in profile
  const mcx = profile ? cx + headR * 0.34 : cx;
  const mw = headR * (profile ? 0.2 : 0.34);
  g.strokeStyle = "#a9553f"; g.lineWidth = 1.1 * s; g.lineCap = "round";
  const my = eyeY + headR * 0.62;
  g.beginPath();
  g.moveTo(mcx - mw, my);
  g.quadraticCurveTo(mcx, my + (age === "elder" ? headR * 0.16 : headR * 0.14), mcx + mw, my);
  g.stroke();

  // blush
  g.save(); g.fillStyle = "rgba(226,132,120,.28)";
  if (profile) {
    g.beginPath(); g.ellipse(cx + headR * 0.38, eyeY + headR * 0.4, headR * 0.2, headR * 0.12, 0, 0, TAU); g.fill();
  } else {
    g.beginPath(); g.ellipse(cx - headR * 0.55, eyeY + headR * 0.4, headR * 0.22, headR * 0.13, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(cx + headR * 0.55, eyeY + headR * 0.4, headR * 0.22, headR * 0.13, 0, 0, TAU); g.fill();
  }
  g.restore();

  if (age === "elder") {
    g.save(); g.globalAlpha = 0.4; g.strokeStyle = rc.skin.lo2; g.lineWidth = 0.7 * s;
    g.beginPath(); g.moveTo(cx - headR * 0.62, eyeY + headR * 0.55); g.lineTo(cx - headR * 0.5, eyeY + headR * 0.68); g.stroke();
    g.beginPath(); g.moveTo(cx + headR * 0.62, eyeY + headR * 0.55); g.lineTo(cx + headR * 0.5, eyeY + headR * 0.68); g.stroke();
    g.restore();
  }
}

function drawHat(rc: RC, cx: number, cy: number) {
  const { g, headR, outfit } = rc;
  const straw = mat(rc.hatColor ?? "#e0be5c");
  // brim
  part(g, () => { ellp(g, cx, cy - headR * 0.5, headR * 1.6, headR * 0.55); }, straw, () => {
    blob(g, cx, cy - headR * 0.35, headR * 1.5, headR * 0.4, straw.lo, 0.6);
  });
  // crown
  part(g, () => { ellp(g, cx, cy - headR * 1.05, headR * 0.92, headR * 0.68); }, straw, () => {
    blob(g, cx - headR * 0.3, cy - headR * 1.25, headR * 0.4, headR * 0.28, straw.hi2, 0.7);
  });
  // band
  g.save(); g.fillStyle = mat(outfit.accent ?? "#b5462f").base;
  g.beginPath(); g.ellipse(cx, cy - headR * 0.78, headR * 0.9, headR * 0.24, 0, 0, Math.PI); g.fill();
  g.fillRect(cx - headR * 0.9, cy - headR * 0.86, headR * 1.8, headR * 0.2); g.restore();
}

// ---- held tools -----------------------------------------------------------

/** The fishing rod (also reused as a sprite-path prop overlay for Finn at the
 *  dock — art/spriteNpc.ts). `hand` is a world point; tip angles up-and-out. */
export function drawRod(g: CanvasRenderingContext2D, hand: [number, number], t: number, s: number) {
  const [hx, hy] = hand;
  const tipX = hx + 15 * s, tipY = hy - 15 * s;
  g.strokeStyle = "#6b4a2b"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(hx - 4 * s, hy + 4 * s); g.lineTo(tipX, tipY); g.stroke();
  g.strokeStyle = "rgba(240,240,240,.85)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX + 4 * s, hy + 12 * s + Math.sin(t * 5) * 2); g.stroke();
}

/** The hoe (also reused as a sprite-path prop overlay for the player — see
 *  art/spriteChar.ts). Handle runs from the upper (lHand) to the lower (rHand)
 *  grip; the blade sits at the lower end. */
export function drawHoe(g: CanvasRenderingContext2D, rHand: [number, number], lHand: [number, number], s: number) {
  const [hx, hy] = rHand;
  const topX = lHand[0] - 4 * s, topY = lHand[1] - 12 * s;
  const botX = hx + 6 * s, botY = hy + 12 * s;
  g.strokeStyle = "#7a5330"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(topX, topY); g.lineTo(botX, botY); g.stroke();
  g.fillStyle = "#9aa0a6";
  g.save(); g.translate(botX, botY); g.rotate(0.5);
  roundR(g, 0, -1.5 * s, 7 * s, 3.5 * s, 1 * s); g.fill(); outline(g);
  g.restore();
}

/** The lute (also reused as a sprite-path prop overlay for the player — see
 *  art/spriteChar.ts). Body sits at (ux, chestY) with the neck up toward the
 *  facing shoulder. */
export function drawLute(g: CanvasRenderingContext2D, ux: number, chestY: number, s: number) {
  g.save(); g.translate(ux + 3.5 * s, chestY + 7 * s); g.rotate(0.55);
  g.strokeStyle = "#7a4e20"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(1 * s, -1 * s); g.lineTo(13 * s, -9 * s); g.stroke();
  g.fillStyle = "#b9802f";
  g.beginPath(); g.ellipse(0, 0, 6.4 * s, 4.9 * s, 0, 0, TAU); g.fill(); outline(g);
  g.fillStyle = "#2a1c10"; g.beginPath(); g.arc(1 * s, -0.3 * s, 1.5 * s, 0, TAU); g.fill();
  g.strokeStyle = "rgba(40,20,8,.5)"; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(4 * s, 3 * s); g.lineTo(7 * s, -5 * s); g.stroke();
  g.restore();
}

/** The foraging basket (also reused as a sprite-path prop overlay for the
 *  player — see art/spriteChar.ts). Drawn at the given hand/hip anchor. */
export function drawBasket(g: CanvasRenderingContext2D, hand: [number, number], s: number) {
  const [hx, hy] = hand;
  g.fillStyle = "#b98a4e";
  roundR(g, hx - 4 * s, hy - 1 * s, 8 * s, 5 * s, 1.5 * s); g.fill(); outline(g);
  g.strokeStyle = "#8a6636"; g.lineWidth = 1.4 * s;
  g.beginPath(); g.arc(hx, hy - 1 * s, 4 * s, Math.PI, TAU); g.stroke();
}

function drawSleeping(g: CanvasRenderingContext2D, x: number, y: number, p: RigParams, s: number) {
  g.save(); g.translate(x, y + 6 * s);
  capsule(g, -4 * s, 0, 13 * s, 0, 10 * s, p.outfit.legs);
  capsule(g, -6 * s, -1 * s, 4 * s, -1 * s, 9 * s, p.outfit.torso);
  g.fillStyle = p.skin;
  g.beginPath(); g.arc(-9 * s, -1 * s, 6 * s, 0, TAU); g.fill(); outline(g);
  g.strokeStyle = "#2a2a30"; g.lineWidth = 1.2 * s;
  g.beginPath(); g.moveTo(-11 * s, -1.5 * s); g.lineTo(-8.5 * s, -1.5 * s); g.stroke();
  g.restore();
}
