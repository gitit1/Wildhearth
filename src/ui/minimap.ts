import { T, WORLD_W, WORLD_H, MINIMAP_SCALE } from "../config";
import { FIELD, YARD, HOUSE, BARN, STALL, POND, TREES } from "../world/zones";
import { roundR } from "../art/shapes";
import { makePanel } from "./panels";
import type { Player } from "../entities/player";

/**
 * UO-style always-on radar map: drag to move, corner grip to resize,
 * key M toggles. The static world repaints only when the size changes.
 */

let box: HTMLElement;
let canvas: HTMLCanvasElement;
let g: CanvasRenderingContext2D;
let base: HTMLCanvasElement;
let visible = true;
let scale = MINIMAP_SCALE;   // world px -> map px, including user resize
let W = 0, H = 0;

export function initMinimap() {
  box = document.getElementById("minimapBox")!;
  canvas = document.getElementById("minimap") as HTMLCanvasElement;
  g = canvas.getContext("2d")!;
  makePanel(box, box, "map", (userS) => {
    scale = MINIMAP_SCALE * userS;
    W = Math.round(WORLD_W * scale);
    H = Math.round(WORLD_H * scale);
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    base = paintBase();
  });

  addEventListener("keydown", (e) => {
    if (e.code !== "KeyM") return;
    visible = !visible;
    box.style.display = visible ? "block" : "none";
  });
}

export function updateMinimap(player: Player) {
  if (!visible) return;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  g.drawImage(base, 0, 0, W, H);
  const px = player.x * scale, py = player.y * scale;
  const r = Math.max(3, 3 * (scale / MINIMAP_SCALE));
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(px, py, r * 0.6, 0, 7); g.fill();
}

/** Scaled-down echo of world/ground.ts + the buildings, painted once per resize. */
function paintBase(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const b = c.getContext("2d")!;
  const s = scale;

  b.fillStyle = "#5d8a3c"; b.fillRect(0, 0, W, H);
  // dirt yard
  roundR(b, YARD.x0 * T * s, YARD.y0 * T * s, (YARD.x1 - YARD.x0) * T * s, (YARD.y1 - YARD.y0) * T * s, 4);
  b.fillStyle = "#a58254"; b.fill();
  // tilled field
  roundR(b, FIELD.x0 * T * s, FIELD.y0 * T * s, (FIELD.x1 - FIELD.x0) * T * s, (FIELD.y1 - FIELD.y0) * T * s, 3);
  b.fillStyle = "#6e4f33"; b.fill();
  // pond
  b.fillStyle = "#3d6f8e";
  b.beginPath(); b.ellipse(POND.cx * s, POND.cy * s, POND.rx * s, POND.ry * s, 0, 0, 7); b.fill();
  // buildings as roof-colored blocks
  b.fillStyle = "#b5453c"; b.fillRect(HOUSE.x * s, HOUSE.y * s, HOUSE.w * s, HOUSE.h * s);
  b.fillStyle = "#9c3d34"; b.fillRect(BARN.x * s, BARN.y * s, BARN.w * s, BARN.h * s);
  b.fillStyle = "#d9d3c0"; b.fillRect(STALL.x * s, STALL.y * s, STALL.w * s, STALL.h * s);
  // trees
  b.fillStyle = "#3f6b2c";
  const tr = Math.max(2, 2.4 * (s / MINIMAP_SCALE));
  for (const [tx, ty] of TREES) { b.beginPath(); b.arc(tx * s, ty * s, tr, 0, 7); b.fill(); }
  return c;
}
