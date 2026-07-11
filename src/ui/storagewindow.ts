import type { Economy } from "../systems/economy";
import { ITEM_NAMES } from "../systems/inventory";
import { deposit, withdraw, type Storage } from "../systems/storage";
import { drawItemIcon } from "../art/icons";
import { createScaleWindow } from "./windows/scalewindow";
import type { WindowHandle } from "./windows/window";

/**
 * Barn storage window (R5) — the barn's first real use. A two-grid chest UI
 * (barn on the left, backpack on the right) built on the same window-system
 * patterns as the backpack/shop: a --s-scaled content panel wrapped in a
 * resizable wm window. Click a slot to move its whole stack across (backpack →
 * barn deposits, barn → backpack withdraws). Opened programmatically by walking
 * up to the (mended) barn; walking away, the ✕, or Esc close it. Pure UI over
 * systems/storage.ts.
 */

const ICON_PX = 34;

let win: WindowHandle;
let storagePanel: HTMLElement;
let barnGrid: HTMLElement;
let bagGrid: HTMLElement;
let noteEl: HTMLElement;
let st: Storage;
let eco: Economy;
let toastFn: (s: string) => void = () => {};
let scale = 1;

interface SlotEl { canvas: HTMLCanvasElement; qty: HTMLElement; wrap: HTMLElement }
let barnSlots: SlotEl[] = [];
let bagSlots: SlotEl[] = [];

function buildSlot(grid: HTMLElement, onClick: () => void): SlotEl {
  const wrap = document.createElement("div");
  wrap.className = "st-slot";
  const canvas = document.createElement("canvas");
  const qty = document.createElement("span");
  qty.className = "st-qty";
  wrap.append(canvas, qty);
  wrap.addEventListener("click", onClick);
  grid.append(wrap);
  return { canvas, qty, wrap };
}

export function initStorageWindow(storage: Storage, economy: Economy, toast: (s: string) => void) {
  st = storage;
  eco = economy;
  toastFn = toast;
  storagePanel = document.getElementById("storageWindow")!;
  barnGrid = document.getElementById("storageGrid")!;
  bagGrid = document.getElementById("storageBag")!;
  noteEl = document.getElementById("storageNote")!;

  for (let i = 0; i < st.inv.slots.length; i++) {
    barnSlots.push(buildSlot(barnGrid, () => {
      if (!st.inv.slots[i]) return;
      if (withdraw(st, eco, i)) render();
      else toastFn("Backpack is full — make room first.");
    }));
  }
  for (let i = 0; i < eco.inv.slots.length; i++) {
    bagSlots.push(buildSlot(bagGrid, () => {
      if (!eco.inv.slots[i]) return;
      if (deposit(st, eco, i)) render();
      else toastFn("The barn's shelves are full.");
    }));
  }

  win = createScaleWindow({
    id: "storage", title: "Barn storage", icon: "📦",
    content: storagePanel,
    onScale: (s) => { scale = s; storagePanel.style.setProperty("--s", String(s)); sizeCanvases(); render(); },
    defaultPos: (d) => ({ x: Math.round(d.w * 0.5 - 220), y: Math.round(d.h * 0.5 - 200) }),
  });
  win.close();   // default: hidden — opened by walking up to the barn
  sizeCanvases();
}

function sizeCanvases() {
  const px = Math.round(ICON_PX * scale);
  for (const el of [...barnSlots, ...bagSlots]) {
    el.canvas.width = px * devicePixelRatio;
    el.canvas.height = px * devicePixelRatio;
    el.canvas.style.width = el.canvas.style.height = `${px}px`;
  }
}

function paintGrid(slots: SlotEl[], stacks: (import("../systems/inventory").ItemStack | null)[]) {
  const px = Math.round(ICON_PX * scale);
  for (let i = 0; i < slots.length; i++) {
    const el = slots[i]!;
    const stack = stacks[i] ?? null;
    const g = el.canvas.getContext("2d")!;
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    g.clearRect(0, 0, px, px);
    if (stack) {
      drawItemIcon(g, stack.id, px);
      el.qty.textContent = stack.qty > 1 ? String(stack.qty) : "";
      el.canvas.title = ITEM_NAMES[stack.id] ?? stack.id;
      el.wrap.classList.remove("st-empty");
    } else {
      el.qty.textContent = "";
      el.canvas.title = "";
      el.wrap.classList.add("st-empty");
    }
  }
}

function render() {
  paintGrid(barnSlots, st.inv.slots);
  paintGrid(bagSlots, eco.inv.slots);
}

/** Sets (or clears) the "your animals left …" banner shown when overnight
 *  produce arrived (barn collection loop). Pass null/"" to hide it. Call BEFORE
 *  openStorageWindow so it's in place when the window renders. */
export function setStorageNote(text: string | null) {
  if (!noteEl) return;
  if (text) { noteEl.textContent = text; noteEl.style.display = ""; }
  else { noteEl.textContent = ""; noteEl.style.display = "none"; }
}

export function isStorageOpen(): boolean { return win.isOpen(); }
export function openStorageWindow() { render(); win.open(); }
export function closeStorageWindow() { win.close(); }

/** Keeps the grids honest if inventory changes while the window is open. */
export function updateStorageWindow() {
  if (win.isOpen()) render();
}
