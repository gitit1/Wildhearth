/**
 * Segmented rigs for four-legged and bird animals — the animal counterpart to
 * rig.ts. Same shared OUTLINE + elliptical drop shadow, same distance-keyed
 * walk cycle (phase = dist / stride). Cow and hen were built first; pig,
 * sheep, duck, cat, dog and rabbit (Part C content-library commit 2) are all
 * parameter variants of these same two rigs plus tiny overrides (a wool
 * overlay, two new ear styles, a flat duck bill) — never a new engine.
 *
 * Pure art constants live here; movement speeds live in config.ts.
 */
import { roundR, outline, shadow } from "./shapes";

const TAU = Math.PI * 2;

// px of travel per full leg cycle for the two rigs (animation cadence only)
export const QUAD_STRIDE = 26;
export const BIRD_STRIDE = 14;

export type EarStyle = "cow" | "floppy" | "pointy" | "round" | "lop" | "none";
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
  wool?: string;          // Part C: puffy overlay blobs on the torso (sheep fleece)
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
  billStyle?: "pointed" | "flat";   // Part C: duck gets a wider, flatter bill
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
  if (p.wool) {
    // a fleece of overlapping puffy blobs over the torso (sheep) — same
    // "cloud of circles" technique as the tree canopy, just body-sized
    g.fillStyle = p.wool;
    const puffs: Array<[number, number, number]> = [
      [-bw * 0.55, -bh * 0.35, bh * 0.62], [bw * 0.05, -bh * 0.62, bh * 0.66],
      [bw * 0.62, -bh * 0.3, bh * 0.56], [-bw * 0.1, bh * 0.05, bh * 0.58],
      [bw * 0.35, bh * 0.1, bh * 0.5],
    ];
    for (const [ox, oy, r] of puffs) { g.beginPath(); g.arc(ox, oy, r, 0, TAU); g.fill(); outline(g); }
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
  } else if (p.ears === "round") {
    // small rounded nubs (pig/bear style) — closer to the head than "cow"
    g.fillStyle = p.headColor;
    g.beginPath(); g.ellipse(hx - hr * 0.55, hy - hr * 0.78, hr * 0.32, hr * 0.28, 0, 0, TAU); g.fill(); outline(g);
    g.beginPath(); g.ellipse(hx + hr * 0.55, hy - hr * 0.78, hr * 0.32, hr * 0.28, 0, 0, TAU); g.fill(); outline(g);
  } else if (p.ears === "lop") {
    // long ears hanging down beside the face (lop rabbit)
    g.fillStyle = p.headColor;
    g.beginPath(); g.ellipse(hx - hr * 0.55, hy + hr * 0.45, hr * 0.28, hr * 1.05, 0.14, 0, TAU); g.fill(); outline(g);
    g.beginPath(); g.ellipse(hx + hr * 0.55, hy + hr * 0.45, hr * 0.28, hr * 1.05, -0.14, 0, TAU); g.fill(); outline(g);
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
  if (p.billStyle === "flat") {
    // duck: a wider, flatter, rounded bill (distinct silhouette from the hen's beak)
    g.beginPath(); g.ellipse(hx + r * 0.62, hy + r * 0.1, r * 0.5, r * 0.26, 0, 0, TAU); g.fill(); outline(g);
  } else {
    g.beginPath();
    g.moveTo(hx + r * 0.45, hy); g.lineTo(hx + r * 0.9, hy + r * 0.12); g.lineTo(hx + r * 0.45, hy + r * 0.28);
    g.closePath(); g.fill();
  }
  g.fillStyle = p.eye;
  g.beginPath(); g.arc(hx + r * 0.15, hy - r * 0.05, 1 * s, 0, TAU); g.fill();

  g.restore();
  g.restore();
}

