/**
 * Segmented rigs for four-legged and bird animals — the animal counterpart to
 * rig.ts. Same shared OUTLINE + elliptical drop shadow, same distance-keyed
 * walk cycle (phase = dist / stride). Cow and hen are built now; the Part-C
 * animals (pig, sheep, duck, cat, dog, rabbit) are meant to be parameter
 * variants of these two rigs plus tiny overrides — never a new engine.
 *
 * Pure art constants live here; movement speeds live in config.ts.
 */
import { roundR, outline, shadow } from "./shapes";

const TAU = Math.PI * 2;

// px of travel per full leg cycle for the two rigs (animation cadence only)
export const QUAD_STRIDE = 26;
export const BIRD_STRIDE = 14;

export type EarStyle = "cow" | "floppy" | "pointy" | "none";
export type TailStyle = "tuft" | "curly" | "none";

export interface QuadrupedParams {
  scale: number;
  bodyColor: string;
  bodyW: number;          // half-width of the torso in px (before scale)
  bodyH: number;          // half-height of the torso
  legColor: string;
  legLen: number;
  headColor: string;
  snout?: string;         // muzzle patch color (nose/mouth area)
  spots?: string;         // optional body blotches
  ears: EarStyle;
  horns?: boolean;
  antlers?: boolean;      // branching antlers instead of horn nubs (deer bucks)
  tail: TailStyle;
  tailColor?: string;
  eye?: string;
}

export interface BirdParams {
  scale: number;
  bodyColor: string;
  bodyR: number;          // body radius in px (before scale)
  wingColor: string;
  comb?: string;          // rooster/hen comb color (omit for ducks etc.)
  beak: string;
  legColor: string;
  eye: string;
}

function capsule(
  g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, w: number, fill: string,
) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 0.001;
  g.save(); g.translate(ax, ay); g.rotate(Math.atan2(dy, dx));
  g.fillStyle = fill;
  roundR(g, 0, -w / 2, len, w, Math.min(w / 2, len / 2)); g.fill(); outline(g);
  g.restore();
}

/**
 * Four-legged animal. `flip` mirrors left/right (matches the cow's own flag),
 * `phase` drives the leg walk cycle, `moving` gates it, `t` drives idle life
 * (head bob while grazing + tail flick).
 */
