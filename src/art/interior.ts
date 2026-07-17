import {
  T, SPRITE_HEARTH_SCALE, SPRITE_BASIN_SCALE, SPRITE_BED_SCALE, SPRITE_CHAIR_SCALE,
  SPRITE_TABLE_SCALE, SPRITE_COUNTER_SCALE, SPRITE_NIGHTSTAND_SCALE,
  SPRITE_CRATE_TABLE_SCALE, SPRITE_RUG_SCALE,
} from "../config";
import { ROOM } from "../world/zones";
import {
  HOME_FURNITURE, HOME_WINDOWS, HOME_DOOR, DIVIDER_SEGMENTS, DIVIDER_GAP,
  DIVIDER_X, DIVIDER_W, WALL, furnitureRect,
  type FurnitureKind, type FurnitureInstance, type WindowDef,
} from "../world/furniture";
import type { Rect } from "../world/zones";
import { sprite, drawGroundSprite } from "./sprites";
import type { DayPhase } from "../systems/calendar";

// measured sprite-sheet anchors (alpha bbox: centre col, base/foot row).
// W2b interior furniture wave — every piece a UO-mood muted-warm sprite (dual-
// path over the code painters below), anchors measured off the new PNGs.
const HEARTH_SHEET = { cx: 32, foot: 78 };       // 64x80 (unchanged)
const BASIN_SHEET = { cx: 23.5, foot: 57 };      // 48x64
const BED_SHEET = { cx: 31.5, foot: 69 };        // 64x80
const CHAIR_SHEET = { cx: 23.5, foot: 58 };      // 48x64
const TABLE_SHEET = { cx: 31.5, foot: 57 };      // 64x64
const COUNTER_SHEET = { cx: 40, foot: 60 };      // 80x64
const NIGHTSTAND_SHEET = { cx: 23.5, foot: 51 }; // 48x56
const CRATE_TABLE_SHEET = { cx: 27, foot: 50 };  // 56x56
const RUG_SHEET = { cx: 40, cy: 27 };            // 80x56 — flat decal: centred on its rect (cy = content vertical centre)

/**
 * The house interior — HOME-1: a real little cottage, drawn ENTIRELY from data.
 * The 16×11 room is divided into a KITCHEN (hearth + counter + basin + crate),
 * a BEDROOM behind an internal divider wall (bed + nightstand), and a
 * LIVING/entry area (chair + table on a rug by the south door). Floor, walls,
 * the divider, windows and lighting are code-drawn (the old 10×7 room-backdrop
 * sprite is retired — it can't stretch; W2 regenerates proper interior art).
 * Every furniture piece is a placeable INSTANCE (world/furniture.ts) rendered
 * BY KIND at its position; the hearth/basin/bed keep their dual-path PixelLab
 * sprite (code painter = the zero-PNG fallback), the rest are code-drawn.
 * Still humble and worn — the "before" the housing upgrades contrast against.
 */
export function drawInterior(g: CanvasRenderingContext2D, _time: number, phase: DayPhase) {
  const { w, h } = ROOM;
  const daylight = phase === "day" ? 1 : phase === "dawn" ? 0.72 : phase === "dusk" ? 0.46 : 0.14;

  paintFloor(g, w, h);
  // rugs are floor decals — under everything else
  for (const f of HOME_FURNITURE) if (f.kind === "rug") paintRug(g, furnitureRect(f));
  paintDoorWear(g);                                   // trampled patch at the doorstep (wear hint)

  // architecture over the floor edges
  paintWalls(g, w, h);
  paintDivider(g, h);
  for (const win of HOME_WINDOWS) paintWindowShaft(g, win, daylight);   // daylight falling on the floor
  for (const win of HOME_WINDOWS) paintWindow(g, win, daylight);

  // furniture (non-rug), foot-y sorted so nearer (south) pieces overlap farther
  const items = HOME_FURNITURE
    .filter((f) => f.kind !== "rug")
    .sort((a, b) => a.y + a.h - (b.y + b.h));
  for (const f of items) PAINTERS[f.kind](g, furnitureRect(f), f);

  paintDoorMat(g);                                    // the worn exit mat, on the threshold
}

