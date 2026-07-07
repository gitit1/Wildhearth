/**
 * Ambient particle system (Part B #10) — ONE fixed-size pool (allocation-free
 * per frame: every particle is a pre-allocated record, `active` toggles it),
 * shared by two kinds of emitter:
 *  - seasonal drift: sparse, gentle background motes keyed to season + time
 *    of day (spring petals, summer motes by day / fireflies by dusk-night,
 *    autumn falling leaves, winter snow) — recycled as they drift out of the
 *    viewport, never fully "reset", so the sky never empties then refills.
 *  - `burst(kind, x, y)`: a short-lived feedback sparkle any painter/system
 *    can trigger (catch splash, harvest leaf-puff, skill-gain glint).
 * World-space, depth-agnostic — main.ts draws this above the entity pass and
 * below the day/night tint. Like daynight.ts/weatherfx.ts, this module takes
 * only plain values (season/phase as local string-literal types, structurally
 * identical to systems/calendar.ts's — no import needed) so art/ never reads
 * systems/ directly.
 *
 * Per-kind look/feel numbers (colors, speeds, sizes, life) are PURE ART
 * CONSTANTS and live here, matching rig.ts/animalRig.ts's own convention
 * ("pure art constants live here; gameplay-tuning values live in config.ts").
 * The pool caps + burst counts (the only numbers that matter for perf/
 * balance) are in config.ts.
 */
import {
  PARTICLE_POOL_MAX, PARTICLE_AMBIENT_MAX, PARTICLE_FIREFLY_MAX,
  PARTICLE_BURST_COUNTS, PARTICLE_VIEWPORT_PAD,
} from "../config";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type DayPhase = "dawn" | "day" | "dusk" | "night";
export type DriftKind = "petal" | "mote" | "firefly" | "leaf" | "snow";
export type BurstKind = "splash" | "leafpuff" | "glint";
type Kind = DriftKind | BurstKind;

export interface Viewport { camx: number; camy: number; vw: number; vh: number }

interface Particle {
  active: boolean;
  kind: Kind;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  phase: number;    // running per-particle clock (sway/blink), NOT wall-clock time
  size: number;
  rot: number; spin: number;
  colorIdx: number;
}

function freshParticle(): Particle {
  return { active: false, kind: "petal", x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, phase: 0, size: 1, rot: 0, spin: 0, colorIdx: 0 };
}

const pool: Particle[] = Array.from({ length: PARTICLE_POOL_MAX }, freshParticle);
const DRIFT_KINDS: ReadonlySet<Kind> = new Set(["petal", "mote", "firefly", "leaf", "snow"]);
const AMBIENT_SPAWN_RATE = 5;   // attempts/sec while under cap — fills the sparse cap in a few seconds

// ---- pure art constants: per-kind look + feel ------------------------------
const DRIFT_SPEED: Record<DriftKind, [number, number]> = {
  petal: [7, 15], mote: [1.5, 4], firefly: [3, 7], leaf: [11, 21], snow: [7, 15],
};
const DRIFT_SIZE: Record<DriftKind, [number, number]> = {
  petal: [2.2, 3.4], mote: [1, 1.7], firefly: [1.6, 2.3], leaf: [2.6, 4], snow: [1.3, 2.5],
};
const DRIFT_COLORS: Record<DriftKind, string[]> = {
  petal: ["#f6c9dd", "#f9e0ea", "#eeb3cf"],
  mote: ["rgba(255,244,200,.7)"],
  firefly: ["#d8f27a"],
  leaf: ["#c9722f", "#a85a24", "#d99a3a"],
  snow: ["#ffffff", "#eef6ff"],
};
const BURST_SPEED: Record<BurstKind, [number, number]> = { splash: [30, 60], leafpuff: [18, 38], glint: [22, 46] };
const BURST_SIZE: Record<BurstKind, [number, number]> = { splash: [1.4, 2.4], leafpuff: [2, 3.2], glint: [1.2, 2] };
const BURST_LIFE: Record<BurstKind, number> = { splash: 0.5, leafpuff: 0.65, glint: 0.4 };
const BURST_COLORS: Record<BurstKind, string[]> = {
  splash: ["#bfe6f5", "#e8f7ff"], leafpuff: ["#6fae3e", "#8a6a3a", "#4a7a2a"], glint: ["#ffe27a", "#fff2c0"],
};

