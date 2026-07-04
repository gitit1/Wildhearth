import type { CalendarSlice, WeatherSlice } from "../systems/worldContext";

// Clock dial — a compact circular day/night dial for the HUD, replacing the
// flat text time pill. The face is a sky that blends with the hour; a sun
// (6:00-19:00) or moon (19:00-6:00) rides a semicircular arc over a horizon
// line, HH:MM sits below it, and a small mark flags non-clear weather. The
// caller owns the canvas, DPR scaling and clearing; we just paint a size×size
// box at the origin.

type RGB = [number, number, number];

const hex = (s: string): RGB =>
  [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const NIGHT = hex("#1d2440"), DAWN = hex("#e8a86a"), DAY = hex("#7fb2d8"), DUSK = hex("#c96f5a");
// Sky keyframes: [hour, color]; blended linearly for a smooth day cycle.
const SKY: [number, RGB][] = [
  [0, NIGHT], [5, NIGHT], [6.5, DAWN], [8.5, DAY],
  [17, DAY], [18.5, DUSK], [20.5, NIGHT], [24, NIGHT],
];

const SEASON_TINT: Record<CalendarSlice["season"], string> = {
  spring: "#6fae3e", summer: "#e0be5c", autumn: "#d17f3f", winter: "#9ab2dd",
};

function skyAt(h: number): RGB {
  for (let i = 1; i < SKY.length; i++) {
    if (h <= SKY[i][0]) {
      const [h0, a] = SKY[i - 1], [h1, b] = SKY[i];
      const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
  }
  return NIGHT;
}

const css = (c: RGB, mul = 1) =>
  `rgb(${Math.round(c[0] * mul)},${Math.round(c[1] * mul)},${Math.round(c[2] * mul)})`;

export function drawClockDial(
  g: CanvasRenderingContext2D,
  size: number,
  cal: CalendarSlice,
  wx?: WeatherSlice,
): void {
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  const h = cal.hour + cal.minute / 60;
  const sky = skyAt(h);

  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();

  // Sky face: hour-blended color on top fading to a darker lower half.
  const grad = g.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, css(sky));
  grad.addColorStop(0.5, css(sky, 0.85));
  grad.addColorStop(1, css(sky, 0.45));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);

  // Sun or moon on a semicircular arc across the upper half.
  const arcR = r * 0.64;
  const pos = (t: number) => ({ x: cx - Math.cos(t * Math.PI) * arcR, y: cy - Math.sin(t * Math.PI) * arcR });
  if (h >= 6 && h < 19) {
    const { x, y } = pos((h - 6) / 13);
    const glow = g.createRadialGradient(x, y, 1, x, y, r * 0.3);
    glow.addColorStop(0, "rgba(255,213,79,.85)");
    glow.addColorStop(1, "rgba(255,213,79,0)");
    g.fillStyle = glow;
    g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffd54f";
    g.beginPath(); g.arc(x, y, size * 0.075, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e8c34f";
    g.beginPath(); g.arc(x, y, size * 0.05, 0, Math.PI * 2); g.fill();
  } else {
    const { x, y } = pos(((h + 24 - 19) % 24) / 11);
    const mr = size * 0.07;
    g.fillStyle = "#d8dce8";
    g.beginPath(); g.arc(x, y, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = css(sky, 0.95); // punch a sky-colored disc out for a crescent
    g.beginPath(); g.arc(x + mr * 0.55, y - mr * 0.35, mr * 0.85, 0, Math.PI * 2); g.fill();
  }

  // Horizon line grounding the arc.
  g.strokeStyle = "rgba(240,234,214,.28)";
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.stroke();

  // Weather mark, lower-left of the face (nothing for clear skies).
  if (wx && wx.state !== "clear") {
    const mx = cx - r * 0.5, my = cy + r * 0.38;
    g.lineWidth = 1.4;
    g.lineCap = "round";
    if (wx.state === "rain") {
      g.strokeStyle = "rgba(160,200,235,.9)";
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(mx + i * 4, my - 2 + (i % 2) * 2);
        g.lineTo(mx + i * 4 - 2.5, my + 3 + (i % 2) * 2);
        g.stroke();
      }
    } else if (wx.state === "storm") {
      g.fillStyle = "#ffd54f";
      g.beginPath();
      g.moveTo(mx + 3, my - 5); g.lineTo(mx - 1, my + 1); g.lineTo(mx + 2, my + 1);
      g.lineTo(mx, my + 6); g.lineTo(mx + 5, my - 1); g.lineTo(mx + 2, my - 1);
      g.closePath(); g.fill();
    } else { // fog
      g.strokeStyle = "rgba(220,222,218,.75)";
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(mx - 3 + i, my - 3 + i * 3.5);
        g.lineTo(mx + 6 - i, my - 3 + i * 3.5);
        g.stroke();
      }
    }
  }

  // HH:MM in the lower half, parchment over a soft dark shadow.
  const pad = (n: number) => String(n).padStart(2, "0");
  g.font = `bold ${Math.max(9, Math.round(size * 0.18))}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "rgba(25,32,18,.9)";
  g.shadowBlur = 3;
  g.fillStyle = "#f0ead6";
  g.fillText(`${pad(cal.hour)}:${pad(cal.minute)}`, cx, cy + r * 0.48);
  g.restore();

  // Wood ring with a subtle inner gold accent.
  g.strokeStyle = "#5d4630";
  g.lineWidth = 2.5;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "rgba(232,195,79,.4)";
  g.lineWidth = 1;
  g.beginPath(); g.arc(cx, cy, r - 1.8, 0, Math.PI * 2); g.stroke();

  // Season tick: a short tinted arc (~60°) at the top of the ring.
  g.strokeStyle = SEASON_TINT[cal.season];
  g.lineWidth = 2.5;
  g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2 - Math.PI / 6, -Math.PI / 2 + Math.PI / 6); g.stroke();
}
