/** Finn — Maren's fishing apprentice (eager-apprentice, KID). Lines stay
 *  age-appropriate and bright; the type system already forbids romance on a kid.
 *  Region: the lakeside dock (river). */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here,
} from "./shared";

const st = smallTalkBranch("eager-apprentice");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"The fish are back! Maren says spring's when I'll finally land a big one!\""),
    season("summer", "\"Summer means NO school and ALL fishing. Best time of the whole year!\""),
    season("autumn", "\"Maren says autumn fish are the fattest. I'm gonna catch the fattest one EVER.\""),
    season("winter", "\"It's freezing but I'm not going in! A real fisher fishes in winter, right?\""),
    rainy("spring", "\"Rain doesn't scare me! Maren says the fish bite better when it's wet!\""),
    weatherLine("storm", "\"Maren won't let me on the dock in a storm. I'm watching from here. Boo.\""),
    warm("summer", "\"You came to see ME? You're gonna help me get good, right? RIGHT?\""),
    here("river", "\"This dock's my spot! I'm practising my casting. Wanna watch me?\""),
    ...genericOpenings("eager-apprentice"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
