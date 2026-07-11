import { MARKET_STALLS } from "../world/zones";
import { outline, oRect, shadow } from "./shapes";
import { mulberry32 } from "../engine/rng";
import { sprite, drawGroundSprite, spriteBaseAnchor } from "./sprites";
import { SPRITE_HARVEST_CLUSTER_SCALE, SPRITE_FESTIVAL_LANTERN_SCALE } from "../config";

/**
 * Festival decorations (Festival engine, Part A #6) — code-drawn, only
 * painted on the festival's date (the caller gates on `activeFestival()`).
 * Warm autumn palette: bunting between the market stalls, lantern poles and
 * harvest clusters (pumpkins + wheat sheaves) around the well. Cheap and
 * charming — no new state, just a handful of small painter functions drawn
 * through the existing depth-sort (lanterns/clusters) or straight to the
 * canvas as an overhead layer (bunting, like the fence/hedges).
 */

const BUNTING_COLORS = ["#c9622f", "#e0a83f", "#8a3a2a", "#d4b23f", "#a4472e"];

function bunAnchor(s: { x: number; y: number; w: number; h: number }): [number, number] {
  return [s.x + s.w / 2, s.y - s.h * 0.55];
}

function bezierPoint(
  a: [number, number], cp: [number, number], b: [number, number], u: number,
): [number, number] {
  const mu = 1 - u;
  return [
    mu * mu * a[0] + 2 * mu * u * cp[0] + u * u * b[0],
    mu * mu * a[1] + 2 * mu * u * cp[1] + u * u * b[1],
  ];
}

/** A sagging string of small triangular pennants strung between the four
 *  market stalls, gently swaying — drawn as an overhead layer, like the
 *  fence/hedges (not depth-sorted; it reads above everything at head height). */
export function drawBunting(g: CanvasRenderingContext2D, t: number) {
  for (let i = 0; i < MARKET_STALLS.length - 1; i++) {
    const a = bunAnchor(MARKET_STALLS[i]!);
    const b = bunAnchor(MARKET_STALLS[i + 1]!);
    const sway = Math.sin(t * 0.6 + i) * 2;
    const cp: [number, number] = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 20 + sway];

    g.strokeStyle = "rgba(60,45,25,.55)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(cp[0], cp[1], b[0], b[1]);
    g.stroke();

    const flags = 7;
    for (let f = 1; f < flags; f++) {
      const [px, py] = bezierPoint(a, cp, b, f / flags);
      g.fillStyle = BUNTING_COLORS[(f + i) % BUNTING_COLORS.length]!;
      g.beginPath();
      g.moveTo(px - 5, py);
      g.lineTo(px + 5, py);
      g.lineTo(px, py + 9);
      g.closePath();
      g.fill();
      outline(g);
    }
  }
}

/** A wooden pole topped with a glowing paper lantern — a gentle flicker, no
 *  animation cost beyond a sine. Warm against the well's stonework. */
