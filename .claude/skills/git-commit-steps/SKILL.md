---
name: git-commit-steps
description: Commit convention for this repo — one commit per ROADMAP step or per feature/bug, never one giant commit. Use whenever committing work that spans a roadmap step or a standalone feature/fix.
---

# Git commit convention — Wildhearth

This repo commits in small, labeled steps instead of one large commit at
the end of a session. Applies any time there's a batch of work to commit,
whether it just happened in one conversation or was reconstructed from
history.

## Naming

- If the work corresponds to a numbered step in `docs/ROADMAP_MVP.md` or
  `docs/ROADMAP_EXPANSION.md`, name the commit after that step:
  `Step 0 — baseline: ...`, `Step 1 — inventory replaces ...`.
- If there's no roadmap step (a UI change, a rename, a bugfix, a retrofit
  the user asked for mid-stream), use a slug prefix instead:
  - `feature-<short-description>` for additive work
    (e.g. `feature-draggable-resizable-panels`, `feature-rename-project-to-wildhearth`).
  - `bug-<short-description>` for fixes
    (e.g. `bug-fish-count-not-saved`).
- Keep the summary line under ~70 characters; put the "why" and scope in
  the body, not the title.

## Granularity

- One commit per logical unit of work — a roadmap step, or a single
  feature/fix the user asked for — not one commit per file, and not one
  giant commit spanning multiple unrelated asks.
- Each commit should represent a state where `npm run build` passes and
  the game is playable end to end (mirrors the ROADMAP_MVP.md rule that
  every step must leave the game running).
- When reconstructing history retroactively (e.g. the repo had no git
  history yet and multiple rounds of work already happened), split by the
  actual sequence of user requests, not by file. Verify each intermediate
  stage still builds before committing it.

## Docs are a special case

`docs/ROADMAP_MVP.md`, `docs/VISION.md`, and other design docs under
`docs/` are sometimes edited directly by the user in the IDE, in parallel
with Claude's own work in the same session. Before overwriting these files
as part of a reconstructed commit, re-read them in full (not just the top
few lines) to check for content that wasn't part of the tracked
conversation — do not clobber the user's own edits with a stale cached
version.

## Remote

- Default remote workflow: `git init` if needed, then commit in the steps
  above, then `git remote add origin <url>` and push — but only add/push
  to a remote when the user explicitly asks to connect one.
- Before the first push to a new remote, confirm it's actually empty
  (`git ls-remote origin` returns nothing) so the push can't clobber
  existing history. If it already has commits, stop and ask before doing
  anything that could overwrite them.
