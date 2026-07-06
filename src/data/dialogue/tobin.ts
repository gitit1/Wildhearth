/** Tobin — the produce-seller (cheerful-chatty). Shop branch. Region: market. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch, shopBranch,
  season, rainy, weatherLine, warm, here,
} from "./shared";

const st = smallTalkBranch("cheerful-chatty");
const shop = shopBranch(
  "\"Vegetables, fruit, whatever the earth gives up — I buy a good crop and I never shut up about it. Grow me something lovely!\"",
);

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring! Everything's green and so's my mood — isn't it grand?\""),
    season("summer", "\"Look at these tomatoes! Summer's showing off and I'm here for it.\""),
    season("autumn", "\"Harvest heaps, my friend! The stall's near bursting.\""),
    season("winter", "\"Slim pickings in winter, but I've stories to fill the gaps!\""),
    rainy("summer", "\"Rain's a gift, don't let anyone tell you different — the crops are drinking it up!\""),
    weatherLine("fog", "\"Can't see the far stalls in this fog — feels like the whole square's mine!\""),
    warm("autumn", "\"Ah, my favourite face at the harvest! Come, tell me everything.\""),
    here("market", "\"Step right up to the produce stall — freshest in the square, I promise!\""),
    ...genericOpenings("cheerful-chatty"),
  ],
  root: [shop.choice, ...st.root],
  nodes: { ...st.nodes, ...shop.nodes },
};

export default dialogue;
