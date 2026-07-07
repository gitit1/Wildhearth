/**
 * Weather visual layer (Part B #8) — screen-space rain/storm streaks, a
 * rare lightning flash + dark beat, drifting fog banks, and a subtle
 * ground-tone tint. One pooled droplet array + a fixed fog-bank array
 * (allocation-free per frame). Reads only the `WeatherKind` string main.ts
 * hands in — this module never imports systems/weather.ts's state shape.
 *
 * Gap note: DECISIONS' "Weather v1: full — clear/cloudy/rain/storm/fog" lists
 * "cloudy", but `WeatherKind` (systems/weather.ts) only has clear/rain/storm/
 * fog today — adding a new weather STATE is Part A #8 (weather integration)
 * scope, not this visual-foundation batch. Rain/storm/fog are implemented
 * below; cloudy is left as a documented gap (see WORKLOG's Follow-ups).
 */
import {
  WEATHER_RAIN_COUNT, WEATHER_STORM_COUNT, WEATHER_RAIN_FALL_SPEED, WEATHER_STORM_FALL_SPEED,
  WEATHER_RAIN_SLANT, WEATHER_STORM_SLANT, WEATHER_RAIN_STREAK_LEN, WEATHER_STORM_STREAK_LEN,
  WEATHER_FOG_BANKS, WEATHER_FOG_SPEED, WEATHER_FOG_ALPHA, WEATHER_FOG_RADIUS,
  WEATHER_LIGHTNING_CHANCE_PER_SEC, WEATHER_LIGHTNING_FLASH_UP, WEATHER_LIGHTNING_FLASH_DOWN,
  WEATHER_LIGHTNING_DARK_BEAT, WEATHER_LIGHTNING_DARK_ALPHA, WEATHER_TINT_ALPHA,
} from "../config";
import type { WeatherKind } from "../systems/weather";

const MAX_DROPS = Math.max(WEATHER_RAIN_COUNT, WEATHER_STORM_COUNT);

/** Normalized (0..1 of viewport) screen-space droplets — recycled, never
 *  reallocated. Resize-proof: positions scale with whatever w/h are passed
 *  to draw(), so a window resize never needs the pool to be rebuilt. */
interface Drop { nx: number; ny: number }
const drops: Drop[] = Array.from({ length: MAX_DROPS }, () => ({ nx: Math.random(), ny: Math.random() * -1 }));

interface FogBank { nx: number; ny: number; r: number; dir: 1 | -1 }
const fogBanks: FogBank[] = Array.from({ length: WEATHER_FOG_BANKS }, (_, i) => ({
  nx: (i + 0.5) / WEATHER_FOG_BANKS - 0.5,
  ny: 0.18 + (i % 2) * 0.3 + i * 0.06,
  r: WEATHER_FOG_RADIUS * (0.8 + 0.18 * i),
  dir: i % 2 === 0 ? 1 : -1,
}));

let lightningT = 0;   // seconds left in the current flash (up-ramp + down-ramp)
let darkBeatT = 0;    // seconds left in the post-flash "beat of extra darkness"

/**
 * Advances rain/storm droplets, fog drift, and the rare lightning flash.
 * Call every frame REGARDLESS of pause state (dialogue/menus) — weather is
 * ambient atmosphere, not simulated game-time, so it keeps gently drifting
 * through a pause rather than freezing (a judgment call, noted in WORKLOG).
 */
export function updateWeatherFx(dt: number, kind: WeatherKind) {
  if (kind === "rain" || kind === "storm") {
    const storm = kind === "storm";
    const [minS, maxS] = storm ? WEATHER_STORM_FALL_SPEED : WEATHER_RAIN_FALL_SPEED;
    const slant = storm ? WEATHER_STORM_SLANT : WEATHER_RAIN_SLANT;
    const count = storm ? WEATHER_STORM_COUNT : WEATHER_RAIN_COUNT;
    for (let i = 0; i < count; i++) {
      const d = drops[i]!;
      const speed = minS + ((i * 37) % 11) / 11 * (maxS - minS);   // deterministic per-slot spread, no per-frame RNG
      d.ny += speed * dt;
      d.nx += slant * dt;
      if (d.ny > 1.05 || d.nx > 1.15) { d.ny = -0.05 - Math.random() * 0.2; d.nx = Math.random(); }
    }
  }
  if (kind === "storm") {
    if (lightningT > 0) {
      lightningT -= dt;
      if (lightningT <= 0) { lightningT = 0; darkBeatT = WEATHER_LIGHTNING_DARK_BEAT; }
    } else if (darkBeatT > 0) {
      darkBeatT -= dt;
    } else if (Math.random() < WEATHER_LIGHTNING_CHANCE_PER_SEC * dt) {
      lightningT = WEATHER_LIGHTNING_FLASH_UP + WEATHER_LIGHTNING_FLASH_DOWN;
    }
  } else {
    lightningT = 0; darkBeatT = 0;
  }
  if (kind === "fog") {
    for (const b of fogBanks) {
      b.nx += b.dir * WEATHER_FOG_SPEED * dt;
      if (b.nx > 1.3) b.nx = -1.3;
      if (b.nx < -1.3) b.nx = 1.3;
    }
  }
}

