import { openingRoot } from "./titlescreen";
import { drawRig, type RigParams, type HairStyle, type BodyBuild, type Outfit } from "../art/rig";
import { DEFAULT_APPEARANCE, type Appearance, type CharacterIdentity, type Gender } from "../systems/meta";

/**
 * Character Creation screen (Part A #10 / Part E #4) — the first new-game
 * screen. Collects name, age, gender and appearance from curated presets (no
 * sliders), with a LIVE code-drawn rig preview that breathes and turns, and a
 * Randomize (🎲) button. Everything drawn on canvas via the shared drawRig, so
 * the preview is literally the in-world character. Path + life-goal come on the
 * next screen (after the intro + farm reveal); this one only gathers identity.
 */

// ---- curated preset sets (not sliders) ------------------------------------
const SKINS = ["#f6d3b3", "#e8b48a", "#cf9f74", "#a9744e", "#7c4f33"];
const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: "short", label: "Short" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "bald", label: "Bald" },
  { id: "hat", label: "Hat" },
];
const HAIR_COLORS = ["#2a2018", "#5b3b22", "#8a5a2a", "#c08a2e", "#b8b0a0", "#9c4a2a"];
const BUILDS: Array<{ id: BodyBuild; label: string }> = [
  { id: "slim", label: "Slim" },
  { id: "average", label: "Average" },
  { id: "round", label: "Round" },
];
const OUTFITS: Outfit[] = [
  { torso: "#b0432f", legs: "#4a5d8a", accent: "#7a3020", shoes: "#4b3a26" },                  // rust + slate
  { torso: "#2f6f7a", legs: "#33414d", accent: "#9c6b3f", shoes: "#3a2f22", torsoStyle: 2 },   // teal, apron
  { torso: "#5a9a48", legs: "#6b4a2b", accent: "#e2c24a", shoes: "#4b3a26", torsoStyle: 1 },   // green, vest
  { torso: "#6a4a8a", legs: "#3a4a7a", accent: "#e0be5c", shoes: "#3a2f22", torsoStyle: 1 },   // plum
];

const FIRST_F = ["Mira", "Wren", "Rosa", "Elena", "Nell", "Ivy", "Cora", "Sonja", "Lena", "Faye"];
const FIRST_M = ["Bram", "Cal", "Ivo", "Milo", "Rune", "Anders", "Soren", "Tomas", "Elias", "Pip"];
const LAST = ["Ashford", "Vale", "Hollow", "Meadows", "Barrow", "Fenn", "Marsh", "Rook", "Wilder", "Thorne"];
const NICKS = ["", "", "Sunny", "Sparrow", "Patch", "Bramble", "Fox", ""];
const NAME_MAX = 16;

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

interface CCState {
  firstName: string;
  lastName: string;
  nickname: string;
  age: number;
  gender: Gender;
  appearance: Appearance;
}

let previewRaf = 0;

function previewRig(a: Appearance, scale: number): RigParams {
  return {
    scale, build: a.build, legLength: 1, armLength: 1,
    skin: a.skin, hair: a.hair, hairColor: a.hairColor, hatColor: a.hatColor,
    age: "adult", outfit: { ...a.outfit },
  };
}