export function drawLanternPole(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const flicker = 0.75 + Math.sin(t * 3 + x) * 0.15;
  // ---- sprite path: the pole + UNLIT paper lantern as a sprite, base-on-ground;
  // the warm flicker GLOW below stays code-drawn ON TOP so the lantern reads lit.
  // Code painter is the zero-PNG fallback. ----
  const img = sprite("props/festival-lantern");
  if (img) {
    shadow(g, x + 2, y + 3, 6, 3);
    const a = spriteBaseAnchor("props/festival-lantern", img);
    const p = drawGroundSprite(g, img, x, y, a.cx, a.foot, SPRITE_FESTIVAL_LANTERN_SCALE);
    // the paper lantern sits near the sprite's top — glow there
    const gy = p.dy + a.foot * SPRITE_FESTIVAL_LANTERN_SCALE - (img.naturalHeight - 8) * SPRITE_FESTIVAL_LANTERN_SCALE;
    const glowR = g.createRadialGradient(x, gy, 1, x, gy, 16);
    glowR.addColorStop(0, `rgba(255,190,90,${0.55 * flicker})`);
    glowR.addColorStop(1, "rgba(255,190,90,0)");
    g.fillStyle = glowR; g.beginPath(); g.arc(x, gy, 16, 0, 7); g.fill();
    g.fillStyle = `rgba(255,170,80,${0.32 * flicker})`;   // soft lit tint on the paper
    g.beginPath(); g.ellipse(x, gy, 5.5, 7.5, 0, 0, 7); g.fill();
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  shadow(g, x + 2, y + 3, 6, 3);
  oRect(g, x - 2, y - 34, 4, 34, "#6f5334");   // pole

  const cy = y - 38;
  const glow = g.createRadialGradient(x, cy, 1, x, cy, 16);
  glow.addColorStop(0, `rgba(255,190,90,${0.55 * flicker})`);
  glow.addColorStop(1, "rgba(255,190,90,0)");
  g.fillStyle = glow;
  g.beginPath(); g.arc(x, cy, 16, 0, 7); g.fill();

  g.fillStyle = `rgba(230,120,50,${flicker})`;
  g.beginPath(); g.ellipse(x, cy, 7, 9, 0, 0, 7); g.fill();
  outline(g);
  g.strokeStyle = "rgba(90,50,20,.5)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - 5, cy); g.lineTo(x + 5, cy); g.stroke();
  g.fillStyle = "#5d3e22";
  g.beginPath(); g.ellipse(x, cy - 9, 4, 1.8, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x, cy + 9, 4, 1.8, 0, 0, 7); g.fill();
}

/** A little harvest cluster: two pumpkins and a bound wheat sheaf, deterministic
 *  per position so it never shimmers between frames. */
export function drawHarvestCluster(g: CanvasRenderingContext2D, x: number, y: number) {
  // ---- sprite path: a harvest pile sprite base-on-ground, alternating the two
  // variants per position so clusters don't read as clones; code painter is the
  // zero-PNG fallback. ----
  const clA = sprite("props/harvest-cluster-a");
  if (clA) {
    const clB = sprite("props/harvest-cluster-b");
    const useB = clB && ((((x * 13) ^ (y * 7)) & 1) === 1);
    const img = useB ? clB! : clA;
    const id = useB ? "props/harvest-cluster-b" : "props/harvest-cluster-a";
    const an = spriteBaseAnchor(id, img);
    shadow(g, x + 2, y + 5, 16, 6);
    drawGroundSprite(g, img, x, y, an.cx, an.foot, SPRITE_HARVEST_CLUSTER_SCALE);
    return;
  }
  // ---- code-drawn fallback (painter path, unchanged) ----
  const rnd = mulberry32(((x * 13) ^ (y * 7)) | 0);
  shadow(g, x + 2, y + 5, 16, 6);

  // wheat sheaf: a fan of stalks bound at the waist
  g.strokeStyle = "#c9a24a"; g.lineWidth = 1.6;
  for (let i = 0; i < 7; i++) {
    const a = -0.55 + i * 0.17 + (rnd() - 0.5) * 0.05;
    g.beginPath();
    g.moveTo(x - 6, y + 4);
    g.lineTo(x - 6 + Math.sin(a) * 14, y + 4 - Math.cos(a) * 20);
    g.stroke();
  }
  g.strokeStyle = "#8a6636"; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(x - 11, y - 2); g.lineTo(x - 1, y - 2); g.stroke();

  // two pumpkins beside the sheaf
  const pumpkins: Array<[number, number, string]> = [[6, 8, "#d4732f"], [13, 6, "#e08a3a"]];
  for (const [dx, r, c] of pumpkins) {
    g.fillStyle = c;
    g.beginPath(); g.ellipse(x + dx, y, r, r * 0.78, 0, 0, 7); g.fill(); outline(g);
    g.strokeStyle = "rgba(120,50,10,.35)"; g.lineWidth = 1;
    for (const ridge of [-r * 0.35, 0, r * 0.35]) {
      g.beginPath(); g.moveTo(x + dx + ridge, y - r * 0.72); g.lineTo(x + dx + ridge, y + r * 0.72); g.stroke();
    }
    g.fillStyle = "#5d7a34";
    g.fillRect(x + dx - 1, y - r * 0.78 - 3, 2, 4);
  }
}
