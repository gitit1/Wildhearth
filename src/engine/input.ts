/** Keyboard (WASD/arrows) + touch drag joystick + one action button. */
const keys: Record<string, boolean> = {};
let joy: { ox: number; oy: number; x: number; y: number } | null = null;
let actionQueued = false;

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
  const clear = () => (joy = null);
  cv.addEventListener("pointerup", clear);
  cv.addEventListener("pointercancel", clear);
  actBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); actionQueued = true; });
}

export function inputVec(): [number, number] {
  let vx = 0, vy = 0;
  if (keys["arrowup"] || keys["w"]) vy -= 1;
  if (keys["arrowdown"] || keys["s"]) vy += 1;
  if (keys["arrowleft"] || keys["a"]) vx -= 1;
  if (keys["arrowright"] || keys["d"]) vx += 1;
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy);
    if (m > 10) { vx = dx / m; vy = dy / m; }
  }
  const m = Math.hypot(vx, vy);
  if (m > 1) { vx /= m; vy /= m; }
  return [vx, vy];
}

/** Returns true once per queued action press (E key or touch button). */
export function consumeAction(): boolean {
  const a = actionQueued;
  actionQueued = false;
  return a;
}
