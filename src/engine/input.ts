import { DRAG_THRESHOLD } from "../config";
import { screenToWorld } from "./camera";

/**
 * Input: keyboard (WASD/arrows), touch-drag joystick, click/tap-to-move,
 * and one action button. Mouse is primary; keys/joystick are alternates.
 */
const keys: Record<string, boolean> = {};
let joy: { ox: number; oy: number; x: number; y: number } | null = null;
let actionQueued = false;
let moveTarget: [number, number] | null = null;

export function initInput(cv: HTMLCanvasElement, actBtn: HTMLElement) {
  addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") actionQueued = true;
  });
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  cv.addEventListener("pointerdown", (e) => {
    cv.setPointerCapture(e.pointerId);
    joy = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  });
  cv.addEventListener("pointermove", (e) => {
    if (joy) { joy.x = e.clientX; joy.y = e.clientY; }
  });
  cv.addEventListener("pointerup", (e) => {
    // A press that barely moved is a click/tap -> walk there. A real drag
    // was a joystick gesture (handled live in inputVec) and sets no target.
    if (joy) {
      const travel = Math.hypot(e.clientX - joy.ox, e.clientY - joy.oy);
      if (travel < DRAG_THRESHOLD) moveTarget = screenToWorld(e.clientX, e.clientY);
    }
    joy = null;
  });
  cv.addEventListener("pointercancel", () => { joy = null; });

  actBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); actionQueued = true; });
}

/** Immediate steering vector from keys or an active joystick drag. */
export function inputVec(): [number, number] {
  let vx = 0, vy = 0;
  if (keys["arrowup"] || keys["w"]) vy -= 1;
  if (keys["arrowdown"] || keys["s"]) vy += 1;
  if (keys["arrowleft"] || keys["a"]) vx -= 1;
  if (keys["arrowright"] || keys["d"]) vx += 1;
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy);
    if (m > DRAG_THRESHOLD) { vx = dx / m; vy = dy / m; }
  }
  const m = Math.hypot(vx, vy);
  if (m > 1) { vx /= m; vy /= m; }
  return [vx, vy];
}

/** Current click-to-move destination in world coords, or null. */
export function getMoveTarget(): [number, number] | null { return moveTarget; }
export function clearMoveTarget() { moveTarget = null; }

/** Returns true once per queued action press (E key or touch button). */
export function consumeAction(): boolean {
  const a = actionQueued;
  actionQueued = false;
  return a;
}
