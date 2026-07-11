/**
 * Title-screen vista — PIXEL ART (owner directive: "the main screen is not
 * pixel — its whole background needs to change"). The same warm dawn scene over
 * the rundown farm, restyled from a smooth painterly gradient into genuine
 * pixel art consistent with the rest of the game. Two dual-path renderers
 * (CLAUDE.md hard rule #1):
 *
 *  1. PRIMARY — a wide PixelLab pixel-art landscape (`ui/title-vista.png`):
 *     a cozy rundown farm at sunrise (rolling hills, farmhouse with lit windows
 *     + chimney smoke, low sun, distant trees). Drawn scaled-to-COVER the
 *     viewport with `imageSmoothingEnabled = false` (chunky, crisp, no blur),
 *     with a few gliding pixel birds for life and a soft vignette so the logo +
 *     button column stay readable over it.
 *  2. FALLBACK (zero-PNG) — the SAME scene rebuilt in code as true pixel art:
 *     rendered into a LOW-RESOLUTION offscreen buffer (a limited warm sunrise
 *     palette, ordered/Bayer-DITHERED sky + hill bands mirroring
 *     `world/ground.ts`, flat pixel sun / hills / farmhouse / trees / fence),
 *     then blitted to the screen nearest-neighbour so every pixel is chunky.
 *     Gently animated — drifting clouds, gliding birds, a lit flickering
 *     window, rising chimney smoke, a breathing sun, a faint sky shimmer — but
 *     cheap (the whole buffer is a few tens of thousands of pixels).
 *
 * `drawLogo` renders the "Wildhearth" wordmark + heart-sprout motif at reduced
 * resolution and upscales nearest-neighbour, so it too reads as a chunky pixel
 * wordmark instead of smooth serif.
 */
import { sprite } from "./sprites";
import { VISTA_PIXEL, VISTA_BUF_MIN, VISTA_BUF_MAX, VISTA_LOGO_PIXEL } from "../config";

/** 4x4 Bayer matrix, normalised to (0,1) thresholds — the same ordered-dither
 *  kernel the pixel ground uses (world/ground.ts). */
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
  .map((r) => r.map((v) => (v + 0.5) / 16));

// ---------------------------------------------------------------------------
//  PRIMARY PATH — the PixelLab landscape sprite, scaled to cover.
// ---------------------------------------------------------------------------

/** A little gliding pixel bird — a chunky "M" silhouette, tips lifting on the
 *  flap. `p` is the art-pixel size in screen px (so it matches the scene grid).
 *  Drawn in SCREEN space, snapped to `p`-sized blocks. */
function pxBird(g: CanvasRenderingContext2D, x: number, y: number, p: number, flap: number, col: string) {
  g.fillStyle = col;
  const up = flap > 0.5 ? -1 : 0;   // wing tips lift on the up-beat
  const blk = (cx: number, cy: number) => g.fillRect(Math.round(x + cx * p), Math.round(y + cy * p), Math.ceil(p), Math.ceil(p));
  blk(-2, up); blk(-1, -1 + up * 0.5); blk(0, 0); blk(1, -1 + up * 0.5); blk(2, up);
}

/** Draw the PixelLab scene scaled to cover `W`×`H`, plus gliding birds + a
 *  vignette. Returns false if the sprite isn't loaded (→ code fallback). */
function drawSpriteVista(g: CanvasRenderingContext2D, W: number, H: number, t: number): boolean {
  const img = sprite("ui/title-vista");
  if (!img) return false;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(W / iw, H / ih);      // COVER
  const dw = iw * scale, dh = ih * scale;
  const dx = (W - dw) / 2, dy = (H - dh) / 2;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, dx, dy, dw, dh);
  g.imageSmoothingEnabled = prev;

  // a few gliding birds high in the warm sky (dark silhouettes, on the grid)
  const p = Math.max(2, Math.round(scale));
  for (let i = 0; i < 3; i++) {
    const speed = 16 + i * 6;
    const bx = ((i * 0.31 * W + t * speed) % (W + 80)) - 40;
    const by = H * (0.16 + i * 0.05) + Math.sin(t * 0.8 + i) * 4;
    const flap = 0.5 + Math.sin(t * 4 + i * 1.3) * 0.5;
    pxBird(g, bx, by, p, flap, "rgba(38,28,20,.72)");
  }

  vignette(g, W, H);
  return true;
}

/** A gentle warm vignette (kept subtle) so the logo up top and the button
 *  column at the bottom stay readable over the bright scene. Shared by both
 *  paths, drawn in screen space (a lighting overlay — doesn't break the pixel
 *  read). */
