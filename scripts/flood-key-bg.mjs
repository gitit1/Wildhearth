// Transparency repair for PixelLab map-object PNGs that come back with an OPAQUE
// flat background (PIXELLAB_ASSETS.md failure mode #7). Border-seeded 4-connected
// flood-fill: every pixel reachable from the canvas edge whose colour is within
// TOL of the sampled corner colour is set transparent. Connected (not global) so
// it never erases interior sprite pixels that merely happen to match the bg hue.
// A light SECOND pass keys near-bg pixels adjacent to already-transparent ones,
// to nibble small enclosed pockets (airy canopy gaps) without eating the subject.
//
// Usage: node scripts/flood-key-bg.mjs <file.png> [tol=26]   (writes in place)
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const file = process.argv[2];
const TOL = Number(process.argv[3] || 26);
if (!file) { console.error("usage: flood-key-bg.mjs <file.png> [tol]"); process.exit(1); }

const p = PNG.sync.read(fs.readFileSync(file));
const { width: W, height: H, data } = p;
const bg = [data[0], data[1], data[2]];
const near = (i, tol) => Math.abs(data[i] - bg[0]) <= tol && Math.abs(data[i + 1] - bg[1]) <= tol && Math.abs(data[i + 2] - bg[2]) <= tol;

const seen = new Uint8Array(W * H);
const q = [];
for (let x = 0; x < W; x++) { q.push(x, (H - 1) * W + x); }
for (let y = 0; y < H; y++) { q.push(y * W, y * W + W - 1); }
let cleared = 0;
while (q.length) {
  const k = q.pop();
  if (seen[k]) continue; seen[k] = 1;
  const i = k << 2;
  if (data[i + 3] === 0) { /* already transparent, keep spreading */ }
  else if (near(i, TOL)) { data[i + 3] = 0; cleared++; }
  else continue;
  const x = k % W, y = (k / W) | 0;
  if (x > 0) q.push(k - 1); if (x < W - 1) q.push(k + 1);
  if (y > 0) q.push(k - W); if (y < H - 1) q.push(k + W);
}
// second pass: two dilations keying near-bg pixels touching a transparent one
for (let pass = 0; pass < 2; pass++) {
  const toClear = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, i = k << 2;
    if (data[i + 3] === 0 || !near(i, TOL - 6)) continue;
    const nb = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1];
    if (nb.some((n) => n >= 0 && data[(n << 2) + 3] === 0)) toClear.push(i);
  }
  for (const i of toClear) { data[i + 3] = 0; cleared++; }
}
fs.writeFileSync(file, PNG.sync.write(p));
console.log(`flood-key ${file}: bg=(${bg}) tol=${TOL} cleared ${cleared} px -> ${(100 * cleared / (W * H)).toFixed(1)}%`);
