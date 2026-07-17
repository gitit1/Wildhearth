import type { Character } from "../systems/meta";
import type { Economy } from "../systems/economy";
import type { NeedsState } from "../systems/needs";
import type { FarmState } from "../systems/renovation";
import type { Transport } from "../systems/transport";
import type { Reputation } from "../systems/reputation";
import { needsRecord } from "../systems/needs";
import { countItem, ITEM_NAMES } from "../systems/inventory";
import { reputationTier } from "../systems/reputation";
import { repairsLeft } from "../systems/renovation";
import { TRANSPORT_ITEMS, ownsTransport } from "../systems/transport";
import { playerBustSource } from "../art/spriteChar";
import { drawBust, drawInitialsMedallion, sizeCanvas } from "../art/bust";
import { drawNeedsStrip } from "../art/needsicons";
import { drawItemIcon } from "../art/icons";
import { ICONS } from "./icons";
import { toggleRelationships } from "./relationships";
import { wm, toggleWindow } from "./windows/manager";
import { leftPanelAnchor } from "./windows/setup";
import type { WindowHandle } from "./windows/window";

/**
 * The Paperdoll — the UO-style character hub (HUD-A3). One window everything
 * about the player hangs off: her portrait bust (the matrix sprite's south
 * frame, recoloured; a code-drawn initials medallion is the zero-PNG fallback),
 * her name + Town Fame (reputation's visible home), a compact 7-need summary
 * strip, the buttons that toggle her other windows (Skills / Quests / Memory
 * Book / Relationships / Settings — reusing the taskbar's own toggle wiring),
 * and "What I own" — a data-driven ownership surface (home + renovation, tools,
 * transport) built from a small provider registry so future ownable kinds list
 * themselves without rework.
 *
 * Opened via a taskbar button (P key + double-clicking the player in the world
 * are wired in main.ts). Gump-skinned, fixed left-zone home, right-click / Esc
 * closable, live-updating while open.
 */

const GAP = 12;
const PORTRAIT_W = 92, PORTRAIT_H = 104;
const NEEDS_W = 296, NEEDS_H = 60;

export interface PaperdollDeps {
  getCharacter: () => Character | null;
  economy: Economy;
  needs: NeedsState;
  farm: FarmState;
  transport: Transport;
  reputation: Reputation;
}

let win: WindowHandle;
let deps: PaperdollDeps;
let btn: HTMLElement | null;
let portraitCtx: CanvasRenderingContext2D;
let needsCtx: CanvasRenderingContext2D;
let portraitDrawn = false;
let nameEl: HTMLElement, nickEl: HTMLElement, fameEl: HTMLElement, assetsEl: HTMLElement;

// ---- "What I own": a small provider registry so new ownable kinds self-list --
interface AssetRow { icon?: string; emoji?: string; name: string; note?: string; none?: boolean }
interface AssetGroup { head: string; rows: AssetRow[] }
type AssetProvider = (d: PaperdollDeps) => AssetGroup;

/** The tools the game can actually put in the bag (starter kit + buyable +
 *  forward-content), checked against inventory. Data-driven: a new tool item id
 *  added here (or already in ITEM_NAMES) lists itself the moment it's owned. */
const TOOL_IDS = [
  "rod", "hoe", "lute", "pot", "pail", "axe", "watering-can",
  "sickle", "pickaxe", "basket", "fishing-net", "bucket", "lantern",
];

const houseProvider: AssetProvider = (d) => {
  const repaired = 3 - repairsLeft(d.farm);
  let note = `Renovation ${repaired}/3 repaired`;
  if (d.farm.plotTiers > 0) note += ` · field ×${d.farm.plotTiers + 1}`;
  const rows: AssetRow[] = [{ emoji: "🏠", name: "The farmhouse", note }];
  if (d.farm.barn) rows.push({ emoji: "🏚️", name: "The barn", note: "Repaired" });
  return { head: "Home", rows };
};

const toolsProvider: AssetProvider = (d) => {
  const rows: AssetRow[] = [];
  for (const id of TOOL_IDS)
    if (countItem(d.economy.inv, id) > 0) rows.push({ icon: id, name: ITEM_NAMES[id] ?? id });
  if (rows.length === 0) rows.push({ none: true, name: "No tools yet — buy your first at a stall" });
  return { head: "Tools", rows };
};

const transportProvider: AssetProvider = (d) => {
  const rows: AssetRow[] = TRANSPORT_ITEMS
    .filter((t) => ownsTransport(d.transport, t.id))
    .map((t) => ({ emoji: t.icon, name: t.name }));
  if (rows.length === 0) rows.push({ none: true, name: "None yet — visit the stable or the dock" });
  return { head: "Transport", rows };
};

const PROVIDERS: AssetProvider[] = [houseProvider, toolsProvider, transportProvider];

