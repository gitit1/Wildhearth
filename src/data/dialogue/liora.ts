/** Liora — the street musician (dreamy-performer, romantic candidate). Region:
 *  the market square. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here, atPhase,
} from "./shared";

const st = smallTalkBranch("dreamy-performer");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring writes its own songs — I'm only trying to keep up.\""),
    season("summer", "\"Warm evenings, long crowds. Summer's kind to a busker.\""),
    season("autumn", "\"Autumn light does something to a melody. Softer, sadder, lovelier.\""),
    season("winter", "\"Cold fingers, but a winter tune carries so far in the still air.\""),
    rainy("spring", "\"Listen — rain keeps better time than any drum. I'm playing along.\""),
    weatherLine("storm", "\"No crowd in a storm, so this song's just for me. And you, now.\""),
    warm("summer", "\"Oh, it's you. Stay — the light's on you just so, and I've a tune half-made.\""),
    atPhase("dusk", "\"Dusk is the best hour to play. Everything's a little bit golden.\""),
    here("market", "\"You caught me between songs. Give me a moment — or a request.\""),
    ...genericOpenings("dreamy-performer"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
