import { openingRoot } from "./titlescreen";

/**
 * Pause screen (Part E #6) — opened in-game by Esc or the ⏸ HUD button; main.ts
 * freezes game-time while it's up (the same gate dialogue uses). A dimmed scrim
 * lets the frozen farm show through behind the panel. Buttons: Resume / Save /
 * Settings / Return to Main Menu / Exit. Pure DOM; main.ts wires the actions.
 */

export interface PauseCtx {
  onResume: () => void;
  onSave: () => void;              // returns; the panel flashes "Saved ✓"
  onSettings: () => void;
  onReturnToMenu: () => void;
  onExit: () => void;
}

export function showPause(ctx: PauseCtx) {
  const o = openingRoot();
  o.className = "paused";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel pause-panel";

  const h1 = document.createElement("h1");
  h1.className = "menu-title";
  h1.textContent = "Paused";

  const col = document.createElement("div");
  col.className = "menu-buttons pause-buttons";

  // Esc resumes. Declared before the buttons below so every OTHER way of
  // leaving this screen (Resume/Settings/Return to Menu/Exit, all clicked
  // with the mouse) can also clean it up — otherwise a pause dismissed by
  // clicking (rather than Esc) leaked this capture-phase listener forever;
  // the next Esc press anywhere in the game would be silently swallowed by
  // it (stopImmediatePropagation + a harmless extra onResume()) instead of
  // reopening Pause, and it'd take one "wasted" Esc press per leaked
  // listener before the shortcut worked again.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      removeEventListener("keydown", onKey, true);
      ctx.onResume();
    }
  };
  addEventListener("keydown", onKey, true);
  /** Any button that navigates away from THIS pause screen must drop the
   *  listener above first (Save is the one exception — it stays on Pause). */
  const leaving = (fn: () => void) => () => { removeEventListener("keydown", onKey, true); fn(); };

  const resume = btn("Resume", "pauseResume");
  resume.addEventListener("click", leaving(ctx.onResume));

  const save = btn("Save", "pauseSave");
  const feedback = document.createElement("div");
  feedback.className = "pause-feedback";
  save.addEventListener("click", () => {
    ctx.onSave();
    feedback.textContent = "Saved ✓";
    setTimeout(() => { feedback.textContent = ""; }, 2500);
  });

  const settings = btn("Settings", "pauseSettings");
  settings.addEventListener("click", leaving(ctx.onSettings));

  const menu = btn("Return to Main Menu", "pauseToMenu");
  menu.addEventListener("click", leaving(ctx.onReturnToMenu));

  const exit = btn("Exit", "pauseExit");
  exit.className = "menu-btn mm-btn menu-btn-ghost";
  exit.addEventListener("click", leaving(ctx.onExit));

  col.append(resume, save, settings, menu, exit);
  panel.append(h1, col, feedback);
  o.append(panel);

  setTimeout(() => resume.focus(), 0);
}

function btn(label: string, id: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "menu-btn mm-btn";
  b.id = id;
  b.textContent = label;
  return b;
}
