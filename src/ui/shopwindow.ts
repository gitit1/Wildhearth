import { GOOD_PRICES, goodCount, sellGood, sellAllGoods, type Economy } from "../systems/economy";
import { SHOP_STOCK, tryBuy, owned } from "../systems/shop";
import { ITEM_NAMES } from "../systems/inventory";
import { drawItemIcon } from "../art/icons";
import { makePanel } from "./panels";

/**
 * The market trade window (UO vendor gump): opens when you interact with
 * the stall. Sell side lists the sellable goods in your backpack with a
 * quantity stepper and a live total; buy side lists the stall's stock.
 * Pure UI over systems/economy.ts + systems/shop.ts.
 */

const ICON_PX = 26;

let panel: HTMLElement;
let sellList: HTMLElement;
let buyList: HTMLElement;
let coinsEl: HTMLElement;
let open = false;
let eco: Economy;
let toastFn: (s: string) => void = () => {};
const sellQty = new Map<string, number>();
const buyQty = new Map<string, number>();

export function initShopWindow(economy: Economy, toast: (s: string) => void) {
  eco = economy;
  toastFn = toast;
  panel = document.getElementById("shopWindow")!;
  sellList = document.getElementById("shopSell")!;
  buyList = document.getElementById("shopBuy")!;
  coinsEl = document.getElementById("shopCoins")!;
  document.getElementById("shopClose")!.addEventListener("click", closeShopWindow);

  // Escape closes the trade window first (before the backpack's handler);
  // the context menu's capture handler still wins while a menu is open.
  addEventListener("keydown", (e) => {
    if (e.code === "Escape" && open) { closeShopWindow(); e.stopImmediatePropagation(); }
  }, true);

  panel.style.display = "block";       // measurable for makePanel, then hidden
  makePanel(panel, panel.querySelector("h2")!, "shop", (s) => {
    panel.style.setProperty("--s", String(s));
  });
  panel.style.display = "none";
}

export function isShopOpen(): boolean { return open; }

export function openShopWindow() {
  open = true;
  render();
  panel.style.display = "block";
}

export function closeShopWindow() {
  open = false;
  panel.style.display = "none";
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

function stepper(get: () => number, set: (n: number) => void, max: () => number): HTMLElement {
  const box = document.createElement("span");
  box.className = "shop-step";
  const minus = document.createElement("button"); minus.textContent = "−";
  const qty = document.createElement("span"); qty.className = "shop-qty";
  const plus = document.createElement("button"); plus.textContent = "+";
  const sync = () => { qty.textContent = String(get()); };
  minus.addEventListener("click", () => { set(Math.max(1, get() - 1)); render(); });
  plus.addEventListener("click", () => { set(Math.min(max(), get() + 1)); render(); });
  sync();
  box.append(minus, qty, plus);
  return box;
}

function render() {
  coinsEl.textContent = String(eco.coins);

  // ----- sell side -----
  sellList.replaceChildren();
  const goods = Object.keys(GOOD_PRICES).filter((id) => goodCount(eco, id) > 0);
  if (goods.length === 0) {
    const empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.textContent = "Nothing in your bag the stall wants.";
    sellList.append(empty);
  }
  for (const id of goods) {
    const have = goodCount(eco, id);
    const q = Math.min(sellQty.get(id) ?? have, have);
    sellQty.set(id, q);
    const price = GOOD_PRICES[id]!;

    const row = document.createElement("div");
    row.className = "shop-row";
    const name = document.createElement("span");
    name.className = "shop-name";
    name.textContent = `${ITEM_NAMES[id] ?? id} ×${have}`;
    const total = document.createElement("span");
    total.className = "shop-total";
    total.textContent = `${price} × ${q} = ${price * q}`;
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = "Sell";
    btn.addEventListener("click", () => {
      const earned = sellGood(eco, id, q);
      if (earned > 0) toastFn(`Sold ${q} ${(ITEM_NAMES[id] ?? id).toLowerCase()} for ${earned} coins!`);
      sellQty.delete(id);
      render();
    });
    row.append(iconCanvas(id), name, stepper(() => q, (n) => sellQty.set(id, n), () => have), total, btn);
    sellList.append(row);
  }
  if (goods.length > 1) {
    const all = document.createElement("button");
    all.className = "shop-btn shop-sellall";
    all.textContent = "Sell everything";
    all.addEventListener("click", () => {
      const earned = sellAllGoods(eco);
      if (earned > 0) toastFn(`Sold everything for ${earned} coins!`);
      sellQty.clear();
      render();
    });
    sellList.append(all);
  }

  // ----- buy side -----
  buyList.replaceChildren();
  for (const entry of SHOP_STOCK) {
    if (owned(eco, entry)) continue;
    const q = entry.unique ? 1 : Math.max(1, buyQty.get(entry.id) ?? 1);
    buyQty.set(entry.id, q);

    const row = document.createElement("div");
    row.className = "shop-row";
    const name = document.createElement("span");
    name.className = "shop-name";
    name.textContent = ITEM_NAMES[entry.id] ?? entry.id;
    const total = document.createElement("span");
    total.className = "shop-total";
    total.textContent = entry.unique ? `${entry.price}` : `${entry.price} × ${q} = ${entry.price * q}`;
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = "Buy";
    btn.addEventListener("click", () => {
      if (eco.coins < entry.price * q) { toastFn(`Not enough coins — that costs ${entry.price * q}.`); return; }
      let bought = 0;
      for (let i = 0; i < q; i++) {
        const r = tryBuy(eco, entry);
        if (r !== "ok") { if (r === "bag-full") toastFn("Backpack full — no room for more."); break; }
        bought++;
      }
      if (bought > 0) {
        const n = ITEM_NAMES[entry.id] ?? entry.id;
        toastFn(`Bought ${entry.unique ? `a ${n.toLowerCase()}` : `${bought} ${n.toLowerCase()}`}!`);
      }
      buyQty.delete(entry.id);
      render();
    });
    row.append(iconCanvas(entry.id), name);
    if (!entry.unique) row.append(stepper(() => q, (n) => buyQty.set(entry.id, n), () => 99));
    row.append(total, btn);
    buyList.append(row);
  }
  if (!buyList.hasChildNodes()) {
    const empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.textContent = "You already own everything on offer.";
    buyList.append(empty);
  }
}

/** Keeps the numbers honest if inventory changes while the window is open. */
export function updateShopWindow() {
  if (open) coinsEl.textContent = String(eco.coins);
}
