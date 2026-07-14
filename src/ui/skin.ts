/**
 * UI kit skin loader (R8). Wires the PixelLab-generated UI panels (nine-slice
 * wood/parchment chrome) + the WildhearthStorybook pixel font onto the DOM.
 *
 * STRICTLY DUAL-PATH (CLAUDE.md hard rule #1): the panels are read from the
 * sprite manifest (ids under `ui/`), so with ZERO ui PNGs committed nothing
 * here activates the panel skin and the game keeps its code-drawn CSS chrome.
 * The border-image rules themselves live in index.html gated behind the
 * `.wh-skinned` class this module toggles; the panel URLs are handed to CSS as
 * custom properties (`--skin-*`).
 *
 * The pixel font is a plain committed source asset (not a sprite), so it is
 * applied unconditionally through the `--font-title` custom property with a
 * readable sans fallback baked into the base stylesheet — if the @font-face
 * never loads, titles simply render in the fallback.
 */
import { SPRITE_MANIFEST } from "../assets/pixellab/manifest";
import fontUrl from "../assets/fonts/WildhearthStorybook.ttf?url";
import { wm } from "./windows/manager";

const SANS = "-apple-system,Segoe UI,Roboto,sans-serif";

function uiUrl(id: string): string | null {
  const e = SPRITE_MANIFEST.find((s) => s.id === id);
  return e ? e.url : null;
}

let done = false;

/** Idempotent; call once at boot (main.ts) before the first window is built. */
export function initSkin(): void {
  if (done) return;
  done = true;
  const root = document.documentElement;

  // ---- pixel font (unconditional, natural fallback) ----------------------
  const style = document.createElement("style");
  style.textContent =
    `@font-face{font-family:"WildhearthStorybook";` +
    `src:url(${fontUrl}) format("truetype");font-display:swap}`;
  document.head.appendChild(style);
  root.style.setProperty("--font-title", `"WildhearthStorybook",${SANS}`);

  // ---- nine-slice panels (dual-path: only when the frame shipped) --------
  const frame = uiUrl("ui/window");
  if (!frame) return; // zero-PNG boot → keep the pure-CSS chrome
  const panels: Record<string, string> = {
    "--skin-window": "ui/window",
    "--skin-tooltip": "ui/tooltip",
  };
  for (const [varName, id] of Object.entries(panels)) {
    const u = uiUrl(id);
    if (u) root.style.setProperty(varName, `url(${u})`);
  }
  root.classList.add("wh-skinned");
  // The wood nine-slice is a real border — it changes every window's chrome
  // footprint AFTER windows were already sized. Let the manager re-derive
  // content-sized windows so their content keeps its intended box.
  wm.chromeChanged();
}

/** Portrait bust URL for an NPC, or null when none has shipped yet (the other
 *  8 NPCs). Data-driven: dropping `ui/portraits/<id>.png` in makes it appear.
 *  Callers gracefully render no portrait on null. */
export function npcPortraitUrl(npcId: string): string | null {
  return uiUrl(`ui/portraits/${npcId}`);
}
