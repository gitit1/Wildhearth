import { T, WORLD_W, WORLD_H, MINIMAP_SCALE } from "../config";
import { FIELD, YARD, HOUSE, BARN, STALL, POND, TREES } from "../world/zones";
import { roundR } from "../art/shapes";
import type { Player } from "../entities/player";

/**
 * UO-style always-on radar map (key M toggles). The static world is painted
 * once; only the player marker redraws per frame.
 */

let canvas: HTMLCanvasElement;
let g: CanvasRenderingContext2D;
let base: HTMLCanvasElement;
let visible = true;

const W = Math.round(WORLD_W * MINIMAP_SCALE);
const H = Math.round(WORLD_H * MINIMAP_SCALE);

export function initMinimap() {
  canvas = document.getElementById("minimap") as HTMLCanvasElement;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  g = canvas.getContext("2d")!;
  base = paintBase();

  addEventListener("keydown", (e) => {
    if (e.code !== "KeyM") return;
    visible = !visible;
    canvas.style.display = visible ? "block" : "none";
  });
}

export function updateMinimap(player: Player) {
  if (!visible) return;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  g.drawImage(base, 0, 0, W, H);
  const px = player.x * MINIMAP_SCALE, py = player.y * MINIMAP_SCALE;
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(px, py, 1.8, 0, 7); g.fill();
}

/** Scaled-down echo of world/ground.ts + the buildings, painted once. */
function paintBase(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const b = c.getContext("2d")!;
  const s = MINIMAP_SCALE;

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
  for (const [tx, ty] of TREES) { b.beginPath(); b.arc(tx * s, ty * s, 2.4, 0, 7); b.fill(); }
  return c;
}
