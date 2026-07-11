/**
 * Player sprite bridge — the CURATED MATRIX look (R1, the product owner's top
 * ask). The player picks gender × body size(S/M/L) × hairstyle(5) × outfit(5) +
 * a hair shade(3); that selection resolves one of the 150 generated combo sheets
 * (src/assets/pixellab/characters/matrix/matrix-<gender>[-<size>]-<hair>-<outfit>,
 * medium unsuffixed for back-compat). The
 * baked hair is a KEYED VIVID PURPLE, recoloured at runtime to a natural shade
 * (warm brown / golden blonde / espresso) via recolorSheet — audited zero bleed
 * into the outfit/skin, so raw purple never reaches the screen.
 *
 * This replaces the code rig as the SHIPPED player look. The rig stays the
 * automatic zero-PNG fallback (CLAUDE.md hard rule #1): whenever the needed
 * matrix frame isn't loaded (or no matrix PNGs are committed at all), or the
 * pose has no sprite coverage (fishing/hoeing/foraging/busking/sleeping),
 * drawPlayerSprite returns false and the caller (art/characters.ts drawFarmer)
 * draws the rig for that frame — planted on the same ground line, so switching
 * is seamless.
 *
 * The matrix resolves the owner's three complaints by construction: baked
 * sprites have no long profile nose, male and female are distinct characters,
 * and hair is painted into the sprite (never drawn in front of the body).
 *
 * Skin tone: shipped "coming soon". The H&S recolour preserves each pixel's
 * lightness by design, so it can only shift skin hue/saturation — it cannot
 * darken a light-peach base into a deeper tone (verified R1). See
 * SPRITE_MATRIX_SKIN in config.ts.
 */
import { spriteFrame, sheetInfo, recolorSheet, type SpriteImage, type RecolorBand, type RecolorOp } from "./sprites";
import { walkFrame } from "./spriteFacing";
import { shadow, castShadow } from "./shapes";
import {
  SPRITE_MATRIX_SCALE, SPRITE_PLAYER_FOOT_DY, SPRITE_WALK_STRIDE,
  CHARACTER_SPRITES_PRIMARY, SPRITE_MATRIX_SKIN,
} from "../config";
import { type Appearance, type BodySize, type Character, type Gender, type MatrixHair } from "../systems/meta";
import { drawRod, drawHoe, drawLute, drawBasket, type Facing, type PoseName } from "./rig";
import type { Player } from "../entities/player";

// ---- creator option tables (exported for ui/charcreation.ts) --------------
export const MATRIX_HAIRS: Array<{ id: MatrixHair; label: string }> = [
  { id: "long", label: "Long" },
  { id: "short", label: "Short" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "cropped", label: "Cropped" },
];
/** Outfit keys, per gender, in generated order. The key is the folder suffix in
 *  the matrix sheet name; the label is what the creator shows. */
export const MATRIX_OUTFITS: Record<Gender, Array<{ id: string; label: string }>> = {
  female: [
    { id: "rustdress", label: "Rust dress + apron" },
    { id: "greentunic", label: "Green tunic + skirt" },
    { id: "overalls", label: "Denim overalls" },
    { id: "smock", label: "Beige smock" },
    { id: "coat", label: "Brown coat" },
  ],
  male: [
    { id: "tunic", label: "Belted jerkin" },
    { id: "overalls", label: "Denim overalls" },
    { id: "vest", label: "Leather vest" },
    { id: "smock", label: "Beige smock" },
    { id: "coat", label: "Brown coat" },
  ],
};
/** The 3 natural hair shades the keyed purple recolours to (kept warm to fit the
 *  cozy palette). Index stored as Appearance.hairShade. */
export const HAIR_SHADES: Array<{ id: string; label: string; hex: string }> = [
  { id: "brown", label: "Warm brown", hex: "#6e4a2b" },
  { id: "blonde", label: "Golden blonde", hex: "#c99a45" },
  { id: "espresso", label: "Espresso", hex: "#241c16" },
];

