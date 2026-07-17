import { ALL_NEEDS, type NeedId } from "../systems/needs";

/**
 * The always-visible HUD needs CLUSTER (HUD-A1 "the tidied UO desk"): 7 code-
 * drawn cells at a ≥52px pitch, each = a scaled-up glyph + the need's NAME in
 * small text + a thick value-colored bar, so every need is identifiable and
 * readable at arm's length on a 1080p screen (retiring the old 216×40 "tiny
 * unreadable thing"). All art is code, per the project rule — one glyph painter
 * per need. A critical cell (< 25) keeps its pulsing red alert plate.
 */

const INK = "#efe7cf";        // glyph stroke/fill + label (warm bone, reads on wood)
const TRACK = "rgba(0,0,0,.42)";
const GOOD = "#7ec46a", MID = "#e8c34f", LOW = "#d9534f";

// Short, arm's-length-legible names under each glyph (the exact 0-100 value is
// still on hover — see hud.ts's per-cell title).
const NEED_SHORT: Record<NeedId, string> = {
  hunger: "Food", thirst: "Water", energy: "Energy", hygiene: "Hygiene",
  bathroom: "Toilet", social: "Social", mood: "Mood",
};

function barColor(v: number): string {
  return v >= 50 ? GOOD : v >= 25 ? MID : LOW;
}

/** Draws the whole cluster into a W x H canvas (transparent gaps; the anchored
 *  window's wood panel is the chrome behind it). `record` is the needs slice. */
export function drawNeedsStrip(
  g: CanvasRenderingContext2D, record: Record<string, number>, time: number, W: number, H: number,
) {
  const n = ALL_NEEDS.length;              // 7
  const cellW = W / n;
  for (let i = 0; i < n; i++) {
    const id = ALL_NEEDS[i]!;
    const v = Math.max(0, Math.min(100, record[id] ?? 0));
    const cx = i * cellW + cellW / 2;
    drawCell(g, id, v, cx, H, cellW, time);
  }
}

function drawCell(
  g: CanvasRenderingContext2D, id: NeedId, v: number, cx: number, H: number, cellW: number, time: number,
) {
  const low = v < 25;
  // pulsing alert plate behind a critical cell
  if (low) {
    const pulse = 0.28 + 0.22 * (0.5 + 0.5 * Math.sin(time * 4));
    g.fillStyle = `rgba(217,83,79,${pulse})`;
    roundRect(g, cx - cellW / 2 + 2, 2, cellW - 4, H - 4, 8);
    g.fill();
  }

  // glyph — scaled up ~1.35× from the native ~16px painter box
  g.save();
  g.strokeStyle = INK; g.fillStyle = INK;
  g.lineWidth = 1.5; g.lineJoin = "round"; g.lineCap = "round";
  g.translate(cx, 15);
  g.scale(1.35, 1.35);
  glyph(g, id, 0, 0, v);
  g.restore();

  // name label
  g.fillStyle = INK;
  g.font = "700 11px system-ui, sans-serif";
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillText(NEED_SHORT[id], cx, 38);
  g.textAlign = "start"; g.textBaseline = "alphabetic";

  // thick status bar
  const bw = cellW - 16, bx = cx - bw / 2, by = 45, bh = 10;
  g.fillStyle = TRACK; roundRect(g, bx, by, bw, bh, 3.5); g.fill();
  const fw = Math.max(0, Math.min(1, v / 100)) * (bw - 2);
  g.fillStyle = barColor(v);
  roundRect(g, bx + 1, by + 1, Math.max(2, fw), bh - 2, 2.5); g.fill();
}

/** Dispatch to the per-need glyph, centred at (cx, cy) in a ~16px box. */
function glyph(g: CanvasRenderingContext2D, id: NeedId, cx: number, cy: number, v: number) {
  switch (id) {
    case "hunger":   return apple(g, cx, cy);
    case "thirst":   return droplet(g, cx, cy);
    case "energy":   return bolt(g, cx, cy);
    case "hygiene":  return bubbles(g, cx, cy);
    case "bathroom": return roll(g, cx, cy);
    case "social":   return speech(g, cx, cy);
    case "mood":     return smiley(g, cx, cy, v);
  }
}

