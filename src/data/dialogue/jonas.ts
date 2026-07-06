/** Jonas — the peddler (gossipy-connector). Demonstrates the world-topic-flag
 *  loop: asking for news sets a short-lived `market_buzz` flag, and while it's
 *  fresh he opens with the news line (a `flag`-conditioned opening). Region: the road. */
import type { NpcDialogue, DialogueChoice } from "../../systems/dialogue";
import { DIALOGUE_TOPIC_FLAG_DAYS } from "../../config";
import {
  genericOpenings, smallTalkBranch,
  season, rainy, weatherLine, warm, here, topic,
} from "./shared";

const st = smallTalkBranch("gossipy-connector");

const newsChoice: DialogueChoice = {
  label: "Heard any news?",
  npcReply: [{
    conditions: {},
    text: "\"Oh, always! They say the market's stirring — new faces, new goods. Pass it on!\"",
  }],
  effect: { kind: "flag", key: "market_buzz", days: DIALOGUE_TOPIC_FLAG_DAYS },
};

const dialogue: NpcDialogue = {
  openings: [
    season("spring", "\"Roads are thawing — trade's picking up. I hear it all first, you know.\""),
    season("summer", "\"Long roads in summer. I've walked every one and heard every word on them.\""),
    season("autumn", "\"Harvest gossip's the best gossip. Everyone's got something to trade AND to say.\""),
    season("winter", "\"Fewer travellers in winter, so I hoard my rumours like firewood.\""),
    rainy("autumn", "\"Rain slows the road but not the tongues. I've heard three good tales already.\""),
    weatherLine("storm", "\"Storm's got everyone indoors — which means everyone's TALKING. My kind of day.\""),
    warm("spring", "\"Ah, my favourite pair of ears! Come, I've been saving something for you.\""),
    here("road", "\"Caught me mid-route. Walk a step with me — the roads know everything.\""),
    topic("market_buzz", "\"Still buzzing about that market news, eh? Told you it'd travel fast.\""),
    ...genericOpenings("gossipy-connector"),
  ],
  root: [newsChoice, ...st.root],
  nodes: { ...st.nodes },
};

export default dialogue;
