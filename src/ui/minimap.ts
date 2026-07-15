import { T, WORLD_W, WORLD_H, MINIMAP_SCALE, WIN_PANEL_SCALE_MIN, WIN_PANEL_SCALE_MAX, RADAR_W, RADAR_H, RADAR_SCALE } from "../config";
import {
  FIELD, YARD, HOUSE, BARN, STALL, POND, WORLD_TREES,
  ROAD_SEGMENTS, RIVER, LAKE, DOCK, NEIGHBOR, MARKET_STALLS, COTTAGES, WELL, HEDGES,
  TOWN_STREET, TOWN_SEA, TOWN_DOCK, INN, TOWN_HOMES, TOWN_MERCHANTS,
} from "../world/zones";

/** The field can grow (plot expansions) — main keeps this current. */
let fieldBounds = { x0: FIELD.x0, y0: FIELD.y0, x1: FIELD.x1, y1: FIELD.y1 };
export function setMinimapField(b: { x0: number; y0: number; x1: number; y1: number }) {
  fieldBounds = b;
  if (base) base = paintBaseAt(scale);   // repaint the static layer with the new field
  if (radarBase) radarBase = paintBaseAt(RADAR_SCALE);
}
import { roundR } from "../art/shapes";
import { wm, toggleWindow } from "./windows/manager";
import type { WindowHandle } from "./windows/window";
import type { Player } from "../entities/player";
import {
  TRAVEL_NODES, travelFare, travelMinutes, type TravelNode, type Discovery,
} from "../systems/discovery";

/** Fast travel (v2 block #4). main.ts owns the live Discovery ledger, the coins,
 *  and the faded trip; the minimap owns the pins + the click→confirm UI, calling
 *  back through these hooks. `guard` returns a human reason the trip can't happen
 *  right now (null = go ahead) so the confirm card can explain itself. */
export interface TravelHooks {
  discovery: Discovery;
  playerPos: () => { x: number; y: number };
  /** The fare actually charged for a hop (after any owned-transport discount —
   *  v2 block #5). The card shows this and the guard receives it, so display and
   *  charge stay one number. Falls back to the raw distance fare if unset. */
  fareOf?: (node: TravelNode) => number;
  guard: (node: TravelNode, fare: number) => string | null;
  travel: (node: TravelNode) => void;
}
let hooks: TravelHooks | null = null;
export function setTravelHooks(h: TravelHooks) { hooks = h; refreshTravelUI(); }

/**
 * Minimap window (Windows migration I): an always-on-by-default radar map.
 * Resizable from any edge/corner; `onResize` keeps the world's true aspect
 * ratio (min(cw/WORLD_W, ch/WORLD_H) — "cover the smaller axis") rather than
 * stretching, so the map never distorts no matter which handle is dragged.
 * Icon 🗺️ / key M toggle it. Default: open, top-right (under the clock).
 */


let canvas: HTMLCanvasElement;
let g: CanvasRenderingContext2D;
let base: HTMLCanvasElement;
let scale = MINIMAP_SCALE;   // world px -> map px, including live resize
let W = 0, H = 0;

let win: WindowHandle;
let mapBtn: HTMLElement | null = null;

// The UO-style corner RADAR: a small always-on window showing a zoomed-in
// crop of the world AROUND the player (readable because it's local — it never
// tries to squeeze the whole world into a corner). The big world map above
// stays the on-demand overview (M / 🗺), exactly like UO's radar + world map.
let radarWin: WindowHandle;
let radarCv: HTMLCanvasElement;
let rg: CanvasRenderingContext2D;
let radarBase: HTMLCanvasElement;

// fast-travel confirm-card state
let confirmEl: HTMLElement | null = null;
let pendingNode: TravelNode | null = null;