/** Which drift kind is active right now, if any (one at a time). */
function activeDrift(season: Season, phase: DayPhase): DriftKind | null {
  switch (season) {
    case "spring": return "petal";
    case "summer": return phase === "dusk" || phase === "night" ? "firefly" : "mote";
    case "autumn": return "leaf";
    case "winter": return "snow";
  }
}

function findFree(): Particle | null {
  for (const p of pool) if (!p.active) return p;
  return null;
}

function spawnDrift(kind: DriftKind, vp: Viewport) {
  const p = findFree(); if (!p) return;
  const [minS, maxS] = DRIFT_SPEED[kind];
  const speed = minS + Math.random() * (maxS - minS);
  const [minSz, maxSz] = DRIFT_SIZE[kind];
  p.active = true; p.kind = kind;
  p.x = vp.camx + Math.random() * vp.vw;
  p.y = vp.camy + Math.random() * vp.vh;
  p.vx = (Math.random() * 2 - 1) * speed * 0.4;
  p.vy = kind === "mote" || kind === "firefly" ? 0 : speed;
  p.size = minSz + Math.random() * (maxSz - minSz);
  p.rot = Math.random() * Math.PI * 2;
  p.spin = (Math.random() * 2 - 1) * 1.1;
  p.phase = Math.random() * 20;
  p.colorIdx = (Math.random() * DRIFT_COLORS[kind].length) | 0;
  p.life = 0; p.maxLife = 1;
}

/** Spawns a short-lived feedback burst at a world point — catch splash,
 *  harvest puff, skill-gain glint. Silently no-ops if the pool is full
 *  (bursts are rare/brief; ambient's small cap always leaves headroom). */
export function burst(kind: BurstKind, x: number, y: number) {
  const count = PARTICLE_BURST_COUNTS[kind];
  for (let i = 0; i < count; i++) {
    const p = findFree(); if (!p) return;
    const [minS, maxS] = BURST_SPEED[kind];
    const speed = minS + Math.random() * (maxS - minS);
    const angle = kind === "glint" ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() * 2 - 1) * 1.1;
    const [minSz, maxSz] = BURST_SIZE[kind];
    p.active = true; p.kind = kind; p.x = x; p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = minSz + Math.random() * (maxSz - minSz);
    p.rot = Math.random() * Math.PI * 2;
    p.spin = (Math.random() * 2 - 1) * 4;
    p.phase = 0;
    p.colorIdx = (Math.random() * BURST_COLORS[kind].length) | 0;
    p.maxLife = BURST_LIFE[kind]; p.life = p.maxLife;
  }
}

function stepDrift(p: Particle, dt: number) {
  switch (p.kind) {
    case "petal":
    case "leaf":
      p.x += (p.vx + Math.sin(p.phase * 1.6) * 7) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      break;
    case "snow":
      p.x += (p.vx + Math.sin(p.phase * 1.1) * 3) * dt;
      p.y += p.vy * dt;
      break;
    case "mote":
      p.x += Math.sin(p.phase * 0.6) * 4 * dt;
      p.y += Math.cos(p.phase * 0.5) * 3 * dt - 1.2 * dt;
      break;
    case "firefly":
      p.x += Math.sin(p.phase * 0.9) * 6 * dt;
      p.y += Math.cos(p.phase * 1.3) * 5 * dt;
      break;
    default: break;
  }
}

function stepBurst(p: Particle, dt: number) {
  switch (p.kind) {
    case "splash": p.vy += 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt; break;
    case "leafpuff": p.vy += 55 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt; break;
    case "glint": p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.88; p.vy *= 0.88; break;
    default: break;
  }
}

