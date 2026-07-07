import type { WorldContext } from "../systems/worldContext";
import { wm, toggleWindow } from "./windows/manager";
import type { WindowHandle } from "./windows/window";

/**
 * Developer-only World Context inspector window (Windows migration II — dev-
 * tool block): a rough monospace dump of the live getWorldContext() snapshot,
 * toggled with the backtick key exactly as before — now a real (resizable,
 * draggable, closable) wm window instead of a raw fixed `<pre>`. Not
 * reachable from any player-facing menu; it replaces the throwaway
 * console.log debugging every World Context block used so far.
 */

let box: HTMLElement | null = null;
let win: WindowHandle;

export function initDebugPanel() {
  box = document.createElement("pre");
  box.id = "debugPanel";
  box.style.cssText = [
    "margin:0", "width:100%", "height:100%", "box-sizing:border-box", "overflow:auto",
    "background:rgba(10,12,8,.82)", "color:#9fe89f", "font:11px/1.4 monospace",
    "padding:8px 10px",
  ].join(";");

  win = wm.createWindow({
    id: "debug", title: "Debug", icon: "🐞",
    content: box,
    resizable: true, minW: 280, minH: 200, maxW: 900, maxH: 900,
    defaultRect: (d) => ({ x: 8, y: 8, w: Math.min(480, d.w - 16), h: Math.min(520, d.h - 16) }),
  });
  win.close(); // default: hidden

  addEventListener("keydown", (e) => {
    if (e.code === "Backquote") toggleWindow(win);
  });
}

/** An extra debug section (AI quest-offer preview, dev observations). */
export interface DebugSection { title: string; lines: string[]; }

/** Feed it the frame's existing snapshot (+ optional AI sections) — it never
 *  calls getWorldContext itself. */
export function updateDebugPanel(wc: WorldContext, sections: DebugSection[] = []) {
  if (!win.isOpen() || !box) return;
  let out = JSON.stringify(wc, null, 2);
  for (const s of sections) {
    if (!s.lines.length) continue;
    out += `\n\n=== ${s.title} ===\n` + s.lines.join("\n");
  }
  box.textContent = out;
}
