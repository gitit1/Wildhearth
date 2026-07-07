/**
 * Shared opening-overlay helpers. Every top-level screen (main menu, character
 * creation, intro, guidance picker, settings, pause, exit) renders into the one
 * `#opening` overlay; these two functions are the common handle to it. The main
 * title screen itself now lives in ui/mainmenu.ts.
 */

export function openingRoot(): HTMLElement {
  return document.getElementById("opening")!;
}

export function hideOpening() {
  const o = openingRoot();
  o.className = "";
  o.style.display = "none";
  o.replaceChildren();
}
