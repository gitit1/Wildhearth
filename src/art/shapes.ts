/** Tiny shared drawing primitives. */
import { CAST_SHADOW_ALPHA, CAST_SHADOW_SKEW_X, CAST_SHADOW_SKEW_Y } from "../config";

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
