/** Henrik — the neighbouring farmer (gruff-kind, elder). Reacts to the player's
 *  farm being fully repaired (reads the farm slice). Region: the road/farms. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here, farmWhole,
} from "./shared";

const st = smallTalkBranch("gruff-kind");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring planting. No time to lean on a fence and chat — much.\""),
    season("summer", "\"Sun's brutal, but the crops love it. Drink water, you.\""),
    season("autumn", "\"Harvest time. Break your back now, eat well come winter.\""),
    season("winter", "\"Nothing grows in this cold. A farmer rests when the land does. Barely.\""),
    rainy("spring", "\"Good soaking rain. Saves me hauling water. Weather's earning its keep today.\""),
    weatherLine("storm", "\"Storm like this flattens young crops. Get yours covered if you can.\""),
    warm("autumn", "\"Hmph. You again. ...Good. The company's not unwelcome.\""),
    here("road", "\"You're the one on the old place next door. It'll come good — with work.\""),
    farmWhole("road", "\"Walked past your place. Fences square, roof sound. You did that yourself. Respect.\""),
    ...genericOpenings("gruff-kind"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
