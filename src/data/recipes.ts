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
  // ---- extended recipes (Cooking-extended block): 2+ ingredients -> 1 dish ----
  { id: "root_stew", name: "Root stew", inputs: { potato: 1, carrot: 1 }, price: 14,
    skillFloor: 5, icon: { color: "#c98a4a" } },   // raw: 6+4=10 -> 14
  { id: "corn_chowder", name: "Corn chowder", inputs: { corn: 1, potato: 1 }, price: 15,
    skillFloor: 10, icon: { color: "#e0c878" } },  // raw: 5+6=11 -> 15
  { id: "forest_saute", name: "Forest sauté", inputs: { mushroom: 1, wild_garlic: 1 }, price: 9,
    skillFloor: 15, icon: { color: "#8a6a48" } },  // raw: 3+3=6 -> 9
  { id: "fishers_supper", name: "Fisher's supper", inputs: { carp: 1, sorrel: 1 }, price: 10,
    skillFloor: 20, icon: { color: "#7fa8b8" } },  // raw: 3+3=6 -> 10
  { id: "berry_pie", name: "Berry pie", inputs: { berries: 2, wheat: 1 }, price: 13,
    skillFloor: 25, icon: { color: "#b84a62" } },  // raw: 4+4=8 -> 13
];

export function recipeById(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}
