/**
 * packsheets.mjs — pack a PixelLab character download into ONE sprite-sheet
 * atlas (+ a JSON frame map), so Vite emits a single hashed .png per character
 * instead of inlining dozens of sub-4KB frame PNGs as base64 (which bloated the
 * JS bundle past the 500KB warning). Build tooling only; never shipped.
 *
 * INPUT  a raw PixelLab character export dir (the unzipped download): a
 *        metadata.json (v3) at the dir root or one level down, whose
 *        states[0].frames maps rotations + animations to PNG paths.
 * OUTPUT <out>/<name>.sheet.png   — the atlas
 *        <out>/<name>.sheet.json  — { canvas, cols, rows, dirs, anchor, frames }
 *
 * GRID (documented, deterministic):
 *   row 0                = the 8 rotations, one per column, in DIRS order
 *   rows 1..(F_walk)     = "walking" — row = walk frame f, columns = 8 dirs
 *   rows after that      = further animations (e.g. the heroine's "animating"
 *                          idle), same shape, in ANIM_ORDER
 * Every cell is canvas×canvas px (the export's native frame size); a frame is
 * blitted top-left into its cell. Frame keys in the JSON:
 *   rot_<dir>            e.g. rot_south
 *   <prefix>_<dir>_<f>   e.g. walk_south_0, idle_south_0   (see ANIM_PREFIX)
 *
 * ANCHOR  cx/footY = the union alpha bounding box across ALL frames — the
 *         horizontal centre column and the ground (foot) row, in cell-local px.
 *         The draw bridges (spriteChar/spriteNpc) plant footY on the entity's
 *         ground line and centre cx on entity.x.
 *
 * USAGE
 *   node scripts/packsheets.mjs --src <rawDir> --name <name> [--out <dir>]
 *   node scripts/packsheets.mjs --all <stagingRoot> [--out <dir>]   (pack every
 *        immediate subdir; name = subdir name minus a trailing "_raw")
 * Default --out = src/assets/pixellab/characters.
 *
 * TWO export shapes are supported, both auto-detected by findMetadata():
 *  - a normal character export (metadata.json + rotations + animations).
 *  - a ROTATIONS-ONLY export (no metadata.json at all): a bare `rotations/
 *    <dir>.png` per direction, no skeleton/animation (e.g. birds generated as
 *    8-directional objects). Synthesized into the same frame-map shape with
 *    an empty `animations`, so row 0 (rotations) is the whole sheet.
 *
 * PixelLab's slot-limited animation queue can also split ONE logical walk
 * across SEVERAL sibling job folders/keys ("walking", "walking-<hex>",
 * "walking-<hex2>", ...), each covering a different subset of the 8
 * directions. mergeSplitAnimations() groups them back into one animation
 * before packing (see packOne).
 */
import { PNG } from "pngjs";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";

// Canonical column order (clockwise from south). The frame MAP is authoritative
// for lookups; this only fixes which column each direction occupies.
const DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
// Animation folder name -> short frame-key prefix.
const ANIM_PREFIX = { walking: "walk", animating: "idle" };
// Row order for animations below the rotation row (walk first, then idle, then
// anything else alphabetically) — keeps the grid stable across runs.
const ANIM_ORDER = (a, b) => rank(a) - rank(b) || a.localeCompare(b);
function rank(n) { return n === "walking" ? 0 : n === "animating" ? 1 : 2; }

const ALPHA_MIN = 8;   // a pixel counts as opaque silhouette above this alpha

function parseArgs(argv) {
  const a = { out: "src/assets/pixellab/characters" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--src") a.src = argv[++i];
    else if (k === "--name") a.name = argv[++i];
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--all") a.all = argv[++i];
    else if (k === "--matrix") a.matrix = argv[++i];
  }
  return a;
}

// ---- character-matrix packing (R1) --------------------------------------
// The curated player matrix (scratchpad char-matrix/) is a LOOSE 4-direction
// export — no metadata.json, just <gender>/<hair>-<outfit>/rotations/{south,
// east,north,west}.png + walk/<dir>/frame_00X.png (6 frames/dir). It packs into
// the SAME atlas+json shape the loader already parses (rot_<dir> row + walk rows),
// but on a 4-column cardinal grid instead of the 8-dir grid packOne uses.
const MATRIX_DIRS = ["south", "east", "north", "west"];
const MATRIX_WALK_FRAMES = 6;

