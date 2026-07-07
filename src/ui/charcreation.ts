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
/**
 * 10 curated outfit presets (Part C content-library commit 2), 5 per gender,
 * each a distinct STYLE silhouette (see art/rig.ts's OutfitStyle), not just a
 * color swap — "overalls" and "smock" are unisex (DECISIONS: "unisex where
 * natural is fine"), reappearing in both rows with a different palette.
 */
const OUTFITS_FEM: Outfit[] = [
  { torso: "#9a4a4a", legs: "#9a4a4a", accent: "#6e3535", shoes: "#4b3a26", style: "dress" },        // work dress + apron
  { torso: "#3f8a6a", legs: "#c9a23a", accent: "#8a6f2a", shoes: "#3a2f22", style: "tunic-skirt" },  // tunic + skirt
  { torso: "#e8d9b0", legs: "#4a5d8a", accent: "#33415a", shoes: "#3a2f22", style: "overalls" },     // overalls
  { torso: "#5a3a6e", legs: "#5a3a6e", accent: "#9a8a78", shoes: "#3a2f22", style: "shawl-dress" },  // shawl + dress
  { torso: "#3f6a7a", legs: "#4a4038", accent: "#c9c2ac", shoes: "#4b3a26", style: "smock" },        // fisher's smock
];
const OUTFITS_MASC: Outfit[] = [
  { torso: "#5a7a3a", legs: "#5a4632", accent: "#7a5330", shoes: "#4b3a26", style: "tunic-belt" },   // tunic + belt
  { torso: "#d9cdb0", legs: "#3a4a5a", accent: "#26323f", shoes: "#3a2f22", style: "overalls" },     // overalls
  { torso: "#8a5c3a", legs: "#4a4038", accent: "#5a3c22", shoes: "#4b3a26", style: "vest", sleeve: "#e0d3ae" }, // vest + shirt
  { torso: "#4a6d7a", legs: "#3a342a", accent: "#b9b09a", shoes: "#3a2f22", style: "smock" },        // fisher's smock
  { torso: "#4a3a2a", legs: "#33302a", accent: "#8a6f4a", shoes: "#3a2f22", style: "coat" },         // traveler's coat
];
const outfitsFor = (g: Gender): Outfit[] => (g === "female" ? OUTFITS_FEM : OUTFITS_MASC);
const OUTFIT_LABELS: Record<string, string> = {
  dress: "Work dress + apron", "tunic-skirt": "Tunic + skirt", overalls: "Overalls",
  "shawl-dress": "Shawl + dress", smock: "Fisher's smock", "tunic-belt": "Tunic + belt",
  vest: "Vest + shirt", coat: "Traveler's coat",
};

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
    appearance: { ...DEFAULT_APPEARANCE, outfit: { ...OUTFITS_FEM[0]! } },
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
    b.addEventListener("click", () => {
      state.gender = gd;
      state.appearance.outfit = { ...outfitsFor(gd)[0]! };   // snap to that gender's first curated outfit
      for (const s of syncers) s();
    });
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
  const outfitRow = outfitGroup(() => outfitsFor(state.gender), () => state.appearance.outfit, (o) => (state.appearance.outfit = { ...o }), syncers);

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
    state.gender = Math.random() < 0.5 ? "female" : "male";
    state.appearance.outfit = { ...pick(outfitsFor(state.gender)) };
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

/** Outfit picker (Part C content-library commit 2): the 5 presets shown
 *  depend on the currently-chosen gender (`getList`), so the whole row
 *  rebuilds — not just re-highlights — whenever gender changes; `rebuild` is
 *  pushed into `syncers` so gender-switch and Randomize both refresh it. */
function outfitGroup(getList: () => Outfit[], get: () => Outfit, set: (o: Outfit) => void, syncers: Array<() => void>): HTMLElement {
  const field = document.createElement("div");
  field.className = "cc-field";
  const row = document.createElement("div");
  row.className = "cc-row";
  let list: Outfit[] = [];
  const rebuild = () => {
    list = getList();
    row.replaceChildren();
    list.forEach((o) => {
      const b = document.createElement("button");
      b.className = "cc-swatch cc-outfit";
      b.title = OUTFIT_LABELS[o.style ?? ""] ?? "";
      b.style.background = `linear-gradient(160deg, ${o.torso} 0 58%, ${o.legs} 58% 100%)`;
      b.addEventListener("click", () => { set(o); sync(); });
      row.append(b);
    });
    sync();
  };
  const sync = () => {
    const btns = Array.from(row.children) as HTMLButtonElement[];
    btns.forEach((b, i) => b.classList.toggle("sel", list[i]!.torso === get().torso && list[i]!.legs === get().legs && list[i]!.style === get().style));
  };
  syncers.push(rebuild);
  rebuild();
  field.append(fieldLabel("Outfit"), row);
  return field;
}
