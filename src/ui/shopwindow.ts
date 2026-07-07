import { GOOD_PRICES, goodCount, sellGood, type Economy } from "../systems/economy";
import { SHOP_STOCK, tryBuy, tryBuyLivestock, owned, discountedPrice } from "../systems/shop";
import { ITEM_NAMES } from "../systems/inventory";
import { skillValue, gainSkill, type Skills } from "../systems/skills";
import type { FarmState } from "../systems/renovation";
import type { Livestock } from "../systems/livestock";
import type { Season } from "../systems/calendar";
import { drawItemIcon } from "../art/icons";
import { makePanel } from "./panels";
import { skillGainPopup } from "./skills";
import { categoryItemIds, categoryById } from "../systems/sellCategories";

/**
 * The market trade window (UO vendor gump): opens when you interact with
 * the stall. Sell side lists the sellable goods in your backpack with a
 * quantity stepper and a live total; buy side lists the stall's stock.
 * Pure UI over systems/economy.ts + systems/shop.ts.
 */

const ICON_PX = 26;

let panel: HTMLElement;
let titleEl: HTMLElement;
let sellList: HTMLElement;
let buyList: HTMLElement;
let buyLabelEl: HTMLElement;
let coinsEl: HTMLElement;
let open = false;

/** "player" = the farm stall (sell everything + buy stock). "npc" = a single
 *  NPC-specialty stall (Maren's fish stall, and future produce/etc. stalls):
 *  one sell category, no buy side, its own title. */
type SellMode = { kind: "player" } | { kind: "npc"; npcName: string; categoryId: string; onSale: () => void };
let mode: SellMode = { kind: "player" };
let eco: Economy;
let sk: Skills;
let farmSt: FarmState;
let stock: Livestock;
let onAnimal: (kind: "hen" | "cow") => void = () => {};
let seasonNow: () => Season = () => "spring";
let sellableIds: () => string[] = () => [];   // path/category-aware sell list
let toastFn: (s: string) => void = () => {};
let memoryFn: (key: string, text: string) => void = () => {};
let logSaleFn: (coins: number, qty: number) => void = () => {};
let logPurchaseFn: (coins: number) => void = () => {};
const sellQty = new Map<string, number>();
const buyQty = new Map<string, number>();

export function initShopWindow(
  economy: Economy, skills: Skills, farm: FarmState, livestock: Livestock,
  onAnimalBought: (kind: "hen" | "cow") => void, currentSeason: () => Season,
  sellable: () => string[],
  toast: (s: string) => void, memory: (key: string, text: string) => void,
  logSale: (coins: number, qty: number) => void = () => {},
  logPurchase: (coins: number) => void = () => {},
) {
  eco = economy;
  sk = skills;
  farmSt = farm;
  stock = livestock;
  onAnimal = onAnimalBought;
  seasonNow = currentSeason;
  sellableIds = sellable;
  toastFn = toast;
  memoryFn = memory;
  logSaleFn = logSale;
  logPurchaseFn = logPurchase;
  panel = document.getElementById("shopWindow")!;
  titleEl = document.getElementById("shopTitle")!;
  sellList = document.getElementById("shopSell")!;
  buyList = document.getElementById("shopBuy")!;
  buyLabelEl = document.getElementById("shopBuyLabel")!;
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
  mode = { kind: "player" };
  open = true;
  render();
  panel.style.display = "block";
}

/**
 * Opens the same trade window in sell-only mode for an NPC-specialty stall
 * (Maren's fish stall, and future produce/etc. stalls) — parameterizes the
 * existing machinery rather than forking it: one sell category (no buy side),
 * its own title. `onSale` fires after every successful sell (a single item or
 * "Sell all <category>"); the caller decides whether that's a "first sale"
 * worth a reaction, mirroring how the player-stall path always calls its own
 * first-sale memory hook regardless of whether it's actually the first time.
 */
