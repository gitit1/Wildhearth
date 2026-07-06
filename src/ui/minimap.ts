import { T, WORLD_W, WORLD_H, MINIMAP_SCALE } from "../config";
import {
  FIELD, YARD, HOUSE, BARN, STALL, POND, WORLD_TREES,
  ROAD_SEGMENTS, RIVER, LAKE, DOCK, NEIGHBOR, MARKET_STALLS, COTTAGES, WELL, HEDGES,
} from "../world/zones";

/** The field can grow (plot expansions) — main keeps this current. */
let fieldBounds = { x0: FIELD.x0, y0: FIELD.y0, x1: FIELD.x1, y1: FIELD.y1 };
export function setMinimapField(b: { x0: number; y0: number; x1: number; y1: number }) {
  fieldBounds = b;
  if (base) base = paintBase();   // repaint the static layer with the new field
}
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

let mapBtn: HTMLElement | null = null;

export function initMinimap() {
  box = document.getElementById("minimapBox")!;
  canvas = document.getElementById("minimap") as HTMLCanvasElement;
  mapBtn = document.getElementById("mapBtn");
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

  // the 🗺 tool icon is the primary way in (mouse-first); M stays as shortcut
  const setVisible = (v: boolean) => {
    visible = v;
    box.style.display = visible ? "block" : "none";
    mapBtn?.classList.toggle("active", visible);
  };
  mapBtn?.addEventListener("click", () => setVisible(!visible));
  mapBtn?.classList.toggle("active", visible);
  addEventListener("keydown", (e) => {
    if (e.code === "KeyM") setVisible(!visible);
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

/** Scaled-down echo of the whole world (regions, road, water, buildings),
 *  painted once per resize. Player dot is drawn live on top each frame. */
function paintBase(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const b = c.getContext("2d")!;
  const s = scale;
  const rectFill = (r: { x: number; y: number; w: number; h: number }, col: string, rr = 2) => {
    roundR(b, r.x * s, r.y * s, r.w * s, r.h * s, rr); b.fillStyle = col; b.fill();
  };

  b.fillStyle = "#5d8a3c"; b.fillRect(0, 0, W, H);
  // forest region — a darker patch north-central
  rectFill({ x: 46 * T, y: 0, w: 18 * T, h: 17.5 * T }, "#456a2c", 6);
  // market square apron
  rectFill({ x: 59.5 * T, y: 14.5 * T, w: 21 * T, h: 13.5 * T }, "#b19670", 6);
  // dirt road strips
  for (const seg of ROAD_SEGMENTS) rectFill(seg, "#9c7c50", 2);
  // dirt yard
  rectFill({ x: YARD.x0 * T, y: YARD.y0 * T, w: (YARD.x1 - YARD.x0) * T, h: (YARD.y1 - YARD.y0) * T }, "#a58254", 4);
  // tilled field (live bounds — plot expansions grow it)
  rectFill({ x: fieldBounds.x0 * T, y: fieldBounds.y0 * T,
    w: (fieldBounds.x1 - fieldBounds.x0) * T, h: (fieldBounds.y1 - fieldBounds.y0) * T }, "#6e4f33", 3);
  // water: pond, river, lake
  b.fillStyle = "#3d6f8e";
  b.beginPath(); b.ellipse(POND.cx * s, POND.cy * s, POND.rx * s, POND.ry * s, 0, 0, 7); b.fill();
  rectFill(RIVER, "#3d6f8e", 4);
  rectFill(LAKE, "#3d6f8e", 6);
  rectFill(DOCK, "#a5814f", 1);
  // hedges (farm's east bound)
  for (const h of HEDGES) rectFill(h, "#37591f", 1);
  // buildings as coloured blocks
  b.fillStyle = "#b5453c"; b.fillRect(HOUSE.x * s, HOUSE.y * s, HOUSE.w * s, HOUSE.h * s);
  b.fillStyle = "#9c3d34"; b.fillRect(BARN.x * s, BARN.y * s, BARN.w * s, BARN.h * s);
  b.fillStyle = "#d9d3c0"; b.fillRect(STALL.x * s, STALL.y * s, STALL.w * s, STALL.h * s);
  b.fillStyle = "#c56a4a"; b.fillRect(NEIGHBOR.house.x * s, NEIGHBOR.house.y * s, NEIGHBOR.house.w * s, NEIGHBOR.house.h * s);
  b.fillStyle = "#9c3d34"; b.fillRect(NEIGHBOR.barn.x * s, NEIGHBOR.barn.y * s, NEIGHBOR.barn.w * s, NEIGHBOR.barn.h * s);
  b.fillStyle = "#d9c9a0"; for (const st of MARKET_STALLS) b.fillRect(st.x * s, st.y * s, st.w * s, st.h * s);
  b.fillStyle = "#cbb489"; for (const ct of COTTAGES) b.fillRect(ct.x * s, ct.y * s, ct.w * s, ct.h * s);
  b.fillStyle = "#8a8378"; b.beginPath(); b.arc(WELL.cx * s, WELL.cy * s, Math.max(1.5, WELL.r * s), 0, 7); b.fill();
  // trees
  b.fillStyle = "#3f6b2c";
  const tr = Math.max(1.6, 2.2 * (s / MINIMAP_SCALE));
  for (const [tx, ty] of WORLD_TREES) { b.beginPath(); b.arc(tx * s, ty * s, tr, 0, 7); b.fill(); }
  return c;
}
