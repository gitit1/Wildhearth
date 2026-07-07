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

function row(text: string, cls = "eod-row"): HTMLElement {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  return div;
}

export function showFullSummary(snap: DayEndSnapshot, onClose: () => void): void {
  onCloseCb = onClose;
  const { log } = snap;
  win.setTitle(`${cap(snap.season)}, Day ${snap.day} — day complete`);
  bodyEl.replaceChildren();

  const rows: string[] = [];
  const net = log.coinsEarned - log.coinsSpent;
  if (log.coinsEarned || log.coinsSpent)
    rows.push(`🪙 Coins: ${net >= 0 ? "+" : ""}${net} (earned ${log.coinsEarned}, spent ${log.coinsSpent})`);
  if (log.itemsSold) rows.push(`Items sold: ${log.itemsSold}`);
  if (log.catches) rows.push(`🐟 Fish caught: ${log.catches}`);
  if (log.harvests) rows.push(`🌽 Crops harvested: ${log.harvests}`);
  if (log.forages) rows.push(`Wild finds: ${log.forages}`);
  if (log.dishesCooked) rows.push(`🍲 Dishes cooked: ${log.dishesCooked}`);
  for (const [id, amt] of Object.entries(log.skillGains))
    rows.push(`📜 ${SKILL_NAMES[id] ?? id}: +${amt}`);
  for (const [npcId, d] of Object.entries(log.relationshipChanges)) {
    const parts: string[] = [];
    if (d.friendship) parts.push(`Friendship ${d.friendship > 0 ? "+" : ""}${d.friendship}`);
    if (d.romance) parts.push(`Romance ${d.romance > 0 ? "+" : ""}${d.romance}`);
    if (parts.length) rows.push(`${cap(npcId)}: ${parts.join(", ")}`);
  }
  if (rows.length === 0) rows.push("A quiet day.");
  for (const r of rows) bodyEl.append(row(r));

  if (log.newDiscoveries.length || log.newMemories.length) {
    bodyEl.append(row("Achievements today", "eod-achieve-head"));
    for (const d of log.newDiscoveries) bodyEl.append(row(`📖 New find: ${d}`));
    for (const m of log.newMemories) bodyEl.append(row(`✒ ${m}`));
  }

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
