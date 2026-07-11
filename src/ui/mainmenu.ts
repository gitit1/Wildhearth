import { openingRoot } from "./titlescreen";
import { drawVista, drawLogo } from "../art/vista";
import { showWhatsNew } from "./whatsnew";
import { showHelp } from "./helpscreen";
import { showCredits } from "./credits";
import { showDocs } from "./docsscreen";
import { unseenChangelogCount } from "../data/changelog";
import type { SlotManifest } from "../systems/saveSlots";

/**
 * Main title screen (Part E #1) — the first thing the player sees at boot,
 * before any gameplay. A full-screen, code-drawn dawn vista with an animated
 * "Wildhearth" logo, over which a wood/gold button column floats: Continue
 * (with the save-slot glance), New Game, What's New (badged when there are
 * unseen updates), Settings, Help, Credits, Exit. Keyboard-navigable. What's
 * New / Help / Credits are self-contained here; Settings and Exit are wired by
 * main.ts (they need the live game/save context).
 */

export interface MainMenuConfig {
  hasSave: boolean;
  slot: SlotManifest | null;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onExit: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "saved just now / 5m ago / 2h ago / 3d ago" from an epoch-ms stamp. */
function savedAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "saved just now";
  const m = Math.round(s / 60);
  if (m < 60) return `saved ${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `saved ${h}h ago`;
  const d = Math.round(h / 24);
  return `saved ${d}d ago`;
}

let vistaRaf = 0;

export function showMainMenu(cfg: MainMenuConfig) {
  const o = openingRoot();
  o.className = "menu-root";
  o.style.display = "block";
  o.replaceChildren();

  // --- the painted vista background (its own animated canvas) ---
  const cv = document.createElement("canvas");
  cv.className = "menu-vista";
  const vg = cv.getContext("2d")!;
  o.append(cv);

  const fit = () => {
    const w = o.clientWidth || innerWidth;
    const h = o.clientHeight || innerHeight;
    cv.width = Math.max(1, Math.round(w * devicePixelRatio));
    cv.height = Math.max(1, Math.round(h * devicePixelRatio));
  };
  fit();
  addEventListener("resize", fit);

  const t0 = performance.now();
  const frame = (now: number) => {
    if (!cv.isConnected) { vistaRaf = 0; removeEventListener("resize", fit); return; }
    const t = (now - t0) / 1000;
    const W = cv.width / devicePixelRatio, H = cv.height / devicePixelRatio;
    vg.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawVista(vg, W, H, t);
    const logoScale = Math.max(34, Math.min(W * 0.8 / 5.2, H * 0.15));
    drawLogo(vg, W / 2, H * 0.2, logoScale, t);
    // tagline under the logo
    vg.save();
    vg.textAlign = "center"; vg.textBaseline = "middle";
    vg.font = `italic 600 ${Math.max(12, logoScale * 0.2)}px Georgia, serif`;
    vg.fillStyle = "rgba(255,244,220,.9)";
    vg.shadowColor = "rgba(0,0,0,.6)"; vg.shadowBlur = 6;
    vg.fillText("A little farm, a whole life.", W / 2, H * 0.2 + logoScale * 0.72);
    vg.restore();
    vistaRaf = requestAnimationFrame(frame);
  };
  cancelAnimationFrame(vistaRaf);
  vistaRaf = requestAnimationFrame(frame);

  // --- the floating button column ---
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";
  const col = document.createElement("div");
  col.className = "menu-buttons";

  const reopen = () => showMainMenu(cfg);

  // Continue — with the save-slot glance, disabled + dimmed when there's no save
  const cont = bigButton("Continue", "btnContinue");
  if (cfg.hasSave && cfg.slot) {
    const s = cfg.slot;
    cont.sub.textContent =
      `${cap(s.calendarStamp.season)} · Day ${s.calendarStamp.day} · ${s.coins} coins · ${savedAgo(s.lastSavedAt)}`;
    cont.btn.addEventListener("click", () => { stop(); cfg.onContinue(); });
  } else {
    cont.btn.classList.add("disabled");
    cont.btn.disabled = true;
    cont.sub.textContent = "No saved game yet";
  }

  // New Game — confirm overwrite if a save exists
  const ng = button("New Game", "btnNewGame");
  ng.addEventListener("click", () => {
    if (cfg.hasSave) {
      menuConfirm(
        "Start a new life?",
        "This will overwrite your saved game. There's only one save slot for now.",
        "Start new game",
        () => { stop(); cfg.onNewGame(); },
        reopen,
      );
    } else { stop(); cfg.onNewGame(); }
  });

  // What's New — badge when there are unseen entries
  const wn = button("What's New", "btnWhatsNew");
  const unseen = unseenChangelogCount();
  if (unseen > 0) {
    const badge = document.createElement("span");
    badge.className = "menu-badge";
    badge.textContent = String(unseen);
    wn.append(badge);
  }
  wn.addEventListener("click", () => showWhatsNew(reopen));

  const settings = button("Settings", "btnSettings");
  settings.addEventListener("click", () => cfg.onSettings());

  const help = button("Help / Guide", "btnHelp");
  help.addEventListener("click", () => showHelp(reopen));

  const credits = button("Credits", "btnCredits");
  credits.addEventListener("click", () => showCredits(reopen));

  // Project Docs — the developer/archive reading room (owner-requested): every
  // design doc, roadmap, log and run, in a comfortable reading + search view.
  const docs = button("Project Docs", "btnDocs");
  docs.addEventListener("click", () => showDocs(reopen));

  const exit = button("Exit", "btnExit");
  exit.addEventListener("click", () => cfg.onExit());

  col.append(cont.btn, ng, wn, settings, help, credits, docs, exit);
  overlay.append(col);
  o.append(overlay);

  wireKeyboardNav(col);

  // focus the first sensible button so keys work immediately
  const first = cfg.hasSave ? cont.btn : ng;
  setTimeout(() => first.focus(), 0);
}

/** Stop the vista loop when leaving the menu (belt-and-braces; the loop also
 *  self-stops once its canvas is disconnected). */
function stop() {
  cancelAnimationFrame(vistaRaf);
  vistaRaf = 0;
}

// ---- small DOM builders ----------------------------------------------------

function button(label: string, id: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "menu-btn mm-btn";
  b.id = id;
  b.textContent = label;
  return b;
}

/** A taller two-line button (title + subtitle) — used for Continue. */
function bigButton(label: string, id: string): { btn: HTMLButtonElement; sub: HTMLElement } {
  const btn = document.createElement("button");
  btn.className = "menu-btn mm-btn mm-big";
  btn.id = id;
  const title = document.createElement("span");
  title.className = "mm-big-title";
  title.textContent = label;
  const sub = document.createElement("span");
  sub.className = "mm-big-sub";
  btn.append(title, sub);
  return { btn, sub };
}

/** Arrow-key up/down focus movement within a button column (Enter = native). */
function wireKeyboardNav(col: HTMLElement) {
  col.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const btns = Array.from(col.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    if (!btns.length) return;
    const cur = document.activeElement as HTMLElement;
    let idx = btns.indexOf(cur as HTMLButtonElement);
    if (idx < 0) idx = 0;
    else idx = e.key === "ArrowDown" ? (idx + 1) % btns.length : (idx - 1 + btns.length) % btns.length;
    e.preventDefault();
    btns[idx]!.focus();
  });
}

/** A simple in-menu confirm dialog layered over the vista. */
export function menuConfirm(
  title: string, body: string, confirmLabel: string,
  onConfirm: () => void, onCancel: () => void,
) {
  const o = openingRoot();
  const scrim = document.createElement("div");
  scrim.className = "menu-modal-scrim";
  const panel = document.createElement("div");
  panel.className = "menu-panel menu-modal";
  const h = document.createElement("h2");
  h.className = "menu-modal-title";
  h.textContent = title;
  const p = document.createElement("p");
  p.className = "menu-text";
  p.textContent = body;
  const yes = document.createElement("button");
  yes.className = "menu-btn";
  yes.id = "menuConfirmYes";
  yes.textContent = confirmLabel;
  const no = document.createElement("button");
  no.className = "menu-btn menu-btn-ghost";
  no.id = "menuConfirmNo";
  no.textContent = "Cancel";

  const close = () => { scrim.remove(); removeEventListener("keydown", onKey, true); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.stopImmediatePropagation(); close(); onCancel(); }
  };
  addEventListener("keydown", onKey, true);
  yes.addEventListener("click", () => { close(); onConfirm(); });
  no.addEventListener("click", () => { close(); onCancel(); });

  panel.append(h, p, yes, no);
  scrim.append(panel);
  o.append(scrim);
  setTimeout(() => yes.focus(), 0);
}

/**
 * The warm farewell full-screen shown after "Exit fully" when the browser
 * blocks window.close() (the normal case). Exported so the exit dialog (commit
 * 3) reuses it. Stops the vista loop and takes over the whole overlay.
 */
export function showFarewell() {
  stop();
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel farewell-panel";
  const heart = document.createElement("div");
  heart.className = "farewell-heart";
  heart.textContent = "🌱";
  const h1 = document.createElement("h1");
  h1.className = "menu-title";
  h1.textContent = "Until next time";
  const p = document.createElement("p");
  p.className = "menu-text";
  p.textContent = "The farm will wait for you. You can close this tab whenever you're ready.";
  panel.append(heart, h1, p);
  o.append(panel);
}
