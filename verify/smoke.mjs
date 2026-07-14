// V1-C1's seal smoke, kept green forever — the REAL player flow end-to-end:
// title → New Game → char creation → intro (skip) → farm reveal → path pick →
// Begin → guidance pick → day 1 (50 coins) → sleep → full day-end window →
// Enter → day 2 → reload → Continue resumes. Zero page/console errors
// tolerated. Self-contained: `node verify/smoke.mjs`.
import { PORT, startServer, launchPage, makeChecker, wait, finish } from "./lib.mjs";

const server = await startServer();
const { browser, page, errors } = await launchPage();
const { fails, ok } = makeChecker();
const click = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
await page.evaluate(() => {
  localStorage.clear();
  // "full" day-end BEFORE boot (settings survive New Game by design; the
  // module caches them at load) so the summary WINDOW is exercised — the
  // default "quick" is a toast pill by design.
  localStorage.setItem("wildhearth-settings-v1", JSON.stringify({ endOfDaySummary: "full" }));
});
await page.reload({ waitUntil: "load" });
await wait(1200); // title vista settles

ok("main menu shows New Game", await page.evaluate(() => !!document.getElementById("btnNewGame")));
await click("#btnNewGame"); await wait(600);

ok("char creation shows", await page.evaluate(() => !!document.getElementById("ccContinue")));
await click("#ccContinue"); await wait(600);

await page.keyboard.press("Space"); await wait(600);   // intro: any key skips
if (await page.evaluate(() => !!document.getElementById("btnChoosePath"))) {
  await click("#btnChoosePath"); await wait(600);       // farm reveal → path choice
}
ok("reached path choice", await page.evaluate(() => !!document.getElementById("btnBegin")));

await click("#btnBegin"); await wait(700);              // default path card is preselected

const pickedGuidance = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("button, [class*='card']")];
  const none = cards.find((c) => /on your own|none/i.test(c.textContent || "") && c.offsetParent);
  const target = none || cards.find((c) => /tutorial|aspiration/i.test(c.textContent || "") && c.offsetParent);
  if (target) { target.click(); return true; }
  return false;
});
await wait(900);
ok("guidance picked", pickedGuidance);

await page.waitForFunction(() => !!window.__wh, { timeout: 15000 }).catch(() => {});
const state1 = await page.evaluate(() => window.__wh ? {
  day: window.__wh.calendar.day, coins: window.__wh.economy.coins,
  viewport: (() => { const f = document.querySelector('[data-win="viewport"]'); return !!f && f.style.display !== "none"; })(),
} : null);
ok("game running on day 1 with 50 coins", !!state1 && state1.day === 1 && state1.coins === 50, JSON.stringify(state1));

await page.evaluate(() => window.__wh.sleep());
const eod = await page.waitForFunction(() => {
  const f = document.querySelector('[data-win="dayend"]');
  return !!f && f.style.display !== "none";
}, { timeout: 8000 }).then(() => true).catch(() => false);
ok("full day-end window opened after sleep", eod);

await page.keyboard.press("Enter"); await wait(700);
const state2 = await page.evaluate(() => ({
  day: window.__wh.calendar.day,
  eodGone: (() => { const f = document.querySelector('[data-win="dayend"]'); return !f || f.style.display === "none"; })(),
}));
ok("Enter closed day-end and it's day 2", state2.eodGone && state2.day === 2, JSON.stringify(state2));

await page.reload({ waitUntil: "load" }); await wait(1400);
const cont = await page.evaluate(() => {
  const c = document.getElementById("btnContinue");
  if (c && !c.disabled) { c.click(); return true; }
  return false;
});
await wait(1000);
const state3 = await page.evaluate(() => window.__wh ? { day: window.__wh.calendar.day } : null);
ok("Continue restores the save on day 2", cont && !!state3 && state3.day === 2, JSON.stringify({ cont, state3 }));

await finish({ browser, server, errors, fails });
