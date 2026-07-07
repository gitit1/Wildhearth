import { openingRoot } from "./titlescreen";

/**
 * Shared chrome for the top-level "back-able" screens (What's New, Help,
 * Credits, Settings) — a wood/gold panel with a header (‹ Back + title) and a
 * scrollable body. Esc and the Back button both call `onBack`. Keeps every
 * screen visually one family and saves each from re-plumbing the same shell.
 */

export interface ScreenShell {
  panel: HTMLElement;
  head: HTMLElement;
  body: HTMLElement;
  /** Tear down the Esc handler and return to whatever opened this screen. */
  close: () => void;
}

export function screenShell(
  title: string,
  onBack: () => void,
  opts: { wide?: boolean; backLabel?: string } = {},
): ScreenShell {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel screen-panel" + (opts.wide ? " screen-wide" : "");

  const head = document.createElement("div");
  head.className = "screen-head";
  const back = document.createElement("button");
  back.className = "screen-back";
  back.id = "screenBack";
  back.textContent = `‹ ${opts.backLabel ?? "Back"}`;
  const h1 = document.createElement("h1");
  h1.className = "menu-title screen-title";
  h1.textContent = title;
  head.append(back, h1);

  const body = document.createElement("div");
  body.className = "screen-body";

  panel.append(head, body);
  o.append(panel);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    removeEventListener("keydown", onKey, true);
    onBack();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); }
  };
  addEventListener("keydown", onKey, true);
  back.addEventListener("click", close);

  return { panel, head, body, close };
}
