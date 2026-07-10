import { META_KEY } from "../config";
import type { HairStyle, BodyBuild, Outfit, OutfitStyle } from "../art/rig";

/**
 * Playthrough meta — one-time origin facts chosen at New Game (Character
 * Creation), kept so the game can remember *who* this life began as even after
 * the effects of that choice (the kit in the bag, the seeded skill) have long
 * since changed. Versioned and junk-tolerant like every other store.
 *
 * `starterTool` is kept in sync with the chosen path (rod/hoe/lute/pot) so the
 * older systems that already read it (the first-tip, the fishing/farming tool
 * gates) keep working unchanged; `character` is the full identity the
 * Character Creation screen writes. Old saves (pre-character) synthesize a
 * default character on load, derived from their starterTool, so downstream code
 * (the player's rig, the Aspiration life-goal) always has one to read.
 */

export type StarterTool = "hoe" | "rod" | "lute" | "pot";
export type Gender = "female" | "male";
/** Curated-matrix hairstyle (art/spriteChar.ts). The 5 generated hair shapes;
 *  distinct from the rig's HairStyle (which the code fallback still uses). */
export type MatrixHair = "long" | "short" | "ponytail" | "bun" | "cropped";
/** Reserved body-size axis. Only "M" (medium) has a generated matrix today;
 *  "S"/"L" are shown "coming soon" in the creator until their combos exist. */
export type BodySize = "S" | "M" | "L";
export type Path = "fisher" | "farmer" | "musician" | "keeper";
export type LifeGoal = "family" | "independence" | "community" | "mastery" | "fortune";

/** The rig-relevant subset the creation screen sets — everything drawRig needs
 *  to paint an individual, minus the fixed v1 values (scale 1, adult profile,
 *  neutral limb lengths). */
export interface Appearance {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  hatColor?: string;       // used when hair === "hat"
  eyeColor?: string;       // iris colour (rig default warm brown when unset)
  build: BodyBuild;
  outfit: Outfit;
  // --- curated-matrix selection (the shipped sprite look; the rig fields above
  //     stay as the zero-PNG fallback's data). See art/spriteChar.ts. ---
  matrixHair: MatrixHair;  // one of the 5 generated hairstyles
  matrixOutfit: string;    // outfit key within the gender (rustdress.. / tunic..)
  hairShade: number;       // 0..2 → warm-brown / golden-blonde / espresso recolour
  skinTone: number;        // reserved (creator shows "coming soon"; see SPRITE_MATRIX_SKIN)
  bodySize: BodySize;      // reserved ("M" only today; S/L "coming soon")
}

/** Identity + look, collected on the first screen (before the path/goal one). */
export interface CharacterIdentity {
  firstName: string;
  lastName: string;
  nickname?: string;
  age: number;             // 18-70, stored as the chosen number
  gender: Gender;
  appearance: Appearance;
}

/** The full character: identity + the path & life-goal chosen after the reveal. */
export interface Character extends CharacterIdentity {
  path: Path;
  lifeGoal: LifeGoal;
}

export interface Meta {
  version: number;
  starterTool: StarterTool | null;
  character: Character | null;
}

/** The established straw-hat farmer look — the fallback for old saves and the
 *  seed the rig derives DEFAULT_PLAYER_RIG from (entities/player.ts). */
export const DEFAULT_APPEARANCE: Appearance = {
  skin: "#e8b48a",
  hair: "hat",
  hairColor: "#5b3b22",
  hatColor: "#e0be5c",
  eyeColor: "#4a3520",     // the rig's default warm brown, made explicit
  build: "average",
  outfit: { torso: "#b0432f", legs: "#4a5d8a", accent: "#7a3020", shoes: "#4b3a26" },
  matrixHair: "long",
  matrixOutfit: "rustdress",   // female default combo; resolver snaps to the gender's list
  hairShade: 0,                // warm brown
  skinTone: 0,
  bodySize: "M",
};

const NAME_MAX = 16;
const PATH_TOOL: Record<Path, StarterTool> = {
  fisher: "rod", farmer: "hoe", musician: "lute", keeper: "pot",
};
const TOOL_PATH: Record<StarterTool, Path> = {
  rod: "fisher", hoe: "farmer", lute: "musician", pot: "keeper",
};

const isTool = (v: unknown): v is StarterTool =>
  v === "hoe" || v === "rod" || v === "lute" || v === "pot";
const isPath = (v: unknown): v is Path =>
  v === "fisher" || v === "farmer" || v === "musician" || v === "keeper";
const isGoal = (v: unknown): v is LifeGoal =>
  v === "family" || v === "independence" || v === "community" || v === "mastery" || v === "fortune";
const isHair = (v: unknown): v is HairStyle =>
  v === "short" || v === "ponytail" || v === "bun" || v === "bald" || v === "hat" || v === "long";
const isBuild = (v: unknown): v is BodyBuild =>
  v === "slim" || v === "average" || v === "round";
const isMatrixHair = (v: unknown): v is MatrixHair =>
  v === "long" || v === "short" || v === "ponytail" || v === "bun" || v === "cropped";
