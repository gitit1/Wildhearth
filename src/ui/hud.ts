import type { Economy } from "../systems/economy";

const coinsEl = document.getElementById("coins")!;
const fishEl = document.getElementById("fish")!;
const promptEl = document.getElementById("prompt")!;
const toastEl = document.getElementById("toast")!;
let toastT = 0;

export function updateHud(e: Economy) {
  coinsEl.textContent = String(e.coins);
  fishEl.textContent = String(e.fish);
}

export function setPrompt(text: string | null) {
  if (text) { promptEl.textContent = text; promptEl.style.display = "block"; }
  else promptEl.style.display = "none";
}

export function toast(text: string) {
  toastEl.textContent = text;
  toastEl.style.display = "block";
  toastT = 2.2;
}

export function updateToast(dt: number) {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) toastEl.style.display = "none"; }
}
