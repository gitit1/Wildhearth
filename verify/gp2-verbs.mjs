// AX-2 verification: the verb matrix + Woodcutting. Uses the __wh bridge to
// assert the REAL verb lists (objActions → id/label/disabled/reason) and drives
// the wood chain end-to-end (buy axe → chop → Woodcutting gains → stoke the
// fire). Screenshots the greyed plot menu, the skills window (Woodcutting), and
// the stoked hearth glow. Self-contained: `node verify/gp2-verbs.mjs`.
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

const acts = (id) => page.evaluate((i) => window.__wh.objActions(i) ?? [], id);
const find = (list, id) => list.find((a) => a.id === id);
const shot = (name) => page.screenshot({ path: `${SHOTS}/gp2-${name}.png` });

await page.evaluate(() => window.__wh.newGameWith("fisher", "none"));
await wait(300);

// --- (h) FIELD PLOT: greyed tool gates -------------------------------------
let plot = await acts("plot-0");
let till = find(plot, "work");
ok("plot: Till is greyed 'Needs a hoe' with no hoe",
  !!till && till.label === "Till" && till.disabled && till.reason === "Needs a hoe", JSON.stringify(till));
// screenshot the greyed plot menu (warp onto the field so it frames on-screen)
await page.evaluate(() => window.__wh.warp(21, 6));
await wait(300);
await page.evaluate(() => window.__wh.openMenu("plot-0"));
await wait(250);
await shot("plot-menu");
await page.keyboard.press("Escape"); await wait(150);

// --- (g) HEARTH: greyed "Stoke the fire — Needs wood logs" (no wood yet) ----
let hearth = await acts("hearth");
let stoke = find(hearth, "stoke");
ok("hearth: 'Stoke the fire' is greyed 'Needs wood logs' with no wood",
  !!stoke && stoke.label === "Stoke the fire" && stoke.disabled && stoke.reason === "Needs wood logs", JSON.stringify(stoke));

// buy a hoe → the plot's Till un-greys
await page.evaluate(() => window.__wh.giveCoins(200));
await page.evaluate(() => window.__wh.buyDev("hoe"));
plot = await acts("plot-0");
till = find(plot, "work");
ok("plot: Till un-greys once she owns a hoe", !!till && till.label === "Till" && !till.disabled, JSON.stringify(till));

// --- (e) WOODCUTTING: buy axe, chop a tree, skill gains --------------------
await page.evaluate(() => window.__wh.buyDev("axe"));
const treeCount = (await page.evaluate(() => window.__wh.treesState())).length;
let choppable = -1;
for (let i = 0; i < treeCount; i++) {
  const a = await acts(`tree-${i}`);
  if (find(a, "chop") && !find(a, "chop").disabled) { choppable = i; break; }
}
ok("a choppable tree with an enabled 'Chop' verb exists (axe owned)", choppable >= 0, `tree-${choppable}`);
const wc0 = await page.evaluate(() => window.__wh.skillOf("woodcutting"));
const wood0 = await page.evaluate(() => window.__wh.invOf("wood"));
await page.evaluate((i) => window.__wh.runInteract(`tree-${i}`, "chop"), choppable);
await wait(3400);   // CHOP_TIME (~2.4s) + margin — the swing completes in the loop
const wc1 = await page.evaluate(() => window.__wh.skillOf("woodcutting"));
const wood1 = await page.evaluate(() => window.__wh.invOf("wood"));
ok("chopping trains Woodcutting (skill rose)", wc1 > wc0, `wc ${wc0} → ${wc1}`);
ok("chopping yielded wood logs", wood1 > wood0, `wood ${wood0} → ${wood1}`);

// screenshot the skills window — Woodcutting is listed with its value
await page.evaluate(() => document.getElementById("skillsBtn")?.click());
await wait(500);
const hasWoodcuttingRow = await page.evaluate(() => /Woodcutting/i.test(document.body.innerText));
ok("Skills window lists Woodcutting", hasWoodcuttingRow);
await shot("skills");
await page.evaluate(() => document.getElementById("skillsBtn")?.click());   // close it
await wait(200);

// --- (f) STUMP SIT: the felled tree is now a stump offering Sit -------------
const stumpActs = await acts(`tree-${choppable}`);
ok("stump: offers 'Sit'", !!find(stumpActs, "sit") && find(stumpActs, "sit").label === "Sit", JSON.stringify(stumpActs.map((a) => a.id)));
await page.evaluate((i) => window.__wh.runInteract(`tree-${i}`, "sit"), choppable);
await wait(400);
ok("stump: running Sit raised no error", true);   // errors[] is asserted at finish
await wait(2600);   // let the placed sit finish so it doesn't bleed into later steps

// --- (b) BENCH SIT: a market/town bench offers Sit --------------------------
const benchActs = await acts("bench-0");
ok("bench: offers 'Sit'", !!find(benchActs, "sit") && find(benchActs, "sit").label === "Sit", JSON.stringify(benchActs.map((a) => a.id)));

// --- (g cont.) STOKE THE FIRE now works (she has wood) ----------------------
hearth = await acts("hearth");
stoke = find(hearth, "stoke");
ok("hearth: 'Stoke the fire' un-greys once she has wood logs", !!stoke && !stoke.disabled, JSON.stringify(stoke));
const woodBefore = await page.evaluate(() => window.__wh.invOf("wood"));
await page.evaluate(() => window.__wh.runInteract("hearth", "stoke"));
await wait(200);
const woodAfter = await page.evaluate(() => window.__wh.invOf("wood"));
ok("stoking the fire burned one wood log", woodAfter === woodBefore - 1, `wood ${woodBefore} → ${woodAfter}`);

// screenshot the stoked hearth glow, inside the house
await page.evaluate(() => window.__wh.runInteract("house-door", "enter"));
await wait(500);
await page.evaluate(() => window.__wh.warp(3, 3));   // room-space: just below the NW hearth
await wait(500);
await shot("hearth-stoked");

// --- TABLE: "Eat at the table" is greyed until there's food (fisher has berries)
const table = await acts("table");
const eat = find(table, "eat");
ok("table: offers 'Eat at the table'", !!eat && eat.label === "Eat at the table", JSON.stringify(table.map((a) => a.id)));
ok("table: eating IS enabled (fisher starts with berries in the bag)", !!eat && !eat.disabled, JSON.stringify(eat));

await finish({ browser, server, errors, fails });
