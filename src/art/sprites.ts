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
import { SPRITE_MANIFEST, SHEET_MANIFEST, type SheetData } from "../assets/pixellab/manifest";

const registry = new Map<string, HTMLImageElement>();
let loadStarted = false;
let loadedCount = 0;

// Sheet frame maps, keyed by sheet id ("characters/heroine"). Populated
// synchronously at module load — the JSON is eager-imported, no decode wait.
const sheetRegistry = new Map<string, SheetData>();
for (const { id, data } of SHEET_MANIFEST) sheetRegistry.set(id, data);

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

// ---- sheet atlas access -------------------------------------------------
/** One frame's source sub-rect inside a decoded atlas image — feed straight
 *  into the 9-arg g.drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh). */
export interface SpriteFrame { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number }

/**
 * A named frame from a packed atlas. `sheetId` is the sheet id
 * ("characters/heroine"), `frameName` a key in its frame map ("walk_south_0").
 * Returns null until the atlas PNG has decoded, or if the sheet/frame is
 * absent — callers fall back to the code rig, exactly like sprite()==null.
 */
export function spriteFrame(sheetId: string, frameName: string): SpriteFrame | null {
  const data = sheetRegistry.get(sheetId);
  if (!data) return null;
  const fr = data.frames[frameName];
  if (!fr) return null;
  const img = sprite(`${sheetId}.sheet`);   // the atlas PNG (manifest id has the .sheet suffix)
  if (!img) return null;
  return { img, sx: fr.x, sy: fr.y, sw: fr.w, sh: fr.h };
}

/** A sheet's placement metadata (cell size + measured foot anchor), or null if
 *  the sheet isn't present. Used by the character bridges to scale/plant feet. */