function drawRain(g: CanvasRenderingContext2D, w: number, h: number, storm: boolean) {
  const count = storm ? WEATHER_STORM_COUNT : WEATHER_RAIN_COUNT;
  const slant = storm ? WEATHER_STORM_SLANT : WEATHER_RAIN_SLANT;
  const streak = (storm ? WEATHER_STORM_STREAK_LEN : WEATHER_RAIN_STREAK_LEN) * h;
  const dx = slant * streak * 2.2;   // wind-bent streak angle (storm leans harder — bigger slant)
  g.strokeStyle = storm ? "rgba(210,222,240,.55)" : "rgba(210,222,240,.4)";
  g.lineWidth = storm ? 1.6 : 1.2;
  g.beginPath();
  for (let i = 0; i < count; i++) {
    const d = drops[i]!;
    const x = d.nx * w, y = d.ny * h;
    g.moveTo(x, y);
    g.lineTo(x - dx, y - streak);
  }
  g.stroke();
}

function drawFog(g: CanvasRenderingContext2D, w: number, h: number) {
  for (const b of fogBanks) {
    const cx = b.nx * w, cy = b.ny * h, r = b.r * w;
    // g.ellipse() draws different x/y radii natively — no transform juggling,
    // so the gradient (baked to absolute canvas coords at creation, per spec)
    // always lines up with the shape it fills.
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(226,230,234,${WEATHER_FOG_ALPHA})`);
    grad.addColorStop(1, "rgba(226,230,234,0)");
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2); g.fill();
  }
}

function lightningAlpha(): number {
  if (lightningT <= 0) return 0;
  const total = WEATHER_LIGHTNING_FLASH_UP + WEATHER_LIGHTNING_FLASH_DOWN;
  const elapsed = total - lightningT;
  if (elapsed < WEATHER_LIGHTNING_FLASH_UP) return elapsed / WEATHER_LIGHTNING_FLASH_UP;
  return Math.max(0, 1 - (elapsed - WEATHER_LIGHTNING_FLASH_UP) / WEATHER_LIGHTNING_FLASH_DOWN);
}

function drawLightning(g: CanvasRenderingContext2D, w: number, h: number) {
  const a = lightningAlpha();
  if (a > 0.01) { g.fillStyle = `rgba(255,255,255,${(a * 0.85).toFixed(3)})`; g.fillRect(0, 0, w, h); }
  if (darkBeatT > 0) {
    const da = Math.min(1, darkBeatT / WEATHER_LIGHTNING_DARK_BEAT) * WEATHER_LIGHTNING_DARK_ALPHA;
    g.fillStyle = `rgba(6,6,10,${da.toFixed(3)})`;
    g.fillRect(0, 0, w, h);
  }
}

const WEATHER_TINT_COLOR: Record<WeatherKind, readonly [number, number, number]> = {
  clear: [0, 0, 0], rain: [140, 165, 190], storm: [80, 92, 112], fog: [205, 208, 212],
};

/** A subtle ground-tone shift (cool for rain, desaturated grey for fog, a
 *  darker cool cast for storm) — one small fillRect, folded into the same
 *  screen-space pass as the tint/fx below. */
function paintWeatherTint(g: CanvasRenderingContext2D, w: number, h: number, kind: WeatherKind) {
  const a = WEATHER_TINT_ALPHA[kind];
  if (a <= 0) return;
  const [r, gg, b] = WEATHER_TINT_COLOR[kind];
  g.fillStyle = `rgba(${r},${gg},${b},${a})`;
  g.fillRect(0, 0, w, h);
}

/** The one entry point main.ts calls (screen space, after the day/night tint,
 *  before the vignette): ground-tone wash -> fog banks -> rain streaks ->
 *  lightning/dark-beat on top. */
export function drawWeatherFx(g: CanvasRenderingContext2D, w: number, h: number, kind: WeatherKind) {
  paintWeatherTint(g, w, h, kind);
  if (kind === "fog") drawFog(g, w, h);
  if (kind === "rain" || kind === "storm") drawRain(g, w, h, kind === "storm");
  if (kind === "storm") drawLightning(g, w, h);
}
