/** Code-painted item icons for the backpack grid. One painter per item type;
 *  table-driven goods (fish species, junk) share parameterized painters. */

import { FISH } from "../data/fish";
import { CROPS } from "../data/crops";
import { FORAGE } from "../data/forage";
import { RECIPES } from "../data/recipes";

/** A cooked dish: steaming bowl, contents tinted per recipe. */
function paintDish(g: CanvasRenderingContext2D, s: number, color: string) {
  g.fillStyle = "#c9b585";                                        // bowl
  g.beginPath(); g.ellipse(s * 0.5, s * 0.6, s * 0.26, s * 0.18, 0, 0, Math.PI); g.fill();
  g.fillRect(s * 0.24, s * 0.52, s * 0.52, s * 0.1);
  g.fillStyle = color;                                            // contents
  g.beginPath(); g.ellipse(s * 0.5, s * 0.52, s * 0.23, s * 0.08, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(240,234,214,.6)"; g.lineWidth = Math.max(1, s * 0.03); g.lineCap = "round";
  for (const ox of [-0.08, 0.06]) {                               // steam
    g.beginPath();
    g.moveTo(s * (0.5 + ox), s * 0.4);
    g.quadraticCurveTo(s * (0.46 + ox), s * 0.32, s * (0.5 + ox), s * 0.24);
    g.stroke();
  }
}

function paintFlowerSeeds(g: CanvasRenderingContext2D, s: number) {
  // packet with a little blossom on the label
  g.fillStyle = "#e0cfa0";
  g.fillRect(s * 0.3, s * 0.26, s * 0.4, s * 0.5);
  g.fillStyle = "#c9b585";
  g.beginPath(); g.moveTo(s * 0.3, s * 0.26); g.lineTo(s * 0.5, s * 0.36); g.lineTo(s * 0.7, s * 0.26); g.closePath(); g.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillStyle = "#d16a9a";
    g.beginPath(); g.arc(s * 0.5 + Math.cos(a) * s * 0.07, s * 0.52 + Math.sin(a) * s * 0.07, s * 0.045, 0, 7); g.fill();
  }
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(s * 0.5, s * 0.52, s * 0.04, 0, 7); g.fill();
}

/** Wild-forage icons: four silhouettes (berry cluster / mushroom cap /
 *  leafy sprig / nut), tinted per item from data/forage.ts. */
