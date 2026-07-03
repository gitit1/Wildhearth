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

function paintBerries(g: CanvasRenderingContext2D, s: number) {
  // small leaf behind the cluster
  g.fillStyle = "#528034";
  g.beginPath(); g.ellipse(s * 0.62, s * 0.32, s * 0.16, s * 0.08, -0.6, 0, 7); g.fill();
  // berry cluster
  g.fillStyle = "#c2385a";
  const dots: Array<[number, number]> = [[0.38, 0.5], [0.56, 0.44], [0.5, 0.62], [0.66, 0.58]];
  for (const [ox, oy] of dots) {
    g.beginPath(); g.arc(s * ox, s * oy, s * 0.11, 0, 7); g.fill();
  }
  g.fillStyle = "rgba(255,255,255,.55)";
  for (const [ox, oy] of dots) {
    g.beginPath(); g.arc(s * (ox - 0.03), s * (oy - 0.03), s * 0.032, 0, 7); g.fill();
  }
}

function paintHoe(g: CanvasRenderingContext2D, s: number) {
  // wooden handle, diagonal
  g.strokeStyle = "#8a6a42"; g.lineWidth = Math.max(2, s * 0.09); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.25, s * 0.78); g.lineTo(s * 0.68, s * 0.24); g.stroke();
  // metal blade
  g.fillStyle = "#9aa2ab";
  g.beginPath();
  g.moveTo(s * 0.62, s * 0.18);
  g.lineTo(s * 0.82, s * 0.34);
  g.lineTo(s * 0.72, s * 0.5);
  g.lineTo(s * 0.58, s * 0.32);
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.35)";
  g.beginPath(); g.moveTo(s * 0.64, s * 0.22); g.lineTo(s * 0.76, s * 0.32); g.lineTo(s * 0.7, s * 0.4); g.closePath(); g.fill();
}

function paintSeeds(g: CanvasRenderingContext2D, s: number) {
  // paper packet
  g.fillStyle = "#e0cfa0";
  g.fillRect(s * 0.3, s * 0.26, s * 0.4, s * 0.5);
  g.fillStyle = "#c9b585";
  g.beginPath(); g.moveTo(s * 0.3, s * 0.26); g.lineTo(s * 0.5, s * 0.36); g.lineTo(s * 0.7, s * 0.26); g.closePath(); g.fill();
  // seeds spilling
  g.fillStyle = "#7a5c2e";
  const dots: Array<[number, number]> = [[0.42, 0.55], [0.52, 0.62], [0.6, 0.52], [0.47, 0.7], [0.58, 0.72]];
  for (const [ox, oy] of dots) {
    g.beginPath(); g.ellipse(s * ox, s * oy, s * 0.045, s * 0.03, 0.6, 0, 7); g.fill();
  }
}

function paintCorn(g: CanvasRenderingContext2D, s: number) {
  // golden ear
  g.fillStyle = "#e8c85a";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.48, s * 0.16, s * 0.3, 0.15, 0, 7); g.fill();
  // kernel rows
  g.strokeStyle = "rgba(180,140,40,.6)"; g.lineWidth = Math.max(1, s * 0.02);
  for (const ox of [-0.06, 0, 0.06]) {
    g.beginPath(); g.moveTo(s * (0.5 + ox), s * 0.24); g.lineTo(s * (0.52 + ox), s * 0.72); g.stroke();
  }
  // husk leaves
  g.fillStyle = "#528a2c";
  g.beginPath(); g.ellipse(s * 0.36, s * 0.62, s * 0.07, s * 0.2, 0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.62, s * 0.66, s * 0.06, s * 0.18, -0.4, 0, 7); g.fill();
}

const PAINTERS: Record<string, IconPainter> = {
  fish: paintFish,
  coins: paintCoinPouch,
  berries: paintBerries,
  hoe: paintHoe,
  seeds: paintSeeds,
  corn: paintCorn,
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
