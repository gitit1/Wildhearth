import {
  T, SPRITE_TREE_SCALE, SPRITE_TREE_JITTER, SPRITE_CROP_SCALE, SPRITE_CROP_BASE_DY,
  SPRITE_BUSH_SCALE, SPRITE_BUSH_JITTER, SPRITE_PROP_SCALE, SPRITE_FENCE_SCALE,
} from "../config";
import { FIELD, POND, RIVER, LAKE, DOCK, FISH_SPOTS } from "../world/zones";
import { mulberry32 } from "../engine/rng";
import { shadow, outline, oRect, castShadow } from "./shapes";
import { sprite, drawGroundSprite, spriteBaseAnchor } from "./sprites";
import type { Season } from "../systems/calendar";
import type { CropGrowthShape } from "../data/crops";

/** Four tree species, assigned deterministically per tree position (seeded by
 *  its world coordinates, so the same tree is always the same species —
 *  reload-stable, no persistence needed). Fruitless visual variety only. */
export type TreeSpecies = "default" | "oak" | "pine" | "birch";

type RGB = readonly [number, number, number];

/**
 * A tree with a blob-clustered, three-tone canopy: a dark under-layer, the
 * mid-tone body, and sunlit top clusters — each tree slightly its own shade
 * (deterministic by position), now season + species aware (content-library
 * commit 1): spring blossom flecks on some deciduous trees, summer is the
 * original full 3-tone canopy, autumn shifts warm with the odd thinned/patchy
 * canopy, winter goes bare (a drawn branch skeleton + a pale frost dusting) —
 * except pine, which stays a year-round evergreen. Species (round oak-ish,
 * tall pine-ish, slim pale-trunked birch-ish, and the original default) are
 * picked once per tree from the SAME position-seeded rng already used for the
 * per-tree hue variation, so a reload always draws the same tree the same way.
 * Called fresh every frame from main.ts's depth-sorted ents (never baked into
 * the ground canvas), so a season change shows immediately, live.
 */
export function drawTree(g: CanvasRenderingContext2D, x: number, y: number, t: number, season: Season = "summer") {
  const rnd = mulberry32(((x * 31) ^ (y * 17)) | 0);
  const hueShift = (rnd() - 0.5) * 0.15;           // subtle per-tree variation
  const speciesRoll = rnd();
  const species: TreeSpecies =
    speciesRoll < 0.45 ? "default" : speciesRoll < 0.65 ? "oak" : speciesRoll < 0.85 ? "pine" : "birch";
  const blossomRoll = rnd();
  const patchyRoll = rnd();

  // ---- sprite path: the PixelLab tree PNGs are the primary look. Resolve the
  // (species, season) sprite; "default" maps to the oak art, pine uses its base
  // sprite except in winter. If the PNG is present + decoded, draw it with
  // per-tree flip/scale jitter (trunk base planted on the depth anchor) and
  // return; otherwise fall through to the code painter (zero-PNG fallback,
  // CLAUDE.md hard rule #1). ----
  const sid = treeSpriteId(species, season);
  const img = sprite(sid);
  if (img) { drawTreeSprite(g, img, x, y, species, sid); return; }

  castShadow(g, x, y, 14, 46);   // the canopy's own blob shadow, cast from the trunk's base
  shadow(g, x + 4, y + 6, 20, 8);

  // warm-shift toward autumn oranges before the per-tree hue variation is applied
  const warm = (base: RGB): RGB => {
    if (season !== "autumn") return base;
    const w = species === "birch" ? 0.6 : 0.4;     // birches read the most golden in autumn
    return [base[0] + (215 - base[0]) * w, base[1] + (140 - base[1]) * w * 0.5, base[2] + (40 - base[2]) * w];
  };
  const tone = (base: RGB) => {
    const [r, gg, b] = warm(base);
    return `rgb(${Math.round(r * (1 + hueShift))},${Math.round(gg * (1 + hueShift * 0.6))},${b})`;
  };

  const sway = Math.sin(t * 0.8 + x) * (species === "pine" ? 1.1 : 2);
  const sx = x + sway * 0.4;

  drawTrunk(g, x, y, species);

  if (species === "pine") { drawPineCanopy(g, sx, y, tone, season); return; }   // evergreen: never bare, never autumn-warm
  if (season === "winter") { drawBareBranches(g, sx, y, species); return; }
  drawDeciduousCanopy(g, sx, y, tone, species, season === "autumn" && patchyRoll < 0.2);
  if (season === "spring" && blossomRoll < (species === "birch" ? 0.3 : 0.5)) drawBlossoms(g, sx, y, rnd);
}

