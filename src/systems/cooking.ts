import { COOK_TIME } from "../config";
import { RECIPES, type Recipe } from "../data/recipes";
import { countItem, type Inventory } from "./inventory";

/**
 * Cooking at the house hearth (base-skill-set block, minimal version):
 * a short timed activity mirroring fishing/foraging/farm work. The recipe's
 * inputs are consumed on completion by the caller (main.ts), which also
 * grants the Cooking skill roll.
 */

export interface CookingState { cooking: boolean; timer: number; recipeId: string | null }

export function createCooking(): CookingState {
  return { cooking: false, timer: 0, recipeId: null };
}

export function startCook(c: CookingState, recipeId: string) {
  if (c.cooking) return;
  c.cooking = true;
  c.timer = COOK_TIME;
  c.recipeId = recipeId;
}

export function cancelCook(c: CookingState) { c.cooking = false; c.recipeId = null; }

/** Returns the recipe id exactly on the tick a cook completes. */
export function updateCooking(c: CookingState, dt: number): string | null {
  if (!c.cooking || !c.recipeId) return null;
  c.timer -= dt;
  if (c.timer > 0) return null;
  const id = c.recipeId;
  c.cooking = false; c.recipeId = null;
  return id;
}

/** True when the bag holds every ingredient a recipe needs. */
export function canCook(inv: Inventory, r: Recipe): boolean {
  return Object.entries(r.inputs).every(([id, n]) => countItem(inv, id) >= n);
}

/** The recipes cookable right now (ingredients held + skill floor met). */
export function cookableRecipes(inv: Inventory, cookingSkill: number): Recipe[] {
  return RECIPES.filter((r) => cookingSkill >= r.skillFloor && canCook(inv, r));
}
