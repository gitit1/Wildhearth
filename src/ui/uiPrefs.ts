import { loadSettings } from "../systems/settings";

/**
 * Applies the Interface settings (Part E #3) to the live DOM. Two entry points:
 *
 *  - applyGlobalPrefs() sets classes/attributes on <html> for the font scale,
 *    high-contrast mode, and the colorblind palette hook. These are read by the
 *    CSS in index.html (:root.font-large / :root.high-contrast / :root[data-cb]).
 *  - applyHudPrefs() shows/hides the three optional HUD widgets.
 *
 * Both read straight from settings.ts, so callers just persist the setting then
 * call the matching apply function. main.ts calls both once at startup; the
 * Settings screen calls them again on every relevant change.
 */

export function applyGlobalPrefs() {
  const s = loadSettings();
  const root = document.documentElement;
  root.classList.toggle("font-large", s.fontSize === "large");
  root.classList.toggle("high-contrast", s.highContrast);
  // Colorblind palette hook: v1 only STORES the choice and stamps it here as a
  // data attribute. When the palettes land, the game's color tokens gain
  // `:root[data-cb="deuteranopia"]` / `[data-cb="protanopia"]` overrides — this
  // is the single attachment point, no other code needs to change.
  root.setAttribute("data-cb", s.colorblind);
}

export function applyHudPrefs() {
  const s = loadSettings();
  const set = (id: string, show: boolean) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "" : "none";
  };
  set("needsStrip", s.hudNeeds);
  set("minimapBox", s.hudMinimap);
  set("clockDial", s.hudClock);
}
