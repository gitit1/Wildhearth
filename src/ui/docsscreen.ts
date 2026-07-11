import { openingRoot } from "./titlescreen";
import { renderMarkdown, type RenderedDoc } from "./mdrender";

/**
 * Project Docs — the developer/archive reading room (owner-requested). A
 * fullscreen overlay that surfaces EVERY markdown doc in the repo (docs/*.md,
 * runs/*.md, CLAUDE.md) in a comfortable reading mode so the owner can audit
 * her own planning and verify nothing was missed.
 *
 * Content is auto-globbed (lazy `?raw` imports) so a new doc dropped in the repo
 * appears here with zero code change and without bloating the game bundle —
 * each doc is its own tiny lazy chunk, fetched only when read or searched. This
 * is pure dev/meta content: it never touches gameplay, saves, or the zero-PNG
 * boot. Esc / Back returns to the main menu.
 *
 * Layout: a grouped sidebar of docs, a parchment reading pane, a per-doc table
 * of contents, and a cross-doc search that groups snippet hits by doc and jumps
 * to (and highlights) the match on click.
 */

// Auto-glob every doc as a lazy raw-text importer. Keys are the module paths
// (e.g. "../../docs/VISION.md"); values are () => Promise<string>.
const DOC_MODULES = import.meta.glob(
  ["../../docs/*.md", "../../runs/*.md", "../../CLAUDE.md"],
  { query: "?raw", import: "default" },
) as Record<string, () => Promise<string>>;

interface DocFile {
  key: string;          // stable id = repo-relative path (e.g. "docs/VISION.md")
  basename: string;     // filename without extension
  group: string;        // sidebar group
  title: string;        // human title (filename first, upgraded to # heading)
  load: () => Promise<string>;
}

const GROUP_ORDER = ["Design docs", "Roadmaps", "Logs", "Runs", "Rules"];
const LOG_NAMES = new Set([
  "WORKLOG", "HANDOFF", "DECISIONS", "AUTORUN_SUMMARY", "AUTORUN_SUMMARY_BATCH2",
]);