export function initPaperdoll(d: PaperdollDeps) {
  deps = d;
  const panel = document.getElementById("paperdollPanel")!;
  btn = document.getElementById("paperdollBtn");
  nameEl = document.getElementById("pdName")!;
  nickEl = document.getElementById("pdNick")!;
  fameEl = document.getElementById("pdFame")!;
  assetsEl = document.getElementById("pdAssets")!;
  portraitCtx = sizeCanvas(document.getElementById("pdPortrait") as HTMLCanvasElement, PORTRAIT_W, PORTRAIT_H);
  needsCtx = sizeCanvas(document.getElementById("pdNeeds") as HTMLCanvasElement, NEEDS_W, NEEDS_H);

  buildButtons();
  refresh();

  win = wm.createWindow({
    id: "paperdoll", title: "Character", icon: "🧍",
    content: panel,
    resizable: false,
    defaultRect: (dd) => ({ x: GAP, y: dd.h * 0.16, w: 0, h: 0 }),
    openAt: (dd, s) => leftPanelAnchor("paperdoll", dd, s),   // fixed left-edge home, cascaded (HUD-A2)
    onOpen: () => { portraitDrawn = false; refresh(); },
    onMinimize: (hidden) => { btn?.classList.toggle("active", !hidden); if (!hidden) refresh(); },
  });
  win.close();   // default: hidden

  btn?.addEventListener("click", () => toggleWindow(win));
  addEventListener("keydown", (e) => {
    if (e.code !== "KeyP" || isTyping(e)) return;
    toggleWindow(win);
  });
}

/** Opened by the double-click-self gesture (wired in main.ts). */
export function openPaperdoll() { if (win && !win.isOpen()) win.open(); else win?.focus(); }

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

// ---- the UO paperdoll pattern: buttons everything hangs off ------------------
function buildButtons() {
  const host = document.getElementById("pdButtons")!;
  host.replaceChildren();
  // Reuse the taskbar's own toggle wiring by proxying to its buttons; the
  // Relationships hub has no taskbar button (it hangs off the character).
  const clickTaskbar = (id: string) => () => document.getElementById(id)?.click();
  const defs: Array<{ label: string; icon: string; on: () => void; wide?: boolean }> = [
    { label: "Skills", icon: "skills", on: clickTaskbar("skillsBtn") },
    { label: "Quests", icon: "quests", on: clickTaskbar("questBtn") },
    { label: "Memory Book", icon: "book", on: clickTaskbar("bookBtn") },
    { label: "Relationships", icon: "heart", on: () => toggleRelationships() },
    { label: "Settings", icon: "settings", on: clickTaskbar("settingsBtn"), wide: true },
  ];
  for (const b of defs) {
    const el = document.createElement("button");
    el.className = "pd-btn" + (b.wide ? " pd-btn-wide" : "");
    const ic = document.createElement("span");
    ic.className = "wh-ic";
    ic.innerHTML = ICONS[b.icon] ?? "";
    const label = document.createElement("span");
    label.textContent = b.label;
    el.append(ic, label);
    el.addEventListener("click", b.on);
    host.appendChild(el);
  }
}

function drawPortrait() {
  portraitCtx.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
  const src = playerBustSource();
  if (src) {
    drawBust(portraitCtx, src, PORTRAIT_W, PORTRAIT_H, { bustFraction: 0.66, topFrac: 0.02 });
    portraitDrawn = true;
  } else {
    const c = deps.getCharacter();
    const initials = c ? `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}` : "?";
    drawInitialsMedallion(portraitCtx, initials, PORTRAIT_W, PORTRAIT_H, c ? c.firstName + c.lastName : "player");
  }
}

function iconCanvas(id: string, px = 24): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const g = sizeCanvas(c, px, px);
  drawItemIcon(g, id, px);
  return c;
}

function renderAssets() {
  assetsEl.replaceChildren();
  for (const provider of PROVIDERS) {
    const group = provider(deps);
    const g = document.createElement("div");
    g.className = "pd-asset-group";
    const head = document.createElement("div");
    head.className = "pd-asset-head";
    head.textContent = group.head;
    g.appendChild(head);
    for (const row of group.rows) {
      const r = document.createElement("div");
      r.className = "pd-asset-row" + (row.none ? " pd-none" : "");
      if (!row.none) {
        if (row.icon) { const ic = iconCanvas(row.icon); ic.className = "pd-asset-ic"; r.appendChild(ic); }
        else if (row.emoji) { const e = document.createElement("span"); e.className = "pd-asset-emoji"; e.textContent = row.emoji; r.appendChild(e); }
      }
      const body = document.createElement("div");
      body.className = "pd-asset-body";
      const nm = document.createElement("span");
      nm.className = "pd-asset-name";
      nm.textContent = row.name;
      body.appendChild(nm);
      if (row.note) { const nt = document.createElement("span"); nt.className = "pd-asset-note"; nt.textContent = row.note; body.appendChild(nt); }
      r.appendChild(body);
      g.appendChild(r);
    }
    assetsEl.appendChild(g);
  }
}

function refresh() {
  const c = deps.getCharacter();
  const full = c ? `${c.firstName} ${c.lastName}`.trim() : "Wanderer";
  nameEl.textContent = full || "Wanderer";
  nickEl.textContent = c?.nickname ? `"${c.nickname}"` : "";

  const fame = Math.round(deps.reputation.fame);
  const tier = reputationTier(deps.reputation.fame).name;
  fameEl.innerHTML =
    `🏛️ <span class="pd-fame-tier">${tier}</span> · <span class="pd-fame-val">${fame}/100</span>`;

  if (!portraitDrawn) drawPortrait();

  needsCtx.clearRect(0, 0, NEEDS_W, NEEDS_H);
  drawNeedsStrip(needsCtx, needsRecord(deps.needs), performance.now() / 1000, NEEDS_W, NEEDS_H);

  renderAssets();
}

/** Called every frame while open — the needs summary breathes, fame + assets
 *  stay current (a bought axe appears; a repaired roof updates). */
export function updatePaperdoll() {
  if (win && win.isOpen()) refresh();
}
