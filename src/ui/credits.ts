import { screenShell } from "./screen";

/**
 * Credits screen (Part E #4) — a short, warm scroll. The product owner can edit
 * the names and lines here later; kept deliberately simple.
 */

interface CreditBlock { heading?: string; lines: string[] }

const CREDITS: CreditBlock[] = [
  { lines: ["Wildhearth", "A little farm, a whole life."] },
  {
    heading: "Made with love by",
    lines: ["The product owner", "& Claude"],
  },
  {
    heading: "How it's made",
    lines: [
      "Every tree, face, and sunrise you see is drawn in code —",
      "there are no image files anywhere in this game.",
      "A hand-built world, one painter function at a time.",
    ],
  },
  {
    heading: "Built with",
    lines: ["TypeScript · Vite · HTML canvas", "and a great deal of care."],
  },
  {
    heading: "With thanks to",
    lines: [
      "The Sims, Ultima Online, and Stardew Valley,",
      "for showing what a small life well-lived can feel like.",
      "And to you, for tending this one.",
    ],
  },
  { lines: ["♥"] },
];

export function showCredits(onBack: () => void) {
  const { body } = screenShell("Credits", onBack);

  const scroll = document.createElement("div");
  scroll.className = "credits-scroll";

  for (const block of CREDITS) {
    const b = document.createElement("div");
    b.className = "credits-block";
    if (block.heading) {
      const h = document.createElement("div");
      h.className = "credits-head";
      h.textContent = block.heading;
      b.append(h);
    }
    for (const line of block.lines) {
      const p = document.createElement("p");
      p.className = "credits-line";
      p.textContent = line;
      b.append(p);
    }
    scroll.append(b);
  }

  body.append(scroll);
}
