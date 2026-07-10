/** Code-painted item icons for the backpack grid. One painter per item type;
 *  table-driven goods (fish species, junk) share parameterized painters. */

import { FISH } from "../data/fish";
import { CROPS } from "../data/crops";
import { FORAGE } from "../data/forage";
import { RECIPES } from "../data/recipes";
import { FLOWERS } from "../data/flowers";
import { roundR } from "./shapes";

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

/** A cut flower on a short stem, petals + centre tinted per species. */
function paintFlower(
  g: CanvasRenderingContext2D, s: number,
  pal: { petal: string; center: string; leaf: string },
) {
  // stem + a leaf
  g.strokeStyle = pal.leaf; g.lineWidth = Math.max(1.5, s * 0.045); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.5, s * 0.82); g.lineTo(s * 0.5, s * 0.46); g.stroke();
  g.fillStyle = pal.leaf;
  g.beginPath(); g.ellipse(s * 0.4, s * 0.62, s * 0.09, s * 0.045, -0.5, 0, 7); g.fill();
  // five petals around a centre
  g.fillStyle = pal.petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.ellipse(s * 0.5 + Math.cos(a) * s * 0.13, s * 0.36 + Math.sin(a) * s * 0.13,
      s * 0.1, s * 0.07, a, 0, 7);
    g.fill();
  }
  g.fillStyle = pal.center;
  g.beginPath(); g.arc(s * 0.5, s * 0.36, s * 0.075, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,.35)";
  g.beginPath(); g.arc(s * 0.47, s * 0.33, s * 0.025, 0, 7); g.fill();
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

/** Glass gem corn (premium late-game crop): same silhouette as the classic
 *  ear, but each kernel row is its own jewel tone — the whole point of it. */
function paintGlassGemCorn(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#c9b88a";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.48, s * 0.16, s * 0.3, 0.15, 0, 7); g.fill();
  const kernelColors = ["#b03a8a", "#4a8ac9", "#e0a12f", "#7ec46a", "#c94036"];
  let ci = 0;
  for (let row = 0; row < 6; row++) {
    const ry = s * (0.24 + row * 0.085);
    for (const ox of [-0.1, -0.02, 0.06, 0.14]) {
      g.fillStyle = kernelColors[ci++ % kernelColors.length]!;
      g.beginPath(); g.ellipse(s * (0.5 + ox), ry, s * 0.032, s * 0.026, 0.15, 0, 7); g.fill();
    }
  }
  g.fillStyle = "#528a2c";
  g.beginPath(); g.ellipse(s * 0.36, s * 0.62, s * 0.07, s * 0.2, 0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.62, s * 0.66, s * 0.06, s * 0.18, -0.4, 0, 7); g.fill();
}

function paintRod(g: CanvasRenderingContext2D, s: number) {
  // rod (polish pass, Part C content-library commit 2: a grip + reel so the
  // silhouette reads as a fishing rod even without the line/hook detail)
  g.strokeStyle = "#8a6a42"; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.2, s * 0.82); g.lineTo(s * 0.74, s * 0.2); g.stroke();
  g.strokeStyle = "#5e4025"; g.lineWidth = Math.max(3, s * 0.11); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.2, s * 0.82); g.lineTo(s * 0.29, s * 0.72); g.stroke();
  g.fillStyle = "#9aa2ab";
  g.beginPath(); g.arc(s * 0.3, s * 0.68, s * 0.06, 0, 7); g.fill();
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

/** A duck — cream body, flat orange bill (Part C content-library commit 2:
 *  shop-row icon for the new livestock). */