function paintForage(
  g: CanvasRenderingContext2D, s: number,
  icon: { color: string; kind: "cluster" | "cap" | "sprig" | "nut" },
) {
  if (icon.kind === "cluster") {
    g.fillStyle = "#528034";
    g.beginPath(); g.ellipse(s * 0.62, s * 0.32, s * 0.16, s * 0.08, -0.6, 0, 7); g.fill();
    g.fillStyle = icon.color;
    const dots: Array<[number, number]> = [[0.38, 0.5], [0.56, 0.44], [0.5, 0.62], [0.66, 0.58]];
    for (const [ox, oy] of dots) { g.beginPath(); g.arc(s * ox, s * oy, s * 0.11, 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,255,255,.5)";
    for (const [ox, oy] of dots) { g.beginPath(); g.arc(s * (ox - 0.03), s * (oy - 0.03), s * 0.032, 0, 7); g.fill(); }
  } else if (icon.kind === "cap") {
    g.fillStyle = "#e8e0cc";                                       // stem
    g.fillRect(s * 0.44, s * 0.48, s * 0.13, s * 0.3);
    g.fillStyle = icon.color;                                      // cap
    g.beginPath(); g.ellipse(s * 0.5, s * 0.46, s * 0.26, s * 0.16, 0, Math.PI, 0); g.fill();
    g.fillStyle = "rgba(255,255,255,.25)";
    g.beginPath(); g.ellipse(s * 0.42, s * 0.4, s * 0.07, s * 0.04, -0.4, 0, 7); g.fill();
  } else if (icon.kind === "sprig") {
    g.strokeStyle = "#4a7a2a"; g.lineWidth = Math.max(1.5, s * 0.04); g.lineCap = "round";
    g.beginPath(); g.moveTo(s * 0.5, s * 0.78); g.quadraticCurveTo(s * 0.46, s * 0.5, s * 0.52, s * 0.24); g.stroke();
    g.fillStyle = icon.color;
    for (const [ox, oy, rot] of [[0.4, 0.42, -0.7], [0.62, 0.36, 0.6], [0.42, 0.6, -0.5], [0.6, 0.56, 0.5]] as const) {
      g.beginPath(); g.ellipse(s * ox, s * oy, s * 0.13, s * 0.06, rot, 0, 7); g.fill();
    }
  } else {                                                          // nut
    g.fillStyle = icon.color;
    g.beginPath(); g.ellipse(s * 0.44, s * 0.56, s * 0.15, s * 0.17, -0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(s * 0.62, s * 0.5, s * 0.13, s * 0.15, 0.3, 0, 7); g.fill();
    g.fillStyle = "rgba(90,60,30,.5)";                              // caps on top
    g.beginPath(); g.ellipse(s * 0.42, s * 0.44, s * 0.11, s * 0.06, -0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(s * 0.63, s * 0.4, s * 0.1, s * 0.05, 0.3, 0, 7); g.fill();
  }
}

type IconPainter = (g: CanvasRenderingContext2D, s: number) => void;

/** Seed packet tinted by the crop it grows. */
function paintSeedPacket(g: CanvasRenderingContext2D, s: number, tint = "#7a5c2e") {
  g.fillStyle = "#e0cfa0";
  g.fillRect(s * 0.3, s * 0.26, s * 0.4, s * 0.5);
  g.fillStyle = "#c9b585";
  g.beginPath(); g.moveTo(s * 0.3, s * 0.26); g.lineTo(s * 0.5, s * 0.36); g.lineTo(s * 0.7, s * 0.26); g.closePath(); g.fill();
  // the crop's colour on the label + a few spilling seeds
  g.fillStyle = tint;
  g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.08, 0, 7); g.fill();
  g.fillStyle = "#7a5c2e";
  const dots: Array<[number, number]> = [[0.42, 0.66], [0.52, 0.7], [0.6, 0.64]];
  for (const [ox, oy] of dots) {
    g.beginPath(); g.ellipse(s * ox, s * oy, s * 0.045, s * 0.03, 0.6, 0, 7); g.fill();
  }
}

/** Generic produce silhouette tinted per crop (corn keeps its own painter). */
function paintProduce(
  g: CanvasRenderingContext2D, s: number,
  pal: { leaf: string; fruit: string }, shape: "round" | "long",
) {
  g.fillStyle = pal.fruit;
  if (shape === "round") {
    g.beginPath(); g.ellipse(s * 0.5, s * 0.56, s * 0.24, s * 0.22, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.25)";
    g.beginPath(); g.ellipse(s * 0.42, s * 0.48, s * 0.07, s * 0.05, -0.5, 0, 7); g.fill();
  } else {
    g.beginPath(); g.ellipse(s * 0.5, s * 0.58, s * 0.13, s * 0.28, 0.25, 0, 7); g.fill();
    g.fillStyle = "rgba(0,0,0,.12)";
    g.beginPath(); g.ellipse(s * 0.53, s * 0.62, s * 0.08, s * 0.2, 0.25, 0, 7); g.fill();
  }
  g.fillStyle = pal.leaf;   // leafy top
  g.beginPath(); g.ellipse(s * 0.46, s * 0.3, s * 0.08, s * 0.13, -0.6, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.58, s * 0.3, s * 0.07, s * 0.11, 0.5, 0, 7); g.fill();
}

/** Shared fish silhouette, tinted per species from its data-table palette. */
function paintFishSpecies(
  g: CanvasRenderingContext2D, s: number,
  pal: { body: string; belly: string; tail: string } = { body: "#6fa8c9", belly: "#a8cde3", tail: "#5b90ad" },
) {
  const cx = s * 0.46, cy = s * 0.5;
  // body
  g.fillStyle = pal.body;
  g.beginPath(); g.ellipse(cx, cy, s * 0.3, s * 0.17, 0, 0, 7); g.fill();
  // belly highlight
  g.fillStyle = pal.belly;
  g.beginPath(); g.ellipse(cx, cy + s * 0.06, s * 0.24, s * 0.09, 0, 0, 7); g.fill();
  // tail
  g.fillStyle = pal.tail;
  g.beginPath();
  g.moveTo(cx + s * 0.26, cy);
  g.lineTo(cx + s * 0.44, cy - s * 0.14);
  g.lineTo(cx + s * 0.44, cy + s * 0.14);
  g.closePath(); g.fill();
  // eye
  g.fillStyle = "#22303a";
  g.beginPath(); g.arc(cx - s * 0.16, cy - s * 0.04, s * 0.035, 0, 7); g.fill();
}

const paintFish: IconPainter = (g, s) => paintFishSpecies(g, s);

function paintBoot(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#6f5334";
  g.beginPath();
  g.moveTo(s * 0.34, s * 0.24); g.lineTo(s * 0.52, s * 0.24);
  g.lineTo(s * 0.52, s * 0.55); g.lineTo(s * 0.74, s * 0.62);
  g.quadraticCurveTo(s * 0.8, s * 0.72, s * 0.72, s * 0.78);
  g.lineTo(s * 0.34, s * 0.78);
  g.closePath(); g.fill();
  g.fillStyle = "#57402a";
  g.fillRect(s * 0.3, s * 0.74, s * 0.48, s * 0.08);   // worn sole
  g.strokeStyle = "#4a3722"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(s * 0.38, s * 0.3); g.lineTo(s * 0.48, s * 0.34); g.stroke();
  g.beginPath(); g.moveTo(s * 0.38, s * 0.4); g.lineTo(s * 0.48, s * 0.44); g.stroke();
}

function paintTin(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#9aa2ab";
  g.fillRect(s * 0.34, s * 0.32, s * 0.32, s * 0.42);
  g.fillStyle = "#c4cad2";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.32, s * 0.16, s * 0.06, 0, 0, 7); g.fill();
  // dented side + bent lid
  g.fillStyle = "#7f868f";
  g.beginPath(); g.ellipse(s * 0.4, s * 0.55, s * 0.05, s * 0.09, 0.3, 0, 7); g.fill();
  g.strokeStyle = "#c4cad2"; g.lineWidth = Math.max(1, s * 0.04); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.62, s * 0.3); g.lineTo(s * 0.74, s * 0.2); g.stroke();
}