const clampIdx = (v: unknown, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : fallback;
const isOutfitStyle = (v: unknown): v is OutfitStyle =>
  v === "dress" || v === "tunic-skirt" || v === "overalls" || v === "shawl-dress" ||
  v === "smock" || v === "tunic-belt" || v === "vest" || v === "coat";

const str = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() ? v.slice(0, NAME_MAX) : fallback;
const clampAge = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(18, Math.min(70, Math.round(v))) : 25;

function cloneAppearance(a: Appearance): Appearance {
  return { ...a, outfit: { ...a.outfit } };
}

function reviveAppearance(a: Partial<Appearance> | undefined): Appearance {
  if (!a || typeof a !== "object") return cloneAppearance(DEFAULT_APPEARANCE);
  const o = (a.outfit && typeof a.outfit === "object" ? a.outfit : DEFAULT_APPEARANCE.outfit) as Partial<Outfit>;
  return {
    skin: str(a.skin, DEFAULT_APPEARANCE.skin),
    hair: isHair(a.hair) ? a.hair : DEFAULT_APPEARANCE.hair,
    hairColor: str(a.hairColor, DEFAULT_APPEARANCE.hairColor),
    hatColor: typeof a.hatColor === "string" ? a.hatColor : DEFAULT_APPEARANCE.hatColor,
    eyeColor: typeof a.eyeColor === "string" ? a.eyeColor : DEFAULT_APPEARANCE.eyeColor,
    build: isBuild(a.build) ? a.build : DEFAULT_APPEARANCE.build,
    outfit: {
      torso: str(o.torso, DEFAULT_APPEARANCE.outfit.torso),
      legs: str(o.legs, DEFAULT_APPEARANCE.outfit.legs),
      accent: typeof o.accent === "string" ? o.accent : DEFAULT_APPEARANCE.outfit.accent,
      shoes: typeof o.shoes === "string" ? o.shoes : DEFAULT_APPEARANCE.outfit.shoes,
      torsoStyle: typeof o.torsoStyle === "number" ? o.torsoStyle : undefined,
      legStyle: typeof o.legStyle === "number" ? o.legStyle : undefined,
      style: isOutfitStyle(o.style) ? o.style : undefined,
      sleeve: typeof o.sleeve === "string" ? o.sleeve : undefined,
    },
    matrixHair: isMatrixHair(a.matrixHair) ? a.matrixHair : DEFAULT_APPEARANCE.matrixHair,
    matrixOutfit: typeof a.matrixOutfit === "string" ? a.matrixOutfit : DEFAULT_APPEARANCE.matrixOutfit,
    hairShade: clampIdx(a.hairShade, 2, DEFAULT_APPEARANCE.hairShade),
    skinTone: clampIdx(a.skinTone, 4, DEFAULT_APPEARANCE.skinTone),
    bodySize: a.bodySize === "S" || a.bodySize === "L" ? a.bodySize : "M",
  };
}

/** A default character for a chosen path — used by the dev bridge and as the
 *  shape old saves are backfilled into. */
export function characterForPath(path: Path): Character {
  return {
    firstName: "Robin", lastName: "Vale", age: 25, gender: "female",
    appearance: cloneAppearance(DEFAULT_APPEARANCE), path, lifeGoal: "independence",
  };
}

/** Synthesize a full character from an old save's lone starter tool. */
function synthCharacter(tool: StarterTool): Character {
  return characterForPath(TOOL_PATH[tool] ?? "fisher");
}

function reviveCharacter(c: Partial<Character> | undefined, tool: StarterTool | null): Character | null {
  if (c && typeof c === "object" && isPath(c.path)) {
    const nick = typeof c.nickname === "string" && c.nickname.trim()
      ? c.nickname.slice(0, NAME_MAX) : undefined;
    return {
      firstName: str(c.firstName, "Robin"),
      lastName: str(c.lastName, "Vale"),
      ...(nick ? { nickname: nick } : {}),
      age: clampAge(c.age),
      gender: c.gender === "male" ? "male" : "female",
      appearance: reviveAppearance(c.appearance),
      path: c.path,
      lifeGoal: isGoal(c.lifeGoal) ? c.lifeGoal : "independence",
    };
  }
  // old save (pre-character): backfill from the starter tool so the rig and the
  // Aspiration life-goal always have a character to read
  return tool ? synthCharacter(tool) : null;
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { version: 1, starterTool: null, character: null };
    const d = JSON.parse(raw) as Partial<Meta> & { character?: Partial<Character> };
    const starterTool = isTool(d.starterTool) ? d.starterTool : null;
    return { version: 1, starterTool, character: reviveCharacter(d.character, starterTool) };
  } catch {
    return { version: 1, starterTool: null, character: null };
  }
}

export function saveMeta(m: Meta) {
  // keep starterTool coherent with the character's path even if a caller only
  // set one of the two
  const starterTool = m.character ? PATH_TOOL[m.character.path] : m.starterTool;
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ version: 1, starterTool, character: m.character }));
  } catch { /* private mode */ }
}
