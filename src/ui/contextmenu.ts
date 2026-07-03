/** UO-style right-click context menu: a small DOM list positioned at the cursor. */

export interface MenuItem { label: string; onClick: () => void; }

let menuEl: HTMLElement | null = null;

export function openContextMenu(sx: number, sy: number, items: MenuItem[]) {
  closeContextMenu();
  if (items.length === 0) return;

  const el = document.createElement("div");
  el.className = "ctxmenu";
  el.style.left = `${sx}px`;
  el.style.top = `${sy}px`;
  for (const it of items) {
    const b = document.createElement("button");
    b.className = "ctx-item";
    b.textContent = it.label;
    b.addEventListener("click", (e) => { e.stopPropagation(); it.onClick(); closeContextMenu(); });
    el.appendChild(b);
  }
  document.body.appendChild(el);
  menuEl = el;

  // keep it on-screen
  const r = el.getBoundingClientRect();
  if (r.right > innerWidth) el.style.left = `${Math.max(4, innerWidth - r.width - 6)}px`;
  if (r.bottom > innerHeight) el.style.top = `${Math.max(4, innerHeight - r.height - 6)}px`;
}

export function closeContextMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; }
}

export function isContextMenuOpen(): boolean { return !!menuEl; }

// Dismiss on Escape or on any press outside the menu. Both run in the capture
// phase so they beat other handlers; when a menu is actually open, Escape is
// consumed here so it doesn't also close the backpack behind it.
addEventListener("keydown", (e) => {
  if (e.code === "Escape" && menuEl) { closeContextMenu(); e.stopImmediatePropagation(); }
}, true);
addEventListener("pointerdown", (e) => {
  if (menuEl && !menuEl.contains(e.target as Node)) closeContextMenu();
}, true);