/** Resolve a tree's (species, season) to a sprite manifest id under trees/.
 *  "default" reuses the oak art (keeps the code species mix ~oak-heavy); pine is
 *  an evergreen so it uses one base sprite for spring/summer/autumn and a
 *  snow-dusted variant in winter. */
function treeSpriteId(species: TreeSpecies, season: Season): string {
  if (species === "pine") return season === "winter" ? "trees/pine-winter" : "trees/pine-base";
  const s = species === "default" ? "oak" : species;   // default -> oak art
  return `trees/${s}-${season}`;
}

// The trunk-base pixel in the 128x160 tree art (alpha-bbox column-density
// measurement): the trunk centre column + its bottom-contact row. This point is
// planted exactly on the tree's world (x,y) — the same spot the code trunk meets
// the ground — so depth-sort + collisions are unchanged. cx is uniform across
// the set (~63-64); pine-winter's snow base ends a few rows higher, so it keeps
// its own foot. Everything else shares the default.
const TREE_ANCHOR_DEFAULT = { cx: 64, foot: 151 } as const;
const TREE_ANCHOR: Partial<Record<string, { cx: number; foot: number }>> = {
  "trees/pine-winter": { cx: 64, foot: 144 },
};

/**
 * Draw a loaded tree sprite with its trunk base planted on world (x,y), at
 * SPRITE_TREE_SCALE, plus per-tree deterministic jitter (seeded from position,
 * independent of the fallback painter's rng) so a forest reads as individual
 * trees, not stamped clones: a ~50% horizontal FLIP, a uniform scale spread
 * (1 ± SPRITE_TREE_JITTER), and a small extra vertical stretch. The trunk base
 * stays anchored through every transform. Nearest-neighbour (crisp at any zoom);
 * a light contact shadow stands in for the sprite's (deliberately un-baked)
 * ground shadow.
 */
function drawTreeSprite(
  g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number,
  species: TreeSpecies, id: string,
) {
  const jr = mulberry32(((x * 13) ^ (y * 29)) | 0);   // own seed: never perturbs the fallback painter's rng
  const flip = jr() < 0.5;
  const s = SPRITE_TREE_SCALE * (1 - SPRITE_TREE_JITTER + jr() * SPRITE_TREE_JITTER * 2);   // uniform per-tree scale
  const vy = 0.97 + jr() * 0.06;                       // subtle vertical stretch (0.97..1.03)
  const a = TREE_ANCHOR[id] ?? TREE_ANCHOR_DEFAULT;
  // contact shadow (the sprites carry no baked shadow) — scaled to the trunk
  const shW = (species === "pine" ? 9 : 13) * (s / SPRITE_TREE_SCALE);
  castShadow(g, x, y, shW, shW * 3);
  shadow(g, x + 3, y + 5, shW * 1.3, shW * 0.5);
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.save();
  g.translate(x, y);
  g.scale(s * (flip ? -1 : 1), s * vy);
  // anchor (a.cx, a.foot) -> local origin, so the trunk base sits on (x,y)
  g.drawImage(img, -a.cx, -a.foot, img.naturalWidth, img.naturalHeight);
  g.restore();
  g.imageSmoothingEnabled = prev;
}

function drawTrunk(g: CanvasRenderingContext2D, x: number, y: number, species: TreeSpecies) {
  if (species === "birch") {
    oRect(g, x - 3, y - 14, 6, 20, "#d8d0c0");                    // pale bark
    g.strokeStyle = "rgba(40,32,24,.7)"; g.lineWidth = 1.2;
    for (const my of [y - 10, y - 4, y + 2]) { g.beginPath(); g.moveTo(x - 2, my); g.lineTo(x + 1.5, my); g.stroke(); }
  } else if (species === "pine") {
    oRect(g, x - 3.5, y - 12, 7, 18, "#5a4230");
  } else {
    oRect(g, x - 4, y - 14, 8, 20, species === "oak" ? "#5f4128" : "#6b4a2b");
    g.strokeStyle = "rgba(50,32,16,.6)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 1, y - 12); g.lineTo(x, y + 4); g.stroke();
  }
}

/** Per-species canopy cluster layouts: [dx, dy, r] triples for the under /
 *  mid / sunlit-top layers (same 3-tone technique, different silhouette). */
