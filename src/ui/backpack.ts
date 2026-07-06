import type { Economy } from "../systems/economy";
import { ITEM_NAMES } from "../systems/inventory";
import { isEdible } from "../systems/needs";
import { drawItemIcon } from "../art/icons";
import { makePanel } from "./panels";
import { openContextMenu } from "./contextmenu";

/**
 * Backpack panel: always visible UO-style. Drag the header to move, corner
 * grip to resize, key I (or Escape) toggles. Right-click (or long-press) an
 * edible item for an "Eat" action (Needs engine).
 */

const ICON_PX = 40;

let panel: HTMLElement;
let bagBtn: HTMLElement | null;
let open = true;
let eco: Economy;
let iconScale = 1;
let slotEls: { canvas: HTMLCanvasElement; qty: HTMLElement; paintedKey: string }[] = [];
// eat one of an item (owned + mutated by main.ts, so needs stay explicit-passed)
let eatItem: (id: string) => boolean = () => false;

export function initBackpack(economy: Economy, eat: (id: string) => boolean) {
  eco = economy;
  eatItem = eat;
  panel = document.getElementById("backpack")!;
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

  // Two ways in: the HUD icon (mouse-first) and the I / Escape shortcuts.
  bagBtn?.addEventListener("click", () => setOpen(!open));
  addEventListener("keydown", (e) => {
    if (e.code === "KeyI") setOpen(!open);
    else if (e.code === "Escape" && open) setOpen(false);
  });

  setOpen(true);
  makePanel(panel, panel.querySelector("h2")!, "bag", setScale);
}

function setOpen(v: boolean) {
  open = v;
  panel.style.display = open ? "block" : "none";
  bagBtn?.classList.toggle("active", open);
  if (open) render();
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