export function showCharacterCreation(onDone: (identity: CharacterIdentity) => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const state: CCState = {
    firstName: "Robin", lastName: "Vale", nickname: "",
    age: 25, gender: "female",
    appearance: { ...DEFAULT_APPEARANCE, outfit: { ...OUTFITS[0]! } },
  };

  const panel = document.createElement("div");
  panel.className = "menu-panel cc-panel";

  const h1 = document.createElement("h1");
  h1.className = "menu-title cc-title";
  h1.textContent = "Create your character";

  const body = document.createElement("div");
  body.className = "cc-body";

  // ---- left: live preview ----
  const left = document.createElement("div");
  left.className = "cc-left";
  const cv = document.createElement("canvas");
  cv.className = "cc-preview";
  const CW = 150, CH = 210;
  cv.width = CW * devicePixelRatio;
  cv.height = CH * devicePixelRatio;
  cv.style.width = `${CW}px`;
  cv.style.height = `${CH}px`;
  const g = cv.getContext("2d")!;
  left.append(cv);

  // ---- right: option controls (rebuilt-on-demand groups + persistent inputs) ----
  const right = document.createElement("div");
  right.className = "cc-right";

  const syncers: Array<() => void> = [];   // refresh selection highlights (used by Randomize)

  // name row: three inputs + the dice
  const nameField = document.createElement("div");
  nameField.className = "cc-field";
  const nameLabel = fieldLabel("Name");
  const names = document.createElement("div");
  names.className = "cc-names";
  const firstIn = textInput("First name", state.firstName, (v) => (state.firstName = v));
  const lastIn = textInput("Last name", state.lastName, (v) => (state.lastName = v));
  const nickIn = textInput("Nickname (optional)", state.nickname, (v) => (state.nickname = v));
  const dice = document.createElement("button");
  dice.className = "cc-dice";
  dice.id = "ccRandomize";
  dice.title = "Randomize";
  dice.textContent = "🎲";
  names.append(firstIn, lastIn, nickIn, dice);
  nameField.append(nameLabel, names);

  // age stepper
  const ageField = document.createElement("div");
  ageField.className = "cc-field cc-inline";
  const ageValue = document.createElement("span");
  ageValue.className = "cc-age-val";
  ageValue.id = "ccAge";
  const setAge = (n: number) => { state.age = Math.max(18, Math.min(70, n)); ageValue.textContent = String(state.age); };
  const ageBox = document.createElement("div");
  ageBox.className = "cc-stepper";
  const ageMinus = stepBtn("−", () => setAge(state.age - 1));
  const agePlus = stepBtn("+", () => setAge(state.age + 1));
  ageBox.append(ageMinus, ageValue, agePlus);
  setAge(state.age);
  ageField.append(fieldLabel("Age"), ageBox);

  // gender toggle
  const genderField = document.createElement("div");
  genderField.className = "cc-field cc-inline";
  const genderBox = document.createElement("div");
  genderBox.className = "cc-toggle";
  const gBtns: Array<{ id: Gender; el: HTMLButtonElement }> = [];
  for (const gd of ["female", "male"] as Gender[]) {
    const b = document.createElement("button");
    b.className = "cc-btn";
    b.textContent = gd === "female" ? "Female" : "Male";
    b.dataset.g = gd;
    b.addEventListener("click", () => { state.gender = gd; syncGender(); });
    genderBox.append(b);
    gBtns.push({ id: gd, el: b });
  }
  const syncGender = () => gBtns.forEach((x) => x.el.classList.toggle("sel", x.id === state.gender));
  syncers.push(syncGender);
  genderField.append(fieldLabel("Gender"), genderBox);

  // appearance groups
  const skinRow = swatchGroup("Skin", SKINS, () => state.appearance.skin, (c) => (state.appearance.skin = c), syncers);
  const hairRow = labelGroup("Hair", HAIR_STYLES.map((h) => ({ v: h.id, label: h.label })),
    () => state.appearance.hair, (v) => (state.appearance.hair = v as HairStyle), syncers);
  const hairColRow = swatchGroup("Hair colour", HAIR_COLORS, () => state.appearance.hairColor, (c) => (state.appearance.hairColor = c), syncers);
  const buildRow = labelGroup("Build", BUILDS.map((b) => ({ v: b.id, label: b.label })),
    () => state.appearance.build, (v) => (state.appearance.build = v as BodyBuild), syncers);
  const outfitRow = outfitGroup(() => state.appearance.outfit, (o) => (state.appearance.outfit = { ...o }), syncers);

  right.append(nameField, ageField, genderField, skinRow, hairRow, hairColRow, buildRow, outfitRow);

  body.append(left, right);

  const cont = document.createElement("button");
  cont.className = "menu-btn cc-continue";
  cont.id = "ccContinue";
  cont.textContent = "Continue";

  panel.append(h1, body, cont);
  o.append(panel);

  // ---- randomize ----
  dice.addEventListener("click", () => {
    state.appearance.skin = pick(SKINS);
    state.appearance.hair = pick(HAIR_STYLES).id;
    state.appearance.hairColor = pick(HAIR_COLORS);
    state.appearance.build = pick(BUILDS).id;
    state.appearance.outfit = { ...pick(OUTFITS) };
    state.gender = Math.random() < 0.5 ? "female" : "male";
    state.firstName = pick(state.gender === "female" ? FIRST_F : FIRST_M);
    state.lastName = pick(LAST);
    state.nickname = pick(NICKS);
    firstIn.value = state.firstName;
    lastIn.value = state.lastName;
    nickIn.value = state.nickname;
    for (const s of syncers) s();
  });

  // ---- live preview loop: idle breathing + a slow turn between facings ----
  const t0 = performance.now();
  const frame = (now: number) => {
    if (!cv.isConnected) { previewRaf = 0; return; }   // screen replaced → stop
    const t = (now - t0) / 1000;
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    g.clearRect(0, 0, CW, CH);
    const facing = ([2, 1, 2, 3] as const)[Math.floor(t / 2.2) % 4]!;   // front, right, front, left
    drawRig(g, CW / 2, CH * 0.82, facing, previewRig(state.appearance, 2.5), "idle", 0, t);
    previewRaf = requestAnimationFrame(frame);
  };
  cancelAnimationFrame(previewRaf);
  previewRaf = requestAnimationFrame(frame);

  cont.addEventListener("click", () => {
    cancelAnimationFrame(previewRaf);
    previewRaf = 0;
    const firstName = (state.firstName.trim() || "Robin").slice(0, NAME_MAX);
    const lastName = (state.lastName.trim() || "Vale").slice(0, NAME_MAX);
    const nickname = state.nickname.trim().slice(0, NAME_MAX);
    onDone({
      firstName, lastName,
      ...(nickname ? { nickname } : {}),
      age: state.age,
      gender: state.gender,
      appearance: { ...state.appearance, outfit: { ...state.appearance.outfit } },
    });
  });
}

