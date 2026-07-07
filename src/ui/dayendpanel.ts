import type { DayLog } from "../systems/daylog";
import { topActivityLine } from "../systems/daylog";
import { SKILL_NAMES } from "../systems/skills";
import type { Season } from "../systems/calendar";
import { EOD_QUICK_SHOW_SECONDS } from "../config";

/**
 * End-of-day summary UI (Part A #7) — two presentations driven by the
 * player's `endOfDaySummary` setting:
 *  - "quick": a small toast-style pill, 3 lines, auto-fades. Non-blocking —
 *    game-time is NOT paused.
 *  - "full": a proper wood/gold modal listing every non-zero ledger line +
 *    today's achievements (new discoveries/memories). Dismiss by click, Enter,
 *    or Esc; `isDayEndOpen()` lets main.ts gate game-time exactly like the
 *    dialogue box does.
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
let scrim: HTMLElement;
let panel: HTMLElement;
let titleEl: HTMLElement;
let bodyEl: HTMLElement;
let fullOpen = false;
let onCloseCb: (() => void) | null = null;

export function isDayEndOpen(): boolean { return fullOpen; }

function row(text: string, cls = "eod-row"): HTMLElement {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  return div;
}

export function showFullSummary(snap: DayEndSnapshot, onClose: () => void): void {
  onCloseCb = onClose;
  fullOpen = true;
  const { log } = snap;
  titleEl.textContent = `${cap(snap.season)}, Day ${snap.day} — day complete`;
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

  scrim.style.display = "block";
  panel.style.display = "block";
}

function closeFullSummary() {
  if (!fullOpen) return;
  fullOpen = false;
  scrim.style.display = "none";
  panel.style.display = "none";
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
}

export function initDayEndPanel(): void {
  quickEl = document.getElementById("eodQuick")!;
  scrim = document.getElementById("eodScrim")!;
  panel = document.getElementById("eodPanel")!;
  titleEl = document.getElementById("eodTitle")!;
  bodyEl = document.getElementById("eodBody")!;

  scrim.addEventListener("click", closeFullSummary);
  panel.addEventListener("click", closeFullSummary);
  // capture-phase so Esc/Enter beat any other panel's handler while open
  addEventListener("keydown", (e) => {
    if (!fullOpen) return;
    if (e.code === "Escape" || e.code === "Enter" || e.code === "NumpadEnter") {
      e.stopImmediatePropagation();
      closeFullSummary();
    }
  }, true);
}
