import { GOOD_PRICES, goodCount, sellGood, sellGoodAt, type Economy } from "../systems/economy";
import { SHOP_STOCK, tryBuy, tryBuyLivestock, owned, discountedPrice, type ShopEntry } from "../systems/shop";
import { ITEM_NAMES } from "../systems/inventory";
import { skillValue, gainSkill, type Skills } from "../systems/skills";
import type { FarmState } from "../systems/renovation";
import type { Livestock } from "../systems/livestock";
import type { Season } from "../systems/calendar";
import { drawItemIcon } from "../art/icons";
import { createScaleWindow } from "./windows/scalewindow";
import type { WindowHandle } from "./windows/window";
import { skillGainPopup } from "./skills";
import { categoryItemIds, categoryById } from "../systems/sellCategories";

/**
 * The market trade window (Windows migration I — UO vendor gump): opens when
 * you interact with a stall. Sell side lists the sellable goods in your
 * backpack with a quantity stepper and a live total; buy side lists the
 * stall's stock. Pure UI over systems/economy.ts + systems/shop.ts. Opened
 * programmatically (no dock icon/shortcut) — walking away (main.ts's
 * proximity check calls closeShopWindow()), the window's own ✕, or Esc (the
 * shared cascade, Windows migration II, when it's the topmost open window)
 * close it. The title bar's text is the one dynamic bit — set via
 * `win.setTitle()` each render, since it flips between the player's own
 * stall and an NPC's.
 */

const ICON_PX = 26;

let win: WindowHandle;
let sellList: HTMLElement;
let sellLabelEl: HTMLElement;
let custList: HTMLElement;
let buyList: HTMLElement;
let buyLabelEl: HTMLElement;
let coinsEl: HTMLElement;

/** "player" = the farm stall (sell everything + buy stock). "npc" = a single
 *  buying stall (Maren's fish stall; the town fishmonger/greengrocer): one sell
 *  category, no buy side, its own title, an optional `priceMult` premium on the
 *  price it pays (v2 BLOCK #3 reputation premium). "merchant" = a town SELLING
 *  shop (the general store): buy side only, its own stock + reputation discount. */
type SellMode =
  | { kind: "player" }
  | { kind: "npc"; npcName: string; categoryId: string; onSale: () => void; priceMult: number }
  | { kind: "merchant"; title: string; stock: ShopEntry[]; discount: number };
let mode: SellMode = { kind: "player" };
let eco: Economy;
let sk: Skills;
let farmSt: FarmState;
let stock: Livestock;
let onAnimal: (kind: "hen" | "cow" | "duck" | "pig" | "sheep") => void = () => {};
let seasonNow: () => Season = () => "spring";
let sellableIds: () => string[] = () => [];   // path/category-aware sell list
let toastFn: (s: string) => void = () => {};
let memoryFn: (key: string, text: string) => void = () => {};
let logSaleFn: (coins: number, qty: number) => void = () => {};
let logPurchaseFn: (coins: number) => void = () => {};

/** A townsperson waiting at the player's stall to buy (v2 customers block). */
export interface CustomerRow {
  npcId: string;
  npcName: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  total: number;
}
let customersFn: () => CustomerRow[] = () => [];
let onServeFn: (npcId: string) => void = () => {};
const sellQty = new Map<string, number>();
const buyQty = new Map<string, number>();

export function initShopWindow(
  economy: Economy, skills: Skills, farm: FarmState, livestock: Livestock,
  onAnimalBought: (kind: "hen" | "cow" | "duck" | "pig" | "sheep") => void, currentSeason: () => Season,
  sellable: () => string[],
  toast: (s: string) => void, memory: (key: string, text: string) => void,
  logSale: (coins: number, qty: number) => void = () => {},
  logPurchase: (coins: number) => void = () => {},
  customers: () => CustomerRow[] = () => [],
  onServe: (npcId: string) => void = () => {},
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
  customersFn = customers;
  onServeFn = onServe;
  const panel = document.getElementById("shopWindow")!;
  sellList = document.getElementById("shopSell")!;
  sellLabelEl = document.getElementById("shopSellLabel")!;
  custList = document.getElementById("shopCustomers")!;
  buyList = document.getElementById("shopBuy")!;
  buyLabelEl = document.getElementById("shopBuyLabel")!;
  coinsEl = document.getElementById("shopCoins")!;

  win = createScaleWindow({
    id: "shop", title: "Market stall", icon: "🛒",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: Math.round(d.w * 0.5 - 280), y: Math.round(d.h * 0.5 - 240) }),
  });
  win.close(); // default: hidden — opened by walking up to a stall
}

