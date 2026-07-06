import { T } from "../config";
import { FIELD, POND, RIVER, LAKE, DOCK, FISH_SPOTS } from "../world/zones";
import { mulberry32 } from "../engine/rng";
import { shadow, outline, oRect } from "./shapes";

/** A tree with a blob-clustered, three-tone canopy: a dark under-layer, the
 *  mid-tone body, and sunlit top clusters — each tree slightly its own shade
 *  (deterministic by position). */
export function drawTree(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  shadow(g, x + 4, y + 6, 20, 8);
  const rnd = mulberry32(((x * 31) ^ (y * 17)) | 0);
  const hueShift = (rnd() - 0.5) * 0.15;           // subtle per-tree variation
  const tone = (base: [number, number, number]) => {
    const [r, gg, b] = base;
    return `rgb(${Math.round(r * (1 + hueShift))},${Math.round(gg * (1 + hueShift * 0.6))},${b})`;
  };
  // trunk with a bark seam
  oRect(g, x - 4, y - 14, 8, 20, "#6b4a2b");
  g.strokeStyle = "rgba(50,32,16,.6)"; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x - 1, y - 12); g.lineTo(x, y + 4); g.stroke();
  const sway = Math.sin(t * 0.8 + x) * 2;
  const sx = x + sway * 0.4;
  // 1) dark under-canopy (the shaded mass beneath) — carries the outline
  g.fillStyle = tone([46, 74, 28]);
  for (const [ox, oy, r] of [[-11, -22, 14], [9, -21, 13], [0, -24, 15]] as const) {
    g.beginPath(); g.arc(sx + ox, y + oy, r, 0, 7); g.fill(); outline(g);
  }
  // 2) mid-tone body
  g.fillStyle = tone([71, 115, 44]);
  for (const [ox, oy, r] of [[-10, -28, 14], [10, -26, 12], [0, -38, 15], [-2, -30, 11]] as const) {
    g.beginPath(); g.arc(sx + ox, y + oy, r, 0, 7); g.fill(); outline(g);
  }
  // 3) sunlit clusters on top
  g.fillStyle = tone([104, 152, 66]);
  for (const [ox, oy, r] of [[-6, -40, 8], [6, -36, 7], [-12, -32, 6]] as const) {
    g.beginPath(); g.arc(sx + ox, y + oy, r, 0, 7); g.fill();
  }
  g.fillStyle = "rgba(255,255,220,.16)";
  g.beginPath(); g.arc(sx - 5, y - 42, 6, 0, 7); g.fill();
}

/** A leafy hedge wall — the "natural bound" sealing the farm's east side. Drawn
 *  as a run of overlapping green mounds with a shadowed base. */
export function drawHedge(g: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, t: number) {
  const rnd = mulberry32((r.x * 7 + r.y) | 0);
  g.fillStyle = "rgba(20,30,12,.25)";
  g.fillRect(r.x - 2, r.y + r.h - 4, r.w + 8, 6);
  // stacked leafy mounds down the length
  const step = 16;
  for (let yy = r.y; yy < r.y + r.h; yy += step) {
    const sway = Math.sin(t * 0.7 + yy * 0.05) * 0.8;
    for (const [dx, rr, c] of [[0, 11, "#3d6626"], [r.w, 10, "#37591f"], [r.w / 2, 12, "#47732c"]] as const) {
      g.fillStyle = c;
      g.beginPath(); g.arc(r.x + dx + sway, yy + step / 2, rr, 0, 7); g.fill(); outline(g);
    }
    // a few lighter leaf clusters on top
    g.fillStyle = "#5a8a38";
    g.beginPath(); g.arc(r.x + r.w / 2 + sway, yy + step * 0.3, 5 + rnd() * 2, 0, 7); g.fill();
  }
}

