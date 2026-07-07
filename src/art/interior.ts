import {
  T, SPRITE_HEARTH_SCALE, SPRITE_ROOM_SCALE, SPRITE_BASIN_SCALE,
  SPRITE_BED_SCALE, SPRITE_CHAIR_CRATE_SCALE,
} from "../config";
import { ROOM, R_HEARTH, R_BASIN, R_BED, R_REST, R_DOOR } from "../world/zones";
import { sprite, drawGroundSprite } from "./sprites";
import type { DayPhase } from "../systems/calendar";

// hearth sprite sheet anchor (64x80, measured bbox): centre col 32, base row 78
const HEARTH_SHEET = { cx: 32, foot: 78 };
// room backdrop (320x240, fully opaque — a full-bleed background, not a
// footprint sprite): the room is 320x224, 16px SHORTER than the sheet. Rather
// than rescale (which would blur crisp pixel art for a mere 7% mismatch),
// it's placed by OFFSET only — bottom-anchored flush with the room's south
// edge (where the player actually stands/exits), letting the extra wall
// height "ride above" the room's nominal top edge into the dark surround the
// interior camera already paints there (harmless — nothing is drawn at
// negative room-y today). Measured: the plank floor starts ≈y100 in sheet
// space, i.e. the back wall reads as a deep ~86px band once bottom-anchored —
// deeper than the old thin painter wall, but every wall-mounted piece
// (hearth/basin/bed) now reads as properly built into that wall, not floating.
const ROOM_SHEET = { cx: 160, foot: 240 };
// furniture sheet anchors (measured alpha bbox: centre col, base/foot row)
const BASIN_SHEET = { cx: 24, foot: 57 };          // 48x64
const BED_SHEET = { cx: 31.5, foot: 66 };          // 64x80
const CHAIR_CRATE_SHEET = { cx: 31.5, foot: 50 };  // 64x64

/**
 * The house interior, tier-1: deliberately bare and broken. Every spot here
 * is the "before" picture that later furniture upgrades (Housing tier 2/3)
 * get contrasted against — soot, cracks, straw, a wobbly chair. All drawn in
 * code, per the art rule.
 */