export function isShopOpen(): boolean { return win.isOpen(); }

/** Fit the window's height to its (now scroll-bounded) content, so it opens at a
 *  sensible size rather than the tiny box measured while its lists were empty at
 *  init. Width is left alone (width drives the panel scale); a resizable window's
 *  .wh-body has no padding, so it's just the title bar + the panel's own box. */
function fitHeight() {
  if (!win.isOpen()) return;
  const panel = document.getElementById("shopWindow")!;
  const tb = win.el.querySelector<HTMLElement>(".wh-titlebar");
  const tbH = tb ? tb.offsetHeight : 30;
  win.setRect({ h: Math.round(tbH + panel.getBoundingClientRect().height + 2) });
}

export function openShopWindow() {
  mode = { kind: "player" };
  render();
  win.open();
  fitHeight();
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
export function openNpcStallWindow(npcName: string, categoryId: string, onSale: () => void, priceMult = 1) {
  mode = { kind: "npc", npcName, categoryId, onSale, priceMult };
  render();
  win.open();
  fitHeight();
}

/** A town SELLING merchant (v2 BLOCK #3 — the general store): a buy-only window
 *  over its own `stock`, with a reputation `discount` (0..1) stacked on top of
 *  the passive Haggling discount. No sell side, no customers. */
export function openMerchantBuyWindow(title: string, merchantStock: ShopEntry[], discount = 0) {
  mode = { kind: "merchant", title, stock: merchantStock, discount };
  render();
  win.open();
  fitHeight();
}

export function closeShopWindow() {
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
  const merchant = mode.kind === "merchant" ? mode : null;
  win.setTitle(merchant ? merchant.title : npc ? `${npc.npcName}'s stall` : "Market stall");
  // buy side hidden for a BUYING stall (npc); sell side hidden for a SELLING
  // merchant (general store). The player's own stall shows both.
  buyLabelEl.style.display = npc ? "none" : "";
  buyList.style.display = npc ? "none" : "";
  sellLabelEl.style.display = merchant ? "none" : "";
  sellList.style.display = merchant ? "none" : "";

  // ----- customers at your stall (player mode only): townsfolk who walked up
  // wanting to buy, paying a premium over the flat rate. Serving one is handled
  // by main.ts (onServeFn): coins + the same sell seam a flat sale fires + a
  // small Friendship bump + the customer leaving. -----
  custList.replaceChildren();
  if (!npc && !merchant) {
    const waiting = customersFn();
    if (waiting.length > 0) {
      const head = document.createElement("div");
      head.className = "shop-section";
      head.textContent = waiting.length === 1 ? "A customer at your stall" : "Customers at your stall";
      custList.append(head);
      for (const c of waiting) {
        const itemName = (ITEM_NAMES[c.itemId] ?? c.itemId).toLowerCase();
        const row = document.createElement("div");
        row.className = "shop-row";
        const name = document.createElement("span");
        name.className = "shop-name";
        const who = document.createElement("span");
        who.textContent = c.npcName;
        const want = document.createElement("span");
        want.className = "shop-cust-want";
        want.textContent = ` wants ${c.qty} ${itemName}`;
        name.append(who, want);
        const total = document.createElement("span");
        total.className = "shop-total";
        total.textContent = `${c.unitPrice} × ${c.qty} = ${c.total}`;
        const btn = document.createElement("button");
        btn.className = "shop-btn";
        btn.textContent = "Sell";
        btn.addEventListener("click", () => { onServeFn(c.npcId); render(); });
        row.append(iconCanvas(c.itemId), name, total, btn);
        custList.append(row);
      }
    }
  }

  // ----- sell side (skipped for a SELLING merchant — the general store only
  // sells TO you). -----
  // player mode: path/category-aware union of everything this player can sell.
  // npc mode: ONLY the one category this stall buys, regardless of the player's
  // own capability gate (Maren buys fish whether or not you're a "fishing path"
  // player); the town fishmonger/greengrocer add a reputation `priceMult` premium
  // on the price they pay — looked up straight from sellCategories.ts.
  sellList.replaceChildren();
  // the price this stall pays per unit of `id` (npc premium applied, rounded).
  const payFor = (id: string) => npc ? Math.max(1, Math.round(GOOD_PRICES[id]! * npc.priceMult)) : GOOD_PRICES[id]!;
  const goods = merchant ? [] : (npc ? categoryItemIds(npc.categoryId) : sellableIds()).filter((id) => goodCount(eco, id) > 0);
  if (!merchant && goods.length === 0) {
    const empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.textContent = npc ? `Nothing in your bag ${npc.npcName} wants.` : "Nothing in your bag the stall wants.";
    sellList.append(empty);
  }
  for (const id of goods) {
    const have = goodCount(eco, id);
    const q = Math.min(sellQty.get(id) ?? have, have);
    sellQty.set(id, q);
    const price = payFor(id);

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
      // npc stalls pay the premium unit price (sellGoodAt); the player's own
      // stall sells at the flat GOOD_PRICES rate (sellGood).
      const earned = npc ? sellGoodAt(eco, id, q, price) : sellGood(eco, id, q);
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
        const e = npc ? sellGoodAt(eco, id, have, payFor(id)) : sellGood(eco, id);
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
  // a town SELLING merchant uses its OWN stock + a reputation discount stacked on
  // the passive Haggling one; the player's own stall uses SHOP_STOCK, no extra.
  const buyStock = merchant ? merchant.stock : SHOP_STOCK;
  const extra = merchant ? merchant.discount : 0;
  for (const entry of buyStock) {
    // seasonal stock (seed packets) only appears in its planting season
    if (entry.seasons && !entry.seasons.includes(seasonNow())) continue;
    // livestock rows: barn-gated, never enter the backpack, spawn in the yard.
    // Only the cow is unique — hen/duck/pig/sheep are all flock counters
    // (Part C content-library commit 2 generalizes this from hen-only).
    if (entry.livestock) {
      if (entry.livestock === "cow" && stock.cow) continue;   // one cow, like the hoe
      const price = discountedPrice(entry.price, haggling);
      const tag = price < entry.price ? ` (was ${entry.price})` : "";
      const flockCount = entry.livestock === "hen" ? stock.hens
        : entry.livestock === "duck" ? stock.ducks
        : entry.livestock === "pig" ? stock.pigs
        : entry.livestock === "sheep" ? stock.sheep
        : 0;
      const row = document.createElement("div");
      row.className = "shop-row";
      const name = document.createElement("span");
      name.className = "shop-name";
      name.textContent = flockCount > 0
        ? `${ITEM_NAMES[entry.id]} (have ${flockCount})` : ITEM_NAMES[entry.id]!;
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
        const arriveLine: Record<typeof kind, string> = {
          cow: "A cow of your own! She heads for the barn.",
          hen: "A new hen joins the yard!",
          duck: "A new duck waddles off toward the pond!",
          pig: "A new pig trots off to root around the yard!",
          sheep: "A new sheep joins the flock!",
        };
        toastFn(arriveLine[kind]);
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
    const price = discountedPrice(entry.price, haggling, extra);
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
        const r = tryBuy(eco, entry, haggling, extra);
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
  if (win.isOpen()) coinsEl.textContent = String(eco.coins);
}

/** Full repaint if open — called when a customer arrives at / leaves the stall
 *  while the player already has the trade window up (v2 customers block). Re-fit
 *  so the customers section appearing/clearing grows/shrinks the window tidily. */
export function refreshShopWindow() {
  if (win.isOpen()) { render(); fitHeight(); }
}
