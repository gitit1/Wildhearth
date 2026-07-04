import { openingRoot } from "./titlescreen";

/**
 * New-game-only opening narrative: a short skippable intro text, then the
 * reveal — the overlay clears so the rundown farm is visible before any
 * choice is asked (VISION.md opening sequence, steps 2-3).
 */

/** Placeholder copy — final wording is a content pass, not a blocker. */
const INTRO_TEXT =
  "You arrive with empty pockets and a creased letter: the old family farm " +
  "is yours now. Roof holes, broken fences, a field gone to weeds — but " +
  "yours. Make a living however you can.";

export function showIntro(onDone: () => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel";
  const text = document.createElement("p");
  text.className = "menu-text";
  text.id = "introText";
  text.textContent = INTRO_TEXT;
  const btn = document.createElement("button");
  btn.className = "menu-btn";
  btn.textContent = "Continue";
  const hint = document.createElement("p");
  hint.className = "menu-sub";
  hint.textContent = "(any key skips)";

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    removeEventListener("keydown", onKey, true);
    onDone();
  };
  const onKey = (e: KeyboardEvent) => { e.stopImmediatePropagation(); finish(); };
  addEventListener("keydown", onKey, true);   // any key skips immediately
  btn.addEventListener("click", finish);

  panel.append(text, btn, hint);
  o.append(panel);
}

export function showReveal(onDone: () => void) {
  const o = openingRoot();
  o.className = "reveal";
  o.style.display = "flex";
  o.replaceChildren();

  const bar = document.createElement("div");
  bar.className = "reveal-bar";
  const text = document.createElement("p");
  text.className = "menu-text";
  text.id = "revealText";
  text.textContent = "This is it — great-aunt Mirra's farm. Rundown, patched, and quietly waiting.";
  const btn = document.createElement("button");
  btn.className = "menu-btn";
  btn.id = "btnChoosePath";
  btn.textContent = "Choose your path";
  btn.addEventListener("click", onDone);

  bar.append(text, btn);
  o.append(bar);
}
