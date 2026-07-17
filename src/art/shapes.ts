/** Tiny shared drawing primitives. */
import {
  CAST_SHADOW_ALPHA, CAST_SHADOW_SKEW_X, CAST_SHADOW_SKEW_Y,
  CONTACT_SHADOW_ALPHA, CONTACT_SHADOW_SE, BASE_TINT_ALPHA, BASE_TUFT_MIN, BASE_TUFT_MAX,
} from "../config";
import { mulberry32 } from "../engine/rng";
import { spriteBaseEdge, type SpriteImage } from "./sprites";

export function roundR(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function shadow(
  g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number
) {
  g.fillStyle = "rgba(20,30,12,.28)";
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
}

/**
 * The game-wide outline stroke (visual pass, batch 3): every major drawn
 * shape gets the same soft dark contour, the single cheapest technique that
 * makes flat canvas art read like the reference look. One color, one width,
 * defined once — never per-object.
 */
export const OUTLINE = "rgba(43,32,19,.62)";
export const OUTLINE_W = 1.6;

/** Strokes the CURRENT path with the shared outline (call right after fill). */
export function outline(g: CanvasRenderingContext2D) {
  g.strokeStyle = OUTLINE;
  g.lineWidth = OUTLINE_W;
  g.stroke();
}

/** fillRect + the shared outline in one call. */
export function oRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = OUTLINE;
  g.lineWidth = OUTLINE_W;
  g.strokeRect(x, y, w, h);
}

/** Outlined ellipse. */
export function oEllipse(
  g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string,
) {
  g.fillStyle = fill;
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill();
  outline(g);
}

// ===========================================================================
//  Diagonal cast shadows (Part B #3) — distinct from `shadow()` above (the
//  under-entity ellipse). A soft, skewed dark shape thrown toward the
//  lower-right (a fixed upper-left sun), sized from the object's own
//  footprint + height. Length/alpha read the CURRENT time of day via a tiny
//  module-level "sun state" set once per frame by main.ts (the same pattern
//  engine/camera.ts already uses for `lastCam`) — so every painter can call
//  `castShadow()` from inside its own drawFn (keeping it in the depth sort)
//  without art/ ever importing systems/calendar.ts.
// ===========================================================================

let sunLenMult = 1, sunAlphaMult = 1;

/** Call once per frame (main.ts's draw(), before the entity pass) with the
 *  current `shadowFactors(hour, minute)` from art/daynight.ts. */
export function setSunFactors(lenMult: number, alphaMult: number) {
  sunLenMult = lenMult;
  sunAlphaMult = alphaMult;
}

/** Dev-only verification hook: the raw values castShadow() is currently
 *  reading, to confirm setSunFactors() actually reached this module. */
export function getSunFactors(): { sunLenMult: number; sunAlphaMult: number } {
  return { sunLenMult, sunAlphaMult };
}

/**
 * Casts a soft skewed shadow from a ground footprint. `footX,footY` is the
 * point the object stands on; `halfW` is the footprint's half-width at the
 * base; `rise` is how tall the silhouette being thrown is (a doorstep needs
 * almost none, a barn needs a lot). Cheap: one filled path, no transforms.
 */
export function castShadow(
  g: CanvasRenderingContext2D, footX: number, footY: number, halfW: number, rise: number,
) {
  const a = CAST_SHADOW_ALPHA * sunAlphaMult;
  if (a <= 0.004) return;   // night — not worth the draw call
  const len = rise * sunLenMult;
  const dx = len * CAST_SHADOW_SKEW_X, dy = len * CAST_SHADOW_SKEW_Y;
  g.fillStyle = `rgba(20,16,10,${a.toFixed(3)})`;
  g.beginPath();
  g.moveTo(footX - halfW, footY);
  g.lineTo(footX + halfW, footY);
  g.lineTo(footX + halfW * 0.65 + dx, footY + dy);
  g.lineTo(footX - halfW * 0.65 + dx, footY + dy);
  g.closePath();
  g.fill();
}

