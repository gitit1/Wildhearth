import type { Economy } from "../systems/economy";
import { ITEM_NAMES } from "../systems/inventory";
import { isEdible } from "../systems/needs";
import { drawItemIcon } from "../art/icons";
import { openContextMenu } from "./contextmenu";
import { createScaleWindow } from "./windows/scalewindow";
import { toggleWindow } from "./windows/manager";
import type { WindowHandle } from "./windows/window";

/**
 * Backpack window (Windows migration I): a real wm window — draggable,
 * resizable, minimizable, closable, persisted. Icon 🎒 / key I toggle it (see
 * toggleWindow's "open→focus if already open, close if focused" feel); Esc
 * closes it via the shared cascade (Windows migration II, setup.ts) when it's
 * the topmost open window. Right-click (or long-press) an edible item for an
 * "Eat" action (Needs engine). Default: open, docked to the right side.
 */

const ICON_PX = 40;
const GAP = 12;

let win: WindowHandle;
let bagBtn: HTMLElement | null;
let eco: Economy;
let iconScale = 1;
let slotEls: { canvas: HTMLCanvasElement; qty: HTMLElement; paintedKey: string }[] = [];
// eat one of an item (owned + mutated by main.ts, so needs stay explicit-passed)
let eatItem: (id: string) => boolean = () => false;

export function initBackpack(economy: Economy, eat: (id: string) => boolean) {
  eco = economy;
  eatItem = eat;
  const panel = document.getElementById("backpack")!;
  bagBtn = document.getElementById("bagBtn");
  const grid = document.getElementById("backpackGrid")!;

  for (let i = 0; i < economy.inv.slots.length; i++) {
    const slot = document.createElement("div");
    slot.className = "bp-slot";
    const canvas = document.createElement("canvas");
    const qty = document.createElement("span");
    qty.className = "bp-qty";
    slot.append(canvas, qty);
    grid.append(slot);
    slotEls.push({ canvas, qty, paintedKey: "" });

    // right-click an edible slot -> a small "Eat <name>" menu (UO convention)
    slot.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const stack = eco.inv.slots[i];
      if (!stack || !isEdible(stack.id)) return;
      openContextMenu(e.clientX, e.clientY, [
        { label: `Eat ${ITEM_NAMES[stack.id] ?? stack.id}`, onClick: () => eatItem(stack.id) },
      ]);
    });
  }

  win = createScaleWindow({
    id: "backpack", title: "Backpack", icon: "🎒",
    content: panel,
    onScale: setScale,
    defaultPos: (d) => ({ x: d.w - 250 - GAP, y: 236 }),
    // fixed home (HUD-A2): docked to the RIGHT edge, vertically centered.
    openAt: (d, s) => ({ x: d.w - s.w - GAP, y: Math.round((d.h - s.h) / 2) }),
    onVisibleChange: (hidden) => { bagBtn?.classList.toggle("active", !hidden); if (!hidden) render(); },
  });
  bagBtn?.addEventListener("click", () => toggleWindow(win));
  // Escape is handled generically now (the shared Esc cascade in
  // src/ui/windows/setup.ts closes the topmost open utility window).
  addEventListener("keydown", (e) => { if (e.code === "KeyI") toggleWindow(win); });
  bagBtn?.classList.toggle("active", win.isOpen());
}

/** Call every frame; repaints only while open and only slots that changed. */
export function updateBackpack() {
  if (win.isOpen()) render();
}

/** Resizes the whole panel; slot canvases re-render crisp at the new size. */
function setScale(s: number) {
  iconScale = s;
  const panel = document.getElementById("backpack")!;
  panel.style.setProperty("--s", String(s));
  const px = Math.round(ICON_PX * s);
  for (const el of slotEls) {
    el.canvas.width = px * devicePixelRatio;
    el.canvas.height = px * devicePixelRatio;
    el.canvas.style.width = el.canvas.style.height = `${px}px`;
    el.paintedKey = "\0resized";
  }
  render();
}

function render() {
  const px = Math.round(ICON_PX * iconScale);
  for (let i = 0; i < slotEls.length; i++) {
    const el = slotEls[i]!;
    const stack = eco.inv.slots[i] ?? null;
    const key = stack ? `${stack.id}:${stack.qty}` : "";
    if (key === el.paintedKey) continue;
    el.paintedKey = key;

    const g = el.canvas.getContext("2d")!;
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    g.clearRect(0, 0, px, px);
    if (stack) {
      drawItemIcon(g, stack.id, px);
      el.qty.textContent = String(stack.qty);
      el.canvas.title = ITEM_NAMES[stack.id] ?? stack.id;
    } else {
      el.qty.textContent = "";
      el.canvas.title = "";
    }
  }
}