function paintRope(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "#a9885a"; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.arc(s * 0.46, s * 0.5, s * 0.18, 0.4, 5.6); g.stroke();
  g.beginPath(); g.arc(s * 0.56, s * 0.56, s * 0.11, 1.2, 6.6); g.stroke();
  // loose frayed end
  g.beginPath(); g.moveTo(s * 0.62, s * 0.36); g.quadraticCurveTo(s * 0.78, s * 0.3, s * 0.8, s * 0.44); g.stroke();
  g.strokeStyle = "#8a6c42"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(s * 0.78, s * 0.44); g.lineTo(s * 0.84, s * 0.52); g.stroke();
  g.beginPath(); g.moveTo(s * 0.8, s * 0.42); g.lineTo(s * 0.88, s * 0.46); g.stroke();
}

function paintCoinPouch(g: CanvasRenderingContext2D, s: number) {
  const cx = s * 0.5;
  // sack
  g.fillStyle = "#a9784a";
  g.beginPath(); g.ellipse(cx, s * 0.6, s * 0.28, s * 0.26, 0, 0, 7); g.fill();
  // neck + tie
  g.fillStyle = "#8a5f38";
  g.fillRect(cx - s * 0.09, s * 0.26, s * 0.18, s * 0.14);
  g.fillStyle = "#5e4025";
  g.fillRect(cx - s * 0.11, s * 0.34, s * 0.22, s * 0.05);
  // coin peeking out
  g.fillStyle = "#e8c34f";
  g.beginPath(); g.arc(cx, s * 0.24, s * 0.09, 0, 7); g.fill();
  g.strokeStyle = "#b8912f"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.arc(cx, s * 0.24, s * 0.06, 0, 7); g.stroke();
}

function paintBerries(g: CanvasRenderingContext2D, s: number) {
  // small leaf behind the cluster
  g.fillStyle = "#528034";
  g.beginPath(); g.ellipse(s * 0.62, s * 0.32, s * 0.16, s * 0.08, -0.6, 0, 7); g.fill();
  // berry cluster
  g.fillStyle = "#c2385a";
  const dots: Array<[number, number]> = [[0.38, 0.5], [0.56, 0.44], [0.5, 0.62], [0.66, 0.58]];
  for (const [ox, oy] of dots) {
    g.beginPath(); g.arc(s * ox, s * oy, s * 0.11, 0, 7); g.fill();
  }
  g.fillStyle = "rgba(255,255,255,.55)";
  for (const [ox, oy] of dots) {
    g.beginPath(); g.arc(s * (ox - 0.03), s * (oy - 0.03), s * 0.032, 0, 7); g.fill();
  }
}

