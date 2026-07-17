// W2b Part 0.1 — PIXEL-GRID UNIFICATION (fidelity match, 0 gens).
//
// The owner's top W2c complaint: buildings look "too drawn" vs the ground —
// they render at scales 0.9-1.25, so their on-screen pixel density differs from
// the ground's 1.0 (finer/coarser pixels against a coarse ground). This is the
// one-time OFFLINE fix: resample every building sprite (nearest-neighbour) to
// its FINAL world-pixel size (native_px x its config scale), IN PLACE. After
// this runs, src/config.ts sets every SPRITE_<building>_SCALE to exactly 1.0 and
// src/art/buildings.ts multiplies every hard-coded sprite-px value (sheet
// anchors, BUILDING_ROOFLINE, damage-overlay coords) by the same scale — so the
// building's world SIZE and anchor world-POSITION are byte-for-byte unchanged,
// only its pixel grid now aligns 1:1 with the 32px ground tiles.
//
// ONE-SHOT: it rewrites the committed PNGs. Re-running would re-resample — guard
// by checking the file is still at its known native size before touching it.
// inn.png is already scale 1.0 -> never touched.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const BDIR = path.join(ROOT, "src/assets/pixellab/buildings");

// filename pattern -> the SPRITE_*_SCALE it renders at today (config.ts, W2c).
function scaleFor(name) {
  const b = path.basename(name);
  if (b === "inn.png") return 1.0;                 // already native
  if (b === "barn.png") return 1.18;
  if (b.startsWith("cottage-")) return 1.25;
  if (b.startsWith("farmhouse")) return 0.95;      // farmhouse, -neighbor, spare extra
  if (b === "market-stall.png" || b.startsWith("stall-")) return 0.96;
  if (b === "outhouse.png") return 1.15;
  if (b === "stable.png") return 1.2;
  if (b === "well.png") return 0.90;
  return null;                                     // anything unrecognised: skip
}

// native canvas sizes (the re-run guard): {WxH} the sprites ship at pre-unify.
const NATIVE = {
  "192x176": true, "208x176": true, "112x128": true, "112x112": true,
  "80x96": true, "64x96": true, "160x144": true,
};

function nnResample(src, nw, nh) {
  const out = new PNG({ width: nw, height: nh });
  const { width: sw, height: sh, data: sd } = src;
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / nh));
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x + 0.5) * sw / nw));
      const si = (sy * sw + sx) << 2, di = (y * nw + x) << 2;
      out.data[di] = sd[si]; out.data[di + 1] = sd[si + 1];
      out.data[di + 2] = sd[si + 2]; out.data[di + 3] = sd[si + 3];
    }
  }
  return out;
}

function walk(dir, rel = "") {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f), r = rel ? `${rel}/${f}` : f;
    if (fs.statSync(full).isDirectory()) { walk(full, r); continue; }
    if (!f.endsWith(".png")) continue;
    const scale = scaleFor(r);
    if (scale === null) { console.log(`skip  ${r} (unrecognised)`); continue; }
    if (scale === 1.0) { console.log(`keep  ${r} (already 1.0)`); continue; }
    const src = PNG.sync.read(fs.readFileSync(full));
    const key = `${src.width}x${src.height}`;
    if (!NATIVE[key]) { console.log(`GUARD ${r} is ${key}, not a native size — already unified? skipping`); continue; }
    const nw = Math.round(src.width * scale), nh = Math.round(src.height * scale);
    const out = nnResample(src, nw, nh);
    fs.writeFileSync(full, PNG.sync.write(out));
    console.log(`unify ${r}  ${src.width}x${src.height} @${scale} -> ${nw}x${nh}`);
  }
}

walk(BDIR);
console.log("done — now set SPRITE_*_SCALE=1.0 and x-scale the hard-coded sprite-px in buildings.ts");