function paintDuck(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#f5eddb";
  g.beginPath(); g.ellipse(s * 0.46, s * 0.56, s * 0.24, s * 0.19, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(s * 0.68, s * 0.4, s * 0.11, 0, 7); g.fill();
  g.fillStyle = "#e0a12f";
  g.beginPath(); g.ellipse(s * 0.8, s * 0.42, s * 0.09, s * 0.05, 0, 0, 7); g.fill();
  g.fillStyle = "#22303a";
  g.beginPath(); g.arc(s * 0.7, s * 0.38, s * 0.02, 0, 7); g.fill();
  g.fillStyle = "#e0d6bc";
  g.beginPath(); g.ellipse(s * 0.42, s * 0.56, s * 0.13, s * 0.1, 0.2, 0, 7); g.fill();
  g.strokeStyle = "#e0a12f"; g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath(); g.moveTo(s * 0.4, s * 0.74); g.lineTo(s * 0.4, s * 0.82); g.stroke();
  g.beginPath(); g.moveTo(s * 0.52, s * 0.74); g.lineTo(s * 0.52, s * 0.82); g.stroke();
}

/** A pig — pink round body, snout, curly tail. */
function paintPig(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#eeb3ab";
  g.beginPath(); g.ellipse(s * 0.46, s * 0.54, s * 0.26, s * 0.2, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(s * 0.74, s * 0.42, s * 0.13, 0, 7); g.fill();
  g.fillStyle = "#c9847a";
  g.beginPath(); g.ellipse(s * 0.79, s * 0.46, s * 0.08, s * 0.06, 0, 0, 7); g.fill();
  g.fillStyle = "#22303a";
  for (const ox of [0.68, 0.86]) { g.beginPath(); g.arc(s * ox, s * 0.44, s * 0.016, 0, 7); g.fill(); }
  g.strokeStyle = "#dda297"; g.lineWidth = Math.max(1, s * 0.04); g.lineCap = "round";
  g.beginPath(); g.arc(s * 0.2, s * 0.5, s * 0.05, 0, 4.5); g.stroke();
  g.fillStyle = "#eeb3ab";
  g.beginPath(); g.ellipse(s * 0.63, s * 0.3, s * 0.05, s * 0.04, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.79, s * 0.3, s * 0.05, s * 0.04, 0, 0, 7); g.fill();
}

/** A sheep — a puffy cream wool cloud over a small dark face + legs. */
function paintSheep(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#f2efe4";
  for (const [ox, oy, r] of [[0.36, 0.5, 0.15], [0.5, 0.42, 0.17], [0.62, 0.5, 0.14], [0.46, 0.6, 0.15]] as const) {
    g.beginPath(); g.arc(s * ox, s * oy, s * r, 0, 7); g.fill();
  }
  g.fillStyle = "#463b2c";
  g.beginPath(); g.arc(s * 0.76, s * 0.48, s * 0.1, 0, 7); g.fill();
  g.fillStyle = "#22303a";
  g.beginPath(); g.arc(s * 0.78, s * 0.45, s * 0.018, 0, 7); g.fill();
  g.strokeStyle = "#3a2f22"; g.lineWidth = Math.max(1, s * 0.04);
  g.beginPath(); g.moveTo(s * 0.42, s * 0.76); g.lineTo(s * 0.42, s * 0.84); g.stroke();
  g.beginPath(); g.moveTo(s * 0.56, s * 0.76); g.lineTo(s * 0.56, s * 0.84); g.stroke();
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

// ===========================================================================
//  Part C content-library commit 2 — 15 forward-content tool/accessory icons
//  (backpack/shop scale). Most have no mechanic yet; they standardize the
//  visual language for v2 gear (a tool handle + a distinct head/body shape,
//  2-3 flat color layers, a small highlight — the same recipe every existing
//  icon above already follows). "boots"/"bait-tin" are deliberately separate
//  ids from the existing junk-catch "boot"/"tin" (Old boot / Empty tin) —
//  those are battered junk, these are clean shop goods.
// ===========================================================================

function paintWateringCan(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#7f868f";
  g.beginPath(); g.ellipse(s * 0.42, s * 0.58, s * 0.2, s * 0.16, 0, 0, 7); g.fill();
  g.fillStyle = "#9aa2ab";
  g.beginPath(); g.ellipse(s * 0.42, s * 0.5, s * 0.16, s * 0.06, 0, 0, 7); g.fill();
  g.strokeStyle = "#7f868f"; g.lineWidth = Math.max(2, s * 0.06); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.58, s * 0.5); g.lineTo(s * 0.8, s * 0.36); g.stroke();
  g.fillStyle = "#9aa2ab";
  g.beginPath(); g.ellipse(s * 0.82, s * 0.33, s * 0.08, s * 0.045, -0.3, 0, 7); g.fill();
  g.strokeStyle = "#6f767f"; g.lineWidth = Math.max(1, s * 0.04);
  g.beginPath(); g.arc(s * 0.42, s * 0.42, s * 0.14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.strokeStyle = "rgba(150,180,210,.8)"; g.lineWidth = Math.max(1, s * 0.02);
  for (const dx of [-0.03, 0.02, 0.07]) {
    g.beginPath(); g.moveTo(s * (0.86 + dx), s * 0.3); g.lineTo(s * (0.84 + dx), s * 0.38); g.stroke();
  }
}

function paintBasket(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#b98a4e";
  g.beginPath();
  g.moveTo(s * 0.28, s * 0.5); g.lineTo(s * 0.72, s * 0.5);
  g.lineTo(s * 0.64, s * 0.82); g.lineTo(s * 0.36, s * 0.82);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(110,74,32,.55)"; g.lineWidth = Math.max(1, s * 0.025);
  for (const fy of [0.6, 0.68, 0.76]) { g.beginPath(); g.moveTo(s * 0.3, s * fy); g.lineTo(s * 0.7, s * fy); g.stroke(); }
  g.strokeStyle = "#8a6636"; g.lineWidth = Math.max(2, s * 0.05);
  g.beginPath(); g.arc(s * 0.5, s * 0.48, s * 0.2, Math.PI, 0); g.stroke();
  g.fillStyle = "#6fae3e";
  g.beginPath(); g.ellipse(s * 0.42, s * 0.48, s * 0.06, s * 0.1, -0.3, 0, 7); g.fill();
  g.fillStyle = "#c2385a";
  g.beginPath(); g.arc(s * 0.55, s * 0.45, s * 0.045, 0, 7); g.fill();
}

/** A drawstring cloth pouch, distinct from the coin pouch and the seed
 *  packet: a gathered, peaked tie at the neck (not a straight-cut rectangle),
 *  so the silhouette reads as a cinched pouch rather than a piece of fruit. */
function paintSeedPouch(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#8a9a5a";
  g.beginPath();
  g.moveTo(s * 0.32, s * 0.4); g.quadraticCurveTo(s * 0.24, s * 0.62, s * 0.34, s * 0.78);
  g.lineTo(s * 0.66, s * 0.78); g.quadraticCurveTo(s * 0.76, s * 0.62, s * 0.68, s * 0.4);
  g.closePath(); g.fill();
  // gathered, peaked neck (a cinch, not a flat cut) + a tie band
  g.fillStyle = "#6f7f42";
  g.beginPath(); g.moveTo(s * 0.4, s * 0.4); g.lineTo(s * 0.5, s * 0.22); g.lineTo(s * 0.6, s * 0.4); g.closePath(); g.fill();
  g.strokeStyle = "#4f5c2e"; g.lineWidth = Math.max(1, s * 0.035);
  g.beginPath(); g.moveTo(s * 0.38, s * 0.42); g.lineTo(s * 0.62, s * 0.42); g.stroke();
  // seeds spilling from the tie gap
  g.fillStyle = "#7a5c2e";
  const dots: Array<[number, number]> = [[0.46, 0.36], [0.54, 0.32], [0.5, 0.4]];
  for (const [ox, oy] of dots) { g.beginPath(); g.ellipse(s * ox, s * oy, s * 0.035, s * 0.024, 0.4, 0, 7); g.fill(); }
}

function paintSickle(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "#7a5230"; g.lineWidth = Math.max(2, s * 0.08); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.28, s * 0.8); g.lineTo(s * 0.42, s * 0.56); g.stroke();
  g.fillStyle = "#c4cad2";
  g.beginPath();
  g.arc(s * 0.5, s * 0.46, s * 0.26, 0.4, 3.6);
  g.closePath(); g.fill();
  g.fillStyle = "#e8e0cc";
  g.beginPath(); g.arc(s * 0.5, s * 0.46, s * 0.2, 0.5, 3.3); g.fill();
}

function paintAxe(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "#7a5230"; g.lineWidth = Math.max(2, s * 0.08); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.32, s * 0.82); g.lineTo(s * 0.6, s * 0.24); g.stroke();
  g.fillStyle = "#9aa2ab";
  g.beginPath();
  g.moveTo(s * 0.56, s * 0.16); g.lineTo(s * 0.82, s * 0.28); g.lineTo(s * 0.68, s * 0.5); g.lineTo(s * 0.5, s * 0.36);
  g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.35)";
  g.beginPath(); g.moveTo(s * 0.58, s * 0.2); g.lineTo(s * 0.72, s * 0.28); g.lineTo(s * 0.62, s * 0.36); g.closePath(); g.fill();
}

