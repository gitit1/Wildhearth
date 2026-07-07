/**
 * Farm-animal rig-to-sprite bridge — the livestock counterpart to
 * art/spriteNpc.ts (townsfolk) and art/spriteChar.ts (heroine). Each species
 * has its OWN packed sheet (animals/<kind>.sheet.png + .json, from
 * scripts/packsheets.mjs). Two asset shapes coexist here:
 *  - QUADRUPEDS (cow/pig/sheep): the full 8-dir rotation row + a walk cycle.
 *    The walk's frame count is read off the sheet's own `anims` entry at
 *    runtime rather than hardcoded — the cow's export happens to be 7 frames
 *    where pig/sheep are 6, and hardcoding one number (as spriteNpc.ts does,
 *    every NPC being 6) would silently mis-loop the cow.
 *  - BIRDS (hen/duck): ROTATIONS ONLY — generated as 8-directional objects
 *    with no skeleton, so there is no walk animation at all. A moving bird
 *    instead gets a small CODE-DRIVEN waddle (a ±1px y-bob + a slight tilt,
 *    keyed to the same distance accumulator every walk cycle uses) so it
 *    doesn't visually freeze mid-stride — standing in for the aliveness the
 *    code rig's own moving-vs-idle bob had.
 *
 * Frame selection (mirrors decision S2-8's "no breathing idle" for NPCs — an
 * animal that stops just stands on its static rotation frame, no separate
 * idle/graze animation):
 *  - quadruped WALKING  -> the walk cycle, keyed to the animal's distance
 *    accumulator (dist), 8-dir facing from the movement vector (hysteresis,
 *    shared with spriteFacing.ts, same as the heroine/NPC bridges).
 *  - quadruped idle/grazing, or ANY bird state -> the static rotation frame
 *    for the held facing sector (birds add the waddle on top while moving).
 *  - an animal that stops just holds whatever sector it was last walking in
 *    (no "face the player" concept the way NPCs have — grazing wherever you
 *    stopped is the natural resting pose).
 *
 * Dual-path fallback (CLAUDE.md hard rule #1): no sheet for this species (or
 * none committed at all, sprites toggled off, or the needed frame hasn't
 * decoded yet) -> returns false and the caller (art/characters.ts) draws the
 * animalRig fallback, which paints its own identical shadow. Dev A/B:
 * __wh.animalSpriteMode(false) forces all-rig.
 */
import { spriteFrame, sheetInfo } from "./sprites";
import { DIR8, nextSector, walkFrame, type Dir8 } from "./spriteFacing";
import { shadow } from "./shapes";
import {
  SPRITE_ANIMAL_SCALES, SPRITE_ANIMAL_GROUND, SPRITE_ANIMAL_WALK_STRIDE, SPRITE_FACING_HYSTERESIS,
  SPRITE_BIRD_WADDLE_AMP, SPRITE_BIRD_WADDLE_TILT, SPRITE_BIRD_WADDLE_STRIDE,
} from "../config";

const TAU = Math.PI * 2;

export type AnimalKind = "cow" | "pig" | "sheep" | "hen" | "duck";
const BIRD_KINDS: ReadonlySet<AnimalKind> = new Set(["hen", "duck"]);

let animalSpritesEnabled = true;   // dev A/B toggle (__wh.animalSpriteMode)
/** Dev bridge: force the rig path on/off for every animal (A/B comparison). */
export function setAnimalSpriteMode(on: boolean) { animalSpritesEnabled = on; }
export function animalSpriteModeOn(): boolean { return animalSpritesEnabled; }

// Per-instance held state: the 8-dir movement sector (with hysteresis) + last
// position (to derive the movement vector — animals carry no velocity field).
// Keyed by the entity object itself: unlike NPCs, a flock has no stable string
// id per bird, but each spawned instance is a stable object for its lifetime,
// so a WeakMap needs no manual cleanup (a despawned animal's entry is GC'd
// with it).
const sectorOf = new WeakMap<object, number>();
const lastPos = new WeakMap<object, { x: number; y: number }>();

const sheetIdFor = (kind: AnimalKind) => `animals/${kind}`;

