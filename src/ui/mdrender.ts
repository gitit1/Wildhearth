/**
 * A small, self-contained Markdown → DOM renderer for the Project Docs screen
 * (dev/meta content). Zero dependencies, zero `innerHTML` of document text —
 * every piece of doc content becomes a real DOM text node, so `<tags>` inside a
 * doc are shown literally and can never inject markup.
 *
 * Supported (enough for this repo's docs): ATX headings, bold/italic/inline
 * code, links (rendered as text + the URL in muted parens — never navigable),
 * bullet + numbered lists with nesting, GitHub task checkboxes ([x]/[ ] → ✅/⬜
 * — the roadmaps live on these ticks), pipe tables, fenced code blocks,
 * blockquotes and horizontal rules. Anything unrecognised falls through as a
 * plain paragraph, so no doc ever renders blank.
 *
 * Returns the rendered container plus the flat list of heading anchors so the
 * reader can build a clickable table of contents that scrolls to each heading.
 */

export interface DocHeading {
  level: number;
  text: string;
  el: HTMLElement;
}
export interface RenderedDoc {
  node: HTMLElement;
  headings: DocHeading[];
}

// ---- inline formatting -----------------------------------------------------
// Each rule finds the EARLIEST match in the remaining string; ties break by
// array order (so `**` bold is tried before `*` italic). Every rule builds a
// DOM node from real text nodes, so HTML in the source is inert.

type InlineRule = { re: RegExp; make: (m: RegExpExecArray) => Node };

function emph(tag: "strong" | "em", inner: string): HTMLElement {
  const e = document.createElement(tag);
  inlineInto(e, inner);
  return e;
}

function linkNode(text: string, url: string): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "md-link-wrap";
  const label = document.createElement("span");
  label.className = "md-link";
  inlineInto(label, text || url);
  wrap.append(label);
  // The URL is shown but the anchor is deliberately non-navigating — this is a
  // reading view, not a browser. Show it in muted parens unless it's identical
  // to the label already.
  if (url && url !== text) {
    const u = document.createElement("span");
    u.className = "md-link-url";
    u.textContent = ` (${url})`;
    wrap.append(u);
  }
  return wrap;
}

const INLINE_RULES: InlineRule[] = [
  { re: /`([^`]+)`/, make: (m) => { const e = document.createElement("code"); e.className = "md-code"; e.textContent = m[1]!; return e; } },
  { re: /!?\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/, make: (m) => linkNode(m[1]!, m[2]!) },
  { re: /\*\*([^\s](?:.*?[^\s])?)\*\*/, make: (m) => emph("strong", m[1]!) },
  { re: /(?<![\w_])__([^\s](?:.*?[^\s])?)__(?![\w_])/, make: (m) => emph("strong", m[1]!) },
  { re: /(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])/, make: (m) => emph("em", m[1]!) },
  { re: /(?<![\w_])_(?!\s)([^_]+?)(?<!\s)_(?![\w_])/, make: (m) => emph("em", m[1]!) },
];

/** Parse inline markdown in `text`, appending nodes to `parent`. */
export function inlineInto(parent: Node, text: string): void {
  let rest = text;
  // Guard against pathological deep recursion on adversarial input.
  let guard = 0;
  while (rest && guard++ < 10000) {
    let best: { idx: number; ri: number; m: RegExpExecArray } | null = null;
    for (let ri = 0; ri < INLINE_RULES.length; ri++) {
      const m = INLINE_RULES[ri]!.re.exec(rest);
      if (m && (!best || m.index < best.idx)) best = { idx: m.index, ri, m };
    }
    if (!best) break;
    if (best.idx > 0) parent.appendChild(document.createTextNode(rest.slice(0, best.idx)));
    parent.appendChild(INLINE_RULES[best.ri]!.make(best.m));
    rest = rest.slice(best.idx + best.m[0].length);
  }
  if (rest) parent.appendChild(document.createTextNode(rest));
}

// ---- block parsing ---------------------------------------------------------

const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_HR = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const RE_LIST = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;
const RE_CHECK = /^\[([ xX])\]\s+(.*)$/;

interface ListItem { indent: number; ordered: boolean; text: string }

function humanEmpty(s: string): boolean { return s.trim() === ""; }

/** Render markdown into a fresh container element + its heading anchors. */
export function renderMarkdown(src: string): RenderedDoc {
  const root = document.createElement("div");
  root.className = "md-body";
  const headings: DocHeading[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (!buf.length) return;
    const p = document.createElement("p");
    p.className = "md-p";
    inlineInto(p, buf.join(" "));
    root.append(p);
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i]!;

    // fenced code block
    const fence = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      const marker = fence[2]!;
      i++;
      const code: string[] = [];
      while (i < lines.length && !new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`).test(lines[i]!)) {
        code.push(lines[i]!);
        i++;
      }
      i++; // closing fence
      const pre = document.createElement("pre");
      pre.className = "md-pre";
      const c = document.createElement("code");
      c.textContent = code.join("\n");
      pre.append(c);
      root.append(pre);
      continue;
    }

    // blank line
    if (humanEmpty(line)) { i++; continue; }

    // horizontal rule (before heading/list so `---` wins)
    if (RE_HR.test(line)) { root.append(document.createElement("hr")); i++; continue; }

    // heading
    const h = RE_HEADING.exec(line);
    if (h) {
      const level = h[1]!.length;
      const el = document.createElement(`h${Math.min(level, 6)}`) as HTMLElement;
      el.className = `md-h md-h${level}`;
      inlineInto(el, h[2]!.replace(/\s+#+\s*$/, ""));
      root.append(el);
      headings.push({ level, text: el.textContent || "", el });
      i++;
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) {
        quote.push(lines[i]!.replace(/^\s*>\s?/, ""));
        i++;
      }
      const bq = document.createElement("blockquote");
      bq.className = "md-quote";
      inlineInto(bq, quote.join(" "));
      root.append(bq);
      continue;
    }

    // table: a pipe row immediately followed by a separator row
    if (line.includes("|") && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]!)) {
      const header = splitRow(line);
      i += 2; // header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes("|") && !humanEmpty(lines[i]!)) {
        rows.push(splitRow(lines[i]!));
        i++;
      }
      root.append(buildTable(header, rows));
      continue;
    }

    // list (bullet / numbered, with nesting)
    if (RE_LIST.test(line)) {
      const items: ListItem[] = [];
      while (i < lines.length) {
        if (RE_LIST.test(lines[i]!)) {
          const m = RE_LIST.exec(lines[i]!)!;
          items.push({ indent: m[1]!.length, ordered: m[3] !== undefined, text: m[4]! });
          i++;
          // fold plain continuation lines (indented, not a new list/blank) into
          // the current item so wrapped bullets stay together
          while (i < lines.length && !humanEmpty(lines[i]!) && !RE_LIST.test(lines[i]!) &&
                 /^\s+\S/.test(lines[i]!) && !RE_HEADING.test(lines[i]!)) {
            items[items.length - 1]!.text += " " + lines[i]!.trim();
            i++;
          }
          continue;
        }
        // "loose" list: blank line(s) between items still belong to one list, as
        // long as another list item follows (no intervening paragraph). This is
        // what keeps blank-separated numbered lists counting 1,2,3 not 1,1,1.
        if (humanEmpty(lines[i]!)) {
          let j = i;
          while (j < lines.length && humanEmpty(lines[j]!)) j++;
          if (j < lines.length && RE_LIST.test(lines[j]!)) { i = j; continue; }
        }
        break;
      }
      root.append(buildList(items));
      continue;
    }

    // paragraph — gather consecutive plain lines
    const buf: string[] = [];
    while (i < lines.length && !humanEmpty(lines[i]!) && !isBlockStart(lines, i)) {
      buf.push(lines[i]!.trim());
      i++;
    }
    flushParagraph(buf);
  }

  return { node: root, headings };
}