export function drawFence(
  g: CanvasRenderingContext2D, fenceOk = true,
  bounds: { x0: number; y0: number; x1: number; y1: number } = FIELD,
) {
  const rundown = !fenceOk;   // broken until the field fence is mended (Step 8)
  g.strokeStyle = "#8a6a42"; g.lineWidth = 4; g.lineCap = "round";
  const fx0 = bounds.x0 * T - 14, fy0 = bounds.y0 * T - 14;
  const fx1 = bounds.x1 * T + 14, fy1 = bounds.y1 * T + 14;
  // a broken-plank gap in the top and bottom rails when rundown
  const gapAt = fx0 + (fx1 - fx0) * 0.38, gapW = T * 1.6;
  for (const yy of [fy0, fy1]) {
    if (rundown) {
      g.beginPath(); g.moveTo(fx0, yy); g.lineTo(gapAt, yy); g.stroke();
      g.beginPath(); g.moveTo(gapAt + gapW, yy); g.lineTo(fx1, yy); g.stroke();
      g.beginPath(); g.moveTo(fx0, yy + 7); g.lineTo(gapAt - T * 0.4, yy + 7); g.stroke();
      g.beginPath(); g.moveTo(gapAt + gapW + T * 0.4, yy + 7); g.lineTo(fx1, yy + 7); g.stroke();
      // the fallen plank, tilted into the grass
      g.save();
      g.translate(gapAt + gapW / 2, yy + 12); g.rotate(0.35);
      g.beginPath(); g.moveTo(-T * 0.7, 0); g.lineTo(T * 0.7, 0); g.stroke();
      g.restore();
    } else {
      g.beginPath(); g.moveTo(fx0, yy); g.lineTo(fx1, yy); g.stroke();
      g.beginPath(); g.moveTo(fx0, yy + 7); g.lineTo(fx1, yy + 7); g.stroke();
    }
  }
  for (const xx of [fx0, fx1]) {
    g.beginPath(); g.moveTo(xx, fy0); g.lineTo(xx, fy1); g.stroke();
    g.beginPath(); g.moveTo(xx + 7, fy0); g.lineTo(xx + 7, fy1); g.stroke();
  }
  let post = 0;
  for (let xx = fx0; xx <= fx1; xx += T * 1.5, post++)
    for (const yy of [fy0, fy1]) {
      if (rundown && post % 5 === 3) {
        g.save(); g.translate(xx, yy + 2); g.rotate(0.3);
        oRect(g, -3, -8, 6, 16, "#6f5334"); g.restore();   // leaning post
      } else oRect(g, xx - 3, yy - 6, 6, 16, "#6f5334");
    }
  for (let yy = fy0; yy <= fy1; yy += T * 1.5)
    for (const xx of [fx0, fx1]) oRect(g, xx - 3, yy - 6, 6, 16, "#6f5334");
}

export function drawCorn(g: CanvasRenderingContext2D, t: number) {
  const rnd = mulberry32(99);
  for (let cy = FIELD.y0 + 0.7; cy < FIELD.y1; cy += 1.15) {
    for (let cx = FIELD.x0 + 0.7; cx < FIELD.x1; cx += 0.85) {
      const x = cx * T + (rnd() * 6 - 3), y = cy * T + (rnd() * 6 - 3);
      const sway = Math.sin(t * 1.6 + x * 0.13 + y * 0.07) * 2.2;
      g.strokeStyle = "#3f6a22"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + sway * 0.5, y - 10, x + sway, y - 20); g.stroke();
      g.strokeStyle = "#528a2c"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x - 5 + sway * 0.4, y - 13); g.stroke();
      g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 5 + sway * 0.6, y - 17); g.stroke();
      g.fillStyle = "#e8c85a";
      g.beginPath(); g.ellipse(x + sway * 0.8, y - 18, 2.4, 4.6, sway * 0.05, 0, 7); g.fill();
    }
  }
}

/** A tilled plot tile: real furrow ridges — a dark groove with a lit ridge
 *  crest per row, gently waved, plus a few soil crumbs (deterministic per
 *  tile). Watered soil reads visibly darker and damp. */
