import { POND, STALL } from "../world/zones";
import { nearPond, nearRect } from "../world/collision";
import { fishCount, sellFish, type Economy } from "./economy";
import { startCast, type FishingState } from "./fishing";
import { glowEllipse, glowRect } from "../art/highlight";
import type { Player } from "../entities/player";

/**
 * Registry of clickable world objects (UO-style). Each knows how to be
 * hit-tested by a pointer, whether the player is close enough to use it,
 * what actions it offers (context menu), and how to draw its hover glow.
 * New clickable things (bushes, shop counters, NPCs) get added here.
 */

export interface InteractCtx {
  economy: Economy;
  fishing: FishingState;
  player: Player;
  toast: (s: string) => void;
}

export interface MenuAction { id: string; label: string; run: (c: InteractCtx) => void; }

export interface Interactable {
  id: string;
  name: string;
  anchor: [number, number];                 // where the player walks to use it
  defaultActionId: string;                  // left-click / action-button action
  hit: (wx: number, wy: number) => boolean; // pointer is over the object
  inReach: (px: number, py: number) => boolean;
  actions: (c: InteractCtx) => MenuAction[];// available actions right now
  drawHover: (g: CanvasRenderingContext2D, time: number) => void;
}

const pond: Interactable = {
  id: "pond",
  name: "Pond",
  anchor: [POND.cx, POND.cy],
  defaultActionId: "fish",
  hit: (wx, wy) => {
    const dx = (wx - POND.cx) / POND.rx, dy = (wy - POND.cy) / POND.ry;
    return dx * dx + dy * dy <= 1;
  },
  inReach: (px, py) => nearPond(px, py),
  actions: () => [
    {
      id: "fish", label: "Fish",
      run: (c) => { if (!c.fishing.casting) { startCast(c.fishing); c.player.fishing = true; } },
    },
    { id: "look", label: "Look", run: (c) => c.toast("A calm pond. Fish glint below the surface.") },
  ],
  drawHover: (g, t) => glowEllipse(g, POND.cx, POND.cy, POND.rx + 4, POND.ry + 4, t),
};

// The drawn stall is bigger than the STALL logic rect: the awning rises above
// it (to y - 0.4h) and the legs drop below it (to ~y + 1.05h). Use those true
// visible bounds so hover + highlight cover the whole structure, not just the
// counter. (drawStall in art/buildings.ts is the source of these offsets.)
const stallBox = {
  x: STALL.x - 6,
  y: STALL.y - STALL.h * 0.4,
  w: STALL.w + 12,
  h: STALL.h * 1.45,
};

const stall: Interactable = {
  id: "stall",
  name: "Market stall",
  anchor: [STALL.x + STALL.w / 2, STALL.y + STALL.h + 22],
  defaultActionId: "sell",
  hit: (wx, wy) =>
    wx >= stallBox.x && wx <= stallBox.x + stallBox.w &&
    wy >= stallBox.y && wy <= stallBox.y + stallBox.h,
  inReach: (px, py) => nearRect(px, py, STALL),
  actions: (c) => {
    const list: MenuAction[] = [];
    const n = fishCount(c.economy);
    if (n > 0)
      list.push({
        id: "sell", label: `Sell fish (${n})`,
        run: (c) => { const earned = sellFish(c.economy); c.toast(`Sold fish for ${earned} coins!`); },
      });
    list.push({ id: "look", label: "Look", run: (c) => c.toast("A weathered market stall. Sell your catch here.") });
    return list;
  },
  drawHover: (g, t) => glowRect(g, stallBox.x - 2, stallBox.y - 2, stallBox.w + 4, stallBox.h + 4, t),
};

export const INTERACTABLES: Interactable[] = [pond, stall];

export function hitTest(wx: number, wy: number): Interactable | null {
  for (const it of INTERACTABLES) if (it.hit(wx, wy)) return it;
  return null;
}

export function reachable(px: number, py: number): Interactable | null {
  for (const it of INTERACTABLES) if (it.inReach(px, py)) return it;
  return null;
}

export function byId(id: string): Interactable | null {
  return INTERACTABLES.find((it) => it.id === id) ?? null;
}

/** Resolves an object's default action, falling back to its first available one. */
function resolveDefault(it: Interactable, c: InteractCtx): MenuAction | undefined {
  const acts = it.actions(c);
  return acts.find((a) => a.id === it.defaultActionId) ?? acts[0];
}

export function runAction(it: Interactable, actionId: string, c: InteractCtx) {
  const a = it.actions(c).find((x) => x.id === actionId);
  if (a) a.run(c);
}

export function runDefault(it: Interactable, c: InteractCtx) {
  resolveDefault(it, c)?.run(c);
}

export function defaultActionLabel(it: Interactable, c: InteractCtx): string {
  return resolveDefault(it, c)?.label ?? it.name;
}
