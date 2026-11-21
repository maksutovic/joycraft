# Cleanup result

Nothing is committed or published. Gates: `CI=1 pnpm test` 233 passed, 6 skipped (11.6 s); `pnpm typecheck` clean; `pin-payload.mjs --check`, `wiring.mjs`, `entry-check.mjs --ci` clean; `cleanup.mjs` leaves only the two kept worktrees.

## Permission ledger

Read onto a line you did not name — check these first:

| Old | New | Decided by |
|---|---|---|
| "without Max’s explicit approval" (release stop) | "without the maintainer's explicit approval" | `stops` note: "assume this could be any contributor" |
| "Reference absolute paths — all templates and skills must use project-relative paths" | "Never reference absolute paths: everything in `payload/` uses project-relative paths" | `stops` note: "written as if it was version 1.8.0" |
| "Push directly to main/master (always use feature branches + PR)" + "Use descriptive branch names" | "Work on a feature branch with a descriptive name (`feature/<spec-name>`). Never push to main; every change reaches main through a PR." | Same note; scope unchanged |

Decided by your answers:

| Old | New | Decided by |
|---|---|---|
| ASK FIRST: adding dependencies; template changes outside a spec; skill changes outside a spec; publishing to npm; merging PRs to main; destructive git operations | Removed | `stops`: "these ask first stops look old and uncessary i think we can remove" |
| "Test against multiple stack types" | Removed | `always-rules`: align |
| "Push to feature branches after each commit"; "Open a PR when all specs in a feature are complete" | "Push after each accepted spec. Open one PR when no spec of the queue can start." | `always-rules`: align |
| "Show Max every document … an HTML artifact for anything else" | Removed; the managed block covers it | `always-rules`: align |
| dangerous-assumptions row "Absolute paths are fine in templates" | Removed (copy of the AGENTS.md rule) | `old-material`: delete |
| — | No hold added | `holds`: none |

Kept without being named: the release stop, every NEVER rule (reworded only as above), the `update` backup exception word for word. Nothing was put back.

Note: with the ASK FIRST lines gone, nothing in `AGENTS.md` asks before a merge to main, and a merge publishes. `.claude/settings.json` still denies force-push, `reset --hard` and pushing to main.

## Changed files

- `AGENTS.md`: rewritten for 1.8.0 (970 → 727 words; the managed block is about 200 of them). Map split into guides and records; rows for `anchors.md`, the Fable profile and the payload `artifacts.md` dropped.
- `docs/context/`: false and 0.7 lines removed from institutional-knowledge and dangerous-assumptions; decision-log table repaired (its separator was 57 lines down) with `type: log` and five rows for this pass; `shipped.md` `type: log`; `anchors.md` and the Fable profile `type: history`; architecture and production-map corrected.
- `docs/backlog/2026-11-20-canonical-entry-file-follow-ups.md`: new.
- Archive fix: `payload/.joycraft/runtime/archive.mjs` (a merge that keeps a parent's brief needs no amendment), `payload/.joycraft/references/archive.md`, `payload/PIN`, `tests/runtime-archive-merge-amendment.test.ts`, `docs/bugfixes/archive/`, `CHANGELOG.md` (Unreleased entry; no version change).
- This repo's install: updated to 1.8.0, then refreshed from the local build for the archive fix.

## Archive mappings

- `docs/features/2026-11-17-canonical-entry-file` → `docs/archive/2026-11-17-canonical-entry-file/feature` (with `brief-amendments.json` for commit 1438911).
- `docs/features/2026-11-21-testing-overhaul` → `docs/archive/2026-11-21-testing-overhaul/feature` (queue written; legacy acceptance with your answer and its limits).

## Worktrees

Removed: `joycraft-1.2.2`, `joycraft-archive-dated-folder`, `joycraft-backlog-archive`, `joycraft-canonical-entry-file`, `joycraft-claude-pages` (branches kept). Kept: `joycraft-code-mode` (PR #103), `joycraft-session-end` (PR #95).

## Left, with reasons

- The archive fix ships only with a release; the version, `joycraft.release`, summary and `src/joycraft-release.json` change together, and a merge publishes.
- "Session end runs automatically after a queue and prunes finished worktrees" is recorded as your decision, not built; it changes the implement and session-end skills.
- About 60 old feature folders and 18 queues without `schemaVersion` remain: archive work, not docs.
- `src/bundled-files.ts` is an ignored 0.7 leftover on disk; safe to delete locally.
- `institutional-knowledge.md`'s `gh pr edit` claim was not checked (it needs a PR edit).
