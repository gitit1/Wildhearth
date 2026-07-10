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

  // ---- variety push (R3): 6 → 21. Multi-ingredient dishes that draw on the
  // widened forage/fish/crop tables; every dish sells for more than its raw
  // ingredient total (worked-in value, earned-economy pillar). ----
  { id: "herb_salad", name: "Herb salad", inputs: { dandelion: 1, nettle: 1, clover: 1 }, price: 11,
    skillFloor: 8, icon: { color: "#7fae2e" } },     // raw: 2+3+2=7 -> 11
  { id: "berry_jam", name: "Berry jam", inputs: { raspberry: 1, blackberry: 1 }, price: 13,
    skillFloor: 12, icon: { color: "#9a2a4a" } },    // raw: 4+4=8 -> 13
  { id: "roasted_nuts", name: "Roasted nuts", inputs: { chestnuts: 1, hazelnuts: 1 }, price: 15,
    skillFloor: 15, icon: { color: "#8a5a30" } },    // raw: 6+4=10 -> 15
  { id: "grilled_perch", name: "Grilled perch", inputs: { perch: 1, wild_mint: 1 }, price: 12,
    skillFloor: 15, icon: { color: "#7fa88a" } },    // raw: 4+4=8 -> 12
  { id: "forager_tea", name: "Forager's tea", inputs: { chamomile: 1, wild_mint: 1 }, price: 14,
    skillFloor: 18, icon: { color: "#d0d888" } },    // raw: 5+4=9 -> 14
  { id: "mushroom_soup", name: "Mushroom soup", inputs: { mushroom: 1, chanterelle: 1 }, price: 16,
    skillFloor: 20, icon: { color: "#a9824a" } },    // raw: 3+8=11 -> 16
  { id: "veggie_stew", name: "Vegetable stew", inputs: { cabbage: 1, carrot: 1, potato: 1 }, price: 22,
    skillFloor: 20, icon: { color: "#8aa24a" } },    // raw: 6+4+6=16 -> 22
  { id: "fish_stew", name: "Fish stew", inputs: { carp: 1, potato: 1, carrot: 1 }, price: 19,
    skillFloor: 25, icon: { color: "#7fa8b8" } },    // raw: 3+6+4=13 -> 19
  { id: "fruit_tart", name: "Fruit tart", inputs: { wild_strawberry: 1, berries: 1, wheat: 1 }, price: 17,
    skillFloor: 25, icon: { color: "#d05a72" } },    // raw: 5+2+4=11 -> 17
  { id: "stuffed_pepper", name: "Stuffed pepper", inputs: { pepper: 1, tomato: 1 }, price: 21,
    skillFloor: 28, icon: { color: "#d0602a" } },    // raw: 8+7=15 -> 21
  { id: "cranberry_relish", name: "Cranberry relish", inputs: { cranberries: 1, beet: 1 }, price: 27,
    skillFloor: 30, icon: { color: "#a83048" } },    // raw: 6+14=20 -> 27
  { id: "pumpkin_pie", name: "Pumpkin pie", inputs: { pumpkin: 1, wheat: 1 }, price: 23,
    skillFloor: 32, icon: { color: "#d08830" } },    // raw: 12+4=16 -> 23
  { id: "root_mash", name: "Root mash", inputs: { parsnip: 1, turnip: 1 }, price: 25,
    skillFloor: 35, icon: { color: "#e0d0a0" } },    // raw: 12+6=18 -> 25
  { id: "salmon_dinner", name: "Salmon dinner", inputs: { salmon: 1, carrot: 1, potato: 1 }, price: 34,
    skillFloor: 42, icon: { color: "#c07456" } },    // raw: 16+4+6=26 -> 34
  { id: "harvest_platter", name: "Harvest platter", inputs: { pumpkin: 1, corn: 1, cabbage: 1 }, price: 31,
    skillFloor: 48, icon: { color: "#d8a03a" } },    // raw: 12+5+6=23 -> 31
];

export function recipeById(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}
