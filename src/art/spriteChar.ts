/**
 * Player rig-to-sprite bridge — the pose-level dual path for the heroine.
 *
 * When (a) the sprite frame is loaded, (b) the player's Character is the default
 * female heroine (spriteCoversCharacter), and (c) the current pose has sprite
 * coverage (walk / idle), the player is drawn as the PixelLab sprite; otherwise
 * the caller (art/characters.ts drawFarmer) falls back to the code rig for that
 * frame. Switching is seamless because the sprite is scaled + anchored to land
 * on the rig's exact ground line at the rig's apparent height (see the SHEET
 * constants + config knobs), so there's no pop between the two paths.
 *
 * Poses WITHOUT a generated animation (fishing, hoeing, foraging, busking,
 * sleeping) always return false here → the rig draws them, unchanged.
 */
import { spriteFrame, type SpriteFrame } from "./sprites";
import { DIR8, nextSector, walkFrame } from "./spriteFacing";
import { shadow, castShadow } from "./shapes";
import {
  SPRITE_PLAYER_SCALE, SPRITE_PLAYER_FOOT_DY, SPRITE_WALK_STRIDE,
  SPRITE_IDLE_FPS, SPRITE_FACING_HYSTERESIS,
} from "../config";
import { DEFAULT_APPEARANCE, type Character } from "../systems/meta";
import type { Outfit } from "./rig";
import type { Player } from "../entities/player";

// ---- generated-sheet geometry -------------------------------------------
// The heroine's frames now live in ONE packed atlas (characters/heroine.sheet
// .png, mapped by heroine.sheet.json — see scripts/packsheets.mjs); spriteFrame
// hands back each frame's source sub-rect, drawn with the 9-arg drawImage. The
// per-frame CELL is 84x84 with the character ≈ 42-44px tall — the SAME apparent
// height as the code rig — so these anchor constants are unchanged from the old
// loose-PNG path and the render is pixel-identical. The packer's own measured
// foot row is 64 (raw silhouette bottom); ANCHOR_Y=62 is the verified visual
// ground-contact row hand-tuned ~2px above it. Not gameplay tuning, so these
// live here with the sheet, not config.
const SHEET_ID = "characters/heroine";
const SHEET = 84;
const ANCHOR_X = 42;   // sprite column planted on player.x (= atlas cell centre)
const ANCHOR_Y = 62;   // sprite foot row planted on the ground line (verified)
const WALK_FRAMES = 6, IDLE_FRAMES = 4;

// 8-dir facing + walk-frame logic is shared with the NPC bridge (spriteFacing.ts).
let curSector = 2;          // held 8-dir facing; 2 = south (matches createPlayer dir=2)
let spriteEnabled = true;   // dev A/B toggle (__wh.spriteMode)

/** Dev bridge: force the rig path on/off for A/B comparison. */
export function setSpriteMode(on: boolean) { spriteEnabled = on; }
export function spriteModeOn(): boolean { return spriteEnabled; }

// ---- coverage: who gets the sprite --------------------------------------
// The rust-red "work dress + apron" a fresh female New Game starts on
// (charcreation OUTFITS_FEM[0]) — the sprite's exact outfit. Inlined (not
// imported from the UI layer) so the bridge stays free of UI deps; kept in
// sync with that preset. DEFAULT_APPEARANCE.outfit (the old-farmer red/blue) is
// the other accepted default — old saves + characterForPath synthesise it.
const HEROINE_DRESS: Outfit = {
  torso: "#9a4a4a", legs: "#9a4a4a", accent: "#6e3535", shoes: "#4b3a26", style: "dress",
};

function sameOutfit(a: Outfit, b: Outfit): boolean {
  return a.torso === b.torso && a.legs === b.legs
    && (a.accent ?? "") === (b.accent ?? "")
    && (a.shoes ?? "") === (b.shoes ?? "")
    && (a.style ?? "") === (b.style ?? "");
}

/**
 * Conservative v1 coverage: the sprite is the DEFAULT female heroine only.
 * Any customisation (male, or a changed hair / skin / build / hair-colour /
 * outfit) falls back to the rig (owner preference: a clean fallback over a
 * mismatched sprite). A null character (pre-creation boot / old save) is the
 * default heroine.
 */
export function spriteCoversCharacter(c: Character | null): boolean {
  if (!c) return true;
  if (c.gender !== "female") return false;
  const a = c.appearance;
  if (a.hair !== DEFAULT_APPEARANCE.hair) return false;             // straw "hat"
  if (a.skin !== DEFAULT_APPEARANCE.skin) return false;
  if (a.build !== DEFAULT_APPEARANCE.build) return false;
  if (a.hairColor !== DEFAULT_APPEARANCE.hairColor) return false;
  if ((a.hatColor ?? "") !== (DEFAULT_APPEARANCE.hatColor ?? "")) return false;
  return sameOutfit(a.outfit, DEFAULT_APPEARANCE.outfit) || sameOutfit(a.outfit, HEROINE_DRESS);
}

// ---- facing (8-dir from the movement vector, with hysteresis) -----------
/** Update + return the held 8-direction facing. Idle holds the last facing
 *  (mvx/mvy are held by the player). See spriteFacing.ts for the shared model. */
function facingDir(p: Player): (typeof DIR8)[number] {
  curSector = nextSector(curSector, p.mvx, p.mvy, SPRITE_FACING_HYSTERESIS);
  return DIR8[curSector]!;
}

// ---- draw ---------------------------------------------------------------
/**
 * Draw the player as the heroine sprite. Returns false (drawing NOTHING) when
 * the pose isn't covered or the needed frame hasn't decoded yet — the caller
 * then draws the code rig (which paints its own shadow). When it DOES draw, it
 * paints the same under-ellipse + cast shadow the rig would, beneath the sprite.
 */
export function drawPlayerSprite(g: CanvasRenderingContext2D, p: Player, t: number): boolean {
  if (!spriteEnabled) return false;
  const kind = p.pose === "walking" ? "walk" : p.pose === "idle" ? "idle" : null;
  if (!kind) return false;   // fishing / hoeing / foraging / busking / sleeping → rig

  const dir = facingDir(p);
  let frame: SpriteFrame | null;
  if (kind === "walk") {
    const f = walkFrame(p.dist, SPRITE_WALK_STRIDE, WALK_FRAMES);
    frame = spriteFrame(SHEET_ID, `walk_${dir}_${f}`);
  } else {
    const f = Math.floor(t * SPRITE_IDLE_FPS) % IDLE_FRAMES;
    frame = spriteFrame(SHEET_ID, `idle_${dir}_${f}`);
  }
  if (!frame) return false;   // atlas not decoded yet → rig this frame (alignment matches, so no pop)

  // shadows first, at the rig's ground line (mirrors rig.ts, scale s = 1)
  castShadow(g, p.x, p.y + 13, 7, 13);
  shadow(g, p.x, p.y + 13, 10, 4.3);

  const sc = SPRITE_PLAYER_SCALE;
  const dw = SHEET * sc, dh = SHEET * sc;
  const dx = p.x - ANCHOR_X * sc;
  const dy = (p.y + SPRITE_PLAYER_FOOT_DY) - ANCHOR_Y * sc;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;   // crisp pixels at every zoom
  g.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
  g.imageSmoothingEnabled = prev;
  return true;
}
