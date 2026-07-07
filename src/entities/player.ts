import { T, PLAYER_SPEED, CLICK_ARRIVE } from "../config";
import { blocked } from "../world/collision";
import { inputVec, getMoveTarget, clearMoveTarget } from "../engine/input";
import type { PoseName, RigParams } from "../art/rig";
import { DEFAULT_APPEARANCE, type Appearance, type Character } from "../systems/meta";

export interface Player {
  x: number; y: number;
  dir: 0 | 1 | 2 | 3;          // up / right / down / left (4-way; rig facing + bobber dir)
  moving: boolean;
  fishing: boolean;            // arms hold a rod while true
  pose: PoseName;              // action-pose the rig draws (set each frame in main.ts)
  dist: number;                // accumulated travel px — drives the distance-keyed walk cycle
  mvx: number; mvy: number;    // last movement UNIT vector, held when idle — drives the 8-dir sprite facing
}

export function createPlayer(): Player {
  return { x: 13 * T, y: 9.2 * T, dir: 2, moving: false, fishing: false, pose: "idle", dist: 0, mvx: 0, mvy: 1 };
}

/**
 * The player's look, built from her chosen Appearance (Character Creation).
 * The rig's fixed v1 values (unit scale, adult profile, neutral limb lengths)
 * live here; the individual bits (skin, hair, build, outfit) come from the
 * saved character. A null character (a brand-new boot, or an old pre-character
 * save) falls back to DEFAULT_APPEARANCE — the established straw-hat farmer.
 */
export function rigFromCharacter(c: Character | null): RigParams {
  const a: Appearance = c?.appearance ?? DEFAULT_APPEARANCE;
  return {
    scale: 1,
    build: a.build,
    legLength: 1,
    armLength: 1,
    skin: a.skin,
    hair: a.hair,
    hairColor: a.hairColor,
    hatColor: a.hatColor,
    age: "adult",
    outfit: { ...a.outfit },
  };
}

/** The fallback look — the straw-hat farmer — for any caller without a live
 *  character (old saves, the rig preview's default). */
export const DEFAULT_PLAYER_RIG: RigParams = rigFromCharacter(null);

export function updatePlayer(p: Player, dt: number) {
  const [ix, iy] = inputVec();
  let vx = ix, vy = iy, step = PLAYER_SPEED * dt;

  if (ix || iy) {
    clearMoveTarget();                       // manual steering overrides click-to-move
  } else {
    const t = getMoveTarget();
    if (t) {
      const dx = t[0] - p.x, dy = t[1] - p.y, dist = Math.hypot(dx, dy);
      if (dist <= CLICK_ARRIVE) { clearMoveTarget(); p.moving = false; return; }
      vx = dx / dist; vy = dy / dist;
      step = Math.min(step, dist);           // don't overshoot the target
    }
  }

  p.moving = !!(vx || vy);
  if (!p.moving) return;
  p.fishing = false;                         // moving cancels fishing

  const px = p.x, py = p.y;
  const nx = p.x + vx * step, ny = p.y + vy * step;
  const movedX = !blocked(nx, p.y), movedY = !blocked(p.x, ny);
  if (movedX) p.x = nx;
  if (movedY) p.y = ny;
  if (!movedX && !movedY) clearMoveTarget(); // wall on both axes -> abandon unreachable target
  p.dist += Math.hypot(p.x - px, p.y - py); // travel banked for the walk cycle (phase = dist/stride)
  p.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 1 : 3) : vy > 0 ? 2 : 0;
  // hold the normalised movement vector for the 8-direction sprite facing
  // (untouched while idle, so the heroine keeps looking the way she last moved)
  const mag = Math.hypot(vx, vy) || 1;
  p.mvx = vx / mag; p.mvy = vy / mag;
}
