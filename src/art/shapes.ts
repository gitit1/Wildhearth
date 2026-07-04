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

/**
 * The game-wide outline stroke (visual pass, batch 3): every major drawn
 * shape gets the same soft dark contour, the single cheapest technique that
 * makes flat canvas art read like the reference look. One color, one width,
 * defined once — never per-object.
 */
export const OUTLINE = "rgba(43,32,19,.62)";
export const OUTLINE_W = 1.6;

/** Strokes the CURRENT path with the shared outline (call right after fill). */
export function outline(g: CanvasRenderingContext2D) {
  g.strokeStyle = OUTLINE;
  g.lineWidth = OUTLINE_W;
  g.stroke();
}

/** fillRect + the shared outline in one call. */
export function oRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = OUTLINE;
  g.lineWidth = OUTLINE_W;
  g.strokeRect(x, y, w, h);
}

/** Outlined ellipse. */
export function oEllipse(
  g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string,
) {
  g.fillStyle = fill;
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill();
  outline(g);
}
