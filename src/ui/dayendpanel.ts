import type { DayLog } from "../systems/daylog";
import { topActivityLine } from "../systems/daylog";
import { SKILL_NAMES } from "../systems/skills";
import type { Season } from "../systems/calendar";
import { EOD_QUICK_SHOW_SECONDS } from "../config";
import { wm } from "./windows/manager";
import type { WindowHandle } from "./windows/window";

/**
 * End-of-day summary UI — two presentations driven by the player's
 * `endOfDaySummary` setting:
 *  - "quick": a small toast-style pill, 3 lines, auto-fades. Non-blocking —
 *    game-time is NOT paused. Unchanged by Windows migration II (it was never
 *    a panel to begin with).
 *  - "full" (Windows migration II): a real wm window listing every non-zero
 *    ledger line + today's achievements (new discoveries/memories); title bar
 *    reads "<Season>, Day <N> — day complete" (set dynamically, like the shop
 *    window's). Dismiss via the window's ✕, the shared Esc cascade, or Enter
 *    (kept as its own dedicated shortcut — "acknowledge and continue" reads
 *    naturally on Enter, unlike the generic per-window Esc-closes rule).
 *    `isDayEndOpen()` lets main.ts gate game-time exactly like the dialogue
 *    box does.
 */

export interface DayEndSnapshot { season: Season; day: number; log: DayLog }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- quick --------------------------------------------------------------
let quickEl: HTMLElement;
let quickT = 0;
const QUICK_FADE = 0.6;   // seconds of the fade-out tail

export function showQuickSummary(snap: DayEndSnapshot): void {
  const net = snap.log.coinsEarned - snap.log.coinsSpent;
  quickEl.textContent = [
    `${cap(snap.season)}, Day ${snap.day} complete`,
    `Coins: ${net >= 0 ? "+" : ""}${net}`,
    topActivityLine(snap.log),
  ].join(" · ");
  quickEl.style.display = "block";
  quickEl.style.opacity = "1";
  quickT = EOD_QUICK_SHOW_SECONDS;
}

/** Call once a frame with real dt; fades and hides the quick pill on its own. */
export function updateQuickSummary(dt: number): void {
  if (quickT <= 0) return;
  quickT -= dt;
  if (quickT <= QUICK_FADE) quickEl.style.opacity = String(Math.max(0, quickT / QUICK_FADE));
  if (quickT <= 0) quickEl.style.display = "none";
}

// ---- full -----------------------------------------------------------------
let win: WindowHandle;
let bodyEl: HTMLElement;
let onCloseCb: (() => void) | null = null;

export function isDayEndOpen(): boolean { return win.isOpen(); }

