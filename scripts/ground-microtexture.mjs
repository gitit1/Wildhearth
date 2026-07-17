// W2b Part 0.2 — GROUND MICRO-TEXTURE RESTORE (fidelity match, 0 gens).
//
// The W1.1 tone-normalize (scratchpad normalize.mjs: flatten = remove macro
// low-pass; furrow = dampen residual ×0.65) killed the several-tile "quilt" of
// macro tone patches — good — but over-flattened the tiles' painterly WITHIN-tile
// grain, so at gameplay zoom the ground reads less "drawn" than the (now
// grid-aligned) buildings sitting on it. This restores subtle micro-contrast
// WITHOUT bringing the quilt back: per tile, split into macro (a toroidal
// low-pass, the same wrapped blur the normalize used) + micro (the residual), and
// AMPLIFY only the micro by a per-set factor K, keeping the macro (tone) exactly.
// So each tile's overall tone / the between-tile flatness is untouched — only the
// grain grows. "Macro flat, micro alive."
//
// Measured committed micro-stdev(luma) -> chosen K (source shown for reference;
// NOTE the soil SOURCE is the busy vertical wood-grain the owner rejected, so
// soil is only nudged ~×0.65→×0.8, NOT restored to source):
//   grass 3.04 (src 6.59)  K 1.55    soil 3.95 (src 16.1) K 1.25
//   water 3.26 (src 11.4)  K 1.20    plaza 18.7 (src 23.5) K 1.05
//
// ONE-SHOT on the committed tiles (idempotency guard: writes a .microtex marker
// per set; skips a set already processed so re-running never double-boosts).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const GDIR = path.join(ROOT, "src/assets/pixellab/ground");
const K = { grass: 1.55, soil: 1.25, water: 1.20, plaza: 1.05 };
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** Toroidal separable box blur of one channel (matches normalize.mjs). */
function blurWrap(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0; for (let d = -r; d <= r; d++) s += src[y * W + ((x + d + W) % W)];
    tmp[y * W + x] = s / (2 * r + 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0; for (let d = -r; d <= r; d++) s += tmp[((y + d + H) % H) * W + x];
    out[y * W + x] = s / (2 * r + 1);
  }
  return out;
}

for (const set of Object.keys(K)) {
  const dir = path.join(GDIR, set);
  const marker = path.join(dir, ".microtex");
  if (fs.existsSync(marker)) { console.log(`skip ${set} (already micro-textured)`); continue; }
  const k = K[set];
  for (let i = 0; i < 16; i++) {
    const fp = path.join(dir, `tile_${i}.png`);
    const t = PNG.sync.read(fs.readFileSync(fp));
    const W = t.width, H = t.height;
    for (let c = 0; c < 3; c++) {
      const ch = new Float32Array(W * H);
      for (let p = 0; p < W * H; p++) ch[p] = t.data[(p << 2) + c];
      const macro = blurWrap(ch, W, H, 6);
      for (let p = 0; p < W * H; p++) t.data[(p << 2) + c] = clamp(macro[p] + (ch[p] - macro[p]) * k);
    }
    fs.writeFileSync(fp, PNG.sync.write(t));
  }
  fs.writeFileSync(marker, `micro-textured K=${k}\n`);
  console.log(`micro ${set}: 16 tiles, residual ×${k} (macro tone preserved)`);
}
console.log("done — ground grain restored, macro tone / quilt-flatness unchanged");
