import { screenShell } from "./screen";
import { menuConfirm } from "./mainmenu";
import { applyGlobalPrefs, applyHudPrefs } from "./uiPrefs";
import {
  loadSettings, saveSettings, setGuidance,
  type EndOfDaySummary, type Guidance, type FontSize, type Colorblind,
} from "../systems/settings";
import {
  loadAiSettings, saveAiSettings, setAiFeature, AI_FEATURES, AI_DEPTHS, type AiDepth,
} from "../systems/aiSettings";
import { createAiCtx, type AiErrorKind } from "../systems/ai";
import { applyWindowPreset, type WindowPreset } from "./windows/setup";
import { wm } from "./windows/manager";
import type { WindowHandle } from "./windows/window";
import { DAY_LENGTH_MIN_MIN, DAY_LENGTH_MAX_MIN } from "../config";
import type { SlotManifest } from "../systems/saveSlots";

/**
 * Settings — reachable from the title menu (full-screen `screenShell`, since
 * the title screen has no desktop) and in-game (Windows migration II: a real
 * wm window now, opened via the ⚙ HUD button or Pause → Settings — both
 * still pause game-time exactly as before; the game view stays visible,
 * frozen, behind it). Both presentations share the SAME section-building
 * code (`buildSettingsBody`) — only the chrome around it differs. Sections:
 * Time, Gameplay, Interface, Windows (layout presets), Audio (inert until
 * sound exists), AI companion, and Save management. Every change persists
 * immediately via settings.ts / aiSettings.ts; live-applying ones (day
 * length, summary, guidance) are read live by main.ts, and Interface prefs
 * are re-applied here.
 */