// ===========================================================================
//  Architecture painters
// ===========================================================================
function paintFloor(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#8a6a45";
  g.fillRect(0, 0, w, h);
  // vertical plank seams
  g.strokeStyle = "rgba(60,40,20,.35)"; g.lineWidth = 2;
  for (let px = 0; px <= w; px += T * 1.25) { g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke(); }
  // faint horizontal grain
  g.fillStyle = "rgba(0,0,0,.10)";
  for (let py = 0; py < h; py += T * 0.9) g.fillRect(0, py, w, 1.5);
  // a couple of darker worn/rotten boards (the cottage is still humble)
  g.fillStyle = "#715433";
  g.fillRect(T * 6.6, T * 3.7, T * 1.25, T * 1.0);
  g.fillRect(T * 11.4, T * 8.1, T * 1.25, T * 1.1);
  g.strokeStyle = "#3f2c18"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(T * 6.8, T * 3.9); g.lineTo(T * 7.6, T * 4.5); g.stroke();
}

function paintWalls(g: CanvasRenderingContext2D, w: number, h: number) {
  const N = WALL.north, S = WALL.south, Wd = WALL.side;
  // north wall — the deep mount wall (hearth/counter/basin/bed head sit into it)
  g.fillStyle = "#5d4630"; g.fillRect(0, 0, w, N);
  g.fillStyle = "rgba(0,0,0,.16)";                       // stud shadows
  for (let px = 0; px < w; px += T * 0.9) g.fillRect(px, 0, 2, N);
  g.fillStyle = "rgba(255,225,180,.05)"; g.fillRect(0, 0, w, 4);   // top rail catch-light
  g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(0, N - 3, w, 3);     // baseboard shadow
  // west / east strips + south lip
  g.fillStyle = "#4e3a24";
  g.fillRect(0, 0, Wd, h);
  g.fillRect(w - Wd, 0, Wd, h);
  g.fillRect(0, h - S, w, S);
  // the south door OPENING — a dark threshold gap in the south lip
  g.fillStyle = "#241a10";
  g.fillRect(HOME_DOOR.x, h - S, HOME_DOOR.w, S);
}

function paintDivider(g: CanvasRenderingContext2D, _h: number) {
  for (const d of DIVIDER_SEGMENTS) {
    g.fillStyle = "#5d4630"; g.fillRect(d.x, d.y, d.w, d.h);
    g.fillStyle = "rgba(255,225,180,.05)"; g.fillRect(d.x, d.y, 3, d.h);          // lit west face
    g.fillStyle = "rgba(0,0,0,.20)"; g.fillRect(d.x + d.w - 3, d.y, 3, d.h);      // shaded east face
  }
  // frame the doorway gap with jamb caps so it reads as a real opening
  g.fillStyle = "#6b4e30";
  g.fillRect(DIVIDER_X - 1, DIVIDER_GAP.y0 - 5, DIVIDER_W + 2, 6);   // north jamb head
  g.fillRect(DIVIDER_X - 1, DIVIDER_GAP.y1 - 1, DIVIDER_W + 2, 6);   // south jamb head
}

