/**
 * PixelLab sprite manifest — the one place that knows which PNGs exist.
 *
 * Built for GROWTH: adding a category is "drop the PNGs under
 * src/assets/pixellab/<category>/ and rebuild" — the eager globs below pick
 * them up automatically, no code change here. Vite fingerprints + tree-shakes
 * the URLs; nothing is fetched until art/sprites.ts's loadSprites() creates the
 * Image objects at boot.
 *
 * TWO shapes coexist (both via the dual-path fallback):
 *  - LOOSE single PNGs (buildings, interior, one-off props): drawn whole by
 *    sprite(id) / drawGroundSprite(). id = path minus "./" and ".png", e.g.
 *    buildings/farmhouse, interior/hearth.
 *  - SHEET ATLASES (characters — the 10 NPCs + the player matrix): ONE
 *    <name>.sheet.png packed by scripts/packsheets.mjs, its frame map in a
 *    sibling <name>.sheet.json.
 *    Vite emits the big atlas as a single hashed file (instead of inlining
 *    dozens of sub-4KB frame PNGs as base64, which bloated the JS bundle). The
 *    atlas PNG lands in SPRITE_MANIFEST under id "<name>.sheet"; the JSON lands
 *    in SHEET_MANIFEST under the sheet id "<name>" (e.g. characters/maren, or
 *    the player look characters/matrix/matrix-female-long-rustdress).
 *    art/sprites.ts's spriteFrame(sheetId, frameName) returns a source sub-rect.
 *
 * If the folder is EMPTY (no sprite files committed), both manifests are []
 * and every sprite()/spriteFrame() lookup returns null — the game falls back to
 * its code-drawn painters everywhere (CLAUDE.md hard rule #1).
 */
const modules = import.meta.glob("./**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Eager-imported, parsed sheet frame maps (Vite parses .json for us). Keyed by
// the ".sheet.json" path; the sheet id strips that suffix.
const sheetJson = import.meta.glob("./**/*.sheet.json", {
  eager: true,
  import: "default",
}) as Record<string, SheetData>;

export interface SpriteEntry {
  id: string;
  url: string;
}

/** A packed atlas's frame map + placement metadata (scripts/packsheets.mjs). */
export interface SheetFrameRect { x: number; y: number; w: number; h: number }
export interface SheetData {
  sheet: string;                 // the atlas png filename (informational)
  canvas: number;                // per-frame cell size (px, square)
  cols: number;
  rows: number;
  dirs: string[];                // column order (south..south-west, clockwise)
  anims: Array<{ name: string; prefix: string; frames: number }>;
  anchor: { cx: number; footY: number };   // measured alpha-bbox foot anchor (cell-local px)
  frames: Record<string, SheetFrameRect>;  // frameName -> source rect in the atlas
}

export interface SheetEntry {
  id: string;         // sheet id, e.g. "characters/maren" (drives spriteFrame)
  data: SheetData;
}

export const SPRITE_MANIFEST: SpriteEntry[] = Object.entries(modules).map(
  ([path, url]) => ({
    id: path.replace(/^\.\//, "").replace(/\.png$/, ""),
    url,
  }),
);

export const SHEET_MANIFEST: SheetEntry[] = Object.entries(sheetJson).map(
  ([path, data]) => ({
    id: path.replace(/^\.\//, "").replace(/\.sheet\.json$/, ""),
    data,
  }),
);
