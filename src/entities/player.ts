import { T, PLAYER_SPEED } from "../config";
import { blocked } from "../world/collision";
import { inputVec } from "../engine/input";

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
  const [vx, vy] = inputVec();
  p.moving = !!(vx || vy);
  if (!p.moving) return;
  p.fishing = false;                       // moving cancels fishing
  const nx = p.x + vx * PLAYER_SPEED * dt;
  const ny = p.y + vy * PLAYER_SPEED * dt;
  if (!blocked(nx, p.y)) p.x = nx;
  if (!blocked(p.x, ny)) p.y = ny;
  p.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 1 : 3) : vy > 0 ? 2 : 0;
}
