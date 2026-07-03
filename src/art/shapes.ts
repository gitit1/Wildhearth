/** Tiny shared drawing primitives. */
export function roundR(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function shadow(
  g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number
) {
  g.fillStyle = "rgba(20,30,12,.28)";
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
}
