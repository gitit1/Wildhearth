import { createScaleWindow } from "./windows/scalewindow";
import { toggleWindow } from "./windows/manager";
import type { WindowHandle } from "./windows/window";
import { ITEM_NAMES } from "../systems/inventory";
import { NPCS } from "../data/npcs";
import {
  questById, stepGoal, type QuestDef, type QuestReward,
} from "../data/quests";
import {
  activeQuests, completedQuests, stepProgress, wantsTurnIn,
  type QuestLog, type QuestState,
} from "../systems/quests";

/**
 * Quest-log window (R6): a real wm scale-window (like backpack / skills /
 * memory book) — draggable, resizable, minimizable, closable, persisted. Icon
 * 📋 / key J toggle it; Esc closes it via the shared cascade. Two tabs:
 *
 *  - ACTIVE — a "Getting Started" panel that MIRRORS the live Guidance layer
 *    (tutorial step / aspiration objective — the how-to-play layer coexisting
 *    with quests as the goal layer, not duplicated), then each active quest as
 *    a card: title, giver, description, a step CHECKLIST with ✓/○ + (n/goal)
 *    counts, a reward preview, a READY-to-turn-in tag, and (side quests only)
 *    an Abandon button.
 *  - COMPLETED — the finished quests, titles + givers.
 *
 * Pure presentation: it reads the live QuestLog + the data defs and calls back
 * into main for the two mutations it offers (abandon, and the guidance mirror).
 */

export interface QuestLogHooks {
  /** Bag count of an item — drives possession-step progress display. */
  heldCount: (id: string) => number;
  /** Abandon a side quest (returns whether it took). */
  onAbandon: (id: string) => boolean;
  /** The live Guidance summary to mirror in "Getting Started" (or null). */
  gettingStarted: () => { kicker: string; title: string; body: string } | null;
}

let win: WindowHandle;
let questBtn: HTMLElement | null;
let questBadge: HTMLElement | null = null;
let log: QuestLog;
let hooks: QuestLogHooks;
let tab: "active" | "done" = "active";

const GIVER_NAME: Record<string, string> = Object.fromEntries(NPCS.map((n) => [n.id, n.name]));
const giverName = (id: string): string => GIVER_NAME[id] ?? id;

export function initQuestLog(questLog: QuestLog, h: QuestLogHooks) {
  log = questLog;
  hooks = h;
  const panel = document.getElementById("questPanel")!;
  questBtn = document.getElementById("questBtn");
  // B6: a small active-quest count badge on the dock icon (like What's New's).
  if (questBtn) {
    questBadge = document.createElement("span");
    questBadge.className = "tool-badge";
    questBtn.appendChild(questBadge);
  }

  document.getElementById("qTabActive")!.addEventListener("click", () => { tab = "active"; syncTabs(); render(); });
  document.getElementById("qTabDone")!.addEventListener("click", () => { tab = "done"; syncTabs(); render(); });

  render();   // populate before createScaleWindow measures the natural size
  syncBadge();

  win = createScaleWindow({
    id: "quests", title: "Quest Log", icon: "📋",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: Math.round(d.w * 0.28), y: Math.round(d.h * 0.2) }),
    onVisibleChange: (hidden) => { questBtn?.classList.toggle("active", !hidden); if (!hidden) render(); },
  });
  win.close();   // default: hidden

  questBtn?.addEventListener("click", () => toggleWindow(win));
  addEventListener("keydown", (e) => { if (e.code === "KeyJ") toggleWindow(win); });
}

/** Call every frame; repaints only while open. `force` is accepted for parity
 *  with the other panels (render is cheap, so it always repaints when open). */
export function updateQuestLog() {
  syncBadge();   // keep the dock badge live even while the window is closed
  if (win.isOpen()) render();
}

/** Paint the dock-icon badge with the active-quest count (hidden at zero). */
function syncBadge() {
  if (!questBadge) return;
  const n = activeQuests(log).length;
  questBadge.textContent = String(n);
  questBadge.style.display = n > 0 ? "" : "none";
}

