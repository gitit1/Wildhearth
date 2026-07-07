/**
 * PixelLab sprite manifest — the one place that knows which PNGs exist.
 *
 * Built for GROWTH: adding a category is "drop the PNGs under
 * src/assets/pixellab/<category>/ and rebuild" — the eager URL glob below picks
 * them up automatically, no code change here. Vite fingerprints + tree-shakes
 * the URLs; nothing is fetched until art/sprites.ts's loadSprites() creates the
 * Image objects at boot.
 *
 * Each PNG's id is its path under this folder, minus the leading "./" and the
 * ".png" — e.g.
 *   characters/heroine/rot_south           characters/heroine/walk_south_0
 *   characters/heroine/idle_south_0         buildings/farmhouse
 *   buildings/barn                          interior/hearth
 *
 * If the folder is EMPTY (no sprite files committed), SPRITE_MANIFEST is []
 * and every sprite() lookup returns null — the game falls back to its
 * code-drawn painters everywhere (CLAUDE.md hard rule #1).
 */
const modules = import.meta.glob("./**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export interface SpriteEntry {
  id: string;
  url: string;
}

export const SPRITE_MANIFEST: SpriteEntry[] = Object.entries(modules).map(
  ([path, url]) => ({
    id: path.replace(/^\.\//, "").replace(/\.png$/, ""),
    url,
  }),
);
