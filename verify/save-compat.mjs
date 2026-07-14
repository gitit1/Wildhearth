// V1-C2 — the save-compat regression net. Seeds the canned v1 save
// (fixtures/v1-save.json, a REAL day-2 playthrough dump) into localStorage,
// boots the game, and asserts the save is honoured: Continue enabled with
// the slot glance, the world resumes on the right day with the right coins,
// and a live minute runs clean. EVERY future version must keep this green —
// old saves surviving is executor-contract rule #9 (EXECUTION_PLAN_V5.md §0).
// Self-contained: `node verify/save-compat.mjs` (no dev server needed).
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, PORT, startServer, launchPage, makeChecker, wait, finish } from "./lib.mjs";

const fixture = JSON.parse(readFileSync(path.join(ROOT, "verify", "fixtures", "v1-save.json"), "utf8"));
const server = await startServer();
const { browser, page, errors } = await launchPage();
const { fails, ok } = makeChecker();

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
await page.evaluate((entries) => {
  localStorage.clear();
  for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
}, fixture.localStorage);
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => !!window.__wh, { timeout: 20000 }).catch(() => {});
await wait(1200);

// 1) title screen honours the save
const title = await page.evaluate(() => {
  const c = document.getElementById("btnContinue");
  return { exists: !!c, enabled: !!c && !c.disabled, sub: c?.querySelector("span:last-child")?.textContent ?? "" };
});
ok("Continue is enabled with a slot glance", title.exists && title.enabled && /Day/.test(title.sub), JSON.stringify(title));

// 2) world state matches the fixture
const state = await page.evaluate(() => ({
  day: window.__wh?.calendar?.day ?? null,
  coins: window.__wh?.economy?.coins ?? null,
}));
ok(`world resumed on day ${fixture.meta.day} with ${fixture.meta.coins} coins`,
  state.day === fixture.meta.day && state.coins === fixture.meta.coins, JSON.stringify(state));

// 3) Continue enters the game: viewport window open, a live minute runs clean
await page.evaluate(() => document.getElementById("btnContinue")?.click());
await wait(900);
const running = await page.evaluate(() => {
  const f = document.querySelector('[data-win="viewport"]');
  const open = !!f && f.style.display !== "none";
  let minuteOk = true;
  try { window.__wh.liveMinute(); } catch { minuteOk = false; }
  return { open, minuteOk };
});
ok("Continue enters the game and a live minute runs", running.open && running.minuteOk, JSON.stringify(running));

await finish({ browser, server, errors, fails });