export function sheetInfo(sheetId: string): SheetData | null {
  return sheetRegistry.get(sheetId) ?? null;
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
//  Base anchor — the alpha-bbox foot of a loose sprite (bottom-most opaque row
//  + horizontal centre of its content), computed once from an offscreen canvas
//  and cached by id. Lets a caller plant a sprite's actual lowest pixel on a
//  world point without hardcoding a per-sprite anchor table (used by the crop
//  painter: 24 crop sprites with different foot rows all ground correctly). The
//  image is already decoded when this is called (sprite() gates on that).
// ===========================================================================
const baseAnchorCache = new Map<string, { cx: number; foot: number }>();

/** {cx, foot} = (centre col, bottom-most opaque row) of `img`'s alpha bbox, so
 *  drawGroundSprite(g, img, X, Y, cx, foot, s) lands the sprite's lowest pixel
 *  on (X,Y). Computed once per id and cached; falls back to (w/2, h) if the
 *  canvas read fails or the sprite is fully transparent. */
export function spriteBaseAnchor(id: string, img: HTMLImageElement): { cx: number; foot: number } {
  const cached = baseAnchorCache.get(id);
  if (cached) return cached;
  const w = img.naturalWidth, h = img.naturalHeight;
  const fallback = { cx: w / 2, foot: h };
  if (!w || !h) return fallback;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const cx = canvas.getContext("2d");
  if (!cx) return fallback;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(img, 0, 0);
  let px: Uint8ClampedArray;
  try { px = cx.getImageData(0, 0, w, h).data; }
  catch { return fallback; }
  let minX = w, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3]! > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const res = maxY < 0 ? fallback : { cx: (minX + maxX) / 2, foot: maxY };
  baseAnchorCache.set(id, res);
  return res;
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

// ===========================================================================
//  Sheet recolor — the same H&S-replace as recolorSprite, but (a) applies
//  SEVERAL disjoint bands in one pass (heroine hair + dress + apron together),
//  and (b) each band may carry per-pixel LIGHTNESS bounds and a per-CELL
//  vertical window. Lightness bounds separate same-hue regions of different
//  value (dark chestnut hair vs lighter freckled skin); the vertical window
//  (nyMin/nyMax, fraction of a CELL, 0=top) confines a band to a body zone so a
//  same-hue region elsewhere is left alone (hair recolor must skip the boots,
//  which share dark-brown hue+lightness). Used by art/spriteChar.ts to turn the
//  chestnut/rust base heroine sheets into the player's chosen hair + dress
//  colours. See docs/PIXELLAB_ASSETS.md "Recolouring the heroine".
// ===========================================================================

/** A recolor band: HueBand + optional lightness bounds + an optional per-cell
 *  vertical window (fractions of one atlas cell, 0=cell top .. 1=cell bottom). */
export interface RecolorBand extends HueBand {
  lMin?: number; lMax?: number;   // per-pixel lightness gate (0-1)
  nyMin?: number; nyMax?: number;  // per-CELL normalized-Y window (0-1)
}
/** One region's recolor: pixels in `band` → `targetHex`'s hue+sat (keep L). */
export interface RecolorOp { band: RecolorBand; targetHex: string }

const sheetRecolorCache = new Map<string, HTMLCanvasElement>();
const SHEET_RECOLOR_CACHE_MAX = 48;   // bound growth from creation-screen scrubbing

function inBand(h: number, s: number, l: number, ny: number, b: RecolorBand): boolean {
  const hok = b.hueMin > b.hueMax
    ? (h >= b.hueMin || h <= b.hueMax)
    : (h >= b.hueMin && h <= b.hueMax);
  if (!hok || s < b.satMin) return false;
  if (b.lMin != null && l < b.lMin) return false;
  if (b.lMax != null && l > b.lMax) return false;
  if (b.nyMin != null && ny < b.nyMin) return false;
  if (b.nyMax != null && ny > b.nyMax) return false;
  return true;
}

/**
 * Recolor a packed atlas by several bands at once, returning a cached offscreen
 * canvas (same pixel size as `img`, same frame rects). `cellSize` is the atlas's
 * per-cell px (SheetData.canvas) used to resolve each band's nyMin/nyMax within
 * its own cell. Computed once per (id + ops) look and cached (session-lifetime,
 * capped) — cheap to draw from every frame. Null if the image hasn't decoded or
 * canvas 2D is unavailable (callers fall back to the raw atlas).
 */
export function recolorSheet(
  id: string, img: HTMLImageElement, ops: RecolorOp[], cellSize: number,
): HTMLCanvasElement | null {
  if (ops.length === 0) return null;
  const cacheKey = id + "|" + ops.map((o) =>
    `${o.targetHex}@${o.band.hueMin},${o.band.hueMax},${o.band.satMin},${o.band.lMin ?? ""},${o.band.lMax ?? ""},${o.band.nyMin ?? ""},${o.band.nyMax ?? ""}`).join("|");
  const cached = sheetRecolorCache.get(cacheKey);
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
  // precompute each op's target hue+sat
  const targets = ops.map((o) => { const [r, g, b] = hexToRgb(o.targetHex); const [th, ts] = rgbToHsl(r, g, b); return { band: o.band, th, ts }; });
  const cell = cellSize > 0 ? cellSize : h;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const [h1, s1, l1] = rgbToHsl(px[i]!, px[i + 1]!, px[i + 2]!);
    const ny = (Math.floor((i >> 2) / w) % cell) / cell;   // row within this pixel's cell, 0-1
    for (const t of targets) {
      if (inBand(h1, s1, l1, ny, t.band)) {
        const [r2, g2, b2] = hslToRgb(t.th, t.ts, l1);
        px[i] = r2; px[i + 1] = g2; px[i + 2] = b2;
        break;   // bands are disjoint; first match wins
      }
    }
  }
  cx.putImageData(data, 0, 0);
  if (sheetRecolorCache.size >= SHEET_RECOLOR_CACHE_MAX) {
    const oldest = sheetRecolorCache.keys().next().value;
    if (oldest !== undefined) sheetRecolorCache.delete(oldest);
  }
  sheetRecolorCache.set(cacheKey, canvas);
  return canvas;
}