// ===========================================================================
//  W2c building grounding — the "does it look BUILT here" pair. BUILDINGS use
//  these two instead of the diagonal castShadow polygon above (which read
//  "pasted"): a soft SHORT contact shadow that hugs the base (contactShadow),
//  and a base-line integration pass (baseGrounding: a dithered tint climbing
//  the foundation + grass/weed tufts breaking the crisp cut). Both are called
//  from every building painter, on BOTH the sprite and the code-fallback path,
//  so the treatment is uniform and zero-PNG safe. See COMPOSITION_RULES rule 30.
// ===========================================================================

/** A soft, short, dark-at-the-base contact shadow hugging a building footprint,
 *  offset slightly toward the lower-right (sun upper-left). Sun-aware alpha
 *  (fades at night) but — unlike castShadow — never elongates. Draw BEFORE the
 *  building sprite (it sits under the base). */
export function contactShadow(
  g: CanvasRenderingContext2D, footX: number, footY: number, halfW: number,
) {
  const a = CONTACT_SHADOW_ALPHA * sunAlphaMult;
  if (a <= 0.004) return;
  const rx = Math.max(8, halfW * 1.02);
  const ry = Math.max(6, halfW * 0.32);
  const cx = footX + ry * CONTACT_SHADOW_SE, cy = footY - ry * 0.12;
  g.save();
  g.translate(cx, cy);
  g.scale(1, ry / rx);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, `rgba(16,12,8,${a.toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(16,12,8,${(a * 0.5).toFixed(3)})`);
  grad.addColorStop(1, "rgba(16,12,8,0)");
  g.fillStyle = grad;
  g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill();
  g.restore();
}

/** A sprite's placement, enough to map its per-column base silhouette (chevron)
 *  into world space so baseGrounding can lace growth OVER the true base line. */
export interface BaseChevron { id: string; img: SpriteImage; anchorCx: number; anchorFoot: number; scale: number; flip?: boolean }

const TUFT_GREEN = ["#3f5a2e", "#4a6a34", "#557f36"];
const TUFT_DRY = ["#7a6a30", "#8a7a3a", "#66693b"];
/** One weed tuft: 2-4 leaning blades in one colour, rooted at (tx,ty). */
function baseTuft(g: CanvasRenderingContext2D, tx: number, ty: number, rnd: () => number, dryChance = 0.25) {
  const c = (rnd() < 1 - dryChance ? TUFT_GREEN : TUFT_DRY)[(rnd() * 3) | 0]!;
  const blades = 2 + ((rnd() * 3) | 0);
  g.fillStyle = c;
  for (let b = 0; b < blades; b++) {
    const lean = Math.round((b - (blades - 1) / 2) * 1.3);
    const bh = 2 + ((rnd() * 4) | 0);
    g.fillRect(tx + lean, ty - bh, 1, bh);
  }
}
/** Deterministic per-pixel hash in (0,1) — for dithering the AO tail. */
function hash01(x: number, y: number): number {
  let h = ((x * 374761393) ^ (y * 668265263)) >>> 0;
  h ^= h >>> 13; h = (h * 1274126177) >>> 0; h ^= h >>> 16;
  return h / 4294967296;
}

/** Base-line integration (COHESION-1(E)). With a `chevron` (the building's real
 *  bottom silhouette, sampled per column), tufts are LACED OVER the foundation
 *  base along BOTH wall faces — rooted 2-5px above the stone contact so blades
 *  rise over it and break the crisp line, densest at the three corners — and a
 *  short per-column contact AO HUGS the chevron (no wide horizontal band). With
 *  no chevron (zero-PNG fallback) it keeps the flat tint + tuft treatment.
 *  Deterministic per building (`seed`). Draw AFTER the building sprite. */
