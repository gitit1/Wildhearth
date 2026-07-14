import {
  WIN_SNAP_DIST, WIN_TITLEBAR_H, WIN_RESIZE_HANDLE, WIN_MIN_VISIBLE,
  WIN_MIN_W, WIN_MIN_H,
} from "../../config";
import {
  clamp, type WindowSpec, type WindowHandle, type WindowRect, type WindowState,
  type LayoutStore, type WindowLayout, type DockOrientation, type DesktopSize,
} from "./window";
import { loadLayout, saveLayoutDebounced, saveLayoutNow } from "./layout";

/**
 * The window manager (COMMIT 1 core). Owns the desktop surface, the z-order
 * stack, the bottom dock of minimized strips, and every window's chrome +
 * drag/resize/minimize/close/pin/snap behavior. See docs/WINDOW_SYSTEM.md for
 * the internals and the "add a new window" checklist.
 *
 * All pointer interaction uses pointer events + setPointerCapture, so touch is
 * covered by the same code paths. Nothing runs per animation frame — the
 * manager is entirely event-driven, idle when the player isn't dragging.
 */

interface Managed {
  spec: WindowSpec;
  handle: WindowHandle;
  frame: HTMLElement;
  titlebar: HTMLElement;
  body: HTMLElement;
  normalRect: WindowRect;   // the last on-desktop rect (restore target)
  state: WindowState;
  pinned: boolean;
  z: number;
  /** The player dragged/resized this window herself — reopen keeps her spot
   *  instead of auto-placing. Persisted (`up` in the layout row). */
  userPlaced: boolean;
  /** The player resized this window herself — her size survives reloads.
   *  Persisted (`us`). Un-sized windows re-derive their size from the spec
   *  default on boot (the self-heal for stale persisted sizes). */
  userSized: boolean;
}

class WindowManager {
  private desktop!: HTMLElement;
  private dock!: HTMLElement;
  private ready = false;
  private topZ = 10;
  private readonly wins = new Map<string, Managed>();
  private dockOrientation: DockOrientation = "horizontal";
  private onLayoutChange?: () => void;

  /** Idempotent; called by the first createWindow(). Builds the desktop layer
   *  (a code-drawn wood/leather surface) and the bottom dock row. */
  private ensure(): void {
    if (this.ready) return;
    let desk = document.getElementById("whDesktop");
    if (!desk) {
      desk = document.createElement("div");
      desk.id = "whDesktop";
      // insert as the FIRST body child so it sits behind the fixed modal
      // overlays (#opening / #eodPanel / #fade …) which keep their own z-index.
      document.body.insertBefore(desk, document.body.firstChild);
    }
    this.desktop = desk;
    let dock = document.getElementById("whDock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "whDock";
      desk.appendChild(dock);
    }
    this.dock = dock;
    addEventListener("resize", () => this.onDesktopResize());
    this.ready = true;
  }

  private deskSize(): DesktopSize {
    return { w: this.desktop.clientWidth, h: this.desktop.clientHeight };
  }

  setLayoutChangeListener(fn: () => void): void { this.onLayoutChange = fn; }

  // ---- keep-on-screen clamp (the "off-screen rescue" edge case) -----------
  /** A window that FITS the desktop stays entirely inside it (no more windows
   *  half-hanging off the edge — the mobile clipping complaint). Only a window
   *  genuinely BIGGER than the desktop falls back to the old lenient rule: at
   *  least WIN_MIN_VISIBLE px of title bar stays grabbable horizontally, and
   *  the title bar's top stays within the desktop vertically. */
  private clampRect(r: WindowRect): WindowRect {
    const { w: dw, h: dh } = this.deskSize();
    const x = r.w <= dw
      ? clamp(r.x, 0, dw - r.w)
      : clamp(r.x, WIN_MIN_VISIBLE - r.w, dw - WIN_MIN_VISIBLE);
    const y = clamp(r.y, 0, Math.max(0, dh - (r.h > 0 && r.h <= dh ? r.h : WIN_TITLEBAR_H)));
    return { x, y, w: r.w, h: r.h };
  }