function paintHoe(g: CanvasRenderingContext2D, s: number) {
  // wooden handle, diagonal
  g.strokeStyle = "#8a6a42"; g.lineWidth = Math.max(2, s * 0.09); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.25, s * 0.78); g.lineTo(s * 0.68, s * 0.24); g.stroke();
  // metal blade
  g.fillStyle = "#9aa2ab";
  g.beginPath();
  g.moveTo(s * 0.62, s * 0.18);
  g.lineTo(s * 0.82, s * 0.34);
  g.lineTo(s * 0.72, s * 0.5);
  g.lineTo(s * 0.58, s * 0.32);
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.35)";
  g.beginPath(); g.moveTo(s * 0.64, s * 0.22); g.lineTo(s * 0.76, s * 0.32); g.lineTo(s * 0.7, s * 0.4); g.closePath(); g.fill();
}

function paintSeeds(g: CanvasRenderingContext2D, s: number) {
  // paper packet
  g.fillStyle = "#e0cfa0";
  g.fillRect(s * 0.3, s * 0.26, s * 0.4, s * 0.5);
  g.fillStyle = "#c9b585";
  g.beginPath(); g.moveTo(s * 0.3, s * 0.26); g.lineTo(s * 0.5, s * 0.36); g.lineTo(s * 0.7, s * 0.26); g.closePath(); g.fill();
  // seeds spilling
  g.fillStyle = "#7a5c2e";
  const dots: Array<[number, number]> = [[0.42, 0.55], [0.52, 0.62], [0.6, 0.52], [0.47, 0.7], [0.58, 0.72]];
  for (const [ox, oy] of dots) {
    g.beginPath(); g.ellipse(s * ox, s * oy, s * 0.045, s * 0.03, 0.6, 0, 7); g.fill();
  }
}

function paintCorn(g: CanvasRenderingContext2D, s: number) {
  // golden ear
  g.fillStyle = "#e8c85a";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.48, s * 0.16, s * 0.3, 0.15, 0, 7); g.fill();
  // kernel rows
  g.strokeStyle = "rgba(180,140,40,.6)"; g.lineWidth = Math.max(1, s * 0.02);
  for (const ox of [-0.06, 0, 0.06]) {
    g.beginPath(); g.moveTo(s * (0.5 + ox), s * 0.24); g.lineTo(s * (0.52 + ox), s * 0.72); g.stroke();
  }
  // husk leaves
  g.fillStyle = "#528a2c";
  g.beginPath(); g.ellipse(s * 0.36, s * 0.62, s * 0.07, s * 0.2, 0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.62, s * 0.66, s * 0.06, s * 0.18, -0.4, 0, 7); g.fill();
}

function paintRod(g: CanvasRenderingContext2D, s: number) {
  // rod
  g.strokeStyle = "#8a6a42"; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.2, s * 0.82); g.lineTo(s * 0.74, s * 0.2); g.stroke();
  // line + hook
  g.strokeStyle = "#d8d2c0"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(s * 0.74, s * 0.2); g.lineTo(s * 0.78, s * 0.6); g.stroke();
  g.beginPath(); g.arc(s * 0.74, s * 0.63, s * 0.05, -0.5, 2.6); g.stroke();
}

function paintLute(g: CanvasRenderingContext2D, s: number) {
  // body
  g.fillStyle = "#a9784a";
  g.beginPath(); g.ellipse(s * 0.42, s * 0.6, s * 0.2, s * 0.24, -0.5, 0, 7); g.fill();
  g.fillStyle = "#5e4025";
  g.beginPath(); g.arc(s * 0.44, s * 0.58, s * 0.06, 0, 7); g.fill();
  // neck + head
  g.strokeStyle = "#7a5230"; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.52, s * 0.46); g.lineTo(s * 0.78, s * 0.2); g.stroke();
  g.fillStyle = "#5e4025"; g.fillRect(s * 0.74, s * 0.12, s * 0.1, s * 0.12);
  // strings
  g.strokeStyle = "#e8ddca"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(s * 0.36, s * 0.68); g.lineTo(s * 0.76, s * 0.22); g.stroke();
  g.beginPath(); g.moveTo(s * 0.42, s * 0.72); g.lineTo(s * 0.8, s * 0.26); g.stroke();
}

