/**
 * The dialogue bottom-box (Dialogue engine, Part A #4 — UI). A wood/gold panel
 * docked bottom-centre of the play window: NPC name header (gold), the current
 * line, and 2-3 choice buttons (click OR number keys 1-3; Esc / Farewell closes).
 * Not draggable, no minimise — it's a modal conversation, not a gump.
 *
 * This module owns the turn state machine and drives systems/dialogue.ts (pure
 * selection + tree logic). It reads ONE world-context snapshot per turn via the
 * `worldFor` hook (main builds it from the live sources) and routes every
 * displayed line through `renderNpcLine` — the AI seam. main owns the effects
 * (Friendship bump / world flag / contact) and the open/close side-effects
 * (freeze + talking pose + social-need bump), passed in as hooks. Explicit-
 * passing throughout — no singletons.
 */
import type { NpcDef } from "../data/npcs";
import type { WorldContext } from "../systems/worldContext";
import {
  pickLine, renderNpcLine, presentedChoices,
  type ChoiceEffect, type DialogueChoice, type NpcDialogue,
} from "../systems/dialogue";
import { getNpcDialogue } from "../data/dialogue";

export interface DialogueHooks {
  /** A fresh world snapshot scoped to this NPC (season/weather/relationship/…). */
  worldFor: (npcId: string) => WorldContext;
  /** Apply a choice's small effect (Friendship nudge / topic flag / mark contact). */
  applyEffect: (def: NpcDef, effect: ChoiceEffect) => void;
  /** Conversation opened: face the player + hold the talking pose (main). */
  onOpen: (def: NpcDef) => void;
  /** Conversation ended: mark contact + the social-need bump (main). */
  onClose: (def: NpcDef) => void;
}

let panel: HTMLElement;
let nameEl: HTMLElement;
let textEl: HTMLElement;
let choicesEl: HTMLElement;

let open = false;
let def: NpcDef | null = null;
let dlg: NpcDialogue | null = null;
let currentChoices: DialogueChoice[] = [];
let hooks: DialogueHooks;

/** Per-NPC rotation counter: breaks specificity ties so repeat conversations in
 *  identical conditions surface different generics (anti-repetition). Session-
 *  scoped; not persisted (the north star is variety within a play session). */
const rotation = new Map<string, number>();
function nextRot(id: string): number {
  const v = rotation.get(id) ?? 0;
  rotation.set(id, v + 1);
  return v;
}

export function initDialogue(h: DialogueHooks) {
  hooks = h;
  panel = document.getElementById("dialogueBox")!;
  nameEl = document.getElementById("dlgName")!;
  textEl = document.getElementById("dlgText")!;
  choicesEl = document.getElementById("dlgChoices")!;

  // Capture-phase keys so number/Escape choices beat the game + other panels'
  // Escape handlers while a conversation is open.
  addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.code === "Escape") { e.stopImmediatePropagation(); closeDialogue(); return; }
    const m = /^Digit([1-9])$/.exec(e.code);
    if (m) {
      const i = Number(m[1]) - 1;
      if (i < currentChoices.length) { e.stopImmediatePropagation(); choose(currentChoices[i]!); }
    }
  }, true);
}

export function isDialogueOpen(): boolean { return open; }

/** Open a conversation with `def`: resolve the condition-keyed opening line and
 *  present the root choices. */
export function openDialogue(target: NpcDef) {
  if (open) closeDialogue();
  def = target;
  dlg = getNpcDialogue(target);
  open = true;
  hooks.onOpen(target);

  const wc = hooks.worldFor(target.id);
  const text = renderNpcLine({
    npcId: target.id, worldContext: wc, purpose: "opening",
    scriptedText: pickLine(dlg.openings, wc, nextRot(target.id)),
  });
  render(target.name, text, presentedChoices(dlg.root));
  panel.style.display = "block";
}

export function closeDialogue() {
  if (!open) return;
  open = false;
  panel.style.display = "none";
  choicesEl.replaceChildren();
  const d = def;
  def = null; dlg = null; currentChoices = [];
  if (d) hooks.onClose(d);
}

/** Advance the tree on a picked choice: apply any effect, show the reply, and
 *  present the next turn's choices (a terminal choice leaves only Farewell). */
function choose(choice: DialogueChoice) {
  if (!def || !dlg) return;
  if (choice.effect) hooks.applyEffect(def, choice.effect);
  if (choice.end) { closeDialogue(); return; }

  const wc = hooks.worldFor(def.id);   // one fresh snapshot for this turn
  const text = choice.npcReply
    ? renderNpcLine({
        npcId: def.id, worldContext: wc, purpose: "reply",
        scriptedText: pickLine(choice.npcReply, wc, nextRot(def.id)),
      })
    : (textEl.textContent ?? "");
  const nextChoices = choice.next ? (dlg.nodes?.[choice.next]?.choices ?? []) : [];
  render(def.name, text, presentedChoices(nextChoices));
}

function render(name: string, text: string, choices: DialogueChoice[]) {
  nameEl.textContent = name;
  textEl.textContent = text;
  currentChoices = choices;
  choicesEl.replaceChildren();
  choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "dlg-choice";
    const key = document.createElement("span");
    key.className = "dlg-key";
    key.textContent = String(i + 1);
    const label = document.createElement("span");
    label.textContent = choice.label;
    btn.append(key, label);
    btn.addEventListener("click", () => choose(choice));
    choicesEl.append(btn);
  });
}
