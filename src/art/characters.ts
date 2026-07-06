/**
 * Character painters — now thin adapters over the shared segmented rigs
 * (art/rig.ts for the humanoid, art/animalRig.ts for animals). The entity
 * state (pose, direction, accumulated distance) is turned into a rig call
 * here, so main.ts's draw + depth-sort code is untouched. When NPCs arrive
 * next block they call drawRig directly with their own RigParams.
 */
import { drawRig, RIG_STRIDE } from "./rig";
import { drawQuadruped, drawBird, COW_RIG, HEN_RIG, QUAD_STRIDE, BIRD_STRIDE } from "./animalRig";
import { DEFAULT_PLAYER_RIG, type Player } from "../entities/player";
import type { Cow, Hen } from "../entities/animals";

export function drawFarmer(g: CanvasRenderingContext2D, p: Player, t: number) {
  drawRig(g, p.x, p.y, p.dir, DEFAULT_PLAYER_RIG, p.pose, p.dist / RIG_STRIDE, t);
}

export function drawCow(g: CanvasRenderingContext2D, c: Cow, t: number) {
  drawQuadruped(g, c.x, c.y, c.flip, COW_RIG, c.dist / QUAD_STRIDE, c.moving, t);
}

export function drawHen(g: CanvasRenderingContext2D, h: Hen, t: number) {
  drawBird(g, h.x, h.y, h.flip, HEN_RIG, h.dist / BIRD_STRIDE, h.moving, h.peck, t);
}
