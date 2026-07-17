/**
 * Character BUST drawing (HUD-A3/A4) — a head-and-torso crop of a character
 * sprite, for the paperdoll portrait (the player) and the relationships rows
 * (the townsfolk). One shared drawer over a resolved sprite frame, plus a
 * code-drawn initials medallion as the universal zero-sprite fallback (CLAUDE.md
 * hard rule #1: the surface renders fully with no sprite PNGs committed).
 *
 * The sprite frame + geometry are resolved by the character bridges
 * (art/spriteChar.ts playerBustSource / art/spriteNpc.ts npcBustSource) so this
 * module stays a pure painter — it never touches the sheet registry directly.
 */
import type { SpriteImage } from "./sprites";

/** A resolved sprite frame + its cell geometry, everything drawBust needs to
 *  crop a head+torso from one square atlas cell. */
export interface BustSource {
  img: SpriteImage;
  sx: number; sy: number; sw: number; sh: number;   // source cell sub-rect (square)
  cell: number;                                       // cell px (== sw == sh)
  cx: number;                                          // body centre column (cell px)
  footY: number;                                       // foot row (cell px)
}

export interface BustOpts {
  /** Fraction of the figure's height (top → feet) to show. 0.62 ≈ head+torso
   *  (the paperdoll); ~0.42 ≈ head+shoulders (a relationship medallion). */
  bustFraction?: number;
  /** Where the head starts, as a fraction of the cell from its top. */
  topFrac?: number;
}

/**
 * Blit a character's head+torso, centred, filling a W×H box (CSS px). The figure
 * is scaled so the crop window [topFrac·cell .. footY·bustFraction] maps onto
 * H; everything below the crop overflows past H and is clipped by the host
 * canvas. Nearest-neighbour so the pixel art stays crisp.
 */
export function drawBust(
  g: CanvasRenderingContext2D, src: BustSource, W: number, H: number, opts: BustOpts = {},
): void {
  const bustFraction = opts.bustFraction ?? 0.62;
  const topFrac = opts.topFrac ?? 0.03;
  const visTop = src.cell * topFrac;
  const visBot = src.footY * bustFraction;
  const scale = H / Math.max(1, visBot - visTop);
  const dx = W / 2 - src.cx * scale;
  const dy = -visTop * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, dx, dy, src.cell * scale, src.cell * scale);
  g.imageSmoothingEnabled = prev;
}

/** A hue derived from a string, so each person's fallback medallion has a
 *  stable, distinct warm tint (never the same two neighbours grey). */
function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return h % 360;
}

/**
 * The code-drawn fallback: a warm disc with the character's initials, in the UO
 * gump palette. Used when no sprite frame is available (zero-PNG boot, an NPC
 * with no sheet yet, or the atlas still decoding).
 */
export function drawInitialsMedallion(
  g: CanvasRenderingContext2D, initials: string, W: number, H: number, seed: string,
): void {
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 1;
  const hue = hueOf(seed);
  const grad = g.createRadialGradient(cx, cy - r * 0.3, r * 0.2, cx, cy, r);
  grad.addColorStop(0, `hsl(${hue} 34% 42%)`);
  grad.addColorStop(1, `hsl(${hue} 30% 24%)`);
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  // rim
  g.lineWidth = Math.max(1.5, r * 0.08);
  g.strokeStyle = "rgba(201,162,74,.55)";
  g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
  // initials
  g.fillStyle = "#f0e6cd";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `800 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
  g.fillText(initials.slice(0, 2).toUpperCase(), cx, cy + r * 0.06);
  g.textAlign = "start"; g.textBaseline = "alphabetic";
}

/** Size an existing canvas element DPR-aware and return a 2D context pre-scaled
 *  to CSS px, so callers draw in CSS units and get crisp output on hi-dpi. */
export function sizeCanvas(canvas: HTMLCanvasElement, W: number, H: number): CanvasRenderingContext2D {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return g;
}

/** A fresh DPR-aware canvas + its pre-scaled context (the per-row relationship
 *  bust makes one of these). */
export function makeBustCanvas(W: number, H: number): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  const g = sizeCanvas(canvas, W, H);
  return { canvas, g };
}
