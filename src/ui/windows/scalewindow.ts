import { WIN_PANEL_SCALE_MIN, WIN_PANEL_SCALE_MAX } from "../../config";
import { wm } from "./manager";
import type { WindowHandle, WindowRect, DesktopSize } from "./window";

/**
 * Wires a "scale panel" — a content root whose CSS drives every internal size
 * off one `--s` custom property (the legacy makePanel convention: backpack,
 * skills, memory book, shop, gift chooser) — onto a resizable wm window.
 *
 * The window's own resize handles drive `onResize`; this maps the settled
 * CONTENT width back to a uniform scale relative to the panel's natural size
 * at s=1 (measured once, before the panel is reparented into the window —
 * mirroring the old makePanel comment: size the content first, THEN measure,
 * or you capture the wrong box). Only width feeds the scale (the legacy
 * corner-grip only ever read horizontal drag delta too), so a purely-vertical
 * drag just changes how much of the panel's own scroll region is visible.
 *
 * The default rect's w/h are always exactly the natural (s=1) size — the
 * caller supplies only the default position, per docs/WINDOW_SYSTEM.md's
 * migration checklist ("size to content" for the initial open).
 */
export function createScaleWindow(opts: {
  id: string;
  title: string;
  icon: string;
  content: HTMLElement;
  onScale: (s: number) => void;
  defaultPos: (d: DesktopSize) => { x: number; y: number };
  /** The FIXED spawn home (HUD-A2): where the window opens when the player has
   *  never placed it herself. Defaults to `defaultPos` (its centered/edge home)
   *  — pass an explicit one for size-aware homes (e.g. backpack right-docked).
   *  Every scale window has one, so the free-space grid search is never hit. */
  openAt?: (d: DesktopSize, s: { w: number; h: number }) => { x: number; y: number };
  closable?: boolean;
  /** Fires whenever visibility toggles either way (open/restore -> false,
   *  minimize/close -> true) — the one hook that covers every "became
   *  visible again" path (reopen from hidden AND restore from the dock). */
  onVisibleChange?: (hidden: boolean) => void;
}): WindowHandle {
  opts.onScale(1); // lay out at s=1 (still in its original, unreparented DOM spot) before measuring
  const baseW = opts.content.getBoundingClientRect().width || 200;
  const baseH = opts.content.getBoundingClientRect().height || 120;

  const defaultRect = (d: DesktopSize): WindowRect => ({ ...opts.defaultPos(d), w: baseW, h: baseH });

  return wm.createWindow({
    id: opts.id,
    title: opts.title,
    icon: opts.icon,
    content: opts.content,
    resizable: true,
    // baseW/baseH are the panel's natural CONTENT size — the manager adds the
    // measured chrome (title bar + skin border), so the panel opens at s=1
    // instead of being squeezed below its natural scale by the wood frame.
    contentSized: true,
    minW: Math.round(baseW * WIN_PANEL_SCALE_MIN),
    maxW: Math.round(baseW * WIN_PANEL_SCALE_MAX),
    minH: Math.round(baseH * WIN_PANEL_SCALE_MIN),
    maxH: Math.round(baseH * WIN_PANEL_SCALE_MAX),
    closable: opts.closable,
    defaultRect,
    // fixed home (HUD-A2): explicit openAt, else the panel's own default spot —
    // so a reopened un-user-placed panel never falls through to the edge-seek.
    openAt: opts.openAt ?? ((d) => opts.defaultPos(d)),
    onResize: (cw) => {
      const s = Math.min(WIN_PANEL_SCALE_MAX, Math.max(WIN_PANEL_SCALE_MIN, cw / baseW));
      opts.onScale(s);
    },
    // onMinimize(hidden) fires for every visibility transition — minimize AND
    // close both pass true; open AND restore-from-dock both pass false.
    onMinimize: opts.onVisibleChange,
  });
}
