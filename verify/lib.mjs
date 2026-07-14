// Shared plumbing for the verify/ harness scripts (V1-C2): spawn a dedicated
// Vite dev server, launch headless Edge (puppeteer-core), and a tiny assert
// helper. Every script here is SELF-CONTAINED: run `node verify/<script>.mjs`
// from the repo root with no dev server running — it brings its own.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "package.json"));
const puppeteer = require("puppeteer-core");

/** Local Edge; override with WH_EDGE for another Chromium binary/path. */
const EDGE = process.env.WH_EDGE
  || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

export const PORT = Number(process.env.WH_VERIFY_PORT || 5199);

/** Spawns `vite --port PORT --strictPort`, resolves when it answers HTTP. */
export async function startServer() {
  const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite", "--port", String(PORT), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", shell: process.platform === "win32" });
  const deadline = Date.now() + 30000;
  for (;;) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return child;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) { child.kill(); throw new Error(`vite did not answer on :${PORT} within 30s`); }
    await new Promise((r) => setTimeout(r, 300));
  }
}

export async function launchPage() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    // the dev server 404s optional probes; everything else is a failure
    if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errors.push("console: " + m.text());
  });
  return { browser, page, errors };
}

export function makeChecker() {
  const fails = [];
  const ok = (name, cond, detail = "") => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
    if (!cond) fails.push(name);
  };
  return { fails, ok };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Standard teardown + exit code. */
export async function finish({ browser, server, errors, fails }) {
  console.log(errors.length ? "ERRORS: " + JSON.stringify(errors.slice(0, 6)) : "zero page/console errors");
  console.log(fails.length || errors.length ? `VERIFY FAILED (${fails.length + errors.length})` : "VERIFY GREEN");
  await browser.close();
  server.kill();
  process.exit(fails.length || errors.length ? 1 : 0);
}
