import { SKILL_CAP } from "../config";
import { SKILL_NAMES, cycleLock, totalSkills, skillTier, type Skills, type SkillLock } from "../systems/skills";
import { createScaleWindow } from "./windows/scalewindow";
import { toggleWindow } from "./windows/manager";
import { leftPanelAnchor } from "./windows/setup";
import type { WindowHandle } from "./windows/window";

/**
 * Skills window (Windows migration I): a real wm window — draggable,
 * resizable, minimizable, closable, persisted. Icon 📜 / key K toggle it; Esc
 * closes it via the shared cascade (Windows migration II) when it's the
 * topmost open window. Scrollable list of skills, a value per row, a lock
 * toggle (up/down/locked), and a floating "+0.3" popup on gain. Default:
 * hidden, docked to the left edge (under coins/needs).
 */

const LOCK_GLYPH: Record<SkillLock, string> = { up: "▲", down: "▼", locked: "🔒" };
const GAP = 12;

let win: WindowHandle;
let skillsBtn: HTMLElement | null;
let sk: Skills;
let rows: { value: HTMLElement; lock: HTMLElement; float: HTMLElement; tier: HTMLElement }[] = [];

export function initSkillsUI(skills: Skills) {
  sk = skills;
  const panel = document.getElementById("skillsPanel")!;
  skillsBtn = document.getElementById("skillsBtn");
  const list = document.getElementById("skillsList")!;

  for (const s of skills.list) {
    const row = document.createElement("div");
    row.className = "sk-row";

    const lock = document.createElement("button");
    lock.className = "sk-lock";
    lock.textContent = LOCK_GLYPH[s.lock];
    lock.title = "Raise / lower / locked";
    lock.addEventListener("click", () => {
      const next = cycleLock(sk, s.id);
      if (next) lock.textContent = LOCK_GLYPH[next];
    });

    const name = document.createElement("span");
    name.className = "sk-name";
    name.textContent = SKILL_NAMES[s.id] ?? s.id;

    const tier = document.createElement("span");
    tier.className = "sk-tier";
    tier.dataset.tier = skillTier(s.value);
    tier.textContent = skillTier(s.value);

    const value = document.createElement("span");
    value.className = "sk-value";
    value.textContent = s.value.toFixed(1);

    const float = document.createElement("span");
    float.className = "sk-float";

    row.append(lock, name, float, tier, value);
    list.append(row);
    rows.push({ value, lock, float, tier });
  }

  win = createScaleWindow({
    id: "skills", title: "Skills", icon: "📜",
    content: panel,
    onScale: (s) => panel.style.setProperty("--s", String(s)),
    defaultPos: (d) => ({ x: GAP, y: Math.round(d.h * 0.42) }),
    openAt: (d, s) => leftPanelAnchor("skills", d, s),   // fixed left-edge home, cascaded (HUD-A2)
    onVisibleChange: (hidden) => { skillsBtn?.classList.toggle("active", !hidden); if (!hidden) refresh(); },
  });
  win.close(); // default: hidden (matches the legacy panel's closed-by-default feel)

  skillsBtn?.addEventListener("click", () => toggleWindow(win));
  // Escape is handled generically now (the shared Esc cascade in
  // src/ui/windows/setup.ts closes the topmost open utility window).
  addEventListener("keydown", (e) => { if (e.code === "KeyK") toggleWindow(win); });
}

function refresh() {
  for (let i = 0; i < sk.list.length; i++) {
    const v = sk.list[i]!.value;
    rows[i]!.value.textContent = v.toFixed(1);
    rows[i]!.lock.textContent = LOCK_GLYPH[sk.list[i]!.lock];
    const t = skillTier(v);
    rows[i]!.tier.textContent = t;
    rows[i]!.tier.dataset.tier = t;
  }
  const totalEl = document.getElementById("skillsTotal");
  if (totalEl) totalEl.textContent = `Total ${totalSkills(sk).toFixed(1)} / ${SKILL_CAP}`;
}

/** Call every frame; keeps visible numbers current. */
export function updateSkillsUI() {
  if (win.isOpen()) refresh();
}

/** Town Fame line in the skills window (v2 block #2). Cheap; only writes when the
 *  window is open. `tier` is the warm name (Unknown … Beloved), `fame` the 0-100. */
export function updateReputationUI(fame: number, tier: string) {
  if (!win.isOpen()) return;
  const el = document.getElementById("skillsRep");
  if (!el) return;
  el.innerHTML = `🏛️ <span class="rep-tier">${tier}</span> · <span class="rep-val">${Math.round(fame)}/100</span>`;
}

/** Floating "+0.3" popup on the skill's row (visible when the window is open). */
export function skillGainPopup(id: string, amount: number) {
  const i = sk.list.findIndex((s) => s.id === id);
  if (i === -1) return;
  const float = rows[i]!.float;
  const pop = document.createElement("span");
  pop.className = "sk-pop";
  pop.textContent = `+${amount.toFixed(1)}`;
  float.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);
}
