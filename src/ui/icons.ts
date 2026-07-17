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
// Stroke 2.2 — at the 26px render size a 2.0 stroke read too thin on the iron
// plate (orchestrator review); every silhouette must be identifiable without
// hovering.
const S = (body: string): string =>
  `<svg class="wh-ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ` +
  `shape-rendering="geometricPrecision" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  // folded traveller's map: zigzag panels + a filled location dot
  map: S(
    `<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/>` +
    `<path d="M9 4v14M15 6v14"/>` +
    `<circle cx="12" cy="11" r="1.6" fill="currentColor" stroke="none"/>`,
  ),
  // a SCROLL: thick rollers top + bottom (wider than the paper), ruled paper
  // between — the roller bars are what make it read "scroll" not "page"
  skills: S(
    `<path d="M4.5 5.2h15M4.5 18.8h15" stroke-width="3.2"/>` +
    `<path d="M7.5 5.2v13.6M16.5 5.2v13.6"/>` +
    `<path d="M10.5 9.4h3.4M10.5 12h3.4M10.5 14.6h3.4"/>`,
  ),
  // a closed memory book: cover, left spine band, ribbon bookmark
  book: S(
    `<rect x="5" y="4" width="14" height="16" rx="1.5"/>` +
    `<path d="M8.4 4v16"/>` +
    `<path d="M13 4v6l2-1.8 2 1.8V4"/>`,
  ),
  // a quest clipboard: clip, a ticked step + ruled lines
  quests: S(
    `<rect x="5" y="5" width="14" height="15" rx="2"/>` +
    `<rect x="9" y="3" width="6" height="3.6" rx="1.2"/>` +
    `<path d="M7.6 11.2l1.4 1.4 2.5-2.5M13.2 11.8h3.2M7.9 16h8.5"/>`,
  ),
  // the inventory BAG: a drawstring belt pouch — bulb body, cinched neck, tie
  // tails. (The old dome-body + top-handle draft read as a PADLOCK at 26px.)
  backpack: S(
    `<path d="M9.3 8.2C6.5 10 5 12.4 5 15.1 5 18.3 7.8 20 12 20s7-1.7 7-4.9c0-2.7-1.5-5.1-4.3-6.9"/>` +
    `<path d="M9.3 8.2h5.4"/>` +
    `<path d="M9.3 8.2 7.7 4.6M14.7 8.2l1.6-3.6"/>`,
  ),
  // a treasure chest: ARCHED lid + body, lid seam, filled clasp (save/store)
  save: S(
    `<path d="M4.5 19.5v-8.3C4.5 8.4 6.5 6 9.2 6h5.6c2.7 0 4.7 2.4 4.7 5.2v8.3z"/>` +
    `<path d="M4.5 12.6h15"/>` +
    `<path d="M10.7 12.6h2.6v3.2h-2.6z" fill="currentColor" stroke="none"/>`,
  ),
  // a settings cog: toothed RING + filled hub (spokes alone read as a sun)
  settings: S(
    `<circle cx="12" cy="12" r="5.6"/>` +
    `<path d="M12 3.6v2.8M12 17.6v2.8M3.6 12h2.8M17.6 12h2.8` +
    `M6.1 6.1l2 2M15.9 15.9l2 2M17.9 6.1l-2 2M6.1 17.9l2-2"/>` +
    `<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>`,
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
  // the PAPERDOLL / character hub: a head + shoulders bust silhouette
  paperdoll: S(
    `<circle cx="12" cy="7.5" r="3.4"/>` +
    `<path d="M5.5 20c0-3.9 2.9-6.6 6.5-6.6s6.5 2.7 6.5 6.6"/>`,
  ),
  // a HEART — the relationships hub, one continuous stroke
  heart: S(
    `<path d="M12 20.2C6.6 16.3 4 13.2 4 10.1 4 7.6 5.9 5.8 8.2 5.8c1.6 0 2.9.9 3.8 2.2` +
    `.9-1.3 2.2-2.2 3.8-2.2 2.3 0 4.2 1.8 4.2 4.3 0 3.1-2.6 6.2-8 10.1z"/>`,
  ),
};

/** Map a taskbar button id → icon name. */
const BTN_ICON: Record<string, string> = {
  mapBtn: "map",
  skillsBtn: "skills",
  bookBtn: "book",
  questBtn: "quests",
  bagBtn: "backpack",
  paperdollBtn: "paperdoll",
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