// Combos to EXCLUDE (creator hides them → rig fallback). None after the R1
// supervisor re-check: male/ponytail-tunic reads as a clothed sleeveless jerkin,
// not bare-chested, and is coherent across all tunic combos.
const EXCLUDED = new Set<string>([]);

// ---- geometry -------------------------------------------------------------
const MATRIX_REF_CANVAS = 68;   // fallback cell size if the json isn't present
const FOOT_TUNE = 2;            // visual ground-contact ~2px above the raw silhouette bottom
const WALK_FRAMES = 6;

// Keyed vivid-purple hair → the chosen natural shade (hue window 240–300, sat
// floor 0.35; audited to catch ONLY hair — zero outfit/skin bleed). Lightness
// preserved, so shading survives.
const PURPLE_BAND: RecolorBand = { hueMin: 240, hueMax: 300, satMin: 0.35 };
// The narrow phase-2 SMALL builds antialias into DESATURATED violet-magenta hair
// edges (hue ~255–305, sat ~0.20–0.35) the primary band misses — leaking raw
// purple on-screen. This second band mops them up. The hue floor is raised to
// 255 so blue denim overalls (hue ~222) stay untouched; only hair reaches this
// hue range (no matrix outfit is violet — measured across all 150 sheets).
const PURPLE_BAND_SOFT: RecolorBand = { hueMin: 255, hueMax: 305, satMin: 0.20 };

// ---- current player look (set by main.ts on boot + New Game) --------------
// RigParams (passed to drawFarmer) can't carry the matrix selection, so the
// live player look is held here, mirroring how the sprite bridges already hold
// module state (facing sectors etc.).
let playerGender: Gender = "female";
let playerAppear: Appearance | null = null;
export function setPlayerLook(gender: Gender, a: Appearance) { playerGender = gender; playerAppear = a; }

// Default from the locked render mode (config): true = matrix-primary. Dev
// __wh.spriteMode(false) forces the rig live for A/B.
let spriteEnabled = CHARACTER_SPRITES_PRIMARY;
export function setSpriteMode(on: boolean) { spriteEnabled = on; }
export function spriteModeOn(): boolean { return spriteEnabled; }

// ---- selection → sheet resolution -----------------------------------------
const MATRIX_HAIR_IDS = MATRIX_HAIRS.map((h) => h.id);
function hairFor(a: Appearance): MatrixHair {
  return MATRIX_HAIR_IDS.includes(a.matrixHair) ? a.matrixHair : "long";
}
/** The chosen outfit key, snapped to the gender's list (so an outfit key from
 *  the other gender — e.g. after a save's gender flips — resolves sanely). */
function outfitFor(gender: Gender, a: Appearance): string {
  const list = MATRIX_OUTFITS[gender];
  return list.some((o) => o.id === a.matrixOutfit) ? a.matrixOutfit : list[0]!.id;
}
const comboKey = (gender: Gender, hair: string, outfit: string) => `${gender}/${hair}-${outfit}`;
// Body-size axis → sheet-name suffix. MEDIUM stays UNSUFFIXED so phase-1 sheet
// names + old saves' looks resolve unchanged; S/L map to the phase-2 batches
// (matrix-<gender>-small-… / matrix-<gender>-large-…). Any junk size → "M".
const SIZE_SUFFIX: Record<BodySize, string> = { S: "-small", M: "", L: "-large" };
function sizeFor(a: Appearance): BodySize {
  return a.bodySize === "S" || a.bodySize === "L" ? a.bodySize : "M";
}
const matrixSheetId = (gender: Gender, size: BodySize, hair: string, outfit: string) =>
  `characters/matrix/matrix-${gender}${SIZE_SUFFIX[size]}-${hair}-${outfit}`;

