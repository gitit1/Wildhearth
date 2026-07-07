/**
 * The dialogue bottom-box (Dialogue engine, Part A #4 — UI). A wood/gold panel
 * docked bottom-centre of the play window: NPC name header (gold), the current
 * line, and choice buttons (click OR number keys 1-9; Esc / Farewell closes).
 * Not draggable, no minimise — it's a modal conversation, not a gump.
 *
 * This module owns the turn state machine and drives systems/dialogue.ts (pure
 * selection + tree logic). It reads ONE world-context snapshot per turn via the
 * `worldFor` hook, and routes every displayed line through the AI seam:
 * `renderLine` (Part D #2 dialogue variation) if wired, else renderNpcLine
 * verbatim. The render call is SYNCHRONOUS — the box always opens instantly with
 * scripted text; any AI variation was prefetched and swapped in only when ready.
 *
 * Every NPC's opening turn also carries two engine-level meta choices — "Tell me
 * about yourself" (backstory, Part D #1) and "What's on your mind?" (thought,
 * Part D #4) — resolved via hooks, with authored/template flat fallbacks so they
 * work with AI off. main owns the effects and the open/close side-effects.
 */
import { DIALOGUE_MAX_CHOICES, AI_BACKSTORY_PAGE_CHARS } from "../config";
import type { NpcDef } from "../data/npcs";
import type { WorldContext } from "../systems/worldContext";
import {
  pickLine, renderNpcLine, presentedChoices,
  type ChoiceEffect, type DialogueChoice, type NpcDialogue, type RenderReq,
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
  /** AI variation seam (Part D #2). Absent → renderNpcLine pass-through (AI off). */
  renderLine?: (req: RenderReq) => string;
  /** Full backstory (generated or authored) for "Tell me about yourself". */
  backstoryText?: (def: NpcDef) => string;
  /** Current thought (generated or template) for "What's on your mind?". */
  thoughtText?: (def: NpcDef) => string;
  /** Recently-said authored lines for this NPC — the picker avoids them (#7). */
  recentScripted?: (npcId: string) => ReadonlySet<string>;
  /** Record an authored line actually shown (#7 — persisted scripted variety). */
  recordScripted?: (npcId: string, text: string) => void;
}

let panel: HTMLElement;
let nameEl: HTMLElement;
let textEl: HTMLElement;
let choicesEl: HTMLElement;

let open = false;
let def: NpcDef | null = null;
let dlg: NpcDialogue | null = null;
let hooks: DialogueHooks;

interface Button { label: string; onClick: () => void; }
let currentButtons: Button[] = [];

/** The two meta choices every NPC's opening turn carries. */
const BACKSTORY_CHOICE: DialogueChoice = { label: "Tell me about yourself", special: "backstory" };
const THOUGHT_CHOICE: DialogueChoice = { label: "What's on your mind?", special: "thought" };

/** Per-NPC rotation counter: breaks specificity ties so repeat conversations in
 *  identical conditions surface different generics. Session-scoped; the persisted
 *  half of that variety is the anti-repetition store (via recentScripted). */
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
      if (i < currentButtons.length) { e.stopImmediatePropagation(); currentButtons[i]!.onClick(); }
    }
  }, true);
}

export function isDialogueOpen(): boolean { return open; }

/** Resolve one displayed line: pick the scripted line (avoiding recent repeats),
 *  record it for cross-session variety, then route it through the AI seam. Always
 *  synchronous — the returned string is shown immediately. */
function lineFor(target: NpcDef, wc: WorldContext, set: NpcDialogue["openings"], purpose: RenderReq["purpose"]): string {
  const avoid = hooks.recentScripted?.(target.id);
  const scripted = pickLine(set, wc, nextRot(target.id), avoid);
  hooks.recordScripted?.(target.id, scripted);
  const req: RenderReq = { npcId: target.id, worldContext: wc, purpose, scriptedText: scripted };
  return hooks.renderLine ? hooks.renderLine(req) : renderNpcLine(req);
}

/** The opening turn's choices: the authored root (kept to the 2-3 budget minus a
 *  slot) plus the two always-available meta choices and a Farewell. */
function openingChoices(root: DialogueChoice[]): DialogueChoice[] {
  const authored = root.slice(0, DIALOGUE_MAX_CHOICES - 1);
  return [...authored, BACKSTORY_CHOICE, THOUGHT_CHOICE, { label: "Farewell", end: true }];
}

/** Open a conversation with `def`: resolve the condition-keyed opening line and
 *  present the root + meta choices. */
