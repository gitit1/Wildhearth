/**
 * The Window abstraction (UO-classic client style). Everything on screen is a
 * window: draggable by its title bar, resizable from edges + corners,
 * minimizable to a bottom title-strip, closable (hidden, reopenable from the
 * icon dock), z-ordered by focus, gently snapping to edges/other windows. The
 * game viewport itself is a window on a desktop surface.
 *
 * This file is types only. The chrome + behavior live in manager.ts; the
 * persistence in layout.ts; the game-specific windows (viewport / clock /
 * coins / needs / dock) in setup.ts. To add a new window type, follow the
 * checklist in docs/WINDOW_SYSTEM.md — it is exactly the shape of a WindowSpec.
 */

/** A window's on-desktop geometry, in CSS px relative to the desktop surface. */
export interface WindowRect { x: number; y: number; w: number; h: number }

/** Lifecycle state. `normal` = shown at its rect; `minimized` = collapsed to a
 *  title-strip in the bottom dock; `hidden` = closed (reopen from the ☰ menu). */
export type WindowState = "normal" | "minimized" | "hidden";

export type DesktopSize = { w: number; h: number };

/**
 * The declaration handed to the manager to build a window. `content` is the
 * element hosting the body (for the viewport this is the whole #gameArea, for
 * HUD windows a small wrapper). `defaultRect` is the "Classic" layout position;
 * it may be a function so it can be derived from the live desktop size.
 */
export interface WindowSpec {
  id: string;
  title: string;
  icon?: string;
  content: HTMLElement;
  /** Min/max CONTENT size (px). The title bar height is added on top. */
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  resizable?: boolean;    // default false — HUD windows size to content
  closable?: boolean;     // default true
  minimizable?: boolean;  // default true
  pinnable?: boolean;     // default true
  /** Where the window sits in the default ("Classic") layout. */
  defaultRect: WindowRect | ((desk: DesktopSize) => WindowRect);
  /** Runtime OPEN placement (the "logical order" rule). When a window opens
   *  (hidden → normal) and the player has never dragged/resized it herself,
   *  the manager auto-places it instead of trusting a possibly-stale rect:
   *  centered on the desktop by default, cascading +26px per already-open
   *  window so nothing lands exactly on top of anything else, always clamped
   *  fully on-screen. `autoPlace: false` opts out (the permanent HUD chrome —
   *  clock/coins/needs/dock/viewport — has preset homes, not pop-up spots).
   *  `openAt` overrides the centered base for windows with a natural anchor
   *  (dialogue = bottom-center, minimap = top-right, debug = top-left). */
  autoPlace?: boolean;    // default true
  openAt?: (desk: DesktopSize, size: { w: number; h: number }) => { x: number; y: number };
  /** Fired after a resize settles the content box (viewport uses it to refit
   *  the canvas + camera). cw/ch are the CONTENT box in CSS px. */
  onResize?: (cw: number, ch: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMinimize?: (minimized: boolean) => void;
  onFocus?: () => void;
}

/** The handle returned to callers — imperative control over one window. */
export interface WindowHandle {
  id: string;
  /** The outer `.wh-window` frame element. */
  el: HTMLElement;
  open(): void;
  close(): void;
  minimize(): void;
  restore(): void;
  /** open() if hidden/minimized, else close(). */
  toggle(): void;
  focus(): void;
  setTitle(title: string): void;
  isOpen(): boolean;        // state === "normal"
  isMinimized(): boolean;
  isHidden(): boolean;
  state(): WindowState;
  pinned(): boolean;
  setPinned(v: boolean): void;
  rect(): WindowRect;
  /** Move/resize (partial), clamped + persisted. */
  setRect(r: Partial<WindowRect>): void;
}

/** One window's persisted layout row. */
export interface WindowLayout {
  x: number;
  y: number;
  w?: number;   // only stored for resizable windows
  h?: number;
  state: WindowState;
  pinned?: boolean;
  /** Snapshot of the window's z at save time (Windows migration II "stable
   *  z-order after reload" polish) — `applyLayout` re-focuses normal-state
   *  windows in ascending-z order, so the one that was on top before a reload
   *  ends up on top again. Optional/omittable for forward-compat with older
   *  saved layouts (missing => treated as 0, falling back to creation order,
   *  which is what every layout did before this field existed). */
  z?: number;
  /** True once the PLAYER has dragged or resized this window herself — her
   *  placement then survives reopen (auto-place skips it). Program-driven
   *  setRect / presets never set it; presets clear it. Optional for
   *  forward-compat with older layouts (missing => not user-placed, so every
   *  pre-existing scattered rect heals itself on the next open). */
  up?: boolean;
}

/** The whole persisted layout (WIN_LAYOUT_KEY). Per-slot forward-compat: the
 *  `slot` field + the key are ready to gain a `-slotN` suffix when v5 ships
 *  multiple save slots (see docs/WINDOW_SYSTEM.md §Persistence). */
export interface LayoutStore {
  version: number;
  slot: number;
  windows: Record<string, WindowLayout>;
  dockOrientation: DockOrientation;
}

export type DockOrientation = "horizontal" | "vertical";

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));