function paintHen(g: CanvasRenderingContext2D, s: number) {
  // plump white body
  g.fillStyle = "#f2ede2";
  g.beginPath(); g.ellipse(s * 0.48, s * 0.56, s * 0.24, s * 0.2, 0, 0, 7); g.fill();
  // head + comb + beak
  g.beginPath(); g.arc(s * 0.68, s * 0.38, s * 0.11, 0, 7); g.fill();
  g.fillStyle = "#c94b3e";
  g.beginPath(); g.arc(s * 0.68, s * 0.27, s * 0.045, 0, 7); g.fill();
  g.fillStyle = "#e0a33a";
  g.beginPath(); g.moveTo(s * 0.78, s * 0.38); g.lineTo(s * 0.88, s * 0.41); g.lineTo(s * 0.78, s * 0.44); g.closePath(); g.fill();
  // eye + wing + legs
  g.fillStyle = "#22303a";
  g.beginPath(); g.arc(s * 0.7, s * 0.36, s * 0.02, 0, 7); g.fill();
  g.fillStyle = "#ddd4c2";
  g.beginPath(); g.ellipse(s * 0.44, s * 0.56, s * 0.13, s * 0.1, 0.2, 0, 7); g.fill();
  g.strokeStyle = "#e0a33a"; g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath(); g.moveTo(s * 0.42, s * 0.74); g.lineTo(s * 0.42, s * 0.84); g.stroke();
  g.beginPath(); g.moveTo(s * 0.54, s * 0.74); g.lineTo(s * 0.54, s * 0.84); g.stroke();
}

function paintCow(g: CanvasRenderingContext2D, s: number) {
  // body with patches
  g.fillStyle = "#f2ede2";
  g.beginPath(); g.ellipse(s * 0.46, s * 0.54, s * 0.28, s * 0.19, 0, 0, 7); g.fill();
  g.fillStyle = "#3a3a40";
  g.beginPath(); g.ellipse(s * 0.36, s * 0.5, s * 0.09, s * 0.07, 0.4, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.56, s * 0.6, s * 0.08, s * 0.06, -0.3, 0, 7); g.fill();
  // head + muzzle + horns
  g.fillStyle = "#f2ede2";
  g.beginPath(); g.arc(s * 0.74, s * 0.42, s * 0.12, 0, 7); g.fill();
  g.fillStyle = "#e2b8a8";
  g.beginPath(); g.ellipse(s * 0.78, s * 0.48, s * 0.08, s * 0.05, 0, 0, 7); g.fill();
  g.strokeStyle = "#d8d2c0"; g.lineWidth = Math.max(1, s * 0.035); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.68, s * 0.32); g.lineTo(s * 0.63, s * 0.26); g.stroke();
  g.beginPath(); g.moveTo(s * 0.8, s * 0.32); g.lineTo(s * 0.85, s * 0.26); g.stroke();
  // eye + legs
  g.fillStyle = "#22303a";
  g.beginPath(); g.arc(s * 0.72, s * 0.4, s * 0.02, 0, 7); g.fill();
  g.fillStyle = "#e8e2d2";
  g.fillRect(s * 0.3, s * 0.68, s * 0.05, s * 0.14);
  g.fillRect(s * 0.56, s * 0.68, s * 0.05, s * 0.14);
}

