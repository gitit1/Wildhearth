import type { Path } from "../systems/meta";

/**
 * The path-dependent STARTING FARM (FARM-START-1). The owner's rule: a new life
 * starts nearly broke, and only PATH-RELEVANT farm infrastructure pre-exists.
 * The universal base for every path is just the rundown house + outhouse + well
 * + birdhouse (those are drawn/collided unconditionally). Everything else — the
 * barn, a chicken coop, the garden beds, and the "established-farm" prop clutter
 * (woodpile, wheelbarrow, barrels, crates, sacks, hay, scarecrow) — is
 * MANIFEST-driven and present only when the chosen path warrants it.
 *
 * Structured like world/furniture.ts's HOME_FURNITURE: a small piece of DATA
 * that every downstream system (zones presence, collision, painters,
 * interactions, renovation) reads from, so this later feeds the buy+place /
 * build-projects feature without a rewrite. A fifth path is one more entry here.
 */
export interface FarmManifest {
  /** The barn exists (its storage chest, the "Mend the barn" repair, animal
   *  shelter). New games never start with one; a legacy save keeps its barn. */
  barn: boolean;
  /** A small rundown chicken coop stands in the yard (the Animal-Keeper's start
   *  — a visible goal marker while she saves for her first hen). */
  coop: boolean;
  /** How many garden (flower) beds exist (0..FLOWER_BEDS.length). The Farmer
   *  keeps a few rundown beds; every other path starts with none. */
  beds: number;
  /** The "established-farm" prop clutter (woodpile/wheelbarrow/barrels/crates/
   *  sacks/hay/scarecrow). Only a legacy save carries it — a new life hasn't
   *  built the farm up to that yet. */
  establishedProps: boolean;
}

/** The full count of garden beds a manifest may reference (mirrors
 *  zones.ts FLOWER_BEDS.length — kept here as a plain number to avoid a zones
 *  import cycle; asserted equal in a dev check at the zones call site). */
export const FARM_BEDS_MAX = 3;

/**
 * The per-path starting manifest. Fisher/Musician get the bare base (their
 * livelihood is world infrastructure — the lake, the busk spot). Farmer keeps a
 * few rundown garden beds to work from day one. Animal-Keeper keeps the rundown
 * coop (their first goal is buying a chicken).
 */
export const FARM_START_MANIFEST: Record<Path, FarmManifest> = {
  fisher:   { barn: false, coop: false, beds: 0, establishedProps: false },
  farmer:   { barn: false, coop: false, beds: FARM_BEDS_MAX, establishedProps: false },
  musician: { barn: false, coop: false, beds: 0, establishedProps: false },
  keeper:   { barn: false, coop: true,  beds: 0, establishedProps: false },
};

/**
 * The legacy manifest — what a pre-GP-1 save is grandfathered into: it kept its
 * barn, all three garden beds, and the full established-prop clutter (a coop
 * never existed before, so false). loadFarm falls back to this whenever the
 * stored renovation state carries no manifest field (an old save).
 */
export const LEGACY_FARM_MANIFEST: FarmManifest = {
  barn: true, coop: false, beds: FARM_BEDS_MAX, establishedProps: true,
};

export function farmManifestForPath(path: Path): FarmManifest {
  return { ...(FARM_START_MANIFEST[path] ?? FARM_START_MANIFEST.fisher) };
}

/** Junk-tolerant revive of a stored manifest (mirrors the rest of the save
 *  layer). A missing/!object value means "old save" → the legacy manifest. */
export function reviveManifest(m: unknown): FarmManifest {
  if (!m || typeof m !== "object") return { ...LEGACY_FARM_MANIFEST };
  const p = m as Partial<FarmManifest>;
  return {
    barn: !!p.barn,
    coop: !!p.coop,
    beds: typeof p.beds === "number" ? Math.max(0, Math.min(FARM_BEDS_MAX, Math.floor(p.beds))) : 0,
    establishedProps: !!p.establishedProps,
  };
}
