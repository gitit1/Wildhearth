import { WIN_LAYOUT_KEY, WIN_LAYOUT_SAVE_DEBOUNCE_MS } from "../../config";
import type { LayoutStore, WindowLayout, WindowState, DockOrientation } from "./window";

/**
 * Window-layout persistence (COMMIT 2). The player's whole desktop — every
 * window's position/size/state + the dock orientation — is saved (debounced)
 * to WIN_LAYOUT_KEY and restored on boot.
 *
 * Judgment call (documented in docs/WINDOW_SYSTEM.md): layout is a PREFERENCE
 * like Settings, NOT game state. It is deliberately absent from saves.ts's
 * GAME_KEYS, so a New Game keeps the player's arranged desktop (UO keeps your
 * client layout across characters). It is per-machine, single-slot today.
 *
 * Per-slot forward-compat: v1 always uses slot 1. When v5 ships multiple save
 * slots, key by `${WIN_LAYOUT_KEY}-slot${n}` (mirroring saves.ts's planned
 * `-slotN` suffix) and thread the slot number through load/save — the store
 * shape below already carries `slot`, so nothing else changes.
 */

const LAYOUT_VERSION = 1;
const SLOT = 1; // v1: exactly one slot. See per-slot note above.

function isState(v: unknown): v is WindowState {
  return v === "normal" || v === "minimized" || v === "hidden";
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Reads the persisted layout, or null if none / corrupt. Every field is
 *  re-validated so a hand-edited or stale blob can never crash the boot. */
export function loadLayout(): LayoutStore | null {
  try {
    const raw = localStorage.getItem(WIN_LAYOUT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LayoutStore>;
    if (!p || typeof p !== "object") return null;
    const windows: Record<string, WindowLayout> = {};
    const src = (p.windows && typeof p.windows === "object") ? p.windows : {};
    for (const [id, row] of Object.entries(src as Record<string, unknown>)) {
      const r = row as Partial<WindowLayout>;
      const x = num(r.x), y = num(r.y);
      if (x === undefined || y === undefined) continue;
      windows[id] = {
        x, y,
        w: num(r.w), h: num(r.h),
        state: isState(r.state) ? r.state : "normal",
        pinned: r.pinned === true,
      };
    }
    const dock: DockOrientation = p.dockOrientation === "vertical" ? "vertical" : "horizontal";
    return { version: LAYOUT_VERSION, slot: SLOT, windows, dockOrientation: dock };
  } catch {
    return null;
  }
}

let saveTimer: number | undefined;

/** Debounced write — a burst of drag/resize events collapses to one disk hit. */
export function saveLayoutDebounced(store: LayoutStore): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    saveLayoutNow(store);
  }, WIN_LAYOUT_SAVE_DEBOUNCE_MS) as unknown as number;
}

/** Immediate write (used by presets, which want the change on disk at once). */
export function saveLayoutNow(store: LayoutStore): void {
  try {
    localStorage.setItem(WIN_LAYOUT_KEY, JSON.stringify({
      version: LAYOUT_VERSION, slot: SLOT,
      windows: store.windows, dockOrientation: store.dockOrientation,
    }));
  } catch { /* private mode — layout just won't persist */ }
}

/** Clears the saved layout (Settings → "Reset to default"). */
export function clearLayout(): void {
  try { localStorage.removeItem(WIN_LAYOUT_KEY); } catch { /* private mode */ }
}
