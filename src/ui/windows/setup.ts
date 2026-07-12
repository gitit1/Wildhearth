import {
  WIN_VIEWPORT_MIN_W, WIN_VIEWPORT_MIN_H, WIN_VIEWPORT_FILL, WIN_COZY_FILL,
} from "../../config";
import { wm } from "./manager";
import type { WindowHandle, WindowRect, DockOrientation, DesktopSize } from "./window";
import { clearLayout } from "./layout";

/**
 * Game-specific window wiring: turns the existing DOM into windows on the
 * desktop surface —
 *   • the game viewport (the whole #gameArea: canvas + prompt/dialogue/… ),
 *   • the clock & date window, the coins window, the needs window,
 *   • the icon dock (the tool-button row) with a horizontal/vertical toggle
 *     and a ☰ menu that lists + reopens closed windows.
 *
 * Windows migration I: the six legacy floating panels (backpack / skills /
 * minimap / memory book / shop / gift chooser) are now ALSO real wm windows —
 * each module (src/ui/backpack.ts etc.) creates its own via createWindow() /
 * createScaleWindow(), at various points in main.ts's boot sequence (they
 * depend on game state like economy/skills that isn't ready this early). So
 * boot is two phases: `setupWindows()` here creates the always-present HUD
 * windows only; main.ts calls `finishWindowSetup()` once ALL panel windows
 * exist (after the last of the six init*() calls) to restore the saved
 * layout / lay out Classic — see docs/WINDOW_SYSTEM.md checklist step 7
 * ("create the window before the first layout restore").
 *
 * Windows migration II adds dialogue / debug / day-end summary / in-game
 * settings on top of the same abstraction, plus the Esc cascade
 * (`escCloseTopWindow`, called by main.ts's global Escape handler): the
 * topmost open+closable window that ISN'T the permanent chrome
 * (`CHROME_WINDOW_IDS`) closes; if none is open, Esc falls through to Pause.
 * Because this is exclude-based (not an enumerated include-list), every
 * future migrated window gets Esc-to-close for free.
 */

const GAP = 12;
/** The permanent desktop chrome — never a candidate for the Esc cascade
 *  (closing the viewport via Esc would make Esc "hide the game" instead of
 *  "pause", since a click-to-move click on the canvas focuses the viewport
 *  constantly during normal play) and never swept by the Focus preset. */
const CHROME_WINDOW_IDS = new Set(["viewport", "clock", "coins", "needs", "dock"]);

/** The Esc cascade's entry point (Windows migration II). Closes the topmost
 *  utility window (backpack/skills/…/dialogue/debug/day-end/settings/…) if
 *  one is open; returns false (nothing to close) when only the permanent
 *  chrome is open, so the caller knows to fall through to Pause instead. */
export function escCloseTopWindow(): boolean {
  const top = wm.topmostClosable(CHROME_WINDOW_IDS);
  if (!top) return false;
  top.close();
  return true;
}

let viewportWin: WindowHandle;
let clockWin: WindowHandle;
let coinsWin: WindowHandle;
let needsWin: WindowHandle;
let dockWin: WindowHandle;
let viewportActive = true;

export interface WindowSetupHooks {
  /** main.ts's fit(): resize the canvas backing-store to the viewport window. */
  refitViewport: () => void;
}

export function setupWindows(hooks: WindowSetupHooks): void {
  const gameArea = byId("gameArea");
  // #gameArea fills the viewport window's body (the canvas is inset:0 within it)
  gameArea.classList.add("wh-fill");

  viewportWin = wm.createWindow({
    id: "viewport",
    title: "Wildhearth",
    icon: "🌻",
    content: gameArea,
    resizable: true,
    minW: WIN_VIEWPORT_MIN_W,
    minH: WIN_VIEWPORT_MIN_H,
    autoPlace: false,   // permanent chrome — preset homes, not pop-up spots
    defaultRect: (d) => centered(d.w, d.h, WIN_VIEWPORT_FILL),
    onResize: () => hooks.refitViewport(),
    onMinimize: (min) => { viewportActive = !min && viewportWin.isOpen(); },
    onClose: () => { viewportActive = false; },
    onOpen: () => { viewportActive = true; hooks.refitViewport(); },
  });

  clockWin = wm.createWindow({
    id: "clock", title: "Clock", icon: "🕑",
    content: byId("clockWin"),
    autoPlace: false,
    defaultRect: { x: 0, y: GAP, w: 0, h: 0 }, // repositioned by classicLayout()
  });
  coinsWin = wm.createWindow({
    id: "coins", title: "Coins", icon: "🪙",
    content: byId("coinsWin"),
    autoPlace: false,
    defaultRect: { x: GAP, y: GAP, w: 0, h: 0 },
  });
  needsWin = wm.createWindow({
    id: "needs", title: "Needs", icon: "❤",
    content: byId("needsWin"),
    autoPlace: false,
    defaultRect: { x: GAP, y: 96, w: 0, h: 0 },
  });
  dockWin = wm.createWindow({
    id: "dock", title: "Tools", icon: "🧰",
    content: byId("tools"),
    closable: false,   // never fully closable — guarantees the ☰ reopen path stays reachable
    autoPlace: false,
    defaultRect: { x: 0, y: 0, w: 0, h: 0 },
  });

  wireDockControls();
}