function paintPickaxe(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "#7a5230"; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.36, s * 0.82); g.lineTo(s * 0.58, s * 0.34); g.stroke();
  g.strokeStyle = "#8f8a80"; g.lineWidth = Math.max(3, s * 0.09); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.3, s * 0.24); g.quadraticCurveTo(s * 0.58, s * 0.16, s * 0.82, s * 0.34); g.stroke();
  g.fillStyle = "rgba(255,255,255,.3)";
  g.beginPath(); g.ellipse(s * 0.58, s * 0.2, s * 0.05, s * 0.02, 0, 0, 7); g.fill();
}

function paintSack(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#a9825a";
  g.beginPath();
  g.moveTo(s * 0.3, s * 0.42); g.quadraticCurveTo(s * 0.22, s * 0.7, s * 0.36, s * 0.84);
  g.lineTo(s * 0.64, s * 0.84); g.quadraticCurveTo(s * 0.78, s * 0.7, s * 0.7, s * 0.42);
  g.closePath(); g.fill();
  // a narrower roped/tied top (not a wide flat mouth, or it reads as a jug)
  g.fillStyle = "#8a6c42";
  g.beginPath(); g.moveTo(s * 0.4, s * 0.42); g.lineTo(s * 0.44, s * 0.24); g.lineTo(s * 0.56, s * 0.24); g.lineTo(s * 0.6, s * 0.42); g.closePath(); g.fill();
  g.strokeStyle = "#5e4025"; g.lineWidth = Math.max(1, s * 0.035);
  g.beginPath(); g.moveTo(s * 0.42, s * 0.3); g.lineTo(s * 0.58, s * 0.3); g.stroke();
  g.strokeStyle = "rgba(90,60,30,.35)"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(s * 0.34, s * 0.56); g.lineTo(s * 0.66, s * 0.56); g.stroke();
}

