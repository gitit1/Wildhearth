/**
 * Sprite loader + registry — the single async image cache behind the dual-path
 * art system (CLAUDE.md hard rule #1).
 *
 *  - loadSprites() is kicked off once at boot (main.ts), NON-BLOCKING: it just
 *    starts every Image decoding. Nothing awaits it; a slow or missing asset can
 *    never delay or break boot.
 *  - sprite(id) returns the decoded HTMLImageElement, or null until it has
 *    loaded (or forever, if the PNG isn't in the repo). Callers draw the
 *    code-drawn painter whenever it returns null, so the game runs fully with
 *    zero sprite files.
 *
 * Every sprite is drawn with imageSmoothingEnabled=false (nearest-neighbour) so
 * the pixel art stays crisp at any camera zoom — the drawers set it, but keep
 * this contract in mind when adding new sprite draws.
 */
import { SPRITE_MANIFEST } from "../assets/pixellab/manifest";

const registry = new Map<string, HTMLImageElement>();
let loadStarted = false;
let loadedCount = 0;

/** Start decoding every manifest sprite. Idempotent; returns immediately. */
export function loadSprites(): void {
  if (loadStarted) return;
  loadStarted = true;
  for (const { id, url } of SPRITE_MANIFEST) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { loadedCount++; };
    img.onerror = () => { /* a bad/missing asset just stays null → painter fallback */ };
    img.src = url;
    registry.set(id, img);
  }
}

/** The decoded image for `id`, or null until it's ready (non-blocking). */
export function sprite(id: string): HTMLImageElement | null {
  const img = registry.get(id);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** True once every manifest sprite has decoded (used only by verification). */
export function spritesReady(): boolean {
  return loadStarted && loadedCount >= SPRITE_MANIFEST.length;
}

/** Load progress, for the dev/verification bridge. */
export function spriteLoadProgress(): { loaded: number; total: number } {
  return { loaded: loadedCount, total: SPRITE_MANIFEST.length };
}

/** The sprite->world transform a drawGroundSprite() call used, so a caller can
 *  place code-drawn overlays (e.g. renovation damage) onto sprite features:
 *  world = (dx + spriteX*scale, dy + spriteY*scale). */
export interface SpritePlacement { dx: number; dy: number; scale: number }

/** Anything drawGroundSprite/recolorSprite can draw from: a decoded PNG, or a
 *  recolorSprite() output (an offscreen canvas standing in for one). */
export type SpriteImage = HTMLImageElement | HTMLCanvasElement;
function srcW(img: SpriteImage): number { return "naturalWidth" in img ? img.naturalWidth : img.width; }
function srcH(img: SpriteImage): number { return "naturalHeight" in img ? img.naturalHeight : img.height; }

/**
 * Draw a loaded static sprite so its (anchorCol, footRow) sprite-pixel lands on
 * world (groundX, groundY) at `scale` world-px per sprite-px — i.e. base-on-
 * ground, centred on the anchor column. Nearest-neighbour (crisp at any zoom).
 * Returns the transform for overlay placement.
 */
export function drawGroundSprite(
  g: CanvasRenderingContext2D, img: SpriteImage,
  groundX: number, groundY: number, anchorCol: number, footRow: number, scale: number,
): SpritePlacement {
  const dx = groundX - anchorCol * scale;
  const dy = groundY - footRow * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, dx, dy, srcW(img) * scale, srcH(img) * scale);
  g.imageSmoothingEnabled = prev;
  return { dx, dy, scale };
}

// ===========================================================================
//  Sprite recolor — gives ONE baked sprite a per-instance color identity
//  (e.g. the market stall's striped awning, tinted per stall) without
//  regenerating art. HSL-based: pixels whose OWN hue/saturation fall inside a
//  caller-supplied band get their hue+saturation replaced by the target
//  color, keeping each pixel's own lightness (so the fabric's shading/stripe
//  contrast survives) and alpha untouched. Every pixel outside the band
//  (outlines, wood, any other feature) is left alone.
// ===========================================================================

/** Hue band (degrees, 0-360) a pixel's OWN color must fall in to be
 *  recolored, plus a saturation floor (0-1) to exclude near-neutral pixels
 *  (outlines, wood shadow) that happen to share the hue. `hueMin > hueMax`
 *  wraps through 0/360 (e.g. a red band spanning 334°..6°). */
export interface HueBand { hueMin: number; hueMax: number; satMin: number }

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
    case gn: h = (bn - rn) / d + 2; break;
    default: h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const chan = (tc: number) => {
    let tt = tc;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(chan(hn + 1 / 3) * 255),
    Math.round(chan(hn) * 255),
    Math.round(chan(hn - 1 / 3) * 255),
  ];
}

const recolorCache = new Map<string, HTMLCanvasElement>();

/**
 * Recolor the pixels of a loaded sprite whose hue/saturation fall inside
 * `band` to `targetHex`'s hue+saturation (each pixel keeps its own lightness
 * + alpha). Computed once per (id, targetHex) pair and cached forever (a
 * handful of small canvases, session-lifetime) — cheap to call every frame.
 * Returns null only if the image hasn't decoded yet or canvas 2D is
 * unavailable; callers should fall back to drawing `img` itself in that case.
 */
export function recolorSprite(
  id: string, img: HTMLImageElement, targetHex: string, band: HueBand,
): HTMLCanvasElement | null {
  const cacheKey = `${id}|${targetHex}`;
  const cached = recolorCache.get(cacheKey);
  if (cached) return cached;
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const cx = canvas.getContext("2d");
  if (!cx) return null;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, w, h);
  const px = data.data;
  const [tr, tg, tb] = hexToRgb(targetHex);
  const [targetH, targetS] = rgbToHsl(tr, tg, tb);
  const wraps = band.hueMin > band.hueMax;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const [h1, s1, l1] = rgbToHsl(px[i]!, px[i + 1]!, px[i + 2]!);
    const inBand = wraps ? (h1 >= band.hueMin || h1 <= band.hueMax) : (h1 >= band.hueMin && h1 <= band.hueMax);
    if (inBand && s1 >= band.satMin) {
      const [r2, g2, b2] = hslToRgb(targetH, targetS, l1);
      px[i] = r2; px[i + 1] = g2; px[i + 2] = b2;
    }
  }
  cx.putImageData(data, 0, 0);
  recolorCache.set(cacheKey, canvas);
  return canvas;
}