type Cluster = readonly [number, number, number];
const CANOPY_SHAPES: Record<Exclude<TreeSpecies, "pine">, { under: Cluster[]; mid: Cluster[]; top: Cluster[] }> = {
  default: {
    under: [[-11, -22, 14], [9, -21, 13], [0, -24, 15]],
    mid: [[-10, -28, 14], [10, -26, 12], [0, -38, 15], [-2, -30, 11]],
    top: [[-6, -40, 8], [6, -36, 7], [-12, -32, 6]],
  },
  oak: {
    under: [[-14, -20, 16], [12, -19, 15], [0, -23, 17], [-3, -16, 13]],
    mid: [[-13, -26, 16], [13, -25, 15], [0, -36, 17], [-4, -29, 13], [5, -19, 12]],
    top: [[-7, -38, 9], [8, -35, 8], [-14, -30, 7], [3, -30, 7]],
  },
  birch: {
    under: [[-6, -30, 9], [6, -29, 8], [0, -33, 10]],
    mid: [[-5, -36, 9], [5, -34, 8], [0, -42, 10]],
    top: [[-3, -46, 5], [4, -43, 5]],
  },
};

function drawDeciduousCanopy(
  g: CanvasRenderingContext2D, sx: number, y: number,
  tone: (base: RGB) => string, species: TreeSpecies, patchy: boolean,
) {
  const shape = CANOPY_SHAPES[species as Exclude<TreeSpecies, "pine">] ?? CANOPY_SHAPES.default;
  g.fillStyle = tone([46, 74, 28]);
  for (const [ox, oy, r] of shape.under) {
    g.beginPath(); g.arc(sx + ox, y + oy, r, 0, 7); g.fill(); outline(g);
  }
  g.fillStyle = tone([71, 115, 44]);
  // a patchy-autumn tree skips a mid cluster or two, thinning the silhouette
  for (const [i, [ox, oy, r]] of shape.mid.entries()) {
    if (patchy && i % 2 === 1) continue;
    g.beginPath(); g.arc(sx + ox, y + oy, r, 0, 7); g.fill(); outline(g);
  }
  if (patchy) return;   // a thinning tree drops its sunlit top clusters entirely
  g.fillStyle = tone([104, 152, 66]);
  for (const [ox, oy, r] of shape.top) {
    g.beginPath(); g.arc(sx + ox, y + oy, r, 0, 7); g.fill();
  }
  g.fillStyle = "rgba(255,255,220,.16)";
  g.beginPath(); g.arc(sx - 5, y - 42, 6, 0, 7); g.fill();
}

/** Pine/fir: a year-round evergreen, stacked conical layers narrowing upward.
 *  Never bare — winter just cools its tone slightly + a light snow dusting. */
function drawPineCanopy(g: CanvasRenderingContext2D, sx: number, y: number, tone: (base: RGB) => string, season: Season) {
  const cold = season === "winter";
  const layers: ReadonlyArray<readonly [number, number]> = [[26, 30], [-2, 26], [-26, 20]];
  g.fillStyle = tone(cold ? [26, 58, 34] : [34, 72, 40]);
  for (const [oy, hw] of layers) {
    g.beginPath();
    g.moveTo(sx, y + oy - 22);
    g.lineTo(sx - hw, y + oy);
    g.lineTo(sx + hw, y + oy);
    g.closePath(); g.fill(); outline(g);
  }
  g.fillStyle = tone(cold ? [46, 90, 52] : [58, 104, 58]);
  g.beginPath(); g.moveTo(sx, y - 58); g.lineTo(sx - 7, y - 40); g.lineTo(sx + 7, y - 40); g.closePath(); g.fill();
  if (cold) {
    g.fillStyle = "rgba(255,255,255,.55)";
    for (const [oy, hw] of layers) { g.beginPath(); g.ellipse(sx, y + oy, hw * 0.55, 2.6, 0, 0, 7); g.fill(); }
  }
}

/** Winter, deciduous species only: bare branch skeleton + a pale frost dusting
 *  along the upper twigs (no snow WEATHER exists yet — just bare + pale). */