function paintLantern(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "#5a5048"; g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath(); g.moveTo(s * 0.5, s * 0.18); g.lineTo(s * 0.5, s * 0.26); g.stroke();
  g.fillStyle = "#3a3630";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.27, s * 0.1, s * 0.04, 0, 0, 7); g.fill();
  g.fillStyle = "#e8c34f";
  roundR(g, s * 0.36, s * 0.3, s * 0.28, s * 0.36, s * 0.06); g.fill();
  g.fillStyle = "rgba(255,240,190,.7)";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.48, s * 0.09, s * 0.13, 0, 0, 7); g.fill();
  g.strokeStyle = "#3a3630"; g.lineWidth = Math.max(1, s * 0.03);
  for (const fx of [0.36, 0.5, 0.64]) { g.beginPath(); g.moveTo(s * fx, s * 0.3); g.lineTo(s * fx, s * 0.66); g.stroke(); }
  g.fillStyle = "#3a3630";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.68, s * 0.14, s * 0.04, 0, 0, 7); g.fill();
}

function paintFishingNet(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "#8a6a42"; g.lineWidth = Math.max(2, s * 0.06); g.lineCap = "round";
  g.beginPath(); g.moveTo(s * 0.24, s * 0.82); g.lineTo(s * 0.44, s * 0.5); g.stroke();
  g.strokeStyle = "#b98a4e"; g.lineWidth = Math.max(2, s * 0.05);
  g.beginPath(); g.arc(s * 0.58, s * 0.36, s * 0.24, 0, 7); g.stroke();
  // netting: a simple crosshatch clipped to the hoop
  g.save();
  g.beginPath(); g.arc(s * 0.58, s * 0.36, s * 0.24, 0, 7); g.clip();
  g.strokeStyle = "rgba(216,210,192,.85)"; g.lineWidth = Math.max(1, s * 0.014);
  for (let i = -3; i <= 3; i++) {
    g.beginPath(); g.moveTo(s * (0.34 + (i + 3) * 0.08), s * 0.12); g.lineTo(s * (0.34 + (i + 3) * 0.08) - s * 0.16, s * 0.6); g.stroke();
    g.beginPath(); g.moveTo(s * (0.34 + (i + 3) * 0.08), s * 0.12); g.lineTo(s * (0.34 + (i + 3) * 0.08) + s * 0.16, s * 0.6); g.stroke();
  }
  g.restore();
}

