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
 *
 * drawFace() is the shared FALLBACK CHAIN (A4.1): a shipped photo portrait
 * (sprite id "ui/portraits/<id>") first, then a sprite bust, then the initials
 * medallion — one place so any consumer (the relationships rows today) gets
 * the same order, rather than each window re-deciding it.
 *
 * The bust crop itself measures the frame's actual head-top row from its own
 * alpha data (measureTopRow) instead of assuming a fixed fraction of the cell
 * is "where the head starts". Different sheets carry different amounts of
 * transparent padding above the head — the player matrix sheets very little,
 * the 10 NPC sheets noticeably more — so a shared fixed fraction landed the
 * NPC crop on mostly-empty padding instead of head+shoulders (A4.1 defect).
 */
import { sprite, type SpriteImage } from "./sprites";

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
  /** Fraction of the MEASURED figure span (head-top → feet) to show. 0.62 ≈
   *  head+torso (the paperdoll); ~0.46 ≈ head+shoulders (a relationship
   *  medallion). */
  bustFraction?: number;
  /** A small margin left above the measured head-top, as a fraction of the
   *  cell, so hair doesn't sit flush against the medallion's rim. Also the
   *  legacy "where the head starts" guess, used only if the head-top can't
   *  be measured (see measureTopRow). */
  topFrac?: number;
}

// Per (image, sub-rect) cache of the alpha-bbox TOP row (frame-local px), so
// each frame is scanned at most once. WeakMap keys on the decoded image/canvas
// itself, so recolored heroine canvases (a fresh HTMLCanvasElement per look)
// don't leak entries for looks no longer in use.
const topRowCache = new WeakMap<SpriteImage, Map<string, number | null>>();
const ALPHA_MIN = 16;   // matches sprites.ts spriteBaseAnchor's opacity floor

/**
 * The real head-top row of one sprite frame (frame-local px, 0 = the frame's
 * own top edge) — measured from its OWN alpha data rather than assumed. A
 * sheet's declared cell can carry very different amounts of transparent
 * padding above the character (the player matrix sheets vs the 10 NPC
 * sheets), so a fixed cell-fraction guess is only right for one of them.
 * Cached forever per (image, sub-rect); returns null only if the canvas read
 * fails (same-origin bundled sprites never hit this — kept as a safety net)
 * or the frame is fully transparent.
 */
function measureTopRow(src: BustSource): number | null {
  let byRect = topRowCache.get(src.img);
  if (!byRect) { byRect = new Map(); topRowCache.set(src.img, byRect); }
  const key = `${src.sx},${src.sy},${src.sw},${src.sh}`;
  if (byRect.has(key)) return byRect.get(key)!;
  let top: number | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = src.sw; canvas.height = src.sh;
    const cg = canvas.getContext("2d")!;
    cg.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, 0, 0, src.sw, src.sh);
    const { data } = cg.getImageData(0, 0, src.sw, src.sh);
    for (let y = 0; y < src.sh && top === null; y++) {
      for (let x = 0; x < src.sw; x++) {
        if (data[(y * src.sw + x) * 4 + 3]! > ALPHA_MIN) { top = y; break; }
      }
    }
  } catch { top = null; }
  byRect.set(key, top);
  return top;
}

/**
 * Blit a character's head+torso, centred, filling a W×H box (CSS px). The crop
 * window is [measured head-top − margin .. head-top + bustFraction·(feet −
 * head-top)], scaled onto H; everything below overflows past H and is clipped
 * by the host canvas. Nearest-neighbour so the pixel art stays crisp.
 */
export function drawBust(
  g: CanvasRenderingContext2D, src: BustSource, W: number, H: number, opts: BustOpts = {},
): void {
  const bustFraction = opts.bustFraction ?? 0.62;
  const topFrac = opts.topFrac ?? 0.03;
  const measuredTop = measureTopRow(src);
  let visTop: number, visBot: number;
  if (measuredTop != null) {
    visTop = Math.max(0, measuredTop - src.cell * topFrac);
    visBot = measuredTop + (src.footY - measuredTop) * bustFraction;
  } else {
    // unmeasurable (shouldn't happen) — the original cell-relative guess.
    visTop = src.cell * topFrac;
    visBot = src.footY * bustFraction;
  }
  const scale = H / Math.max(1, visBot - visTop);
  const dx = W / 2 - src.cx * scale;
  const dy = -visTop * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, dx, dy, src.cell * scale, src.cell * scale);
  g.imageSmoothingEnabled = prev;
}

/** Blit a loaded portrait image "cover"-style into a W×H box, top-anchored +
 *  centred horizontally (mirrors the dialogue notch's CSS: object-fit:cover;
 *  object-position:top center) — so a portrait whose aspect ratio doesn't
 *  exactly match the box still keeps the face rather than stretching. */
function drawPortraitCover(g: CanvasRenderingContext2D, img: SpriteImage, W: number, H: number): void {
  const iw = "naturalWidth" in img ? img.naturalWidth : img.width;
  const ih = "naturalHeight" in img ? img.naturalHeight : img.height;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale, dh = ih * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, (W - dw) / 2, 0, dw, dh);
  g.imageSmoothingEnabled = prev;
}

/**
 * Draw a person's face by the shared fallback chain (A4.1): a shipped photo
 * portrait first (best quality, hand-picked crop — sprite manifest id
 * "ui/portraits/<id>", null/undecoded when none has shipped for this person),
 * then a sprite bust (a corrected head+shoulders crop of the character sheet),
 * then the code-drawn initials medallion — the zero-PNG dual-path fallback
 * (CLAUDE.md hard rule #1). One place so any consumer (the relationships rows
 * today; a future NPC hub tomorrow) gets the same order, instead of each
 * window re-deciding it. Returns true once a REAL face (portrait or bust)
 * landed, so a caller with a decode-retry loop knows to stop retrying.
 */
export function drawFace(
  g: CanvasRenderingContext2D, W: number, H: number,
  portraitId: string | null | undefined, bustSrc: BustSource | null,
  initials: string, seed: string, bustOpts: BustOpts = {},
): boolean {
  if (portraitId) {
    const img = sprite(portraitId);
    if (img) { drawPortraitCover(g, img, W, H); return true; }
  }
  if (bustSrc) { drawBust(g, bustSrc, W, H, bustOpts); return true; }
  drawInitialsMedallion(g, initials, W, H, seed);
  return false;
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
