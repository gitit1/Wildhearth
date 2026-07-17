import {
  WIN_VIEWPORT_MIN_W, WIN_VIEWPORT_MIN_H, WIN_VIEWPORT_FILL, WIN_COZY_FILL,
  WIN_ANCHOR_MARGIN, RADAR_H,
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
const CHROME_WINDOW_IDS = new Set(["viewport", "info", "needs", "dock", "radar"]);

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
let infoWin: WindowHandle;
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

  // The info box (HUD-A1): the clock dial + date/weather + the coin count are
  // ONE anchored window, top-right. The coins pill is folded into #hudInfo
  // (below date & weather); its old #coinsWin host is emptied and removed so no
  // stray pill floats in the page body.
  const coinsPill = byId("coinsWin").firstElementChild;
  if (coinsPill) { coinsPill.classList.add("hud-coins"); byId("hudInfo").appendChild(coinsPill); }
  byId("coinsWin").remove();
  infoWin = wm.createWindow({
    id: "info", title: "Info", icon: "🕑",
    content: byId("clockWin"),   // dial + date/weather + coins, laid out as one box
    anchor: "top-right",
    defaultRect: { x: 0, y: GAP, w: 0, h: 0 },
  });

  // The needs cluster (HUD-A1): anchored directly above the taskbar.
  needsWin = wm.createWindow({
    id: "needs", title: "Needs", icon: "❤",
    content: byId("needsWin"),
    anchor: "above-dock",
    defaultRect: { x: GAP, y: 96, w: 0, h: 0 },
  });

  // The taskbar (HUD-A1): the tool-button row, anchored bottom-center, NO title
  // bar. The dock must be created BEFORE the needs cluster? No — `above-dock`
  // recomputes the dock's own anchor on demand, so order is irrelevant.
  dockWin = wm.createWindow({
    id: "dock", title: "Tools", icon: "🧰",
    content: byId("tools"),
    closable: false,   // belt-and-braces: anchored windows are already non-closable
    anchor: "bottom-center",
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
  // The ☰ hidden-windows menu is now a 9th taskbar button at the END of the
  // tool row (HUD-A1). The old orientation ⇄ toggle is gone — the anchored
  // taskbar is always a single horizontal row.
  const tools = byId("tools");
  if (tools.querySelector("#hiddenBtn")) return;   // idempotent
  const menuBtn = document.createElement("button");
  menuBtn.className = "tool-btn";
  menuBtn.id = "hiddenBtn";
  menuBtn.textContent = "☰";
  menuBtn.title = "Show hidden windows";
  menuBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleHiddenMenu(menuBtn, e); });
  tools.appendChild(menuBtn);
}

