/**
 * NPC rig-to-sprite bridge — the townsfolk counterpart to art/spriteChar.ts
 * (the heroine). Each of the 10 NPCs has its OWN packed sheet
 * (characters/<id>.sheet.png + .json, from scripts/packsheets.mjs); this draws
 * the right frame for the NPC's current facing + motion, planted on the same
 * ground line and under the same shadow the code rig would use — so switching
 * between the sprite and the rig fallback never pops.
 *
 * Frame selection (decision S2-8: NO breathing idle for NPCs):
 *  - WALKING  → the 6-frame walk cycle, keyed to the NPC's distance accumulator
 *    (npc.dist), with an 8-direction facing from the movement vector (held with
 *    hysteresis, shared with the heroine via spriteFacing.ts).
 *  - anything else (standing / socializing / atWork / talking) → the STATIC
 *    rotation frame for the NPC's stored cardinal facing (facing the player
 *    while talked to). The sprite takes over EVERY state, so an NPC never swaps
 *    sprite↔rig in normal play — the rig's action poses (hoeing / fishing /
 *    busking limbs) are not used on the sprite path. Where an action needs to
 *    read, a MINIMAL code prop overlays the static sprite (drawNpcProps):
 *      · Finn  — the existing code fishing rod (rig.ts drawRod) angled from his
 *                hands at the dock while his work pose is "fishing".
 *      · Liora — drifting music notes (props.ts drawMusicNotes) above her head
 *                while she performs (pose "busking"); her sprite already holds
 *                the lute, so no instrument is drawn.
 *      · everyone else (incl. Ada, Bram, the stallkeepers) — static sprite only.
 *
 * Dual-path fallback (CLAUDE.md hard rule #1): no sheet for this NPC (or none
 * committed at all, or the atlas hasn't decoded yet) → returns false and the
 * caller draws the rig. Dev A/B: __wh.npcSpriteMode(false) forces all-rig.
 */
import { spriteFrame, sheetInfo } from "./sprites";
import { DIR8, nextSector, walkFrame, cardinalSector } from "./spriteFacing";
import { shadow, castShadow } from "./shapes";
import { drawRod } from "./rig";
import { drawMusicNotes } from "./props";
import {
  SPRITE_NPC_SCALE, SPRITE_NPC_FOOT_DY, SPRITE_NPC_WALK_STRIDE,
  SPRITE_NPC_SCALES, SPRITE_FACING_HYSTERESIS, CHARACTER_SPRITES_PRIMARY,
} from "../config";
import type { Npc } from "../entities/npc";

const WALK_FRAMES = 6;

// Default from the locked render mode (config): false = rig-primary, NPC sprites
// are the off-by-default fallback. __wh.npcSpriteMode(true) flips it live (A/B).
let npcSpritesEnabled = CHARACTER_SPRITES_PRIMARY;
/** Dev bridge: force the rig path on/off for every NPC (A/B comparison). */
export function setNpcSpriteMode(on: boolean) { npcSpritesEnabled = on; }
export function npcSpriteModeOn(): boolean { return npcSpritesEnabled; }

// Per-NPC held state: the 8-dir movement sector (with hysteresis) + last
// position (to derive the movement vector, since the entity holds no velocity).
const sectorOf = new Map<string, number>();
const lastPos = new Map<string, { x: number; y: number }>();

const sheetIdFor = (n: Npc) => `characters/${n.def.id}`;

/** True if this NPC is currently sprite-backed (a sheet exists + sprites on).
 *  drawNpcSprite falls back on its own too; this is for the verification bridge. */
export function npcHasSprite(n: Npc): boolean {
  return npcSpritesEnabled && sheetInfo(sheetIdFor(n)) !== null;
}

/**
 * Draw an NPC as its PixelLab sprite. Returns false (drawing nothing) when the
 * NPC has no sheet, sprites are toggled off, or the needed frame hasn't decoded
 * — the caller then draws the code rig (which paints its own shadow). When it
 * DOES draw, it paints the same under-ellipse + cast shadow the rig would
 * (keyed to the NPC's rig.scale), then the sprite, then any prop overlay.
 */
export function drawNpcSprite(g: CanvasRenderingContext2D, n: Npc, t: number): boolean {
  if (!npcSpritesEnabled) return false;
  const sheetId = sheetIdFor(n);
  const info = sheetInfo(sheetId);
  if (!info) return false;   // no sheet for this NPC → rig

  const id = n.def.id;

  // ---- facing: movement vector while walking, stored cardinal otherwise ----
  let dir: (typeof DIR8)[number];
  if (n.moving) {
    const last = lastPos.get(id);
    const mvx = last ? n.x - last.x : 0;
    const mvy = last ? n.y - last.y : 0;
    const cur = sectorOf.get(id) ?? cardinalSector(n.facing);
    const s = nextSector(cur, mvx, mvy, SPRITE_FACING_HYSTERESIS);
    sectorOf.set(id, s);
    dir = DIR8[s]!;
  } else {
    const s = cardinalSector(n.facing);   // face the player when talked to; outward at work
    sectorOf.set(id, s);                  // keep in sync so a resumed walk starts sane
    dir = DIR8[s]!;
  }
  lastPos.set(id, { x: n.x, y: n.y });

  // ---- frame: walk cycle while moving, static rotation otherwise ----
  const key = n.moving
    ? `walk_${dir}_${walkFrame(n.dist, SPRITE_NPC_WALK_STRIDE, WALK_FRAMES)}`
    : `rot_${dir}`;
  const frame = spriteFrame(sheetId, key);
  if (!frame) return false;   // atlas not decoded yet → rig this frame (alignment matches, so no pop)

  // ---- shadow: identical to the rig's (rig.ts), so fallback doesn't pop ----
  const rs = n.def.rig.scale;
  castShadow(g, n.x, n.y + 13 * rs, 7 * rs, 13 * rs);
  const round = n.def.rig.build === "round";
  shadow(g, n.x, n.y + 13 * rs, (10 + (round ? 2 : 0)) * rs, 4.3 * rs);

  // ---- draw the sprite: cell × per-NPC scale; anchor (cx, footY) from json ----
  const sc = (SPRITE_NPC_SCALES[id] ?? 1) * SPRITE_NPC_SCALE;
  const dw = info.canvas * sc, dh = info.canvas * sc;
  const dx = n.x - info.anchor.cx * sc;
  const dy = (n.y + SPRITE_NPC_FOOT_DY * rs) - info.anchor.footY * sc;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;   // crisp pixels at every zoom
  g.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
  g.imageSmoothingEnabled = prev;

  drawNpcProps(g, n, t, rs);
  return true;
}

/** Sprite-path-only prop overlays that sell an action the static sprite can't
 *  animate. Keyed off the NPC's live pose (npc.ts), so they show only while the
 *  NPC is actually working — never while walking or being talked to. */
function drawNpcProps(g: CanvasRenderingContext2D, n: Npc, t: number, rs: number) {
  if (n.pose === "fishing" && n.def.role === "fisher-kid") {
    // Finn at the dock (faces east, over the water): a small rod from his hands.
    drawRod(g, [n.x + 5 * rs, n.y - 7 * rs], t, rs);
  } else if (n.pose === "busking" && n.def.role === "musician") {
    // Liora performing: notes drift up above her head (lute is in the sprite).
    drawMusicNotes(g, n.x, n.y - 16 * rs, t);
  }
}