function lerpHex(daylight: number): string {
  // night deep-blue → day pale sky
  const night = [27, 41, 66], day = [206, 230, 239];
  const t = daylight;
  const c = night.map((n, i) => Math.round(n + (day[i]! - n) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function paintWindow(g: CanvasRenderingContext2D, win: WindowDef, daylight: number) {
  g.fillStyle = "#3a2a18";                                 // frame
  g.fillRect(win.x - 2, win.y - 2, win.w + 4, win.h + 4);
  g.fillStyle = lerpHex(daylight);                         // pane
  g.fillRect(win.x, win.y, win.w, win.h);
  // muntins (cross bars)
  g.fillStyle = "#3a2a18";
  g.fillRect(win.x + win.w / 2 - 1, win.y, 2, win.h);
  g.fillRect(win.x, win.y + win.h / 2 - 1, win.w, 2);
  // sill
  g.fillStyle = "#6b4e30";
  g.fillRect(win.x - 3, win.y + win.h, win.w + 6, 3);
}

function paintWindowShaft(g: CanvasRenderingContext2D, win: WindowDef, daylight: number) {
  if (daylight < 0.3) return;                              // no shaft after dusk
  g.save();
  g.fillStyle = `rgba(255,240,200,${0.10 * daylight})`;
  const cx = win.x + win.w / 2;
  if (win.wall === "north") {
    g.beginPath();
    g.moveTo(win.x, win.y + win.h); g.lineTo(win.x + win.w, win.y + win.h);
    g.lineTo(cx + win.w, win.y + win.h + T * 2.4); g.lineTo(cx - win.w, win.y + win.h + T * 2.4);
    g.closePath(); g.fill();
  } else if (win.wall === "east") {
    const cy = win.y + win.h / 2;
    g.beginPath();
    g.moveTo(win.x, win.y); g.lineTo(win.x, win.y + win.h);
    g.lineTo(win.x - T * 2.2, cy + win.h); g.lineTo(win.x - T * 2.2, cy - win.h);
    g.closePath(); g.fill();
  }
  g.restore();
}

function paintDoorWear(g: CanvasRenderingContext2D) {
  const d = HOME_DOOR;
  g.fillStyle = "rgba(40,30,16,.20)";
  g.beginPath(); g.ellipse(d.x + d.w * 0.5, d.y - 8, d.w * 0.55, 15, 0, 0, 7); g.fill();
}

function paintDoorMat(g: CanvasRenderingContext2D) {
  const d = HOME_DOOR, mh = d.h * 0.8;
  g.fillStyle = "#a08a5f";
  g.fillRect(d.x, d.y, d.w, mh);
  g.strokeStyle = "rgba(70,55,30,.5)"; g.lineWidth = 1.5;
  g.strokeRect(d.x + 3, d.y + 3, d.w - 6, mh - 6);
  g.strokeStyle = "rgba(70,55,30,.3)"; g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const yy = d.y + 3 + (i * (mh - 6)) / 4;
    g.beginPath(); g.moveTo(d.x + 4, yy); g.lineTo(d.x + d.w - 4, yy); g.stroke();
  }
}

// ===========================================================================
//  Furniture painters — one per kind, drawn at the instance's footprint rect.
//  hearth / basin / bed are DUAL-PATH (PixelLab sprite when present, this code
//  when not); the rest are code-only (still zero-PNG-safe by construction).
// ===========================================================================
function paintHearth(g: CanvasRenderingContext2D, r: Rect) {
  // ash/soot smear on the floor at the hearth mouth (wear hint)
  g.fillStyle = "rgba(26,22,18,.26)";
  g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h + 5, r.w * 0.5, 8, 0, 0, 7); g.fill();

  const img = sprite("interior/hearth");
  if (img) { drawGroundSprite(g, img, r.x + r.w / 2, r.y + r.h, HEARTH_SHEET.cx, HEARTH_SHEET.foot, SPRITE_HEARTH_SCALE); return; }
  g.fillStyle = "#6f6f78"; g.fillRect(r.x, r.y, r.w, r.h);                 // stone body
  g.fillStyle = "#8c8c94";                                                // stones
  for (let i = 0; i < 8; i++)
    g.fillRect(r.x + (i % 4) * r.w * 0.25 + 2, r.y + Math.floor(i / 4) * r.h * 0.45 + 2, r.w * 0.25 - 4, r.h * 0.4);
  g.fillStyle = "#1d1a17";                                                // firebox, cold
  g.fillRect(r.x + r.w * 0.22, r.y + r.h * 0.35, r.w * 0.56, r.h * 0.6);
  g.fillStyle = "rgba(20,16,12,.55)";                                     // soot smear above
  g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.22, r.w * 0.34, r.h * 0.2, 0, 0, 7); g.fill();
  g.fillStyle = "#3d3f45";                                                // the one rusty pot
  g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.78, r.w * 0.17, r.h * 0.17, 0, 0, 7); g.fill();
  g.strokeStyle = "#2b2d31"; g.lineWidth = 2;
  g.beginPath(); g.arc(r.x + r.w * 0.5, r.y + r.h * 0.68, r.w * 0.1, Math.PI, 0); g.stroke();
  g.fillStyle = "#7a5230";                                                // empty shelf above
  g.fillRect(r.x + r.w * 0.1, r.y - T * 0.32, r.w * 0.8, T * 0.14);
  g.fillRect(r.x + r.w * 0.18, r.y - T * 0.18, T * 0.1, T * 0.18);
  g.fillRect(r.x + r.w * 0.72, r.y - T * 0.18, T * 0.1, T * 0.18);
}