export function drawTilledTile(g: CanvasRenderingContext2D, cx: number, cy: number, watered = false) {
  const x = cx - T / 2, y = cy - T / 2;
  const rnd = mulberry32(((cx * 13) ^ (cy * 7)) | 0);
  g.fillStyle = watered ? "#3f2e1e" : "#57402a";
  g.fillRect(x + 2, y + 2, T - 4, T - 4);
  // furrows: 4 waved rows, groove shadow + crest highlight
  for (let i = 0; i < 4; i++) {
    const ry = y + 6 + i * 7 + rnd() * 1.5;
    const wob = rnd() * 2 - 1;
    g.strokeStyle = watered ? "rgba(18,11,6,.7)" : "rgba(38,24,12,.7)";
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(x + 4, ry);
    g.quadraticCurveTo(cx, ry + wob * 2, x + T - 4, ry);
    g.stroke();
    g.strokeStyle = watered ? "rgba(150,120,90,.28)" : "rgba(170,130,90,.45)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x + 4, ry - 2);
    g.quadraticCurveTo(cx, ry - 2 + wob * 2, x + T - 4, ry - 2);
    g.stroke();
  }
  // soil crumbs
  g.fillStyle = watered ? "rgba(20,13,7,.55)" : "rgba(120,88,55,.5)";
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(x + 5 + rnd() * (T - 10), y + 5 + rnd() * (T - 10), 1.4 + rnd(), 1 + rnd() * 0.7, rnd(), 0, 7);
    g.fill();
  }
  g.strokeStyle = "rgba(150,110,70,.45)"; g.lineWidth = 1.5;
  g.strokeRect(x + 2, y + 2, T - 4, T - 4);
  if (watered) {                                   // damp sheen
    g.fillStyle = "rgba(140,170,200,.12)";
    g.fillRect(x + 3, y + 3, T - 6, T - 6);
  }
}

const CROP_DEFAULT = { stalk: "#3f6a22", leaf: "#528a2c", fruit: "#e8c85a" };

/**
 * A crop on a tilled tile, drawn by growth stage (0..1): sprout -> young
 * stalk -> tall stalk -> ripe color when ready. Tinted per crop type from
 * data/crops.ts so every species reads differently in the field.
 */
export function drawCropTile(
  g: CanvasRenderingContext2D, cx: number, cy: number, stage: number, t: number,
  pal: { stalk: string; leaf: string; fruit: string } = CROP_DEFAULT, watered = false,
) {
  drawTilledTile(g, cx, cy, watered);
  const sway = Math.sin(t * 1.6 + cx * 0.13) * 1.6;
  for (const ox of [-8, 0, 8]) {
    const x = cx + ox, y = cy + 10;
    if (stage < 0.25) {
      // sprout
      g.strokeStyle = pal.leaf; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 4); g.stroke();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 4); g.stroke();
    } else {
      const h = 8 + stage * 16;                    // stalk height grows with stage
      g.strokeStyle = pal.stalk; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + sway * 0.5, y - h * 0.5, x + sway, y - h); g.stroke();
      g.strokeStyle = pal.leaf; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - h * 0.4); g.lineTo(x - 4 + sway * 0.4, y - h * 0.6); g.stroke();
      if (stage > 0.6) {
        g.beginPath(); g.moveTo(x, y - h * 0.6); g.lineTo(x + 4 + sway * 0.6, y - h * 0.8); g.stroke();
      }
      if (stage >= 1) {
        g.fillStyle = pal.fruit;
        g.beginPath(); g.ellipse(x + sway * 0.8, y - h + 2, 2.6, 5, sway * 0.05, 0, 7); g.fill();
        outline(g);
      }
    }
  }
}

/** A wilted crop: grey-brown, drooped over dry soil — clear it and replant. */
export function drawWiltedTile(g: CanvasRenderingContext2D, cx: number, cy: number) {
  drawTilledTile(g, cx, cy, false);
  for (const ox of [-8, 0, 8]) {
    const x = cx + ox, y = cy + 10;
    g.strokeStyle = "#7a6a4a"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + 3, y - 9, x + 8, y - 6); g.stroke();   // stalk bent over
    g.strokeStyle = "#8a795a"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x + 4, y - 8); g.lineTo(x + 8, y - 3); g.stroke();
  }
}

/** Berry bush: leafy mound, dotted with berries while full; bare when picked. */
export function drawBush(g: CanvasRenderingContext2D, x: number, y: number, full: boolean, t: number) {
  shadow(g, x + 2, y + 8, 16, 6);
  const sway = Math.sin(t * 1.1 + x * 0.3) * 0.8;
  const blobs: Array<[number, number, number, string]> = full
    ? [[-8, -2, 10, "#3d6626"], [8, -2, 9, "#47732c"], [0, -8, 11, "#528034"]]
    : [[-8, -2, 9, "#4a5c33"], [8, -2, 8, "#55683a"], [0, -7, 10, "#5f7342"]];
  for (const [ox, oy, r, c] of blobs) {
    g.fillStyle = c;
    g.beginPath(); g.arc(x + ox + sway, y + oy, r, 0, 7); g.fill(); outline(g);
  }
  if (full) {
    g.fillStyle = "#c2385a";
    const berries: Array<[number, number]> = [[-9, -4], [-2, -11], [6, -6], [1, -3], [9, -11]];
    for (const [ox, oy] of berries) {
      g.beginPath(); g.arc(x + ox + sway, y + oy, 2.2, 0, 7); g.fill();
    }
    g.fillStyle = "rgba(255,255,255,.5)";
    for (const [ox, oy] of berries) {
      g.beginPath(); g.arc(x + ox + sway - 0.7, y + oy - 0.7, 0.7, 0, 7); g.fill();
    }
  }
}