export function drawQuadruped(
  g: CanvasRenderingContext2D,
  x: number, y: number, flip: boolean,
  p: QuadrupedParams, phase: number, moving: boolean, t: number,
) {
  const s = p.scale;
  const bw = p.bodyW * s, bh = p.bodyH * s, legLen = p.legLen * s;
  const bellyY = bh * 0.7;                 // where legs attach under the body
  const groundY = bellyY + legLen;

  shadow(g, x, y + groundY, bw * 1.05, bh * 0.45);

  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);

  // ---- legs: diagonal (trot) gait, small foot swing; idle = planted ----
  const w = moving ? Math.sin(phase * TAU) : 0;
  const sw = 2.4 * s;
  const legW = Math.max(3 * s, bw * 0.16);
  const legXs = [-bw * 0.62, -bw * 0.24, bw * 0.28, bw * 0.66];
  const gait = [w, -w, -w, w];             // FL,BL / FR,BR alternate
  for (let i = 0; i < 4; i++) {
    const rx = legXs[i]!;
    capsule(g, rx, bellyY - 1 * s, rx + gait[i]! * sw, groundY, legW, p.legColor);
  }

  // ---- tail (behind body): idle flick ----
  if (p.tail !== "none") {
    const flick = Math.sin(t * 2.5) * 0.35;
    const tcol = p.tailColor ?? p.legColor;
    const tx = -bw, ty = -bh * 0.2;
    if (p.tail === "curly") {
      g.strokeStyle = tcol; g.lineWidth = 2.4 * s; g.lineCap = "round";
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx - 5 * s, ty + 2 * s, tx - 3 * s, ty + 5 * s); g.stroke();
    } else {
      g.save(); g.translate(tx, ty); g.rotate(flick);
      capsule(g, 0, 0, -1.5 * s, 8 * s, 2.6 * s, tcol);
      g.fillStyle = p.snout ?? tcol; g.beginPath(); g.arc(-1.5 * s, 8 * s, 2.4 * s, 0, TAU); g.fill(); outline(g);
      g.restore();
    }
  }

  // ---- body ----
  const bob = moving ? -Math.abs(Math.sin(phase * TAU)) * 1 * s : Math.sin(t * 3 + x) * 0.6 * s;
  g.save(); g.translate(0, bob);
  g.fillStyle = p.bodyColor;
  roundR(g, -bw, -bh, bw * 2, bh * 2, bh * 0.9); g.fill(); outline(g);
  if (p.spots) {
    g.fillStyle = p.spots;
    g.beginPath(); g.ellipse(-bw * 0.35, -bh * 0.15, bw * 0.4, bh * 0.5, 0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(bw * 0.45, bh * 0.15, bw * 0.3, bh * 0.42, -0.4, 0, TAU); g.fill();
  }
  g.restore();

  // ---- head at the front (right side), gentle graze bob ----
  const grazeY = (moving ? 0 : Math.sin(t * 2 + 1) * 1.2 * s);
  const hx = bw * 0.86, hy = -bh * 0.55 + grazeY;
  const hr = bh * 0.72;

  // ears
  if (p.ears === "cow") {
    g.fillStyle = p.headColor;
    g.beginPath(); g.ellipse(hx - hr * 0.7, hy - hr * 0.4, hr * 0.5, hr * 0.3, -0.5, 0, TAU); g.fill(); outline(g);
    g.beginPath(); g.ellipse(hx + hr * 0.7, hy - hr * 0.4, hr * 0.5, hr * 0.3, 0.5, 0, TAU); g.fill(); outline(g);
  } else if (p.ears === "floppy") {
    g.fillStyle = p.headColor;
    g.beginPath(); g.ellipse(hx - hr * 0.5, hy + hr * 0.2, hr * 0.35, hr * 0.7, 0.2, 0, TAU); g.fill(); outline(g);
  } else if (p.ears === "pointy") {
    g.fillStyle = p.headColor;
    g.beginPath(); g.moveTo(hx - hr * 0.6, hy - hr * 0.6); g.lineTo(hx - hr * 0.2, hy - hr * 1.2); g.lineTo(hx, hy - hr * 0.5); g.closePath(); g.fill(); outline(g);
    g.beginPath(); g.moveTo(hx + hr * 0.6, hy - hr * 0.6); g.lineTo(hx + hr * 0.2, hy - hr * 1.2); g.lineTo(hx, hy - hr * 0.5); g.closePath(); g.fill(); outline(g);
  }
  if (p.horns) {
    g.fillStyle = "#e6dcc4";
    g.beginPath(); g.arc(hx - hr * 0.55, hy - hr * 0.7, hr * 0.28, 0, TAU); g.fill(); outline(g);
    g.beginPath(); g.arc(hx + hr * 0.55, hy - hr * 0.7, hr * 0.28, 0, TAU); g.fill(); outline(g);
  }
  if (p.antlers) {
    // a simple branching main-beam + one tine per side (deer bucks only)
    g.strokeStyle = "#c9b48a"; g.lineWidth = 1.6 * s; g.lineCap = "round";
    for (const side of [-1, 1] as const) {
      const bx = hx + side * hr * 0.5, by = hy - hr * 0.7;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + side * hr * 0.3, by - hr * 1.15);
      g.moveTo(bx + side * hr * 0.12, by - hr * 0.55);
      g.lineTo(bx + side * hr * 0.55, by - hr * 0.78);
      g.stroke();
    }
  }

  g.fillStyle = p.headColor;
  roundR(g, hx - hr, hy - hr, hr * 2, hr * 2, hr * 0.7); g.fill(); outline(g);
  if (p.snout) {
    g.fillStyle = p.snout;
    g.beginPath(); g.ellipse(hx + hr * 0.55, hy + hr * 0.35, hr * 0.5, hr * 0.42, 0, 0, TAU); g.fill(); outline(g);
  }
  g.fillStyle = p.eye ?? "#2a2a30";
  g.beginPath(); g.arc(hx + hr * 0.25, hy - hr * 0.15, 1.5 * s, 0, TAU); g.fill();

  g.restore();
}

