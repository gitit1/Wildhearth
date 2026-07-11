import { HOUSE, BARN, STALL, type Rect } from "../world/zones";
import { shadow, oRect, outline, OUTLINE, OUTLINE_W, castShadow, roundR } from "./shapes";
import { mulberry32 } from "../engine/rng";
import { sprite, drawGroundSprite, spriteBaseAnchor, recolorSprite, type SpritePlacement, type HueBand } from "./sprites";
import {
  SPRITE_HOUSE_SCALE, SPRITE_BARN_SCALE, SPRITE_STALL_SCALE, SPRITE_WELL_SCALE, SPRITE_COTTAGE_SCALE,
  SPRITE_OUTHOUSE_SCALE,
} from "../config";

// ---- static-sprite sheet anchors (measured alpha bbox: horizontal centre col
// + foot row = the ground-contact base). The sheets were sized to the HOUSE /
// BARN rects, so at scale 1.0 the walls fill the rect with the roof overhanging
// above it, exactly as the painter overhangs today. Re-measured for the
// building-variety batch's flat-front replacements (docs/PIXELLAB_ASSETS.md). ---
const FARMHOUSE_SHEET = { cx: 95.5, foot: 167 };            // 192x176 — buildings/farmhouse (player farm)
// The neighbour's OWN farmhouse art (established/prosperous whitewash+slate
// variant) — same canvas size, different silhouette, so its own anchor.
const FARMHOUSE_NEIGHBOR_SHEET = { cx: 95.5, foot: 161 };   // 192x176 — buildings/farmhouse-neighbor
const BARN_SHEET = { cx: 103.5, foot: 167 };      // 208x176
const STALL_SHEET = { cx: 57.5, foot: 104 };      // 112x112 — buildings/market-stall (generic)
const WELL_SHEET = { cx: 39.5, foot: 87 };        // 80x96
// The stall sprite's own baked-in awning fabric (a candy red/cream stripe) —
// its hue band, measured from the generated PNG (see docs/PIXELLAB_ASSETS.md),
// recolored per stall via recolorSprite(); the alternating cream stripe sits
// outside this band (hue ~40-43°) so it's untouched, keeping the stripe
// pattern readable after the tint.
const STALL_AWNING_BAND: HueBand = { hueMin: 334, hueMax: 6, satMin: 0.34 };

/** sprite-pixel (sx,sy) -> world point, through a drawGroundSprite placement. */
function sw(p: SpritePlacement, sx: number, sy: number): [number, number] {
  return [p.dx + sx * p.scale, p.dy + sy * p.scale];
}

/** Vertical plank striping for wall faces: alternating tones, thin seams,
 *  the odd knot — deterministic per wall so it never shimmers. */
function drawPlankWall(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  base: string, seed: number,
) {
  const rnd = mulberry32(seed);
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  const plank = Math.max(9, w / Math.round(w / 12));
  for (let px = 0; px < w - 1; px += plank) {
    const t = rnd();
    if (t < 0.35) { g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(x + px, y, plank, h); }
    else if (t > 0.7) { g.fillStyle = "rgba(255,235,200,.06)"; g.fillRect(x + px, y, plank, h); }
    g.fillStyle = "rgba(60,38,18,.28)";
    g.fillRect(x + px, y, 1.4, h);                 // seam
    if (rnd() < 0.3) {                             // knot
      g.fillStyle = "rgba(70,45,20,.5)";
      g.beginPath(); g.ellipse(x + px + plank * 0.5, y + h * (0.2 + rnd() * 0.6), 1.6, 2.2, 0, 0, 7); g.fill();
    }
  }
  g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W;
  g.strokeRect(x, y, w, h);                        // the wall's contour
}

/** Shingled roof for a triangular gable: overlapping rows, per-shingle tone
 *  jitter; weathered roofs get patchy discolored/missing shingles. */
function drawShingleRoof(
  g: CanvasRenderingContext2D,
  apexX: number, apexY: number, leftX: number, rightX: number, baseY: number,
  base: string, weathered: boolean, seed: number,
) {
  const rnd = mulberry32(seed);
  g.save();
  g.beginPath();
  g.moveTo(leftX, baseY); g.lineTo(apexX, apexY); g.lineTo(rightX, baseY); g.closePath();
  g.fillStyle = base; g.fill();
  g.clip();
  const rows = 6, rowH = (baseY - apexY) / rows;
  for (let r = 0; r < rows; r++) {
    const ry = apexY + r * rowH;
    const shingleW = 11;
    const offset = (r % 2) * (shingleW / 2);
    for (let sx = leftX - shingleW; sx < rightX + shingleW; sx += shingleW) {
      const v = rnd();
      if (weathered && v < 0.07) {                 // a missing shingle: dark gap
        g.fillStyle = "rgba(30,16,10,.75)";
        g.fillRect(sx + offset, ry, shingleW - 1, rowH);
        continue;
      }
      const jitter = weathered ? (v - 0.5) * 0.22 : (v - 0.5) * 0.1;
      g.fillStyle = `rgba(${jitter > 0 ? "255,230,210" : "40,10,5"},${Math.abs(jitter)})`;
      g.fillRect(sx + offset, ry, shingleW - 1, rowH - 1);
    }
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(leftX, ry + rowH); g.lineTo(rightX, ry + rowH); g.stroke();
  }
  g.restore();
  // the gable's contour (outside the clip so it stays crisp)
  g.beginPath();
  g.moveTo(leftX, baseY); g.lineTo(apexX, apexY); g.lineTo(rightX, baseY); g.closePath();
  g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W; g.stroke();
}

