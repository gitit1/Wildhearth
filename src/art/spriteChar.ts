/**
 * Player rig-to-sprite bridge — the pose-level dual path for the heroine, now
 * across FIVE hairstyle sheets with runtime recolour of her chosen hair + dress
 * colours ("her character, her design").
 *
 * When (a) the needed sprite frame is loaded, (b) the player's look is one the
 * sprite can render faithfully (spriteCoversLook), and (c) the current pose has
 * sprite coverage (walk / idle), the player is drawn as the PixelLab sprite;
 * otherwise the caller (art/characters.ts drawFarmer) falls back to the code rig
 * for that frame (the rig wears her exact chosen colours via rigFromCharacter,
 * so an excluded look still matches her design). Switching is seamless — the
 * sprite is scaled + anchored to land on the rig's ground line at the rig's
 * apparent height (per-sheet geometry from the packed atlas + config knobs).
 *
 * HAIRSTYLE → SHEET: the creation's 5 hair ids pick the sheet (hat = the
 * original heroine sheet; bun/short/ponytail = their own; "bald" → the cropped
 * short-crop sheet, the closest hatless-minimal base). Each base is painted the
 * SAME chestnut/rust/cream identity; the player's hair + dress colours are
 * applied at runtime by recolorSheet (art/sprites.ts) — a per-region H&S replace
 * that keeps each pixel's lightness. See docs/PIXELLAB_ASSETS.md for the band
 * measurements + the honest coverage matrix (what's sprite-covered vs rig).
 *
 * Poses WITHOUT a generated animation (fishing, hoeing, foraging, busking,
 * sleeping) always return false here → the rig draws them, unchanged.
 */
import { spriteFrame, sheetInfo, recolorSheet, type SpriteImage, type RecolorBand, type RecolorOp } from "./sprites";
import { DIR8, nextSector, walkFrame, cardinalSector } from "./spriteFacing";
import { shadow, castShadow } from "./shapes";
import {
  SPRITE_PLAYER_SCALE, SPRITE_PLAYER_FOOT_DY, SPRITE_WALK_STRIDE,
  SPRITE_IDLE_FPS, SPRITE_FACING_HYSTERESIS, SPRITE_HAIRSTYLE_SCALE,
} from "../config";
import { DEFAULT_APPEARANCE, type Appearance, type Character, type Gender } from "../systems/meta";
import type { HairStyle, Outfit, Facing } from "./rig";
import type { Player } from "../entities/player";

// The subset of an Appearance the sprite path reads. RigParams (in-game) AND
// Appearance (creation preview) are both structurally assignable to it.
export type HeroLook = Pick<Appearance, "hair" | "hairColor" | "hatColor" | "skin" | "outfit">;

// ---- hairstyle → packed sheet + geometry --------------------------------
// The original heroine (hat) sheet is 84px; the 4 new hairstyle bases are 92px.
// Geometry (cell size + measured foot anchor) is read from each sheet's JSON at
// runtime (sheetInfo); only the per-sheet HAIR head-zone ceiling differs (the
// ponytail's tail hangs lower than the others, so its recolour window reaches
// further down before the boots — which share the hair's dark-brown band).
const HERO_REF_CANVAS = 84;    // the hat sheet's cell; drawn at SPRITE_PLAYER_SCALE (1.0)
const FOOT_TUNE = 2;           // visual ground-contact is ~2px above the raw silhouette bottom (hat-proven)
const WALK_FRAMES = 6, IDLE_FRAMES = 4;
const HAIR_ZONE = 0.52;        // head-zone ceiling (cell fraction) for hair recolour on bun/short/cropped

interface HeroSheet { id: string; hairYMax: number }   // hairYMax 0 = don't recolour hair (hat)
const HERO_SHEETS: Record<HairStyle, HeroSheet> = {
  hat:      { id: "characters/heroine",          hairYMax: 0 },          // straw hat hides the hair
  bun:      { id: "characters/heroine-bun",      hairYMax: HAIR_ZONE },
  short:    { id: "characters/heroine-short",    hairYMax: HAIR_ZONE },
  ponytail: { id: "characters/heroine-ponytail", hairYMax: 0.62 },       // long tail reaches ~mid-back
  bald:     { id: "characters/heroine-cropped",  hairYMax: HAIR_ZONE },  // "bald-ish" → cropped short crop
};

// ---- recolour bands (art constants; measured from the base sheets) -------
// See docs/PIXELLAB_ASSETS.md "Recolouring the heroine" for the histogram work.
// HAIR: chestnut, dark (L<0.44 separates it from the lighter freckled skin at
//   the same hue); the per-sheet nyMax head-zone keeps it off the same-hue boots.
// DRESS: rust-red, redder hue than hair/skin; L floor drops the darker boots,
//   nyMin drops the face/neck (skin-shadow shares the low hue).
// APRON: cream/tan, higher hue + light; nyMin keeps it below the face.
const HAIR_BAND: RecolorBand = { hueMin: 13, hueMax: 28, satMin: 0.30, lMin: 0.12, lMax: 0.44 };
const DRESS_BAND: RecolorBand = { hueMin: 349, hueMax: 14, satMin: 0.34, lMin: 0.25, lMax: 0.52, nyMin: 0.49 };
const APRON_BAND: RecolorBand = { hueMin: 31, hueMax: 54, satMin: 0.26, lMin: 0.50, lMax: 0.92, nyMin: 0.49 };

