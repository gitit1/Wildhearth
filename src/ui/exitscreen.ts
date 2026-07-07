import { openingRoot } from "./titlescreen";
import { showFarewell } from "./mainmenu";

/**
 * Exit dialog (Part E #7) — the DECISIONS three: "Exit to main menu" (in-game
 * only), "Exit fully", and "Switch to another game" (greyed, v5). Reached from
 * the title's Exit button (fromGame=false → the menu option is hidden) and from
 * the pause screen's Exit (fromGame=true). "Exit fully" saves, tries
 * window.close(), and — since browsers block that for a tab they didn't open —
 * falls back to the warm farewell screen.
 */

export interface ExitCtx {
  fromGame: boolean;
  onExitToMenu: () => void;        // autosave + return to the title (in-game only)
  onSaveBeforeExit: () => void;    // flush game state before "Exit fully"
  onBack: () => void;              // back to pause (in-game) or the title menu
}

export function showExitDialog(ctx: ExitCtx) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel exit-panel";

  const h1 = document.createElement("h1");
  h1.className = "menu-title";
  h1.textContent = "Leaving already?";

  const col = document.createElement("div");
  col.className = "menu-buttons";

  if (ctx.fromGame) {
    const toMenu = btn("Exit to main menu", "exitToMenu");
    toMenu.addEventListener("click", ctx.onExitToMenu);
    col.append(toMenu);
  }

  const full = btn("Exit fully", "exitFully");
  full.addEventListener("click", () => {
    ctx.onSaveBeforeExit();
    try { window.close(); } catch { /* blocked for non-script-opened tabs */ }
    showFarewell();   // the graceful fallback the player actually sees
  });
  col.append(full);

  const switchGame = btn("Switch to another game", "exitSwitch");
  switchGame.className = "menu-btn mm-btn menu-btn-ghost";
  switchGame.disabled = true;
  switchGame.title = "arrives with multiple characters — v5";
  col.append(switchGame);

  const back = btn("Back", "exitBack");
  back.className = "menu-btn mm-btn menu-btn-ghost";
  back.addEventListener("click", () => { removeEventListener("keydown", onKey, true); ctx.onBack(); });
  col.append(back);

  panel.append(h1, col);
  o.append(panel);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      removeEventListener("keydown", onKey, true);
      ctx.onBack();
    }
  };
  addEventListener("keydown", onKey, true);

  setTimeout(() => full.focus(), 0);
}

function btn(label: string, id: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "menu-btn mm-btn";
  b.id = id;
  b.textContent = label;
  return b;
}