function paintBinoculars(g: CanvasRenderingContext2D, s: number) {
  // neck strap, behind the barrels
  g.strokeStyle = "#3a3226"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(s * 0.3, s * 0.3); g.quadraticCurveTo(s * 0.5, s * 0.16, s * 0.7, s * 0.3); g.stroke();
  // two barrels, a lighter casing so it reads against a dark slot background
  g.fillStyle = "#5a6a78";
  roundR(g, s * 0.22, s * 0.34, s * 0.24, s * 0.36, s * 0.07); g.fill();
  roundR(g, s * 0.54, s * 0.34, s * 0.24, s * 0.36, s * 0.07); g.fill();
  // bridge connecting them
  g.fillStyle = "#465662";
  g.fillRect(s * 0.44, s * 0.42, s * 0.12, s * 0.12);
  // lenses — big enough to read, with a glint each
  g.fillStyle = "#232b32";
  g.beginPath(); g.arc(s * 0.34, s * 0.44, s * 0.1, 0, 7); g.fill();
  g.beginPath(); g.arc(s * 0.66, s * 0.44, s * 0.1, 0, 7); g.fill();
  g.fillStyle = "rgba(160,205,230,.8)";
  g.beginPath(); g.arc(s * 0.31, s * 0.41, s * 0.03, 0, 7); g.fill();
  g.beginPath(); g.arc(s * 0.63, s * 0.41, s * 0.03, 0, 7); g.fill();
}

/** A small tin of bait — clean shop good, distinct from the battered "Empty
 *  tin" junk catch (which reuses the "tin" id). */
function paintBaitTin(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#8a9aab";
  g.fillRect(s * 0.34, s * 0.34, s * 0.32, s * 0.4);
  g.fillStyle = "#a8b6c4";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.34, s * 0.16, s * 0.05, 0, 0, 7); g.fill();
  g.strokeStyle = "#5a6a78"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.ellipse(s * 0.5, s * 0.34, s * 0.16, s * 0.05, 0, 0, 7); g.stroke();
  g.fillStyle = "#c9502e";
  g.fillRect(s * 0.36, s * 0.46, s * 0.28, s * 0.14);
  g.fillStyle = "#8a6c42";
  g.beginPath(); g.ellipse(s * 0.44, s * 0.6, s * 0.05, s * 0.03, 0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.56, s * 0.64, s * 0.045, s * 0.025, -0.4, 0, 7); g.fill();
}

/** A plain empty bucket — distinct silhouette from the feed pail (no grain,
 *  straighter sides, a wire-thin handle). */