// The bases are painted this identity; a choice equal to it emits NO recolour op
// (raw atlas → pixel-identical to the established heroine).
const NATIVE_HAIR = "#5b3b22";                        // ≈ the baked chestnut (= DEFAULT_APPEARANCE.hairColor)
const NATIVE_DRESS_TORSOS = new Set(["#9a4a4a", "#b0432f"]);  // work-dress + legacy old-farmer red → raw sprite
// Outfit STYLES the dress-and-apron sprite renders honestly (all skirted). The
// bib-and-trousers "overalls" silhouette the sprite can't show → rig.
const COVERED_OUTFIT_STYLES = new Set(["dress", "tunic-skirt", "shawl-dress", "smock"]);

const lc = (s: string | undefined) => (s ?? "").toLowerCase();
const isNativeOutfit = (o: Outfit) => NATIVE_DRESS_TORSOS.has(lc(o.torso));

// 8-dir facing + walk-frame logic is shared with the NPC bridge (spriteFacing.ts).
let curSector = 2;          // held 8-dir facing; 2 = south (matches createPlayer dir=2)
let spriteEnabled = true;   // dev A/B toggle (__wh.spriteMode)

/** Dev bridge: force the rig path on/off for A/B comparison. */
export function setSpriteMode(on: boolean) { spriteEnabled = on; }
export function spriteModeOn(): boolean { return spriteEnabled; }

// ---- coverage: who gets the sprite --------------------------------------
/**
 * Honest coverage — the sprite renders this look faithfully (else the rig, which
 * wears her exact colours, does). Female AND a known hairstyle AND:
 *  - skin is the default tone — skin recolour is EXCLUDED (its face/hand band
 *    can't be separated from the eyes/mouth/apron cleanly; honesty over coverage);
 *  - for the hat, hair + hat colour are default (the hat hides the hair, so it
 *    isn't recoloured — a changed hair colour under a hat → rig);
 *  - the outfit is the native dress OR a skirted style the dress sprite can show
 *    (hair/dress colours ARE recoloured; build is not reflected — a known
 *    simplification, the rig honours it on fallback).
 */
export function spriteCoversLook(gender: Gender, a: Appearance): boolean {
  if (gender !== "female") return false;
  if (!HERO_SHEETS[a.hair]) return false;
  if (lc(a.skin) !== lc(DEFAULT_APPEARANCE.skin)) return false;      // skin recolour excluded
  if (a.hair === "hat") {
    if (lc(a.hairColor) !== lc(DEFAULT_APPEARANCE.hairColor)) return false;   // hat's hair isn't recoloured
    if (lc(a.hatColor) !== lc(DEFAULT_APPEARANCE.hatColor)) return false;     // straw hat isn't recoloured
  }
  return isNativeOutfit(a.outfit) || (a.outfit.style != null && COVERED_OUTFIT_STYLES.has(a.outfit.style));
}

/** A null character (pre-creation boot / old save) is the default heroine. */
export function spriteCoversCharacter(c: Character | null): boolean {
  if (!c) return true;
  return spriteCoversLook(c.gender, c.appearance);
}

// ---- recolour op assembly -----------------------------------------------
function buildOps(look: HeroLook, sheet: HeroSheet): RecolorOp[] {
  const ops: RecolorOp[] = [];
  if (sheet.hairYMax > 0 && lc(look.hairColor) !== NATIVE_HAIR)
    ops.push({ band: { ...HAIR_BAND, nyMax: sheet.hairYMax }, targetHex: look.hairColor });
  if (!isNativeOutfit(look.outfit)) {
    ops.push({ band: DRESS_BAND, targetHex: look.outfit.torso });      // primary → dress
    const apron = look.outfit.accent ?? look.outfit.legs;              // secondary → apron
    if (apron) ops.push({ band: APRON_BAND, targetHex: apron });
  }
  return ops;
}

// ---- frame resolution + placement ---------------------------------------
interface HeroFrame { img: SpriteImage; sx: number; sy: number; sw: number; sh: number }

/** The recoloured (or raw, for a default look) atlas frame, or null if the atlas
 *  hasn't decoded yet (→ the caller draws the rig; alignment matches, no pop). */