/** Ornamental flower bed by the house: turned earth -> seedlings -> bloom. */
export function drawFlowerBed(
  g: CanvasRenderingContext2D, x: number, y: number,
  bed: { planted: boolean; growth: number; bloomed: boolean }, t: number,
) {
  // the bed itself: an oval of turned earth
  g.fillStyle = "#57402a";
  g.beginPath(); g.ellipse(x, y, 15, 10, 0, 0, 7); g.fill();
  outline(g);
  if (!bed.planted) return;
  const rnd = mulberry32((x * 7 + y) | 0);
  if (!bed.bloomed) {
    // seedlings
    g.strokeStyle = "#6fae3e"; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const px = x - 10 + rnd() * 20, py = y - 4 + rnd() * 8;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px - 1.5, py - 3 - bed.growth * 3); g.stroke();
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + 1.5, py - 3 - bed.growth * 3); g.stroke();
    }
  } else {
    // wildflowers in bloom, gently swaying
    const colors = ["#d16a9a", "#e8c34f", "#8a7ac2", "#e07830", "#e0e6f0"];
    for (let i = 0; i < 7; i++) {
      const px = x - 11 + rnd() * 22, py = y - 5 + rnd() * 10;
      const sway = Math.sin(t * 1.3 + px * 0.4) * 0.8;
      g.strokeStyle = "#4a7a2a"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px, py + 3); g.lineTo(px + sway, py - 4); g.stroke();
      g.fillStyle = colors[i % colors.length]!;
      for (let pt = 0; pt < 5; pt++) {
        const a = (pt / 5) * Math.PI * 2;
        g.beginPath(); g.arc(px + sway + Math.cos(a) * 2.2, py - 5 + Math.sin(a) * 2.2, 1.4, 0, 7); g.fill();
      }
      g.fillStyle = "#e8c34f";
      g.beginPath(); g.arc(px + sway, py - 5, 1.2, 0, 7); g.fill();
    }
  }
}

/** Busking spot: a cobbled corner with an upturned hat waiting for coins. */
export function drawBuskSpot(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  // cobblestones
  const rnd = mulberry32(x | 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 12 + rnd() * 8;
    g.fillStyle = ["#9a938a", "#8a8378", "#a8a196"][(rnd() * 3) | 0]!;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 5 + rnd() * 2, 3.5 + rnd() * 1.5, a, 0, 7);
    g.fill();
  }
  // upturned hat
  g.fillStyle = "#7a5230";
  g.beginPath(); g.ellipse(x, y + 2, 9, 5, 0, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#5d3e22";
  g.beginPath(); g.ellipse(x, y, 6.5, 3.5, 0, 0, 7); g.fill();
  // a coin glinting inside
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(x + Math.sin(t * 2) * 1.5, y, 1.8, 0, 7); g.fill();
}

