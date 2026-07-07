import { screenShell } from "./screen";
import { CHANGELOG, isEntryNew, markChangelogSeen } from "../data/changelog";

/**
 * What's New screen (Part E #2) — a scrollable, data-driven changelog. Entries
 * newer than the player's last-seen id are tagged NEW; opening the screen marks
 * them all seen (which also clears the menu's badge). We snapshot the NEW state
 * BEFORE marking, so the tags are visible on this very viewing.
 */

export function showWhatsNew(onBack: () => void) {
  const { body } = screenShell("What's New", onBack);

  // snapshot which entries are new for THIS view, then mark seen
  const newFlags = CHANGELOG.map(isEntryNew);
  markChangelogSeen();

  const list = document.createElement("div");
  list.className = "wn-list";

  CHANGELOG.forEach((entry, i) => {
    const card = document.createElement("div");
    card.className = "wn-entry";

    const top = document.createElement("div");
    top.className = "wn-top";
    const title = document.createElement("span");
    title.className = "wn-title";
    title.textContent = entry.title;
    top.append(title);
    if (newFlags[i]) {
      const tag = document.createElement("span");
      tag.className = "wn-new";
      tag.textContent = "NEW";
      top.append(tag);
    }

    const meta = document.createElement("div");
    meta.className = "wn-meta";
    meta.textContent = `${entry.version} · ${entry.date}`;

    const sum = document.createElement("p");
    sum.className = "wn-sum";
    sum.textContent = entry.summary;

    card.append(top, meta, sum);
    list.append(card);
  });

  body.append(list);
}