// ---- ready-made presets (cow + hen; Part C content-library commit 2 adds
// pig/sheep/duck — wired as purchasable livestock, see systems/livestock.ts +
// systems/shop.ts + entities/animals.ts — plus rabbit/cat/dog, which are
// PRESETS + PAINTERS ONLY: cat/dog belong to the future Pets block (adoption,
// companionship — see VISION.md Systems #6), and the rabbit is a hutch
// occupant, not a wandering yard animal. None of the three are spawned
// anywhere yet; see art/characters.ts's drawCat/drawDog/drawRabbit for the
// (currently unused outside verification) painter wrappers and a comment
// marking where the Pets block would plug them in. ----------------------

export const COW_RIG: QuadrupedParams = {
  scale: 1, bodyColor: "#f2efe8", bodyW: 18, bodyH: 10, legColor: "#e0dccf",
  legLen: 8, headColor: "#f2efe8", snout: "#e8b4b8", spots: "#3a3a40",
  ears: "cow", horns: false, tail: "tuft", tailColor: "#d9d4c8", eye: "#2a2a30",
};

export const HEN_RIG: BirdParams = {
  scale: 1, bodyColor: "#f5f2ea", bodyR: 7, wingColor: "#e6e0d2",
  comb: "#d94a3a", beak: "#e8a83a", legColor: "#e8a83a", eye: "#2a2a30",
};

/** Pink, round, snout + a curly tail — purchasable livestock (barn-gated). */
export const PIG_RIG: QuadrupedParams = {
  scale: 0.85, bodyColor: "#eeb3ab", bodyW: 15, bodyH: 9.5, legColor: "#dda297",
  legLen: 5, headColor: "#eeb3ab", snout: "#c9847a", ears: "round",
  tail: "curly", tailColor: "#dda297", eye: "#2a2a30",
};

/** A woolly fleece blob body over a dark face/legs — purchasable livestock. */
export const SHEEP_RIG: QuadrupedParams = {
  scale: 0.9, bodyColor: "#f2efe4", bodyW: 16, bodyH: 10, legColor: "#3a2f22",
  legLen: 6, headColor: "#463b2c", ears: "floppy", tail: "tuft", tailColor: "#f2efe4",
  eye: "#2a2a30", wool: "#f7f4ea",
};

/** Bird rig with a flat bill + a slow waddling gait (the shared walk cycle
 *  already reads as a waddle at this stride) — purchasable livestock. */
export const DUCK_RIG: BirdParams = {
  scale: 0.8, bodyColor: "#f5eddb", bodyR: 6.5, wingColor: "#e0d6bc",
  beak: "#e0a12f", legColor: "#e0a12f", eye: "#2a2a30", billStyle: "flat",
};

/** Lop rabbit — long drooping ears, small round body. Hutch occupant (a
 *  static prop context, not a wandering yard animal) — preset + painter only. */
export const RABBIT_RIG: QuadrupedParams = {
  scale: 0.55, bodyColor: "#e8e2d4", bodyW: 10, bodyH: 7, legColor: "#d8d0bc",
  legLen: 3.5, headColor: "#e8e2d4", ears: "lop", tail: "tuft", tailColor: "#f5f2ea", eye: "#2a2a30",
};

/** Cat — pointy ears, curled tail. Pets block (future) — preset + painter only. */
export const CAT_RIG: QuadrupedParams = {
  scale: 0.6, bodyColor: "#8a7362", bodyW: 10, bodyH: 6.5, legColor: "#7a6455",
  legLen: 5, headColor: "#8a7362", ears: "pointy", tail: "curly", tailColor: "#7a6455", eye: "#c9a23a",
};

/** Dog — floppy ear, tufted tail, a snout patch. Pets block (future) —
 *  preset + painter only. */
export const DOG_RIG: QuadrupedParams = {
  scale: 0.75, bodyColor: "#c9975a", bodyW: 12, bodyH: 7.5, legColor: "#b8854a",
  legLen: 6, headColor: "#c9975a", snout: "#e0c9a0", ears: "floppy", tail: "tuft", tailColor: "#b8854a", eye: "#2a2a30",
};
