import { T, PLAYER_SPEED, CLICK_ARRIVE } from "../config";
import { blocked } from "../world/collision";
import { inputVec, getMoveTarget, clearMoveTarget } from "../engine/input";

export interface Player {
  x: number; y: number;
  dir: 0 | 1 | 2 | 3;          // up / right / down / left
  moving: boolean;
  fishing: boolean;            // arms hold a rod while true
}

export function createPlayer(): Player {
  return { x: 13 * T, y: 9.2 * T, dir: 2, moving: false, fishing: false };
}

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

  const nx = p.x + vx * step, ny = p.y + vy * step;
  const movedX = !blocked(nx, p.y), movedY = !blocked(p.x, ny);
  if (movedX) p.x = nx;
  if (movedY) p.y = ny;
  if (!movedX && !movedY) clearMoveTarget(); // wall on both axes -> abandon unreachable target
  p.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 1 : 3) : vy > 0 ? 2 : 0;
}
