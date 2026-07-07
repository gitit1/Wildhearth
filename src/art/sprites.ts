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

/**
 * Draw a loaded static sprite so its (anchorCol, footRow) sprite-pixel lands on
 * world (groundX, groundY) at `scale` world-px per sprite-px — i.e. base-on-
 * ground, centred on the anchor column. Nearest-neighbour (crisp at any zoom).
 * Returns the transform for overlay placement.
 */
export function drawGroundSprite(
  g: CanvasRenderingContext2D, img: HTMLImageElement,
  groundX: number, groundY: number, anchorCol: number, footRow: number, scale: number,
): SpritePlacement {
  const dx = groundX - anchorCol * scale;
  const dy = groundY - footRow * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, dx, dy, img.naturalWidth * scale, img.naturalHeight * scale);
  g.imageSmoothingEnabled = prev;
  return { dx, dy, scale };
}
