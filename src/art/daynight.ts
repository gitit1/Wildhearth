/**
 * Continuous day/night time-of-day math (Part B #9) + the screen-space
 * color-grade tint painter, plus the shared "how high is the sun right now"
 * read used by shapes.ts's cast-shadow helper (Part B #3). Pure functions of
 * (hour, minute) — this module never imports systems/calendar.ts; main.ts is
 * the only seam that reads the live clock and hands these functions plain
 * numbers, keeping art/ decoupled from systems/ per the architecture map.
 */
import {
  DAYNIGHT_NIGHT_COLOR, DAYNIGHT_NIGHT_ALPHA, DAYNIGHT_DAWN_COLOR, DAYNIGHT_DAWN_ALPHA,
  DAYNIGHT_DUSK_COLOR, DAYNIGHT_DUSK_ALPHA, DAYNIGHT_DAY_COLOR, DAYNIGHT_DAY_ALPHA,
  DAYNIGHT_INTERIOR_MULT,
  CAST_SHADOW_LEN_NOON, CAST_SHADOW_LEN_EDGE, CAST_SHADOW_LEN_NIGHT,
  CAST_SHADOW_ALPHA_NIGHT, CAST_SHADOW_ALPHA_DAY,
} from "../config";

export interface TintRGBA { r: number; g: number; b: number; a: number }

/** hour+minute folded into one continuous 0..24 value. */
export function continuousHour(hour: number, minute: number): number {
  return hour + minute / 60;
}

function lerp(a: number, b: number, u: number) { return a + (b - a) * u; }

/** Linear-interpolates between the two keyframes bracketing `th` (0..24),
 *  clamping at the ends. Shared by the tint color and the shadow-factor
 *  tables below so both read "the same clock" the same way. */
function sampleAt<T>(frames: Array<{ h: number } & T>, th: number, mix: (a: T, b: T, u: number) => T): T {
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]!, b = frames[i + 1]!;
    if (th >= a.h && th <= b.h) return mix(a, b, (th - a.h) / (b.h - a.h));
  }
  return frames[frames.length - 1]!;
}

type ColorFrame = { h: number; c: readonly [number, number, number]; a: number };

// Keyframes across the 24h clock. Boundaries roughly track calendar.ts's
// currentPhase() (night <6, dawn 6-8, day 8-19, dusk 19-21, night >=21), but
// interpolated continuously rather than stepped, per item 9's spec. W1: the
// former un-graded NEUTRAL/a0 midday plateau is replaced by a persistent
// dusky-olive DAY grade (DAYNIGHT_DAY_*) so noon is muted, never candy-bright.
const TINT_FRAMES: ColorFrame[] = [
  { h: 0,    c: DAYNIGHT_NIGHT_COLOR, a: DAYNIGHT_NIGHT_ALPHA },
  { h: 5,    c: DAYNIGHT_NIGHT_COLOR, a: DAYNIGHT_NIGHT_ALPHA },
  { h: 7,    c: DAYNIGHT_DAWN_COLOR,  a: DAYNIGHT_DAWN_ALPHA },
  { h: 8.5,  c: DAYNIGHT_DAY_COLOR,   a: DAYNIGHT_DAY_ALPHA },
  { h: 17,   c: DAYNIGHT_DAY_COLOR,   a: DAYNIGHT_DAY_ALPHA },
  { h: 19,   c: DAYNIGHT_DUSK_COLOR,  a: DAYNIGHT_DUSK_ALPHA },
  { h: 21,   c: DAYNIGHT_NIGHT_COLOR, a: DAYNIGHT_NIGHT_ALPHA },
  { h: 24,   c: DAYNIGHT_NIGHT_COLOR, a: DAYNIGHT_NIGHT_ALPHA },
];

/** The world-render color grade for this moment: dawn peach lift -> neutral
 *  day -> dusk amber -> deep-blue night, continuous across hour+minute. */
export function dayNightTint(hour: number, minute: number): TintRGBA {
  const th = continuousHour(hour, minute);
  const k = sampleAt(TINT_FRAMES, th, (a, b, u) => ({
    h: 0,
    c: [lerp(a.c[0], b.c[0], u), lerp(a.c[1], b.c[1], u), lerp(a.c[2], b.c[2], u)] as [number, number, number],
    a: lerp(a.a, b.a, u),
  }));
  return { r: k.c[0], g: k.c[1], b: k.c[2], a: k.a };
}

/** Paints the tint as one cheap full-screen pass. Call in SCREEN space (after
 *  resetting the transform), before the vignette. `milder` softens it for the
 *  house interior — same clock, gentler read. */
export function paintDayNightTint(
  g: CanvasRenderingContext2D, w: number, h: number, hour: number, minute: number, milder = false,
) {
  const t = dayNightTint(hour, minute);
  const a = milder ? t.a * DAYNIGHT_INTERIOR_MULT : t.a;
  if (a <= 0.002) return;
  g.fillStyle = `rgba(${t.r | 0},${t.g | 0},${t.b | 0},${a.toFixed(3)})`;
  g.fillRect(0, 0, w, h);
}

// ---- Cast-shadow factors (Part B #3) — the same continuous clock, read by
// shapes.ts's castShadow() via setSunFactors() so shadows lengthen at dawn/
// dusk (low sun) and fade toward invisible at night, shortest at solar noon.
type ShadowFrame = { h: number; len: number; a: number };
const SHADOW_FRAMES: ShadowFrame[] = [
  { h: 0,  len: CAST_SHADOW_LEN_NIGHT, a: CAST_SHADOW_ALPHA_NIGHT },
  { h: 5,  len: CAST_SHADOW_LEN_NIGHT, a: CAST_SHADOW_ALPHA_NIGHT },
  { h: 6,  len: CAST_SHADOW_LEN_EDGE,  a: 1 },
  { h: 8,  len: 1,                     a: CAST_SHADOW_ALPHA_DAY },
  { h: 13, len: CAST_SHADOW_LEN_NOON,  a: CAST_SHADOW_ALPHA_DAY },
  { h: 19, len: 1,                     a: CAST_SHADOW_ALPHA_DAY },
  { h: 21, len: CAST_SHADOW_LEN_EDGE,  a: 1 },
  { h: 22, len: CAST_SHADOW_LEN_NIGHT, a: CAST_SHADOW_ALPHA_NIGHT },
  { h: 24, len: CAST_SHADOW_LEN_NIGHT, a: CAST_SHADOW_ALPHA_NIGHT },
];

export interface ShadowFactors { lenMult: number; alphaMult: number }

/** How long/strong a cast shadow reads right now: shortest+full at solar
 *  noon, longest+strongest at dawn/dusk, near-invisible at night. */
export function shadowFactors(hour: number, minute: number): ShadowFactors {
  const th = continuousHour(hour, minute);
  const k = sampleAt(SHADOW_FRAMES, th, (a, b, u) => ({ h: 0, len: lerp(a.len, b.len, u), a: lerp(a.a, b.a, u) }));
  return { lenMult: k.len, alphaMult: k.a };
}