/** Map a module path to its repo-relative key + group. */
function classify(modPath: string): { key: string; basename: string; group: string } {
  const rel = modPath.replace(/^\.\.\/\.\.\//, ""); // strip the "../../" glob prefix
  const basename = rel.replace(/^.*\//, "").replace(/\.md$/, "");
  let group: string;
  if (rel.startsWith("runs/")) group = "Runs";
  else if (rel === "CLAUDE.md") group = "Rules";
  else if (/^ROADMAP/.test(basename)) group = "Roadmaps";
  else if (LOG_NAMES.has(basename)) group = "Logs";
  else group = "Design docs";
  return { key: rel, basename, group };
}

/** "GAME_OVERVIEW" -> "Game Overview"; keep the runs handoff dates readable. */
function humanize(basename: string): string {
  return basename
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** First `# ` heading of a doc, cleaned, or null. */
function firstHeading(src: string): string | null {
  for (const raw of src.split("\n")) {
    const m = /^#\s+(.*)$/.exec(raw.trim());
    if (m) return m[1]!.replace(/[`*_]/g, "").trim();
    if (raw.trim() && !raw.startsWith("<!--")) break; // stop at first real content
  }
  return null;
}

const DOCS: DocFile[] = Object.entries(DOC_MODULES)
  .map(([path, load]) => {
    const { key, basename, group } = classify(path);
    return { key, basename, group, title: humanize(basename), load };
  })
  .sort((a, b) => a.basename.localeCompare(b.basename));

// Session-lived caches (persist while the tab lives, across screen re-opens).
const contentCache = new Map<string, string>();
let lastDocKey: string | null = null;
let allLoaded = false;

async function loadDoc(doc: DocFile): Promise<string> {
  const cached = contentCache.get(doc.key);
  if (cached !== undefined) return cached;
  const text = await doc.load();
  contentCache.set(doc.key, text);
  const h = firstHeading(text);
  if (h) doc.title = h;
  return text;
}

/** Load every doc once (for cross-doc search + title upgrades). Idempotent. */
async function loadAll(): Promise<void> {
  if (allLoaded) return;
  await Promise.all(DOCS.map((d) => loadDoc(d)));
  allLoaded = true;
}

export function showDocs(onBack: () => void) {
  const o = openingRoot();
  o.className = "dark";
  o.style.display = "flex";
  o.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "menu-panel docs-panel";

  // ---- header: back, title, search ----
  const head = document.createElement("div");
  head.className = "docs-head";
  const back = document.createElement("button");
  back.className = "screen-back";
  back.id = "docsBack";
  back.textContent = "‹ Back";
  const title = document.createElement("h1");
  title.className = "menu-title screen-title docs-title";
  title.textContent = "Project Docs";
  const search = document.createElement("input");
  search.className = "docs-search";
  search.type = "search";
  search.placeholder = "Search all docs…";
  search.setAttribute("aria-label", "Search all docs");
  head.append(back, title, search);

  // ---- body: sidebar | reader (+ toc) ----
  const bodyRow = document.createElement("div");
  bodyRow.className = "docs-body";

  const sidebar = document.createElement("div");
  sidebar.className = "docs-sidebar";

  const readerWrap = document.createElement("div");
  readerWrap.className = "docs-readerwrap";
  const toc = document.createElement("nav");
  toc.className = "docs-toc";
  const reader = document.createElement("div");
  reader.className = "docs-reader";
  readerWrap.append(reader, toc);

  bodyRow.append(sidebar, readerWrap);
  panel.append(head, bodyRow);
  o.append(panel);

  // ---- sidebar list, grouped ----
  const navButtons = new Map<string, HTMLButtonElement>();
  const titleSpans = new Map<string, HTMLSpanElement>();
  const buildSidebar = () => {
    sidebar.replaceChildren();
    for (const group of GROUP_ORDER) {
      const docs = DOCS.filter((d) => d.group === group);
      if (!docs.length) continue;
      const gh = document.createElement("div");
      gh.className = "docs-group";
      gh.textContent = group;
      sidebar.append(gh);
      for (const d of docs) {
        const b = document.createElement("button");
        b.className = "docs-navitem";
        const t = document.createElement("span");
        t.className = "docs-navtitle";
        t.textContent = d.title;
        const f = document.createElement("span");
        f.className = "docs-navfile";
        f.textContent = d.basename;
        b.append(t, f);
        b.addEventListener("click", () => openDoc(d.key));
        sidebar.append(b);
        navButtons.set(d.key, b);
        titleSpans.set(d.key, t);
      }
    }
  };
  buildSidebar();

  // ---- open a doc in the reading pane ----
  let currentKey: string | null = null;
  const openDoc = async (key: string, highlight?: string) => {
    const doc = DOCS.find((d) => d.key === key);
    if (!doc) return;
    currentKey = key;
    lastDocKey = key;
    navButtons.forEach((b, k) => b.classList.toggle("active", k === key));
    reader.replaceChildren(spinner("Loading…"));
    toc.replaceChildren();

    const text = await loadDoc(doc);
    if (currentKey !== key) return; // superseded by a newer click
    // refresh the sidebar title now that the heading is known
    const ts = titleSpans.get(key);
    if (ts) ts.textContent = doc.title;

    const rendered = renderMarkdown(text);
    reader.replaceChildren(rendered.node);
    reader.scrollTop = 0;
    buildToc(rendered);

    if (highlight) highlightIn(reader, highlight);
  };

  const buildToc = (rendered: RenderedDoc) => {
    toc.replaceChildren();
    const subs = rendered.headings.filter((h) => h.level === 2 || h.level === 3);
    if (!subs.length) { toc.classList.add("empty"); return; }
    toc.classList.remove("empty");
    const label = document.createElement("div");
    label.className = "docs-toc-label";
    label.textContent = "On this page";
    toc.append(label);
    for (const h of subs) {
      const a = document.createElement("button");
      a.className = "docs-toc-item docs-toc-l" + h.level;
      a.textContent = h.text;
      a.addEventListener("click", () => scrollTo(reader, h.el));
      toc.append(a);
    }
  };

  // ---- cross-doc search ----
  let searchTimer = 0;
  const runSearch = async (q: string) => {
    const query = q.trim();
    if (!query) { restoreReader(); return; }
    reader.replaceChildren(spinner("Searching all docs…"));
    toc.classList.add("empty");
    toc.replaceChildren();
    await loadAll();
    if (search.value.trim() !== query) return; // user kept typing
    renderResults(query);
  };

  const restoreReader = () => {
    if (currentKey) openDoc(currentKey);
    else reader.replaceChildren(welcome());
  };

  const renderResults = (query: string) => {
    const lc = query.toLowerCase();
    const wrap = document.createElement("div");
    wrap.className = "docs-results";
    const summary = document.createElement("div");
    summary.className = "docs-results-summary";
    wrap.append(summary);
    let totalHits = 0;
    let docsWithHits = 0;

    for (const group of GROUP_ORDER) {
      for (const d of DOCS.filter((x) => x.group === group)) {
        const text = contentCache.get(d.key);
        if (!text) continue;
        const hits = findHits(text, lc);
        if (!hits.length) continue;
        docsWithHits++;
        totalHits += hits.length;

        const card = document.createElement("div");
        card.className = "docs-result-card";
        const dh = document.createElement("div");
        dh.className = "docs-result-doc";
        dh.textContent = `${d.title}`;
        const dm = document.createElement("span");
        dm.className = "docs-result-count";
        dm.textContent = ` · ${hits.length} match${hits.length > 1 ? "es" : ""}`;
        dh.append(dm);
        card.append(dh);

        for (const hit of hits.slice(0, 4)) {
          const row = document.createElement("button");
          row.className = "docs-result-hit";
          appendSnippet(row, text, hit, query.length);
          row.addEventListener("click", () => {
            search.value = "";
            openDoc(d.key, query);
          });
          card.append(row);
        }
        if (hits.length > 4) {
          const more = document.createElement("button");
          more.className = "docs-result-more";
          more.textContent = `+${hits.length - 4} more in this doc — open`;
          more.addEventListener("click", () => { search.value = ""; openDoc(d.key, query); });
          card.append(more);
        }
        wrap.append(card);
      }
    }

    if (!totalHits) {
      summary.textContent = `No matches for “${query}”.`;
    } else {
      summary.textContent = `${totalHits} match${totalHits > 1 ? "es" : ""} in ${docsWithHits} doc${docsWithHits > 1 ? "s" : ""} for “${query}”`;
    }
    reader.replaceChildren(wrap);
    reader.scrollTop = 0;
  };

  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runSearch(search.value), 180);
  });
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && search.value) { e.stopPropagation(); search.value = ""; restoreReader(); }
  });

  // ---- Esc / back teardown ----
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    removeEventListener("keydown", onKey, true);
    onBack();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (document.activeElement === search && search.value) return; // handled above
      e.stopImmediatePropagation();
      e.preventDefault();
      close();
    }
  };
  addEventListener("keydown", onKey, true);
  back.addEventListener("click", close);

  // ---- initial view: last-opened doc, else a welcome + background preload ----
  if (lastDocKey && DOCS.some((d) => d.key === lastDocKey)) {
    openDoc(lastDocKey);
  } else {
    reader.replaceChildren(welcome());
    toc.classList.add("empty");
  }
  // Preload everything in the background so titles upgrade + search is instant.
  loadAll().then(() => {
    for (const d of DOCS) {
      const ts = titleSpans.get(d.key);
      if (ts) ts.textContent = d.title;
    }
  });

  setTimeout(() => back.focus(), 0);
}

// ---- helpers ---------------------------------------------------------------

function spinner(label: string): HTMLElement {
  const d = document.createElement("div");
  d.className = "docs-spinner";
  d.textContent = label;
  return d;
}

function welcome(): HTMLElement {
  const d = document.createElement("div");
  d.className = "docs-welcome";
  const h = document.createElement("div");
  h.className = "docs-welcome-h";
  h.textContent = "The archive";
  const p = document.createElement("p");
  p.textContent =
    "Every design doc, roadmap, log and run in the project — pick one from the left to read, or search across all of them at once to check whether something was planned.";
  d.append(h, p);
  return d;
}

/** Scroll a heading/element into view within its scroll container. */
function scrollTo(container: HTMLElement, el: HTMLElement) {
  const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTop += top - 10;
}

interface Hit { line: number; col: number; start: number }

/** Line-by-line case-insensitive matches (first per line, capped for perf). */
function findHits(text: string, lc: string): Hit[] {
  const hits: Hit[] = [];
  const lines = text.split("\n");
  let offset = 0;
  for (let li = 0; li < lines.length && hits.length < 60; li++) {
    const line = lines[li]!;
    const col = line.toLowerCase().indexOf(lc);
    if (col >= 0) hits.push({ line: li, col, start: offset + col });
    offset += line.length + 1;
  }
  return hits;
}

/** Append a highlighted snippet (context around the match) to `row`. */
function appendSnippet(row: HTMLElement, text: string, hit: Hit, qlen: number) {
  const line = text.split("\n")[hit.line] ?? "";
  const from = Math.max(0, hit.col - 34);
  const to = Math.min(line.length, hit.col + qlen + 46);
  const pre = (from > 0 ? "…" : "") + line.slice(from, hit.col);
  const mid = line.slice(hit.col, hit.col + qlen);
  const post = line.slice(hit.col + qlen, to) + (to < line.length ? "…" : "");
  row.append(document.createTextNode(pre));
  const mark = document.createElement("mark");
  mark.className = "docs-hl";
  mark.textContent = mid;
  row.append(mark, document.createTextNode(post));
}

/** After opening a doc from a search hit, find the first matching text node,
 *  wrap it in <mark>, and scroll it into view. Robust to the rendered DOM. */
function highlightIn(container: HTMLElement, query: string) {
  const lc = query.toLowerCase();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.data.toLowerCase().indexOf(lc);
    if (idx < 0) continue;
    const after = node.splitText(idx);
    after.splitText(query.length);
    const mark = document.createElement("mark");
    mark.className = "docs-hl docs-hl-live";
    mark.textContent = after.data;
    after.replaceWith(mark);
    scrollTo(container, mark);
    return;
  }
}
