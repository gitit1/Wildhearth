// FARM-START-1 verification: the path-dependent starting farm. Drives real New
// Games per path via __wh.newGameWith, asserts the live manifest + the REAL
// hit/reach gating (reachId), and screenshots the yard at 1920x1080. Also proves
// grandfathering: a manifest-less (pre-GP-1) renovation store loads as legacy
// (barn present, storage usable). Self-contained: `node verify/gp1-farmstart.mjs`.
import { PORT, startServer, launchPage, makeChecker, wait, finish } from "./lib.mjs";
import { mkdirSync } from "node:fs";

const SHOTS = "C:/Users/gitit/AppData/Local/Temp/claude/c--Users-gitit-Git-Workplace-Games-Wildhearth/2780bbd0-5d8c-4a48-987e-b3e4e4311ddc/scratchpad";
mkdirSync(SHOTS, { recursive: true });

const server = await startServer();
const { browser, page, errors } = await launchPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const { fails, ok } = makeChecker();

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => !!window.__wh, { timeout: 15000 });

const man = () => page.evaluate(() => window.__wh.farmManifest());
const reach = (tx, ty) => page.evaluate(([x, y]) => window.__wh.reachId(x, y), [tx, ty]);
async function startPath(path) {
  await page.evaluate((p) => window.__wh.newGameWith(p, "none"), path);
  await wait(300);
  // frame the barn/coop/bed yard: warp NW of it and face SE so the shot shows it
  await page.evaluate(() => window.__wh.warp(12, 10));
  await wait(500);
}
async function shot(name) { await page.screenshot({ path: `${SHOTS}/gp1-${name}.png` }); }

// Probe points (tiles): barn/coop overlap zone, first flower bed, the scarecrow.
// BED0 sits just SOUTH of flower bed 0 — inside its reach but clear of the
// farmhouse's own (generous) reach band, so the probe isolates the bed.
// SCARE sits just WEST of the scarecrow (19.4,14) — inside its reach but clear
// of the tillable field's SW plot cells (which start at x20), so it isolates the
// scarecrow prop.
const YARD = [15.5, 12.0], BED0 = [8.2, 9.7], SCARE = [18.8, 14.0];

// --- (a) FISHER: base only -------------------------------------------------
await startPath("fisher");
let m = await man();
ok("fisher: manifest is base-only (no barn/coop/beds/props)",
  m.barn === false && m.coop === false && m.beds === 0 && m.establishedProps === false, JSON.stringify(m));
ok("fisher: no barn/coop reachable in the yard", (await reach(...YARD)) === null);
ok("fisher: no garden bed reachable", (await reach(...BED0)) === null);
ok("fisher: no scarecrow reachable", (await reach(...SCARE)) === null);
await shot("fisher");

// --- (b) FARMER: garden beds stay ------------------------------------------
await startPath("farmer");
m = await man();
ok("farmer: manifest keeps garden beds, nothing else", m.beds === 3 && m.barn === false && m.coop === false, JSON.stringify(m));
ok("farmer: first garden bed IS reachable", (await reach(...BED0)) === "flowerbed-0");
ok("farmer: still no barn/coop", (await reach(...YARD)) === null);
await shot("farmer");

// --- (c) ANIMAL-KEEPER: coop stays -----------------------------------------
await startPath("keeper");
m = await man();
ok("keeper: manifest has a coop, no barn/beds", m.coop === true && m.barn === false && m.beds === 0, JSON.stringify(m));
ok("keeper: the coop IS reachable", (await reach(...YARD)) === "coop");
ok("keeper: no garden bed", (await reach(...BED0)) === null);
await shot("keeper");

// --- (d) OLD FIXTURE SAVE (grandfathering): manifest-less renovation → legacy
// Start a fisher game, force a full save, then STRIP the `manifest` field from
// the renovation store (simulating a pre-GP-1 save) and reload → Continue.
await page.evaluate(() => { window.__wh.newGameWith("fisher", "none"); window.__wh.saveNow(); });
await wait(300);
const stripped = await page.evaluate(() => {
  const K = "wildhearth-farm-v1";
  const f = JSON.parse(localStorage.getItem(K));
  const had = "manifest" in f;
  delete f.manifest;                 // a pre-GP-1 store has no manifest field
  f.roof = true; f.window = true;    // a mid-game legacy farm, partly mended
  localStorage.setItem(K, JSON.stringify(f));
  return { had, after: localStorage.getItem(K) };
});
ok("fixture: manifest field stripped from the renovation store", stripped.had && !/manifest/.test(stripped.after));
await page.reload({ waitUntil: "load" });
await wait(1200);
const continued = await page.evaluate(() => {
  const c = document.getElementById("btnContinue");
  if (c && !c.disabled) { c.click(); return true; }
  return false;
});
await wait(1000);
await page.waitForFunction(() => !!window.__wh, { timeout: 15000 }).catch(() => {});
m = await man();
ok("fixture: a manifest-less save loads as LEGACY (barn present)", m.barn === true && m.establishedProps === true && m.beds === 3, JSON.stringify(m));
ok("fixture: the legacy barn IS reachable", continued && (await reach(...YARD)) === "barn");
ok("fixture: the legacy scarecrow IS reachable", (await reach(...SCARE)) === "prop-scarecrow");
// storage works: the barn is mended (fixture set roof/window; repair the barn), open it
const storageOpen = await page.evaluate(() => {
  window.__wh.repairFarm();
  window.__wh.openBarn();
  const w = document.querySelector('[data-win="storage"]');
  return !!w && w.style.display !== "none";
});
ok("fixture: the barn storage chest opens", storageOpen);
await page.evaluate(() => window.__wh.warp(12, 10)); await wait(500);
await shot("legacy-fixture");

await finish({ browser, server, errors, fails });
