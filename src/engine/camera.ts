import { WORLD_W, WORLD_H } from "../config";

/** Applies a camera transform centred on (fx,fy), clamped to world bounds. */
export function applyCamera(
  ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, fx: number, fy: number
): { camx: number; camy: number; vw: number; vh: number; scale: number } {
  const scale = Math.min(2.2, Math.max(1.4, (innerWidth / 900) * devicePixelRatio));
  const vw = cv.width / scale, vh = cv.height / scale;
  let camx = fx - vw / 2, camy = fy - vh / 2;
  camx = Math.max(0, Math.min(WORLD_W - vw, camx));
  camy = Math.max(0, Math.min(WORLD_H - vh, camy));
  ctx.setTransform(scale, 0, 0, scale, -camx * scale, -camy * scale);
  return { camx, camy, vw, vh, scale };
}
