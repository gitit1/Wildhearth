/**
 * The town STABLE's trade window (v2 BLOCK #5 — transportation vendor). Opened
 * by walking up to the stable; walking away closes it (main.ts proximity check),
 * as with the market stall / town merchants. A small buy-only gump listing the
 * three vehicles (rowboat / horse / carriage) with their effect blurb + price;
 * an owned vehicle shows "Owned" instead, and the horse row also offers a live
 * Mount / Dismount toggle. Pure presentation over systems/transport.ts — every
 * mutation calls back into main (buy, mount toggle).
 *
 * Content DOM is built in code (no index.html panel), reusing the shared shop-*
 * chrome + a couple of stable-specific classes (see index.html). It's a real wm
 * scale-window: draggable/resizable/minimizable, Esc closes it via the cascade.
 */
import { createScaleWindow } from "./windows/scalewindow";
import type { WindowHandle } from "./windows/window";
import { type Economy } from "../systems/economy";
import {
  TRANSPORT_ITEMS, buyTransport, ownsTransport, type Transport, type TransportItem,
} from "../systems/transport";

export interface StableHooks {
  economy: Economy;
  transport: Transport;
  toast: (s: string) => void;
  memory: (key: string, text: string) => void;
  logPurchase: (coins: number) => void;
  /** Whether she can mount right now (owns a horse, outdoors, not busy) + the
   *  current mounted flag, and the toggle itself — main owns the live state. */
  isMounted: () => boolean;
  canMount: () => boolean;
  toggleMount: () => void;
}

let win: WindowHandle;
let panel: HTMLElement;
let coinsEl: HTMLElement;
let listEl: HTMLElement;
let h: StableHooks;

export function initStableWindow(hooks: StableHooks) {
  h = hooks;
  panel = document.createElement("div");
  panel.id = "stableWindow";
  const head = document.createElement("div");
  head.className = "shop-head";
  head.innerHTML = `🪙 <span id="stableCoins">0</span>`;
  const section = document.createElement("div");
  section.className = "shop-section";
  section.textContent = "The Stable — transport for sale";
  listEl = document.createElement("div");
  listEl.id = "stableList";
  panel.append(head, section, listEl);
  document.body.appendChild(panel);   // in the DOM so createScaleWindow can measure it
  coinsEl = head.querySelector("#stableCoins")!;

  render();   // populate before the natural size is measured

  win = createScaleWindow({
    id: "stable", title: "Stable", icon: "🐴",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: Math.round(d.w * 0.5 - 190), y: Math.round(d.h * 0.5 - 170) }),
  });
  win.close();   // default: hidden — opened by walking up to the stable
}

export function isStableOpen(): boolean { return win.isOpen(); }

export function openStableWindow() {
  render();
  win.open();
  fitHeight();
}

export function closeStableWindow() { win.close(); }

/** Keep the window honest if coins change (a sale elsewhere) while it's open. */
export function updateStableWindow() {
  if (win?.isOpen()) coinsEl.textContent = String(h.economy.coins);
}

function fitHeight() {
  if (!win.isOpen()) return;
  const tb = win.el.querySelector<HTMLElement>(".wh-titlebar");
  const tbH = tb ? tb.offsetHeight : 30;
  win.setRect({ h: Math.round(tbH + panel.getBoundingClientRect().height + 2) });
}

function buyRow(item: TransportItem) {
  const owned = ownsTransport(h.transport, item.id);
  const row = document.createElement("div");
  row.className = "shop-row";

  const emoji = document.createElement("span");
  emoji.className = "stable-emoji";
  emoji.textContent = item.icon;

  const name = document.createElement("span");
  name.className = "shop-name";
  const title = document.createElement("span");
  title.textContent = item.name;
  const blurb = document.createElement("span");
  blurb.className = "stable-blurb";
  blurb.textContent = ` ${item.blurb}`;
  name.append(title, blurb);

  const total = document.createElement("span");
  total.className = "shop-total";
  total.textContent = owned ? "Owned" : String(item.price);

  row.append(emoji, name, total);

  if (!owned) {
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = "Buy";
    btn.addEventListener("click", () => {
      const r = buyTransport(h.economy, h.transport, item.id);
      if (r === "no-coins") { h.toast(`Not enough coins — that costs ${item.price}.`); return; }
      if (r === "owned") { render(); return; }
      h.toast(item.boughtLine);
      h.memory(`bought_${item.id}`, `You bought your first ${item.name.toLowerCase()} at the town stable.`);
      h.logPurchase(item.price);
      render();
    });
    row.append(btn);
  } else if (item.id === "horse") {
    // owned horse: a live Mount / Dismount toggle right on the row
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    const mounted = h.isMounted();
    btn.textContent = mounted ? "Dismount" : "Mount";
    if (!mounted && !h.canMount()) btn.disabled = true;
    btn.addEventListener("click", () => { h.toggleMount(); render(); });
    row.append(btn);
  }
  return row;
}

function render() {
  coinsEl.textContent = String(h.economy.coins);
  listEl.replaceChildren();
  for (const item of TRANSPORT_ITEMS) listEl.append(buyRow(item));
}
