---
feature: claude-artifact-pages
status: specified
---
# Pages on Claude go to Claude artifacts, and a document shares a page with its questions

## Problem

- On 1.6.1 an agent showed findings as one page and the questions about them
  as a second page. The engine already renders both on one page
  (`--brief` with `--doc`); the entry skill's wording read as two pages.
- Pages always served on localhost. On Claude, the Artifact tool gives a
  private page the owner can share, and the engine already builds one
  (`build --mode claude`), but no guidance used it.

## Decision (Max, 2026-11-20)

- A document that has questions goes on one page with its brief.
- On Claude with an artifact tool, pages publish as Claude artifacts by
  default. A project setting switches back: `cli.mjs pages --set local`.
  Other hosts keep localhost.
- Answers in Claude artifact storage come back through the existing import:
  the agent lists the per-decision documents and imports them as one list.
- `payload/` is the source; joycraft-prototype is retired (decision log
  2026-11-20). This feature is the first payload change made in place.