/** Pack one loose 4-dir combo dir into <out>/<name>.sheet.{png,json}. */
function packMatrixOne(name, comboDir, outDir) {
  const items = [];   // { key, path }
  for (const dir of MATRIX_DIRS) {
    const p = join(comboDir, "rotations", `${dir}.png`);
    if (!existsSync(p)) throw new Error(`${name}: missing rotation ${dir}`);
    items.push({ key: `rot_${dir}`, path: p });
  }
  for (let f = 0; f < MATRIX_WALK_FRAMES; f++)
    for (const dir of MATRIX_DIRS) {
      const p = join(comboDir, "walk", dir, `frame_${String(f).padStart(3, "0")}.png`);
      if (!existsSync(p)) throw new Error(`${name}: missing walk ${dir} frame ${f}`);
      items.push({ key: `walk_${dir}_${f}`, path: p });
    }

  const loaded = new Map();
  let cw = 0, ch = 0;
  for (const it of items) {
    const png = loadPng(it.path);
    loaded.set(it.key, png);
    if (!cw) { cw = png.width; ch = png.height; }
    else if (png.width !== cw || png.height !== ch)
      throw new Error(`${name}: frame ${it.key} is ${png.width}x${png.height}, expected ${cw}x${ch}`);
  }

  const cols = MATRIX_DIRS.length;                 // 4
  const rows = 1 + MATRIX_WALK_FRAMES;             // rot row + 6 walk rows = 7
  const sheet = new PNG({ width: cols * cw, height: rows * ch, colorType: 6 });
  sheet.data.fill(0);
  const frames = {};
  const bbox = { minX: cw, minY: ch, maxX: 0, maxY: 0 };

  MATRIX_DIRS.forEach((dir, col) => {
    const png = loaded.get(`rot_${dir}`);
    blit(sheet, png, col * cw, 0);
    accumulateBbox(png, bbox);
    frames[`rot_${dir}`] = { x: col * cw, y: 0, w: cw, h: ch };
  });
  let row = 1;
  for (let f = 0; f < MATRIX_WALK_FRAMES; f++, row++)
    MATRIX_DIRS.forEach((dir, col) => {
      const key = `walk_${dir}_${f}`;
      const png = loaded.get(key);
      blit(sheet, png, col * cw, row * ch);
      accumulateBbox(png, bbox);
      frames[key] = { x: col * cw, y: row * ch, w: cw, h: ch };
    });

  const anchor = {
    cx: Math.round((bbox.minX + bbox.maxX + 1) / 2),
    footY: bbox.maxY + 1,
  };
  const outPng = join(outDir, `${name}.sheet.png`);
  const outJson = join(outDir, `${name}.sheet.json`);
  writeFileSync(outPng, PNG.sync.write(sheet, { colorType: 6 }));
  writeFileSync(outJson, JSON.stringify({
    sheet: `${name}.sheet.png`, canvas: cw, cols, rows,
    dirs: MATRIX_DIRS, anims: [{ name: "walking", prefix: "walk", frames: MATRIX_WALK_FRAMES }],
    anchor, frames,
  }, null, 0) + "\n");
  const bytes = statSync(outPng).size;
  const silhouette = bbox.maxY + 1 - bbox.minY;
  console.log(`[matrix] ${name}: ${cols}x${rows} grid, cell ${cw}px, anchor cx=${anchor.cx} footY=${anchor.footY}, silhouette=${silhouette}px, ${(bytes / 1024).toFixed(1)}KB`);
}

/** Pack the whole matrix root (<gender>/<hair>-<outfit>/...) into
 *  matrix-<gender>-<hair>-<outfit>.sheet.* under outDir. */
function packMatrix(root, outDir) {
  let n = 0;
  for (const gender of readdirSync(root)) {
    const gDir = join(root, gender);
    if (!statSync(gDir).isDirectory()) continue;
    if (gender !== "female" && gender !== "male") continue;
    for (const combo of readdirSync(gDir)) {
      const cDir = join(gDir, combo);
      if (!statSync(cDir).isDirectory()) continue;
      if (!existsSync(join(cDir, "rotations"))) continue;
      try { packMatrixOne(`matrix-${gender}-${combo}`, cDir, outDir); n++; }
      catch (err) { console.error(`[skip] matrix-${gender}-${combo}: ${err.message}`); }
    }
  }
  console.log(`[matrix] packed ${n} combo sheets into ${outDir}`);
}

