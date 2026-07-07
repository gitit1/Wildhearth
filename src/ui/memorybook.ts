import { CATEGORIES, discoveredCount, discoveredName, type Collections } from "../systems/collections";
import type { Memories } from "../systems/memories";
import { drawItemIcon } from "../art/icons";
import { createScaleWindow } from "./windows/scalewindow";
import { toggleWindow } from "./windows/manager";
import type { WindowHandle } from "./windows/window";

/**
 * Memory Book window (Windows migration I): one window, two tabs —
 * Collections (X/Y discovered per category) and Memories (the curated
 * life-event log). Icon 📖 / key B toggle it (M belongs to the minimap — the
 * two collided before that split); Esc closes it via the shared cascade
 * (Windows migration II) when it's the topmost open window. Default: hidden,
 * center-left.
 */

const ICON_PX = 22;

let win: WindowHandle;
let bookBtn: HTMLElement | null;
let tabCol: HTMLElement;
let tabMem: HTMLElement;
let body: HTMLElement;
let tab: "collections" | "memories" = "collections";
let col: Collections;
let mem: Memories;

export function initMemoryBook(collections: Collections, memories: Memories) {
  col = collections;
  mem = memories;
  const panel = document.getElementById("memoryPanel")!;
  bookBtn = document.getElementById("bookBtn");
  tabCol = document.getElementById("bookTabCollections")!;
  tabMem = document.getElementById("bookTabMemories")!;
  body = document.getElementById("bookBody")!;

  tabCol.addEventListener("click", () => { tab = "collections"; render(); });
  tabMem.addEventListener("click", () => { tab = "memories"; render(); });

  win = createScaleWindow({
    id: "memorybook", title: "Memory Book", icon: "📖",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: Math.round(d.w * 0.22), y: Math.round(d.h * 0.18) }),
    onVisibleChange: (hidden) => { bookBtn?.classList.toggle("active", !hidden); if (!hidden) render(); },
  });
  win.close(); // default: hidden

  bookBtn?.addEventListener("click", () => toggleWindow(win));
  // B for Book — M belongs to the minimap. Escape is handled generically now
  // (the shared Esc cascade in src/ui/windows/setup.ts closes the topmost
  // open utility window).
  addEventListener("keydown", (e) => { if (e.code === "KeyB") toggleWindow(win); });
}

function iconCanvas(id: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = ICON_PX * devicePixelRatio;
  c.style.width = c.style.height = `${ICON_PX}px`;
  const g = c.getContext("2d")!;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  drawItemIcon(g, id, ICON_PX);
  return c;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function render() {
  tabCol.classList.toggle("active", tab === "collections");
  tabMem.classList.toggle("active", tab === "memories");
  body.replaceChildren();

  if (tab === "collections") {
    for (const cat of CATEGORIES) {
      const head = document.createElement("div");
      head.className = "book-cat";
      head.textContent = `${cat.name}  ${discoveredCount(col, cat.id)}/${cat.itemIds.length}`;
      body.append(head);
      const found = col.discovered[cat.id] ?? [];
      if (found.length === 0) {
        const none = document.createElement("div");
        none.className = "book-empty";
        none.textContent = "Nothing recorded yet.";
        body.append(none);
        continue;
      }
      const grid = document.createElement("div");
      grid.className = "book-grid";
      for (const id of found) {
        const cell = document.createElement("div");
        cell.className = "book-item";
        const name = document.createElement("span");
        name.textContent = discoveredName(id);
        cell.append(iconCanvas(id), name);
        grid.append(cell);
      }
      body.append(grid);
    }
  } else {
    if (mem.entries.length === 0) {
      const none = document.createElement("div");
      none.className = "book-empty";
      none.textContent = "No memories yet — go live a little.";
      body.append(none);
    }
    // newest last in storage; the book reads oldest -> newest, like a diary
    for (const e of mem.entries) {
      const row = document.createElement("div");
      row.className = "book-mem";
      const when = document.createElement("span");
      when.className = "book-when";
      when.textContent = `${cap(e.season)}, Day ${e.day}`;
      const what = document.createElement("span");
      what.textContent = e.text;
      row.append(when, what);
      // optional AI event-narration flavor (Part D #5) — a quiet italic sub-line
      if (e.flavor) {
        const flavor = document.createElement("span");
        flavor.className = "book-flavor";
        flavor.style.cssText = "display:block;font-style:italic;opacity:.8;margin-top:2px";
        flavor.textContent = e.flavor;
        row.append(flavor);
      }
      body.append(row);
    }
  }
}

/** Keeps the page fresh while open (a discovery can land mid-view) —
 *  re-rendered at most once a second to spare the DOM. */
let lastRender = 0;
export function updateMemoryBook() {
  if (!win.isOpen()) return;
  const now = performance.now();
  if (now - lastRender < 1000) return;
  lastRender = now;
  render();
}