function paintBasin(g: CanvasRenderingContext2D, r: Rect) {
  const img = sprite("interior/basin");
  if (img) { drawGroundSprite(g, img, r.x + r.w / 2, r.y + r.h, BASIN_SHEET.cx, BASIN_SHEET.foot, SPRITE_BASIN_SCALE); return; }
  g.fillStyle = "#8a6a42";                                                // stand (one splayed leg)
  g.fillRect(r.x + r.w * 0.15, r.y + r.h * 0.5, r.w * 0.1, r.h * 0.5);
  g.save(); g.translate(r.x + r.w * 0.72, r.y + r.h * 0.52); g.rotate(0.16);
  g.fillRect(0, 0, r.w * 0.1, r.h * 0.52); g.restore();
  g.fillRect(r.x, r.y + r.h * 0.42, r.w * 0.85, r.h * 0.12);
  g.fillStyle = "#b06a44";                                                // clay basin
  g.beginPath(); g.ellipse(r.x + r.w * 0.42, r.y + r.h * 0.34, r.w * 0.4, r.h * 0.22, 0, 0, 7); g.fill();
  g.fillStyle = "#7e4a2e";
  g.beginPath(); g.ellipse(r.x + r.w * 0.42, r.y + r.h * 0.3, r.w * 0.3, r.h * 0.13, 0, 0, 7); g.fill();
  g.strokeStyle = "#5e3520"; g.lineWidth = 2;                             // the crack
  g.beginPath();
  g.moveTo(r.x + r.w * 0.2, r.y + r.h * 0.42); g.lineTo(r.x + r.w * 0.34, r.y + r.h * 0.28);
  g.lineTo(r.x + r.w * 0.4, r.y + r.h * 0.4); g.stroke();
  g.fillStyle = "#6f5334";                                                // empty bucket beside
  g.fillRect(r.x - T * 0.42, r.y + r.h * 0.62, T * 0.36, T * 0.4);
  g.strokeStyle = "#4a3722"; g.lineWidth = 2;
  g.beginPath(); g.arc(r.x - T * 0.24, r.y + r.h * 0.62, T * 0.18, Math.PI, 0); g.stroke();
}

function paintBed(g: CanvasRenderingContext2D, r: Rect) {
  const img = sprite("interior/bed");
  if (img) { drawGroundSprite(g, img, r.x + r.w / 2, r.y + r.h, BED_SHEET.cx, BED_SHEET.foot, SPRITE_BED_SCALE); return; }
  g.fillStyle = "#7a5230"; g.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);   // frame
  g.fillStyle = "#d9c27a"; g.fillRect(r.x, r.y, r.w, r.h);                    // straw mattress
  g.strokeStyle = "rgba(150,120,50,.7)"; g.lineWidth = 1.5;                   // straw poking out
  for (let i = 0; i < 9; i++) {
    const sx = r.x + (i * 37) % r.w, sy = r.y + (i * 53) % r.h;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 6, sy - 4); g.stroke();
  }
  g.fillStyle = "#7d8a99"; g.fillRect(r.x, r.y + r.h * 0.45, r.w, r.h * 0.55); // threadbare blanket
  g.fillStyle = "#93a0af"; g.fillRect(r.x + r.w * 0.5, r.y + r.h * 0.62, r.w * 0.3, r.h * 0.18);
  g.strokeStyle = "rgba(40,50,60,.4)";
  g.beginPath(); g.moveTo(r.x, r.y + r.h * 0.45); g.lineTo(r.x + r.w, r.y + r.h * 0.45); g.stroke();
}

