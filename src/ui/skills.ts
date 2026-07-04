import { SKILL_CAP } from "../config";
import { SKILL_NAMES, cycleLock, totalSkills, type Skills, type SkillLock } from "../systems/skills";
import { makePanel } from "./panels";

/**
 * UO-style skills window (key K or the HUD 📜 icon): scrollable list of
 * skills, a value per row, a lock toggle (up/down/locked), and a floating
 * "+0.3" popup on gain. Drag the header to move, corner grip to resize.
 */

const LOCK_GLYPH: Record<SkillLock, string> = { up: "▲", down: "▼", locked: "🔒" };

let panel: HTMLElement;
let skillsBtn: HTMLElement | null;
let open = false;
let sk: Skills;
let rows: { value: HTMLElement; lock: HTMLElement; float: HTMLElement }[] = [];

export function initSkillsUI(skills: Skills) {
  sk = skills;
  panel = document.getElementById("skillsPanel")!;
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

    const value = document.createElement("span");
    value.className = "sk-value";
    value.textContent = s.value.toFixed(1);

    const float = document.createElement("span");
    float.className = "sk-float";

    row.append(lock, name, float, value);
    list.append(row);
    rows.push({ value, lock, float });
  }

  skillsBtn?.addEventListener("click", () => setOpen(!open));
  addEventListener("keydown", (e) => {
    if (e.code === "KeyK") setOpen(!open);
    else if (e.code === "Escape" && open) setOpen(false);
  });

  panel.style.display = "block";           // measurable for makePanel, then honor `open`
  makePanel(panel, panel.querySelector("h2")!, "skills", (s) => {
    panel.style.setProperty("--s", String(s));
  });
  setOpen(false);
}

function setOpen(v: boolean) {
  open = v;
  panel.style.display = open ? "block" : "none";
  skillsBtn?.classList.toggle("active", open);
  if (open) refresh();
}

function refresh() {
  for (let i = 0; i < sk.list.length; i++) {
    rows[i]!.value.textContent = sk.list[i]!.value.toFixed(1);
    rows[i]!.lock.textContent = LOCK_GLYPH[sk.list[i]!.lock];
  }
  const totalEl = document.getElementById("skillsTotal");
  if (totalEl) totalEl.textContent = `Total ${totalSkills(sk).toFixed(1)} / ${SKILL_CAP}`;
}

/** Call every frame; keeps visible numbers current. */
export function updateSkillsUI() {
  if (open) refresh();
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