export function baseGrounding(
  g: CanvasRenderingContext2D, footX: number, footY: number, halfW: number, seed: number,
  chevron?: BaseChevron,
) {
  const rnd = mulberry32((seed ^ 0x2c1b3a7d) >>> 0);
  const edge = chevron ? spriteBaseEdge(chevron.id, chevron.img) : null;

  if (chevron && edge) {
    // --- map the sprite chevron into world space: worldCol -> lowest (contact) row ---
    const { anchorCx, anchorFoot, scale } = chevron;
    const sgn = chevron.flip ? -1 : 1;   // a mirrored sprite mirrors its chevron about the foot col
    const map = new Map<number, number>();
    for (let sx = 0; sx < edge.length; sx++) {
      const sr = edge[sx]!; if (sr < 0) continue;
      const wx = Math.round(footX + sgn * (sx - anchorCx) * scale);
      const wy = footY + (sr - anchorFoot) * scale;
      const prev = map.get(wx);
      if (prev == null || wy > prev) map.set(wx, wy);          // lowest opaque = the base contact
    }
    const cols = [...map.keys()].sort((a, b) => a - b);
    if (cols.length >= 4) {
      const minX = cols[0]!, maxX = cols[cols.length - 1]!;
      let vx = minX; for (const c of cols) if (map.get(c)! > map.get(vx)!) vx = c;   // front (lowest) corner
      const nearCorner = (x: number) => Math.min(Math.abs(x - minX), Math.abs(x - vx), Math.abs(x - maxX));

      // (a) short contact AO hugging the chevron — peak at contact, fade ~6px DOWN,
      //     dithered tail, nothing beyond the walls (no horizontal band). Sun-aware.
      const aoK = 0.30 * (0.4 + 0.6 * sunAlphaMult);
      for (const cx of cols) {
        const cy = map.get(cx)!;
        for (let dy = 0; dy <= 6; dy++) {
          const t = 1 - dy / 6.5;
          let a = aoK * t * t;
          if (t < 0.6 && hash01(cx, (cy + dy) | 0) > t / 0.6) a = 0;   // dither the tail
          if (a <= 0.003) continue;
          g.fillStyle = `rgba(14,11,8,${a.toFixed(3)})`;
          g.fillRect(cx, (cy + dy) | 0, 1, 1);
        }
      }
      // (b) lace tufts OVER the base along both faces, densest at the 3 corners,
      //     irregular spacing; a share spill 1px onto the grass.
      let ix = 0;
      while (ix < cols.length) {
        const cx = cols[ix]!, cy = map.get(cx)!;
        const dense = nearCorner(cx) < 12;
        if (rnd() < (dense ? 0.9 : 0.5)) {
          const overlap = 2 + ((rnd() * 4) | 0);               // 2..5px OVER the stone
          baseTuft(g, cx + (((rnd() * 3) | 0) - 1), cy - overlap, rnd, 0.2);
          if (rnd() < 0.5) baseTuft(g, cx + (((rnd() * 3) | 0) - 1), cy + 1, rnd, 0.2);   // spill onto grass
        }
        ix += 3 + ((rnd() * 5) | 0);                           // irregular 3..7px step
      }
      // explicit weed clumps AT the three base corners
      for (const ck of [minX + 3, vx, maxX - 3]) {
        const cy = map.get(ck) ?? map.get(vx)!;
        for (let k = 0; k < 5; k++) baseTuft(g, ck + (((rnd() * 8) | 0) - 4), cy - (1 + ((rnd() * 4) | 0)), rnd, 0.15);
      }
      return;
    }
    // (chevron too thin — fall through to the flat treatment)
  }

  // ---- zero-PNG / no-chevron fallback: flat tint + tufts along the base line ----
  const ta = BASE_TINT_ALPHA * (0.45 + 0.55 * sunAlphaMult);
  const climb = 4;
  const grad = g.createLinearGradient(0, footY, 0, footY - climb);
  grad.addColorStop(0, `rgba(22,17,10,${ta.toFixed(3)})`);
  grad.addColorStop(1, "rgba(22,17,10,0)");
  g.fillStyle = grad;
  g.fillRect(footX - halfW, footY - climb, halfW * 2, climb);
  const n = BASE_TUFT_MIN + ((rnd() * (BASE_TUFT_MAX - BASE_TUFT_MIN + 1)) | 0);
  for (let i = 0; i < n; i++) {
    const tx = Math.round(footX + (rnd() * 2 - 1) * halfW * 0.94);
    const ty = Math.round(footY - ((rnd() * 2) | 0));
    baseTuft(g, tx, ty, rnd, 0.28);
  }
}
