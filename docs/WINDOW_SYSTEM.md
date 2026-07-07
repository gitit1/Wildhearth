# WINDOW_SYSTEM.md — the Wildhearth window system

Everything on screen is a **window** on a **desktop surface**, UO-classic-client
style: draggable by its title bar, resizable from edges + corners, minimizable
to a bottom title-strip, closable (and reopenable from the dock's ☰ menu),
z-ordered by focus, gently snapping to edges/other windows, with the player's
whole layout persisted. **The game viewport itself is a window.**

This doc is the reference for the abstraction, its internals, the persistence
format, and — most importantly — the **checklist for turning any surface into a
window** (that is how the remaining modal screens keep getting migrated).

Source lives in `src/ui/windows/`:

| File | Responsibility |
|---|---|
| `window.ts` | Types only: `WindowSpec`, `WindowHandle`, `WindowRect`, `WindowState`, `WindowLayout`, `LayoutStore`, `DockOrientation`, `clamp`. |
| `manager.ts` | `WindowManager` (singleton `wm`): desktop + dock DOM, chrome, drag/resize/minimize/close/pin, focus/z-order, snap, keep-on-screen clamp, layout snapshot/apply/persist, `isFocused()`. Also exports `toggleWindow()`, the shared dock-icon/shortcut-key "toggle feel" helper. |
| `layout.ts` | `wildhearth-layout-v1` load/save (debounced + immediate + clear). Validation + per-slot forward-compat. |
| `setup.ts` | Game wiring: creates the viewport + clock/coins/needs/dock windows (`setupWindows`), the dock's ⇄/☰ controls, the boot restore (`finishWindowSetup`, called once every window exists), `isViewportActive()`, and the presets (which also place the six migrated panel windows — §4). |
| `scalewindow.ts` | `createScaleWindow()` — the migration helper for the `--s`-scale panel convention (backpack/skills/memory book/shop/gift): measures natural size once, wires a resizable window's width back to a uniform scale. |

Tuning knobs are in `src/config.ts` under **Window system** (`WIN_*`).

---

## 1. The Window abstraction

A window is declared with a `WindowSpec` and handed to `wm.createWindow(spec)`,
which returns a `WindowHandle`.

```ts
interface WindowSpec {
  id: string;                 // stable id — also the persistence key
  title: string;
  icon?: string;              // an emoji glyph shown left of the title
  content: HTMLElement;       // the element hosting the body (appended into .wh-body)
  minW?; minH?; maxW?; maxH?; // CONTENT-box bounds (px); title-bar height is added on top
  resizable?: boolean;        // default false → the window sizes to its content
  closable?: boolean;         // default true
  minimizable?: boolean;      // default true
  pinnable?: boolean;         // default true
  defaultRect: WindowRect | ((desk: {w,h}) => WindowRect);
  onResize?(cw, ch): void;    // content box settled (viewport refits the canvas here)
  onOpen?(); onClose?(); onMinimize?(min); onFocus?();
}
```

`WindowHandle` gives imperative control: `open / close / minimize / restore /
toggle / focus / setTitle / setPinned / setRect`, plus queries `isOpen /
isMinimized / isHidden / state / pinned / rect` and the frame element `el`.

### Chrome the manager builds

```
.wh-window                 (position:absolute; flex column; wood/gold chrome)
 ├─ .wh-titlebar           (drag handle; icon + title left, controls right)
 │   ├─ .wh-title (.wh-icon + .wh-title-text)
 │   └─ .wh-ctrls (pin ⚲, minimize —, close ✕ — only those enabled by the spec)
 ├─ .wh-body               (flex:1; the spec.content is appended here)
 └─ .wh-rz .wh-rz-{n,s,e,w,ne,nw,se,sw}   (resize handles; only if resizable)
```

There is **no layout-affecting border** — the wood ring is `box-shadow: inset`,
so the frame height is exactly `WIN_TITLEBAR_H + body height`. `box-sizing:
border-box`. Resizable windows get explicit `width/height`; non-resizable
(HUD) windows leave them `auto` and size to their content.

---

## 2. Internals

### Drag (title bar)
`pointerdown` on the title bar records the pointer's offset from the window's
top-left and captures the pointer (`setPointerCapture`, wrapped in try/catch for
synthetic events). `pointermove` sets `left/top = pointer − offset`, passed
through **snap** then the **keep-on-screen clamp**. Clicking a control button
(`.wh-btn`) never starts a drag. A pinned window doesn't drag. Persist on
`pointerup` if it actually moved.

### Resize (edges + corners)
Eight invisible ~`WIN_RESIZE_HANDLE`px grab bands (`.wh-rz-*`) with the correct
CSS cursors. Each handle knows which of N/S/E/W it drives. `pointermove`
recomputes the frame rect from the drag delta, clamped to
`[minW, maxW]` / `[minH + titlebar, maxH + titlebar]`; west/north handles also
move the origin so the opposite edge stays put. `onResize(cw, ch)` fires on
every move (live resize) and once more, clamped, on release.

### Focus / z-order
A `pointerdown` anywhere on a window frame (capture phase) calls `focus(id)`,
which bumps a monotonically increasing `topZ` and assigns it as the window's
`z-index`. Z-order is **not** persisted (it's ephemeral session state).

### Minimize → dock, restore
Minimizing moves the frame into `#whDock` (a flex row along the bottom, `z 9000`
within the desktop), adds `.wh-minimized` (body + resize handles hidden, fixed
strip width `WIN_DOCK_STRIP_W`), and clears its absolute position so flex lays
it out. Clicking the strip's title bar restores it: it moves back to the
desktop layer and re-applies its saved `normalRect`.

### Close / reopen
Close sets `display:none` and state `hidden`. Reopen from the dock's **☰ menu**,
which lists every hidden window (`wm.hiddenWindows()`) and calls `.open()`. The
**icon dock is intentionally NOT closable** (`closable:false`), so the ☰ reopen
path can never be lost; `setState`/`forceState` coerce any "hide the dock"
request to a no-op.

### Pin
Toggles `pinned`: disables drag + resize and applies a gold-tinted title bar.
Persisted.

### Snap
While dragging, `snap()` collects candidate coordinates — the desktop's own
edges plus, for every other **normal-state** window, four alignments
(left↔left, right↔right, and the two adjacencies self.edge↔other.edge). If the
dragged position is within `WIN_SNAP_DIST` of a candidate it jumps to it
(position assist only — **no docking semantics**). **Hold Alt** (read from
`pointermove.altKey`) to bypass entirely.

### Keep-on-screen rescue (the off-screen edge case)
`clampRect()` guarantees at least `WIN_MIN_VISIBLE`px of a window's title bar
stays grabbable horizontally and that its top stays within the desktop
vertically, so a window can never be dragged fully off-screen. On browser
resize, `onDesktopResize()` re-clamps **every** window back into reach and
shrinks any resizable window that now overflows the desktop (then refits it).
This runs on boot too (`wm.clampAll()`), so a layout saved on a big monitor and
restored on a small one is pulled back into view.

### The game viewport is a window
`setup.ts` wraps the whole `#gameArea` (canvas + prompt/dialogue/actBtn/zoom
overlays) as the `viewport` window's content. Its `onResize` calls `main.ts`'s
`fit()` (dpr-aware canvas backing-store resize, guarded against a zero box); the
camera refits each frame from `cv.width`. `screenToWorld` reads the canvas'
live `getBoundingClientRect`, so **mouse→world math stays exact after the
viewport moves or resizes** (verified: click→target Δ = 0.00px at three
positions/sizes). Minimizing/closing the viewport sets `viewportActive=false`,
which `main.ts` folds into its `timePaused` gate (game-time freezes, same as
Pause) and which skips the world draw.

---

## 3. Persistence

The whole desktop is stored under `WIN_LAYOUT_KEY = "wildhearth-layout-v1"`,
written **debounced** (`WIN_LAYOUT_SAVE_DEBOUNCE_MS`) on any change and restored
on boot. Format:

```jsonc
{
  "version": 1,
  "slot": 1,
  "dockOrientation": "horizontal" | "vertical",
  "windows": {
    "<id>": { "x", "y", "w"?, "h"?, "state": "normal|minimized|hidden", "pinned"? }
    // w/h are stored only for resizable windows (the viewport)
  }
}
```

- **Not game state.** The key is deliberately **absent from `saves.ts`
  `GAME_KEYS`**, so a New Game keeps the player's arranged desktop — UO keeps
  your client layout across characters. It is a per-machine preference, like
  Settings. (Judgment call, logged in HANDOFF/WORKLOG.)
- **Restore path:** `setup.ts` creates all windows at their spec defaults, then
  `wm.applyLayout(saved)` overrides rect/state/pin (each clamped), then
  `wm.clampAll()` runs the keep-on-screen rescue. If there is no save, the
  **Classic** preset is laid out instead.
- **Per-slot forward-compat:** v1 ships one slot; the store carries a `slot`
  field and the key is ready to gain a `-slotN` suffix (mirroring `saves.ts`'s
  planned suffix). When multi-slot lands, thread a slot number through
  `loadLayout`/`saveLayout*` and key on `${WIN_LAYOUT_KEY}-slot${n}`.

---

## 4. Presets (Settings → Windows)

`applyWindowPreset(name)` (in `setup.ts`) does an instant, animation-free
relayout and persists:

- **Classic** — the defaults: viewport ~`WIN_VIEWPORT_FILL` (88%) centred;
  coins top-left, clock top-right, needs on the left edge, dock bottom-right;
  backpack right side, minimap top-right (under the clock) — both open;
  skills left edge (under coins/needs), memory book center-left, shop center,
  gift near the shop — all four hidden (their pre-migration closed-by-default
  feel), reachable from the dock's ☰ menu or their icon/key.
- **Focus** — viewport maximized (desktop minus a gutter); every other window
  (HUD + any of the six panels that happen to be open) minimized to bottom
  strips. A panel that's already hidden stays hidden.
- **Cozy** — viewport ~`WIN_COZY_FILL` (72%), HUD + panel windows tiled around
  it (same panel arrangement as Classic).
- **Reset to default** — clears the saved layout, then applies Classic. Note:
  like Classic/Cozy, this only repositions the six panel windows — a panel a
  player has manually resized keeps that size (only the viewport's size is
  ever reset by a preset, since its size IS the preset's defining feature).

All four are also reachable programmatically via the exported
`applyWindowPreset`.

---

## 5. Adding a new window (the migration checklist)

This is exactly how the modal screens (backpack / skills / shop / dialogue /
settings …) get migrated onto the system — mechanical, one at a time. **Windows
migration I** (backpack, skills, minimap, memory book, shop, gift chooser) is
done; it's the reference application of every step below.

1. **Have a content element.** Use the surface's existing root element (e.g.
   `#backpack`) as `spec.content`, or wrap its inner markup in a fresh `<div>`.
   Strip any `position:fixed` / bespoke chrome from it — the window frame
   provides the chrome; the content should be plain flow content. **Gotcha:**
   a plain block-level content root stretches to its containing block's width
   the instant `position:fixed` is gone — including for the split-second it's
   still sitting in its original DOM spot at boot (see step 2's measurement).
   Give it `display:inline-block` so it keeps shrinking-to-fit its own
   grid/list, exactly like the old fixed-position panel did.
2. **`wm.createWindow({ ... })`** with a stable `id` (this is the persistence
   key — never reuse one), a `title`, an `icon`, and `content`. Set `resizable:
   true` + `minW/minH` if it should scale; leave it off to size-to-content.
   Provide a `defaultRect` (a function of the desktop size for edge-anchored
   windows). **The `--s`-scale convention** (backpack/skills/memory book/shop/
   gift all resize by scaling one CSS custom property, the old `makePanel`
   convention) has a ready-made wrapper: `createScaleWindow()` in
   `src/ui/windows/scalewindow.ts` measures the content's natural size once (at
   `s=1`, before it's reparented), derives `minW/maxW/minH/maxH` from
   `WIN_PANEL_SCALE_MIN/MAX`, and maps every resize back to a uniform scale —
   only width drives it, matching the legacy corner-grip's horizontal-only drag.
3. **Replace open/close plumbing** with the returned handle: the surface's
   dock-icon/shortcut-key handler calls `toggleWindow(handle)`
   (`src/ui/windows/manager.ts`) — hidden/minimized → open+focus; open but not
   focused → just focus; open AND focused → close (the desktop "toggle feel").
   Its own close ✕ / Escape call `handle.close()` directly. Delete its old
   `makePanel(...)` call and any manual drag/resize code — the manager owns
   that now. A window with no dock icon (opened only by game logic, like the
   shop/gift chooser) skips `toggleWindow` — just `handle.open()` /
   `handle.close()` from wherever the game triggers it.
4. **Anchoring after content settles:** if the content's size depends on
   late-populated text (like the clock's date pill), give it a `min-width`/
   `min-height` so the initial measurement matches, or re-anchor after the
   first update. (See the `#hudInfo{min-width}` note in `index.html`.)
5. **Side-effects on state:** if the surface must pause the game or refit
   something when shown/hidden, use `onOpen`/`onClose`/`onMinimize`.
   `onMinimize(hidden)` is the one hook that fires for **every** visibility
   change (open AND restore-from-dock both pass `false`; minimize AND close
   both pass `true`) — the right place to re-render stale content and sync a
   dock icon's `.active` class, rather than `onOpen` alone (which misses
   restore-from-minimized).
6. **Persistence is automatic** — as soon as it's a managed window, its
   position/size/state ride in `wildhearth-layout-v1`. Add it to a preset in
   `setup.ts` if it should be placed by Classic/Focus/Cozy.
7. **Boot order:** create the window before the first layout restore. In
   practice this means calling `wm.createWindow`/`createScaleWindow` from the
   surface's own `init*()` — wherever in main.ts's boot sequence that already
   runs — and only running the actual restore (`setupWindows` used to do this
   inline; it's now the separate `finishWindowSetup()` export) once every
   window that should participate has been created. Migration I's six panels
   depend on game state (economy/skills/…) that isn't ready when `setupWindows`
   itself runs, so `finishWindowSetup()` is called separately, once, right
   after the last panel's `init*()`.

---

## 6. Known edge cases

- **Off-screen rescue.** A layout saved on a large monitor, restored on a small
  one, could place a window past the edge → `clampAll()` on boot (and on every
  browser resize) pulls each title bar back to at least `WIN_MIN_VISIBLE`px
  visible. A resizable window larger than the desktop is shrunk to fit.
- **Viewport resize during a drag.** The viewport window's `onResize` fires per
  `pointermove`; `fit()` guards against a zero-size box (a mid-transition or
  minimized viewport), so the canvas never gets a 0×0 backing store.
- **dpr changes / monitor moves.** `fit()` multiplies by `devicePixelRatio` each
  call, so a viewport resize after a dpr change re-crisps the canvas. (The HUD
  dial/needs canvases are dpr-sized once at load — a pre-existing limitation,
  unchanged here.)
- **Minimized-at-edge stacking.** Minimized windows live in `#whDock`
  (`flex-wrap: wrap-reverse`), so many minimized strips stack upward from the
  bottom edge rather than running off the side.
- **The dock is never closable.** Guarantees the ☰ reopen path is always on
  screen; a corrupt/preset layout that marks it hidden is coerced to normal.
