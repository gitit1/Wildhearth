/**
 * The dialogue window (Windows migration II — Dialogue engine, Part A #4 UI):
 * a real wm window, title = the NPC's name (icon 💬), default bottom-centre of
 * the desktop; resizable but never below a readable min. The current line and
 * choice buttons (click OR number keys 1-9; Esc / Farewell closes — Esc now
 * via the shared cascade in setup.ts, since this is just another closable
 * window) live in its body. Not minimizable to keep it feeling like an active
 * conversation rather than a gump you'd tuck away mid-sentence, but its
 * dragged position persists like any other window.
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
import { wm } from "./windows/manager";
import type { WindowHandle } from "./windows/window";

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
  /** Quest offers / turn-ins to surface as extra opening choices for this NPC
   *  (R6). Empty/absent → no quest choices (the dialogue tree is unchanged). */
  questOptions?: (npcId: string) => QuestDialogueOption[];
}

/** A dynamic quest-related choice injected into the giver's opening turn (R6).
 *  `pick()` runs the effect (accept / turn in / decline) and returns the NPC's
 *  spoken reply plus any follow-up options (e.g. Accept / Not now). */
export interface QuestDialogueOption {
  label: string;
  pick: () => QuestPickResult;
}
export interface QuestPickResult {
  line: string;
  options?: QuestDialogueOption[];
}

let win: WindowHandle;
let textEl: HTMLElement;
let choicesEl: HTMLElement;

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

const GAP = 12;
const DLG_W = 680, DLG_H = 240;

export function initDialogue(h: DialogueHooks) {
  hooks = h;
  const panel = document.getElementById("dialogueBox")!;
  textEl = document.getElementById("dlgText")!;
  choicesEl = document.getElementById("dlgChoices")!;

  win = wm.createWindow({
    id: "dialogue", title: "Dialogue", icon: "💬",
    content: panel,
    resizable: true, minW: 380, minH: 180, maxW: 820, maxH: 520,
    minimizable: false, // an active conversation, not a gump to tuck away
    defaultRect: (d) => ({ x: Math.round((d.w - DLG_W) / 2), y: d.h - DLG_H - GAP, w: DLG_W, h: DLG_H }),
    onClose: () => {
      choicesEl.replaceChildren();
      const d = def;
      def = null; dlg = null; currentButtons = [];
      if (d) hooks.onClose(d);
    },
  });
  win.close(); // default: hidden — auto-opens on talk

  // Capture-phase so number choices beat any other capture-phase handler
  // (e.g. an open context menu) while a conversation is open. Escape is no
  // longer special-cased here — it's just another closable window now, so
  // the shared Esc cascade (setup.ts's escCloseTopWindow) closes it like any
  // other topmost window (Farewell IS just closeDialogue() under the hood,
  // wired as this window's onClose below).
  addEventListener("keydown", (e) => {
    if (!win.isOpen()) return;
    const m = /^Digit([1-9])$/.exec(e.code);
    if (m) {
      const i = Number(m[1]) - 1;
      if (i < currentButtons.length) { e.stopImmediatePropagation(); currentButtons[i]!.onClick(); }
    }
  }, true);
}

export function isDialogueOpen(): boolean { return win.isOpen(); }

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

/** Quest offer/turn-in buttons for the current NPC, shown FIRST on the opening
 *  turn (R6). Picking one runs its effect and shows the reply + any follow-up. */
function questButtons(): Button[] {
  if (!def || !hooks.questOptions) return [];
  return hooks.questOptions(def.id).map((opt) => ({ label: opt.label, onClick: () => runQuestOption(opt) }));
}

/** Run a picked quest option: show the NPC's reply, then its follow-up options
 *  (Accept / Not now) plus a way back to the conversation and out. */
function runQuestOption(opt: QuestDialogueOption) {
  const res = opt.pick();
  const buttons: Button[] = (res.options ?? []).map((o) => ({ label: o.label, onClick: () => runQuestOption(o) }));
  buttons.push({ label: "Let's talk of something else", onClick: () => backToRoot() });
  buttons.push({ label: "Farewell", onClick: () => closeDialogue() });
  paint(res.line, buttons);
}

/** The full opening button row: quest options first, then the authored/meta
 *  choices mapped to buttons. */
function openingButtons(root: DialogueChoice[]): Button[] {
  return [...questButtons(), ...openingChoices(root).map((c) => ({ label: c.label, onClick: () => choose(c) }))];
}

/** Open a conversation with `def`: resolve the condition-keyed opening line and
 *  present the root + meta choices. */
export function openDialogue(target: NpcDef) {
  if (win.isOpen()) closeDialogue();
  def = target;
  dlg = getNpcDialogue(target);
  hooks.onOpen(target);

  win.setTitle(target.name);   // set once — can't change mid-conversation
  const wc = hooks.worldFor(target.id);
  const text = lineFor(target, wc, dlg.openings, "opening");
  paint(text, openingButtons(dlg.root));
  win.open();
}

/** Just closes the window — the actual cleanup (mark contact, social bump)
 *  runs in the window's own `onClose` hook below, so it fires no matter which
 *  path closed it (Farewell, the window's ✕, or the shared Esc cascade). */
export function closeDialogue() {
  win.close();
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
  renderChoices(text, presentedChoices(nextChoices));
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
  paint(pages[idx] ?? "…", buttons);
}

/** Re-open the opening turn (a fresh opening line + quest options + the root +
 *  meta choices). */
function backToRoot() {
  if (!def || !dlg) return;
  const wc = hooks.worldFor(def.id);
  paint(lineFor(def, wc, dlg.openings, "opening"), openingButtons(dlg.root));
}

function renderChoices(text: string, choices: DialogueChoice[]) {
  paint(text, choices.map((c) => ({ label: c.label, onClick: () => choose(c) })));
}

/** Low-level paint: the line + the numbered choice buttons. The NPC's name
 *  lives in the window's own title bar (set once, in openDialogue) — not
 *  repainted every turn since it can't change mid-conversation. */
function paint(text: string, buttons: Button[]) {
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
