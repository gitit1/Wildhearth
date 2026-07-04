import { shadow, roundR, outline } from "./shapes";
import type { Player } from "../entities/player";
import type { Cow, Hen } from "../entities/animals";

export function drawFarmer(g: CanvasRenderingContext2D, p: Player, t: number) {
  const bob = p.moving ? Math.abs(Math.sin(t * 9)) * 2 : 0;
  const step = p.moving ? Math.sin(t * 9) * 4 : 0;
  shadow(g, p.x, p.y + 13, 11, 4.5);
  g.save(); g.translate(p.x, p.y - bob);
  g.fillStyle = "#4a5d8a";
  g.fillRect(-6, 2 + -step * 0.5, 5, 12 + step * 0.5);
  g.fillRect(1, 2 + step * 0.5, 5, 12 - step * 0.5);
  g.fillStyle = "#b0432f"; roundR(g, -8, -10, 16, 15, 5); g.fill(); outline(g);
  g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(-8, -2, 16, 3);
  g.fillStyle = "#b0432f";
  g.fillRect(-11, -8 + step * 0.4, 4, 11); g.fillRect(7, -8 - step * 0.4, 4, 11);
  g.fillStyle = "#e8b48a";
  g.fillRect(-11, 2 + step * 0.4, 4, 3); g.fillRect(7, 2 - step * 0.4, 4, 3);
  g.fillStyle = "#e8b48a"; g.beginPath(); g.arc(0, -16, 7, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#2a2a30";
  if (p.dir === 2) { g.beginPath(); g.arc(-2.5, -17, 1.1, 0, 7); g.arc(2.5, -17, 1.1, 0, 7); g.fill(); }
  else if (p.dir === 1) { g.beginPath(); g.arc(3, -17, 1.1, 0, 7); g.fill(); }
  else if (p.dir === 3) { g.beginPath(); g.arc(-3, -17, 1.1, 0, 7); g.fill(); }
  g.fillStyle = "#e0be5c";
  g.beginPath(); g.ellipse(0, -20, 11, 4, 0, 0, 7); g.fill(); outline(g);
  g.beginPath(); g.ellipse(0, -23, 6.5, 4.5, 0, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#c2a244"; g.fillRect(-6.5, -23, 13, 2);
  // fishing rod when casting
  if (p.fishing) {
    g.strokeStyle = "#6b4a2b"; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(8, -6); g.lineTo(22, -22); g.stroke();
    g.strokeStyle = "rgba(240,240,240,.8)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(22, -22); g.lineTo(26, 6 + Math.sin(t * 5) * 2); g.stroke();
  }
  g.restore();
}

export function drawCow(g: CanvasRenderingContext2D, c: Cow, t: number) {
  const bob = Math.sin(t * 3 + c.x) * 1;
  shadow(g, c.x, c.y + 12, 20, 7);
  g.save(); g.translate(c.x, c.y + bob); if (c.flip) g.scale(-1, 1);
  g.fillStyle = "#e8e4dc";
  for (const lx of [-13, -5, 5, 13]) g.fillRect(lx - 2, 4, 4, 10);
  g.fillStyle = "#f2efe8"; roundR(g, -18, -10, 36, 18, 9); g.fill(); outline(g);
  g.fillStyle = "#3a3a40";
  g.beginPath(); g.ellipse(-6, -4, 7, 5, 0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(9, 2, 5, 4, -0.4, 0, 7); g.fill();
  g.fillStyle = "#f2efe8"; roundR(g, 14, -14, 14, 12, 6); g.fill(); outline(g);
  g.fillStyle = "#e8b4b8"; g.fillRect(22, -6, 6, 4);
  g.fillStyle = "#2a2a30"; g.beginPath(); g.arc(19, -10, 1.6, 0, 7); g.fill();
  g.fillStyle = "#d9d4c8"; g.beginPath(); g.ellipse(15, -15, 3, 2, 0, 0, 7); g.fill();
  g.restore();
}

export function drawHen(g: CanvasRenderingContext2D, h: Hen, t: number) {
  void t;
  shadow(g, h.x, h.y + 6, 7, 3);
  const peck = h.peck > 0 ? Math.sin(h.peck * 20) * 3 : 0;
  g.save(); g.translate(h.x, h.y);
  g.fillStyle = "#f5f2ea"; g.beginPath(); g.ellipse(0, 0, 7, 6, 0, 0, 7); g.fill(); outline(g);
  g.beginPath(); g.arc(5, -4 + peck, 4, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#d94a3a"; g.beginPath(); g.arc(5, -8 + peck, 1.6, 0, 7); g.fill();
  g.fillStyle = "#e8a83a";
  g.beginPath(); g.moveTo(8, -4 + peck); g.lineTo(12, -3 + peck); g.lineTo(8, -2 + peck);
  g.closePath(); g.fill();
  g.fillStyle = "#2a2a30"; g.beginPath(); g.arc(6, -5 + peck, 1, 0, 7); g.fill();
  g.restore();
}
