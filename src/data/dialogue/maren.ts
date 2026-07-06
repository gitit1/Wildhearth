/** Maren — the fish-buyer (brisk-warm). Shop-flavoured branch + a farm-repaired
 *  reaction (reads the farm slice). Region: the market. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch, shopBranch,
  season, rainy, weatherLine, warm, warmAny, here, farmWhole,
} from "./shared";

const st = smallTalkBranch("brisk-warm");
const shop = shopBranch(
  "\"Fresh fish, that's my whole trade — I buy what you haul in and send it on to the town. Best prices this side of the coast.\"",
);

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring tides run cold, but that's when the fish wake up. Casting today?\""),
    season("spring", "\"First warm mornings. The catch is stirring — good time to be on the water.\""),
    season("summer", "\"Summer crowds, summer prices. Stall's been busy since dawn.\""),
    season("autumn", "\"Autumn's the finest fishing there is, if you ask me. Don't waste it.\""),
    season("winter", "\"Cold enough to freeze the bait. Still, folk always want fish.\""),
    rainy("spring", "\"Rain on a spring tide — fish come right up to meet it. Perfect, really.\""),
    weatherLine("storm", "\"A storm's no day to cast. Even I'm keeping close to the stall.\""),
    warm("spring", "\"Spring suits you. Always glad of a friendly face at my corner.\""),
    warmAny("\"There you are. Go on — a quick word before I'm back to the buckets.\""),
    here("market", "\"Welcome to my corner of the market. Mind the buckets.\""),
    farmWhole("market", "\"Word is your farm's whole again. Knew you had it in you — fish taste better earned.\""),
    ...genericOpenings("brisk-warm"),
  ],
  root: [shop.choice, ...st.root],
  nodes: { ...st.nodes, ...shop.nodes },
};

export default dialogue;
