import { NPCS, isRomantic, type NpcDef } from "../data/npcs";
import { readRelationship, type Relationships } from "../systems/relationships";
import { absoluteDay, type CalendarState } from "../systems/calendar";
import { npcBustSource } from "../art/spriteNpc";
import { drawBust, drawInitialsMedallion, makeBustCanvas } from "../art/bust";
import { wm, toggleWindow } from "./windows/manager";
import { leftPanelAnchor } from "./windows/setup";
import type { WindowHandle } from "./windows/window";

/**
 * Relationships window (HUD-A4) — the townsfolk roster the paperdoll's
 * "Relationships" button (and the O key) open; NOT on the taskbar (it hangs off
 * the character, UO-style). One row per NPC: a head-and-shoulders sprite bust
 * (or a code-drawn initials medallion when no sheet has shipped / decoded yet —
 * the zero-PNG dual-path fallback), name + role, Friendship hearts (0-100 → 5
 * hearts with halves), Romance hearts where romance applies, the NPC's birthday,
 * and a "last spoke" hint. Sorted closest-first; unmet NPCs sink to the bottom
 * with an intentional empty-state line.
 *
 * Gump-skinned (a plain wm window picks up the wood frame), fixed left-zone home
 * (cascaded via leftPanelAnchor), right-click / Esc closable, and it live-updates
 * while open (hearts move the moment a gift lands — main.ts calls
 * updateRelationships every frame).
 */

const GAP = 12;
const BUST = 40;
const SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
const F_COLOR = "#e8b24a";   // friendship hearts (aged gold)
const R_COLOR = "#e8607d";   // romance hearts (rose)

interface Row {
  root: HTMLElement;
  bustCtx: CanvasRenderingContext2D;
  bustDrawn: boolean;        // a real sprite bust landed (stop re-medallioning)
  name: HTMLElement;
  hearts: HTMLElement;
  meta: HTMLElement;
}

let win: WindowHandle;
let rels: Relationships;
let cal: CalendarState;
let listEl: HTMLElement;
let introEl: HTMLElement;
const rowById = new Map<string, Row>();

export function initRelationships(relationships: Relationships, calendar: CalendarState) {
  rels = relationships;
  cal = calendar;
  const panel = document.getElementById("relationshipsPanel")!;
  listEl = document.getElementById("relList")!;
  introEl = document.getElementById("relIntro")!;

  for (const def of NPCS) rowById.set(def.id, buildRow(def));
  refresh();

  win = wm.createWindow({
    id: "relationships", title: "Relationships", icon: "❤",
    content: panel,
    resizable: false,
    defaultRect: (d) => ({ x: GAP, y: d.h * 0.2, w: 0, h: 0 }),
    openAt: (d, s) => leftPanelAnchor("relationships", d, s),   // fixed left-edge home, cascaded (HUD-A2)
    onOpen: () => refresh(),
    onMinimize: (hidden) => { if (!hidden) refresh(); },
  });
  win.close();   // default: hidden (hangs off the paperdoll / O key)

  addEventListener("keydown", (e) => {
    if (e.code !== "KeyO" || isTyping(e)) return;
    toggleWindow(win);
  });
}

/** Opened from the paperdoll's "Relationships" button. */
export function toggleRelationships() { if (win) toggleWindow(win); }

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

function buildRow(def: NpcDef): Row {
  const root = document.createElement("div");
  root.className = "rel-row";

  const bustWrap = document.createElement("div");
  bustWrap.className = "rel-bust";
  const { canvas, g } = makeBustCanvas(BUST, BUST);
  bustWrap.appendChild(canvas);

  const main = document.createElement("div");
  main.className = "rel-main";
  const name = document.createElement("div");
  name.className = "rel-name";
  name.textContent = def.name;
  const role = document.createElement("div");
  role.className = "rel-role";
  role.textContent = def.profession;
  const hearts = document.createElement("div");
  hearts.className = "rel-hearts";
  const meta = document.createElement("div");
  meta.className = "rel-meta";
  main.append(name, role, hearts, meta);

  root.append(bustWrap, main);
  return { root, bustCtx: g, bustDrawn: false, name, hearts, meta };
}

/** 0-100 → five hearts (full / half / empty) of one colour, as HTML. */
function heartsHtml(value: number, color: string, kind: "f" | "r"): string {
  const filled = value / 20;   // 0..5
  let out = "";
  for (let i = 0; i < 5; i++) {
    const d = filled - i;
    if (d >= 0.75) out += `<span class="rel-heart ${kind}-full">♥</span>`;
    else if (d >= 0.25) out += `<span class="rel-heart h-half" style="--hc:${color}">♥</span>`;
    else out += `<span class="rel-heart h-empty">♥</span>`;
  }
  return `<span class="rel-heartset">${out}</span>`;
}

function metaHtml(def: NpcDef): string {
  const bday = `🎂 ${SEASON_NAMES[def.birthday.seasonIndex] ?? "?"} ${def.birthday.day}`;
  const rec = rels.byId[def.id];
  let seen: string;
  if (rec && rec.lastInteractDay >= 0) {
    const days = absoluteDay(cal) - rec.lastInteractDay;
    seen = days <= 0 ? "Spoke today" : days === 1 ? "Spoke yesterday" : `Spoke ${days}d ago`;
  } else {
    seen = `<span class="rel-unmet-tag">Haven't met yet</span>`;
  }
  return `<span>${bday}</span><span>${seen}</span>`;
}

/** A stable sort key: closest bond first (friendship+romance), met before unmet;
 *  roster order breaks ties. */
function score(def: NpcDef): number {
  const v = readRelationship(rels, def.id);
  return v.friendship + v.romance;
}

let lastRender = 0;
function refresh() {
  // sort closest-first (met NPCs float up; unmet keep roster order at 0)
  const order = [...NPCS].map((def, i) => ({ def, i }))
    .sort((a, b) => (score(b.def) - score(a.def)) || (a.i - b.i));

  let anyMet = false;
  for (const { def } of order) {
    const row = rowById.get(def.id)!;
    const v = readRelationship(rels, def.id);
    const met = !!rels.byId[def.id];
    if (met) anyMet = true;

    // bust (or medallion fallback) — keep the sprite once it's landed
    if (!row.bustDrawn) {
      const src = npcBustSource(def.id);
      row.bustCtx.clearRect(0, 0, BUST, BUST);
      if (src) { drawBust(row.bustCtx, src, BUST, BUST, { bustFraction: 0.46, topFrac: 0.02 }); row.bustDrawn = true; }
      else drawInitialsMedallion(row.bustCtx, def.name[0] ?? "?", BUST, BUST, def.id);
    }

    let hearts = heartsHtml(v.friendship, F_COLOR, "f");
    if (isRomantic(def)) hearts += heartsHtml(v.romance, R_COLOR, "r");
    row.hearts.innerHTML = hearts;
    row.meta.innerHTML = metaHtml(def);
    row.root.classList.toggle("rel-unmet", !met);

    listEl.appendChild(row.root);   // re-append reorders into closest-first order
  }

  introEl.textContent = anyMet
    ? ""
    : "You haven't met anyone yet — walk into town and say hello. Everyone you meet appears here.";
}

/** Called every frame while open: hearts move the moment a gift lands. Throttled
 *  to spare the DOM, but always retries any bust that hasn't decoded yet. */
export function updateRelationships() {
  if (!win || !win.isOpen()) return;
  const now = performance.now();
  if (now - lastRender < 500) return;
  lastRender = now;
  refresh();
}