/** Find metadata.json at dir or any immediate subdir; return {meta, baseDir}
 *  where baseDir is the folder the frame paths are relative to. Falls back to
 *  synthesizing a rotations-only frame map (see file header) when no
 *  metadata.json exists anywhere but a `rotations/<dir>.png` set does — the
 *  shape a skeleton-less 8-directional object export (e.g. hen/duck) lands in. */
function findMetadata(dir) {
  const direct = join(dir, "metadata.json");
  if (existsSync(direct)) return { meta: JSON.parse(readFileSync(direct, "utf8")), baseDir: dir };
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      const m = join(p, "metadata.json");
      if (existsSync(m)) return { meta: JSON.parse(readFileSync(m, "utf8")), baseDir: p };
    }
  }
  const rotDir = join(dir, "rotations");
  if (existsSync(rotDir) && statSync(rotDir).isDirectory()) {
    const rotations = {};
    for (const d of DIRS) {
      const f = join(rotDir, `${d}.png`);
      if (existsSync(f)) rotations[d] = join("rotations", `${d}.png`);
    }
    if (Object.keys(rotations).length === DIRS.length)
      return { meta: { states: [{ frames: { rotations, animations: {} } }] }, baseDir: dir };
  }
  throw new Error(`no metadata.json under ${dir}`);
}

/**
 * Merge sibling animation keys that are really the SAME logical animation
 * split across several queued jobs (seen on the farm-animal batch: cat/dog/pig
 * each split "walking" into "walking" + "walking-<8-hex-chars>" job folders,
 * every one covering a different subset of the 8 directions — the generator's
 * slot-limited queueing). Group by base name (strip a trailing job-id suffix)
 * and merge each group's per-direction frame arrays into one; a base with no
 * split siblings passes through unchanged. Generalizes the one-off manual fix
 * used for the heroine ponytail's regenerated NE walk.
 */
function mergeSplitAnimations(animations) {
  const merged = {};
  for (const [key, dirs] of Object.entries(animations)) {
    const base = key.replace(/-[0-9a-f]{6,8}$/i, "");
    merged[base] = Object.assign(merged[base] ?? {}, dirs);
  }
  return merged;
}

function loadPng(path) { return PNG.sync.read(readFileSync(path)); }

/** Blit src RGBA into dst at (ox,oy). */
function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    const sRow = y * src.width * 4;
    const dRow = ((oy + y) * dst.width + ox) * 4;
    src.data.copy(dst.data, dRow, sRow, sRow + src.width * 4);
  }
}

/** Union alpha bbox of a frame, accumulated into acc {minX,minY,maxX,maxY}. */
function accumulateBbox(png, acc) {
  const { width: w, height: h, data } = png;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_MIN) {
        if (x < acc.minX) acc.minX = x;
        if (x > acc.maxX) acc.maxX = x;
        if (y < acc.minY) acc.minY = y;
        if (y > acc.maxY) acc.maxY = y;
      }
    }
}

