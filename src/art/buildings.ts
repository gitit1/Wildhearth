import { HOUSE, BARN, STALL } from "../world/zones";
import { shadow } from "./shapes";

export function drawHouse(g: CanvasRenderingContext2D, roofOk = true, windowOk = true) {
  const { x, y, w, h } = HOUSE;
  shadow(g, x + w / 2 + 8, y + h + 8, w * 0.55, 12);
  g.fillStyle = "#c9a06a"; g.fillRect(x, y + h * 0.35, w, h * 0.65);
  g.fillStyle = "rgba(120,80,40,.25)";
  for (let i = 1; i < 6; i++) g.fillRect(x, y + h * 0.35 + i * ((h * 0.65) / 6), w, 2);
  g.fillStyle = "#7a5230"; g.fillRect(x + w * 0.44, y + h * 0.55, w * 0.13, h * 0.45);
  g.fillStyle = "#5d3e22"; g.fillRect(x + w * 0.44, y + h * 0.55, w * 0.13, 4);
  g.fillStyle = "#e8c46a"; g.beginPath(); g.arc(x + w * 0.54, y + h * 0.8, 2.4, 0, 7); g.fill();
  for (const wx of [x + w * 0.14, x + w * 0.72]) {
    g.fillStyle = "#8fd0e8"; g.fillRect(wx, y + h * 0.52, w * 0.15, h * 0.22);
    g.strokeStyle = "#6b4a2b"; g.lineWidth = 3; g.strokeRect(wx, y + h * 0.52, w * 0.15, h * 0.22);
    g.beginPath(); g.moveTo(wx + w * 0.075, y + h * 0.52); g.lineTo(wx + w * 0.075, y + h * 0.74); g.stroke();
  }
  g.fillStyle = "#a8433a";
  g.beginPath(); g.moveTo(x - 10, y + h * 0.38); g.lineTo(x + w / 2, y - h * 0.28);
  g.lineTo(x + w + 10, y + h * 0.38); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    g.beginPath();
    g.moveTo(x - 10 + ((w / 2 + 10) * i) / 5, y + h * 0.38 - (h * 0.66 * i) / 5);
    g.lineTo(x + w + 10 - ((w / 2 + 10) * i) / 5, y + h * 0.38 - (h * 0.66 * i) / 5);
    g.stroke();
  }
  g.fillStyle = "#8c8c94"; g.fillRect(x + w * 0.72, y - h * 0.16, w * 0.09, h * 0.3);
  g.fillStyle = "#6f6f78"; g.fillRect(x + w * 0.72, y - h * 0.16, w * 0.09, 5);

  if (!roofOk) {
    // hole in the roof, hastily patched with a mismatched plank
    g.fillStyle = "#3a2a1c";
    g.beginPath();
    g.moveTo(x + w * 0.3, y + h * 0.12);
    g.lineTo(x + w * 0.42, y + h * 0.05);
    g.lineTo(x + w * 0.46, y + h * 0.18);
    g.lineTo(x + w * 0.33, y + h * 0.22);
    g.closePath(); g.fill();
    g.save();
    g.translate(x + w * 0.38, y + h * 0.14); g.rotate(-0.35);
    g.fillStyle = "#a58254"; g.fillRect(-w * 0.09, -3, w * 0.18, 6);
    g.restore();
  }
  if (!windowOk) {
    // right window boarded shut (drawn over the normal glass pane above)
    const wx = x + w * 0.72, wy = y + h * 0.52, ww = w * 0.15, wh = h * 0.22;
    g.fillStyle = "#4a3a26"; g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = "#8a6a42"; g.lineWidth = 5; g.lineCap = "round";
    g.beginPath(); g.moveTo(wx - 3, wy + 3); g.lineTo(wx + ww + 3, wy + wh - 3); g.stroke();
    g.beginPath(); g.moveTo(wx + ww + 3, wy + 3); g.lineTo(wx - 3, wy + wh - 3); g.stroke();
  }
}

export function drawBarn(g: CanvasRenderingContext2D, barnOk = true) {
  const { x, y, w, h } = BARN;
  shadow(g, x + w / 2 + 6, y + h + 7, w * 0.55, 10);
  g.fillStyle = "#b24a3e"; g.fillRect(x, y + h * 0.3, w, h * 0.7);
  g.fillStyle = "rgba(0,0,0,.14)";
  for (let i = 1; i < 5; i++) g.fillRect(x + (i * w) / 5, y + h * 0.3, 2, h * 0.7);
  g.fillStyle = "#8a3830";
  g.beginPath(); g.moveTo(x - 8, y + h * 0.34); g.lineTo(x + w / 2, y - h * 0.18);
  g.lineTo(x + w + 8, y + h * 0.34); g.closePath(); g.fill();
  g.fillStyle = "#7a5230"; g.fillRect(x + w * 0.32, y + h * 0.45, w * 0.36, h * 0.55);
  g.strokeStyle = "#5d3e22"; g.lineWidth = 3;
  g.strokeRect(x + w * 0.32, y + h * 0.45, w * 0.36, h * 0.55);
  g.beginPath(); g.moveTo(x + w * 0.32, y + h * 0.45); g.lineTo(x + w * 0.68, y + h);
  g.moveTo(x + w * 0.68, y + h * 0.45); g.lineTo(x + w * 0.32, y + h); g.stroke();

  if (!barnOk) {
    // missing wall plank + a board hanging loose over the door
    g.fillStyle = "#3a1f1a";
    g.fillRect(x + w * 0.8, y + h * 0.42, w * 0.07, h * 0.5);
    g.save();
    g.translate(x + w * 0.5, y + h * 0.5); g.rotate(0.5);
    g.fillStyle = "#8a6a42"; g.fillRect(-w * 0.22, -3, w * 0.44, 6);
    g.restore();
  }
}

export function drawStall(g: CanvasRenderingContext2D, t: number) {
  const { x, y, w, h } = STALL;
  shadow(g, x + w / 2 + 4, y + h + 6, w * 0.55, 8);
  // counter
  g.fillStyle = "#9a7245"; g.fillRect(x, y + h * 0.45, w, h * 0.55);
  g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(x, y + h * 0.45, w, 4);
  // legs
  g.fillStyle = "#6f5334";
  g.fillRect(x + 3, y + h * 0.45, 5, h * 0.6);
  g.fillRect(x + w - 8, y + h * 0.45, 5, h * 0.6);
  // awning posts
  g.fillRect(x + 1, y - h * 0.35, 4, h * 0.8);
  g.fillRect(x + w - 5, y - h * 0.35, 4, h * 0.8);
  // striped awning with a soft flutter
  const fl = Math.sin(t * 2.2) * 1.5;
  const stripes = 5, sw = (w + 12) / stripes;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? "#e8ddca" : "#c05038";
    g.beginPath();
    g.moveTo(x - 6 + i * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.05 + fl);
    g.lineTo(x - 6 + i * sw, y - h * 0.05 + fl);
    g.closePath(); g.fill();
  }
  // goods: little fish crate
  g.fillStyle = "#b08a58"; g.fillRect(x + w * 0.2, y + h * 0.3, w * 0.28, h * 0.2);
  g.fillStyle = "#7fb0c8";
  g.beginPath(); g.ellipse(x + w * 0.34, y + h * 0.38, 6, 2.6, 0.3, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x + w * 0.28, y + h * 0.36, 6, 2.6, -0.2, 0, 7); g.fill();
}