export function openDialogue(target: NpcDef) {
  if (open) closeDialogue();
  def = target;
  dlg = getNpcDialogue(target);
  open = true;
  hooks.onOpen(target);

  const wc = hooks.worldFor(target.id);
  const text = lineFor(target, wc, dlg.openings, "opening");
  renderChoices(target.name, text, openingChoices(dlg.root));
  panel.style.display = "block";
}

export function closeDialogue() {
  if (!open) return;
  open = false;
  panel.style.display = "none";
  choicesEl.replaceChildren();
  const d = def;
  def = null; dlg = null; currentButtons = [];
  if (d) hooks.onClose(d);
}

/** Advance the tree on a picked choice: meta choices show backstory/thought;
 *  otherwise apply any effect, show the reply, and present the next turn. */
function choose(choice: DialogueChoice) {
  if (!def || !dlg) return;
  if (choice.special) { pickSpecial(choice.special); return; }
  if (choice.effect) hooks.applyEffect(def, choice.effect);
  if (choice.end) { closeDialogue(); return; }

  const wc = hooks.worldFor(def.id);   // one fresh snapshot for this turn
  const text = choice.npcReply
    ? lineFor(def, wc, choice.npcReply, "reply")
    : (textEl.textContent ?? "");
  const nextChoices = choice.next ? (dlg.nodes?.[choice.next]?.choices ?? []) : [];
  renderChoices(def.name, text, presentedChoices(nextChoices));
}

/** Show the NPC's backstory / current thought, paged if long. */
function pickSpecial(kind: "backstory" | "thought") {
  if (!def) return;
  if (kind === "backstory") hooks.applyEffect(def, { kind: "contact" });   // asking marks contact
  const full = kind === "backstory"
    ? (hooks.backstoryText?.(def) ?? "There's not much to tell.")
    : (hooks.thoughtText?.(def) ?? "Nothing much, just now.");
  showPage(paginate(full), 0, kind);
}

/** Split a long backstory into readable pages at sentence boundaries. */
function paginate(text: string): string[] {
  const t = text.trim();
  if (t.length <= AI_BACKSTORY_PAGE_CHARS) return [t || "…"];
  const sentences = t.match(/[^.!?]+[.!?]*\s*/g) ?? [t];
  const pages: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && (cur + s).length > AI_BACKSTORY_PAGE_CHARS) { pages.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) pages.push(cur.trim());
  return pages.length ? pages : [t];
}

function showPage(pages: string[], idx: number, kind: "backstory" | "thought") {
  if (!def) return;
  const last = idx >= pages.length - 1;
  const buttons: Button[] = [];
  if (!last) {
    buttons.push({ label: "Go on…", onClick: () => showPage(pages, idx + 1, kind) });
  } else {
    // on the last page, offer the OTHER meta question, then a way back / out
    buttons.push(kind === "backstory"
      ? { label: THOUGHT_CHOICE.label, onClick: () => pickSpecial("thought") }
      : { label: BACKSTORY_CHOICE.label, onClick: () => pickSpecial("backstory") });
    buttons.push({ label: "Let's talk of something else", onClick: () => backToRoot() });
    buttons.push({ label: "Farewell", onClick: () => closeDialogue() });
  }
  paint(def.name, pages[idx] ?? "…", buttons);
}

/** Re-open the opening turn (a fresh opening line + the root + meta choices). */
function backToRoot() {
  if (!def || !dlg) return;
  const wc = hooks.worldFor(def.id);
  renderChoices(def.name, lineFor(def, wc, dlg.openings, "opening"), openingChoices(dlg.root));
}

function renderChoices(name: string, text: string, choices: DialogueChoice[]) {
  paint(name, text, choices.map((c) => ({ label: c.label, onClick: () => choose(c) })));
}

/** Low-level paint: name header, line, and the numbered choice buttons. */
function paint(name: string, text: string, buttons: Button[]) {
  nameEl.textContent = name;
  textEl.textContent = text;
  currentButtons = buttons;
  choicesEl.replaceChildren();
  buttons.forEach((b, i) => {
    const btn = document.createElement("button");
    btn.className = "dlg-choice";
    const key = document.createElement("span");
    key.className = "dlg-key";
    key.textContent = String(i + 1);
    const label = document.createElement("span");
    label.textContent = b.label;
    btn.append(key, label);
    btn.addEventListener("click", b.onClick);
    choicesEl.append(btn);
  });
}

/** The opening line the NEXT openDialogue would show for this NPC — without
 *  advancing the rotation, so a proximity prefetch (main) targets exactly the
 *  line the player is about to hear. */
export function peekOpeningText(target: NpcDef, wc: WorldContext): string {
  const d = getNpcDialogue(target);
  const rot = rotation.get(target.id) ?? 0;   // peek, do NOT increment
  return pickLine(d.openings, wc, rot, hooks?.recentScripted?.(target.id));
}