/** True if this species is currently sprite-backed (a sheet exists + sprites
 *  are on) — used only by the verification bridge, mirrors npcHasSprite. */
export function animalHasSprite(kind: AnimalKind): boolean {
  return animalSpritesEnabled && sheetInfo(sheetIdFor(kind)) !== null;
}

/** The minimal shape every animal entity (Cow/Hen/Duck/Pig/Sheep,
 *  entities/animals.ts) already satisfies. */
export interface AnimalLike { x: number; y: number; dist: number; moving: boolean }

/**
 * Draw one animal as its PixelLab sprite. Returns false (drawing nothing) when
 * the species has no sheet, sprites are toggled off, or the needed frame
 * hasn't decoded — the caller then draws the code rig (art/characters.ts),
 * which paints its own shadow. When it DOES draw, it paints the same
 * under-shadow ellipse the rig would (SPRITE_ANIMAL_GROUND mirrors
 * art/animalRig.ts's own drawQuadruped/drawBird shadow() call), then the
 * sprite frame (+ the waddle transform for a moving bird).
 */
export function drawAnimalSprite(g: CanvasRenderingContext2D, kind: AnimalKind, a: AnimalLike): boolean {
  if (!animalSpritesEnabled) return false;
  const sheetId = sheetIdFor(kind);
  const info = sheetInfo(sheetId);
  if (!info) return false;   // no sheet for this species -> rig

  // ---- facing: movement vector while moving, held sector otherwise ----
  const last = lastPos.get(a);
  const mvx = last ? a.x - last.x : 0;
  const mvy = last ? a.y - last.y : 0;
  const cur = sectorOf.get(a) ?? 2;   // default south, before any movement is observed
  const sector = a.moving ? nextSector(cur, mvx, mvy, SPRITE_FACING_HYSTERESIS) : cur;
  sectorOf.set(a, sector);
  lastPos.set(a, { x: a.x, y: a.y });
  const dir: Dir8 = DIR8[sector]!;

  const isBird = BIRD_KINDS.has(kind);

  // ---- frame: walk cycle (quadrupeds only — birds have no walk frames) ----
  let key = `rot_${dir}`;
  if (a.moving && !isBird) {
    const walkAnim = info.anims.find((an) => an.prefix === "walk");
    if (walkAnim) key = `walk_${dir}_${walkFrame(a.dist, SPRITE_ANIMAL_WALK_STRIDE, walkAnim.frames)}`;
  }
  const frame = spriteFrame(sheetId, key);
  if (!frame) return false;   // atlas not decoded yet -> rig this frame (alignment matches, so no pop)

  // ---- shadow: identical to the rig's (art/animalRig.ts), so fallback doesn't pop ----
  const gnd = SPRITE_ANIMAL_GROUND[kind];
  shadow(g, a.x, a.y + gnd.dy, gnd.rx, gnd.ry);

  // ---- draw the sprite: cell x per-species scale; anchor (cx, footY) from json ----
  const sc = SPRITE_ANIMAL_SCALES[kind];
  const dw = info.canvas * sc, dh = info.canvas * sc;
  const dx = a.x - info.anchor.cx * sc;
  const dy = (a.y + gnd.dy) - info.anchor.footY * sc;

  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  if (isBird && a.moving) {
    // no walk frames exist for birds — a small waddle (bob + tilt) keyed to
    // distance, same phase model every other walk cycle here uses, so it
    // always matches actual travel rather than wall-clock time.
    const phase = (a.dist / SPRITE_BIRD_WADDLE_STRIDE) * TAU;
    const bob = Math.sin(phase) * SPRITE_BIRD_WADDLE_AMP;
    const tilt = Math.sin(phase) * SPRITE_BIRD_WADDLE_TILT;
    const groundY = a.y + gnd.dy;
    g.save();
    g.translate(a.x, groundY);
    g.rotate(tilt);
    g.translate(-a.x, -groundY);
    g.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy + bob, dw, dh);
    g.restore();
  } else {
    g.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
  }
  g.imageSmoothingEnabled = prev;

  return true;
}
