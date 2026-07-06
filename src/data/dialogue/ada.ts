/** Ada — the herbalist (shy-naturalist, elder). Region: the forest passage. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here,
} from "./shared";

const st = smallTalkBranch("shy-naturalist");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring's first shoots. The forest is generous now, if you ask it kindly.\""),
    season("summer", "\"Summer herbs are at their strongest. Pick in the cool of morning, mind.\""),
    season("autumn", "\"Autumn's for roots and mushrooms. Only take what you can name.\""),
    season("winter", "\"Little grows now. I gather bark and patience mostly.\""),
    rainy("spring", "\"Rain brings the mushrooms out. And washes the birdsong clean, listen.\""),
    weatherLine("fog", "\"Fog makes the forest feel very old. I rather like it. Fewer people, too.\""),
    warm("autumn", "\"Oh — it's you. I don't mind you at all. The birds don't either.\""),
    here("forest", "\"You've found my quiet corner. Tread soft — there are nests about.\""),
    ...genericOpenings("shy-naturalist"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
