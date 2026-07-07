import { screenShell } from "./screen";
import { HELP_PAGES } from "../data/help";

/**
 * Help / Guide screen (Part E #3) — short paged guidance for the lost player.
 * A row of tabs (one per page) drives a single content pane; the content is
 * data (data/help.ts) so pages can be edited without touching this file.
 */

export function showHelp(onBack: () => void) {
  const { body } = screenShell("Help & Guide", onBack);

  const tabs = document.createElement("div");
  tabs.className = "help-tabs";
  const pane = document.createElement("div");
  pane.className = "help-pane";

  const tabBtns: HTMLButtonElement[] = [];

  const render = (idx: number) => {
    const page = HELP_PAGES[idx]!;
    tabBtns.forEach((b, i) => b.classList.toggle("active", i === idx));
    pane.replaceChildren();

    const intro = document.createElement("p");
    intro.className = "help-intro";
    intro.textContent = page.intro;
    pane.append(intro);

    const ul = document.createElement("ul");
    ul.className = "help-points";
    for (const point of page.points) {
      const li = document.createElement("li");
      li.textContent = point;
      ul.append(li);
    }
    pane.append(ul);
  };

  HELP_PAGES.forEach((page, i) => {
    const b = document.createElement("button");
    b.className = "help-tab";
    b.innerHTML = "";
    const ic = document.createElement("span");
    ic.className = "help-tab-ic";
    ic.textContent = page.icon;
    const tx = document.createElement("span");
    tx.textContent = page.title;
    b.append(ic, tx);
    b.addEventListener("click", () => render(i));
    tabs.append(b);
    tabBtns.push(b);
  });

  body.append(tabs, pane);
  render(0);
}
