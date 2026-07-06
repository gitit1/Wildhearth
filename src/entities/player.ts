import { T, PLAYER_SPEED, CLICK_ARRIVE } from "../config";
import { blocked } from "../world/collision";
import { inputVec, getMoveTarget, clearMoveTarget } from "../engine/input";
import type { PoseName, RigParams } from "../art/rig";

export interface Player {
  x: number; y: number;
  dir: 0 | 1 | 2 | 3;          // up / right / down / left
  moving: boolean;
  fishing: boolean;            // arms hold a rod while true
  pose: PoseName;              // action-pose the rig draws (set each frame in main.ts)
  dist: number;                // accumulated travel px — drives the distance-keyed walk cycle
}

export function createPlayer(): Player {
  return { x: 13 * T, y: 9.2 * T, dir: 2, moving: false, fishing: false, pose: "idle", dist: 0 };
}

/**
 * The player's look. One place, one object — later set by the Character
 * Creation flow; for now it reproduces the established straw-hat farmer
 * (reddish tunic, blue-grey trousers) so the character reads as the same
 * person, just rigged and alive. It is a plain RigParams, exactly like the
 * ones the 10 NPCs will each get next block.
 */
export const DEFAULT_PLAYER_RIG: RigParams = {
  scale: 1,
  build: "average",
  legLength: 1,
  armLength: 1,
  skin: "#e8b48a",
  hair: "hat",
  hairColor: "#5b3b22",
  hatColor: "#e0be5c",
  age: "adult",
  outfit: {
    torso: "#b0432f",
    legs: "#4a5d8a",
    accent: "#7a3020",
    shoes: "#4b3a26",
  },
};

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
}
