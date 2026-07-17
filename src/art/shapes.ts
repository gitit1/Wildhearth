/** Tiny shared drawing primitives. */
import {
  CAST_SHADOW_ALPHA, CAST_SHADOW_SKEW_X, CAST_SHADOW_SKEW_Y,
  CONTACT_SHADOW_ALPHA, CONTACT_SHADOW_SE, BASE_TINT_ALPHA, BASE_TUFT_MIN, BASE_TUFT_MAX,
} from "../config";
import { mulberry32 } from "../engine/rng";

export function roundR(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function shadow(
  g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number
) {
  g.fillStyle = "rgba(20,30,12,.28)";
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
}

/**
 * The game-wide outline stroke (visual pass, batch 3): every major drawn
 * shape gets the same soft dark contour, the single cheapest technique that
 * makes flat canvas art read like the reference look. One color, one width,
 * defined once — never per-object.
 */
export const OUTLINE = "rgba(43,32,19,.62)";
export const OUTLINE_W = 1.6;

/** Strokes the CURRENT path with the shared outline (call right after fill). */
export function outline(g: CanvasRenderingContext2D) {
  g.strokeStyle = OUTLINE;
  g.lineWidth = OUTLINE_W;
  g.stroke();
}

/** fillRect + the shared outline in one call. */
export function oRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = OUTLINE;
  g.lineWidth = OUTLINE_W;
  g.strokeRect(x, y, w, h);
}

/** Outlined ellipse. */
export function oEllipse(
  g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string,
) {
  g.fillStyle = fill;
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill();
  outline(g);
}

// ===========================================================================
//  Diagonal cast shadows (Part B #3) — distinct from `shadow()` above (the
//  under-entity ellipse). A soft, skewed dark shape thrown toward the
//  lower-right (a fixed upper-left sun), sized from the object's own
//  footprint + height. Length/alpha read the CURRENT time of day via a tiny
//  module-level "sun state" set once per frame by main.ts (the same pattern
//  engine/camera.ts already uses for `lastCam`) — so every painter can call
//  `castShadow()` from inside its own drawFn (keeping it in the depth sort)
//  without art/ ever importing systems/calendar.ts.
// ===========================================================================

let sunLenMult = 1, sunAlphaMult = 1;

/** Call once per frame (main.ts's draw(), before the entity pass) with the
 *  current `shadowFactors(hour, minute)` from art/daynight.ts. */
export function setSunFactors(lenMult: number, alphaMult: number) {
  sunLenMult = lenMult;
  sunAlphaMult = alphaMult;
}

/** Dev-only verification hook: the raw values castShadow() is currently
 *  reading, to confirm setSunFactors() actually reached this module. */
export function getSunFactors(): { sunLenMult: number; sunAlphaMult: number } {
  return { sunLenMult, sunAlphaMult };
}

/**
 * Casts a soft skewed shadow from a ground footprint. `footX,footY` is the
 * point the object stands on; `halfW` is the footprint's half-width at the
 * base; `rise` is how tall the silhouette being thrown is (a doorstep needs
 * almost none, a barn needs a lot). Cheap: one filled path, no transforms.
 */
export function castShadow(
  g: CanvasRenderingContext2D, footX: number, footY: number, halfW: number, rise: number,
) {
  const a = CAST_SHADOW_ALPHA * sunAlphaMult;
  if (a <= 0.004) return;   // night — not worth the draw call
  const len = rise * sunLenMult;
  const dx = len * CAST_SHADOW_SKEW_X, dy = len * CAST_SHADOW_SKEW_Y;
  g.fillStyle = `rgba(20,16,10,${a.toFixed(3)})`;
  g.beginPath();
  g.moveTo(footX - halfW, footY);
  g.lineTo(footX + halfW, footY);
  g.lineTo(footX + halfW * 0.65 + dx, footY + dy);
  g.lineTo(footX - halfW * 0.65 + dx, footY + dy);
  g.closePath();
  g.fill();
}

