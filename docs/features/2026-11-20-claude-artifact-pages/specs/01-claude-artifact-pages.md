---
id: 1
status: in-review
---
# Outcome

Agents show a document and its questions on one page, publish pages as
Claude artifacts on Claude by default, and import the answers into the
brief. Brief: [claude-artifact-pages](../brief.md).

## acceptance

- `cli.mjs pages` prints `claude` by default; `pages --set local` records
  `artifacts.pages` in `.joycraft/preferences.json`; any other value is
  refused (`tests/artifact-pages.test.ts`, `[AC:pages-default]`).
- A `--mode claude` build with `--brief` and `--doc` shows the document above
  its questions on one page (`[AC:one-page]`).
- `import --responses` takes a list of per-decision envelopes, previews
  without writing, refuses a decision named twice, and `--apply` writes all
  answers (`[AC:import-list]`).
- `references/artifacts.md` and the entry skill say: one page for a document
  and its questions; on Claude with `pages` `claude`, build, publish with
  `db` and `user`, list the `decisions` collection and import. Shipped words
  stay at or under 29,919 (`tests/payload-guard.test.ts`).
- A live round trip: a published page saves an answer that lists in
  artifact storage and imports into the brief (`[AC:live-round-trip]`).