export function initMinimap() {
  const box = document.getElementById("minimapBox")!;
  canvas = document.getElementById("minimap") as HTMLCanvasElement;
  mapBtn = document.getElementById("mapBtn");
  g = canvas.getContext("2d")!;
  initFastTravel();

  const applyScale = (userS: number) => {
    scale = MINIMAP_SCALE * userS;
    W = Math.round(WORLD_W * scale);
    H = Math.round(WORLD_H * scale);
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    base = paintBaseAt(scale);
  };
  applyScale(1);

  const minW = Math.round(WORLD_W * MINIMAP_SCALE * WIN_PANEL_SCALE_MIN);
  const minH = Math.round(WORLD_H * MINIMAP_SCALE * WIN_PANEL_SCALE_MIN);
  const maxW = Math.round(WORLD_W * MINIMAP_SCALE * WIN_PANEL_SCALE_MAX);
  const maxH = Math.round(WORLD_H * MINIMAP_SCALE * WIN_PANEL_SCALE_MAX);

  win = wm.createWindow({
    id: "minimap", title: "Map", icon: "🗺️",
    content: box,
    resizable: true,
    contentSized: true,   // W/H below are the CANVAS box — the manager adds the real chrome
    minW, minH, maxW, maxH,
    // centered — the world map is a consult-and-close overview, like UO's.
    // NATURAL canvas dims, not the live W/H — those mutate with every rescale,
    // which would make the "default size" drift with whatever fit last.
    defaultRect: (d) => {
      const natW = Math.round(WORLD_W * MINIMAP_SCALE), natH = Math.round(WORLD_H * MINIMAP_SCALE);
      return { x: Math.round((d.w - natW) / 2), y: Math.round((d.h - natH) / 2), w: natW, h: natH };
    },
    // the big world map is an on-demand overview — like UO's, it opens
    // CENTER-SCREEN (anchored, so the edge-seeking rule for side panels
    // doesn't drag it into a corner); consult it, close it.
    openAt: (d, s) => ({ x: Math.round((d.w - s.w) / 2), y: Math.round((d.h - s.h) / 2) }),
    onResize: (cw, ch) => applyScale(Math.min(cw / WORLD_W, ch / WORLD_H) / MINIMAP_SCALE),
    onMinimize: (hidden) => mapBtn?.classList.toggle("active", !hidden),
  });

  // ---- the corner radar (always-on, UO style) -----------------------------
  radarBase = paintBaseAt(RADAR_SCALE);
  const radarBox = document.createElement("div");
  radarBox.style.cssText = "display:inline-block;line-height:0";
  radarCv = document.createElement("canvas");
  radarCv.width = RADAR_W * devicePixelRatio;
  radarCv.height = RADAR_H * devicePixelRatio;
  radarCv.style.width = `${RADAR_W}px`;
  radarCv.style.height = `${RADAR_H}px`;
  radarCv.style.borderRadius = "6px";
  radarBox.appendChild(radarCv);
  rg = radarCv.getContext("2d")!;
  radarWin = wm.createWindow({
    id: "radar", title: "Radar", icon: "🧭",
    content: radarBox,
    autoPlace: false,   // HUD chrome — its home is the top-right corner
    defaultRect: (d) => ({ x: d.w - RADAR_W - 40, y: 140, w: 0, h: 0 }), // repositioned by presets
  });

  mapBtn?.addEventListener("click", () => toggleWindow(win));
  mapBtn?.classList.toggle("active", win.isOpen());
  addEventListener("keydown", (e) => {
    if (e.code === "KeyM") toggleWindow(win);
  });
}

/** The radar frame: a zoomed-in crop of the pre-painted world base centered
 *  on the player (edge-clamped so the view never leaves the world), with the
 *  player dot at its true offset. Called every frame from updateMinimap. */
function drawRadar(player: Player) {
  if (!radarWin?.isOpen()) return;
  const dpr = devicePixelRatio;
  rg.setTransform(dpr, 0, 0, dpr, 0, 0);
  rg.imageSmoothingEnabled = false;
  const bw = radarBase.width, bh = radarBase.height;
  let sx = player.x * RADAR_SCALE - RADAR_W / 2;
  let sy = player.y * RADAR_SCALE - RADAR_H / 2;
  sx = Math.max(0, Math.min(bw - RADAR_W, sx));
  sy = Math.max(0, Math.min(bh - RADAR_H, sy));
  rg.fillStyle = "#42622e";
  rg.fillRect(0, 0, RADAR_W, RADAR_H);
  rg.drawImage(radarBase, sx, sy, RADAR_W, RADAR_H, 0, 0, RADAR_W, RADAR_H);
  const px = player.x * RADAR_SCALE - sx, py = player.y * RADAR_SCALE - sy;
  rg.fillStyle = "#fff";
  rg.beginPath(); rg.arc(px, py, 4, 0, 7); rg.fill();
  rg.fillStyle = "#e8c34f";
  rg.beginPath(); rg.arc(px, py, 2.4, 0, 7); rg.fill();
}

export function updateMinimap(player: Player) {
  drawRadar(player);
  if (!win.isOpen()) return;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  g.drawImage(base, 0, 0, W, H);
  drawTravelPins();
  const px = player.x * scale, py = player.y * scale;
  const r = Math.max(3, 3 * (scale / MINIMAP_SCALE));
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(px, py, r * 0.6, 0, 7); g.fill();
}

/** Fast-travel nodes as parchment map-pins. Discovered nodes get a bright ringed
 *  dot + a small name label; undiscovered ones are hinted only as a faint hollow
 *  dot (there IS somewhere out there, but she must walk to it first). */
