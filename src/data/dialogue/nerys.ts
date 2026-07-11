/** Nerys — the Riverside Fisherwoman (weathered-sage). A recluse of the river
 *  bend to the far east; she keeps a long, quiet day on the shore and would
 *  rather teach the water than talk about herself. Region: the river.
 *
 *  Her rod/bait shop and her paid fishing lessons are NOT authored here — they
 *  are injected onto her opening turn at runtime through the dialogue box's
 *  service-options seam (v2 BLOCK #6 slice 1, commits 2-3), the same way quest
 *  offers are. This file is her VOICE. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, warmAny, here, farmWhole,
} from "./shared";

const st = smallTalkBranch("weathered-sage");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring melt runs fast and cold. The fish are hungry — a good season to learn the line.\""),
    season("summer", "\"Long light on the water. Sit a while, if you've the patience for it.\""),
    season("autumn", "\"Autumn's the deep fishing. The old ones come up from the cold pools now.\""),
    season("winter", "\"Ice at the edges. Even the river slows to think in winter.\""),
    rainy("spring", "\"Rain freckles the water and the fish rise to meet it. Finest casting there is.\""),
    weatherLine("storm", "\"No day for the bank, this. The river's temper is up — let it be.\""),
    warm("summer", "\"There you are. The current missed you, I think. Or I did — same thing, most days.\""),
    warmAny("\"Back at my bend, are you? Good. Pull up a stone.\""),
    here("river", "\"This is my stretch of river. Quiet, deep, and honest — the three things I look for.\""),
    farmWhole("river", "\"Heard the old farm stands whole again. Land and water both answer patience. You've got it.\""),
    ...genericOpenings("weathered-sage"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
