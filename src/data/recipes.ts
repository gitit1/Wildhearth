/**
 * Cooking recipes (base-skill-set block ships the minimal version — one
 * recipe so the Cooking skill and the Keeper path's forage→cook→sell loop
 * are real; the "Cooking skill, extended" block adds multi-ingredient
 * recipes to this same table). A dish always sells for more than its raw
 * ingredients — cooking is worked-in value, per the earned-economy pillar.
 */

export interface Recipe {
  id: string;                       // the cooked dish item id
  name: string;
  inputs: Record<string, number>;   // item id -> count consumed
  price: number;                    // dish sell price (> raw ingredient total)
  skillFloor: number;               // minimum Cooking skill
  icon: { color: string };          // bowl contents tint for the shared painter
}

export const RECIPES: Recipe[] = [
  { id: "berry_compote", name: "Berry compote", inputs: { berries: 2 }, price: 6,
    skillFloor: 0, icon: { color: "#a33050" } },   // raw: 2×2=4 -> cooked 6
];

export function recipeById(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}
