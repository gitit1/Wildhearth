import { PRODUCE_PRICES } from "../config";
import { forageById } from "./forage";

/**
 * Animal produce — the barn's daily collection loop (VISION §122): a FED, owned
 * animal leaves ONE base good in the barn each morning, which the player
 * collects there and sells like any other yield. This table is the single
 * source of truth for the species→item mapping (systems/animalProduce.ts).
 *
 * FOUR of the five yields are brand-new items registered from `NEW_PRODUCE`
 * (ITEM_NAMES, GOOD_PRICES, the greengrocer basket in sellCategories.ts, and the
 * fallback icons in art/icons.ts). The FIFTH — the pig's truffle — is NOT new:
 * it is the SAME item the player can forage (data/forage.ts, id "truffle",
 * price 18, its own name/icon/sprite already registered). A pig roots up the
 * very same truffle, so the loop only MAPS the pig onto that existing id and
 * must not register a second, competing definition (which would collide on the
 * id with a different price). It is flagged `existing` and excluded from every
 * registration spread — one truffle, one price, one sell path.
 *
 * BASE produce only. Milk→cheese / wool→cloth crafting chains are a v3+ feature
 * (docs/ROADMAP_TO_V5.md) and deliberately out of scope here.
 *
 * Item ids are fixed (`milk`, `egg`, `duck_egg`, `wool`, `truffle`) so pixel
 * icons dropped into src/assets/pixellab/icons/<id> override the painters via
 * the drawItemIcon sprite seam.
 */

export type ProduceSpecies = "cow" | "hen" | "duck" | "pig" | "sheep";

export interface ProduceDef {
  species: ProduceSpecies;
  id: string;     // item id
  name: string;   // display name
  price: number;  // per-unit sell price
  /** True when the id is ALREADY a registered item elsewhere (the pig's truffle
   *  IS the forage truffle) — the loop maps the species onto it but does NOT
   *  re-register its name/price/icon/sell-category. */
  existing?: boolean;
}

export const ANIMAL_PRODUCE: ProduceDef[] = [
  { species: "cow",   id: "milk",     name: "Milk",     price: PRODUCE_PRICES.milk },
  { species: "hen",   id: "egg",      name: "Egg",      price: PRODUCE_PRICES.egg },
  { species: "duck",  id: "duck_egg", name: "Duck egg", price: PRODUCE_PRICES.duck_egg },
  { species: "sheep", id: "wool",     name: "Wool",     price: PRODUCE_PRICES.wool },
  // the pig's truffle == the forage truffle (data/forage.ts) — reuse its price,
  // register nothing new (see the `existing` note above).
  { species: "pig",   id: "truffle",  name: "Truffle",  price: forageById("truffle")?.price ?? 18, existing: true },
];

/** Species → its produce definition (all five, for the deposit loop). */
export const produceBySpecies: Record<ProduceSpecies, ProduceDef> =
  Object.fromEntries(ANIMAL_PRODUCE.map((p) => [p.species, p])) as Record<ProduceSpecies, ProduceDef>;

export const PRODUCE_SPECIES: ProduceSpecies[] = ANIMAL_PRODUCE.map((p) => p.species);

/** The genuinely-new produce items to REGISTER (name/price/icon/sell-category).
 *  Excludes any `existing` item so a shared id (truffle) keeps its one price and
 *  one sell path from its original data table. */
export const NEW_PRODUCE: ProduceDef[] = ANIMAL_PRODUCE.filter((p) => !p.existing);