function syncTabs() {
  document.getElementById("qTabActive")!.classList.toggle("active", tab === "active");
  document.getElementById("qTabDone")!.classList.toggle("active", tab === "done");
}

function render() {
  const body = document.getElementById("questBody")!;
  body.replaceChildren();
  if (tab === "active") renderActive(body);
  else renderCompleted(body);
}

function renderActive(body: HTMLElement) {
  // Getting Started — mirror the live guidance layer (coexists, not duplicated)
  const gs = hooks.gettingStarted();
  if (gs) {
    const box = el("div", "q-getting");
    box.append(el("div", "q-kicker", gs.kicker), el("div", "q-gtitle", gs.title), el("div", "q-gbody", gs.body));
    body.append(box);
  }

  const active = activeQuests(log);
  if (active.length === 0 && !gs) {
    body.append(el("div", "q-empty", "No active quests. Talk to the townsfolk — someone may need a hand."));
    return;
  }
  for (const st of active) {
    const def = questById(st.id);
    if (def) body.append(questCard(def, st));
  }
}

function renderCompleted(body: HTMLElement) {
  const done = completedQuests(log);
  if (done.length === 0) {
    body.append(el("div", "q-empty", "Nothing finished yet."));
    return;
  }
  for (const st of done) {
    const def = questById(st.id);
    if (!def) continue;
    const card = el("div", "q-card");
    const title = el("div", "q-title");
    title.append(el("span", undefined, "✓ " + def.title));
    card.append(title, el("div", "q-giver", `for ${giverName(def.giver)}`));
    if (def.repeatable && st.completions > 1)
      card.append(el("div", "q-reward", `Done ${st.completions}×`));
    body.append(card);
  }
}

function questCard(def: QuestDef, st: QuestState): HTMLElement {
  const ready = st.step >= def.steps.length;
  const card = el("div", "q-card" + (ready ? " q-ready" : ""));

  const title = el("div", "q-title");
  title.append(el("span", undefined, def.title));
  if (ready && wantsTurnIn(def)) title.append(el("span", "q-readytag", "READY"));
  card.append(title, el("div", "q-giver", `from ${giverName(def.giver)}`));

  card.append(el("div", "q-desc", stripQuotes(def.description)));

  const steps = el("div", "q-steps");
  def.steps.forEach((step, i) => {
    const goal = stepGoal(step);
    const prog = stepProgress(def, st, i, hooks.heldCount);
    const done = prog >= goal;
    const row = el("div", "q-step" + (done ? " done" : ""));
    row.append(el("span", "q-tick", done ? "✓" : "○"), el("span", "q-slabel", step.label));
    if (goal > 1) row.append(el("span", "q-scount", `${Math.min(prog, goal)}/${goal}`));
    steps.append(row);
  });
  card.append(steps);

  card.append(el("div", "q-reward", "Reward: " + rewardText(def.reward, def.giver)));
  if (ready && wantsTurnIn(def))
    card.append(el("div", "q-reward", `→ Turn in with ${giverName(def.giver)}.`));

  if (def.kind === "side") {
    const ab = el("button", "q-abandon", "Abandon") as HTMLButtonElement;
    ab.addEventListener("click", () => { if (hooks.onAbandon(def.id)) render(); });
    card.append(ab);
  }
  return card;
}

function rewardText(r: QuestReward, giver: string): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`${r.coins} coins`);
  if (r.items) for (const it of r.items) parts.push(`${it.qty} ${ITEM_NAMES[it.id] ?? it.id}`);
  if (r.friendship) parts.push(`+${r.friendship} ♥ ${giverName(giver)}`);
  return parts.length ? parts.join(" · ") : "the satisfaction of a good turn";
}

/** Drop the wrapping quote marks the dialogue-flavoured descriptions carry. */
function stripQuotes(s: string): string {
  return s.replace(/^["“]|["”]$/g, "").trim();
}

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
