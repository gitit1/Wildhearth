import { openingRoot } from "./titlescreen";
import type { Guidance } from "../systems/settings";
import type { TutorialStep } from "../data/guidance";

/**
 * Guidance Mode UI (Part A #5 / Part E #5) — all DOM, no logic. The three-way
 * picker (opening screen), the Tutorial step bubble + persistent Help (?) icon,
 * the Aspiration objective pill, and the shared modal prompt (Continue-Tutorial
 * on load / Skip-Tutorial confirm). main.ts owns the engine and wires these.
 */

let bubble!: HTMLElement, tutTitle!: HTMLElement, tutBody!: HTMLElement;
let helpBtn!: HTMLElement;
let aspPill!: HTMLElement, aspText!: HTMLElement;
let scrim!: HTMLElement, promptEl!: HTMLElement, gpTitle!: HTMLElement, gpBtns!: HTMLElement;

let bubbleVisible = true;
let lastStep: TutorialStep | null = null;
let lastTitle = "", lastBody = "";
let pillContent = "";
let pillDismissed = false;

interface GuidanceHooks { onSkipTutorial: () => void; }

export function initGuidance(hooks: GuidanceHooks) {
  bubble = byId("tutorialBubble");
  tutTitle = byId("tutTitle");
  tutBody = byId("tutBody");
  helpBtn = byId("helpBtn");
  aspPill = byId("aspirationPill");
  aspText = byId("aspText");
  scrim = byId("guidanceScrim");
  promptEl = byId("guidancePrompt");
  gpTitle = byId("gpTitle");
  gpBtns = byId("gpBtns");

  byId("tutDismiss").addEventListener("click", () => { bubbleVisible = false; bubble.style.display = "none"; });
  helpBtn.addEventListener("click", () => { if (lastStep) { bubbleVisible = true; bubble.style.display = "block"; } });
  byId("tutSkip").addEventListener("click", () => hooks.onSkipTutorial());
  byId("aspClose").addEventListener("click", () => { pillDismissed = true; aspPill.style.display = "none"; });
}

// ---- tutorial bubble + help icon ------------------------------------------

/** Show the current step (or hide when null). `forceShow` re-opens a dismissed
 *  bubble — passed on a step advance so the new step is always read first. */
export function setTutorialBubble(step: TutorialStep | null, forceShow: boolean) {
  if (!step) { bubble.style.display = "none"; lastStep = null; return; }
  lastStep = step;
  if (forceShow) bubbleVisible = true;
  if (lastTitle !== step.title) { tutTitle.textContent = step.title; lastTitle = step.title; }
  if (lastBody !== step.body) { tutBody.textContent = step.body; lastBody = step.body; }
  bubble.style.display = bubbleVisible ? "block" : "none";
}

export function setHelpVisible(v: boolean) { helpBtn.style.display = v ? "flex" : "none"; }

/** For the clock-freeze gate: game-time pauses while a step bubble is up. */
export function tutorialBubbleShown(): boolean { return !!lastStep && bubbleVisible; }

// ---- aspiration pill -------------------------------------------------------

export function setAspirationPill(text: string | null) {
  if (text === null) { aspPill.style.display = "none"; pillContent = ""; return; }
  if (text !== pillContent) { pillContent = text; pillDismissed = false; }   // new objective → un-dismiss
  if (pillDismissed) { aspPill.style.display = "none"; return; }
  if (aspText.textContent !== `🎯 ${text}`) aspText.textContent = `🎯 ${text}`;
  aspPill.style.display = "flex";
}

// ---- shared modal prompt (continue / skip confirm) -------------------------

export function showGuidancePrompt(title: string, buttons: Array<{ label: string; id?: string; onClick: () => void }>) {
  gpTitle.textContent = title;
  gpBtns.replaceChildren();
  for (const b of buttons) {
    const el = document.createElement("button");
    el.className = "menu-btn";
    if (b.id) el.id = b.id;
    el.textContent = b.label;
    el.addEventListener("click", b.onClick);
    gpBtns.append(el);
  }
  scrim.style.display = "block";
  promptEl.style.display = "block";
}

export function hideGuidancePrompt() {
  scrim.style.display = "none";
  promptEl.style.display = "none";
}

export function isGuidancePromptOpen(): boolean { return promptEl.style.display === "block"; }

// ---- the three-way picker (opening screen) ---------------------------------

const GUIDE_CARDS: Array<{ id: Guidance; title: string; desc: string }> = [
  { id: "tutorial",   title: "Tutorial",   desc: "Step-by-step. A few guided tasks walk you through your first catch, sale, and purchase." },
  { id: "aspiration", title: "Aspiration", desc: "Goal-driven. Gentle background objectives drawn from your path — no hand-holding." },
  { id: "none",       title: "None",       desc: "Fully free. No prompts, ever — the farm is yours to figure out." },
];

export function showGuidancePicker(onPick: (g: Guidance) => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel";
  const h1 = document.createElement("h1");
  h1.className = "menu-title cc-title";
  h1.textContent = "How much guidance?";
  const note = document.createElement("p");
  note.className = "menu-text";
  note.textContent = "You can change this any time from Settings — but once you leave the Tutorial, you can't come back to it.";

  const row = document.createElement("div");
  row.className = "choice-row cc-wrap";
  for (const c of GUIDE_CARDS) {
    const card = document.createElement("div");
    card.className = "choice-card";
    card.id = `guide-${c.id}`;
    const h3 = document.createElement("h3");
    h3.textContent = c.title;
    const p = document.createElement("p");
    p.textContent = c.desc;
    card.append(h3, p);
    card.addEventListener("click", () => onPick(c.id));
    row.append(card);
  }

  panel.append(h1, note, row);
  o.append(panel);
}

function byId(id: string): HTMLElement { return document.getElementById(id)!; }