export interface SettingsCtx {
  onBack: () => void;
  onSaveNow: () => void;          // main's manual-save path
  onDeleteSave: () => void;       // wipe game state + boot to title
  slot: SlotManifest | null;
  hasSave: boolean;
  tutorialAvailable: boolean;     // Tutorial can still be (re-)entered
  inGame: boolean;                // opened over live play (affects a couple labels)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function savedAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Friendly inline copy for a failed connection test, by typed error kind. */
function testErrorMessage(error: AiErrorKind, message: string): string {
  switch (error) {
    case "ai-off":   return "Enter your API key first.";
    case "auth":     return "That key was rejected — check it and try again.";
    case "network":  return "Couldn't reach the service (network or browser block).";
    case "timeout":  return "The request timed out. Try again.";
    case "rate-limit": return "Too many requests just now — wait a moment.";
    case "server":   return "The service had a hiccup. Try again shortly.";
    case "budget":   return "This month's AI budget is used up.";
    default:         return `Couldn't connect${message ? ` — ${message}` : "."}`;
  }
}

/** The main-menu path: full-screen `screenShell` (title-screen context has
 *  no desktop to float a window on). */
export function showSettings(ctx: SettingsCtx) {
  const { body } = screenShell("Settings", ctx.onBack, { wide: true });
  buildSettingsBody(body, ctx);
}

// ===========================================================================
//  In-game path (Windows migration II): a real wm window, singleton +
//  rebuilt fresh on every open (save-slot timestamp, live AI settings, etc.
//  need to read current state, not whatever was true the last time it opened).
// ===========================================================================
let settingsWin: WindowHandle | undefined;
let settingsBody: HTMLElement | undefined;
let settingsCtx: SettingsCtx | null = null;

export function showSettingsWindow(ctx: SettingsCtx) {
  settingsCtx = ctx;
  if (!settingsWin) {
    settingsBody = document.createElement("div");
    settingsBody.style.cssText = "height:100%;box-sizing:border-box;overflow-y:auto;padding:6px 14px 14px";
    settingsWin = wm.createWindow({
      id: "settings", title: "Settings", icon: "⚙️",
      content: settingsBody,
      resizable: true, minW: 480, minH: 360, maxW: 960, maxH: 960,
      defaultRect: (d) => ({
        x: Math.round((d.w - 720) / 2), y: Math.round((d.h - 560) / 2), w: 720, h: 560,
      }),
      openAt: (d, s) => ({ x: Math.round((d.w - s.w) / 2), y: Math.round((d.h - s.h) / 2) }),   // fixed centered home (HUD-A2)
      // the window's ✕ / the shared Esc cascade both funnel through here —
      // same "go back to whatever opened Settings" semantics the old
      // screenShell's Back button had, just via WindowHandle.close() now.
      onClose: () => settingsCtx?.onBack(),
    });
  }
  settingsBody!.replaceChildren();
  buildSettingsBody(settingsBody!, ctx);
  settingsWin.open();
}

function buildSettingsBody(body: HTMLElement, ctx: SettingsCtx) {
  const s = loadSettings();

  // ---------- Time ----------
  {
    const sec = section(body, "Time");
    const valLabel = document.createElement("span");
    valLabel.className = "set-value";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "set-slider";
    slider.min = String(DAY_LENGTH_MIN_MIN);
    slider.max = String(DAY_LENGTH_MAX_MIN);
    slider.step = "1";
    slider.value = String(Math.round(s.dayLengthSeconds / 60));
    slider.id = "setDayLength";
    const showVal = () => { valLabel.textContent = `${slider.value} min / day`; };
    showVal();
    slider.addEventListener("input", () => {
      showVal();
      saveSettings({ dayLengthSeconds: Number(slider.value) * 60 });
    });
    const wrap = document.createElement("div");
    wrap.className = "set-slider-wrap";
    wrap.append(slider, valLabel);
    sec.append(row("Day length", wrap, "How long one in-game day takes to play out."));
  }

  // ---------- Gameplay ----------
  {
    const sec = section(body, "Gameplay");
    sec.append(segmentedRow<EndOfDaySummary>(
      "End-of-day summary",
      [{ id: "none", label: "None" }, { id: "quick", label: "Quick" }, { id: "full", label: "Full" }],
      s.endOfDaySummary,
      (v) => saveSettings({ endOfDaySummary: v }),
      "What you see when a day ends.",
    ));
    sec.append(segmentedRow<Guidance>(
      "Guidance",
      [
        { id: "tutorial", label: "Tutorial", disabled: !ctx.tutorialAvailable,
          title: ctx.tutorialAvailable ? undefined : "You've left the tutorial — it can't be resumed." },
        { id: "aspiration", label: "Aspiration" },
        { id: "none", label: "None" },
      ],
      s.guidance,
      (v) => setGuidance(v),   // Guidance engine blocks re-entering Tutorial via the disabled option
      "How much the game guides you.",
    ));
  }

  // ---------- Interface ----------
  {
    const sec = section(body, "Interface");
    sec.append(checkRow("Show the needs strip", s.hudNeeds,
      (v) => { saveSettings({ hudNeeds: v }); applyHudPrefs(); }));
    sec.append(checkRow("Show the minimap", s.hudMinimap,
      (v) => { saveSettings({ hudMinimap: v }); applyHudPrefs(); }));
    sec.append(checkRow("Show the clock dial", s.hudClock,
      (v) => { saveSettings({ hudClock: v }); applyHudPrefs(); }));
    sec.append(segmentedRow<FontSize>(
      "Font size",
      [{ id: "normal", label: "Normal" }, { id: "large", label: "Large" }],
      s.fontSize,
      (v) => { saveSettings({ fontSize: v }); applyGlobalPrefs(); },
    ));
    sec.append(checkRow("High contrast", s.highContrast,
      (v) => { saveSettings({ highContrast: v }); applyGlobalPrefs(); },
      "Stronger text and borders."));
    sec.append(selectRow<Colorblind>(
      "Colorblind palette (coming soon)",
      [{ id: "default", label: "Default" }, { id: "deuteranopia", label: "Deuteranopia" }, { id: "protanopia", label: "Protanopia" }],
      s.colorblind,
      (v) => { saveSettings({ colorblind: v }); applyGlobalPrefs(); },
      false,
    ));
  }

  // ---------- Windows (layout presets) ----------
  {
    const sec = section(body, "Windows",
      "Everything on screen is a draggable, resizable, minimizable window on your desktop — the game viewport included. These are quick starting layouts; your arrangement is remembered (and kept across a New Game).");
    const presets: Array<{ id: WindowPreset; label: string; note: string }> = [
      { id: "classic", label: "Classic", note: "The default: viewport centred, HUD around the edges." },
      { id: "focus", label: "Focus", note: "Viewport maximized, HUD tucked into the dock." },
      { id: "cozy", label: "Cozy", note: "A smaller viewport with the HUD tiled around it." },
    ];
    const feedback = document.createElement("span");
    feedback.className = "set-feedback set-ok";
    const flash = (name: string) => {
      feedback.textContent = `${name} ✓`;
      setTimeout(() => { feedback.textContent = ""; }, 2200);
    };
    const seg = document.createElement("div");
    seg.className = "set-seg";
    for (const p of presets) {
      const b = document.createElement("button");
      b.className = "set-seg-btn";
      b.textContent = p.label;
      b.title = p.note;
      b.addEventListener("click", () => { applyWindowPreset(p.id); flash(p.label); });
      seg.append(b);
    }
    const presetWrap = document.createElement("div");
    presetWrap.className = "set-inline";
    presetWrap.append(seg, feedback);
    sec.append(row("Layout presets", presetWrap, "Applied instantly — Classic · Focus · Cozy."));

    const reset = document.createElement("button");
    reset.className = "set-btn";
    reset.id = "setResetWindows";
    reset.textContent = "Reset to default";
    reset.addEventListener("click", () => { applyWindowPreset("reset"); flash("Default layout"); });
    sec.append(row("Reset windows", reset, "Clears your saved window layout and restores the Classic arrangement."));
  }

  // ---------- Audio ----------
  {
    const sec = section(body, "Audio", "No sound in the game yet — these will apply when it arrives.");
    sec.append(volumeRow("Music", s.volMusic, (v) => saveSettings({ volMusic: v })));
    sec.append(volumeRow("Sound effects", s.volSfx, (v) => saveSettings({ volSfx: v })));
    sec.append(volumeRow("Ambient", s.volAmbient, (v) => saveSettings({ volAmbient: v })));
  }

  // ---------- AI companion ----------
  {
    const ai = loadAiSettings();
    const sec = section(body, "AI companion",
      "Bring your own key. Nothing is sent anywhere unless you turn this on — the whole game plays fully without it.");

    const featureChecks: HTMLInputElement[] = [];
    const setFeaturesEnabled = (on: boolean) =>
      featureChecks.forEach((c) => { c.disabled = !on; c.closest(".set-check")?.classList.toggle("set-disabled", !on); });

    sec.append(checkRow("Enable the AI companion", ai.enabled, (v) => {
      saveAiSettings({ enabled: v });
      setFeaturesEnabled(v);
    }, "Master switch (default off)."));

    // API key — masked, with a show/hide eye
    const keyInput = document.createElement("input");
    keyInput.type = "password";
    keyInput.className = "set-input set-key";
    keyInput.id = "setApiKey";
    keyInput.placeholder = "sk-…";
    keyInput.autocomplete = "off";
    keyInput.value = ai.apiKey;
    keyInput.addEventListener("input", () => saveAiSettings({ apiKey: keyInput.value }));
    keyInput.addEventListener("keydown", (e) => e.stopPropagation());
    const eye = document.createElement("button");
    eye.className = "set-eye";
    eye.type = "button";
    eye.textContent = "👁";
    eye.title = "Show / hide key";
    eye.addEventListener("click", () => { keyInput.type = keyInput.type === "password" ? "text" : "password"; });
    const keyWrap = document.createElement("div");
    keyWrap.className = "set-key-wrap";
    keyWrap.append(keyInput, eye);
    sec.append(row("API key", keyWrap, "Stored only in this browser — never uploaded."));

    // Monthly token budget
    const budget = document.createElement("input");
    budget.type = "number";
    budget.className = "set-input set-budget";
    budget.id = "setBudget";
    budget.min = "0";
    budget.step = "10000";
    budget.value = String(ai.monthlyTokenBudget);
    budget.addEventListener("input", () => {
      const n = Math.max(0, Math.round(Number(budget.value) || 0));
      saveAiSettings({ monthlyTokenBudget: n });
    });
    budget.addEventListener("keydown", (e) => e.stopPropagation());
    sec.append(row("Monthly token budget", budget, "A soft cap — the AI stops for the month when reached."));

    // Depth / cost dial — maps to a model tier (Standard = fast & thrifty).
    sec.append(segmentedRow<AiDepth>(
      "Response depth",
      AI_DEPTHS.map((d) => ({ id: d.id, label: d.label })),
      ai.depth,
      (v) => saveAiSettings({ depth: v }),
      "Higher depth is richer and costs more per reply.",
    ));

    // 8 per-feature checkboxes in a grid
    const grid = document.createElement("div");
    grid.className = "set-ai-grid";
    for (const feat of AI_FEATURES) {
      const rowEl = checkRow(feat.label, ai.features[feat.id], (v) => setAiFeature(feat.id, v));
      const input = rowEl.querySelector("input")!;
      input.id = `setAiFeat-${feat.id}`;
      featureChecks.push(input);
      grid.append(rowEl);
    }
    const gridWrap = document.createElement("div");
    gridWrap.className = "set-row set-row-block";
    const gl = document.createElement("div"); gl.className = "set-label"; gl.textContent = "AI features";
    gridWrap.append(gl, grid);
    sec.append(gridWrap);
    setFeaturesEnabled(ai.enabled);

    // Test connection — one tiny real (or mock) call through the AI facade.
    const test = document.createElement("button");
    test.className = "set-btn";
    test.id = "setTestConn";
    test.textContent = "Test connection";
    const testResult = document.createElement("span");
    testResult.className = "set-feedback";
    testResult.id = "setTestResult";
    test.addEventListener("click", async () => {
      test.disabled = true;
      testResult.classList.remove("set-ok", "set-err");
      testResult.textContent = "Testing…";
      // Fresh settings so the just-typed key is used; no toast wiring needed here.
      const ctx = createAiCtx(loadAiSettings());
      const res = await ctx.testConnection();
      if (res.ok) {
        testResult.textContent = "Connected — the hearth is warm.";
        testResult.classList.add("set-ok");
      } else {
        testResult.textContent = testErrorMessage(res.error, res.message);
        testResult.classList.add("set-err");
      }
      test.disabled = false;
    });
    const testWrap = document.createElement("div");
    testWrap.className = "set-inline";
    testWrap.append(test, testResult);
    sec.append(row("Connection", testWrap, "Sends one tiny request to check your key."));
  }

  // ---------- Save management ----------
  {
    const sec = section(body, "Save");
    const slotLine = document.createElement("div");
    slotLine.className = "set-slot";
    slotLine.id = "setSlotInfo";
    slotLine.textContent = ctx.slot
      ? `Last saved: ${cap(ctx.slot.calendarStamp.season)} · Day ${ctx.slot.calendarStamp.day} · ${ctx.slot.coins} coins · ${savedAgo(ctx.slot.lastSavedAt)}`
      : "No saved game yet.";
    sec.append(row("Slot 1", slotLine));

    const saveBtn = document.createElement("button");
    saveBtn.className = "set-btn";
    saveBtn.id = "setSaveNow";
    saveBtn.textContent = "Save now";
    const feedback = document.createElement("span");
    feedback.className = "set-feedback";
    saveBtn.addEventListener("click", () => {
      ctx.onSaveNow();
      feedback.textContent = "Saved ✓";
      setTimeout(() => { feedback.textContent = ""; }, 2500);
    });
    const saveWrap = document.createElement("div");
    saveWrap.className = "set-inline";
    saveWrap.append(saveBtn, feedback);
    sec.append(row("Manual save", saveWrap, ctx.inGame ? undefined : "Available while playing, too."));

    const del = document.createElement("button");
    del.className = "set-btn set-btn-danger";
    del.id = "setDeleteSave";
    del.textContent = "Delete save";
    del.disabled = !ctx.hasSave;
    del.addEventListener("click", () => {
      // double-confirm (Part E #3): two deliberate steps before anything is wiped
      menuConfirm(
        "Delete your saved game?",
        "This erases your farm, your coins, and everyone you've met — everything. It cannot be undone.",
        "Delete save",
        () => menuConfirm(
          "Are you absolutely sure?",
          "There is no way back from this.",
          "Yes, delete everything",
          ctx.onDeleteSave,
          () => {},
        ),
        () => {},
      );
    });
    sec.append(row("Delete save", del, "Wipes this slot and returns to the title screen."));

    // Language — English only in v1, locked
    const lang = document.createElement("select");
    lang.className = "set-select";
    lang.disabled = true;
    const opt = document.createElement("option");
    opt.textContent = "English";
    lang.append(opt);
    sec.append(row("Language", lang, "More languages later."));
  }
}

// ---- small builders --------------------------------------------------------

function section(parent: HTMLElement, title: string, note?: string): HTMLElement {
  const sec = document.createElement("div");
  sec.className = "set-section";
  const h = document.createElement("div");
  h.className = "set-section-title";
  h.textContent = title;
  sec.append(h);
  if (note) {
    const n = document.createElement("div");
    n.className = "set-note";
    n.textContent = note;
    sec.append(n);
  }
  parent.append(sec);
  return sec;
}

function row(label: string, control: HTMLElement, note?: string): HTMLElement {
  const r = document.createElement("div");
  r.className = "set-row";
  const l = document.createElement("div");
  l.className = "set-label";
  l.textContent = label;
  const c = document.createElement("div");
  c.className = "set-control";
  c.append(control);
  if (note) {
    const n = document.createElement("div");
    n.className = "set-rownote";
    n.textContent = note;
    c.append(n);
  }
  r.append(l, c);
  return r;
}

function segmentedRow<T extends string>(
  label: string,
  opts: Array<{ id: T; label: string; disabled?: boolean; title?: string }>,
  value: T,
  onPick: (v: T) => void,
  note?: string,
): HTMLElement {
  const seg = document.createElement("div");
  seg.className = "set-seg";
  let current = value;
  const btns: Array<{ id: T; el: HTMLButtonElement }> = [];
  for (const o of opts) {
    const b = document.createElement("button");
    b.className = "set-seg-btn";
    b.textContent = o.label;
    b.dataset.id = o.id;
    if (o.disabled) { b.disabled = true; if (o.title) b.title = o.title; }
    b.addEventListener("click", () => {
      if (o.disabled) return;
      current = o.id;
      sync();
      onPick(o.id);
    });
    seg.append(b);
    btns.push({ id: o.id, el: b });
  }
  const sync = () => btns.forEach((x) => x.el.classList.toggle("sel", x.id === current));
  sync();
  return row(label, seg, note);
}

function checkRow(label: string, checked: boolean, onChange: (v: boolean) => void, note?: string): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "set-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  const span = document.createElement("span");
  span.textContent = label;
  wrap.append(input, span);
  if (note) {
    const n = document.createElement("span");
    n.className = "set-checknote";
    n.textContent = note;
    wrap.append(n);
  }
  const r = document.createElement("div");
  r.className = "set-row set-row-check";
  r.append(wrap);
  return r;
}

function selectRow<T extends string>(
  label: string,
  opts: Array<{ id: T; label: string }>,
  value: T,
  onChange: (v: T) => void,
  disabled: boolean,
): HTMLElement {
  const sel = document.createElement("select");
  sel.className = "set-select";
  sel.disabled = disabled;
  for (const o of opts) {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.label;
    if (o.id === value) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener("change", () => onChange(sel.value as T));
  return row(label, sel);
}

function volumeRow(label: string, value: number, onInput: (v: number) => void): HTMLElement {
  const val = document.createElement("span");
  val.className = "set-value";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "set-slider";
  slider.min = "0"; slider.max = "100"; slider.step = "5";
  slider.value = String(value);
  const show = () => { val.textContent = `${slider.value}%`; };
  show();
  slider.addEventListener("input", () => { show(); onInput(Number(slider.value)); });
  const wrap = document.createElement("div");
  wrap.className = "set-slider-wrap";
  wrap.append(slider, val);
  return row(label, wrap);
}