// ---- coverage: does the matrix render this look? --------------------------
/**
 * True when the matrix can render this (gender, selection): matrix mode is on,
 * the combo isn't excluded, and its sheet is present in the build. The atlas PNG
 * may still be decoding — drawPlayerSprite handles that per-frame (→ rig), so
 * this only gates on the sheet EXISTING (present in the manifest = shippable).
 * With zero matrix PNGs committed, sheetInfo is null → false → the rig draws.
 */
export function spriteCoversLook(gender: Gender, a: Appearance): boolean {
  if (!spriteEnabled) return false;
  const hair = hairFor(a), outfit = outfitFor(gender, a);
  if (EXCLUDED.has(comboKey(gender, hair, outfit))) return false;
  return sheetInfo(matrixSheetId(gender, sizeFor(a), hair, outfit)) !== null;
}

/** A null character (pre-creation boot / old save) → the default matrix look. */
export function spriteCoversCharacter(c: Character | null): boolean {
  if (!c) return spriteEnabled && sheetInfo(matrixSheetId("female", "M", "long", "rustdress")) !== null;
  return spriteCoversLook(c.gender, c.appearance);
}

// ---- recolour op assembly -------------------------------------------------
function buildOps(a: Appearance): RecolorOp[] {
  const shade = HAIR_SHADES[Math.max(0, Math.min(HAIR_SHADES.length - 1, a.hairShade))] ?? HAIR_SHADES[0]!;
  // always — purple must never show (two bands: saturated core + desaturated edges)
  const ops: RecolorOp[] = [
    { band: PURPLE_BAND, targetHex: shade.hex },
    { band: PURPLE_BAND_SOFT, targetHex: shade.hex },
  ];
  if (SPRITE_MATRIX_SKIN && a.skinTone > 0) {
    // (disabled today — the mechanism can't darken skin; kept for a future
    // lightness-aware remap. Band left intentionally unused.)
  }
  return ops;
}

// ---- frame resolution + placement -----------------------------------------
interface MatrixFrame { img: SpriteImage; sx: number; sy: number; sw: number; sh: number }

/** The recoloured atlas frame, or null if the atlas hasn't decoded yet (→ the
 *  caller draws the rig; alignment matches, so no pop). */
function matrixFrame(sheetId: string, frameName: string, a: Appearance): MatrixFrame | null {
  const fr = spriteFrame(sheetId, frameName);
  if (!fr) return null;
  const info = sheetInfo(sheetId);
  const rc = recolorSheet(sheetId, fr.img, buildOps(a), info ? info.canvas : fr.sw);
  return rc ? { img: rc, sx: fr.sx, sy: fr.sy, sw: fr.sw, sh: fr.sh } : fr;
}

/** Sheet placement geometry: cell px + centre column + foot row. */
function geometry(sheetId: string) {
  const info = sheetInfo(sheetId);
  const cell = info ? info.canvas : MATRIX_REF_CANVAS;
  const anchorX = cell / 2;                                 // body centre = cell centre (matrix chars are centred)
  const footY = (info ? info.anchor.footY : cell) - FOOT_TUNE;
  return { cell, anchorX, footY };
}

/** Blit one resolved frame so its foot row lands on (cx, groundY), centred on
 *  cx. `viewScale` enlarges it for the creation preview (1 = in-world). */
function blitMatrix(g: CanvasRenderingContext2D, fr: MatrixFrame, sheetId: string, cx: number, groundY: number, viewScale: number) {
  const geo = geometry(sheetId);
  const scale = SPRITE_MATRIX_SCALE * viewScale;
  const dx = cx - geo.anchorX * scale;
  const dy = groundY - geo.footY * scale;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;                          // crisp pixels at every zoom
  g.drawImage(fr.img, fr.sx, fr.sy, fr.sw, fr.sh, dx, dy, geo.cell * scale, geo.cell * scale);
  g.imageSmoothingEnabled = prev;
}

