import { roundR } from "./shapes";

/** Pulsing golden outlines that mark an interactable object under the cursor. */

function pulse(time: number): number {
  return 0.45 + 0.22 * Math.sin(time * 5);
}

function strokeGlow(g: CanvasRenderingContext2D, time: number) {
  g.strokeStyle = `rgba(255,238,150,${pulse(time)})`;
  g.lineWidth = 3;
  g.shadowColor = "rgba(255,226,120,0.85)";
  g.shadowBlur = 12;
}

export function glowEllipse(
  g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, time: number
) {
  g.save();
  strokeGlow(g, time);
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
  g.restore();
}

export function glowRect(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number
) {
  g.save();
  strokeGlow(g, time);
  roundR(g, x, y, w, h, 8); g.stroke();
  g.restore();
}