  /** clampRect with the window's REAL footprint: resizable windows first cap
   *  w/h to the desktop (a 720px Settings shrinks onto a 390px phone; its body
   *  scrolls), auto-sized windows substitute their measured frame box for the
   *  meaningless stored w/h (0 for the HUD windows). */
  private clampFor(m: Managed, r: WindowRect): WindowRect {
    const { w: dw, h: dh } = this.deskSize();
    if (m.spec.resizable ?? false) {
      const w = Math.min(r.w, dw), h = Math.min(r.h, dh);
      return this.clampRect({ x: r.x, y: r.y, w, h });
    }
    const live = this.liveSize(m);
    const c = this.clampRect({ x: r.x, y: r.y, w: live.w || r.w, h: live.h || r.h });
    return { x: c.x, y: c.y, w: r.w, h: r.h };   // keep the stored w/h untouched
  }

  /** The MEASURED chrome around the content box: title bar + any skin border
   *  (the PixelLab wood frame is a real border-image that steals interior
   *  space). Falls back to the bare title bar when the frame isn't laid out
   *  (display:none / pre-append). */
  private chromeSize(m: Managed): { w: number; h: number } {
    const fr = m.frame.getBoundingClientRect();
    const br = m.body.getBoundingClientRect();
    if (fr.width > 0 && br.width > 0 && fr.height > 0 && br.height > 0)
      return { w: Math.round(fr.width - br.width), h: Math.round(fr.height - br.height) };
    return { w: 0, h: WIN_TITLEBAR_H };
  }

  /** For a contentSized spec, converts a rect whose w/h mean "content box"
   *  into the FRAME rect the manager actually lays out. */
  private frameRectFor(m: Managed, r: WindowRect): WindowRect {
    if (!(m.spec.contentSized ?? false) || !(m.spec.resizable ?? false)) return r;
    const c = this.chromeSize(m);
    return { x: r.x, y: r.y, w: r.w + c.w, h: r.h + c.h };
  }

  private resolveDefault(spec: WindowSpec): WindowRect {
    const d = typeof spec.defaultRect === "function" ? spec.defaultRect(this.deskSize()) : spec.defaultRect;
    return { ...d };
  }

  // =========================================================================
  //  Window creation
  // =========================================================================
  createWindow(spec: WindowSpec): WindowHandle {
    this.ensure();
    const resizable = spec.resizable ?? false;
    const closable = spec.closable ?? true;
    const minimizable = spec.minimizable ?? true;
    const pinnable = spec.pinnable ?? true;

    const frame = document.createElement("div");
    frame.className = "wh-window" + (resizable ? " wh-resizable" : "");
    frame.dataset.win = spec.id;

    const titlebar = document.createElement("div");
    titlebar.className = "wh-titlebar";
    const titleWrap = document.createElement("div");
    titleWrap.className = "wh-title";
    const icon = document.createElement("span");
    icon.className = "wh-icon";
    icon.textContent = spec.icon ?? "";
    const titleText = document.createElement("span");
    titleText.className = "wh-title-text";
    titleText.textContent = spec.title;
    titleWrap.append(icon, titleText);
    const ctrls = document.createElement("div");
    ctrls.className = "wh-ctrls";
    titlebar.append(titleWrap, ctrls);

    const body = document.createElement("div");
    body.className = "wh-body";
    body.appendChild(spec.content);

    frame.append(titlebar, body);

    const rect = this.resolveDefault(spec);
    const managed: Managed = {
      spec, frame, titlebar, body,
      normalRect: rect, state: "normal", pinned: false, z: 0, userPlaced: false, userSized: false,
      handle: undefined as unknown as WindowHandle,
    };

    // ---- title-bar control buttons -----------------------------------------
    const mkBtn = (glyph: string, title: string, on: () => void): HTMLButtonElement => {
      const b = document.createElement("button");
      b.className = "wh-btn";
      b.textContent = glyph;
      b.title = title;
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => { e.stopPropagation(); on(); });
      return b;
    };
    const handle = this.buildHandle(managed);
    managed.handle = handle;
    this.wins.set(spec.id, managed);

    if (pinnable) ctrls.appendChild(mkBtn("⚲", "Pin (lock position/size)", () => handle.setPinned(!managed.pinned)));
    if (minimizable) ctrls.appendChild(mkBtn("—", "Minimize", () => handle.minimize()));
    if (closable) ctrls.appendChild(mkBtn("✕", "Close", () => handle.close()));

    // ---- resize handles (edges + corners), invisible ~6px grab bands -------
    if (resizable) this.addResizeHandles(managed);

    // ---- focus on any pointerdown (brings to front) ------------------------
    frame.addEventListener("pointerdown", () => this.focus(spec.id), true);

