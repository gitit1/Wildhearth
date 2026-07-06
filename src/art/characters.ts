/**
 * Character painters — now thin adapters over the shared segmented rigs
 * (art/rig.ts for the humanoid, art/animalRig.ts for animals). The entity
 * state (pose, direction, accumulated distance) is turned into a rig call
 * here, so main.ts's draw + depth-sort code is untouched. When NPCs arrive
 * next block they call drawRig directly with their own RigParams.
 */
import { drawRig, RIG_STRIDE } from "./rig";
import { drawQuadruped, drawBird, COW_RIG, HEN_RIG, QUAD_STRIDE, BIRD_STRIDE } from "./animalRig";
import { roundR, outline } from "./shapes";
import { DEFAULT_PLAYER_RIG, type Player } from "../entities/player";
import type { Cow, Hen } from "../entities/animals";
import type { Npc } from "../entities/npc";

export function drawFarmer(g: CanvasRenderingContext2D, p: Player, t: number) {
  drawRig(g, p.x, p.y, p.dir, DEFAULT_PLAYER_RIG, p.pose, p.dist / RIG_STRIDE, t);
}

/**
 * An NPC: the same shared rig as the player, driven by the NPC's own RigParams
 * + live pose/facing/distance. `showLabel` draws a small name pill above the
 * head — shown only when the player is near or hovering (matching how the
 * action prompt only appears in reach), so the world isn't cluttered with tags.
 */
export function drawNpc(g: CanvasRenderingContext2D, n: Npc, t: number, showLabel: boolean) {
  drawRig(g, n.x, n.y, n.facing, n.def.rig, n.pose, n.dist / RIG_STRIDE, t);
  if (showLabel) drawNameLabel(g, n.x, n.y - 30 * n.def.rig.scale, n.def.name);
}

function drawNameLabel(g: CanvasRenderingContext2D, x: number, yTop: number, name: string) {
  g.save();
  g.font = "600 11px -apple-system, Segoe UI, Roboto, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const w = g.measureText(name).width + 12;
  const h = 15, cy = yTop - h / 2;
  g.fillStyle = "rgba(25,32,18,.86)";
  roundR(g, x - w / 2, cy - h / 2, w, h, 6);
  g.fill();
  outline(g);
  g.fillStyle = "#f0ead6";
  g.fillText(name, x, cy);
  g.restore();
}

export function drawCow(g: CanvasRenderingContext2D, c: Cow, t: number) {
  drawQuadruped(g, c.x, c.y, c.flip, COW_RIG, c.dist / QUAD_STRIDE, c.moving, t);
}

export function drawHen(g: CanvasRenderingContext2D, h: Hen, t: number) {
  drawBird(g, h.x, h.y, h.flip, HEN_RIG, h.dist / BIRD_STRIDE, h.moving, h.peck, t);
}
