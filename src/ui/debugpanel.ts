import type { WorldContext } from "../systems/worldContext";

/**
 * Developer-only World Context inspector (dev-tool block): a rough
 * monospace dump of the live getWorldContext() snapshot, toggled with the
 * backtick key. Not reachable from any player-facing menu — it replaces the
 * throwaway console.log debugging every World Context block used so far.
 */

let box: HTMLElement | null = null;
let visible = false;

export function initDebugPanel() {
  box = document.createElement("pre");
  box.id = "debugPanel";
  box.style.cssText = [
    "position:fixed", "top:8px", "left:8px", "z-index:40", "display:none",
    "max-height:85vh", "max-width:40vw", "overflow:auto", "margin:0",
    "background:rgba(10,12,8,.82)", "color:#9fe89f", "font:11px/1.4 monospace",
    "padding:8px 10px", "border-radius:8px", "pointer-events:none",
  ].join(";");
  document.body.append(box);
  addEventListener("keydown", (e) => {
    if (e.code === "Backquote") {
      visible = !visible;
      box!.style.display = visible ? "block" : "none";
    }
  });
}

/** Feed it the frame's existing snapshot — it never calls getWorldContext itself. */
export function updateDebugPanel(wc: WorldContext) {
  if (!visible || !box) return;
  box.textContent = JSON.stringify(wc, null, 2);
}