function packOne(name, srcDir, outDir) {
  const { meta, baseDir } = findMetadata(srcDir);
  const st = meta.states[0];
  const rotations = st.frames.rotations;             // dir -> path
  const animations = mergeSplitAnimations(st.frames.animations ?? {});   // animName -> dir -> [paths]

  // ---- collect every (key, absolute-path) frame ----
  const items = [];   // { key, path }
  for (const dir of DIRS) {
    if (!rotations[dir]) throw new Error(`${name}: missing rotation ${dir}`);
    items.push({ key: `rot_${dir}`, path: join(baseDir, rotations[dir]) });
  }
  const animNames = Object.keys(animations).sort(ANIM_ORDER);
  const animRows = [];   // [{ prefix, frameCount }]
  for (const an of animNames) {
    const prefix = ANIM_PREFIX[an] ?? an.toLowerCase();
    const nFrames = animations[an][DIRS[0]].length;
    animRows.push({ an, prefix, nFrames });
    for (let f = 0; f < nFrames; f++)
      for (const dir of DIRS) {
        const arr = animations[an][dir];
        if (!arr || !arr[f]) throw new Error(`${name}: missing ${an} ${dir} frame ${f}`);
        items.push({ key: `${prefix}_${dir}_${f}`, path: join(baseDir, arr[f]) });
      }
  }

  // ---- load, assert uniform cell size ----
  const loaded = new Map();
  let cw = 0, ch = 0;
  for (const it of items) {
    const png = loadPng(it.path);
    loaded.set(it.key, png);
    if (!cw) { cw = png.width; ch = png.height; }
    else if (png.width !== cw || png.height !== ch)
      throw new Error(`${name}: frame ${it.key} is ${png.width}x${png.height}, expected ${cw}x${ch}`);
  }
  if (cw !== ch) console.warn(`[warn] ${name}: non-square cell ${cw}x${ch}`);

  // ---- grid geometry: 8 columns; rows = 1 (rot) + sum(anim frame counts) ----
  const cols = DIRS.length;
  const rows = 1 + animRows.reduce((s, r) => s + r.nFrames, 0);
  const sheet = new PNG({ width: cols * cw, height: rows * ch, colorType: 6 });
  sheet.data.fill(0);

  const frames = {};
  const bbox = { minX: cw, minY: ch, maxX: 0, maxY: 0 };

  // row 0: rotations
  DIRS.forEach((dir, col) => {
    const key = `rot_${dir}`;
    const png = loaded.get(key);
    blit(sheet, png, col * cw, 0);
    accumulateBbox(png, bbox);
    frames[key] = { x: col * cw, y: 0, w: cw, h: ch };
  });
  // rows 1..: animation frames
  let row = 1;
  for (const r of animRows) {
    for (let f = 0; f < r.nFrames; f++, row++) {
      DIRS.forEach((dir, col) => {
        const key = `${r.prefix}_${dir}_${f}`;
        const png = loaded.get(key);
        blit(sheet, png, col * cw, row * ch);
        accumulateBbox(png, bbox);
        frames[key] = { x: col * cw, y: row * ch, w: cw, h: ch };
      });
    }
  }

  const anchor = {
    cx: Math.round((bbox.minX + bbox.maxX + 1) / 2),   // silhouette horizontal centre
    footY: bbox.maxY + 1,                              // ground row (just below the lowest pixel)
  };

  const outPng = join(outDir, `${name}.sheet.png`);
  const outJson = join(outDir, `${name}.sheet.json`);
  writeFileSync(outPng, PNG.sync.write(sheet, { colorType: 6 }));
  const json = {
    sheet: `${name}.sheet.png`,
    canvas: cw,
    cols, rows,
    dirs: DIRS,
    anims: animRows.map((r) => ({ name: r.an, prefix: r.prefix, frames: r.nFrames })),
    anchor,
    frames,
  };
  writeFileSync(outJson, JSON.stringify(json, null, 0) + "\n");

  const bytes = statSync(outPng).size;
  const silhouette = bbox.maxY + 1 - bbox.minY;   // union alpha-bbox height (native px) — a scale-picking aid
  console.log(`[pack] ${name}: ${cols}x${rows} grid, cell ${cw}px, ${Object.keys(frames).length} frames, ` +
    `anchor cx=${anchor.cx} footY=${anchor.footY}, silhouette=${silhouette}px tall, ${(bytes / 1024).toFixed(1)}KB`);
  return json;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.matrix) {
    packMatrix(a.matrix, a.out);
  } else if (a.all) {
    const root = a.all;
    for (const e of readdirSync(root)) {
      const p = join(root, e);
      if (!statSync(p).isDirectory()) continue;
      const name = e.replace(/_raw$/, "");
      try { packOne(name, p, a.out); }
      catch (err) { console.error(`[skip] ${name}: ${err.message}`); }
    }
  } else if (a.src && a.name) {
    packOne(a.name, a.src, a.out);
  } else {
    console.error("usage: --src <rawDir> --name <name> [--out <dir>]  |  --all <stagingRoot> [--out <dir>]");
    process.exit(1);
  }
}

main();
