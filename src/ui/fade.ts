/**
 * Fade-to-black overlay for time skips (sleep, collapse). The world's clock is
 * NOT teleported — the caller drives the real advanceMinute loop while the
 * screen is black, so every daily hook fires exactly as if time passed. This
 * module only owns the visual: fade out, run the skip at full black, fade in.
 */

const D = 340;    // fade duration (ms)
const HOLD = 620; // time held fully black (also shows the message)

let el: HTMLElement | null = null;
let busy = false;

export function initFade() {
  el = document.getElementById("fade");
}

/** True while a fade is in progress (callers gate world-time on this). */
export function isFading(): boolean { return busy; }

/**
 * Fade to black, run `atBlack` once fully dark (do the synchronous time skip
 * there), show an optional message, then fade back and call `onDone`.
 */
export function fadeThrough(atBlack: () => void, message = "", onDone?: () => void) {
  if (!el || busy) { atBlack(); onDone?.(); return; }
  busy = true;
  const node = el;
  node.style.transition = `opacity ${D}ms ease`;
  node.style.pointerEvents = "auto";
  node.textContent = "";
  requestAnimationFrame(() => { node.style.opacity = "1"; });

  setTimeout(() => {
    atBlack();
    node.textContent = message;
    setTimeout(() => {
      node.style.opacity = "0";
      setTimeout(() => {
        node.textContent = "";
        node.style.pointerEvents = "none";
        busy = false;
        onDone?.();
      }, D);
    }, HOLD);
  }, D);
}
