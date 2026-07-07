/**
 * Wildlife painters (seasonal, ambient — ROADMAP's "Wild animals along the
 * road/river" block). Birds and four-legged animals are thin parameter
 * variants of the shared animalRig (per that file's own header: "never a new
 * engine") — only the butterfly gets a bespoke shape, since a flutter sprite
 * is too tiny to share the quadruped/bird skeleton.
 */
import { WILDLIFE_DESPAWN_SECONDS } from "../config";
import {
  drawQuadruped, drawBird, QUAD_STRIDE, BIRD_STRIDE, type QuadrupedParams, type BirdParams,
} from "./animalRig";
import { shadow, outline } from "./shapes";
import { AIRBORNE, type WildlifeInst } from "../entities/wildlife";

const TAU = Math.PI * 2;

export const SONGBIRD_RIG: BirdParams = {
  scale: 0.5, bodyColor: "#8a6a4a", bodyR: 5, wingColor: "#6a4e34",
  beak: "#e2b23a", legColor: "#3a2a1a", eye: "#1c1c1c",
};
export const DUCK_RIG: BirdParams = {
  scale: 0.75, bodyColor: "#5c6b48", bodyR: 6.5, wingColor: "#495a38",
  beak: "#e2a83a", legColor: "#e2a83a", eye: "#1c1c1c",
};
export const RABBIT_RIG: QuadrupedParams = {
  scale: 0.48, bodyColor: "#cdbb9c", bodyW: 10, bodyH: 7.4, legColor: "#cdbb9c",
  legLen: 4, headColor: "#cdbb9c", ears: "pointy", tail: "tuft", tailColor: "#f2eee2", eye: "#2a2a30",
};
export const HARE_RIG: QuadrupedParams = {
  scale: 0.58, bodyColor: "#a99476", bodyW: 11, bodyH: 7.6, legColor: "#a99476",
  legLen: 6.5, headColor: "#a99476", ears: "pointy", tail: "tuft", eye: "#2a2a30",
};
export const DEER_RIG: QuadrupedParams = {
  scale: 0.88, bodyColor: "#a3703f", bodyW: 14, bodyH: 8.6, legColor: "#87592f",
  legLen: 13, headColor: "#a3703f", snout: "#5c3a24", ears: "pointy",
  tail: "tuft", tailColor: "#ece4d4", eye: "#241d18",
};
export const DEER_BUCK_RIG: QuadrupedParams = { ...DEER_RIG, antlers: true };

/** Two wing ellipses + a thin body, flapping on a fast sine — cheap enough
 *  for half a dozen on screen with no rig overhead. */
function drawButterfly(g: CanvasRenderingContext2D, x: number, y: number, color: string, t: number) {
  const flap = 0.35 + Math.abs(Math.sin(t * 11)) * 0.65;
  shadow(g, x, y + 4, 3, 1.2);
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  for (const side of [-1, 1] as const) {
    g.save();
    g.scale(side * flap, 1);
    g.beginPath(); g.ellipse(2.6, 0, 3, 2.1, 0.25, 0, TAU); g.fill();
    outline(g);
    g.restore();
  }
  g.fillStyle = "#2a2118";
  g.fillRect(-0.5, -3, 1, 6);
  g.restore();
}

/**
 * One dispatcher for main.ts's depth-sorted draw pass. Applies the shared
 * despawn fade (+ a little lift for anything airborne) so a season/weather
 * change — or a critter that's fled/flown off — never just pops out of
 * existence.
 */
export function drawWildlife(g: CanvasRenderingContext2D, w: WildlifeInst, time: number) {
  const alpha = w.despawning ? Math.max(0, w.despawnT / WILDLIFE_DESPAWN_SECONDS) : 1;
  const lift = w.despawning && AIRBORNE.has(w.kind) ? (1 - alpha) * 34 : 0;
  const y = w.y - lift;
  g.save();
  g.globalAlpha = alpha;
  switch (w.kind) {
    case "butterfly": drawButterfly(g, w.x, y, w.color, time + w.t); break;
    case "songbird": drawBird(g, w.x, y, w.flip, SONGBIRD_RIG, w.dist / BIRD_STRIDE, w.moving, w.peck, time); break;
    case "duck": drawBird(g, w.x, y, w.flip, DUCK_RIG, w.dist / BIRD_STRIDE, w.moving, w.peck, time); break;
    case "rabbit": drawQuadruped(g, w.x, y, w.flip, RABBIT_RIG, w.dist / QUAD_STRIDE, w.moving, time); break;
    case "hare": drawQuadruped(g, w.x, y, w.flip, HARE_RIG, w.dist / QUAD_STRIDE, w.moving, time); break;
    case "deer":
      drawQuadruped(g, w.x, y, w.flip, w.hasAntlers ? DEER_BUCK_RIG : DEER_RIG, w.dist / QUAD_STRIDE, w.moving, time);
      break;
  }
  g.restore();
}