function paintBucket(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#9aa2ab";
  g.beginPath();
  g.moveTo(s * 0.32, s * 0.38); g.lineTo(s * 0.68, s * 0.38);
  g.lineTo(s * 0.62, s * 0.8); g.lineTo(s * 0.38, s * 0.8);
  g.closePath(); g.fill();
  g.fillStyle = "#c4cad2";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.38, s * 0.18, s * 0.055, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(120,128,140,.6)"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(s * 0.4, s * 0.44); g.lineTo(s * 0.36, s * 0.74); g.stroke();
  g.beginPath(); g.moveTo(s * 0.6, s * 0.44); g.lineTo(s * 0.64, s * 0.74); g.stroke();
  g.strokeStyle = "#6f767f"; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.arc(s * 0.5, s * 0.38, s * 0.19, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
}

function paintStrawHat(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#d8b25a";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.56, s * 0.32, s * 0.14, 0, 0, 7); g.fill();
  g.fillStyle = "#c9a23a";
  g.beginPath(); g.ellipse(s * 0.5, s * 0.4, s * 0.19, s * 0.16, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(140,105,40,.5)"; g.lineWidth = Math.max(1, s * 0.02);
  for (let a = 0.2; a < Math.PI - 0.2; a += 0.35) {
    g.beginPath(); g.moveTo(s * 0.5 + Math.cos(Math.PI + a) * s * 0.3, s * 0.56); g.lineTo(s * 0.5 + Math.cos(Math.PI + a) * s * 0.32, s * 0.58); g.stroke();
  }
  g.fillStyle = "#8a3f30";
  g.fillRect(s * 0.36, s * 0.48, s * 0.28, s * 0.04);
}

/** A pair of tall work boots — clean shop good, distinct from the single
 *  battered "Old boot" junk catch (which reuses the "boot" id). */
function paintBoots(g: CanvasRenderingContext2D, s: number) {
  for (const dx of [-0.11, 0.11]) {
    g.fillStyle = "#6f5334";
    g.beginPath();
    g.moveTo(s * (0.5 + dx) - s * 0.07, s * 0.26); g.lineTo(s * (0.5 + dx) + s * 0.07, s * 0.26);
    g.lineTo(s * (0.5 + dx) + s * 0.07, s * 0.58); g.lineTo(s * (0.5 + dx) + s * 0.17, s * 0.64);
    g.quadraticCurveTo(s * (0.5 + dx) + s * 0.2, s * 0.74, s * (0.5 + dx) + s * 0.1, s * 0.78);
    g.lineTo(s * (0.5 + dx) - s * 0.07, s * 0.78);
    g.closePath(); g.fill();
    g.fillStyle = "#57402a";
    g.fillRect(s * (0.5 + dx) - s * 0.07, s * 0.74, s * 0.27, s * 0.05);
    g.strokeStyle = "rgba(40,28,14,.5)"; g.lineWidth = Math.max(1, s * 0.02);
    g.beginPath(); g.moveTo(s * (0.5 + dx) - s * 0.05, s * 0.32); g.lineTo(s * (0.5 + dx) + s * 0.05, s * 0.34); g.stroke();
  }
}

/** A wrapped gift box with a ribbon bow — for the gift chooser UI. */
function paintGiftBox(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#8a5ec2";
  g.fillRect(s * 0.28, s * 0.42, s * 0.44, s * 0.36);
  g.fillStyle = "#7449a8";
  g.fillRect(s * 0.28, s * 0.42, s * 0.44, s * 0.1);
  g.fillStyle = "#e8c34f";
  g.fillRect(s * 0.46, s * 0.42, s * 0.08, s * 0.36);
  g.fillRect(s * 0.28, s * 0.5, s * 0.44, s * 0.06);
  g.beginPath(); g.ellipse(s * 0.42, s * 0.4, s * 0.07, s * 0.05, -0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(s * 0.58, s * 0.4, s * 0.07, s * 0.05, 0.5, 0, 7); g.fill();
  g.fillStyle = "#c9a23a";
  g.beginPath(); g.arc(s * 0.5, s * 0.41, s * 0.04, 0, 7); g.fill();
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
  duck: paintDuck,
  pig: paintPig,
  sheep: paintSheep,
  boot: paintBoot,
  tin: paintTin,
  rope: paintRope,
  // Part C content-library commit 2: 15 forward-content tool/accessory icons
  "watering-can": paintWateringCan,
  basket: paintBasket,
  "seed-pouch": paintSeedPouch,
  sickle: paintSickle,
  axe: paintAxe,
  pickaxe: paintPickaxe,
  sack: paintSack,
  lantern: paintLantern,
  "fishing-net": paintFishingNet,
  binoculars: paintBinoculars,
  "bait-tin": paintBaitTin,
  bucket: paintBucket,
  "straw-hat": paintStrawHat,
  boots: paintBoots,
  "gift-box": paintGiftBox,
  // every fish species shares the tinted silhouette painter
  ...Object.fromEntries(FISH.map((sp) => [sp.id, ((g, s) => paintFishSpecies(g, s, sp.palette)) as IconPainter])),
  "glass-gem-corn": paintGlassGemCorn,
  // crop produce (corn + glass gem corn keep bespoke painters above) + tinted seed packets
  ...Object.fromEntries(CROPS.filter((c) => c.id !== "corn" && c.id !== "glass-gem-corn")
    .map((c) => [c.id, ((g, s) => paintProduce(g, s, c.palette, c.shape)) as IconPainter])),
  ...Object.fromEntries(CROPS.map((c) => [c.seedId, ((g, s) => paintSeedPacket(g, s, c.palette.fruit)) as IconPainter])),
  // wild forage shares four tinted silhouettes (berries keep their classic icon)
  ...Object.fromEntries(FORAGE.filter((f) => f.id !== "berries")
    .map((f) => [f.id, ((g, s) => paintForage(g, s, f.icon)) as IconPainter])),
  // cooked dishes share the steaming-bowl painter
  ...Object.fromEntries(RECIPES.map((r) => [r.id, ((g, s) => paintDish(g, s, r.icon.color)) as IconPainter])),
  "flower-seeds": paintFlowerSeeds,
  // ornamental flowers: cut blooms share the tinted blossom painter, seed
  // packets the tinted-packet painter (both keyed off the species palette)
  ...Object.fromEntries(FLOWERS.map((f) => [f.id, ((g, s) => paintFlower(g, s, f.palette)) as IconPainter])),
  ...Object.fromEntries(FLOWERS.map((f) => [f.seedId, ((g, s) => paintSeedPacket(g, s, f.palette.petal)) as IconPainter])),
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