export function openNpcStallWindow(npcName: string, categoryId: string, onSale: () => void) {
  mode = { kind: "npc", npcName, categoryId, onSale };
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
  const npc = mode.kind === "npc" ? mode : null;
  titleEl.textContent = npc ? `🐟 ${npc.npcName}'s stall` : "🛒 Market stall";
  buyLabelEl.style.display = npc ? "none" : "";
  buyList.style.display = npc ? "none" : "";

  // ----- sell side -----
  // player mode: path/category-aware union of everything this player can sell.
  // npc mode: ONLY the one category this stall buys, regardless of the
  // player's own capability gate (Maren buys fish whether or not you're a
  // "fishing path" player) — looked up straight from sellCategories.ts, never
  // a hand-listed id set.
  sellList.replaceChildren();
  const goods = (npc ? categoryItemIds(npc.categoryId) : sellableIds()).filter((id) => goodCount(eco, id) > 0);
  if (goods.length === 0) {
    const empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.textContent = npc ? `Nothing in your bag ${npc.npcName} wants.` : "Nothing in your bag the stall wants.";
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
      if (earned > 0) {
        toastFn(`Sold ${q} ${(ITEM_NAMES[id] ?? id).toLowerCase()} for ${earned} coins!`);
        logSaleFn(earned, q);
        if (npc) npc.onSale(); else memoryFn("first_sale", "Your first sale at the stall.");
      }
      sellQty.delete(id);
      render();
    });
    row.append(iconCanvas(id), name, stepper(() => q, (n) => sellQty.set(id, n), () => have), total, btn);
    sellList.append(row);
  }
  if (goods.length > 1) {
    const all = document.createElement("button");
    all.className = "shop-btn shop-sellall";
    all.textContent = npc ? `Sell all ${categoryById(npc.categoryId)?.label ?? "goods"}` : "Sell everything";
    all.addEventListener("click", () => {
      // sell everything THE STALL SHOWS — hidden-category goods stay in the bag
      let earned = 0, units = 0;
      for (const id of goods) {
        const have = goodCount(eco, id);
        const e = sellGood(eco, id);
        earned += e;
        if (e > 0) units += have;
      }
      if (earned > 0) {
        toastFn(`Sold everything for ${earned} coins!`);
        logSaleFn(earned, units);
        if (npc) npc.onSale(); else memoryFn("first_sale", "Your first sale at the stall.");
      }
      sellQty.clear();
      render();
    });
    sellList.append(all);
  }

  // ----- buy side (Haggling skill discounts the asking price). NPC-specialty
  // stalls never sell anything back (Maren buys fish, she doesn't stock
  // tools/seeds) — the section is hidden above, and there's nothing to build. -----
  buyList.replaceChildren();
  if (npc) return;
  const haggling = skillValue(sk, "haggling");
  for (const entry of SHOP_STOCK) {
    // seasonal stock (seed packets) only appears in its planting season
    if (entry.seasons && !entry.seasons.includes(seasonNow())) continue;
    // livestock rows: barn-gated, never enter the backpack, spawn in the yard
    if (entry.livestock) {
      if (entry.livestock === "cow" && stock.cow) continue;   // one cow, like the hoe
      const price = discountedPrice(entry.price, haggling);
      const tag = price < entry.price ? ` (was ${entry.price})` : "";
      const row = document.createElement("div");
      row.className = "shop-row";
      const name = document.createElement("span");
      name.className = "shop-name";
      name.textContent = entry.livestock === "hen" && stock.hens > 0
        ? `${ITEM_NAMES[entry.id]} (have ${stock.hens})` : ITEM_NAMES[entry.id]!;
      const total = document.createElement("span");
      total.className = "shop-total";
      total.textContent = `${price}${tag}`;
      const btn = document.createElement("button");
      btn.className = "shop-btn";
      btn.textContent = "Buy";
      btn.addEventListener("click", () => {
        const kind = entry.livestock!;
        const r = tryBuyLivestock(eco, entry, farmSt, stock, haggling);
        if (r === "no-barn") { toastFn("Mend the barn first — animals need a sound home."); return; }
        if (r === "no-coins") { toastFn(`Not enough coins — that costs ${price}.`); return; }
        if (r === "owned") { render(); return; }
        onAnimal(kind);
        toastFn(kind === "cow" ? "A cow of your own! She heads for the barn." : "A new hen joins the yard!");
        memoryFn("first_animal", "The yard has a heartbeat now — first animal.");
        logPurchaseFn(price);
        const gained = gainSkill(sk, "haggling");   // every purchase is practice
        if (gained > 0) skillGainPopup("haggling", gained);
        render();
      });
      row.append(iconCanvas(entry.id), name, total, btn);
      buyList.append(row);
      continue;
    }
    if (owned(eco, entry)) continue;
    const q = entry.unique ? 1 : Math.max(1, buyQty.get(entry.id) ?? 1);
    buyQty.set(entry.id, q);
    const price = discountedPrice(entry.price, haggling);
    const tag = price < entry.price ? ` (was ${entry.price})` : "";

    const row = document.createElement("div");
    row.className = "shop-row";
    const name = document.createElement("span");
    name.className = "shop-name";
    name.textContent = ITEM_NAMES[entry.id] ?? entry.id;
    const total = document.createElement("span");
    total.className = "shop-total";
    total.textContent = entry.unique ? `${price}${tag}` : `${price} × ${q} = ${price * q}${tag}`;
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = "Buy";
    btn.addEventListener("click", () => {
      if (eco.coins < price * q) { toastFn(`Not enough coins — that costs ${price * q}.`); return; }
      let bought = 0;
      for (let i = 0; i < q; i++) {
        const r = tryBuy(eco, entry, haggling);
        if (r !== "ok") { if (r === "bag-full") toastFn("Backpack full — no room for more."); break; }
        bought++;
      }
      if (bought > 0) {
        const n = ITEM_NAMES[entry.id] ?? entry.id;
        toastFn(`Bought ${entry.unique ? `a ${n.toLowerCase()}` : `${bought} ${n.toLowerCase()}`}!`);
        logPurchaseFn(price * bought);
        const gained = gainSkill(sk, "haggling");   // every purchase is practice
        if (gained > 0) skillGainPopup("haggling", gained);
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