function vignette(g: CanvasRenderingContext2D, W: number, H: number) {
  const vig = g.createRadialGradient(W / 2, H * 0.44, H * 0.25, W / 2, H * 0.55, H * 1.05);
  vig.addColorStop(0, "rgba(20,14,8,0)");
  vig.addColorStop(1, "rgba(16,12,6,.4)");
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
  // a touch more darkening along the very bottom, under the buttons
  const bot = g.createLinearGradient(0, H * 0.72, 0, H);
  bot.addColorStop(0, "rgba(16,12,6,0)");
  bot.addColorStop(1, "rgba(16,12,6,.34)");
  g.fillStyle = bot;
  g.fillRect(0, H * 0.72, W, H * 0.28);
}

// ---------------------------------------------------------------------------
//  FALLBACK PATH — the code-drawn pixel vista (zero PNG). Rendered into a small
//  offscreen buffer, then upscaled nearest-neighbour.
// ---------------------------------------------------------------------------

let buf: HTMLCanvasElement | null = null;
let bctx: CanvasRenderingContext2D | null = null;

// Limited warm-sunrise sky palette (top pre-dawn indigo → gold at the horizon).
const SKY: Array<[number, [number, number, number]]> = [
  [0.00, [56, 42, 84]],
  [0.30, [96, 62, 106]],
  [0.52, [154, 82, 110]],
  [0.68, [206, 108, 92]],
  [0.82, [240, 146, 86]],
  [0.92, [248, 182, 106]],
  [1.00, [255, 222, 150]],
];

/** Fill a solid pixel disc (used for the sun + cloud puffs). */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let dy = -r; dy <= r; dy++) {
    const dxr = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(cx - dxr, cy + dy, dxr * 2 + 1, 1);
  }
}

/** A lumpy 2-tone pixel cloud (warm underside + sunlit crown). */
function pxCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#e6b487";
  disc(ctx, x, y + 1, Math.round(s));
  disc(ctx, x - Math.round(s * 1.1), y + 1, Math.round(s * 0.7));
  disc(ctx, x + Math.round(s * 1.1), y + 1, Math.round(s * 0.7));
  ctx.fillStyle = "#fbe3bd";
  disc(ctx, x, y, Math.round(s * 0.85));
  disc(ctx, x - Math.round(s * 0.9), y, Math.round(s * 0.55));
  disc(ctx, x + Math.round(s * 0.9), y, Math.round(s * 0.55));
}

/** One rolling hill band: a wavy top filled to the buffer bottom, with a
 *  dithered lighter rim along its crest. */
function pxHill(
  ctx: CanvasRenderingContext2D, PW: number, PH: number,
  topY: number, amp: number, freq: number, phase: number,
  body: string, rim: string,
) {
  for (let x = 0; x < PW; x++) {
    const ty = Math.round(
      topY + Math.sin((x / PW) * Math.PI * 2 * freq + phase) * amp
        + Math.sin((x / PW) * Math.PI * 2 * freq * 2.4 + phase * 1.7) * amp * 0.35,
    );
    ctx.fillStyle = body;
    ctx.fillRect(x, ty, 1, PH - ty);
    // a 2px dithered sunlit rim on the crest
    ctx.fillStyle = rim;
    for (let k = 0; k < 3; k++) {
      if (BAYER[(ty + k) & 3]![x & 3]! < 0.55 - k * 0.18) ctx.fillRect(x, ty + k, 1, 1);
    }
  }
}

/** The cozy farmhouse silhouette (body + gable roof + chimney + lit window +
 *  rising smoke), all flat pixel rects. */
