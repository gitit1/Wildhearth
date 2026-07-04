/**
 * Title screen: New Game / Continue. Continue loads the existing save and
 * skips the whole opening flow. First screen of VISION.md's opening sequence.
 */

export function openingRoot(): HTMLElement {
  return document.getElementById("opening")!;
}

export function hideOpening() {
  const o = openingRoot();
  o.style.display = "none";
  o.replaceChildren();
}

export function showTitle(hasSave: boolean, onNewGame: () => void, onContinue: () => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel";

  const title = document.createElement("h1");
  title.className = "menu-title";
  title.textContent = "Wildhearth";
  const sub = document.createElement("p");
  sub.className = "menu-sub";
  sub.textContent = "A little farm, a whole life.";

  const newBtn = document.createElement("button");
  newBtn.className = "menu-btn";
  newBtn.id = "btnNewGame";
  newBtn.textContent = "New Game";
  newBtn.addEventListener("click", onNewGame);

  panel.append(title, sub, newBtn);

  if (hasSave) {
    const contBtn = document.createElement("button");
    contBtn.className = "menu-btn";
    contBtn.id = "btnContinue";
    contBtn.textContent = "Continue";
    contBtn.addEventListener("click", onContinue);
    panel.insertBefore(contBtn, newBtn);   // Continue first when a life exists
  }

  o.append(panel);
}