/** True if the line at `idx` begins a non-paragraph block (stops paragraph gathering). */
function isBlockStart(lines: string[], idx: number): boolean {
  const l = lines[idx]!;
  return (
    RE_HEADING.test(l) ||
    RE_HR.test(l) ||
    RE_LIST.test(l) ||
    /^\s*>/.test(l) ||
    /^(\s*)(`{3,}|~{3,})/.test(l) ||
    (l.includes("|") && idx + 1 < lines.length && RE_TABLE_SEP.test(lines[idx + 1]!))
  );
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  // split on unescaped pipes
  return s.split(/\s*(?<!\\)\|\s*/).map((c) => c.replace(/\\\|/g, "|"));
}

function cellInto(cell: HTMLElement, text: string) {
  const chk = RE_CHECK.exec(text.trim());
  if (chk) {
    checkboxInto(cell, chk[1]!.toLowerCase() === "x", chk[2]!);
  } else {
    inlineInto(cell, text);
  }
}

function buildTable(header: string[], rows: string[][]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "md-table-wrap";
  const table = document.createElement("table");
  table.className = "md-table";
  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  for (const cell of header) {
    const th = document.createElement("th");
    inlineInto(th, cell);
    htr.append(th);
  }
  thead.append(htr);
  table.append(thead);
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (let c = 0; c < header.length; c++) {
      const td = document.createElement("td");
      cellInto(td, row[c] ?? "");
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  return wrap;
}

function checkboxInto(li: HTMLElement, checked: boolean, rest: string) {
  const box = document.createElement("span");
  box.className = "md-check";
  box.textContent = checked ? "✅" : "⬜";
  li.append(box, document.createTextNode(" "));
  const span = document.createElement("span");
  inlineInto(span, rest);
  li.append(span);
}

/** Build a nested <ul>/<ol> tree from flat items keyed by indentation. */
function buildList(items: ListItem[]): HTMLElement {
  const rootIndent = items[0]!.indent;
  const root = document.createElement(items[0]!.ordered ? "ol" : "ul");
  root.className = "md-list";
  const stack: { el: HTMLElement; indent: number }[] = [{ el: root, indent: rootIndent }];
  let lastLi: HTMLElement | null = null;

  for (const it of items) {
    while (stack.length > 1 && it.indent < stack[stack.length - 1]!.indent) stack.pop();
    let top = stack[stack.length - 1]!;
    if (it.indent > top.indent && lastLi) {
      // deeper — open a nested list under the previous <li>
      const sub = document.createElement(it.ordered ? "ol" : "ul");
      sub.className = "md-list";
      lastLi.append(sub);
      stack.push({ el: sub, indent: it.indent });
      top = stack[stack.length - 1]!;
    }
    const li = document.createElement("li");
    li.className = "md-li";
    const chk = RE_CHECK.exec(it.text);
    if (chk) checkboxInto(li, chk[1]!.toLowerCase() === "x", chk[2]!);
    else inlineInto(li, it.text);
    top.el.append(li);
    lastLi = li;
  }
  return root;
}