// ---- small DOM builders ----------------------------------------------------

function fieldLabel(text: string): HTMLElement {
  const l = document.createElement("div");
  l.className = "cc-label";
  l.textContent = text;
  return l;
}

function textInput(placeholder: string, value: string, onInput: (v: string) => void): HTMLInputElement {
  const i = document.createElement("input");
  i.className = "cc-input";
  i.type = "text";
  i.placeholder = placeholder;
  i.maxLength = NAME_MAX;
  i.value = value;
  i.addEventListener("input", () => onInput(i.value));
  // typing must not trigger the game's world hotkeys behind the overlay
  i.addEventListener("keydown", (e) => e.stopPropagation());
  return i;
}

function stepBtn(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "cc-step";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function swatchGroup(
  label: string, colors: readonly string[], get: () => string, set: (c: string) => void,
  syncers: Array<() => void>,
): HTMLElement {
  const field = document.createElement("div");
  field.className = "cc-field";
  const row = document.createElement("div");
  row.className = "cc-row";
  const btns: HTMLButtonElement[] = [];
  colors.forEach((c) => {
    const b = document.createElement("button");
    b.className = "cc-swatch";
    b.style.background = c;
    b.addEventListener("click", () => { set(c); sync(); });
    row.append(b);
    btns.push(b);
  });
  const sync = () => btns.forEach((b, i) => b.classList.toggle("sel", colors[i] === get()));
  syncers.push(sync);
  sync();
  field.append(fieldLabel(label), row);
  return field;
}

function labelGroup(
  label: string, opts: Array<{ v: string; label: string }>, get: () => string, set: (v: string) => void,
  syncers: Array<() => void>,
): HTMLElement {
  const field = document.createElement("div");
  field.className = "cc-field";
  const row = document.createElement("div");
  row.className = "cc-row cc-wrap";
  const btns: Array<{ v: string; el: HTMLButtonElement }> = [];
  opts.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "cc-btn";
    b.textContent = opt.label;
    b.addEventListener("click", () => { set(opt.v); sync(); });
    row.append(b);
    btns.push({ v: opt.v, el: b });
  });
  const sync = () => btns.forEach((x) => x.el.classList.toggle("sel", x.v === get()));
  syncers.push(sync);
  sync();
  field.append(fieldLabel(label), row);
  return field;
}

function outfitGroup(get: () => Outfit, set: (o: Outfit) => void, syncers: Array<() => void>): HTMLElement {
  const field = document.createElement("div");
  field.className = "cc-field";
  const row = document.createElement("div");
  row.className = "cc-row";
  const btns: HTMLButtonElement[] = [];
  OUTFITS.forEach((o) => {
    const b = document.createElement("button");
    b.className = "cc-swatch cc-outfit";
    b.style.background = `linear-gradient(160deg, ${o.torso} 0 58%, ${o.legs} 58% 100%)`;
    b.addEventListener("click", () => { set(o); sync(); });
    row.append(b);
    btns.push(b);
  });
  const sync = () => btns.forEach((b, i) => b.classList.toggle("sel", OUTFITS[i]!.torso === get().torso && OUTFITS[i]!.legs === get().legs));
  syncers.push(sync);
  sync();
  field.append(fieldLabel("Outfit"), row);
  return field;
}