function paintChair(g: CanvasRenderingContext2D, r: Rect) {
  const cimg = sprite("interior/chair");
  if (cimg) { drawGroundSprite(g, cimg, r.x + r.w / 2, r.y + r.h, CHAIR_SHEET.cx, CHAIR_SHEET.foot, SPRITE_CHAIR_SCALE); return; }
  const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.55;
  g.save(); g.translate(cx, cy); g.rotate(-0.05);                            // leans on the short leg
  g.fillStyle = "#8a6a42";
  g.fillRect(-T * 0.3, -T * 0.1, T * 0.6, T * 0.14);                         // seat
  g.fillRect(-T * 0.3, -T * 0.72, T * 0.12, T * 0.66);                       // back post
  g.fillRect(T * 0.18, -T * 0.72, T * 0.12, T * 0.66);
  g.fillStyle = "#7a5a38";
  g.fillRect(-T * 0.28, 0, T * 0.1, T * 0.42);                              // front legs
  g.fillRect(T * 0.18, 0, T * 0.1, T * 0.32);                              // the short one
  g.restore();
}

function paintTable(g: CanvasRenderingContext2D, r: Rect) {
  const timg = sprite("interior/table");
  if (timg) { drawGroundSprite(g, timg, r.x + r.w / 2, r.y + r.h, TABLE_SHEET.cx, TABLE_SHEET.foot, SPRITE_TABLE_SCALE); return; }
  g.fillStyle = "#6f5334";                                                   // legs
  g.fillRect(r.x + r.w * 0.14, r.y + r.h * 0.42, T * 0.12, r.h * 0.5);
  g.fillRect(r.x + r.w * 0.72, r.y + r.h * 0.42, T * 0.12, r.h * 0.5);
  g.fillStyle = "#9a7a4e";                                                   // top
  roundRect(g, r.x + r.w * 0.04, r.y + r.h * 0.26, r.w * 0.92, r.h * 0.26, 4); g.fill();
  g.strokeStyle = "#5e4a30"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#b7743a";                                                   // a little bowl (grace note)
  g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.33, r.w * 0.16, r.h * 0.07, 0, 0, 7); g.fill();
}

function paintCrateTable(g: CanvasRenderingContext2D, r: Rect) {
  const cimg = sprite("interior/crate-table");
  if (cimg) { drawGroundSprite(g, cimg, r.x + r.w / 2, r.y + r.h, CRATE_TABLE_SHEET.cx, CRATE_TABLE_SHEET.foot, SPRITE_CRATE_TABLE_SCALE); return; }
  g.fillStyle = "#7a5f3e";                                                   // body (darker than the floor)
  g.fillRect(r.x, r.y + r.h * 0.14, r.w, r.h * 0.82);
  g.fillStyle = "#9c7d52";                                                   // lit top surface
  g.fillRect(r.x - 1, r.y + r.h * 0.04, r.w + 2, r.h * 0.16);
  g.strokeStyle = "#5e4a30"; g.lineWidth = 2;                               // plank edges
  g.strokeRect(r.x, r.y + r.h * 0.14, r.w, r.h * 0.82);
  g.beginPath();                                                            // cross braces
  g.moveTo(r.x, r.y + r.h * 0.2); g.lineTo(r.x + r.w, r.y + r.h * 0.94);
  g.moveTo(r.x + r.w, r.y + r.h * 0.2); g.lineTo(r.x, r.y + r.h * 0.94);
  g.stroke();
  g.fillStyle = "#b8a06a";                                                   // a small sack on top (grace note)
  g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.09, r.w * 0.22, r.h * 0.09, 0, 0, 7); g.fill();
}

