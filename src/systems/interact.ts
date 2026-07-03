import { POND, STALL } from "../world/zones";
import { nearPond, nearRect } from "../world/collision";
import { GOOD_PRICES, goodCount, sellGood, sellAllGoods, type Economy } from "./economy";
import { ITEM_NAMES } from "./inventory";
import { SHOP_STOCK, tryBuy, owned } from "./shop";
import { startCast, type FishingState } from "./fishing";
import { startPick, type ForagingState, type Bush } from "./foraging";
import { skillValue, type Skills } from "./skills";
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
  foraging: ForagingState;
  skills: Skills;
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
      run: (c) => {
        if (c.fishing.casting || c.foraging.picking) return;
        startCast(c.fishing, skillValue(c.skills, "fishing"));
        c.player.fishing = true;
      },
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
    const held = Object.keys(GOOD_PRICES).filter((id) => goodCount(c.economy, id) > 0);
    if (held.length > 1)
      list.push({
        id: "sell", label: "Sell everything",
        run: (c) => { const earned = sellAllGoods(c.economy); c.toast(`Sold everything for ${earned} coins!`); },
      });
    for (const id of held)
      list.push({
        id: held.length === 1 ? "sell" : `sell-${id}`,
        label: `Sell ${(ITEM_NAMES[id] ?? id).toLowerCase()} (${goodCount(c.economy, id)})`,
        run: (c) => {
          const name = (ITEM_NAMES[id] ?? id).toLowerCase();
          const earned = sellGood(c.economy, id);
          c.toast(`Sold ${name} for ${earned} coins!`);
        },
      });
    // nothing to sell -> E/left-click browses instead of accidentally buying
    if (held.length === 0)
      list.push({
        id: "browse", label: "Browse wares",
        run: (c) => {
          const wares = SHOP_STOCK.filter((s) => !owned(c.economy, s))
            .map((s) => `${ITEM_NAMES[s.id] ?? s.id} — ${s.price} coins`);
          c.toast(wares.length ? `For sale: ${wares.join(", ")}.` : "Nothing left you don't already own.");
        },
      });
    for (const entry of SHOP_STOCK) {
      if (owned(c.economy, entry)) continue;
      const name = (ITEM_NAMES[entry.id] ?? entry.id).toLowerCase();
      list.push({
        id: `buy-${entry.id}`,
        label: `Buy ${name} (${entry.price} coins)`,
        run: (c) => {
          const r = tryBuy(c.economy, entry);
          c.toast(
            r === "ok" ? `Bought ${name === "seeds" ? "seeds" : `a ${name}`}!`
            : r === "no-coins" ? `Not enough coins — ${name} ${name.endsWith("s") ? "cost" : "costs"} ${entry.price}.`
            : r === "bag-full" ? "Backpack full — no room for that."
            : `You already own a ${name}.`
          );
        },
      });
    }
    list.push({ id: "look", label: "Look", run: (c) => c.toast("A weathered market stall. Buy tools, sell goods.") });
    return list;
  },
  drawHover: (g, t) => glowRect(g, stallBox.x - 2, stallBox.y - 2, stallBox.w + 4, stallBox.h + 4, t),
};

export const INTERACTABLES: Interactable[] = [pond, stall];

/** Berry bushes are runtime state, so they join the registry at game init. */
export function registerBushes(bushes: Bush[]) {
  bushes.forEach((b, i) => {
    INTERACTABLES.push({
      id: `bush-${i}`,
      name: "Berry bush",
      anchor: [b.x, b.y + 22],
      defaultActionId: "pick",
      hit: (wx, wy) => {
        const dx = (wx - b.x) / 22, dy = (wy - (b.y - 4)) / 18;
        return dx * dx + dy * dy <= 1;
      },
      inReach: (px, py) => Math.hypot(px - b.x, py - b.y) < 42,
      actions: (c) => {
        const list: MenuAction[] = [];
        if (b.full)
          list.push({
            id: "pick", label: "Pick berries",
            run: (c) => { if (!c.fishing.casting) startPick(c.foraging, b); },
          });
        list.push({
          id: "look", label: "Look",
          run: (c) => c.toast(b.full
            ? "A bush heavy with ripe berries."
            : "Picked clean — give it time to regrow."),
        });
        return list;
      },
      drawHover: (g, t) => glowEllipse(g, b.x, b.y - 4, 22, 18, t),
    });
  });
}

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