function pxFarmhouse(ctx: CanvasRenderingContext2D, cx: number, groundY: number, u: number, t: number) {
  const w = Math.round(u * 2.4), h = Math.round(u * 1.4);
  const bx = Math.round(cx - w / 2), by = groundY - h;
  // body
  ctx.fillStyle = "#5a4632";
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = "#4a3826";
  ctx.fillRect(bx, by, w, 1);
  // gable roof (scanline triangle), a touch darker
  const rApexY = by - Math.round(h * 0.62), rw = Math.round(w * 1.18);
  const rows = by - rApexY;
  ctx.fillStyle = "#43301f";
  for (let i = 0; i <= rows; i++) {
    const frac = i / rows;
    const lw = Math.round(rw * frac);
    ctx.fillRect(Math.round(cx - lw / 2), rApexY + i, lw, 1);
  }
  // chimney
  ctx.fillStyle = "#3a2a1b";
  ctx.fillRect(bx + Math.round(w * 0.66), by - Math.round(h * 0.5), Math.max(2, Math.round(w * 0.14)), Math.round(h * 0.5));
  // warm lit window (gently flickering)
  const flick = Math.sin(t * 2.1) > -0.2 ? "#ffd47a" : "#f2b95a";
  ctx.fillStyle = flick;
  ctx.fillRect(bx + Math.round(w * 0.18), by + Math.round(h * 0.36), Math.max(2, Math.round(w * 0.22)), Math.round(h * 0.4));
  ctx.fillStyle = "#3a2a1b";
  ctx.fillRect(bx + Math.round(w * 0.18) + Math.round(w * 0.11), by + Math.round(h * 0.36), 1, Math.round(h * 0.4));
  // rising chimney smoke
  const smokeX = bx + Math.round(w * 0.66) + 1;
  for (let i = 0; i < 4; i++) {
    const pr = (t * 0.35 + i * 0.28) % 1;
    const sy = by - Math.round(h * 0.5) - Math.round(pr * u * 1.6);
    const sx = smokeX + Math.round(Math.sin(t * 1.4 + i) * u * 0.18 * pr);
    if (BAYER[sy & 3]![sx & 3]! < (1 - pr) * 0.7) {
      ctx.fillStyle = "#d9cdbe";
      disc(ctx, sx, sy, Math.max(1, Math.round((0.2 + pr) * u * 0.28)));
    }
  }
}

/** A simple round-canopy pixel tree. */
function pxTree(ctx: CanvasRenderingContext2D, cx: number, groundY: number, u: number) {
  ctx.fillStyle = "#3a2a1b";
  ctx.fillRect(cx - 1, groundY - Math.round(u * 0.9), 2, Math.round(u * 0.9));
  ctx.fillStyle = "#33452a";
  disc(ctx, cx, groundY - Math.round(u * 1.15), Math.round(u * 0.62));
  disc(ctx, cx - Math.round(u * 0.45), groundY - Math.round(u * 0.9), Math.round(u * 0.44));
  disc(ctx, cx + Math.round(u * 0.45), groundY - Math.round(u * 0.9), Math.round(u * 0.44));
  // warm dawn rim on the sunlit (right) side
  ctx.fillStyle = "#6a8a4a";
  disc(ctx, cx + Math.round(u * 0.35), groundY - Math.round(u * 1.4), Math.round(u * 0.28));
}