// ---- facing: the matrix is 4-dir; the player's own cardinal `dir` snaps it ---
// (up 0 → north, right 1 → east, down 2 → south, left 3 → west). Using p.dir —
// already resolved from the movement vector with a horizontal/vertical tiebreak
// — is the graceful 4-dir snap the 8-dir sheets don't need here.
const DIR4: Record<0 | 1 | 2 | 3, "north" | "east" | "south" | "west"> =
  { 0: "north", 1: "east", 2: "south", 3: "west" };

// ---- action poses: the sprite stays HER, code tools overlay ---------------
// The owner's complaint: performing an action (fishing/hoeing/foraging/busking)
// dropped her CHOSEN sprite to the code rig — an identity swap mid-play. The fix
// (this section): during an action she stays her matrix sprite (the facing's
// static rotation frame) with (a) a subtle code-driven action RHYTHM — a small
// bob/dip/lean keyed to the SAME timers the rig's poseLimbs use — and (b) the
// existing code tool painters (drawRod/drawHoe/drawLute/drawBasket) drawn over
// the sprite at hand-appropriate anchors. This mirrors the proven NPC precedent
// (art/spriteNpc.ts drawNpcProps: Finn's static sprite + a code rod). The rig is
// still the zero-PNG fallback — never an identity swap.
//
// Anchors are expressed in world px UP from the sprite's foot line (negative y =
// up, matching the canvas after we translate to the foot). They're tuned to the
// ~48px-tall matrix silhouette, not the shorter rig, so they read on the sprite.
const ACTION_POSES = new Set<PoseName>(["fishing", "hoeing", "foraging", "busking", "talking"]);
const TOOL_S = 1.0;              // tool painters were tuned at rig scale 1; the sprite footprint matches closely
// hand/anchor heights above the foot line (world px)
const A_FISH_HAND: [number, number] = [7, -19];    // rod grip: forward, chest height
const A_HOE_TOP: [number, number]   = [4, -24];    // upper grip (near chest)
const A_HOE_BOT_X = 11, A_HOE_BOT_Y = -15;         // lower grip (forward hip), dips on the swing
const A_FORAGE_HAND: [number, number] = [9, -13];  // basket at the hip, forward
const A_LUTE: [number, number] = [2, -23];         // lute body across the lower chest

/** Draw the action rhythm + tool over the already-resolved sprite frame. The
 *  sprite itself is blitted here (swayed/dipped by the pose's rhythm) so the
 *  tool anchors track the body. `t` is wall-clock seconds — the same clock the
 *  rig's poseLimbs read, so the cadence matches the rig fallback. */
function drawActionSprite(
  g: CanvasRenderingContext2D, p: Player, fr: MatrixFrame, sheetId: string, pose: PoseName, t: number,
) {
  const footY = p.y + SPRITE_PLAYER_FOOT_DY;
  const fwd = p.dir === 3 ? -1 : 1;   // west faces left → mirror the tool

  // body rhythm: a small offset keyed to the pose's own beat (matches the rig)
  let dx = 0, dy = 0;
  switch (pose) {
    case "fishing":  dy = Math.sin(t * 2) * 0.5; break;                       // gentle rod bob
    case "hoeing":   dy = Math.max(0, Math.sin(t * 4.2)) * 2.4; break;        // dip on the down-swing
    case "foraging": dy = 1.8 + Math.sin(t * 3) * 0.4; break;                 // stooped, small dig
    case "busking":  dx = Math.sin(t * 2) * 1.4; break;                       // sway to the tune
    case "talking":  dy = Math.sin(t * 2) * 0.5; break;                       // idle-ish (player never poses this; safe)
  }
  const bx = p.x + dx;
  blitMatrix(g, fr, sheetId, bx, footY + dy, 1);

  // tools drawn over the sprite, mirrored for a west facing
  g.save();
  g.translate(bx, footY + dy);
  g.scale(fwd, 1);
  switch (pose) {
    case "fishing":
      drawRod(g, A_FISH_HAND, t, TOOL_S);
      break;
    case "hoeing": {
      const down = Math.max(0, Math.sin(t * 4.2));
      drawHoe(g, [A_HOE_BOT_X, A_HOE_BOT_Y + down * 10], A_HOE_TOP, TOOL_S);
      break;
    }
    case "foraging":
      drawBasket(g, [A_FORAGE_HAND[0], A_FORAGE_HAND[1] + Math.sin(t * 3) * 1.0], TOOL_S);
      break;
    case "busking":
      drawLute(g, A_LUTE[0], A_LUTE[1], TOOL_S);   // music notes are drawn by main.ts while busking
      break;
    // talking → no tool
  }
  g.restore();
}

