import { DRAG_THRESHOLD } from "../config";
import { screenToWorld } from "./camera";

/**
 * Input: keyboard (WASD/arrows), touch-drag joystick, and mouse.
 * Mouse-first, UO-style:
 *   - left-click  -> move there, or act on a clicked object (main decides)
 *   - right-click -> open a context menu on a clicked object
 *   - hover       -> main hit-tests getPointerScreen() to highlight objects
 * Keyboard/joystick remain as alternate steering.
 */
const keys: Record<string, boolean> = {};
let joy: { ox: number; oy: number; x: number; y: number } | null = null;
let press: { sx: number; sy: number; button: number } | null = null;
let actionQueued = false;

let moveTarget: [number, number] | null = null;
let pointerScreen: [number, number] | null = null;
let leftClick: { wx: number; wy: number } | null = null;
let rightClick: { wx: number; wy: number; sx: number; sy: number } | null = null;

export function initInput(cv: HTMLCanvasElement, actBtn: HTMLElement) {
  addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") actionQueued = true;
  });
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  cv.addEventListener("contextmenu", (e) => e.preventDefault()); // right-click is ours

  cv.addEventListener("pointerdown", (e) => {
    cv.setPointerCapture(e.pointerId);
    press = { sx: e.clientX, sy: e.clientY, button: e.button };
    pointerScreen = [e.clientX, e.clientY];
    if (e.button === 0) joy = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  });
  cv.addEventListener("pointermove", (e) => {
    pointerScreen = [e.clientX, e.clientY];
    if (joy) { joy.x = e.clientX; joy.y = e.clientY; }
  });
  cv.addEventListener("pointerup", (e) => {
    pointerScreen = [e.clientX, e.clientY];
    // A press that barely travelled is a click; a real drag was a joystick gesture.
    if (press) {
      const travel = Math.hypot(e.clientX - press.sx, e.clientY - press.sy);
      if (travel < DRAG_THRESHOLD) {
        const [wx, wy] = screenToWorld(e.clientX, e.clientY);
        if (press.button === 0) leftClick = { wx, wy };
        else if (press.button === 2) rightClick = { wx, wy, sx: e.clientX, sy: e.clientY };
      }
    }
    press = null; joy = null;
  });
  cv.addEventListener("pointercancel", () => { press = null; joy = null; });
  cv.addEventListener("pointerleave", () => { pointerScreen = null; });

  actBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); actionQueued = true; });
}

/** Immediate steering vector from keys or an active (left-button) joystick drag. */
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

/** Click-to-move destination in world coords (set by main), or null. */
export function getMoveTarget(): [number, number] | null { return moveTarget; }
export function setMoveTarget(wx: number, wy: number) { moveTarget = [wx, wy]; }
export function clearMoveTarget() { moveTarget = null; }

/** Last known pointer position in screen (CSS) px, or null if off-canvas. */
export function getPointerScreen(): [number, number] | null { return pointerScreen; }

/** One-shot left click at world coords, or null. */
export function consumeLeftClick(): { wx: number; wy: number } | null {
  const c = leftClick; leftClick = null; return c;
}
/** One-shot right click with both world and screen coords, or null. */
export function consumeRightClick(): { wx: number; wy: number; sx: number; sy: number } | null {
  const c = rightClick; rightClick = null; return c;
}

/** Returns true once per queued action press (E key or touch button). */
export function consumeAction(): boolean {
  const a = actionQueued;
  actionQueued = false;
  return a;
}