// ===========================================================================
//  W2c building grounding — the "does it look BUILT here" pair. BUILDINGS use
//  these two instead of the diagonal castShadow polygon above (which read
//  "pasted"): a soft SHORT contact shadow that hugs the base (contactShadow),
//  and a base-line integration pass (baseGrounding: a dithered tint climbing
//  the foundation + grass/weed tufts breaking the crisp cut). Both are called
//  from every building painter, on BOTH the sprite and the code-fallback path,
//  so the treatment is uniform and zero-PNG safe. See COMPOSITION_RULES rule 30.
// ===========================================================================

/** A soft, short, dark-at-the-base contact shadow hugging a building footprint,
 *  offset slightly toward the lower-right (sun upper-left). Sun-aware alpha
 *  (fades at night) but — unlike castShadow — never elongates. Draw BEFORE the
 *  building sprite (it sits under the base). */
export function contactShadow(
  g: CanvasRenderingContext2D, footX: number, footY: number, halfW: number,
) {
  const a = CONTACT_SHADOW_ALPHA * sunAlphaMult;
  if (a <= 0.004) return;
  const rx = Math.max(8, halfW * 1.02);
  const ry = Math.max(6, halfW * 0.32);
  const cx = footX + ry * CONTACT_SHADOW_SE, cy = footY - ry * 0.12;
  g.save();
  g.translate(cx, cy);
  g.scale(1, ry / rx);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, `rgba(16,12,8,${a.toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(16,12,8,${(a * 0.5).toFixed(3)})`);
  grad.addColorStop(1, "rgba(16,12,8,0)");
  g.fillStyle = grad;
  g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill();
  g.restore();
}

/** Base-line integration: a dithered tint climbing ~4px up the foundation +
 *  irregular grass/weed tufts (pixel blocks, like the ground scatter) breaking
 *  the crisp line where the base meets the ground. Deterministic per building
 *  (`seed`). Draw AFTER the building sprite (it sits in front of the base). */
export function baseGrounding(
  g: CanvasRenderingContext2D, footX: number, footY: number, halfW: number, seed: number,
) {
  // (a) dark dithered tint climbing the foundation base (a bit stays at dusk)
  const ta = BASE_TINT_ALPHA * (0.45 + 0.55 * sunAlphaMult);
  const climb = 4;
  const grad = g.createLinearGradient(0, footY, 0, footY - climb);
  grad.addColorStop(0, `rgba(22,17,10,${ta.toFixed(3)})`);
  grad.addColorStop(1, "rgba(22,17,10,0)");
  g.fillStyle = grad;
  g.fillRect(footX - halfW, footY - climb, halfW * 2, climb);
  // (b) grass/weed tufts breaking the base line at irregular intervals — some
  //     green, some dry, reading as weeds grown up against the wall foot.
  const rnd = mulberry32((seed ^ 0x2c1b3a7d) >>> 0);
  const n = BASE_TUFT_MIN + ((rnd() * (BASE_TUFT_MAX - BASE_TUFT_MIN + 1)) | 0);
  for (let i = 0; i < n; i++) {
    const tx = Math.round(footX + (rnd() * 2 - 1) * halfW * 0.94);
    const ty = Math.round(footY - ((rnd() * 2) | 0));
    const green = rnd() < 0.72;
    const c = green
      ? ["#3f5a2e", "#4a6a34", "#557f36"][(rnd() * 3) | 0]!
      : ["#7a6a30", "#8a7a3a", "#66693b"][(rnd() * 3) | 0]!;
    const blades = 2 + ((rnd() * 3) | 0);
    for (let b = 0; b < blades; b++) {
      const lean = Math.round((b - (blades - 1) / 2) * 1.3);
      const bh = 2 + ((rnd() * 4) | 0);
      g.fillStyle = c;
      g.fillRect(tx + lean, ty - bh, 1, bh);
    }
  }
}