/**
 * Advances every active particle + tops up the current seasonal drift kind
 * toward its sparse cap. Call every frame — like the weather layer, this
 * keeps drifting through dialogue/menu pauses (ambient atmosphere, not
 * simulated game-time).
 */
export function updateParticles(dt: number, season: Season, phase: DayPhase, vp: Viewport) {
  const kind = activeDrift(season, phase);
  if (kind) {
    const cap = kind === "firefly" ? PARTICLE_FIREFLY_MAX : PARTICLE_AMBIENT_MAX;
    let have = 0;
    for (const p of pool) if (p.active && p.kind === kind) have++;
    if (have < cap && Math.random() < AMBIENT_SPAWN_RATE * dt) spawnDrift(kind, vp);
  }
  const pad = PARTICLE_VIEWPORT_PAD;
  for (const p of pool) {
    if (!p.active) continue;
    p.phase += dt;
    if (DRIFT_KINDS.has(p.kind)) {
      stepDrift(p, dt);
      const outOfView = p.x < vp.camx - pad || p.x > vp.camx + vp.vw + pad ||
        p.y < vp.camy - pad || p.y > vp.camy + vp.vh + pad;
      if (outOfView || p.kind !== kind) p.active = false;   // recycled — the spawn above refills the cap
    } else {
      stepBurst(p, dt);
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }
}

function drawSparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  g.globalAlpha = alpha;
  g.strokeStyle = color; g.lineWidth = Math.max(0.8, r * 0.5); g.lineCap = "round";
  g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
}

/** Dev-only verification hook: how many pool slots are active, by kind (and
 *  the pool's total capacity), so an automated check can confirm seasonal
 *  drift is actually spawning without relying on pixel-diffing a screenshot. */
export function debugParticleCounts(): Record<string, number> {
  const counts: Record<string, number> = { poolMax: pool.length };
  for (const p of pool) if (p.active) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
  return counts;
}

/** Paints every active particle. World space, depth-agnostic: call after the
 *  entity pass, before the day/night tint. */
export function drawParticles(g: CanvasRenderingContext2D) {
  for (const p of pool) {
    if (!p.active) continue;
    switch (p.kind) {
      case "petal":
      case "leaf": {
        g.save();
        g.globalAlpha = 0.9;
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = DRIFT_COLORS[p.kind][p.colorIdx]!;
        g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        break;
      }
      case "snow": {
        g.globalAlpha = 0.85;
        g.fillStyle = DRIFT_COLORS.snow[p.colorIdx]!;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
        break;
      }
      case "mote": {
        g.globalAlpha = 0.35 + Math.sin(p.phase * 2) * 0.15;
        g.fillStyle = DRIFT_COLORS.mote[0]!;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
        break;
      }
      case "firefly": {
        const blink = 0.35 + Math.max(0, Math.sin(p.phase * 2.4)) * 0.65;
        g.globalAlpha = blink;
        const glow = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        glow.addColorStop(0, "rgba(216,242,122,.65)");
        glow.addColorStop(1, "rgba(216,242,122,0)");
        g.fillStyle = glow;
        g.beginPath(); g.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2); g.fill();
        g.globalAlpha = Math.min(1, blink + 0.2);
        g.fillStyle = DRIFT_COLORS.firefly[0]!;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
        break;
      }
      case "splash": {
        const a = Math.max(0, p.life / p.maxLife);
        g.globalAlpha = a;
        g.fillStyle = BURST_COLORS.splash[p.colorIdx]!;
        g.beginPath(); g.ellipse(p.x, p.y, p.size, p.size * 1.4, 0, 0, Math.PI * 2); g.fill();
        break;
      }
      case "leafpuff": {
        const a = Math.max(0, p.life / p.maxLife);
        g.save();
        g.globalAlpha = a;
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = BURST_COLORS.leafpuff[p.colorIdx]!;
        g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        break;
      }
      case "glint": {
        const a = Math.max(0, p.life / p.maxLife);
        drawSparkle(g, p.x, p.y, p.size * 2.2, BURST_COLORS.glint[p.colorIdx]!, a);
        break;
      }
    }
  }
  g.globalAlpha = 1;
}