export function drawHouse(
  g: CanvasRenderingContext2D, roofOk = true, windowOk = true, r: Rect = HOUSE,
  spriteId = "buildings/farmhouse",
) {
  const { x, y, w, h } = r;
  // ---- sprite path: the repaired farmhouse, base-on-ground, centred on the
  // rect (collision/door hotspots unchanged); the renovation DAMAGE overlays
  // draw on top of the sprite when a part is broken. `spriteId` lets a caller
  // swap in a DIFFERENT farmhouse sprite at the same rect (the neighbour farm's
  // own established/prosperous look, building-variety batch) without touching
  // the damage-overlay logic, which only ever runs for the player's own
  // (always-repaired-art) house anyway. ----
  const img = sprite(spriteId);
  if (img) {
    const gx = x + w / 2, gy = y + h;
    castShadow(g, gx, gy, w * 0.5, h * 1.3);   // keep the cast shadow; the sprite carries its own outline
    const anchor = spriteId === "buildings/farmhouse" ? FARMHOUSE_SHEET : FARMHOUSE_NEIGHBOR_SHEET;
    const p = drawGroundSprite(g, img, gx, gy, anchor.cx, anchor.foot, SPRITE_HOUSE_SCALE);
    if (!roofOk) drawHouseRoofDamageSprite(g, p);      // renovation overlays land on the sprite's roof / window
    if (!windowOk) drawHouseWindowBoardSprite(g, p);
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  castShadow(g, x + w / 2, y + h, w * 0.5, h * 1.3);
  shadow(g, x + w / 2 + 8, y + h + 8, w * 0.55, 12);
  drawPlankWall(g, x, y + h * 0.35, w, h * 0.65, "#c9a06a", 101);
  oRect(g, x + w * 0.44, y + h * 0.55, w * 0.13, h * 0.45, "#7a5230");
  g.fillStyle = "#5d3e22"; g.fillRect(x + w * 0.44, y + h * 0.55, w * 0.13, 4);
  g.fillStyle = "#e8c46a"; g.beginPath(); g.arc(x + w * 0.54, y + h * 0.8, 2.4, 0, 7); g.fill();
  for (const wx of [x + w * 0.14, x + w * 0.72]) {
    g.fillStyle = "#8fd0e8"; g.fillRect(wx, y + h * 0.52, w * 0.15, h * 0.22);
    g.strokeStyle = "#6b4a2b"; g.lineWidth = 3; g.strokeRect(wx, y + h * 0.52, w * 0.15, h * 0.22);
    g.beginPath(); g.moveTo(wx + w * 0.075, y + h * 0.52); g.lineTo(wx + w * 0.075, y + h * 0.74); g.stroke();
  }
  // the roof: neat shingles when repaired, patchy weathered ones when not
  drawShingleRoof(g, x + w / 2, y - h * 0.28, x - 10, x + w + 10, y + h * 0.38,
    "#a8433a", !roofOk, 202);
  oRect(g, x + w * 0.72, y - h * 0.16, w * 0.09, h * 0.3, "#8c8c94");
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

export function drawBarn(g: CanvasRenderingContext2D, barnOk = true, r: Rect = BARN) {
  const { x, y, w, h } = r;
  // ---- sprite path: the repaired barn; damage overlays on top when broken ----
  const img = sprite("buildings/barn");
  if (img) {
    const gx = x + w / 2, gy = y + h;
    castShadow(g, gx, gy, w * 0.5, h * 1.2);
    const p = drawGroundSprite(g, img, gx, gy, BARN_SHEET.cx, BARN_SHEET.foot, SPRITE_BARN_SCALE);
    if (!barnOk) drawBarnDamageSprite(g, p);
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  castShadow(g, x + w / 2, y + h, w * 0.5, h * 1.2);
  shadow(g, x + w / 2 + 6, y + h + 7, w * 0.55, 10);
  drawPlankWall(g, x, y + h * 0.3, w, h * 0.7, "#b24a3e", 303);
  // the barn roof shares the shingle treatment (weathered until mended)
  drawShingleRoof(g, x + w / 2, y - h * 0.18, x - 8, x + w + 8, y + h * 0.34,
    "#8a3830", !barnOk, 404);
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

// ===========================================================================
//  Renovation DAMAGE overlays for the SPRITE path — the sprites are the
//  repaired buildings, so a broken part gets its code-drawn damage painted on
//  top, positioned in the SPRITE's own pixel space (measured/re-tuned for the
//  building-variety batch's flat-front farmhouse/barn, verified against a
//  rundown-state screenshot: farmhouse roof spans y≈9-100 with its ridge/
//  chimney near the horizontal centre, so the hole sits left-of-centre at
//  roughly (60-92, 40-63); its right window ≈(111-148, 110-143); barn doors
//  centre ≈(104,116), right wall gap ≈(178,76) — both barn numbers verified
//  unchanged against the new barn-flat art, same canvas size and proportions).
//  Tuned to sit on the sprite features, independent of the painter geometry the
//  fallback overlays used. `sw()` maps sprite pixels -> world through the
//  drawGroundSprite placement. Only ever invoked for the PLAYER's farmhouse/
//  barn (the neighbour's are always drawn roofOk/windowOk/barnOk=true).
// ===========================================================================

/** Broken roof: a torn dark hole in the tiles + a mismatched patch plank. */
function drawHouseRoofDamageSprite(g: CanvasRenderingContext2D, p: SpritePlacement) {
  const s = p.scale;
  g.fillStyle = "#241207";
  const poly: Array<[number, number]> = [[62, 45], [83, 40], [92, 54], [73, 63], [60, 56]];
  g.beginPath();
  poly.forEach(([sx, sy], i) => { const [wx, wy] = sw(p, sx, sy); i ? g.lineTo(wx, wy) : g.moveTo(wx, wy); });
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(18,9,4,.7)"; g.lineWidth = 1.6; g.stroke();   // the hole's own dark rim
  // a mismatched patch plank hastily nailed over part of it
  const [cx, cy] = sw(p, 76, 51);
  g.save(); g.translate(cx, cy); g.rotate(-0.32);
  const pw = 30 * s, ph = 8 * s;
  g.fillStyle = "#a6844f"; roundR(g, -pw / 2, -ph / 2, pw, ph, 1.5 * s); g.fill();
  g.strokeStyle = "rgba(58,40,18,.65)"; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = "#3a2c18";   // two nail heads
  g.beginPath(); g.arc(-pw / 2 + 3 * s, 0, 1.1 * s, 0, 7); g.arc(pw / 2 - 3 * s, 0, 1.1 * s, 0, 7); g.fill();
  g.restore();
}

/** Boarded-shut window: brown boards over the right pane + an X of planks. */
function drawHouseWindowBoardSprite(g: CanvasRenderingContext2D, p: SpritePlacement) {
  const [x0, y0] = sw(p, 111, 110);
  const [x1, y1] = sw(p, 148, 143);
  const bw = x1 - x0, bh = y1 - y0;
  g.fillStyle = "#4a3a26"; g.fillRect(x0, y0, bw, bh);
  g.strokeStyle = "rgba(28,18,9,.6)"; g.lineWidth = 1.4; g.strokeRect(x0, y0, bw, bh);
  g.strokeStyle = "#8a6a42"; g.lineWidth = 4.5 * p.scale; g.lineCap = "round";
  g.beginPath(); g.moveTo(x0 - 2, y0 + 2); g.lineTo(x1 + 2, y1 - 2); g.stroke();
  g.beginPath(); g.moveTo(x1 + 2, y0 + 2); g.lineTo(x0 - 2, y1 - 2); g.stroke();
}

/** Broken barn: a loose plank hung across the doors + a missing wall plank. */
function drawBarnDamageSprite(g: CanvasRenderingContext2D, p: SpritePlacement) {
  const s = p.scale;
  const [cx, cy] = sw(p, 104, 116);
  g.save(); g.translate(cx, cy); g.rotate(0.42);
  const pw = 96 * s, ph = 9 * s;
  g.fillStyle = "#8a6a42"; roundR(g, -pw / 2, -ph / 2, pw, ph, 1.5 * s); g.fill();
  g.strokeStyle = "rgba(48,32,15,.62)"; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = "#3a2c18";
  g.beginPath(); g.arc(-pw / 2 + 4 * s, 0, 1.2 * s, 0, 7); g.arc(pw / 2 - 4 * s, 0, 1.2 * s, 0, 7); g.fill();
  g.restore();
  // a missing wall plank: a dark vertical gap on the right red wall
  const [gx, gy] = sw(p, 178, 76);
  g.fillStyle = "#2a1510"; g.fillRect(gx, gy, 11 * s, 54 * s);
  g.strokeStyle = "rgba(14,7,4,.7)"; g.lineWidth = 1.2; g.strokeRect(gx, gy, 11 * s, 54 * s);
}

export type StallSign = "fish" | "produce" | "goods" | "empty";

interface StallThemeSprite { id: string; cx: number; foot: number }
/**
 * The 4 market stalls each get their OWN themed sprite (building-variety
 * batch) — no more recolor, the art itself carries the theme (teal fish
 * stall, green produce, mustard goods, a shuttered/blank-placard empty). The
 * single generic sprite + recolor machinery below (STALL_SHEET/STALL_AWNING_BAND)
 * stays live as the code path for the farm's OWN stall (its awning/sign are
 * driven by the player's chosen selling path, so it can't commit to one
 * theme's art) and for any FUTURE stall (v2 town) that doesn't have its own
 * themed art yet — see docs/PIXELLAB_ASSETS.md for the picks + spares.
 */
const STALL_THEMES: Record<StallSign, StallThemeSprite> = {
  fish:    { id: "buildings/stall-fish",    cx: 55,   foot: 105 },
  produce: { id: "buildings/stall-produce", cx: 54.5, foot: 99 },
  goods:   { id: "buildings/stall-goods",   cx: 55,   foot: 99 },
  empty:   { id: "buildings/stall-empty",   cx: 56.5, foot: 89 },
};

/** The market/farm stall. Awning colour + goods vary by stall so the four
 *  market stalls read distinct (fish buyer / produce / general / empty).
 *  `themed`: use this stall's OWN dedicated sprite (STALL_THEMES) instead of
 *  the generic recolored one — set by the market stalls, left off for the
 *  farm's own stall (see STALL_THEMES doc above). */
export function drawStall(
  g: CanvasRenderingContext2D, t: number, r: Rect = STALL,
  awning = "#c05038", accent = "#7fb0c8", sign: StallSign = "fish", themed = false,
  themeId?: string,
) {
  const { x, y, w, h } = r;
  if (themed) {
    // `themeId` (v2 town merchants) points at a DISTINCT banked spare-stall
    // sprite so a town merchant never duplicates one of the four market stalls;
    // its base-on-ground anchor is measured off the alpha bbox (like cottages
    // 6/8). Otherwise use this sign's own themed market sprite (hand-anchored).
    const theme: { id: string; cx?: number; foot?: number } = themeId ? { id: themeId } : STALL_THEMES[sign];
    const timg = sprite(theme.id);
    if (timg) {
      const gx = x + w / 2, gy = y + h;
      const a = theme.cx !== undefined && theme.foot !== undefined
        ? { cx: theme.cx, foot: theme.foot } : spriteBaseAnchor(theme.id, timg);
      castShadow(g, gx, gy, w * 0.5, h * 0.9);
      drawGroundSprite(g, timg, gx, gy, a.cx, a.foot, SPRITE_STALL_SCALE);
      drawStallGoods(g, r, accent, sign);
      return;
    }
    // this stall's themed sprite hasn't decoded yet (or is missing) -> fall
    // through to the generic sprite/painter below, same as any other dual-path
  }
  // ---- sprite path: the stall's base+roof, its awning fabric hue-shifted to
  // THIS stall's own awning colour (recolorSprite, cached per colour — see
  // STALL_AWNING_BAND above); goods stay code-drawn on top, unchanged — the
  // per-stall identity feature the (generic) sprite shelf art doesn't encode.
  // The code painter below (counter/posts/striped awning/goods) is the
  // fallback. Sign/goods interactions unchanged (keyed to the stall's rect). ----
  const img = sprite("buildings/market-stall");
  if (img) {
    const gx = x + w / 2, gy = y + h;
    castShadow(g, gx, gy, w * 0.5, h * 0.9);
    const tinted = recolorSprite("buildings/market-stall", img, awning, STALL_AWNING_BAND);
    drawGroundSprite(g, tinted ?? img, gx, gy, STALL_SHEET.cx, STALL_SHEET.foot, SPRITE_STALL_SCALE);
    drawStallGoods(g, r, accent, sign);
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  castShadow(g, x + w / 2, y + h, w * 0.5, h * 0.9);
  shadow(g, x + w / 2 + 4, y + h + 6, w * 0.55, 8);
  // counter
  oRect(g, x, y + h * 0.45, w, h * 0.55, "#9a7245");
  g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(x, y + h * 0.45, w, 4);
  // legs
  g.fillStyle = "#6f5334";
  g.fillRect(x + 3, y + h * 0.45, 5, h * 0.6);
  g.fillRect(x + w - 8, y + h * 0.45, 5, h * 0.6);
  // awning posts
  g.fillRect(x + 1, y - h * 0.35, 4, h * 0.8);
  g.fillRect(x + w - 5, y - h * 0.35, 4, h * 0.8);
  // striped awning with a soft flutter
  const fl = Math.sin(t * 2.2 + x) * 1.5;
  const stripes = 5, sw = (w + 12) / stripes;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? "#e8ddca" : awning;
    g.beginPath();
    g.moveTo(x - 6 + i * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.4);
    g.lineTo(x - 6 + (i + 1) * sw, y - h * 0.05 + fl);
    g.lineTo(x - 6 + i * sw, y - h * 0.05 + fl);
    g.closePath(); g.fill();
  }
  // the awning's contour as one shape
  g.strokeStyle = OUTLINE; g.lineWidth = OUTLINE_W;
  g.strokeRect(x - 6, y - h * 0.4, w + 12, h * 0.35 + fl);
  drawStallGoods(g, r, accent, sign);
}

/** Goods on the counter — a little different per stall type (fish buyer /
 *  produce / general / empty). A code-drawn overlay on BOTH the sprite and
 *  fallback paths: the per-stall differentiator the sprite's own (generic)
 *  shelf art doesn't encode. */
function drawStallGoods(g: CanvasRenderingContext2D, r: Rect, accent: string, sign: StallSign) {
  const { x, y, w, h } = r;
  if (sign === "fish") {
    g.fillStyle = "#b08a58"; g.fillRect(x + w * 0.2, y + h * 0.3, w * 0.28, h * 0.2);
    g.fillStyle = accent;
    g.beginPath(); g.ellipse(x + w * 0.34, y + h * 0.38, 6, 2.6, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x + w * 0.28, y + h * 0.36, 6, 2.6, -0.2, 0, 7); g.fill();
  } else if (sign === "produce") {
    g.fillStyle = "#8a6a42"; g.fillRect(x + w * 0.18, y + h * 0.34, w * 0.3, h * 0.18);
    for (const [dx, c] of [[0.24, accent], [0.34, "#c94f3a"], [0.44, "#5f9a38"]] as const) {
      g.fillStyle = c; g.beginPath(); g.arc(x + w * dx, y + h * 0.36, 3, 0, 7); g.fill();
    }
  } else if (sign === "goods") {
    g.fillStyle = accent; g.fillRect(x + w * 0.2, y + h * 0.28, w * 0.22, h * 0.22);
    g.strokeStyle = "rgba(60,40,20,.5)"; g.lineWidth = 1.2;
    g.strokeRect(x + w * 0.2, y + h * 0.28, w * 0.22, h * 0.22);
    g.fillStyle = "#9a7245"; g.beginPath();
    g.ellipse(x + w * 0.6, y + h * 0.4, 5, 4, 0, 0, 7); g.fill();
  } else {
    // empty / available: a small "vacant" placard, no goods
    g.fillStyle = "#d9cfb4"; g.fillRect(x + w * 0.36, y + h * 0.26, w * 0.28, h * 0.16);
    g.strokeStyle = "rgba(60,40,20,.45)"; g.lineWidth = 1;
    g.strokeRect(x + w * 0.36, y + h * 0.26, w * 0.28, h * 0.16);
    g.fillStyle = "rgba(90,70,40,.6)";
    g.fillRect(x + w * 0.4, y + h * 0.32, w * 0.2, 1.6);
  }
}

interface CottageSpriteInfo { id: string; cx?: number; foot?: number }
/**
 * The market cottages each get a DIFFERENT variant so no two neighbours share a
 * sprite (building-variety batch — see docs/PIXELLAB_ASSETS.md). Variants 1-5,7
 * carry hand-measured anchors; variants 6 & 8 (R4: wired in from
 * buildings/spare/) omit theirs and let spriteBaseAnchor measure the alpha bbox
 * at draw time (same base-on-ground result, no manual measuring pass).
 */
const COTTAGE_SPRITES: Record<number, CottageSpriteInfo> = {
  1: { id: "buildings/cottage-01_thatch-plank-porch", cx: 55.5, foot: 114 },
  2: { id: "buildings/cottage-02_slate-plaster-ivy", cx: 56.5, foot: 116 },
  3: { id: "buildings/cottage-03_redtile-stone-flowerbox", cx: 53.5, foot: 96 },
  4: { id: "buildings/cottage-04_shingle-timber-leanto", cx: 55.5, foot: 119 },
  5: { id: "buildings/cottage-05_thatch-plaster-flowerbox", cx: 55, foot: 107 },
  6: { id: "buildings/spare/cottage-06_slate-stone-porch" },
  7: { id: "buildings/cottage-07_redtile-timber-ivy", cx: 56.5, foot: 121 },
  8: { id: "buildings/spare/cottage-08_shingle-plank-leanto" },
};

/** A small cottage — a compact house variant for the market's NPC homes.
 *  Warm plaster wall, shingle gable, a plank door (a would-be entry point).
 *  `variant` (1-8, see COTTAGE_SPRITES) picks this cottage's own sprite; the
 *  code painter below (random wall/roof tone keyed off `seed`) is the
 *  fallback, used as-is when no variant is given or its sprite isn't ready. */
export function drawCottage(g: CanvasRenderingContext2D, r: Rect, seed: number, variant?: number) {
  const { x, y, w, h } = r;
  const info = variant !== undefined ? COTTAGE_SPRITES[variant] : undefined;
  const img = info ? sprite(info.id) : null;
  if (img && info) {
    const gx = x + w / 2, gy = y + h;
    castShadow(g, gx, gy, w * 0.5, h * 1.2);
    // anchor: hand-measured when present, else measured off the alpha bbox
    const a = info.cx !== undefined && info.foot !== undefined
      ? { cx: info.cx, foot: info.foot } : spriteBaseAnchor(info.id, img);
    // subtle anti-repetition (R4): a deterministic per-cottage mirror so even
    // two same-variant cottages wouldn't read as stamped clones. Cottages carry
    // no signage/text, so a horizontal flip is tasteful. Shadow drawn above the
    // flip, so it stays put.
    const flip = mulberry32((seed ^ 0x9e3779b1) >>> 0)() < 0.5;
    if (flip) {
      g.save();
      g.translate(gx, 0); g.scale(-1, 1); g.translate(-gx, 0);
      drawGroundSprite(g, img, gx, gy, a.cx, a.foot, SPRITE_COTTAGE_SCALE);
      g.restore();
    } else {
      drawGroundSprite(g, img, gx, gy, a.cx, a.foot, SPRITE_COTTAGE_SCALE);
    }
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  const rnd = mulberry32(seed);
  const wall = ["#d8b483", "#cca878", "#c9b98f", "#d3a06e"][(rnd() * 4) | 0]!;
  castShadow(g, x + w / 2, y + h, w * 0.5, h * 1.2);
  shadow(g, x + w / 2 + 6, y + h + 7, w * 0.55, 10);
  drawPlankWall(g, x, y + h * 0.36, w, h * 0.64, wall, (seed * 7) | 0);
  // door
  oRect(g, x + w * 0.4, y + h * 0.58, w * 0.2, h * 0.42, "#7a5230");
  g.fillStyle = "#e8c46a"; g.beginPath(); g.arc(x + w * 0.55, y + h * 0.8, 2, 0, 7); g.fill();
  // one small window
  g.fillStyle = "#8fd0e8"; g.fillRect(x + w * 0.15, y + h * 0.56, w * 0.16, h * 0.2);
  g.strokeStyle = "#6b4a2b"; g.lineWidth = 2.5; g.strokeRect(x + w * 0.15, y + h * 0.56, w * 0.16, h * 0.2);
  // roof
  const roof = ["#8a5a4a", "#7a6a52", "#9a6a54"][(rnd() * 3) | 0]!;
  drawShingleRoof(g, x + w / 2, y - h * 0.18, x - 7, x + w + 7, y + h * 0.4, roof, false, (seed * 13) | 0);
  // a little chimney
  oRect(g, x + w * 0.68, y - h * 0.1, w * 0.1, h * 0.28, "#8c8c94");
}

/** The town inn (v2 BLOCK #3) — the coastal town's largest building. A two-
 *  storey timber-framed hall with a warm-lit lower row of windows, a broad
 *  gable roof, a chimney, and a hanging "INN" sign on a bracket. Code-drawn
 *  (no sprite yet — a dedicated PixelLab inn is a logged follow-up), so it
 *  always renders and always reads distinct from every cottage. */
export function drawInn(g: CanvasRenderingContext2D, r: Rect) {
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  castShadow(g, cx, y + h, w * 0.5, h * 1.1);
  shadow(g, cx + 8, y + h + 8, w * 0.6, 12);
  // two-storey plaster-and-timber wall, rising above r.y for the upper storey
  const wallTop = y - h * 0.35, wallH = h * 1.35;
  drawPlankWall(g, x, wallTop, w, wallH, "#d9c7a2", 4241);
  // a timber band separating the two storeys
  g.fillStyle = "#6b4a2b";
  g.fillRect(x, y + h * 0.28, w, h * 0.08);
  // corner + centre timber posts
  for (const px of [x + 2, cx - 3, x + w - 5]) g.fillRect(px, wallTop, 4, wallH);
  // upper-storey windows (dark, small) + lower-storey warm-lit windows
  for (let i = 0; i < 3; i++) {
    const wx = x + w * (0.2 + i * 0.3);
    g.fillStyle = "#5a708a"; g.fillRect(wx - w * 0.06, y - h * 0.16, w * 0.12, h * 0.18);
    g.strokeStyle = "#4a3320"; g.lineWidth = 2; g.strokeRect(wx - w * 0.06, y - h * 0.16, w * 0.12, h * 0.18);
  }
  for (const i of [0, 2]) {
    const wx = x + w * (0.22 + i * 0.28);
    g.fillStyle = "#f0d488"; g.fillRect(wx - w * 0.055, y + h * 0.5, w * 0.11, h * 0.26);
    g.strokeStyle = "#4a3320"; g.lineWidth = 2; g.strokeRect(wx - w * 0.055, y + h * 0.5, w * 0.11, h * 0.26);
  }
  // central double door
  oRect(g, cx - w * 0.09, y + h * 0.46, w * 0.18, h * 0.54, "#6f4a28");
  g.strokeStyle = "#3a2614"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, y + h * 0.46); g.lineTo(cx, y + h); g.stroke();
  g.fillStyle = "#e8c46a"; g.beginPath(); g.arc(cx - w * 0.02, y + h * 0.76, 2, 0, 7); g.fill();
  // broad gable shingle roof
  drawShingleRoof(g, cx, wallTop - h * 0.5, x - 10, x + w + 10, wallTop + h * 0.16, "#8a4a3a", false, 913);
  // chimney with a wisp
  oRect(g, x + w * 0.78, wallTop - h * 0.28, w * 0.09, h * 0.34, "#8c8c94");
  // hanging INN sign on a bracket off the left face
  g.strokeStyle = "#4a3320"; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(x - 2, y + h * 0.14); g.lineTo(x - 16, y + h * 0.14); g.stroke();
  g.fillStyle = "#caa35a"; g.fillRect(x - 22, y + h * 0.16, 20, 16);
  g.strokeStyle = "#4a3320"; g.lineWidth = 1.5; g.strokeRect(x - 22, y + h * 0.16, 20, 16);
  g.fillStyle = "#3a2614"; g.font = "bold 9px serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("INN", x - 12, y + h * 0.16 + 8);
  g.textAlign = "start"; g.textBaseline = "alphabetic";
}

/** The town STABLE (v2 BLOCK #5 — the transport vendor). A low, broad timber
 *  stable: two dark open stall bays with a horse's head peering from one, a
 *  hanging horseshoe sign, and a rail-fenced paddock strip to the right. Code-
 *  drawn (a dedicated PixelLab sprite is a logged wanted follow-up); reads
 *  distinct from the inn/homes so no town building repeats. */
export function drawStable(g: CanvasRenderingContext2D, r: Rect) {
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  castShadow(g, cx, y + h, w * 0.5, h * 1.05);
  shadow(g, cx + 7, y + h + 7, w * 0.58, 11);
  // weathered plank body
  const wallTop = y - h * 0.06, wallH = h * 1.06;
  drawPlankWall(g, x, wallTop, w, wallH, "#a9713c", 6217);
  // corner posts
  g.fillStyle = "#5d3c1f";
  for (const px of [x + 1, x + w - 5]) g.fillRect(px, wallTop, 4, wallH);
  // two dark stall bays (open doorways), a low rail across their fronts
  const bayY = y + h * 0.28, bayH = h * 0.62;
  for (let i = 0; i < 2; i++) {
    const bx = x + w * (0.1 + i * 0.46), bw = w * 0.34;
    oRect(g, bx, bayY, bw, bayH, "#2b1c11");
    // half-door rail
    g.strokeStyle = "#6b4a28"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(bx, bayY + bayH * 0.52); g.lineTo(bx + bw, bayY + bayH * 0.52); g.stroke();
  }
  // a horse's head peering from the left bay (warm brown muzzle + dark eye + mane)
  const hx = x + w * 0.19, hy = bayY + bayH * 0.34;
  g.fillStyle = "#7a4f2c";
  g.beginPath(); g.ellipse(hx, hy, w * 0.07, h * 0.16, -0.18, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#3a2412";                              // mane
  g.beginPath(); g.ellipse(hx - w * 0.05, hy - h * 0.08, w * 0.035, h * 0.11, -0.2, 0, 7); g.fill();
  g.fillStyle = "#1a0f07";                              // eye
  g.beginPath(); g.arc(hx + w * 0.01, hy - h * 0.03, 1.6, 0, 7); g.fill();
  g.fillStyle = "#5d3c1f";                              // ear
  g.beginPath(); g.moveTo(hx - w * 0.02, hy - h * 0.14); g.lineTo(hx + w * 0.02, hy - h * 0.2); g.lineTo(hx + w * 0.04, hy - h * 0.11); g.closePath(); g.fill();
  // broad low gable shingle roof
  drawShingleRoof(g, cx, wallTop - h * 0.42, x - 9, x + w + 9, wallTop + h * 0.14, "#6b4326", false, 6218);
  // hanging horseshoe sign off the left face
  g.strokeStyle = "#4a3320"; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(x - 2, y + h * 0.1); g.lineTo(x - 15, y + h * 0.1); g.stroke();
  g.fillStyle = "#caa35a"; g.fillRect(x - 21, y + h * 0.12, 18, 16);
  g.strokeStyle = "#4a3320"; g.lineWidth = 1.5; g.strokeRect(x - 21, y + h * 0.12, 18, 16);
  g.strokeStyle = "#3a2614"; g.lineWidth = 2;           // a horseshoe glyph
  g.beginPath(); g.arc(x - 12, y + h * 0.12 + 9, 5, Math.PI * 0.15, Math.PI * 0.85, false); g.stroke();
  // paddock rail strip along the right side (a couple of posts + two rails)
  const px0 = x + w + 4, px1 = x + w + 22, ry0 = y + h * 0.5;
  g.strokeStyle = "#6b4a28"; g.lineWidth = 3;
  for (const py of [ry0, ry0 + 9]) { g.beginPath(); g.moveTo(px0, py); g.lineTo(px1, py); g.stroke(); }
  g.fillStyle = "#5d3c1f";
  for (const pp of [px0, px1]) g.fillRect(pp - 1.5, ry0 - 4, 3, 18);
}

/** A rickety wooden outhouse (Needs engine): weathered planks, a mono-pitch
 *  shingle roof, and a door with the classic crescent-moon cutout. Tasteful
 *  and small — the farm's bathroom spot before any plumbing exists. */
export function drawOuthouse(g: CanvasRenderingContext2D, r: Rect) {
  const { x, y, w, h } = r;
  // ---- sprite path: the built privy, base-on-ground at the rect's bottom
  // edge (roof overhangs above), measured alpha-bbox anchor; the code painter
  // below is the fallback. The `outhouseSpot` interaction is keyed to the
  // OUTHOUSE rect, not this painter — unchanged. ----
  const img = sprite("buildings/outhouse");
  if (img) {
    const a = spriteBaseAnchor("buildings/outhouse", img);
    castShadow(g, x + w / 2, y + h, w * 0.45, h);
    shadow(g, x + w / 2 + 4, y + h + 5, w * 0.5, 7);
    drawGroundSprite(g, img, x + w / 2, y + h, a.cx, a.foot, SPRITE_OUTHOUSE_SCALE);
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  castShadow(g, x + w / 2, y + h, w * 0.45, h);
  shadow(g, x + w / 2 + 4, y + h + 5, w * 0.5, 7);
  // slightly leaning body (it IS rickety)
  g.save();
  g.translate(x + w / 2, y + h);
  g.rotate(0.015);
  g.translate(-(x + w / 2), -(y + h));
  drawPlankWall(g, x, y + h * 0.16, w, h * 0.84, "#8a6a42", 515);
  // door: a darker recessed panel with the crescent moon
  oRect(g, x + w * 0.22, y + h * 0.3, w * 0.56, h * 0.62, "#6b4e30");
  g.fillStyle = "#e9dcb0";
  g.beginPath(); g.arc(x + w * 0.5, y + h * 0.44, w * 0.13, 0.4, Math.PI * 1.6); g.fill();
  g.fillStyle = "#6b4e30";
  g.beginPath(); g.arc(x + w * 0.56, y + h * 0.44, w * 0.11, 0.4, Math.PI * 1.6); g.fill();
  // door latch
  g.fillStyle = "#3d2c18";
  g.beginPath(); g.arc(x + w * 0.7, y + h * 0.64, 1.6, 0, 7); g.fill();
  g.restore();
  // mono-pitch roof, a plank tilted over the top (drawn upright, over the lean)
  g.save();
  g.fillStyle = "#5d4630";
  g.beginPath();
  g.moveTo(x - 3, y + h * 0.2);
  g.lineTo(x + w + 3, y + h * 0.08);
  g.lineTo(x + w + 3, y + h * 0.2);
  g.lineTo(x - 3, y + h * 0.32);
  g.closePath(); g.fill(); outline(g);
  g.restore();
}

/** The market square's stone well: a round wall, a little peaked roof on posts,
 *  a rope and bucket. Purely decorative. */
export function drawWell(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  // ---- sprite path: the built well, base-on-ground at the circle's bottom
  // edge; the code painter below is the fallback. Drink interaction unchanged
  // (keyed to WELL's cx/cy/r, not to this painter). ----
  const img = sprite("buildings/well");
  if (img) {
    castShadow(g, cx, cy + r * 0.6, r * 0.9, r * 2.2);
    drawGroundSprite(g, img, cx, cy + r, WELL_SHEET.cx, WELL_SHEET.foot, SPRITE_WELL_SCALE);
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  castShadow(g, cx, cy + r * 0.6, r * 0.9, r * 2.2);
  shadow(g, cx + 4, cy + r + 4, r * 1.1, r * 0.4);
  // stone rim
  g.fillStyle = "#9a938a";
  g.beginPath(); g.ellipse(cx, cy, r, r * 0.7, 0, 0, 7); g.fill(); outline(g);
  g.fillStyle = "#7a7268";
  g.beginPath(); g.ellipse(cx, cy, r * 0.72, r * 0.5, 0, 0, 7); g.fill();
  g.fillStyle = "#2a3a42";
  g.beginPath(); g.ellipse(cx, cy, r * 0.5, r * 0.34, 0, 0, 7); g.fill();
  // stone courses on the rim front
  g.strokeStyle = "rgba(40,36,30,.4)"; g.lineWidth = 1;
  for (let a = -0.9; a < 0.9; a += 0.45) {
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.6);
    g.lineTo(cx + Math.cos(a) * r * 0.9, cy + r * 0.5); g.stroke();
  }
  // two posts + a peaked roof
  g.fillStyle = "#6f5334";
  g.fillRect(cx - r * 0.9, cy - r * 1.7, 4, r * 1.7);
  g.fillRect(cx + r * 0.9 - 4, cy - r * 1.7, 4, r * 1.7);
  g.fillStyle = "#8a5a4a";
  g.beginPath();
  g.moveTo(cx - r * 1.15, cy - r * 1.5); g.lineTo(cx, cy - r * 2.2);
  g.lineTo(cx + r * 1.15, cy - r * 1.5); g.closePath(); g.fill(); outline(g);
  // rope + bucket
  g.strokeStyle = "#8a7a5a"; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(cx, cy - r * 1.5); g.lineTo(cx, cy - r * 0.2); g.stroke();
  oRect(g, cx - 3, cy - r * 0.2, 6, 6, "#7a5230");
}