/**
 * Call once every window that should participate in the saved layout has
 * been created — i.e. after the last of the six panel-window init*() calls
 * in main.ts (initShopWindow today). Restores the saved desktop, else lays
 * out "Classic". The manager re-clamps everything into reach (keep-on-screen
 * rescue) either way.
 */
export function finishWindowSetup(): void {
  const saved = wm.loadSavedLayout();
  if (saved) { wm.applyLayout(saved); wm.setDockOrientation(saved.dockOrientation); applyDockOrientation(saved.dockOrientation); }
  else classicLayout();
  wm.clampAll();
}

/** True while the game viewport is visible (normal state). main.ts folds this
 *  into its time-pause gate: a minimized/closed viewport pauses game-time. */
export function isViewportActive(): boolean { return viewportActive; }

// ===========================================================================
//  Dock controls: orientation toggle (⇄) + ☰ hidden-windows menu
// ===========================================================================
function wireDockControls(): void {
  const ctrls = dockWin.el.querySelector<HTMLElement>(".wh-ctrls");
  if (!ctrls) return;

  const orient = mkTitleBtn("⇄", "Toggle dock orientation", () => {
    const next: DockOrientation = wm.getDockOrientation() === "horizontal" ? "vertical" : "horizontal";
    wm.setDockOrientation(next);
    applyDockOrientation(next);
  });
  const menuBtn = mkTitleBtn("☰", "Show hidden windows", (e) => toggleHiddenMenu(menuBtn, e));
  // place them left of the pin/minimize buttons
  ctrls.prepend(menuBtn);
  ctrls.prepend(orient);
}

function applyDockOrientation(o: DockOrientation): void {
  byId("tools").classList.toggle("wh-dock-vertical", o === "vertical");
}

let hiddenMenu: HTMLElement | null = null;
function toggleHiddenMenu(anchor: HTMLElement, _e: Event): void {
  if (hiddenMenu) { hiddenMenu.remove(); hiddenMenu = null; return; }
  const hidden = wm.hiddenWindows();
  const menu = document.createElement("div");
  menu.className = "wh-menu";
  if (hidden.length === 0) {
    const empty = document.createElement("div");
    empty.className = "wh-menu-empty";
    empty.textContent = "No hidden windows";
    menu.appendChild(empty);
  } else {
    for (const h of hidden) {
      const item = document.createElement("button");
      item.className = "wh-menu-item";
      item.textContent = `${h.icon ?? ""} ${h.title}`.trim();
      item.addEventListener("click", () => {
        wm.get(h.id)?.open();
        menu.remove(); hiddenMenu = null;
      });
      menu.appendChild(item);
    }
  }
  document.getElementById("whDesktop")!.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  const deskR = document.getElementById("whDesktop")!.getBoundingClientRect();
  menu.style.left = `${Math.max(4, r.left - deskR.left - 40)}px`;
  menu.style.top = `${r.bottom - deskR.top + 4}px`;
  hiddenMenu = menu;
  // dismiss on the next outside pointerdown
  setTimeout(() => addEventListener("pointerdown", onOutside, { once: true, capture: true }), 0);
  function onOutside(ev: Event) {
    if (hiddenMenu && !hiddenMenu.contains(ev.target as Node) && ev.target !== anchor) {
      hiddenMenu.remove(); hiddenMenu = null;
    } else if (hiddenMenu) {
      addEventListener("pointerdown", onOutside, { once: true, capture: true });
    }
  }
}

// ===========================================================================
//  Presets (COMMIT 2) — Classic / Focus / Cozy / Reset
// ===========================================================================
export type WindowPreset = "classic" | "focus" | "cozy" | "reset";

export function applyWindowPreset(preset: WindowPreset): void {
  switch (preset) {
    case "classic": classicLayout(); break;
    case "focus": focusLayout(); break;
    case "cozy": cozyLayout(); break;
    case "reset": clearLayout(); classicLayout(); break;
  }
}

/** The default arrangement: viewport center-filling; coins top-left, clock
 *  top-right, needs on the left edge, dock bottom-right — echoing the pre-window
 *  HUD so a returning player isn't lost. Windows migration I extends this to
 *  the six panel windows: backpack right side, skills left (under coins/
 *  needs), memory book center-left, minimap top-right under the clock, shop
 *  center, gift near the shop — matching each module's own `defaultRect`
 *  POSITION (their sizes are content-derived, so only x/y are set here). */
function classicLayout(): void {
  const d = wm.desktopSize();
  wm.resetPlacement();   // a preset is a fresh arrangement — future opens auto-place
  allNormal();
  setDock("horizontal");
  viewportWin.setRect(centered(d.w, d.h, WIN_VIEWPORT_FILL));
  const clk = size(clockWin), cn = size(coinsWin), dk = size(dockWin), nd = size(needsWin);
  coinsWin.setRect({ x: GAP, y: GAP });
  clockWin.setRect({ x: d.w - clk.w - GAP, y: GAP });
  needsWin.setRect({ x: GAP, y: GAP + cn.h + GAP });
  dockWin.setRect({ x: d.w - dk.w - GAP, y: d.h - dk.h - GAP });
  layoutPanels(d, clk, cn, nd);
}