function paintCounter(g: CanvasRenderingContext2D, r: Rect) {
  const cimg = sprite("interior/counter");
  if (cimg) { drawGroundSprite(g, cimg, r.x + r.w / 2, r.y + r.h, COUNTER_SHEET.cx, COUNTER_SHEET.foot, SPRITE_COUNTER_SCALE); return; }
  g.fillStyle = "#7a5836";                                                   // cabinet body
  g.fillRect(r.x, r.y + r.h * 0.35, r.w, r.h * 0.65);
  g.fillStyle = "#9c8256";                                                   // worktop
  g.fillRect(r.x - 2, r.y + r.h * 0.28, r.w + 4, r.h * 0.16);
  g.strokeStyle = "#4e3a24"; g.lineWidth = 2;                               // two cabinet doors
  g.strokeRect(r.x + 3, r.y + r.h * 0.5, r.w * 0.45, r.h * 0.42);
  g.strokeRect(r.x + r.w * 0.52, r.y + r.h * 0.5, r.w * 0.45, r.h * 0.42);
  g.fillStyle = "#6b4e30"; g.fillRect(r.x + r.w * 0.1, r.y - 2, r.w * 0.8, 4); // shelf above
  g.fillStyle = "#b7743a";                                                   // jars (grace notes)
  g.beginPath(); g.ellipse(r.x + r.w * 0.32, r.y + r.h * 0.16, 4, 6, 0, 0, 7); g.fill();
  g.fillStyle = "#6f8a5a";
  g.beginPath(); g.ellipse(r.x + r.w * 0.55, r.y + r.h * 0.16, 4, 6, 0, 0, 7); g.fill();
}

function paintNightstand(g: CanvasRenderingContext2D, r: Rect) {
  const nimg = sprite("interior/nightstand");
  if (nimg) { drawGroundSprite(g, nimg, r.x + r.w / 2, r.y + r.h, NIGHTSTAND_SHEET.cx, NIGHTSTAND_SHEET.foot, SPRITE_NIGHTSTAND_SCALE); return; }
  g.fillStyle = "#7a5836";
  g.fillRect(r.x, r.y + r.h * 0.2, r.w, r.h * 0.8);
  g.strokeStyle = "#4e3a24"; g.lineWidth = 1.5;
  g.strokeRect(r.x + 2, r.y + r.h * 0.42, r.w - 4, r.h * 0.3);              // a drawer
  g.fillStyle = "#9c8256"; g.fillRect(r.x - 1, r.y + r.h * 0.12, r.w + 2, r.h * 0.12);  // top
  g.fillStyle = "#e8e0c8"; g.fillRect(r.x + r.w * 0.44, r.y - 3, 3, r.h * 0.22);        // a candle
  g.fillStyle = "#ffcf6a";
  g.beginPath(); g.ellipse(r.x + r.w * 0.44 + 1.5, r.y - 4, 2, 3, 0, 0, 7); g.fill();
}

function paintRug(g: CanvasRenderingContext2D, r: Rect) {
  const rimg = sprite("interior/rug");
  if (rimg) {
    // a flat floor decal — CENTRE the sprite on the rug rect (not base-on-ground)
    drawGroundSprite(g, rimg, r.x + r.w / 2, r.y + r.h / 2, RUG_SHEET.cx, RUG_SHEET.cy, SPRITE_RUG_SCALE);
    return;
  }
  g.save();
  g.fillStyle = "#7c4a46"; roundRect(g, r.x, r.y, r.w, r.h, 8); g.fill();
  g.strokeStyle = "#a9756a"; g.lineWidth = 4; roundRect(g, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 6); g.stroke();
  g.strokeStyle = "rgba(230,200,150,.45)"; g.lineWidth = 2; roundRect(g, r.x + 15, r.y + 15, r.w - 30, r.h - 30, 4); g.stroke();
  g.restore();
}

const PAINTERS: Record<FurnitureKind, (g: CanvasRenderingContext2D, r: Rect, inst: FurnitureInstance) => void> = {
  hearth: paintHearth, counter: paintCounter, basin: paintBasin, crateTable: paintCrateTable,
  bed: paintBed, nightstand: paintNightstand, chair: paintChair, table: paintTable, rug: paintRug,
};

/** Local rounded-rect path helper (canvas roundRect isn't universal). */
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  const r = Math.min(rad, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
