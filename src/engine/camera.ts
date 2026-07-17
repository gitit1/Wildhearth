import {
  WORLD_W, WORLD_H, CAM_ZOOM_MIN, CAM_ZOOM_MAX, CAM_ZOOM_REF_W,
  CAM_USER_ZOOM_MIN, CAM_USER_ZOOM_MAX, CAM_USER_ZOOM_STEP,
} from "../config";

/** Latest camera state, kept so screen clicks can be mapped back to the world. */
let lastCam = { camx: 0, camy: 0, scale: 1 };
let canvas: HTMLCanvasElement | null = null;

/** Dev-only verification hook: the raw camera state (backing-store scale +
 *  world offset) so an automated check can map a world point straight to a
 *  canvas pixel (the inverse of screenToWorld) without duplicating the math. */
export function getLastCam(): { camx: number; camy: number; scale: number } {
  return lastCam;
}

/** Player-controlled zoom factor on top of the automatic fit (wheel / +−). */
let userZoom = 1;
export function adjustZoom(steps: number) {
  userZoom = Math.max(CAM_USER_ZOOM_MIN, Math.min(CAM_USER_ZOOM_MAX, userZoom + steps * CAM_USER_ZOOM_STEP));
}
export function zoomFactor(): number { return userZoom; }

/** Applies a camera transform centred on (fx,fy), clamped to `bounds`
 *  (the world by default; a scene smaller than the viewport — the house
 *  interior — gets centred instead of pinned to a corner). `northMargin`
 *  (Part B #7) lets the camera pull back past the world's y=0 edge, revealing
 *  a sky/parallax gap above it — 0 (the historical behavior) for every other
 *  caller, so nothing else changes. */
export function applyCamera(
  ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, fx: number, fy: number,
  bounds: { w: number; h: number } = { w: WORLD_W, h: WORLD_H },
  northMargin = 0,
  zoomBoost = 1,
): { camx: number; camy: number; vw: number; vh: number; scale: number } {
  canvas = cv;
  // zoom is the on-screen size of a world px (CSS px); the backing-store
  // scale multiplies by dpr so hi-dpi displays keep the same framing, crisp.
  // Derived from the play window's own width (the canvas), not the screen.
  // `zoomBoost` (GF-1) lets the interior scene pull the camera in past the
  // outdoor auto-fit so the small room fills most of the view (1 elsewhere).
  const cssW = cv.width / devicePixelRatio;
  const autoZoom = Math.min(CAM_ZOOM_MAX, Math.max(CAM_ZOOM_MIN, (cssW / CAM_ZOOM_REF_W) * devicePixelRatio));
  const zoom = autoZoom * userZoom * zoomBoost;   // the player's wheel/buttons scale the automatic fit
  const scale = zoom * devicePixelRatio;
  const vw = cv.width / scale, vh = cv.height / scale;
  let camx = bounds.w < vw ? (bounds.w - vw) / 2 : Math.max(0, Math.min(bounds.w - vw, fx - vw / 2));
  let camy = bounds.h < vh ? (bounds.h - vh) / 2 : Math.max(-northMargin, Math.min(bounds.h - vh, fy - vh / 2));
  ctx.setTransform(scale, 0, 0, scale, -camx * scale, -camy * scale);
  lastCam = { camx, camy, scale };
  return { camx, camy, vw, vh, scale };
}

/**
 * Maps a pointer position (CSS px) to world coordinates. Uses the canvas'
 * real bounding rect to convert CSS px -> backing-store px, so it is correct
 * regardless of devicePixelRatio or how the canvas is sized in CSS.
 */
export function screenToWorld(clientX: number, clientY: number): [number, number] {
  const { camx, camy, scale } = lastCam;
  if (!canvas) return [clientX / scale + camx, clientY / scale + camy];
  const r = canvas.getBoundingClientRect();
  const bx = (clientX - r.left) * (canvas.width / r.width);
  const by = (clientY - r.top) * (canvas.height / r.height);
  return [bx / scale + camx, by / scale + camy];
}