export function drawInterior(g: CanvasRenderingContext2D, time: number, phase: DayPhase) {
  const { w, h } = ROOM;

  // --- floor + walls: the room's base. Sprite when present (bottom-anchored,
  // see ROOM_SHEET above); the worn-plank/bare-wall painter below is the
  // fallback. The sprite has its own worn/cracked floor boards baked in, so
  // the fallback-only "rotten boards" detail is skipped on the sprite path
  // (it would double up) — everything else below (wall crack + light shaft,
  // hearth/basin/bed/rest, exit mat) draws on both paths, unchanged. ---
  const backdrop = sprite("interior/room-backdrop");
  if (backdrop) {
    drawGroundSprite(g, backdrop, w / 2, h, ROOM_SHEET.cx, ROOM_SHEET.foot, SPRITE_ROOM_SCALE);
  } else {
    // --- floor: worn planks, two of them cracked/rotten ---
    g.fillStyle = "#8a6a45";
    g.fillRect(0, T * 1.2, w, h - T * 1.2);
    g.strokeStyle = "rgba(60,40,20,.35)"; g.lineWidth = 2;
    for (let px = 0; px <= w; px += T * 1.25) {
      g.beginPath(); g.moveTo(px, T * 1.2); g.lineTo(px, h); g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,.12)";
    for (let py = T * 1.2; py < h; py += T * 0.9) g.fillRect(0, py, w, 1.5);
    // rotten boards: darker, with a split
    g.fillStyle = "#6b4e30";
    g.fillRect(T * 2.5, T * 3.4, T * 1.25, T * 0.9);
    g.fillRect(T * 6.9, T * 5.2, T * 1.25, T * 0.9);
    g.strokeStyle = "#3f2c18"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(T * 2.6, T * 3.6); g.lineTo(T * 3.6, T * 4.1); g.stroke();
    g.beginPath(); g.moveTo(T * 7.0, T * 5.9); g.lineTo(T * 8.0, T * 5.4); g.stroke();

    // --- walls: bare — no pictures, no curtains ---
    g.fillStyle = "#5d4630";
    g.fillRect(0, 0, w, T * 1.2);                       // north wall face
    g.fillStyle = "#4e3a24";
    g.fillRect(0, 0, T * 0.35, h);                      // west edge
    g.fillRect(w - T * 0.35, 0, T * 0.35, h);           // east edge
    g.fillRect(0, h - T * 0.25, w, T * 0.25);           // south lip
    g.fillStyle = "rgba(0,0,0,.18)";
    for (let px = 0; px < w; px += T * 0.9) g.fillRect(px, 0, 2, T * 1.2);
  }

  // the thin wall crack: a visible line of light leans in while it's day
  g.strokeStyle = "#3a2a18"; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(T * 7.3, T * 0.15); g.lineTo(T * 7.15, T * 1.15); g.stroke();
  if (phase === "day" || phase === "dawn") {
    const flicker = 0.5 + Math.sin(time * 0.7) * 0.06;
    g.fillStyle = `rgba(255,236,170,${0.35 * flicker})`;
    g.beginPath();
    g.moveTo(T * 7.3, T * 0.2); g.lineTo(T * 7.15, T * 1.15);
    g.lineTo(T * 6.4, T * 3.4); g.lineTo(T * 6.9, T * 3.5);
    g.closePath(); g.fill();
  }

  // --- cooking spot: the hearth. Sprite when present (aligned base-on-floor,
  // centred on R_HEARTH, chimney overhanging up the north wall); the code
  // painter below is the fallback. The cook-fire glow + interaction are
  // unchanged (they live in the cooking system, keyed to R_HEARTH). ---
  {
    const r = R_HEARTH;
    const hearthImg = sprite("interior/hearth");
    if (hearthImg) {
      drawGroundSprite(g, hearthImg, r.x + r.w / 2, r.y + r.h, HEARTH_SHEET.cx, HEARTH_SHEET.foot, SPRITE_HEARTH_SCALE);
    } else {
    g.fillStyle = "#6f6f78";                                      // stone body
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = "#8c8c94";                                      // stones
    for (let i = 0; i < 8; i++)
      g.fillRect(r.x + (i % 4) * r.w * 0.25 + 2, r.y + Math.floor(i / 4) * r.h * 0.45 + 2, r.w * 0.25 - 4, r.h * 0.4);
    g.fillStyle = "#1d1a17";                                      // firebox, cold
    g.fillRect(r.x + r.w * 0.22, r.y + r.h * 0.35, r.w * 0.56, r.h * 0.6);
    g.fillStyle = "rgba(20,16,12,.55)";                           // soot smear above
    g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.22, r.w * 0.34, r.h * 0.2, 0, 0, 7); g.fill();
    // the one slightly rusty pot
    g.fillStyle = "#3d3f45";
    g.beginPath(); g.ellipse(r.x + r.w * 0.5, r.y + r.h * 0.78, r.w * 0.17, r.h * 0.17, 0, 0, 7); g.fill();
    g.fillStyle = "#8a4a2a";
    g.beginPath(); g.ellipse(r.x + r.w * 0.58, r.y + r.h * 0.74, r.w * 0.05, r.h * 0.06, 0.4, 0, 7); g.fill();
    g.strokeStyle = "#2b2d31"; g.lineWidth = 2;
    g.beginPath(); g.arc(r.x + r.w * 0.5, r.y + r.h * 0.68, r.w * 0.1, Math.PI, 0); g.stroke();
    // empty shelf above
    g.fillStyle = "#7a5230";
    g.fillRect(r.x + r.w * 0.1, r.y - T * 0.32, r.w * 0.8, T * 0.14);
    g.fillRect(r.x + r.w * 0.18, r.y - T * 0.18, T * 0.1, T * 0.18);
    g.fillRect(r.x + r.w * 0.72, r.y - T * 0.18, T * 0.1, T * 0.18);
    }
  }

  // --- wash spot: cracked clay basin on a wobbly stand, empty bucket.
  // Sprite when present (anchored base-on-floor, centred on R_BASIN); the
  // code painter below is the fallback. Wash interaction unchanged (keyed to
  // R_BASIN, in the needs system). ---
  {
    const r = R_BASIN;
    const basinImg = sprite("interior/basin");
    if (basinImg) {
      drawGroundSprite(g, basinImg, r.x + r.w / 2, r.y + r.h, BASIN_SHEET.cx, BASIN_SHEET.foot, SPRITE_BASIN_SCALE);
    } else {
    g.fillStyle = "#8a6a42";                                      // stand (one leg splayed)
    g.fillRect(r.x + r.w * 0.15, r.y + r.h * 0.5, r.w * 0.1, r.h * 0.5);
    g.save();
    g.translate(r.x + r.w * 0.72, r.y + r.h * 0.52); g.rotate(0.16);
    g.fillRect(0, 0, r.w * 0.1, r.h * 0.52);
    g.restore();
    g.fillRect(r.x, r.y + r.h * 0.42, r.w * 0.85, r.h * 0.12);
    g.fillStyle = "#b06a44";                                      // clay basin
    g.beginPath(); g.ellipse(r.x + r.w * 0.42, r.y + r.h * 0.34, r.w * 0.4, r.h * 0.22, 0, 0, 7); g.fill();
    g.fillStyle = "#7e4a2e";
    g.beginPath(); g.ellipse(r.x + r.w * 0.42, r.y + r.h * 0.3, r.w * 0.3, r.h * 0.13, 0, 0, 7); g.fill();
    g.strokeStyle = "#5e3520"; g.lineWidth = 2;                   // the crack
    g.beginPath();
    g.moveTo(r.x + r.w * 0.2, r.y + r.h * 0.42);
    g.lineTo(r.x + r.w * 0.34, r.y + r.h * 0.28);
    g.lineTo(r.x + r.w * 0.4, r.y + r.h * 0.4);
    g.stroke();
    // empty bucket beside (well water, no plumbing)
    g.fillStyle = "#6f5334";
    g.fillRect(r.x - T * 0.42, r.y + r.h * 0.62, T * 0.36, T * 0.4);
    g.strokeStyle = "#4a3722"; g.lineWidth = 2;
    g.beginPath(); g.arc(r.x - T * 0.24, r.y + r.h * 0.62, T * 0.18, Math.PI, 0); g.stroke();
    }
  }

  // --- bed: creaky frame, straw mattress, one threadbare blanket, no pillow.
  // Sprite when present (base-on-floor, centred on R_BED); the code painter
  // below is the fallback. Sleep interaction unchanged (keyed to R_BED). ---
  {
    const r = R_BED;
    const bedImg = sprite("interior/bed");
    if (bedImg) {
      drawGroundSprite(g, bedImg, r.x + r.w / 2, r.y + r.h, BED_SHEET.cx, BED_SHEET.foot, SPRITE_BED_SCALE);
    } else {
    g.fillStyle = "#7a5230";                                      // frame
    g.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    g.fillStyle = "#d9c27a";                                      // straw mattress
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = "rgba(150,120,50,.7)"; g.lineWidth = 1.5;     // straw poking out
    for (let i = 0; i < 9; i++) {
      const sx = r.x + (i * 37) % r.w, sy = r.y + (i * 53) % r.h;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 6, sy - 4); g.stroke();
    }
    g.fillStyle = "#7d8a99";                                      // threadbare blanket, lower half
    g.fillRect(r.x, r.y + r.h * 0.45, r.w, r.h * 0.55);
    g.fillStyle = "#93a0af";                                      // worn patch
    g.fillRect(r.x + r.w * 0.5, r.y + r.h * 0.62, r.w * 0.3, r.h * 0.18);
    g.strokeStyle = "rgba(40,50,60,.4)";
    g.beginPath(); g.moveTo(r.x, r.y + r.h * 0.45); g.lineTo(r.x + r.w, r.y + r.h * 0.45); g.stroke();
    }
  }

  // --- rest spot: a chair with one short leg + a crate for a table. Sprite
  // when present (base-on-floor, centred on R_REST); the code painter below
  // is the fallback. Sit interaction unchanged (keyed to R_REST). ---
  {
    const r = R_REST;
    const chairImg = sprite("interior/chair-crate");
    if (chairImg) {
      drawGroundSprite(g, chairImg, r.x + r.w / 2, r.y + r.h, CHAIR_CRATE_SHEET.cx, CHAIR_CRATE_SHEET.foot, SPRITE_CHAIR_CRATE_SCALE);
    } else {
    // chair (leans slightly — the short leg)
    g.save();
    g.translate(r.x + r.w * 0.2, r.y + r.h * 0.55); g.rotate(-0.06);
    g.fillStyle = "#8a6a42";
    g.fillRect(-T * 0.32, -T * 0.1, T * 0.64, T * 0.14);          // seat
    g.fillRect(-T * 0.32, -T * 0.72, T * 0.12, T * 0.66);         // back
    g.fillRect(-T * 0.3, 0, T * 0.1, T * 0.42);                   // legs
    g.fillRect(T * 0.2, 0, T * 0.1, T * 0.34);                    // the short one
    g.restore();
    // crate table
    g.fillStyle = "#8a6f4d";
    g.fillRect(r.x + r.w * 0.5, r.y + r.h * 0.12, r.w * 0.42, r.h * 0.7);
    g.strokeStyle = "#5e4a30"; g.lineWidth = 2;
    g.strokeRect(r.x + r.w * 0.5, r.y + r.h * 0.12, r.w * 0.42, r.h * 0.7);
    g.beginPath();
    g.moveTo(r.x + r.w * 0.5, r.y + r.h * 0.12); g.lineTo(r.x + r.w * 0.92, r.y + r.h * 0.82);
    g.moveTo(r.x + r.w * 0.92, r.y + r.h * 0.12); g.lineTo(r.x + r.w * 0.5, r.y + r.h * 0.82);
    g.stroke();
    }
  }

  // --- the way out: a worn mat by the south door ---
  g.fillStyle = "#a08a5f";
  g.fillRect(R_DOOR.x, R_DOOR.y, R_DOOR.w, R_DOOR.h * 0.7);
  g.strokeStyle = "rgba(70,55,30,.5)"; g.lineWidth = 1.5;
  g.strokeRect(R_DOOR.x + 3, R_DOOR.y + 3, R_DOOR.w - 6, R_DOOR.h * 0.7 - 6);
}
