import { FISH_PRICE, SAVE_KEY } from "../config";

/** Player wallet + inventory. First real system of the game economy. */
export interface Economy { coins: number; fish: number }

export function loadEconomy(): Economy {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { coins: 0, fish: 0, ...JSON.parse(raw) };
  } catch { /* corrupted save -> fresh start */ }
  return { coins: 0, fish: 0 };
}

export function saveEconomy(e: Economy) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(e)); } catch { /* private mode */ }
}

export function addFish(e: Economy, n = 1) { e.fish += n; saveEconomy(e); }

/** Sells all fish; returns coins earned. */
export function sellFish(e: Economy): number {
  const earned = e.fish * FISH_PRICE;
  e.coins += earned; e.fish = 0; saveEconomy(e);
  return earned;
}