function applyDockOrientation(_o: DockOrientation): void {
  // The taskbar is always horizontal now (HUD-A1) — the vertical dock mode was
  // dropped with the ⇄ toggle. Kept as a no-op so presets / saved layouts that
  // still carry a dockOrientation don't need special-casing.
  byId("tools").classList.remove("wh-dock-vertical");
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
  const menuH = menu.getBoundingClientRect().height;
  menu.style.left = `${Math.max(4, r.left - deskR.left - 40)}px`;
  // the ☰ button lives on the BOTTOM taskbar now — open the menu UPWARD (above
  // the button) so it isn't clipped off the bottom of the screen.
  const above = (r.bottom - deskR.top + menuH + 8) > deskR.height;
  menu.style.top = above
    ? `${Math.max(4, r.top - deskR.top - menuH - 4)}px`
    : `${r.bottom - deskR.top + 4}px`;
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

/** The default arrangement (HUD-A1/A2 "the tidied UO desk"): a center-filling
 *  viewport, with the ANCHORED chrome — info box top-right, radar top-left,
 *  needs cluster above the bottom taskbar — positioning ITSELF from the desktop
 *  edges (the manager owns those spots, so this preset never places them). The
 *  content windows get their fixed homes: backpack docked right, skills/memory
 *  book/quests to the left edge (closed), map/shop/gift centered (closed). */
function classicLayout(): void {
  const d = wm.desktopSize();
  wm.resetPlacement();   // a preset is a fresh arrangement — future opens use fixed homes
  allNormal();
  setDock("horizontal");
  viewportWin.setRect(centered(d.w, d.h, WIN_VIEWPORT_FILL));
  wm.clampAll();         // re-derive every anchored chrome window to the fresh edges
  layoutPanels(d);
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
  // The anchored chrome (info/needs/taskbar/radar) can't be minimized — it
  // stays pinned to the edges; Focus just closes the content windows so the
  // game fills the screen with only the minimal chrome around it.
  for (const h of wm.all()) {
    if (!CHROME_WINDOW_IDS.has(h.id) && h.isOpen()) h.minimize();
  }
  wm.clampAll();
}

/** A smaller viewport (~72%) with the panel windows tiled around it; the
 *  anchored chrome self-positions at the edges (same as Classic). */
function cozyLayout(): void {
  const d = wm.desktopSize();
  wm.resetPlacement();   // a preset is a fresh arrangement — future opens use fixed homes
  allNormal();
  setDock("horizontal");
  const vw = Math.round(d.w * WIN_COZY_FILL), vh = Math.round(d.h * WIN_COZY_FILL);
  viewportWin.setRect({ x: Math.round((d.w - vw) / 2), y: GAP, w: vw, h: vh });
  wm.clampAll();         // re-derive every anchored chrome window to the fresh edges
  layoutPanels(d);
}

/** Shared panel placement for Classic + Cozy. The content windows get their
 *  fixed homes (HUD-A2): backpack docked to the RIGHT edge (open by default),
 *  the left-panel group (skills / memory book / quests) to the LEFT-edge zone
 *  below the radar (closed), the world map + shop + gift centered (closed). The
 *  anchored chrome — radar/info/needs/taskbar — owns its own spot, so this only
 *  restores the radar and never places it. */
function layoutPanels(d: DesktopSize): void {
  const bp = wm.get("backpack"), sk = wm.get("skills"), bk = wm.get("memorybook"),
    q = wm.get("quests"), mm = wm.get("minimap"), sh = wm.get("shop"), gf = wm.get("gift");
  // the big world map: centered (a consult-and-close overview), CLOSED by default
  if (mm) { mm.setPinned(false); mm.setRect({ x: Math.round((d.w - mm.rect().w) / 2), y: Math.round((d.h - mm.rect().h) / 2) }); mm.close(); }
  // the corner RADAR: anchored top-left — the manager pins it; just ensure it's shown
  const rd = wm.get("radar");
  if (rd) { rd.restore(); }
  // backpack: docked to the RIGHT edge, vertically centered, OPEN by default
  if (bp) { bp.setPinned(false); bp.restore(); bp.setRect({ x: d.w - bp.rect().w - GAP, y: Math.round((d.h - bp.rect().h) / 2) }); }
  // skills / memory book / quests: the LEFT-edge home zone, CLOSED by default
  const lx = GAP, ly = LEFT_PANEL_ZONE_Y;
  if (sk) { sk.setPinned(false); sk.setRect({ x: lx, y: ly }); sk.close(); }
  if (bk) { bk.setPinned(false); bk.setRect({ x: lx, y: ly }); bk.close(); }
  if (q)  { q.setPinned(false);  q.setRect({ x: lx, y: ly }); q.close(); }
  // shop / gift: centered, CLOSED by default
  if (sh) { sh.setPinned(false); sh.setRect({ x: Math.round(d.w * 0.5 - sh.rect().w / 2), y: Math.round(d.h * 0.5 - sh.rect().h / 2) }); sh.close(); }
  if (gf) { gf.setPinned(false); const r = sh?.rect(); gf.setRect({ x: (r?.x ?? 0) + 40, y: (r?.y ?? 0) + 40 }); gf.close(); }
}

function allNormal(): void {
  for (const h of [viewportWin, infoWin, needsWin, dockWin]) {
    h.setPinned(false);
    if (!h.isOpen()) h.restore();
  }
}

// ===========================================================================
//  Fixed spawn homes (HUD-A2) — the left-panel cascade shared by skills /
//  memory book / quests, so each opens at the same LEFT-edge zone and cascades
//  by (24,24) per already-open sibling (never an exact stack, never a scatter).
// ===========================================================================
/** Y of the left-edge panel zone — below the anchored top-left radar. */
export const LEFT_PANEL_ZONE_Y = WIN_ANCHOR_MARGIN + RADAR_H + GAP + GAP;

/** The `openAt` home for a left-edge panel (skills/memorybook/quests): the
 *  left zone, offset (24,24) for each OTHER sibling already open, so opening a
 *  second/third never lands exactly on the first. */
export function leftPanelAnchor(selfId: string, _d: DesktopSize, _s: { w: number; h: number }): { x: number; y: number } {
  let open = 0;
  for (const id of ["skills", "memorybook", "quests"]) {
    if (id === selfId) continue;
    const h = wm.get(id);
    if (h && h.isOpen()) open++;
  }
  const step = 24 * open;
  return { x: GAP + step, y: LEFT_PANEL_ZONE_Y + step };
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
