# Wiki governance: OKF and docaudit

**Date:** 2026-11-02 · **Feeds:** decision D6 in
`docs/features/2026-11-02-field-feedback-1-0-1/brief.md` (answer: seam first) ·
**Source:** David Moshal's field feedback on 1.0.0

## Recommendation

- **Borrow the ideas, not the tools.** Joycraft is Node with no dependencies and does
  not call models. Both sources fit as ideas; neither fits as a dependency.
- **1.1 seam:** an `afterArchive` hook in the project config, which can run docaudit or
  any other project tool, plus a `joycraft-cleanup` script with checks that need no
  model.
- **Later, if wanted:** make `docs/context/` an OKF bundle (optional frontmatter).

## OKF: Open Knowledge Format

Spec: <https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md> (v0.2).

- A folder of Markdown files with YAML frontmatter. Only `type` is required.
- `sources`: provenance. `generated {by, at}`: who wrote it. `verified [{by, at}]`:
  who checked it. Trust tiers come from `verified`: unverified, machine-confirmed or
  human-reviewed.
- `status: draft | stable | deprecated`, and `stale_after`: an absolute date, so
  "is this stale?" is a plain comparison.
- Reserved `index.md` (folder listing) and `log.md` (change history) per folder.
- Actors: `agent/version`, `human:<id>`, `process:<id>`.

**Fit:** strong. Archiving a feature can update its concept page, append to `log.md`
and set `verified: {by: process:joycraft-verify, at}` from the accepted PASS report.
`joycraft-cleanup` can flag passed `stale_after`, linked `deprecated` pages and
pages with no `sources`, all without a model. OKF has no doc-to-code anchors.

## docaudit

Repo: <https://github.com/akira993/docaudit> (MIT, Python 3.12 standard library,
v1.6.0, one author, no stars as of 2026-11-02).

- Report-only: it audits Markdown docs against the code they describe and never
  edits them.
- `.claude/docaudit.json` has an `impact.map` from code globs to docs. These are the
  doc-to-code drift anchors David described.
- Change-driven: each accepted run writes an anchor (the commit) per profile, and
  later runs judge only the impacted docs.
- A model judges the prose, through Codex, agy or Claude Code agents. Checks with no
  model: links, existence, orphans, required frontmatter fields.
- One outcome per run: `CONSISTENT`, `NEEDS_FIX`, `undecided` or `REFUSED`, plus a
  report written into the repo.

**Fit:** good as an optional hook target. As a dependency it is not a fit: it needs
Python, a model CLI and a delicate install.

## What to build in 1.1 (proposal)

1. `.joycraft/config.yaml` (D1), with `paths`, `hooks.afterArchive`, and an optional
   `impact` map in docaudit's shape (code globs → `docs/context/` pages).
2. `joycraft-cleanup` (Node, report-first):
   - stale working files
   - links from `docs/context/` into `docs/features/` or `docs/archive/`
   - orphaned context pages
   - context pages whose `impact` code changed since the last archive
   - orphaned worktrees (already done: `worktrees.mjs`)
3. The `afterArchive` hook passes `JOYCRAFT_FEATURE`, `JOYCRAFT_ARCHIVE_PATH` and the
   changed paths, so a project can run `docaudit` there.
4. Optional OKF frontmatter on context pages; cleanup reads `status` and
   `stale_after` when present.

## Open

- `doc-governance`: Max could not find it. Ask David for the link.
- 0.7 had a shipped ledger and `reap: eligible` briefs
  (`src/skills/joycraft-session-end.md`). Check what worked there before building
  item 2.
