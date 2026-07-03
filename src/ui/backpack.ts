import type { Economy } from "../systems/economy";
import { ITEM_NAMES } from "../systems/inventory";
import { drawItemIcon } from "../art/icons";
import { makePanel } from "./panels";

/**
 * Backpack panel: always visible UO-style. Drag the header to move, corner
 * grip to resize, key I (or Escape) toggles.
 */

const ICON_PX = 40;

let panel: HTMLElement;
let open = true;
let eco: Economy;
let iconScale = 1;
let slotEls: { canvas: HTMLCanvasElement; qty: HTMLElement; paintedKey: string }[] = [];

export function initBackpack(economy: Economy) {
  eco = economy;
  panel = document.getElementById("backpack")!;
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
  }

  addEventListener("keydown", (e) => {
    if (e.code === "KeyI") { open = !open; render(); }
    else if (e.code === "Escape" && open) open = false;
    else return;
    panel.style.display = open ? "block" : "none";
  });

  panel.style.display = "block";
  makePanel(panel, panel.querySelector("h2")!, "bag", setScale);
}

/** Call every frame; repaints only while open and only slots that changed. */
export function updateBackpack() {
  if (open) render();
}

/** Resizes the whole panel; slot canvases re-render crisp at the new size. */
function setScale(s: number) {
  iconScale = s;
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
