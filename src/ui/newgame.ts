import { openingRoot } from "./titlescreen";
import { drawItemIcon } from "../art/icons";
import { PATHS, LIFE_GOALS } from "../data/paths";
import type { Path, LifeGoal } from "../systems/meta";

/**
 * The Starting-Path + Life-goal screen — shown AFTER the intro + farm reveal so
 * the choice reads as a reaction to seeing the rundown place (VISION opening
 * sequence). Four path cards (each grants a kit + seeds a skill in
 * newGameReset) and five life-goal chips. The Guidance-Mode picker follows.
 */

export function showPathAndGoal(onDone: (path: Path, lifeGoal: LifeGoal) => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  let path: Path = "fisher";
  let goal: LifeGoal = "independence";

  const panel = document.createElement("div");
  panel.className = "menu-panel cc-panel";

  const h1 = document.createElement("h1");
  h1.className = "menu-title cc-title";
  h1.textContent = "What will you be?";
  const intro = document.createElement("p");
  intro.className = "menu-text";
  intro.textContent = "The farm's yours now. Where do you begin — and what are you reaching for?";

  // ---- path cards ----
  const pathHead = sectionHead("Your starting path");
  const row = document.createElement("div");
  row.className = "choice-row cc-wrap";
  const pathCards: Array<{ id: Path; el: HTMLElement }> = [];
  for (const p of PATHS) {
    const card = document.createElement("div");
    card.className = "choice-card";
    card.id = `path-${p.id}`;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 44 * devicePixelRatio;
    cv.style.width = cv.style.height = "44px";
    const g = cv.getContext("2d")!;
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawItemIcon(g, p.iconId, 44);
    const h3 = document.createElement("h3");
    h3.textContent = p.title;
    const blurb = document.createElement("p");
    blurb.textContent = p.blurb;
    const note = document.createElement("p");
    note.className = "cc-note";
    note.textContent = p.note;
    card.append(cv, h3, blurb, note);
    card.addEventListener("click", () => { path = p.id; syncPaths(); });
    row.append(card);
    pathCards.push({ id: p.id, el: card });
  }
  const syncPaths = () => pathCards.forEach((c) => c.el.classList.toggle("sel", c.id === path));
  syncPaths();

  // ---- life-goal chips ----
  const goalHead = sectionHead("Your dream");
  const goalRow = document.createElement("div");
  goalRow.className = "goal-row";
  const goalChips: Array<{ id: LifeGoal; el: HTMLElement }> = [];
  for (const gDef of LIFE_GOALS) {
    const chip = document.createElement("button");
    chip.className = "cc-goal";
    chip.id = `goal-${gDef.id}`;
    chip.title = gDef.blurb;
    const t = document.createElement("span");
    t.className = "cc-goal-title";
    t.textContent = gDef.title;
    const b = document.createElement("span");
    b.className = "cc-goal-blurb";
    b.textContent = gDef.blurb;
    chip.append(t, b);
    chip.addEventListener("click", () => { goal = gDef.id; syncGoals(); });
    goalRow.append(chip);
    goalChips.push({ id: gDef.id, el: chip });
  }
  const syncGoals = () => goalChips.forEach((c) => c.el.classList.toggle("sel", c.id === goal));
  syncGoals();

  const begin = document.createElement("button");
  begin.className = "menu-btn";
  begin.id = "btnBegin";
  begin.textContent = "Begin your life";
  begin.addEventListener("click", () => onDone(path, goal));

  panel.append(h1, intro, pathHead, row, goalHead, goalRow, begin);
  o.append(panel);
}

function sectionHead(text: string): HTMLElement {
  const h = document.createElement("div");
  h.className = "cc-section-head";
  h.textContent = text;
  return h;
}