function el(tag: string, cls: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** One "icon · label ……… value" line, the value right-aligned + tabular so a
 *  column of them reads like a tidy receipt. `tone` tints the value (gain/spend). */
function statRow(icon: string, label: string, value: string, tone = ""): HTMLElement {
  const row = el("div", "eod-stat");
  row.append(el("span", "eod-stat-ico", icon));
  row.append(el("span", "eod-stat-label", label));
  row.append(el("span", "eod-stat-val" + (tone ? " " + tone : ""), value));
  return row;
}

const sectionHead = (text: string) => el("div", "eod-section", text);

export function showFullSummary(snap: DayEndSnapshot, onClose: () => void): void {
  onCloseCb = onClose;
  const { log } = snap;
  win.setTitle(`${cap(snap.season)}, Day ${snap.day} — day complete`);
  bodyEl.replaceChildren();

  const net = log.coinsEarned - log.coinsSpent;
  let anything = false;

  // --- hero: the day's bottom line in coins ---
  const hero = el("div", "eod-hero " + (net >= 0 ? "pos" : "neg"));
  hero.append(el("span", "eod-hero-coin", "🪙"));
  hero.append(el("span", "eod-hero-num", `${net >= 0 ? "+" : "−"}${Math.abs(net)}`));
  hero.append(el("span", "eod-hero-lbl", "coins today"));
  bodyEl.append(hero);
  if (log.coinsEarned || log.coinsSpent) {
    bodyEl.append(el("div", "eod-hero-sub", `earned ${log.coinsEarned} · spent ${log.coinsSpent}`));
    anything = true;
  }

  // --- the day's tallies ---
  const tallies: Array<[string, string, number]> = [
    ["🏷️", "Items sold", log.itemsSold],
    ["🐟", "Fish caught", log.catches],
    ["🌽", "Crops harvested", log.harvests],
    ["🍃", "Wild finds", log.forages],
    ["🍲", "Dishes cooked", log.dishesCooked],
  ];
  const shownTallies = tallies.filter(([, , n]) => n > 0);
  if (shownTallies.length) {
    const grid = el("div", "eod-grid");
    for (const [ic, lbl, n] of shownTallies) grid.append(statRow(ic, lbl, String(n)));
    bodyEl.append(grid);
    anything = true;
  }

  // --- skills learned ---
  const skills = Object.entries(log.skillGains);
  if (skills.length) {
    bodyEl.append(sectionHead("Skills"));
    const grid = el("div", "eod-grid");
    for (const [id, amt] of skills) grid.append(statRow("📜", SKILL_NAMES[id] ?? id, `+${amt}`, "gain"));
    bodyEl.append(grid);
    anything = true;
  }

  // --- bonds moved ---
  const bonds: HTMLElement[] = [];
  for (const [npcId, d] of Object.entries(log.relationshipChanges)) {
    if (d.friendship) bonds.push(statRow("💛", `${cap(npcId)} · Friendship`, `${d.friendship > 0 ? "+" : "−"}${Math.abs(d.friendship)}`, d.friendship > 0 ? "gain" : "spend"));
    if (d.romance) bonds.push(statRow("💗", `${cap(npcId)} · Romance`, `${d.romance > 0 ? "+" : "−"}${Math.abs(d.romance)}`, d.romance > 0 ? "gain" : "spend"));
  }
  if (bonds.length) {
    bodyEl.append(sectionHead("Bonds"));
    const grid = el("div", "eod-grid");
    for (const b of bonds) grid.append(b);
    bodyEl.append(grid);
    anything = true;
  }

  // --- today's firsts (discoveries + memories) ---
  if (log.newDiscoveries.length || log.newMemories.length) {
    bodyEl.append(sectionHead("Today's firsts"));
    for (const d of log.newDiscoveries) bodyEl.append(el("div", "eod-first", `📖  New find — ${d}`));
    for (const m of log.newMemories) bodyEl.append(el("div", "eod-first", `✒  ${m}`));
    anything = true;
  }

  if (!anything) bodyEl.append(el("div", "eod-quiet", "A quiet day."));

  win.open();
}

function closeFullSummary() {
  win.close();
}

const EOD_W = 380;

export function initDayEndPanel(): void {
  quickEl = document.getElementById("eodQuick")!;
  const panel = document.getElementById("eodPanel")!;
  bodyEl = document.getElementById("eodBody")!;

  win = wm.createWindow({
    id: "dayend", title: "Day complete", icon: "📋",
    content: panel,
    defaultRect: (d) => ({ x: Math.round((d.w - EOD_W) / 2), y: Math.round((d.h - 320) / 2), w: 0, h: 0 }),
    onClose: () => {
      const cb = onCloseCb;
      onCloseCb = null;
      cb?.();
    },
  });
  win.close(); // default: hidden — auto-opens on day rollover

  // Enter/NumpadEnter is a dedicated "acknowledge and continue" shortcut
  // (capture-phase so it beats other handlers while open); Escape is no
  // longer special-cased here — it's just another closable window now, so
  // the shared Esc cascade (setup.ts's escCloseTopWindow) closes it like any
  // other topmost window.
  addEventListener("keydown", (e) => {
    if (!win.isOpen()) return;
    if (e.code === "Enter" || e.code === "NumpadEnter") {
      e.stopImmediatePropagation();
      closeFullSummary();
    }
  }, true);
}