function drawBareBranches(g: CanvasRenderingContext2D, sx: number, y: number, species: TreeSpecies) {
  const col = species === "birch" ? "#b8ae9a" : species === "oak" ? "#4a3624" : "#5a4230";
  g.strokeStyle = col; g.lineWidth = species === "oak" ? 2.6 : 2; g.lineCap = "round";
  const branches: ReadonlyArray<readonly [number, number, number, number]> = [
    [0, -14, -11, -30], [0, -14, 9, -32], [0, -20, -15, -23], [0, -20, 14, -25], [0, -10, 0, -40],
  ];
  for (const [x1, y1, x2, y2] of branches) {
    g.beginPath(); g.moveTo(sx + x1, y + y1); g.lineTo(sx + x2, y + y2); g.stroke();
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(sx + x2, y + y2); g.lineTo(sx + x2 - 3, y + y2 - 4); g.stroke();
    g.beginPath(); g.moveTo(sx + x2, y + y2); g.lineTo(sx + x2 + 3, y + y2 - 4); g.stroke();
    g.lineWidth = species === "oak" ? 2.6 : 2;
  }
  g.fillStyle = "rgba(255,255,255,.5)";
  for (const [, , x2, y2] of branches) { g.beginPath(); g.ellipse(sx + x2, y + y2 - 1, 3, 1.3, 0, 0, 7); g.fill(); }
}