function heroFrame(sheet: HeroSheet, frameName: string, look: HeroLook): HeroFrame | null {
  const fr = spriteFrame(sheet.id, frameName);
  if (!fr) return null;
  const ops = buildOps(look, sheet);
  if (ops.length === 0) return fr;                       // default → raw atlas (pixel-identical)
  const info = sheetInfo(sheet.id);
  const rc = recolorSheet(sheet.id, fr.img, ops, info ? info.canvas : fr.sw);
  return rc ? { img: rc, sx: fr.sx, sy: fr.sy, sw: fr.sw, sh: fr.sh } : fr;
}

/** Sheet placement geometry: cell px, base world-scale, centre column + foot row. */
function heroGeometry(sheet: HeroSheet) {
  const info = sheetInfo(sheet.id);
  const cell = info ? info.canvas : HERO_REF_CANVAS;
  const baseScale = cell === HERO_REF_CANVAS ? SPRITE_PLAYER_SCALE : SPRITE_HAIRSTYLE_SCALE;
  const anchorX = cell / 2;                              // body centre = cell centre (ignores tail-skewed silhouette cx)
  const footY = (info ? info.anchor.footY : cell) - FOOT_TUNE;
  return { cell, baseScale, anchorX, footY };
}

/** Blit one resolved frame so its foot row lands on (cx, groundY), centred on
 *  cx. `viewScale` enlarges it for the creation preview (1 = in-world). */
function blitHero(g: CanvasRenderingContext2D, fr: HeroFrame, sheet: HeroSheet, cx: number, groundY: number, viewScale: number) {
  const geo = heroGeometry(sheet);
  const scale = geo.baseScale * viewScale;
  const dx = cx - geo.anchorX * scale;
  const dy = groundY - geo.footY * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;                       // crisp pixels at every zoom
  g.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, dx, dy, geo.cell * scale, geo.cell * scale);
  g.imageSmoothingEnabled = prev;
}

// ---- facing (8-dir from the movement vector, with hysteresis) -----------
function facingDir(p: Player): (typeof DIR8)[number] {
  curSector = nextSector(curSector, p.mvx, p.mvy, SPRITE_FACING_HYSTERESIS);
  return DIR8[curSector]!;
}

// ---- draw: in-world player ----------------------------------------------
/**
 * Draw the player as the heroine sprite (with her hair/dress recolours). Returns
 * false (drawing NOTHING) when the pose isn't covered or the needed frame hasn't
 * decoded yet — the caller then draws the code rig (which paints its own shadow).
 * When it DOES draw, it paints the same under-ellipse + cast shadow the rig would.
 */
export function drawPlayerSprite(g: CanvasRenderingContext2D, p: Player, t: number, look: HeroLook): boolean {
  if (!spriteEnabled) return false;
  const kind = p.pose === "walking" ? "walk" : p.pose === "idle" ? "idle" : null;
  if (!kind) return false;   // fishing / hoeing / foraging / busking / sleeping → rig
  const sheet = HERO_SHEETS[look.hair];
  if (!sheet) return false;

  const dir = facingDir(p);
  const frameName = kind === "walk"
    ? `walk_${dir}_${walkFrame(p.dist, SPRITE_WALK_STRIDE, WALK_FRAMES)}`
    : `idle_${dir}_${Math.floor(t * SPRITE_IDLE_FPS) % IDLE_FRAMES}`;

  // resolve readiness BEFORE the shadows so a not-yet-decoded frame doesn't
  // double-shadow with the rig fallback
  const fr = heroFrame(sheet, frameName, look);
  if (!fr) return false;

  castShadow(g, p.x, p.y + 13, 7, 13);
  shadow(g, p.x, p.y + 13, 10, 4.3);
  blitHero(g, fr, sheet, p.x, p.y + SPRITE_PLAYER_FOOT_DY, 1);
  return true;
}

// ---- draw: creation preview ---------------------------------------------
/**
 * Draw the heroine sprite for the Character Creation live preview — the same
 * frames + recolours the game renders, so "what she designs = what she sees".
 * `facing` is the preview's cardinal turn; idle pose, enlarged by `viewScale`.
 * Returns false if this look isn't sprite-covered or the atlas isn't ready — the
 * preview then draws the rig (which already breathes + wears her colours).
 */
export function drawHeroinePreview(
  g: CanvasRenderingContext2D, look: HeroLook, cx: number, groundY: number,
  facing: Facing, viewScale: number, t: number,
): boolean {
  const sheet = HERO_SHEETS[look.hair];
  if (!sheet) return false;
  const dir = DIR8[cardinalSector(facing)]!;
  const fr = heroFrame(sheet, `idle_${dir}_${Math.floor(t * SPRITE_IDLE_FPS) % IDLE_FRAMES}`, look);
  if (!fr) return false;
  shadow(g, cx, groundY, 12 * (viewScale / 2.5), 4.6 * (viewScale / 2.5));   // soft ground shadow so she doesn't float
  blitHero(g, fr, sheet, cx, groundY, viewScale);
  return true;
}
