/**
 * The Riverside Fisherwoman's gear shop (v2 BLOCK #6 slice 2). Opened from her
 * dialogue's "Show me your rods and bait" service option; walking away from her
 * closes it (main.ts proximity check, like the stable / NPC stalls). A buy-only
 * gump: her better rods (unique) + bait (stacks). The Master Rod is TRUST-gated
 * — shown but locked until she trusts your technique (a lesson count from slice
 * 3, OR a proven Fishing skill). Pure presentation over data/fishinggear.ts +
 * the economy; every mutation routes back through the hooks.
 *
 * Reuses the shared shop-* / stable-* chrome (index.html) — no new CSS.
 */
import { createScaleWindow } from "./windows/scalewindow";
import type { WindowHandle } from "./windows/window";
import { MASTER_ROD_LESSONS, MASTER_ROD_SKILL } from "../config";
import { ROD_TIERS, BAITS, type RodTier, type Bait } from "../data/fishinggear";
import { addItem, countItem } from "../systems/inventory";
import { saveEconomy, type Economy } from "../systems/economy";

export interface FisherHooks {
  economy: Economy;
  fishingSkill: () => number;
  lessonCount: () => number;   // lessons taken from Nerys (slice 3; 0 until then)
  toast: (s: string) => void;
  memory: (key: string, text: string) => void;
  logPurchase: (coins: number) => void;
}

let win: WindowHandle;
let panel: HTMLElement;
let coinsEl: HTMLElement;
let listEl: HTMLElement;
let h: FisherHooks;

/** Whether Nerys trusts you with the Master Rod: enough lessons OR proven skill. */
function trusted(): boolean {
  return h.lessonCount() >= MASTER_ROD_LESSONS || h.fishingSkill() >= MASTER_ROD_SKILL;
}

export function initFisherWindow(hooks: FisherHooks) {
  h = hooks;
  panel = document.createElement("div");
  panel.id = "fisherWindow";
  const head = document.createElement("div");
  head.className = "shop-head";
  head.innerHTML = `🪙 <span id="fisherCoins">0</span>`;
  const section = document.createElement("div");
  section.className = "shop-section";
  section.textContent = "Nerys' gear — rods & bait";
  listEl = document.createElement("div");
  listEl.id = "fisherList";
  panel.append(head, section, listEl);
  document.body.appendChild(panel);
  coinsEl = head.querySelector("#fisherCoins")!;

  render();

  win = createScaleWindow({
    id: "fisher", title: "Nerys' Gear", icon: "🎣",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: Math.round(d.w * 0.5 - 200), y: Math.round(d.h * 0.5 - 180) }),
  });
  win.close();
}

export function isFisherOpen(): boolean { return win.isOpen(); }
export function openFisherWindow() { render(); win.open(); fitHeight(); }
export function closeFisherWindow() { win.close(); }
export function updateFisherWindow() { if (win?.isOpen()) coinsEl.textContent = String(h.economy.coins); }

function fitHeight() {
  if (!win.isOpen()) return;
  const tb = win.el.querySelector<HTMLElement>(".wh-titlebar");
  const tbH = tb ? tb.offsetHeight : 30;
  win.setRect({ h: Math.round(tbH + panel.getBoundingClientRect().height + 2) });
}

function buy(id: string, name: string, price: number, unique: boolean, boughtLine: string, memKey?: string, memText?: string) {
  if (h.economy.coins < price) { h.toast(`Not enough coins — that costs ${price}.`); return; }
  if (unique && countItem(h.economy.inv, id) > 0) { render(); return; }
  if (!addItem(h.economy.inv, id, 1)) { h.toast("Backpack full — no room for that."); return; }
  h.economy.coins -= price;
  saveEconomy(h.economy);
  h.toast(boughtLine);
  if (memKey && memText) h.memory(memKey, memText);
  h.logPurchase(price);
  render();
}

function rodRow(rod: RodTier) {
  const owned = countItem(h.economy.inv, rod.id) > 0;
  const locked = rod.trustGated && !trusted() && !owned;
  const row = baseRow(rod.icon, rod.name, rod.blurb, owned ? "Owned" : String(rod.price));
  if (owned) return row;
  const btn = document.createElement("button");
  btn.className = "shop-btn";
  if (locked) {
    btn.textContent = "Locked";
    btn.disabled = true;
    btn.title = `Nerys must trust your technique first — take ${MASTER_ROD_LESSONS} lessons, or reach Fishing ${MASTER_ROD_SKILL}.`;
  } else {
    btn.textContent = "Buy";
    btn.addEventListener("click", () => buy(
      rod.id, rod.name, rod.price, true, rod.boughtLine,
      `bought_${rod.id}`, `You bought the ${rod.name} from Nerys, the riverside fisherwoman.`,
    ));
  }
  row.append(btn);
  return row;
}

function baitRow(bait: Bait) {
  const have = countItem(h.economy.inv, bait.id);
  const label = have > 0 ? `${bait.blurb} (you hold ${have})` : bait.blurb;
  const row = baseRow(bait.icon, bait.name, label, String(bait.price));
  const btn = document.createElement("button");
  btn.className = "shop-btn";
  btn.textContent = "Buy";
  btn.addEventListener("click", () => buy(bait.id, bait.name, bait.price, false, `You buy a measure of ${bait.name.toLowerCase()}.`));
  row.append(btn);
  return row;
}

function baseRow(icon: string, title: string, blurbText: string, totalText: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "shop-row";
  const emoji = document.createElement("span");
  emoji.className = "stable-emoji";
  emoji.textContent = icon;
  const name = document.createElement("span");
  name.className = "shop-name";
  const t = document.createElement("span");
  t.textContent = title;
  const blurb = document.createElement("span");
  blurb.className = "stable-blurb";
  blurb.textContent = ` ${blurbText}`;
  name.append(t, blurb);
  const total = document.createElement("span");
  total.className = "shop-total";
  total.textContent = totalText;
  row.append(emoji, name, total);
  return row;
}

function render() {
  coinsEl.textContent = String(h.economy.coins);
  listEl.replaceChildren();
  for (const rod of ROD_TIERS) if (rod.soldByNerys) listEl.append(rodRow(rod));
  for (const bait of BAITS) if (bait.soldByNerys) listEl.append(baitRow(bait));
}
