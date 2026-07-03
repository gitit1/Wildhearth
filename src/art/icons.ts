/** Code-painted item icons for the backpack grid. One painter per item type. */

type IconPainter = (g: CanvasRenderingContext2D, s: number) => void;

function paintFish(g: CanvasRenderingContext2D, s: number) {
  const cx = s * 0.46, cy = s * 0.5;
  // body
  g.fillStyle = "#6fa8c9";
  g.beginPath(); g.ellipse(cx, cy, s * 0.3, s * 0.17, 0, 0, 7); g.fill();
  // belly highlight
  g.fillStyle = "#a8cde3";
  g.beginPath(); g.ellipse(cx, cy + s * 0.06, s * 0.24, s * 0.09, 0, 0, 7); g.fill();
  // tail
  g.fillStyle = "#5b90ad";
  g.beginPath();
  g.moveTo(cx + s * 0.26, cy);
  g.lineTo(cx + s * 0.44, cy - s * 0.14);
  g.lineTo(cx + s * 0.44, cy + s * 0.14);
  g.closePath(); g.fill();
  // eye
  g.fillStyle = "#22303a";
  g.beginPath(); g.arc(cx - s * 0.16, cy - s * 0.04, s * 0.035, 0, 7); g.fill();
}

function paintCoinPouch(g: CanvasRenderingContext2D, s: number) {
  const cx = s * 0.5;
  // sack
  g.fillStyle = "#a9784a";
  g.beginPath(); g.ellipse(cx, s * 0.6, s * 0.28, s * 0.26, 0, 0, 7); g.fill();
  // neck + tie
  g.fillStyle = "#8a5f38";
  g.fillRect(cx - s * 0.09, s * 0.26, s * 0.18, s * 0.14);
  g.fillStyle = "#5e4025";
  g.fillRect(cx - s * 0.11, s * 0.34, s * 0.22, s * 0.05);
  // coin peeking out
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(cx, s * 0.24, s * 0.09, 0, 7); g.fill();
  g.strokeStyle = "#b8912f"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.arc(cx, s * 0.24, s * 0.06, 0, 7); g.stroke();
}

const PAINTERS: Record<string, IconPainter> = {
  fish: paintFish,
  coins: paintCoinPouch,
};

/** Draws the icon for an item id into a square of side `size` at the ctx origin. */
export function drawItemIcon(g: CanvasRenderingContext2D, id: string, size: number) {
  const paint = PAINTERS[id];
  if (paint) { paint(g, size); return; }
  // unknown item: neutral placeholder crate so new items never render blank
  g.fillStyle = "#8a6f4d";
  g.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
  g.strokeStyle = "#5e4a30"; g.lineWidth = Math.max(1, size * 0.03);
  g.strokeRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
}
