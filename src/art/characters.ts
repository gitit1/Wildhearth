/**
 * Character painters — now thin adapters over the shared segmented rigs
 * (art/rig.ts for the humanoid, art/animalRig.ts for animals). The entity
 * state (pose, direction, accumulated distance) is turned into a rig call
 * here, so main.ts's draw + depth-sort code is untouched. When NPCs arrive
 * next block they call drawRig directly with their own RigParams.
 */
import { drawRig, RIG_STRIDE, type RigParams } from "./rig";
import { drawPlayerSprite } from "./spriteChar";
import { drawNpcSprite } from "./spriteNpc";
import { drawAnimalSprite } from "./spriteAnimal";
import {
  drawQuadruped, drawBird, COW_RIG, HEN_RIG, QUAD_STRIDE, BIRD_STRIDE,
  PIG_RIG, SHEEP_RIG, DUCK_RIG, RABBIT_RIG, CAT_RIG, DOG_RIG,
} from "./animalRig";
import { roundR, outline } from "./shapes";
import { DEFAULT_PLAYER_RIG, type Player } from "../entities/player";
import type { Cow, Hen, Duck, Pig, Sheep } from "../entities/animals";
import type { Npc } from "../entities/npc";

/** The player, drawn with her created look. `rig` comes from her saved
 *  Character (main owns it, rebuilt on New Game); falls back to the default
 *  farmer when a caller has none. When `useSprite` is set (the Character is the
 *  default female heroine — main computes this via spriteCoversCharacter) the
 *  PixelLab heroine sprite is drawn for the walk/idle poses; every other pose,
 *  and any frame whose sprite hasn't loaded, falls through to the code rig
 *  (which paints its own shadow), so switching is seamless. */
export function drawFarmer(
  g: CanvasRenderingContext2D, p: Player, t: number,
  rig: RigParams = DEFAULT_PLAYER_RIG, useSprite = false,
) {
  // the rig already carries her chosen look (hair/hairColor/skin/outfit) — the
  // sprite bridge reads it straight off, so hairstyle + recolours need no extra
  // plumbing through main.ts
  if (useSprite && drawPlayerSprite(g, p, t)) return;
  drawRig(g, p.x, p.y, p.dir, rig, p.pose, p.dist / RIG_STRIDE, t);
}

/** Live relationship readout for the name pill (Relationship engine). Romance
 *  is only shown for romantic candidates (never for kids / non-candidates). */
export interface NpcRelReadout { friendship: number; romance: number; showRomance: boolean }

/**
 * An NPC: the same shared rig as the player, driven by the NPC's own RigParams
 * + live pose/facing/distance. `showLabel` draws a small name pill above the
 * head — shown only when the player is near or hovering (matching how the
 * action prompt only appears in reach), so the world isn't cluttered with tags.
 * When a bond has started, a subtle second line shows ♥ Friendship (and ⚭
 * Romance for candidates).
 *
 * Draw path mirrors the player: the PixelLab NPC sprite (drawNpcSprite) when it
 * has a decoded sheet, else the code rig — seamless, since both plant on the
 * same ground line and share the same shadow. The name pill + ♥ readout are
 * unchanged on either path.
 */
export function drawNpc(g: CanvasRenderingContext2D, n: Npc, t: number, showLabel: boolean, rel?: NpcRelReadout) {
  if (!drawNpcSprite(g, n, t))
    drawRig(g, n.x, n.y, n.facing, n.def.rig, n.pose, n.dist / RIG_STRIDE, t);
  if (showLabel) drawNameLabel(g, n.x, n.y - 30 * n.def.rig.scale, n.def.name, relLine(rel));
}

/** "♥12" or "♥12 · ⚭0" — only once a bond exists, so strangers stay uncluttered. */
function relLine(rel?: NpcRelReadout): string | undefined {
  if (!rel) return undefined;
  const showRomance = rel.showRomance && rel.romance > 0;
  if (rel.friendship <= 0 && !showRomance) return undefined;
  const heart = `♥${Math.round(rel.friendship)}`;
  return rel.showRomance ? `${heart} · ⚭${Math.round(rel.romance)}` : heart;
}

function drawNameLabel(g: CanvasRenderingContext2D, x: number, yTop: number, name: string, sub?: string) {
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
  if (sub) {
    g.font = "700 10px -apple-system, Segoe UI, Roboto, sans-serif";
    g.fillStyle = "rgba(0,0,0,.55)";
    g.fillText(sub, x, cy + h - 0.5);       // subtle shadow
    g.fillStyle = "#f2cf6b";
    g.fillText(sub, x, cy + h - 1.5);
  }
  g.restore();
}

// Draw path (all five): the PixelLab sprite (drawAnimalSprite) when its
// species sheet has a decoded atlas, else the shared segmented rig — seamless,
// since both plant on the same ground line and share the same shadow. See
// art/spriteAnimal.ts + docs/PIXELLAB_ASSETS.md.

export function drawCow(g: CanvasRenderingContext2D, c: Cow, t: number) {
  if (!drawAnimalSprite(g, "cow", c)) drawQuadruped(g, c.x, c.y, c.flip, COW_RIG, c.dist / QUAD_STRIDE, c.moving, t);
}

export function drawHen(g: CanvasRenderingContext2D, h: Hen, t: number) {
  if (!drawAnimalSprite(g, "hen", h)) drawBird(g, h.x, h.y, h.flip, HEN_RIG, h.dist / BIRD_STRIDE, h.moving, h.peck, t);
}

// ---- Part C content-library commit 2: pig/sheep/duck (wired as purchasable
// livestock, see entities/animals.ts + main.ts) ----------------------------

export function drawPig(g: CanvasRenderingContext2D, p: Pig, t: number) {
  if (!drawAnimalSprite(g, "pig", p)) drawQuadruped(g, p.x, p.y, p.flip, PIG_RIG, p.dist / QUAD_STRIDE, p.moving, t);
}

export function drawSheep(g: CanvasRenderingContext2D, s: Sheep, t: number) {
  if (!drawAnimalSprite(g, "sheep", s)) drawQuadruped(g, s.x, s.y, s.flip, SHEEP_RIG, s.dist / QUAD_STRIDE, s.moving, t);
}

export function drawDuck(g: CanvasRenderingContext2D, d: Duck, t: number) {
  if (!drawAnimalSprite(g, "duck", d)) drawBird(g, d.x, d.y, d.flip, DUCK_RIG, d.dist / BIRD_STRIDE, d.moving, d.peck, t);
}

// ---- rabbit/cat/dog: PAINTERS + PRESETS ONLY — nothing spawns these yet.
// The rabbit is a hutch occupant (a static-prop context, not a wandering
// yard animal); cat + dog belong to the future Pets block (adoption,
// companionship — VISION.md Systems #6). This is the one plug-in point:
// when that block lands, give each a Cow/Hen-style entity + spawn/update
// function in entities/animals.ts and call these from main.ts's depth-
// sorted ents, exactly like drawPig/drawSheep/drawDuck above. ----------

export function drawRabbit(g: CanvasRenderingContext2D, x: number, y: number, flip: boolean, t: number) {
  drawQuadruped(g, x, y, flip, RABBIT_RIG, 0, false, t);
}

export function drawCat(g: CanvasRenderingContext2D, x: number, y: number, flip: boolean, t: number) {
  drawQuadruped(g, x, y, flip, CAT_RIG, 0, false, t);
}

export function drawDog(g: CanvasRenderingContext2D, x: number, y: number, flip: boolean, t: number) {
  drawQuadruped(g, x, y, flip, DOG_RIG, 0, false, t);
}