/** Paint the whole code pixel-vista into the low-res buffer. */
function paintPixelBuffer(ctx: CanvasRenderingContext2D, PW: number, PH: number, t: number) {
  const horizon = Math.round(PH * 0.66);

  // --- dithered banded sky ---
  const sky = ctx.createImageData(PW, PH);
  const d = sky.data;
  const horizonColor = SKY[SKY.length - 1]![1];
  for (let y = 0; y < PH; y++) {
    const v = Math.min(1, y / horizon);
    // find the palette segment
    let si = 0;
    while (si < SKY.length - 2 && v > SKY[si + 1]![0]) si++;
    const [p0, c0] = SKY[si]!, [p1, c1] = SKY[si + 1]!;
    let lt = (v - p0) / (p1 - p0);
    lt += Math.sin(y * 0.25 + t * 0.6) * 0.05;   // faint sky shimmer
    for (let x = 0; x < PW; x++) {
      const c = (y >= horizon) ? horizonColor : (BAYER[y & 3]![x & 3]! < lt ? c1 : c0);
      const o = (y * PW + x) << 2;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(sky, 0, 0);

  // --- low sun + dithered halo (behind the hills), breathing ---
  const sunX = Math.round(PW * 0.72), sunY = Math.round(horizon - PH * 0.09);
  const pulse = 1 + Math.sin(t * 0.8) * 0.05;
  const r = Math.max(4, Math.round(PH * 0.055 * pulse));
  const hr = r * 3;
  for (let dy = -hr; dy <= hr; dy++) {
    for (let dx = -hr; dx <= hr; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r || dist > hr) continue;
      const a = 1 - dist / hr;
      if (BAYER[(sunY + dy) & 3]![(sunX + dx) & 3]! < a * 0.5) {
        ctx.fillStyle = "#ffcf8a";
        ctx.fillRect(sunX + dx, sunY + dy, 1, 1);
      }
    }
  }
  ctx.fillStyle = "#ffe0a0"; disc(ctx, sunX, sunY, r);
  ctx.fillStyle = "#fff3d2"; disc(ctx, sunX, sunY, Math.max(2, r - 2));

  // --- drifting clouds (wrap) ---
  const clouds: Array<[number, number, number]> = [
    [0.16, 0.20, 0.9], [0.5, 0.14, 1.15], [0.83, 0.26, 0.8], [0.34, 0.34, 0.7],
  ];
  for (const [fx, fy, scl] of clouds) {
    const x = Math.round(((fx * PW + t * 5 * scl) % (PW + 60)) - 30);
    pxCloud(ctx, x, Math.round(fy * PH), Math.max(2, PH * 0.03 * scl));
  }

  // --- rolling parallax hills (back = hazier violet, front = meadow green) ---
  pxHill(ctx, PW, PH, horizon - Math.round(PH * 0.02), PH * 0.02, 1, 0.6, "#7d6a86", "#a98aa0");
  pxHill(ctx, PW, PH, horizon + Math.round(PH * 0.05), PH * 0.03, 1.4, 2.2, "#5f7250", "#7d9a5f");
  pxHill(ctx, PW, PH, horizon + Math.round(PH * 0.13), PH * 0.045, 1.9, 4.1, "#495c37", "#6a8248");

  // --- foreground farm on the near meadow (left of centre so the button column
  //     never covers the house) ---
  const groundY = horizon + Math.round(PH * 0.24);
  const u = Math.max(4, PH * 0.09);
  pxTree(ctx, Math.round(PW * 0.10), groundY + Math.round(PH * 0.02), u * 0.9);
  pxFarmhouse(ctx, Math.round(PW * 0.28), groundY + Math.round(PH * 0.03), u, t);
  pxTree(ctx, Math.round(PW * 0.72), groundY + Math.round(PH * 0.05), u * 1.1);

  // a hint of a leaning broken fence off to the right (the rundown farm)
  ctx.fillStyle = "#3a2a1b";
  const fy = groundY + Math.round(PH * 0.12);
  const railY = fy - Math.round(u * 0.28);
  for (let i = 0; i < 8; i++) {
    const fx = Math.round(PW * 0.5 + i * PW * 0.06);
    const lean = i % 3 === 0 ? 1 : 0;   // a couple of leaning posts
    ctx.fillRect(fx, railY, 1, fy - railY);
    if (lean) ctx.fillRect(fx + 1, railY, 1, Math.round((fy - railY) / 2));
  }
  ctx.fillRect(Math.round(PW * 0.5), railY, Math.round(7 * PW * 0.06), 1);

  // --- birds gliding across (wrap), in front of the hills ---
  for (let i = 0; i < 4; i++) {
    const speed = 6 + i * 2;
    const x = Math.round(((i * 0.27 * PW + t * speed) % (PW + 20)) - 10);
    const y = Math.round(PH * (0.22 + i * 0.045) + Math.sin(t * 0.9 + i) * 3);
    const flap = Math.sin(t * 4 + i * 1.3);
    ctx.fillStyle = "rgba(48,36,26,.8)";
    const up = flap > 0 ? -1 : 0;
    for (const [ox, oy] of [[-2, up], [-1, 0], [0, 0], [1, 0], [2, up]] as const) ctx.fillRect(x + ox, y + oy, 1, 1);
  }
}

/** Draw the code pixel-vista: paint the low-res buffer, upscale to cover. */
function drawPixelVista(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const PW = Math.max(VISTA_BUF_MIN, Math.min(VISTA_BUF_MAX, Math.round(W / VISTA_PIXEL)));
  const PH = Math.max(1, Math.round(PW * H / W));
  if (!buf) { buf = document.createElement("canvas"); bctx = buf.getContext("2d"); }
  if (!bctx) return;
  if (buf.width !== PW || buf.height !== PH) { buf.width = PW; buf.height = PH; }
  bctx.imageSmoothingEnabled = false;
  paintPixelBuffer(bctx, PW, PH, t);

  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(buf, 0, 0, PW, PH, 0, 0, W, H);
  g.imageSmoothingEnabled = prev;
  vignette(g, W, H);
}

/**
 * Paint the whole vista into a `W`×`H` box (CSS px; the caller sets the
 * transform / clears). `t` is seconds since the menu opened. Prefers the
 * PixelLab landscape sprite, falls back to the code pixel-vista (zero PNG).
 */
export function drawVista(g: CanvasRenderingContext2D, W: number, H: number, t: number) {
  if (!drawSpriteVista(g, W, H, t)) drawPixelVista(g, W, H, t);
}

// ---------------------------------------------------------------------------
//  Logo — a chunky pixel wordmark (rendered small, upscaled nearest-neighbour).
// ---------------------------------------------------------------------------

/** A little heart with a sprout growing from its top notch — the game's motif.
 *  Drawn in the LOW-RES logo buffer's own coordinate space. */
function heartSprout(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number) {
  g.fillStyle = "#d6564e";
  g.beginPath();
  g.moveTo(cx, cy + s * 0.85);
  g.bezierCurveTo(cx - s * 1.2, cy - s * 0.1, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.2, cy - s * 0.1, cx, cy + s * 0.85);
  g.closePath();
  g.fill();
  g.strokeStyle = "#3a1814"; g.lineWidth = Math.max(1, s * 0.16); g.stroke();
  const sway = Math.sin(t * 1.6) * s * 0.1;
  g.strokeStyle = "#5a9a48"; g.lineWidth = Math.max(1, s * 0.16); g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx, cy - s * 0.28);
  g.quadraticCurveTo(cx + sway, cy - s * 0.7, cx + sway, cy - s * 0.95);
  g.stroke();
  g.fillStyle = "#6cb356";
  g.beginPath(); g.ellipse(cx - s * 0.22 + sway * 0.5, cy - s * 0.72, s * 0.3, s * 0.16, -0.6, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + s * 0.24 + sway, cy - s * 0.9, s * 0.3, s * 0.16, 0.6, 0, 7); g.fill();
}