/** Floating music notes above a performer. */
export function drawMusicNotes(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  g.fillStyle = "#2b2b33";
  g.strokeStyle = "#2b2b33";
  g.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.9 + i * 0.33) % 1;
    const nx = x + Math.sin((t + i * 2.1) * 3) * 7 + (i - 1) * 10;
    const ny = y - 18 - phase * 22;
    g.globalAlpha = 1 - phase;
    g.beginPath(); g.ellipse(nx, ny, 2.6, 2, -0.4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(nx + 2.4, ny - 0.8); g.lineTo(nx + 2.4, ny - 9); g.stroke();
    g.beginPath(); g.ellipse(nx + 4.4, ny - 9, 2.4, 1.6, -0.3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

export function drawWaterShimmer(g: CanvasRenderingContext2D, t: number) {
  g.fillStyle = "rgba(255,255,255,.22)";
  for (let i = 0; i < 7; i++) {
    const px = POND.cx + Math.sin(t * 0.9 + i * 2.2) * POND.rx * 0.55;
    const py = POND.cy + Math.cos(t * 0.7 + i * 1.7) * POND.ry * 0.5;
    g.beginPath(); g.ellipse(px, py, 7, 1.7, 0, 0, 7); g.fill();
  }
}

/** Drifting highlights across the river + lake surface (same technique as the
 *  pond), plus persistent ripple markers at the designated fishing spots. */
export function drawOpenWaterShimmer(g: CanvasRenderingContext2D, t: number) {
  g.fillStyle = "rgba(255,255,255,.16)";
  for (const wtr of [RIVER, LAKE]) {
    const n = wtr === LAKE ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const px = wtr.x + wtr.w * (0.5 + Math.sin(t * 0.6 + i * 1.9) * 0.42);
      const py = wtr.y + wtr.h * (0.5 + Math.cos(t * 0.5 + i * 1.3) * 0.42);
      g.beginPath(); g.ellipse(px, py, 8, 1.8, 0, 0, 7); g.fill();
    }
  }
  // fishing-spot ripples: gentle expanding rings so the spots read as "fishable"
  for (const s of FISH_SPOTS) {
    const phase = (t * 0.6 + (s.wx + s.wy) * 0.01) % 1;
    g.strokeStyle = `rgba(230,240,255,${0.35 * (1 - phase)})`;
    g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(s.wx, s.wy, 4 + phase * 12, 2 + phase * 5, 0, 0, 7); g.stroke();
  }
}

/** The wooden dock/jetty reaching into the lake — the one walkable spot on the
 *  water. Planks across two rails, with shadowed gaps between boards. */
export function drawDock(g: CanvasRenderingContext2D, t: number) {
  const { x, y, w, h } = DOCK;
  // soft reflection/shadow on the water
  g.fillStyle = "rgba(15,30,40,.28)";
  g.fillRect(x + 3, y + 6, w, h);
  // deck
  oRect(g, x, y, w, h, "#a5814f");
  // planks (running across, north-south dock -> horizontal boards)
  g.strokeStyle = "rgba(60,40,22,.5)"; g.lineWidth = 1.4;
  for (let py = y + 6; py < y + h; py += 8) {
    g.beginPath(); g.moveTo(x + 1, py); g.lineTo(x + w - 1, py); g.stroke();
  }
  g.strokeStyle = "rgba(255,235,200,.12)"; g.lineWidth = 1;
  for (let py = y + 5; py < y + h; py += 8) {
    g.beginPath(); g.moveTo(x + 1, py); g.lineTo(x + w - 1, py); g.stroke();
  }
  // two mooring posts at the far (south) end
  const bob = Math.sin(t * 1.5) * 0.8;
  oRect(g, x + 2, y + h - 4 + bob, 5, 10, "#6f5334");
  oRect(g, x + w - 7, y + h - 4 - bob, 5, 10, "#6f5334");
}

/** A little wooden signpost where buskers used to play on the farm, now
 *  pointing them to the market square. */
export function drawBuskSign(g: CanvasRenderingContext2D, x: number, y: number) {
  shadow(g, x + 2, y + 6, 9, 4);
  oRect(g, x - 2, y - 18, 4, 22, "#7a5230");           // post
  oRect(g, x - 12, y - 26, 24, 11, "#a5814f");         // board
  // a tiny musical note glyph
  g.fillStyle = "#3a2a1c";
  g.beginPath(); g.ellipse(x - 4, y - 19, 2.2, 1.7, -0.4, 0, 7); g.fill();
  g.strokeStyle = "#3a2a1c"; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x - 2, y - 20); g.lineTo(x - 2, y - 25); g.stroke();
  // a little arrow east (toward the market)
  g.strokeStyle = "#3a2a1c"; g.lineWidth = 1.6; g.lineCap = "round";
  g.beginPath(); g.moveTo(x + 2, y - 20.5); g.lineTo(x + 9, y - 20.5); g.stroke();
  g.beginPath(); g.moveTo(x + 6, y - 22.5); g.lineTo(x + 9, y - 20.5); g.lineTo(x + 6, y - 18.5); g.stroke();
}
