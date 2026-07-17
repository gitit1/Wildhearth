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

// the always-visible needs CLUSTER (HUD-A1): 7 labelled code-drawn cells at a
// ≥52px pitch, each = glyph + a thick value-colored bar + the need's name, so
// every need reads at arm's length on a 1080p screen (the owner's "tiny
// unreadable thing" is retired). Its own crisp canvas, dpr-scaled once, redrawn
// each frame; the CSS lets the wide native canvas scale DOWN to fit a phone.
const NS_W = 420, NS_H = 62;
const needsCv = document.getElementById("needsStrip") as HTMLCanvasElement;
needsCv.width = NS_W * devicePixelRatio;
needsCv.height = NS_H * devicePixelRatio;
needsCv.style.width = `${NS_W}px`;
// height is left to CSS (#needsStrip: height:auto + max-width:100%) so the
// cluster scales proportionally instead of clipping on a narrow screen.
const needsG = needsCv.getContext("2d")!;

export function updateNeedsStrip(record: Record<string, number> | undefined, time: number) {
  if (!record) return;
  needsG.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  needsG.clearRect(0, 0, NS_W, NS_H);
  drawNeedsStrip(needsG, record, time, NS_W, NS_H);
  // accessible readback: exact values on hover (canvas can't tooltip per-cell)
  needsCv.title = ALL_NEEDS.map((id) => `${NEED_LABELS[id]} ${record[id] ?? 0}`).join(" · ");
}

// The anchored needs plate (a desktop window) floats OVER the viewport's lower
// band, and its W-UI iron chrome made it taller than the prompt's old fixed
// bottom:86px — the pill's text got swallowed behind the plate, leaving a blank
// parchment sliver on screen. The clearance depends on layout/screen size, so
// compute it from the live needs-window rect whenever the prompt (re)appears:
// enough bottom offset to sit 10px above the plate, never less than the base 86.
const PROMPT_BASE_BOTTOM = 86;
function promptClearance(): number {
  const area = document.getElementById("gameArea");
  const needs = document.querySelector<HTMLElement>('[data-win="needs"]');
  if (!area || !needs) return PROMPT_BASE_BOTTOM;
  const ar = area.getBoundingClientRect();
  const nr = needs.getBoundingClientRect();
  // only matters when the plate actually overlaps the viewport's bottom band
  if (nr.height === 0 || nr.top >= ar.bottom || nr.bottom <= ar.top) return PROMPT_BASE_BOTTOM;
  return Math.max(PROMPT_BASE_BOTTOM, Math.round(ar.bottom - nr.top + 10));
}

let promptText: string | null = null;
export function setPrompt(text: string | null) {
  if (text === promptText) return;   // called per-frame — only act on change
  promptText = text;
  if (text) {
    promptEl.textContent = text;
    promptEl.style.bottom = `${promptClearance()}px`;
    promptEl.style.display = "block";
  } else {
    promptEl.textContent = "";
    promptEl.style.display = "none";
  }
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
