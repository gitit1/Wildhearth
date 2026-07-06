/** Petra — the baker (warm-motherly). Region: the market square. */
import type { NpcDialogue } from "../../systems/dialogue";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here, atPhase,
} from "./shared";

const st = smallTalkBranch("warm-motherly");

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Spring baking, dear — the first berries make such lovely tarts.\""),
    season("summer", "\"Hot by the oven in summer, but the whole square smells of bread. Worth it.\""),
    season("autumn", "\"Autumn's for hearty loaves. Come warm yourself, you look peaky.\""),
    season("winter", "\"Cold morning — my oven's the warmest spot in the square. Sit a while.\""),
    rainy("autumn", "\"Rainy days are baking days. Nothing cheers a wet afternoon like warm bread.\""),
    weatherLine("fog", "\"Foggy out — follow your nose to the oven, dear, you won't get lost.\""),
    warm("winter", "\"There's my favourite. I saved you the soft middle of a loaf, look.\""),
    atPhase("dawn", "\"You're up early! The first bake's just out. Careful, it's hot.\""),
    here("market", "\"Mind the tray, dear — that's fresh from the oven.\""),
    ...genericOpenings("warm-motherly"),
  ],
  root: [...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
