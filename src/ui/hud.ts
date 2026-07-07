import type { Economy } from "../systems/economy";
import type { CalendarSlice, WeatherSlice } from "../systems/worldContext";
import { drawClockDial } from "./clockdial";
import { drawNeedsStrip } from "../art/needsicons";
import { ALL_NEEDS, NEED_LABELS } from "../systems/needs";

const coinsEl = document.getElementById("coins")!;
const calEl = document.getElementById("calendar")!;
const weatherEl = document.getElementById("weather")!;
const promptEl = document.getElementById("prompt")!;
const toastEl = document.getElementById("toast")!;
let toastT = 0;

// the HUD clock dial: a 64px canvas, dpr-crisp, redrawn each frame
const DIAL_PX = 64;
const dialCv = document.getElementById("clockDial") as HTMLCanvasElement;
dialCv.width = DIAL_PX * devicePixelRatio;
dialCv.height = DIAL_PX * devicePixelRatio;
const dialG = dialCv.getContext("2d")!;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// plain text labels for the first pass (visual weather is its own later block)
const WEATHER_GLYPH: Record<string, string> = { clear: "☀", rain: "🌧", storm: "⛈", fog: "🌫" };

export function updateHud(e: Economy, cal?: CalendarSlice, wx?: WeatherSlice, festivalName?: string | null) {
  coinsEl.textContent = String(e.coins);
  if (cal) {
    // the time lives on the dial; the calendar pill flags a festival day all day
    calEl.textContent = festivalName
      ? `${cap(cal.season)} · Day ${cal.day} · 🎉 ${festivalName}!`
      : `${cap(cal.season)} · Day ${cal.day}`;
    dialG.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    dialG.clearRect(0, 0, DIAL_PX, DIAL_PX);
    drawClockDial(dialG, DIAL_PX, cal, wx);
  }
  if (wx) weatherEl.textContent = `${WEATHER_GLYPH[wx.state] ?? ""} ${cap(wx.state)}`;
}

// the always-visible needs strip: 7 code-drawn icons + fill bars (DECISIONS:
// "small fixed items always visible — clock, coins, need icons"). Its own crisp
// canvas, dpr-scaled once, redrawn each frame from the World Context needs slice.
const NS_W = 216, NS_H = 40;
const needsCv = document.getElementById("needsStrip") as HTMLCanvasElement;
needsCv.width = NS_W * devicePixelRatio;
needsCv.height = NS_H * devicePixelRatio;
needsCv.style.width = `${NS_W}px`;
needsCv.style.height = `${NS_H}px`;
const needsG = needsCv.getContext("2d")!;

export function updateNeedsStrip(record: Record<string, number> | undefined, time: number) {
  if (!record) return;
  needsG.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  needsG.clearRect(0, 0, NS_W, NS_H);
  drawNeedsStrip(needsG, record, time, NS_W, NS_H);
  // accessible readback: exact values on hover (canvas can't tooltip per-cell)
  needsCv.title = ALL_NEEDS.map((id) => `${NEED_LABELS[id]} ${record[id] ?? 0}`).join(" · ");
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
