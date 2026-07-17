// COHESION-1 (A) — NATURE APRON STRIP (one-time committed post-process, 0 gens).
//
// The bright tan "patch of sand" (and the pine/boulder grass discs) that make
// trees/rocks read "pushed in" is BAKED INTO the sprite PNGs' ground-plane band.
// This strips that apron so the SAME meadow grass shows under the object, while
// KEEPING the trunk/roots — via the trunk-protection WEDGE mask ported from the
// owner-approved probe (scratchpad/cohesion/scene1.mjs neutraliseApron). In the
// sprite's bottom band, a central wedge (widening toward the foot = the roots) is
// PROTECTED; everything outside it (apron dirt + baked contact shadow + baked
// tufts) is keyed transparent, and inside it only clearly-warm SAND pixels are
// removed (roots + any neutral bark are kept — the warm-only test r-g>10 protects
// birch's near-neutral white bark, which the probe's luma-only test would have
// eaten). Bushes have no real apron, so they get the sand-test with NO wedge
// (a thin soil rim goes; green foliage stays). paintNatureGrounding then bakes
// the worn ring + contact AO + tuft/litter cluster under each object in-engine.
//
// Idempotent: writes a `.apron-stripped` marker per sprite dir; skips a dir
// already processed. Re-run after `git checkout` of the PNGs by deleting the
// markers (or set FORCE=1). Usage: node scripts/strip-nature-apron.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const REPO = path.join(ROOT, "src/assets/pixellab");
const FORCE = !!process.env.FORCE;

// Per-category wedge params. wedge=false -> no wedge strip, sand-test only.
//  halfTop/halfBot: protected half-width as a FRACTION of the alpha-bbox width,
//  at the top / bottom of the strip band (roots fan out toward the foot).
//  band: the strip band starts at bbox.minY + band*bbox.h (bottom 1-band).
const CATS = [
  { dir: "trees",   match: /^oak-/,     wedge: true,  halfTop: 0.11, halfBot: 0.34, band: 0.78 },
  { dir: "trees",   match: /^birch-/,   wedge: true,  halfTop: 0.10, halfBot: 0.30, band: 0.80 },
  { dir: "trees",   match: /^pine-/,    wedge: true,  halfTop: 0.12, halfBot: 0.34, band: 0.80 },
  // boulders: also strip the GREEN grass/moss disc apron (kept only the grey
  // rock body) — the code paintNatureGrounding re-adds base grass as tufts.
  { dir: "props",   match: /^boulder-/, wedge: true,  halfTop: 0.30, halfBot: 0.36, band: 0.72, green: true },
  { dir: "foliage", match: /^(bush|berry-bush|bush-pink|bush-white)\.png$/, wedge: false, band: 0.86 },
];

function bbox(p) {
  let a = p.width, b = p.height, c = -1, e = -1;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    if (p.data[(y * p.width + x) * 4 + 3] > 16) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y; }
  }
  return { minX: a, minY: b, maxX: c, maxY: e, w: c - a + 1, h: e - b + 1, cx: (a + c) >> 1 };
}
// warm SAND/dirt — excludes near-neutral bark (r-g small) and cool greens.
const isSand = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) > 118 && (r - g) > 10 && (r - b) > 24;
// green GRASS/moss — clearly green-dominant (for the boulder base-grass disc).
const isGreen = (r, g, b) => g > r + 8 && g > b + 6;

function strip(fp, cfg) {
  const p = PNG.sync.read(fs.readFileSync(fp));
  const W = p.width, d = p.data, bx = bbox(p);
  if (bx.maxY < 0) return 0;
  const bandY = Math.round(bx.minY + bx.h * cfg.band);
  let cleared = 0;
  for (let y = bandY; y <= bx.maxY; y++) {
    const t = (y - bandY) / Math.max(1, bx.maxY - bandY);       // 0 top of band .. 1 at foot
    const half = cfg.wedge ? bx.w * (cfg.halfTop + (cfg.halfBot - cfg.halfTop) * t) : Infinity;
    for (let x = bx.minX; x <= bx.maxX; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] < 24) continue;
      if (cfg.wedge && Math.abs(x - bx.cx) > half) { d[i + 3] = 0; cleared++; continue; }  // outside wedge -> gone
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (isSand(r, g, b) || (cfg.green && isGreen(r, g, b))) { d[i + 3] = 0; cleared++; }  // apron material inside -> gone
    }
  }
  fs.writeFileSync(fp, PNG.sync.write(p));
  return cleared;
}

const doneDirs = new Set();
let total = 0;
for (const cfg of CATS) {
  const dir = path.join(REPO, cfg.dir);
  const marker = path.join(dir, ".apron-stripped");
  if (fs.existsSync(marker) && !FORCE) { if (!doneDirs.has(cfg.dir)) console.log(`skip ${cfg.dir} (already apron-stripped)`); doneDirs.add(cfg.dir); continue; }
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".png")) continue;
    const base = f.replace(/\.png$/, "");
    const m = cfg.match.test(f) || cfg.match.test(base);
    if (!m) continue;
    const n = strip(path.join(dir, f), cfg);
    total += n;
    console.log(`  ${cfg.dir}/${f}: cleared ${n} apron px`);
  }
}
// mark every dir we touched (once all its categories are processed this run)
for (const cfg of CATS) {
  const marker = path.join(REPO, cfg.dir, ".apron-stripped");
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, "nature apron stripped (COHESION-1)\n");
}
console.log(`done — stripped ${total} apron px across nature sprites`);