    // ---- drag from the title bar (or restore, when minimized) --------------
    this.wireDrag(managed);

    this.desktop.appendChild(frame);
    // clampFor, not the raw default: a window created mid-play on a small
    // screen (Settings is built lazily on first open) must land on-screen,
    // capped to the desktop, from its very first frame.
    this.applyRect(managed, this.clampFor(managed, this.frameRectFor(managed, rect)));
    this.focus(spec.id);
    spec.onOpen?.();
    return handle;
  }

  private buildHandle(m: Managed): WindowHandle {
    const self = this;
    return {
      id: m.spec.id,
      el: m.frame,
      open() { self.setState(m, "normal"); },
      close() { self.setState(m, "hidden"); },
      minimize() { self.setState(m, "minimized"); },
      restore() { self.setState(m, "normal"); },
      toggle() { m.state === "normal" ? self.setState(m, "hidden") : self.setState(m, "normal"); },
      focus() { self.focus(m.spec.id); },
      setTitle(t: string) {
        m.spec.title = t;
        const el = m.titlebar.querySelector<HTMLElement>(".wh-title-text");
        if (el) el.textContent = t;
      },
      isOpen() { return m.state === "normal"; },
      isMinimized() { return m.state === "minimized"; },
      isHidden() { return m.state === "hidden"; },
      state() { return m.state; },
      pinned() { return m.pinned; },
      rect() { return { ...m.normalRect }; },
      setRect(r) {
        const next: WindowRect = { ...m.normalRect, ...r };
        self.applyRect(m, self.clampFor(m, next), true);
        self.persist();
      },
      setPinned(v: boolean) { self.setPinned(m, v); },
    };
  }

  // =========================================================================
  //  Geometry
  // =========================================================================
  /** Applies a rect to a NORMAL-state window (position:absolute layout) and
   *  fires the content-resize callback. */
  private applyRect(m: Managed, r: WindowRect, fireResize = false): void {
    m.normalRect = { ...r };
    m.frame.style.left = `${r.x}px`;
    m.frame.style.top = `${r.y}px`;
    if (m.spec.resizable ?? false) {
      m.frame.style.width = `${r.w}px`;
      m.frame.style.height = `${r.h}px`;
      if (fireResize) this.fireResize(m);
    }
  }

  private fireResize(m: Managed): void {
    if (!m.spec.onResize) return;
    const b = m.body.getBoundingClientRect();
    if (b.width > 0 && b.height > 0) m.spec.onResize(b.width, b.height);
  }

  /** Reads the current live rect of a normal window from the DOM (used mid-drag
   *  to know its own w/h even before normalRect updates). */
  private liveSize(m: Managed): { w: number; h: number } {
    if (m.spec.resizable ?? false) return { w: m.normalRect.w, h: m.normalRect.h };
    // auto-sized HUD windows: measure natural box
    const r = m.frame.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  // =========================================================================
  //  Focus / z-order
  // =========================================================================
  focus(id: string): void {
    const m = this.wins.get(id);
    if (!m) return;
    if (m.z === this.topZ && m.state === "normal") return;
    m.z = ++this.topZ;
    m.frame.style.zIndex = String(m.z);
    if (m.state === "normal") m.spec.onFocus?.();
  }

  /** True if `id` is open AND the topmost normal-state window — used by
   *  `toggleWindow()` (dock icon / shortcut key "toggle feel") and the Esc
   *  cascade (COMMIT 2) to tell "focused" apart from merely "open". */
  isFocused(id: string): boolean {
    const m = this.wins.get(id);
    return !!m && m.state === "normal" && m.z === this.topZ;
  }

  // =========================================================================
  //  State transitions (normal / minimized / hidden)
  // =========================================================================
  private setState(m: Managed, next: WindowState): void {
    // a non-closable window (the icon dock) can never be hidden — that would
    // strip the ☰ reopen path from the screen. Coerce a close request to a no-op.
    if (next === "hidden" && !(m.spec.closable ?? true)) return;
    if (m.state === next) { if (next === "normal") this.focus(m.spec.id); return; }
    const prev = m.state;
    m.state = next;
    m.frame.classList.toggle("wh-minimized", next === "minimized");

    if (next === "hidden") {
      m.frame.style.display = "none";
      if (prev === "minimized") this.reflowDock();
      m.spec.onMinimize?.(true);
      m.spec.onClose?.();
    } else if (next === "minimized") {
      m.frame.style.display = "";
      // detach from the desktop free-layer, dock as a title-strip
      m.frame.style.left = "";
      m.frame.style.top = "";
      m.frame.style.width = "";
      m.frame.style.height = "";
      m.frame.style.zIndex = "";
      this.dock.appendChild(m.frame);
      m.spec.onMinimize?.(true);
    } else {
      // normal
      m.frame.style.display = "";
      if (prev === "minimized") {
        this.desktop.appendChild(m.frame);
        this.reflowDock();
      }
      // A fresh OPEN (not a restore-from-minimize) of a window the player never
      // placed herself gets the logical spot: centered cascade / its openAt
      // anchor. Everything else keeps its rect, pulled fully on-screen.
      if (prev === "hidden" && (m.spec.autoPlace ?? true) && !m.userPlaced) this.autoPlace(m);
      else this.applyRect(m, this.clampFor(m, m.normalRect), true);
      this.focus(m.spec.id);
      m.spec.onMinimize?.(false);
      if (prev === "hidden") m.spec.onOpen?.();
    }
    this.persist();
  }

  /** The "logical order" open placement: base = the window's `openAt` anchor
   *  (dialogue bottom-center, minimap top-right, …) or the desktop center,
   *  then cascade +26px per already-open auto-placed window whose origin sits
   *  on the candidate spot — so windows opened one after another stack like a
   *  fanned deck instead of landing exactly on top of each other. Resizable
   *  windows cap to the desktop first (phone-size screens), and the final
   *  rect is always fully on-screen. */
  private autoPlace(m: Managed): void {
    const d = this.deskSize();
    const live = this.liveSize(m);
    const resizable = m.spec.resizable ?? false;
    const w = resizable ? Math.min(m.normalRect.w, d.w) : live.w;
    const h = resizable ? Math.min(m.normalRect.h, d.h) : live.h;
    const base = m.spec.openAt
      ? m.spec.openAt(d, { w, h })
      : { x: Math.round((d.w - w) / 2), y: Math.round((d.h - h) / 2) };
    const STEP = 26;
    const taken = [...this.wins.values()].filter((o) =>
      o !== m && o.state === "normal" && (o.spec.autoPlace ?? true));
    let { x, y } = base;
    for (let i = 0; i < 8; i++) {
      const c = this.clampRect({ x, y, w, h });
      const collide = taken.some((o) =>
        Math.abs(o.normalRect.x - c.x) < STEP && Math.abs(o.normalRect.y - c.y) < STEP);
      if (!collide) { x = c.x; y = c.y; break; }
      x = c.x + STEP; y = c.y + STEP;
    }
    const r = this.clampRect({ x, y, w, h });
    this.applyRect(m, resizable ? r : { ...r, w: m.normalRect.w, h: m.normalRect.h }, true);
  }

  private reflowDock(): void {
    // dock is a flex row/column; nothing to compute — CSS lays it out. Hook
    // kept so the dock can be re-measured if it ever needs manual packing.
  }

  private setPinned(m: Managed, v: boolean): void {
    m.pinned = v;
    m.frame.classList.toggle("wh-pinned", v);
    this.persist();
  }

  // =========================================================================
  //  Drag (title bar) + snap
  // =========================================================================
  private wireDrag(m: Managed): void {
    const tb = m.titlebar;
    let drag: { dx: number; dy: number; moved: boolean } | null = null;
    tb.style.touchAction = "none";
    tb.addEventListener("pointerdown", (e) => {
      // clicking a control button never starts a drag
      if ((e.target as HTMLElement).closest(".wh-btn")) return;
      if (m.state === "minimized") { drag = { dx: 0, dy: 0, moved: false }; return; }
      if (m.pinned) return;
      const r = m.frame.getBoundingClientRect();
      const deskR = this.desktop.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
      // record pointer offset relative to the desktop origin
      drag.dx = e.clientX - (r.left - deskR.left);
      drag.dy = e.clientY - (r.top - deskR.top);
      try { tb.setPointerCapture(e.pointerId); } catch { /* no active pointer (synthetic) */ }
      e.preventDefault();
    });
    tb.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (m.state === "minimized") { drag.moved = true; return; }
      const deskR = this.desktop.getBoundingClientRect();
      const { w, h } = this.liveSize(m);
      let x = e.clientX - deskR.left - drag.dx;
      let y = e.clientY - deskR.top - drag.dy;
      if (!e.altKey) { const s = this.snap(m, x, y, w, h); x = s.x; y = s.y; }
      const c = this.clampRect({ x, y, w, h });
      m.normalRect = { ...m.normalRect, x: c.x, y: c.y };
      m.frame.style.left = `${c.x}px`;
      m.frame.style.top = `${c.y}px`;
      drag.moved = true;
    });
    const end = (e: PointerEvent) => {
      if (!drag) return;
      const wasMinDrag = m.state === "minimized";
      const moved = drag.moved;
      drag = null;
      if (wasMinDrag) {
        // a click (no drag) on a minimized strip restores it, unless a control
        // button was hit (handled by its own listener).
        if (!(e.target as HTMLElement).closest(".wh-btn")) this.setState(m, "normal");
        return;
      }
      try { tb.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
      if (moved) { m.userPlaced = true; this.persist(); }
    };
    tb.addEventListener("pointerup", end);
    tb.addEventListener("pointercancel", end);
  }

  /** Gentle position-assist snap to desktop edges + other windows' edges. */
  private snap(self: Managed, x: number, y: number, w: number, h: number): { x: number; y: number } {
    const D = WIN_SNAP_DIST;
    const { w: dw, h: dh } = this.deskSize();
    const xC: number[] = [0, dw - w];
    const yC: number[] = [0, dh - h];
    for (const m of this.wins.values()) {
      if (m === self || m.state !== "normal") continue;
      const r = m.normalRect;
      // align edges (left↔left, right↔right) and adjacency (self.right↔other.left …)
      xC.push(r.x, r.x + r.w - w, r.x - w, r.x + r.w);
      yC.push(r.y, r.y + r.h - h, r.y - h, r.y + r.h);
    }
    const nearest = (v: number, cands: number[]): number => {
      let best = v, bd = D + 1;
      for (const c of cands) { const d = Math.abs(v - c); if (d <= D && d < bd) { bd = d; best = c; } }
      return best;
    };
    return { x: nearest(x, xC), y: nearest(y, yC) };
  }

  // =========================================================================
  //  Resize (edges + corners)
  // =========================================================================
  private addResizeHandles(m: Managed): void {
    const dirs: Array<[string, boolean, boolean, boolean, boolean]> = [
      // cls, north, south, east, west
      ["n", true, false, false, false], ["s", false, true, false, false],
      ["e", false, false, true, false], ["w", false, false, false, true],
      ["ne", true, false, true, false], ["nw", true, false, false, true],
      ["se", false, true, true, false], ["sw", false, true, false, true],
    ];
    const minW = m.spec.minW ?? WIN_MIN_W;
    const minH = m.spec.minH ?? WIN_MIN_H;
    const maxW = m.spec.maxW ?? Infinity;
    const maxH = m.spec.maxH ?? Infinity;
    for (const [cls, n, s, e, w] of dirs) {
      const g = document.createElement("div");
      g.className = `wh-rz wh-rz-${cls}`;
      g.style.setProperty("--hz", `${WIN_RESIZE_HANDLE}px`);
      m.frame.appendChild(g);
      let rs: { x0: number; y0: number; r0: WindowRect } | null = null;
      g.addEventListener("pointerdown", (ev) => {
        if (m.pinned) return;
        ev.stopPropagation(); ev.preventDefault();
        rs = { x0: ev.clientX, y0: ev.clientY, r0: { ...m.normalRect } };
        try { g.setPointerCapture(ev.pointerId); } catch { /* no active pointer (synthetic) */ }
        this.focus(m.spec.id);
      });
      g.addEventListener("pointermove", (ev) => {
        if (!rs) return;
        const dx = ev.clientX - rs.x0, dy = ev.clientY - rs.y0;
        const tbH = WIN_TITLEBAR_H;
        let { x, y, w: fw, h: fh } = rs.r0;
        // frame min/max = content min/max + title-bar height (for the vertical axis)
        const minFH = minH + tbH, maxFH = maxH + tbH;
        if (e) fw = clamp(rs.r0.w + dx, minW, maxW);
        if (w) { fw = clamp(rs.r0.w - dx, minW, maxW); x = rs.r0.x + (rs.r0.w - fw); }
        if (s) fh = clamp(rs.r0.h + dy, minFH, maxFH);
        if (n) { fh = clamp(rs.r0.h - dy, minFH, maxFH); y = rs.r0.y + (rs.r0.h - fh); }
        this.applyRect(m, { x, y, w: fw, h: fh }, true);
      });
      const rzEnd = (ev: PointerEvent) => {
        if (!rs) return;
        rs = null;
        try { g.releasePointerCapture(ev.pointerId); } catch { /* not captured */ }
        this.applyRect(m, this.clampRect(m.normalRect), true);
        m.userPlaced = true;
        this.persist();
      };
      g.addEventListener("pointerup", rzEnd);
      g.addEventListener("pointercancel", rzEnd);
    }
  }

  // =========================================================================
  //  Desktop resize → keep every window in reach (the rescue rule)
  // =========================================================================
  private onDesktopResize(): void {
    for (const m of this.wins.values()) {
      if (m.state !== "normal") continue;
      // clampFor shrinks a resizable window that overflows the desktop and
      // clamps auto-sized windows by their MEASURED box (stored w/h is 0).
      this.applyRect(m, this.clampFor(m, { ...m.normalRect }), true);
    }
    this.persist();
  }

  // =========================================================================
  //  Dock orientation
  // =========================================================================
  setDockOrientation(o: DockOrientation): void {
    this.dockOrientation = o;
    this.persist();
  }
  getDockOrientation(): DockOrientation { return this.dockOrientation; }

  // =========================================================================
  //  Persistence
  // =========================================================================
  snapshotLayout(): LayoutStore {
    const windows: Record<string, WindowLayout> = {};
    for (const [id, m] of this.wins) {
      const row: WindowLayout = { x: m.normalRect.x, y: m.normalRect.y, state: m.state, z: m.z };
      if (m.spec.resizable ?? false) { row.w = m.normalRect.w; row.h = m.normalRect.h; }
      if (m.pinned) row.pinned = true;
      if (m.userPlaced) row.up = true;
      if (m.userSized) row.us = true;
      windows[id] = row;
    }
    return { version: 1, slot: 1, windows, dockOrientation: this.dockOrientation };
  }

  private persist(): void {
    saveLayoutDebounced(this.snapshotLayout());
    this.onLayoutChange?.();
  }

  /** Applies a saved/preset layout to already-created windows, with the
   *  keep-on-screen clamp. Missing ids keep their current rect. */
  applyLayout(store: LayoutStore, immediate = false): void {
    this.dockOrientation = store.dockOrientation;
    for (const [id, row] of Object.entries(store.windows)) {
      const m = this.wins.get(id);
      if (!m) continue;
      const resizable = m.spec.resizable ?? false;
      m.userPlaced = row.up === true;
      m.userSized = row.us === true;
      // Size self-heal: a stored w/h the player never set herself is history,
      // not intent — the world, the chrome, or a past clamp may have shrunk
      // it since (the "map unreadable inside its box" bug). Re-derive from
      // the spec's default; only a player-resized window keeps its stored
      // size. Position is always kept.
      const defSize = resizable && !m.userSized
        ? this.frameRectFor(m, this.resolveDefault(m.spec)) : null;
      const base = resizable
        ? { x: row.x, y: row.y,
            w: defSize ? defSize.w : (row.w ?? m.normalRect.w),
            h: defSize ? defSize.h : (row.h ?? m.normalRect.h) }
        : { x: row.x, y: row.y, w: m.normalRect.w, h: m.normalRect.h };
      m.normalRect = this.clampFor(m, base);
      m.pinned = row.pinned === true;
      m.frame.classList.toggle("wh-pinned", m.pinned);
      // set state without persisting per-window (batch persist at the end)
      this.forceState(m, row.state);
    }
    // Stable z-order after reload (Windows migration II polish): forceState's
    // normal-branch focus() calls above just ran in Object.entries iteration
    // order (= window creation order), which is an arbitrary final z-order.
    // Re-focus every normal-state window with a saved `z`, ascending, so the
    // one that was actually on top before the reload ends up on top again —
    // ties (older saves with no `z`) fall back to that same creation order.
    const order = Object.entries(store.windows)
      .filter(([id, row]) => row.state === "normal" && this.wins.has(id))
      .sort((a, b) => (a[1].z ?? 0) - (b[1].z ?? 0));
    for (const [id] of order) this.focus(id);
    if (immediate) saveLayoutNow(this.snapshotLayout());
    else this.persist();
  }

  /** State change used by applyLayout — no per-call persist. Fires the same
   *  onMinimize/onClose hooks so downstream flags (e.g. the viewport-active gate)
   *  are correct when a saved/preset layout restores a non-normal state. */
  private forceState(m: Managed, next: WindowState): void {
    // never restore a non-closable window (the dock) into the hidden state
    if (next === "hidden" && !(m.spec.closable ?? true)) next = "normal";
    m.state = next;
    m.frame.classList.toggle("wh-minimized", next === "minimized");
    if (next === "hidden") {
      m.frame.style.display = "none";
      if (m.frame.parentElement === this.dock) this.desktop.appendChild(m.frame);
      m.spec.onMinimize?.(true);
      m.spec.onClose?.();
    } else if (next === "minimized") {
      m.frame.style.display = "";
      m.frame.style.left = m.frame.style.top = m.frame.style.width = m.frame.style.height = "";
      m.frame.style.zIndex = "";
      this.dock.appendChild(m.frame);
      m.spec.onMinimize?.(true);
    } else {
      m.frame.style.display = "";
      if (m.frame.parentElement === this.dock) this.desktop.appendChild(m.frame);
      this.applyRect(m, m.normalRect, true);
      this.focus(m.spec.id);
      m.spec.onMinimize?.(false);
    }
  }

  /** The Esc cascade (Windows migration II): the topmost open, closable
   *  window that isn't in `exclude` (the always-on chrome — viewport, HUD
   *  windows) — or undefined if none, meaning Esc should fall through to
   *  Pause. Used by `setup.ts`'s `escCloseTopWindow()`. */
  topmostClosable(exclude: ReadonlySet<string>): WindowHandle | undefined {
    let best: Managed | undefined;
    for (const m of this.wins.values()) {
      if (m.state !== "normal") continue;
      if (!(m.spec.closable ?? true)) continue;
      if (exclude.has(m.spec.id)) continue;
      if (!best || m.z > best.z) best = m;
    }
    return best?.handle;
  }

  // ---- queries used by setup.ts (the ☰ hidden-windows menu, presets) -------
  get(id: string): WindowHandle | undefined { return this.wins.get(id)?.handle; }
  all(): WindowHandle[] { return [...this.wins.values()].map((m) => m.handle); }
  hiddenWindows(): { id: string; title: string; icon?: string }[] {
    return [...this.wins.values()]
      .filter((m) => m.state === "hidden")
      .map((m) => ({ id: m.spec.id, title: m.spec.title, icon: m.spec.icon }));
  }
  desktopSize(): DesktopSize { return this.deskSize(); }
  /** Re-clamp everything into reach (boot + after a bulk relayout). */
  clampAll(): void { this.onDesktopResize(); }
  /** The chrome footprint changed globally (the PixelLab skin's wood border
   *  arrived after boot). Re-derive every content-sized window the player
   *  hasn't sized herself, so its CONTENT keeps the intended box instead of
   *  being squeezed by the new border. Player-sized windows are left alone. */
  chromeChanged(): void {
    for (const m of this.wins.values()) {
      if (!(m.spec.resizable ?? false) || !(m.spec.contentSized ?? false) || m.userSized) continue;
      if (m.state !== "normal") continue;
      const def = this.frameRectFor(m, this.resolveDefault(m.spec));
      const r = this.clampFor(m, { ...m.normalRect, w: def.w, h: def.h });
      this.applyRect(m, r, true);
    }
    this.persist();
  }

  /** Forget every "the player placed this herself" flag — presets are a fresh
   *  arrangement, so windows opened after one go back to logical auto-placement. */
  resetPlacement(): void {
    for (const m of this.wins.values()) m.userPlaced = false;
    this.persist();
  }

  loadSavedLayout(): LayoutStore | null { return loadLayout(); }
}

export const wm = new WindowManager();

/**
 * The dock-icon / shortcut-key "toggle feel" (Windows migration I checklist):
 * hidden or minimized → open (and focus); open but not focused (another
 * window is in front) → just focus it; open AND already focused → close.
 * Used by backpack/skills/memory book/minimap's icon+key handlers.
 */
export function toggleWindow(h: WindowHandle): void {
  if (!h.isOpen()) { h.open(); return; }
  if (wm.isFocused(h.id)) h.close();
  else h.focus();
}
