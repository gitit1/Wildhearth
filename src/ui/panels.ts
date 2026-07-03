import { UI_KEY } from "../config";

/**
 * UO-gump behavior for a fixed-position DOM panel: drag to move, drag the
 * corner grip to resize. Position + scale persist in localStorage (UI state,
 * separate from the game save).
 */

interface PanelSave { x: number; y: number; s: number }

function loadAll(): Record<string, PanelSave> {
  try { return JSON.parse(localStorage.getItem(UI_KEY) || "{}"); } catch { return {}; }
}

function saveOne(key: string, p: PanelSave) {
  try {
    const all = loadAll(); all[key] = p;
    localStorage.setItem(UI_KEY, JSON.stringify(all));
  } catch { /* private mode */ }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * el: the fixed-position panel. handle: the part you grab to move it
 * (header, or the panel itself). onScale re-renders content at a new scale.
 */
export function makePanel(
  el: HTMLElement, handle: HTMLElement, key: string,
  onScale: (s: number) => void, minS = 0.6, maxS = 2.5
) {
  let s = 1;

  // anchor by left/top so growing/shrinking never shifts the panel
  const place = (x: number, y: number) => {
    el.style.left = `${clamp(x, 0, innerWidth - 48)}px`;
    el.style.top = `${clamp(y, 0, innerHeight - 48)}px`;
    el.style.right = "auto";
  };
  const saved = loadAll()[key];
  if (saved) s = clamp(saved.s, minS, maxS);
  // size content first, THEN resolve the default position — measuring before
  // onScale would capture a wrong (unsized) box for canvas-based panels.
  onScale(s);
  if (saved) place(saved.x, saved.y);
  else {
    const r = el.getBoundingClientRect();
    place(r.left, r.top);
  }

  const persist = () => {
    const r = el.getBoundingClientRect();
    saveOne(key, { x: r.left, y: r.top, s });
  };

  // move
  let drag: { dx: number; dy: number } | null = null;
  handle.style.cursor = "move";
  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", (e) => {
    const r = el.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (drag) place(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  const dragEnd = () => { if (drag) { drag = null; persist(); } };
  handle.addEventListener("pointerup", dragEnd);
  handle.addEventListener("pointercancel", dragEnd);

  // resize via corner grip
  const grip = document.createElement("div");
  grip.className = "panel-grip";
  el.appendChild(grip);
  let rs: { s0: number; x0: number; w0: number } | null = null;
  grip.addEventListener("pointerdown", (e) => {
    e.stopPropagation(); e.preventDefault();
    rs = { s0: s, x0: e.clientX, w0: el.getBoundingClientRect().width };
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener("pointermove", (e) => {
    if (!rs) return;
    e.stopPropagation();
    s = clamp(rs.s0 * ((rs.w0 + e.clientX - rs.x0) / rs.w0), minS, maxS);
    onScale(s);
  });
  const rsEnd = (e: Event) => { e.stopPropagation(); if (rs) { rs = null; persist(); } };
  grip.addEventListener("pointerup", rsEnd);
  grip.addEventListener("pointercancel", rsEnd);
}