/** Viewport maximized; every other window (HUD + any migrated window —
 *  panels, dialogue, debug, day-end, settings, whichever happen to be open)
 *  minimized to bottom title-strips. A window that's already hidden stays
 *  hidden — Focus doesn't pop up a dock strip for a contextual window
 *  (shop/gift/dialogue/…) nobody opened. Exclude-based (like the Esc
 *  cascade), so a future migrated window is swept for free. */
function focusLayout(): void {
  const d = wm.desktopSize();
  setDock("horizontal");
  viewportWin.restore();
  viewportWin.setRect({ x: GAP, y: GAP, w: d.w - 2 * GAP, h: d.h - 2 * GAP });
  clockWin.minimize();
  coinsWin.minimize();
  needsWin.minimize();
  dockWin.minimize();
  for (const h of wm.all()) {
    if (!CHROME_WINDOW_IDS.has(h.id) && h.isOpen()) h.minimize();
  }
}

/** A smaller viewport (~72%) with the HUD + panel windows tiled neatly around it. */
function cozyLayout(): void {
  const d = wm.desktopSize();
  wm.resetPlacement();   // a preset is a fresh arrangement — future opens auto-place
  allNormal();
  setDock("horizontal");
  const vw = Math.round(d.w * WIN_COZY_FILL), vh = Math.round(d.h * WIN_COZY_FILL);
  const vx = Math.round((d.w - vw) / 2), vy = GAP;
  viewportWin.setRect({ x: vx, y: vy, w: vw, h: vh });
  const clk = size(clockWin), cn = size(coinsWin), dk = size(dockWin), nd = size(needsWin);
  coinsWin.setRect({ x: GAP, y: GAP });
  needsWin.setRect({ x: GAP, y: GAP + cn.h + GAP });
  clockWin.setRect({ x: d.w - clk.w - GAP, y: GAP });
  dockWin.setRect({ x: Math.round((d.w - dk.w) / 2), y: d.h - dk.h - GAP });
  layoutPanels(d, clk, cn, nd);
}

/** Shared panel placement for Classic + Cozy (same arrangement; only the
 *  viewport fill differs between the two presets). Backpack + minimap open by
 *  default (matching their pre-migration always-visible feel); skills / memory
 *  book / shop / gift start hidden (matching their pre-migration closed-by-
 *  default feel) — reachable from the dock's ☰ menu or their icon/key. */
function layoutPanels(d: DesktopSize, clk: { w: number; h: number }, cn: { w: number; h: number }, nd: { w: number; h: number }): void {
  const bp = wm.get("backpack"), sk = wm.get("skills"), bk = wm.get("memorybook"),
    mm = wm.get("minimap"), sh = wm.get("shop"), gf = wm.get("gift");
  if (bp) { bp.setPinned(false); bp.restore(); bp.setRect({ x: d.w - bp.rect().w - GAP, y: 236 }); }
  if (mm) { mm.setPinned(false); mm.restore(); mm.setRect({ x: d.w - mm.rect().w - GAP, y: GAP + clk.h + GAP }); }
  if (sk) { sk.setPinned(false); sk.setRect({ x: GAP, y: GAP + cn.h + GAP + nd.h + GAP }); sk.close(); }
  if (bk) { bk.setPinned(false); bk.setRect({ x: Math.round(d.w * 0.22), y: Math.round(d.h * 0.18) }); bk.close(); }
  if (sh) { sh.setPinned(false); sh.setRect({ x: Math.round(d.w * 0.5 - sh.rect().w / 2), y: Math.round(d.h * 0.5 - sh.rect().h / 2) }); sh.close(); }
  if (gf) { gf.setPinned(false); const r = sh?.rect(); gf.setRect({ x: (r?.x ?? 0) + 40, y: (r?.y ?? 0) + 40 }); gf.close(); }
}

function allNormal(): void {
  for (const h of [viewportWin, clockWin, coinsWin, needsWin, dockWin]) {
    h.setPinned(false);
    if (!h.isOpen()) h.restore();
  }
}
function setDock(o: DockOrientation): void { wm.setDockOrientation(o); applyDockOrientation(o); }

// ===========================================================================
//  helpers
// ===========================================================================
function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`windows/setup: #${id} not found`);
  return el;
}
function centered(dw: number, dh: number, fill: number): WindowRect {
  const w = Math.round(dw * fill), h = Math.round(dh * fill);
  return { x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), w, h };
}
function size(h: WindowHandle): { w: number; h: number } {
  const r = h.el.getBoundingClientRect();
  return { w: r.width, h: r.height };
}
function mkTitleBtn(glyph: string, title: string, on: (e: Event) => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "wh-btn";
  b.textContent = glyph;
  b.title = title;
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => { e.stopPropagation(); on(e); });
  return b;
}
