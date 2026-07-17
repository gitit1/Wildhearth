/**
 * The HUD icon set — code-drawn inline-SVG pixel glyphs that replace the
 * OS-rendered emoji throughout the taskbar / HUD (map, skills, book, quests,
 * backpack, save, settings, pause, menu, coins). Emoji are full-colour and
 * inconsistent — the single cheapest-looking thing in the UI; one coherent
 * monochrome line-glyph set (inheriting `currentColor`, so each state recolours
 * for free) reads as one professional family in the muted UO gump language.
 *
 * These are CODE-DRAWN art (CLAUDE.md hard rule #1) — not sprites, no PNG, no
 * async, always available. They are the icon path, not a dual-path skin: the
 * emoji stay in index.html as the literal zero-JS fallback, and `applyIcons()`
 * swaps them in at boot. Nothing here depends on a sprite file, so the
 * zero-PNG boot is unaffected.
 */

// One tuned 24-grid viewBox per glyph; stroke inherits currentColor so a
// button's normal/hover/active colour drives the icon with no extra assets.
const S = (body: string): string =>
  `<svg class="wh-ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
  `shape-rendering="geometricPrecision" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  // folded traveller's map with panel folds + a route marker
  map: S(
    `<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/>` +
    `<path d="M9 4v14M15 6v14"/>`,
  ),
  // a rolled skills scroll with three ruled lines
  skills: S(
    `<rect x="5" y="4" width="14" height="16" rx="2"/>` +
    `<path d="M8 9h8M8 12h8M8 15h5"/>`,
  ),
  // a closed memory book: cover, spine, ribbon bookmark
  book: S(
    `<rect x="5" y="4" width="14" height="16" rx="1.5"/>` +
    `<path d="M9 4v16"/>` +
    `<path d="M13.5 4v6l1.75-1.6L17 10V4"/>`,
  ),
  // a quest clipboard: clip, ruled lines, a ticked box
  quests: S(
    `<rect x="5" y="5" width="14" height="15" rx="2"/>` +
    `<rect x="9" y="3" width="6" height="3.4" rx="1"/>` +
    `<path d="M7.5 11l1.3 1.3L11 10M13 11.5h3M13 15.5h3"/>`,
  ),
  // an adventurer's backpack: body, top handle, flap, front pocket
  backpack: S(
    `<path d="M7 9a5 5 0 0 1 10 0v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/>` +
    `<path d="M10 5a2 2 0 0 1 4 0M7 13h10"/>` +
    `<rect x="10" y="14" width="4" height="6" rx="1"/>`,
  ),
  // a banded treasure chest with a keyhole clasp (store / save)
  save: S(
    `<rect x="4" y="9" width="16" height="10" rx="1.5"/>` +
    `<path d="M4 13h16"/>` +
    `<path d="M11 12.6h2v2.4h-2z" fill="currentColor" stroke="none"/>`,
  ),
  // a settings cog
  settings: S(
    `<circle cx="12" cy="12" r="3.2"/>` +
    `<path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3` +
    `M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M5.6 18.4l2.1-2.1"/>`,
  ),
  // pause — two bars
  pause: S(
    `<path d="M9 5v14M15 5v14" stroke-width="3"/>`,
  ),
  // menu — three bars (the ☰ hidden-windows button)
  menu: S(
    `<path d="M4 7h16M4 12h16M4 17h16"/>`,
  ),
  // a coin — rim ring + a struck cross-mark
  coin: S(
    `<circle cx="12" cy="12" r="8"/>` +
    `<circle cx="12" cy="12" r="4.2"/>`,
  ),
};

/** Map a taskbar button id → icon name. */
const BTN_ICON: Record<string, string> = {
  mapBtn: "map",
  skillsBtn: "skills",
  bookBtn: "book",
  questBtn: "quests",
  bagBtn: "backpack",
  saveBtn: "save",
  settingsBtn: "settings",
  pauseBtn: "pause",
  hiddenBtn: "menu",
};

/** Set a button's glyph WITHOUT clobbering element children (e.g. the quest
 *  count badge appended later): drop any leading emoji text node, keep/refresh a
 *  dedicated `.wh-ic` host as the first child. */
export function setBtnIcon(btn: HTMLElement, name: string): void {
  const svg = ICONS[name];
  if (!svg) return;
  for (const n of Array.from(btn.childNodes)) if (n.nodeType === 3) n.remove();
  let host = btn.querySelector<HTMLElement>(":scope > .wh-ic");
  if (!host) {
    host = document.createElement("span");
    host.className = "wh-ic";
    btn.insertBefore(host, btn.firstChild);
  }
  host.innerHTML = svg;
}

/** A coin glyph wrapped in the `.wh-ic` host — for the coin pills / heads that
 *  set their inner HTML directly (HUD coins, shop/stable/fisher heads). */
export function coinIconHtml(): string {
  return `<span class="wh-ic wh-ic-coin">${ICONS.coin}</span>`;
}

/**
 * Swap every taskbar emoji for its pixel glyph, and the leading 🪙 of the HUD
 * coins pill for the coin glyph. Idempotent + resilient: buttons that don't
 * exist yet (or a pill already swapped) are skipped. Call after the taskbar and
 * HUD windows are built (main.ts boot).
 */
export function applyIcons(): void {
  for (const [id, name] of Object.entries(BTN_ICON)) {
    const btn = document.getElementById(id);
    if (btn) setBtnIcon(btn, name);
  }
  // HUD coins pill: `<div class="pill">🪙 <span id="coins">…`. Replace the
  // leading emoji text node with the coin glyph host, once.
  const coins = document.getElementById("coins");
  const pill = coins?.parentElement;
  if (pill && !pill.querySelector(".wh-ic-coin")) {
    for (const n of Array.from(pill.childNodes)) if (n.nodeType === 3) n.remove();
    const host = document.createElement("span");
    host.className = "wh-ic wh-ic-coin";
    host.innerHTML = ICONS.coin;
    pill.insertBefore(host, coins);
  }
}