/** A feed pail — a metal bucket with a hoop handle (Animal-Keeper kit). */
function paintPail(g: CanvasRenderingContext2D, s: number) {
  // tapered bucket body
  g.fillStyle = "#9aa2ab";
  g.beginPath();
  g.moveTo(s * 0.34, s * 0.4); g.lineTo(s * 0.66, s * 0.4);
  g.lineTo(s * 0.6, s * 0.78); g.lineTo(s * 0.4, s * 0.78);
  g.closePath(); g.fill();
  // rim + a little grain of feed at the top
  g.fillStyle = "#c4cad2";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.4, s * 0.16, s * 0.06, 0, 0, 7); g.fill();
  g.fillStyle = "#d8b25a";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.4, s * 0.1, s * 0.035, 0, 0, 7); g.fill();
  // shading band + hoop handle
  g.fillStyle = "#7f868f";
  g.fillRect(s * 0.4, s * 0.6, s * 0.2, s * 0.05);
  g.strokeStyle = "#6f767f"; g.lineWidth = Math.max(1, s * 0.035); g.lineCap = "round";
  g.beginPath(); g.arc(s * 0.5, s * 0.4, s * 0.17, Math.PI * 1.08, Math.PI * 1.92, true); g.stroke();
}

/** A cooking pot — squat black cauldron with a lid knob (Animal-Keeper kit). */
function paintPot(g: CanvasRenderingContext2D, s: number) {
  // body
  g.fillStyle = "#3a3a40";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.58, s * 0.26, s * 0.2, 0, 0, 7); g.fill();
  g.fillRect(s * 0.24, s * 0.44, s * 0.52, s * 0.14);
  // rim + lid
  g.fillStyle = "#55555e";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.44, s * 0.27, s * 0.08, 0, 0, 7); g.fill();
  g.fillStyle = "#2c2c32";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.42, s * 0.22, s * 0.06, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(s * 0.5, s * 0.38, s * 0.035, 0, 7); g.fill();   // lid knob
  // little side handles + a warm sheen
  g.strokeStyle = "#2c2c32"; g.lineWidth = Math.max(1, s * 0.04); g.lineCap = "round";
  g.beginPath(); g.arc(s * 0.24, s * 0.52, s * 0.05, Math.PI * 0.4, Math.PI * 1.6); g.stroke();
  g.beginPath(); g.arc(s * 0.76, s * 0.52, s * 0.05, Math.PI * 1.4, Math.PI * 0.6); g.stroke();
  g.fillStyle = "rgba(255,255,255,.14)";
  g.beginPath(); g.ellipse(s * 0.42, s * 0.55, s * 0.06, s * 0.03, -0.4, 0, 7); g.fill();
}

const PAINTERS: Record<string, IconPainter> = {
  fish: paintFish,
  coins: paintCoinPouch,
  berries: paintBerries,
  hoe: paintHoe,
  seeds: paintSeeds,
  corn: paintCorn,
  rod: paintRod,
  lute: paintLute,
  pot: paintPot,
  pail: paintPail,
  hen: paintHen,
  cow: paintCow,
  boot: paintBoot,
  tin: paintTin,
  rope: paintRope,
  // every fish species shares the tinted silhouette painter
  ...Object.fromEntries(FISH.map((sp) => [sp.id, ((g, s) => paintFishSpecies(g, s, sp.palette)) as IconPainter])),
  // crop produce (corn keeps its bespoke painter below) + tinted seed packets
  ...Object.fromEntries(CROPS.filter((c) => c.id !== "corn")
    .map((c) => [c.id, ((g, s) => paintProduce(g, s, c.palette, c.shape)) as IconPainter])),
  ...Object.fromEntries(CROPS.map((c) => [c.seedId, ((g, s) => paintSeedPacket(g, s, c.palette.fruit)) as IconPainter])),
  // wild forage shares four tinted silhouettes (berries keep their classic icon)
  ...Object.fromEntries(FORAGE.filter((f) => f.id !== "berries")
    .map((f) => [f.id, ((g, s) => paintForage(g, s, f.icon)) as IconPainter])),
  // cooked dishes share the steaming-bowl painter
  ...Object.fromEntries(RECIPES.map((r) => [r.id, ((g, s) => paintDish(g, s, r.icon.color)) as IconPainter])),
  "flower-seeds": paintFlowerSeeds,
};

/** Draws the icon for an item id into a square of side `size` at the ctx origin. */
export function drawItemIcon(g: CanvasRenderingContext2D, id: string, size: number) {
  const paint = PAINTERS[id];
  if (paint) { paint(g, size); return; }
  // unknown item: neutral placeholder crate so new items never render blank
  g.fillStyle = "#8a6f4d";
  g.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
  g.strokeStyle = "#5e4a30"; g.lineWidth = Math.max(1, size * 0.03);
  g.strokeRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
}
