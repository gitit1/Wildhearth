import type { Economy } from "../systems/economy";
import type { CalendarSlice } from "../systems/worldContext";

const coinsEl = document.getElementById("coins")!;
const calEl = document.getElementById("calendar")!;
const promptEl = document.getElementById("prompt")!;
const toastEl = document.getElementById("toast")!;
let toastT = 0;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, "0");

export function updateHud(e: Economy, cal?: CalendarSlice) {
  coinsEl.textContent = String(e.coins);
  if (cal) calEl.textContent = `${cap(cal.season)} · Day ${cal.day} · ${pad(cal.hour)}:${pad(cal.minute)}`;
}

export function setPrompt(text: string | null) {
  if (text) { promptEl.textContent = text; promptEl.style.display = "block"; }
  else promptEl.style.display = "none";
}

// Toasts queue instead of clobbering each other: one shows at a time for
// TOAST_SHOW seconds, then a short gap, then the next in line. The queue is
// soft-capped so a burst of events can't leave minutes-stale toasts playing —
// the oldest waiting message drops first.
const TOAST_SHOW = 2.2;
const TOAST_GAP = 0.3;
const TOAST_MAX_QUEUED = 4;
const queue: string[] = [];
let gapT = 0;   // remaining pause between toasts

export function toast(text: string) {
  queue.push(text);
  while (queue.length > TOAST_MAX_QUEUED) queue.shift();
}

export function updateToast(dt: number) {
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) { toastEl.style.display = "none"; gapT = TOAST_GAP; }
    return;
  }
  if (gapT > 0) { gapT -= dt; return; }
  const next = queue.shift();
  if (next !== undefined) {
    toastEl.textContent = next;
    toastEl.style.display = "block";
    toastT = TOAST_SHOW;
  }
}
