/** Sera — the general-goods keeper (precise-practical). Shop branch. Region: market. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch, shopBranch,
  season, rainy, weatherLine, warm, here,
} from "./shared";

const st = smallTalkBranch("precise-practical");
const shop = shopBranch(
  "\"General goods — tools, oddments, the useful and the hard-to-find. If I don't stock it, I know who does.\"",
);

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring restock's done. Shelves squared away, ledger balanced.\""),
    season("summer", "\"Long days mean long hours. Everything in its place, mind.\""),
    season("autumn", "\"Autumn's my busy season — folk laying in supplies. Sensible of them.\""),
    season("winter", "\"Winter stock is dear but steady. I plan for it. Always do.\""),
    rainy("autumn", "\"Rain keeps the browsers home. Suits me — I can straighten the shelves.\""),
    weatherLine("storm", "\"Storm's coming. I've the awning tied down twice over. Measure twice, you know.\""),
    warm("winter", "\"Ah — a reliable caller. I do appreciate a bit of order in my day.\""),
    here("market", "\"The general-goods stall. Tell me what you need; I'll tell you if I have it.\""),
    ...genericOpenings("precise-practical"),
  ],
  root: [shop.choice, ...st.root],
  nodes: { ...st.nodes, ...shop.nodes },
};

export default dialogue;