// A reusable low-res buffer for the logo (sized to hold the wordmark + motif).
let lbuf: HTMLCanvasElement | null = null;
let lctx: CanvasRenderingContext2D | null = null;

/**
 * Paint the "Wildhearth" wordmark centred at (cx, cy), sized by `scale` (rough
 * cap-height in screen px), as a CHUNKY PIXEL wordmark: it's rendered into a
 * buffer at 1/VISTA_LOGO_PIXEL resolution (warm gold fill, dark outline, a slim
 * highlight, the heart-and-sprout motif above) and upscaled nearest-neighbour,
 * with a gentle vertical bob.
 */
export function drawLogo(g: CanvasRenderingContext2D, cx: number, cy: number, scale: number, t: number) {
  const P = Math.max(2, VISTA_LOGO_PIXEL);
  const bob = Math.sin(t * 1.1) * scale * 0.03;

  // Buffer size (screen box the logo + motif occupy) / P → low-res cells.
  const boxW = Math.ceil(scale * 7.4);
  const boxH = Math.ceil(scale * 2.7);
  const bw = Math.ceil(boxW / P), bh = Math.ceil(boxH / P);
  if (!lbuf) { lbuf = document.createElement("canvas"); lctx = lbuf.getContext("2d"); }
  if (!lctx) return;
  if (lbuf.width !== bw || lbuf.height !== bh) { lbuf.width = bw; lbuf.height = bh; }
  const c = lctx;
  c.clearRect(0, 0, bw, bh);
  c.imageSmoothingEnabled = false;

  // Draw into the buffer at reduced scale; the wordmark baseline sits a little
  // below buffer-centre so the motif has room above it.
  const s = scale / P;                 // low-res cap height
  const bx = bw / 2, by = bh * 0.62;
  c.save();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `800 ${s}px Georgia, "Times New Roman", serif`;

  // dark pixel outline
  c.lineJoin = "round";
  c.strokeStyle = "#3a2712";
  c.lineWidth = Math.max(1, s * 0.16);
  c.strokeText("Wildhearth", bx, by);
  // a hard 1-cell drop shadow for weight
  c.fillStyle = "rgba(20,12,6,.9)";
  c.fillText("Wildhearth", bx, by + 1);

  // warm gold banded fill (few stops → dithers to bands once upscaled)
  const grad = c.createLinearGradient(0, by - s * 0.6, 0, by + s * 0.6);
  grad.addColorStop(0, "#ffe9a8");
  grad.addColorStop(0.5, "#ffd15a");
  grad.addColorStop(1, "#e8a52e");
  c.fillStyle = grad;
  c.fillText("Wildhearth", bx, by);

  // slim inner highlight
  c.strokeStyle = "rgba(255,255,235,.4)";
  c.lineWidth = Math.max(1, s * 0.03);
  c.strokeText("Wildhearth", bx, by - s * 0.04);

  heartSprout(c, bx, by - s * 0.92, s * 0.34, t);
  c.restore();

  // Blit the buffer up nearest-neighbour, centred on (cx, cy+bob).
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  const dw = bw * P, dh = bh * P;
  g.drawImage(lbuf, Math.round(cx - dw / 2), Math.round(cy + bob - by * P), dw, dh);
  g.imageSmoothingEnabled = prev;
}
