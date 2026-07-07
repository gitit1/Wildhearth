import type { Economy } from "../systems/economy";
import { ITEM_NAMES, countItem } from "../systems/inventory";
import { drawItemIcon } from "../art/icons";
import { createScaleWindow } from "./windows/scalewindow";
import type { WindowHandle } from "./windows/window";

/**
 * Gift chooser window (Windows migration I, Relationship engine): a small
 * item picker reusing the trade window's row/button chrome. Opens targeting
 * one NPC, lists the giftable goods currently in the bag with icons, and
 * calls back on a pick. The give flow itself (consume + apply delta + toast +
 * memory) lives in main.ts — this is pure UI. Opened programmatically (no
 * dock icon/shortcut); Escape or the window's own ✕ close it. Default:
 * hidden, near the shop window.
 */

const ICON_PX = 26;

let win: WindowHandle;
let listEl: HTMLElement;
let eco: Economy;
let onPick: (id: string) => void = () => {};
let giftableIds: string[] = [];

export function initGiftChooser(economy: Economy) {
  eco = economy;
  const panel = document.getElementById("giftChooser")!;
  listEl = document.getElementById("giftList")!;

  win = createScaleWindow({
    id: "gift", title: "Give a gift", icon: "🎁",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: Math.round(d.w * 0.5 - 280) + 40, y: Math.round(d.h * 0.5 - 240) + 40 }),
  });
  win.close(); // default: hidden

  // Escape closes the chooser first (its capture handler beats the backpack's).
  addEventListener("keydown", (e) => {
    if (e.code === "Escape" && win.isOpen()) { closeGiftChooser(); e.stopImmediatePropagation(); }
  }, true);
}

export function isGiftChooserOpen(): boolean { return win.isOpen(); }

/** Open the chooser for `name`, listing `ids` (giftable goods held), calling
 *  `pick` when the player commits one. */
export function openGiftChooser(name: string, ids: string[], pick: (id: string) => void) {
  giftableIds = ids;
  onPick = pick;
  win.setTitle(`Give ${name} a gift`);
  render();
  win.open();
}

export function closeGiftChooser() {
  win.close();
}

function iconCanvas(id: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = ICON_PX * devicePixelRatio;
  c.style.width = c.style.height = `${ICON_PX}px`;
  c.className = "shop-icon";
  const g = c.getContext("2d")!;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  drawItemIcon(g, id, ICON_PX);
  return c;
}

function render() {
  listEl.replaceChildren();
  const held = giftableIds.filter((id) => countItem(eco.inv, id) > 0);
  if (held.length === 0) {
    const empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.textContent = "Nothing in your bag to give.";
    listEl.append(empty);
    return;
  }
  for (const id of held) {
    const row = document.createElement("div");
    row.className = "shop-row";
    const name = document.createElement("span");
    name.className = "shop-name";
    name.textContent = `${ITEM_NAMES[id] ?? id} ×${countItem(eco.inv, id)}`;
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = "Give";
    btn.addEventListener("click", () => { onPick(id); if (win.isOpen()) render(); });
    row.append(iconCanvas(id), name, btn);
    listEl.append(row);
  }
}

/** Keep the counts honest if the bag changes while open (e.g. after a give). */
export function updateGiftChooser() {
  if (win.isOpen()) render();
}
