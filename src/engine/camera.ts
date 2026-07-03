import { WORLD_W, WORLD_H } from "../config";

/** Latest camera state, kept so screen clicks can be mapped back to the world. */
let lastCam = { camx: 0, camy: 0, scale: 1 };
let canvas: HTMLCanvasElement | null = null;

/** Applies a camera transform centred on (fx,fy), clamped to world bounds. */
export function applyCamera(
  ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, fx: number, fy: number
): { camx: number; camy: number; vw: number; vh: number; scale: number } {
  canvas = cv;
  const scale = Math.min(2.2, Math.max(1.4, (innerWidth / 900) * devicePixelRatio));
  const vw = cv.width / scale, vh = cv.height / scale;
  let camx = fx - vw / 2, camy = fy - vh / 2;
  camx = Math.max(0, Math.min(WORLD_W - vw, camx));
  camy = Math.max(0, Math.min(WORLD_H - vh, camy));
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
