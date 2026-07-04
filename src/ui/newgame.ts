import { openingRoot } from "./titlescreen";
import { drawItemIcon } from "../art/icons";
import { STARTER_SKILL_SEED } from "../config";

/**
 * Starter choice (hoe / rod / instrument) + the tutorial toggle — the last
 * two screens of the opening sequence. The choice grants the tool and seeds
 * its skill; the toggle is a normal, changeable setting.
 */

export type StarterTool = "hoe" | "rod" | "lute";

const CHOICES: Array<{ tool: StarterTool; title: string; blurb: string }> = [
  { tool: "hoe", title: "The Hoe", blurb: `Work the land from day one. +${STARTER_SKILL_SEED} Farming.` },
  { tool: "rod", title: "The Rod", blurb: `Live off the pond's quiet patience. +${STARTER_SKILL_SEED} Fishing.` },
  { tool: "lute", title: "The Lute", blurb: `Sing for your supper at the square. +${STARTER_SKILL_SEED} Busking.` },
];

export function showStarterChoice(onPick: (tool: StarterTool) => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel";
  const head = document.createElement("p");
  head.className = "menu-text";
  head.textContent = "One tool comes with you. The rest you'll earn.";
  const row = document.createElement("div");
  row.className = "choice-row";

  for (const c of CHOICES) {
    const card = document.createElement("div");
    card.className = "choice-card";
    card.id = `pick-${c.tool}`;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 44 * devicePixelRatio;
    cv.style.width = cv.style.height = "44px";
    const g = cv.getContext("2d")!;
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawItemIcon(g, c.tool, 44);
    const h3 = document.createElement("h3");
    h3.textContent = c.title;
    const p = document.createElement("p");
    p.textContent = c.blurb;
    card.append(cv, h3, p);
    card.addEventListener("click", () => onPick(c.tool));
    row.append(card);
  }

  panel.append(head, row);
  o.append(panel);
}

export function showTutorialToggle(onPick: (guided: boolean) => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel";
  const head = document.createElement("p");
  head.className = "menu-text";
  head.textContent = "How would you like to start?";

  const guided = document.createElement("button");
  guided.className = "menu-btn";
  guided.id = "btnGuided";
  guided.textContent = "Guided — short tips as you play";
  guided.addEventListener("click", () => onPick(true));

  const open = document.createElement("button");
  open.className = "menu-btn";
  open.id = "btnOpen";
  open.textContent = "Open — no hand-holding";
  open.addEventListener("click", () => onPick(false));

  const note = document.createElement("p");
  note.className = "menu-sub";
  note.textContent = "A normal setting — you can change it later.";

  panel.append(head, guided, open, note);
  o.append(panel);
}
