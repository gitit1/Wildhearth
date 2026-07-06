/** Bram — the carpenter (quiet-craftsman, romantic candidate). Region: the
 *  market square (Mondays he mends the neighbour farm, but talk finds him here). */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here,
} from "./shared";

const st = smallTalkBranch("quiet-craftsman");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring damp swells the joints. Good time to fit new timber.\""),
    season("summer", "\"Dry summer wood works clean. A joiner's favourite months.\""),
    season("autumn", "\"Folk mend before winter. Plenty of work on my bench just now.\""),
    season("winter", "\"Short days. I work close to the lamp and take my time.\""),
    rainy("autumn", "\"Rain. Good — keeps me at the bench where I do my best thinking.\""),
    weatherLine("storm", "\"Storm'll test every roof in the square. Mine'll hold. I built it.\""),
    warm("spring", "\"...You. Good. I'll talk while I work, if that suits.\""),
    here("market", "\"Careful of the shavings. A workbench is an honest sort of mess.\""),
    ...genericOpenings("quiet-craftsman"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