// ---- draw: in-world player ------------------------------------------------
/**
 * Draw the player from her chosen matrix combo (hair recoloured). Returns false
 * (drawing NOTHING) when matrix mode is off, the look isn't covered, or the
 * needed frame hasn't decoded yet — the caller then draws the code rig (which
 * paints its own shadow). When it DOES draw, it paints the same under-ellipse +
 * cast shadow the rig would.
 *
 * Walk/idle use the walk cycle / static rotation. ACTION poses (fishing /
 * hoeing / foraging / busking / talking) ALSO stay the sprite — the facing's
 * rotation frame + a code action rhythm + a code tool overlay (drawActionSprite)
 * — so the player never turns into the rig mid-action (the owner's complaint).
 * Only a pose with NO sprite handling (e.g. sleeping, which the player never
 * enters) or an undecoded frame still falls through to the rig.
 */
export function drawPlayerSprite(g: CanvasRenderingContext2D, p: Player, t: number): boolean {
  if (!spriteEnabled || !playerAppear) return false;
  const a = playerAppear, gender = playerGender;
  if (!spriteCoversLook(gender, a)) return false;
  const isWalk = p.pose === "walking";
  const isAction = ACTION_POSES.has(p.pose);
  if (!isWalk && p.pose !== "idle" && !isAction) return false;   // sleeping etc. → rig

  const sheetId = matrixSheetId(gender, sizeFor(a), hairFor(a), outfitFor(gender, a));
  const dir = DIR4[p.dir];
  const frameName = isWalk
    ? `walk_${dir}_${walkFrame(p.dist, SPRITE_WALK_STRIDE, WALK_FRAMES)}`
    : `rot_${dir}`;   // no baked idle/action → the static rotation stands in

  // resolve readiness BEFORE the shadows so a not-yet-decoded frame doesn't
  // double-shadow with the rig fallback
  const fr = matrixFrame(sheetId, frameName, a);
  if (!fr) return false;

  castShadow(g, p.x, p.y + 13, 7, 13);
  shadow(g, p.x, p.y + 13, 10, 4.3);
  if (isAction) drawActionSprite(g, p, fr, sheetId, p.pose, t);
  else blitMatrix(g, fr, sheetId, p.x, p.y + SPRITE_PLAYER_FOOT_DY, 1);
  return true;
}

// ---- draw: creation preview -----------------------------------------------
/**
 * Draw the matrix sprite for the Character Creation live preview — the same
 * frame + recolour the game renders, so "what she designs = what she sees".
 * `facing` is the preview's cardinal turn; static rotation, enlarged by
 * `viewScale`. Returns false if this look isn't covered or the atlas isn't ready
 * — the preview then draws the rig.
 */
export function drawHeroinePreview(
  g: CanvasRenderingContext2D, gender: Gender, a: Appearance, cx: number, groundY: number,
  facing: Facing, viewScale: number, _t: number,
): boolean {
  if (!spriteCoversLook(gender, a)) return false;
  const sheetId = matrixSheetId(gender, sizeFor(a), hairFor(a), outfitFor(gender, a));
  const fr = matrixFrame(sheetId, `rot_${DIR4[facing]}`, a);
  if (!fr) return false;
  shadow(g, cx, groundY, 12 * (viewScale / 2.5), 4.6 * (viewScale / 2.5));   // soft ground shadow so she doesn't float
  blitMatrix(g, fr, sheetId, cx, groundY, viewScale);
  return true;
}