function drawTravelPins() {
  const d = hooks?.discovery;
  const rad = Math.max(3.5, 4 * (scale / MINIMAP_SCALE));
  for (const n of TRAVEL_NODES) {
    const x = n.x * scale, y = n.y * scale;
    const known = !!d && d.discovered.includes(n.id);
    if (!known) {
      // subtle hint: a faint hollow ring, no label
      g.beginPath(); g.arc(x, y, rad * 0.7, 0, 7);
      g.fillStyle = "rgba(20,16,8,0.28)"; g.fill();
      g.lineWidth = 1; g.strokeStyle = "rgba(255,246,222,0.35)"; g.stroke();
      continue;
    }
    // discovered pin: dark outline ring + warm parchment fill + gold centre
    g.beginPath(); g.arc(x, y, rad + 1.5, 0, 7); g.fillStyle = "rgba(30,20,8,0.85)"; g.fill();
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fillStyle = "#f0dfb6"; g.fill();
    g.beginPath(); g.arc(x, y, rad * 0.5, 0, 7); g.fillStyle = "#c98b23"; g.fill();
    // label just above the pin, with a legibility shadow
    const fs = Math.max(9, Math.round(9 * (scale / MINIMAP_SCALE)));
    g.font = `700 ${fs}px system-ui, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "bottom";
    const ly = y - rad - 2;
    g.lineWidth = 3; g.strokeStyle = "rgba(20,14,4,0.9)"; g.strokeText(n.label, x, ly);
    g.fillStyle = "#fff4dc"; g.fillText(n.label, x, ly);
  }
  g.textAlign = "start"; g.textBaseline = "alphabetic";
}

// ---- fast-travel click + confirm card ---------------------------------------

function initFastTravel() {
  confirmEl = document.getElementById("travelConfirm");
  canvas.addEventListener("click", onMapClick);
  confirmEl?.querySelector(".tc-no")?.addEventListener("click", (e) => { e.stopPropagation(); hideConfirm(); });
  confirmEl?.querySelector(".tc-go")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (pendingNode && hooks) { const n = pendingNode; hideConfirm(); hooks.travel(n); }
  });
  // closing/hiding the map dismisses any open card
  addEventListener("keydown", (e) => { if (e.code === "KeyM") hideConfirm(); });
}

/** Called when the ledger changes (New Game, or a fresh handoff) so a stale card
 *  for a now-undiscovered place doesn't linger. */
function refreshTravelUI() { hideConfirm(); }

function nodeAtMapPoint(mx: number, my: number): TravelNode | null {
  const hitR = Math.max(9, 10 * (scale / MINIMAP_SCALE));
  let best: TravelNode | null = null, bestD = hitR * hitR;
  for (const n of TRAVEL_NODES) {
    const dx = n.x * scale - mx, dy = n.y * scale - my;
    const dd = dx * dx + dy * dy;
    if (dd <= bestD) { bestD = dd; best = n; }
  }
  return best;
}

function onMapClick(e: MouseEvent) {
  if (!hooks) return;
  const rect = canvas.getBoundingClientRect();
  // canvas CSS size is W×H (see applyScale) — map straight into map-space
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  const node = nodeAtMapPoint(mx, my);
  if (!node) { hideConfirm(); return; }
  if (!hooks.discovery.discovered.includes(node.id)) {
    // an undiscovered pin: gently hint it must be walked to first
    showConfirm(node, "You haven't been here yet — walk there once to unlock travel.", true);
    return;
  }
  const pos = hooks.playerPos();
  const fare = hooks.fareOf ? hooks.fareOf(node) : travelFare(pos.x, pos.y, node);
  const mins = travelMinutes(pos.x, pos.y, node);
  const reason = hooks.guard(node, fare);
  if (reason) { showConfirm(node, reason, true); return; }
  const hrs = Math.floor(mins / 60), rem = mins % 60;
  const timeStr = hrs > 0 ? `${hrs}h${rem ? ` ${rem}m` : ""}` : `${mins} min`;
  // "free" when her own carriage waives the coachman fare (v2 block #5)
  const fareStr = fare > 0 ? `Fare <b>${fare}</b> coins` : `<b>Free</b> — your own carriage`;
  showConfirm(node, `${fareStr} · about ${timeStr} by carriage`, false);
}

function showConfirm(node: TravelNode, fareLine: string, blockedState: boolean) {
  if (!confirmEl) return;
  pendingNode = blockedState ? null : node;
  (confirmEl.querySelector(".tc-title") as HTMLElement).textContent =
    blockedState ? node.label : `Travel to ${node.label}?`;
  (confirmEl.querySelector(".tc-fare") as HTMLElement).innerHTML = fareLine;
  const go = confirmEl.querySelector(".tc-go") as HTMLElement;
  go.style.display = blockedState ? "none" : "";
  (confirmEl.querySelector(".tc-no") as HTMLElement).textContent = blockedState ? "OK" : "Cancel";
  confirmEl.classList.toggle("blocked", blockedState);
  confirmEl.classList.add("show");
}

function hideConfirm() {
  pendingNode = null;
  confirmEl?.classList.remove("show");
}

/** Scaled-down echo of the whole world (regions, road, water, buildings),
 *  painted once per resize. Player dot is drawn live on top each frame. */
function paintBaseAt(s: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(WORLD_W * s); c.height = Math.round(WORLD_H * s);
  const b = c.getContext("2d")!;
  const rectFill = (r: { x: number; y: number; w: number; h: number }, col: string, rr = 2) => {
    roundR(b, r.x * s, r.y * s, r.w * s, r.h * s, rr); b.fillStyle = col; b.fill();
  };

  b.fillStyle = "#5d8a3c"; b.fillRect(0, 0, c.width, c.height);
  // forest region — a darker patch north-central
  rectFill({ x: 46 * T, y: 0, w: 18 * T, h: 17.5 * T }, "#456a2c", 6);
  // market square apron
  rectFill({ x: 59.5 * T, y: 14.5 * T, w: 21 * T, h: 13.5 * T }, "#b19670", 6);
  // coastal town street apron
  rectFill(TOWN_STREET, "#b19670", 6);
  // dirt road strips
  for (const seg of ROAD_SEGMENTS) rectFill(seg, "#9c7c50", 2);
  // dirt yard
  rectFill({ x: YARD.x0 * T, y: YARD.y0 * T, w: (YARD.x1 - YARD.x0) * T, h: (YARD.y1 - YARD.y0) * T }, "#a58254", 4);
  // tilled field (live bounds — plot expansions grow it)
  rectFill({ x: fieldBounds.x0 * T, y: fieldBounds.y0 * T,
    w: (fieldBounds.x1 - fieldBounds.x0) * T, h: (fieldBounds.y1 - fieldBounds.y0) * T }, "#6e4f33", 3);
  // water: pond, river, lake
  b.fillStyle = "#3d6f8e";
  b.beginPath(); b.ellipse(POND.cx * s, POND.cy * s, POND.rx * s, POND.ry * s, 0, 0, 7); b.fill();
  rectFill(RIVER, "#3d6f8e", 4);
  rectFill(LAKE, "#3d6f8e", 6);
  rectFill(TOWN_SEA, "#3d6f8e", 4);
  rectFill(DOCK, "#a5814f", 1);
  rectFill(TOWN_DOCK, "#a5814f", 1);
  // hedges (farm's east bound)
  for (const h of HEDGES) rectFill(h, "#37591f", 1);
  // buildings as coloured blocks
  b.fillStyle = "#b5453c"; b.fillRect(HOUSE.x * s, HOUSE.y * s, HOUSE.w * s, HOUSE.h * s);
  b.fillStyle = "#9c3d34"; b.fillRect(BARN.x * s, BARN.y * s, BARN.w * s, BARN.h * s);
  b.fillStyle = "#d9d3c0"; b.fillRect(STALL.x * s, STALL.y * s, STALL.w * s, STALL.h * s);
  b.fillStyle = "#c56a4a"; b.fillRect(NEIGHBOR.house.x * s, NEIGHBOR.house.y * s, NEIGHBOR.house.w * s, NEIGHBOR.house.h * s);
  b.fillStyle = "#9c3d34"; b.fillRect(NEIGHBOR.barn.x * s, NEIGHBOR.barn.y * s, NEIGHBOR.barn.w * s, NEIGHBOR.barn.h * s);
  b.fillStyle = "#d9c9a0"; for (const st of MARKET_STALLS) b.fillRect(st.x * s, st.y * s, st.w * s, st.h * s);
  b.fillStyle = "#cbb489"; for (const ct of COTTAGES) b.fillRect(ct.x * s, ct.y * s, ct.w * s, ct.h * s);
  // coastal town buildings — inn (larger), homes, merchant counters
  b.fillStyle = "#c08a5a"; b.fillRect(INN.x * s, INN.y * s, INN.w * s, INN.h * s);
  b.fillStyle = "#cbb489"; for (const h of TOWN_HOMES) b.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
  b.fillStyle = "#d9c9a0"; for (const m of TOWN_MERCHANTS) b.fillRect(m.x * s, m.y * s, m.w * s, m.h * s);
  b.fillStyle = "#8a8378"; b.beginPath(); b.arc(WELL.cx * s, WELL.cy * s, Math.max(1.5, WELL.r * s), 0, 7); b.fill();
  // trees
  b.fillStyle = "#3f6b2c";
  const tr = Math.max(1.6, 2.2 * (s / MINIMAP_SCALE));
  for (const [tx, ty] of WORLD_TREES) { b.beginPath(); b.arc(tx * s, ty * s, tr, 0, 7); b.fill(); }
  return c;
}