function apple(g: CanvasRenderingContext2D, cx: number, cy: number) {
  g.beginPath(); g.ellipse(cx, cy + 1, 5, 5.5, 0, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - 4); g.lineTo(cx + 0.5, cy - 7); g.stroke();  // stem
  g.beginPath(); g.ellipse(cx + 3, cy - 6, 2.4, 1.3, -0.5, 0, 7); g.stroke();   // leaf
}

function droplet(g: CanvasRenderingContext2D, cx: number, cy: number) {
  g.beginPath();
  g.moveTo(cx, cy - 6);
  g.bezierCurveTo(cx + 5, cy - 1, cx + 4.5, cy + 6, cx, cy + 6);
  g.bezierCurveTo(cx - 4.5, cy + 6, cx - 5, cy - 1, cx, cy - 6);
  g.closePath(); g.stroke();
}

function bolt(g: CanvasRenderingContext2D, cx: number, cy: number) {
  g.beginPath();
  g.moveTo(cx + 1.5, cy - 7);
  g.lineTo(cx - 3.5, cy + 1);
  g.lineTo(cx, cy + 1);
  g.lineTo(cx - 1.5, cy + 7);
  g.lineTo(cx + 4, cy - 1);
  g.lineTo(cx + 0.5, cy - 1);
  g.closePath(); g.stroke();
}

function bubbles(g: CanvasRenderingContext2D, cx: number, cy: number) {
  g.beginPath(); g.arc(cx - 2, cy + 1, 3.4, 0, 7); g.stroke();
  g.beginPath(); g.arc(cx + 3, cy - 2, 2.4, 0, 7); g.stroke();
  g.beginPath(); g.arc(cx + 3.5, cy + 3, 1.6, 0, 7); g.stroke();
}

/** A toilet-paper roll — reads as "bathroom" at tiny size. */
function roll(g: CanvasRenderingContext2D, cx: number, cy: number) {
  roundRect(g, cx - 4.5, cy - 5, 9, 10, 2.5); g.stroke();
  g.beginPath(); g.ellipse(cx, cy - 5, 4.5, 1.8, 0, 0, 7); g.stroke();  // top rim
  g.beginPath(); g.ellipse(cx, cy - 5, 1.6, 0.7, 0, 0, 7); g.stroke();  // core hole
  g.beginPath(); g.moveTo(cx + 4.5, cy - 1); g.lineTo(cx + 4.5, cy + 6); g.stroke(); // hanging sheet
}

function speech(g: CanvasRenderingContext2D, cx: number, cy: number) {
  roundRect(g, cx - 5.5, cy - 5, 11, 8, 3); g.stroke();
  g.beginPath(); g.moveTo(cx - 2, cy + 3); g.lineTo(cx - 3.5, cy + 6); g.lineTo(cx, cy + 3); g.stroke(); // tail
  for (const dx of [-2.5, 0, 2.5]) { g.beginPath(); g.arc(cx + dx, cy - 1, 0.8, 0, 7); g.fill(); }
}

/** Mood: a smiley whose mouth curves with the value (extra readback). */
function smiley(g: CanvasRenderingContext2D, cx: number, cy: number, v: number) {
  g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.stroke();
  g.beginPath(); g.arc(cx - 2.2, cy - 1.5, 0.9, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + 2.2, cy - 1.5, 0.9, 0, 7); g.fill();
  const curve = (v / 100 - 0.5) * 5;   // +up (happy) .. -down (sad)
  g.beginPath();
  g.moveTo(cx - 2.8, cy + 2.4);
  g.quadraticCurveTo(cx, cy + 2.4 + curve, cx + 2.8, cy + 2.4);
  g.stroke();
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