/** Spring: a scatter of pale blossom flecks near the canopy top. */
function drawBlossoms(g: CanvasRenderingContext2D, sx: number, y: number, rnd: () => number) {
  g.fillStyle = "rgba(255,222,232,.85)";
  for (let i = 0; i < 6; i++) {
    const bx = sx + (rnd() - 0.5) * 26, by = y - 24 - rnd() * 18;
    g.beginPath(); g.arc(bx, by, 2, 0, 7); g.fill();
  }
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

/** Tile the fence PNG along the field perimeter, base planted on the rail line.
 *  Non-rotated segments on all four sides (a picket run receding down the sides
 *  reads fine in 3/4). Only used for an intact fence — a rundown one keeps the
 *  code painter's broken/leaning look. */
function drawFenceSprite(
  g: CanvasRenderingContext2D, img: HTMLImageElement,
  bounds: { x0: number; y0: number; x1: number; y1: number },
) {
  const id = "props/fence";
  const a = spriteBaseAnchor(id, img);
  const s = SPRITE_FENCE_SCALE;
  const segW = img.naturalWidth * s;
  const step = segW * 0.9;                 // slight overlap so segments meet
  const fx0 = bounds.x0 * T - 14, fy0 = bounds.y0 * T - 14;
  const fx1 = bounds.x1 * T + 14, fy1 = bounds.y1 * T + 14;
  for (const yy of [fy0, fy1])
    for (let xx = fx0; xx <= fx1; xx += step) drawGroundSprite(g, img, Math.min(xx, fx1), yy, a.cx, a.foot, s);
  for (const xx of [fx0, fx1])
    for (let yy = fy0 + step; yy < fy1; yy += step) drawGroundSprite(g, img, xx, yy, a.cx, a.foot, s);
}

/** Draw any world prop base-on-ground on (x,y) from its foliage/props sprite,
 *  measured alpha-bbox anchor + a light contact shadow (nearest-neighbour). No
 *  sprite -> draws nothing (props are additive; the zero-PNG world just lacks
 *  them, CLAUDE.md hard rule #1). */
export function drawProp(g: CanvasRenderingContext2D, x: number, y: number, id: string, scale = SPRITE_PROP_SCALE) {
  const img = sprite(id);
  if (!img) return;
  const a = spriteBaseAnchor(id, img);
  const bw = img.naturalWidth * scale;
  shadow(g, x, y - 1, Math.max(6, bw * 0.34), Math.max(2.4, bw * 0.13));
  drawGroundSprite(g, img, x, y, a.cx, a.foot, scale);
}

export function drawFence(
  g: CanvasRenderingContext2D, fenceOk = true,
  bounds: { x0: number; y0: number; x1: number; y1: number } = FIELD,
) {
  const rundown = !fenceOk;   // broken until the field fence is mended (Step 8)
  // sprite path (CLAUDE.md hard rule #1): an intact fence tiles the fence PNG;
  // a rundown fence + a missing PNG both fall through to the code painter below.
  if (!rundown) { const fimg = sprite("props/fence"); if (fimg) { drawFenceSprite(g, fimg, bounds); return; } }
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
 * data/crops.ts so every species reads differently in the field. `growth`
 * (content-library commit 1) picks the growing-plant SILHOUETTE, not just the
 * tint, so the field doesn't read as "the same stalk in 18 colors":
 * tall-stalk (original upright behavior), bushy (a leafy mound, potato/
 * tomato/cabbage), vine (a low trailing runner, melon/pumpkin/strawberry).
 *
 * DUAL-PATH (CLAUDE.md hard rule #1): the tilled SOIL tile is always
 * code-drawn (it's ground); the PLANT on top is a PixelLab sprite when present.
 * Stage picks a shared sprout/growing sprite by shape, ripe picks a per-crop
 * `ripe-<cropId>` sprite; its measured alpha-bbox base is planted low on the
 * tile. If the chosen PNG is absent/undecoded, the code plant painter below
 * runs unchanged — so the game draws every crop with zero sprite files.
 */
export function drawCropTile(
  g: CanvasRenderingContext2D, cx: number, cy: number, stage: number, t: number,
  pal: { stalk: string; leaf: string; fruit: string } = CROP_DEFAULT, watered = false,
  growth: CropGrowthShape = "tall-stalk", cropId?: string,
) {
  drawTilledTile(g, cx, cy, watered);
  // --- sprite plant (soil stays code-drawn above) ---
  const shape = growth === "bushy" ? "bushy" : growth === "vine" ? "vine" : "tall";
  const spriteId =
    stage < 0.25 ? `crops/sprout-${shape}`
    : stage < 1 ? `crops/growing-${shape}`
    : `crops/ripe-${cropId ?? ""}`;
  const img = sprite(spriteId);
  if (img) {
    const a = spriteBaseAnchor(spriteId, img);
    drawGroundSprite(g, img, cx, cy + SPRITE_CROP_BASE_DY, a.cx, a.foot, SPRITE_CROP_SCALE);
    return;
  }
  // --- code plant painter (zero-PNG fallback) ---
  const sway = Math.sin(t * 1.6 + cx * 0.13) * 1.6;
  if (growth === "bushy") { drawBushyCrop(g, cx, cy, stage, pal, sway); return; }
  if (growth === "vine") { drawVineCrop(g, cx, cy, stage, pal, sway); return; }
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

/** "bushy" growth shape: a rounded leafy mound per plant (same technique as
 *  drawBush's blobs) that swells with stage, fruit peeking from within once ripe. */
function drawBushyCrop(
  g: CanvasRenderingContext2D, cx: number, cy: number, stage: number,
  pal: { stalk: string; leaf: string; fruit: string }, sway: number,
) {
  for (const ox of [-9, 0, 9]) {
    const x = cx + ox + sway * 0.3, y = cy + 8;
    if (stage < 0.25) {
      g.strokeStyle = pal.leaf; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 4); g.stroke();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 4); g.stroke();
      continue;
    }
    const r = 3 + stage * 5.5;
    g.fillStyle = pal.stalk;
    g.beginPath(); g.arc(x, y - r * 0.6, r * 0.9, 0, 7); g.fill(); outline(g);
    g.fillStyle = pal.leaf;
    g.beginPath(); g.arc(x - r * 0.4, y - r * 0.9, r * 0.65, 0, 7); g.fill(); outline(g);
    g.beginPath(); g.arc(x + r * 0.45, y - r * 0.85, r * 0.6, 0, 7); g.fill(); outline(g);
    if (stage >= 1) {
      g.fillStyle = pal.fruit;
      for (const [fx, fy] of [[-0.2, -0.5], [0.35, -0.3]] as const) {
        g.beginPath(); g.arc(x + fx * r, y + fy * r, r * 0.42, 0, 7); g.fill(); outline(g);
      }
    }
  }
}

/** "vine" growth shape: a low trailing runner along the ground, leaves down
 *  its length, with 1-2 round fruits resting beside it once ripe (melon/
 *  pumpkin/squash/strawberry style — the fruit grows ON the ground, not up). */
function drawVineCrop(
  g: CanvasRenderingContext2D, cx: number, cy: number, stage: number,
  pal: { stalk: string; leaf: string; fruit: string }, sway: number,
) {
  const y = cy + 11;
  if (stage < 0.25) {
    g.strokeStyle = pal.leaf; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, y); g.lineTo(cx - 2, y - 4); g.stroke();
    g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + 2, y - 4); g.stroke();
    return;
  }
  const len = 6 + stage * 11;
  g.strokeStyle = pal.stalk; g.lineWidth = 2.2; g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx - len + sway * 0.3, y);
  g.quadraticCurveTo(cx, y - 3, cx + len + sway * 0.3, y - 1);
  g.stroke();
  g.fillStyle = pal.leaf;
  for (const f of [-0.6, 0, 0.6]) {
    const lx = cx + f * len + sway * 0.3, ly = y - 1 - Math.abs(f) * 1.5;
    g.beginPath(); g.ellipse(lx, ly - 2.5, 3.4, 2.2, f * 0.6, 0, 7); g.fill(); outline(g);
  }
  if (stage >= 1) {
    g.fillStyle = pal.fruit;
    g.beginPath(); g.arc(cx + len * 0.5 + sway * 0.3, y + 2, 4.6, 0, 7); g.fill(); outline(g);
    if (stage >= 1 && len > 12) {
      g.beginPath(); g.arc(cx - len * 0.45 + sway * 0.3, y + 3, 3.4, 0, 7); g.fill(); outline(g);
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

/** Season -> tinted foliage palette for a FULL bush (picked bushes stay a
 *  constant muted "just-bare" look across seasons — already reads bare). */
const BUSH_FULL_TINT: Record<Season, Array<[number, number, number, string]>> = {
  spring: [[-8, -2, 10, "#4a7a30"], [8, -2, 9, "#5a8f3a"], [0, -8, 11, "#6aa348"]],
  summer: [[-8, -2, 10, "#3d6626"], [8, -2, 9, "#47732c"], [0, -8, 11, "#528034"]],
  autumn: [[-8, -2, 10, "#6a5a26"], [8, -2, 9, "#7a6a30"], [0, -8, 11, "#8a7638"]],
  winter: [[-8, -2, 9, "#6a6252"], [8, -2, 8, "#75705f"], [0, -7, 9, "#7f7a68"]],
};

/** Berry bush: leafy mound, dotted with berries while full; bare when picked.
 *  Foliage tint shifts per season (content-library commit 1) — spring fresh
 *  green, summer the original tone, autumn warm/olive, winter grey-brown. */
/** The four bush foliage variants; a full bush picks one deterministically from
 *  its position so a hedgerow varies, a picked bush drops to the plain green
 *  `bush` so "nothing to forage here" stays readable. */
const BUSH_VARIANTS = ["foliage/bush", "foliage/bush-pink", "foliage/bush-white", "foliage/berry-bush"] as const;

/** Draw a loaded bush sprite planted base-on-(x,y) at SPRITE_BUSH_SCALE, with a
 *  per-position horizontal flip + uniform-scale jitter (own seed, so it never
 *  perturbs the fallback painter's rng) and a light contact shadow — the same
 *  recipe drawTreeSprite uses, scaled down for a bush. */
function drawBushSprite(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, id: string) {
  const jr = mulberry32(((x * 23) ^ (y * 41)) | 0);
  const flip = jr() < 0.5;
  const s = SPRITE_BUSH_SCALE * (1 - SPRITE_BUSH_JITTER + jr() * SPRITE_BUSH_JITTER * 2);
  const a = spriteBaseAnchor(id, img);
  shadow(g, x + 1, y + 5, 13 * (s / SPRITE_BUSH_SCALE), 5);
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.save();
  g.translate(x, y);
  g.scale(s * (flip ? -1 : 1), s);
  g.drawImage(img, -a.cx, -a.foot, img.naturalWidth, img.naturalHeight);
  g.restore();
  g.imageSmoothingEnabled = prev;
}

export function drawBush(
  g: CanvasRenderingContext2D, x: number, y: number, full: boolean, t: number, season: Season = "summer",
) {
  // sprite path (CLAUDE.md hard rule #1): a full bush shows its seeded colour
  // variant, a picked one the plain green bush; either falls through to the code
  // painter below when the PNG isn't present/decoded.
  const variantId = full
    ? BUSH_VARIANTS[(mulberry32(((x * 19) ^ (y * 7)) | 0)() * BUSH_VARIANTS.length) | 0]!
    : "foliage/bush";
  const bimg = sprite(variantId);
  if (bimg) { drawBushSprite(g, bimg, x, y, variantId); return; }

  shadow(g, x + 2, y + 8, 16, 6);
  const sway = Math.sin(t * 1.1 + x * 0.3) * 0.8;
  const blobs: Array<[number, number, number, string]> = full
    ? BUSH_FULL_TINT[season]
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
  // upturned hat (audit fix, Part B #1-2: it's a small raised object sitting
  // on the cobbles — give it the same under-entity shadow every other prop has)
  shadow(g, x, y + 4, 8, 3);
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
  castShadow(g, x + 4.5, y + h + 6 + bob, 2.5, 10);
  castShadow(g, x + w - 4.5, y + h + 6 - bob, 2.5, 10);
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
