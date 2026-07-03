import type { Economy } from "../systems/economy";
import { ITEM_NAMES } from "../systems/inventory";
import { drawItemIcon } from "../art/icons";

/** Backpack window (key I): DOM grid of slots, icons painted in code. */

const ICON_PX = 40;

let panel: HTMLElement;
let open = false;
let slotEls: { canvas: HTMLCanvasElement; qty: HTMLElement; paintedKey: string }[] = [];

export function initBackpack(economy: Economy) {
  panel = document.getElementById("backpack")!;
  const grid = document.getElementById("backpackGrid")!;

  for (let i = 0; i < economy.inv.slots.length; i++) {
    const slot = document.createElement("div");
    slot.className = "bp-slot";
    const canvas = document.createElement("canvas");
    canvas.width = ICON_PX * devicePixelRatio;
    canvas.height = ICON_PX * devicePixelRatio;
    canvas.style.width = canvas.style.height = `${ICON_PX}px`;
    const qty = document.createElement("span");
    qty.className = "bp-qty";
    slot.append(canvas, qty);
    grid.append(slot);
    slotEls.push({ canvas, qty, paintedKey: "" });
  }

  addEventListener("keydown", (e) => {
    if (e.code === "KeyI") { open = !open; render(economy); }
    else if (e.code === "Escape" && open) open = false;
    else return;
    panel.style.display = open ? "block" : "none";
  });
}

/** Call every frame; repaints only while open and only slots that changed. */
export function updateBackpack(economy: Economy) {
  if (open) render(economy);
}

function render(economy: Economy) {
  for (let i = 0; i < slotEls.length; i++) {
    const el = slotEls[i]!;
    const stack = economy.inv.slots[i] ?? null;
    const key = stack ? `${stack.id}:${stack.qty}` : "";
    if (key === el.paintedKey) continue;
    el.paintedKey = key;

    const g = el.canvas.getContext("2d")!;
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    g.clearRect(0, 0, ICON_PX, ICON_PX);
    if (stack) {
      drawItemIcon(g, stack.id, ICON_PX);
      el.qty.textContent = String(stack.qty);
      el.canvas.title = ITEM_NAMES[stack.id] ?? stack.id;
    } else {
      el.qty.textContent = "";
      el.canvas.title = "";
    }
  }
}