/**
 * Bird (hen). `phase` steps the two legs, `moving` gates the step + wing flap,
 * `peck` (>0) drops the head to feed.
 */
export function drawBird(
  g: CanvasRenderingContext2D,
  x: number, y: number, flip: boolean,
  p: BirdParams, phase: number, moving: boolean, peck: number, t: number,
) {
  const s = p.scale;
  const r = p.bodyR * s;
  const legLen = 3.4 * s;
  const groundY = r * 0.85 + legLen;

  shadow(g, x, y + groundY, r * 1.0, r * 0.4);

  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);

  // ---- legs: alternate step when moving ----
  const w = moving ? Math.sin(phase * TAU) : 0;
  g.strokeStyle = p.legColor; g.lineWidth = 1.6 * s; g.lineCap = "round";
  for (const [rx, ph] of [[-1.6 * s, w], [1.6 * s, -w]] as const) {
    const fx = rx + ph * 2 * s;
    g.beginPath(); g.moveTo(rx, r * 0.7); g.lineTo(fx, groundY); g.stroke();
    g.beginPath(); g.moveTo(fx, groundY); g.lineTo(fx + 1.6 * s, groundY); g.lineTo(fx - 1.2 * s, groundY); g.stroke();
  }

  // ---- body ----
  const bob = moving ? Math.abs(Math.sin(phase * TAU)) * 0.8 * s : Math.sin(t * 3 + x) * 0.4 * s;
  g.save(); g.translate(0, -bob);
  g.fillStyle = p.bodyColor;
  g.beginPath(); g.ellipse(0, 0, r, r * 0.85, 0, 0, TAU); g.fill(); outline(g);

  // ---- wing: folded when still, flapping when moving ----
  const flap = moving ? Math.sin(phase * TAU + 1) * 0.5 : 0;
  g.save(); g.translate(-r * 0.1, -r * 0.1); g.rotate(flap);
  g.fillStyle = p.wingColor;
  g.beginPath(); g.ellipse(0, 0, r * 0.55, r * 0.4, 0.2, 0, TAU); g.fill(); outline(g);
  g.restore();

  // ---- head + comb + beak ----
  const pk = peck > 0 ? Math.sin(peck * 20) * 3 * s : 0;
  const hx = r * 0.72, hy = -r * 0.7 + pk;
  g.fillStyle = p.bodyColor;
  g.beginPath(); g.arc(hx, hy, r * 0.55, 0, TAU); g.fill(); outline(g);
  if (p.comb) {
    g.fillStyle = p.comb;
    g.beginPath(); g.arc(hx, hy - r * 0.55, r * 0.22, 0, TAU); g.fill();
  }
  g.fillStyle = p.beak;
  g.beginPath();
  g.moveTo(hx + r * 0.45, hy); g.lineTo(hx + r * 0.9, hy + r * 0.12); g.lineTo(hx + r * 0.45, hy + r * 0.28);
  g.closePath(); g.fill();
  g.fillStyle = p.eye;
  g.beginPath(); g.arc(hx + r * 0.15, hy - r * 0.05, 1 * s, 0, TAU); g.fill();

  g.restore();
  g.restore();
}

// ---- ready-made presets (cow + hen now; the rest land in Part C) ----------

export const COW_RIG: QuadrupedParams = {
  scale: 1, bodyColor: "#f2efe8", bodyW: 18, bodyH: 10, legColor: "#e0dccf",
  legLen: 8, headColor: "#f2efe8", snout: "#e8b4b8", spots: "#3a3a40",
  ears: "cow", horns: false, tail: "tuft", tailColor: "#d9d4c8", eye: "#2a2a30",
};

export const HEN_RIG: BirdParams = {
  scale: 1, bodyColor: "#f5f2ea", bodyR: 7, wingColor: "#e6e0d2",
  comb: "#d94a3a", beak: "#e8a83a", legColor: "#e8a83a", eye: "#2a2a30",
};
