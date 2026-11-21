---
status: backlog
owner: Maximilian Maksutovic
created: 2026-11-20
priority: later
---

# Canonical entry file: open follow-ups after the 1.6.0 override

## Decision

The owner chose to backlog these on 2026-11-20 (decision `cef-followups`, answer `backlog-plus-fix`, in `docs/features/2026-11-20-docs-cleanup/brief.md`). The archive bug was fixed in that session; everything else waits here. The archived reports are in `docs/archive/2026-11-17-canonical-entry-file/feature/reviews/`.

## Settled, not open

Spec 11's blocking finding (`hold-home-not-only-the-entry-file`): the shipped cleanup reference keeps its text. A general hold is one rule in `AGENTS.md`; a hold about one item lives on its guide. The brief's "stays in the entry file" is the older wording.

## Spec 1 follow-ups

- `entry-check.mjs` with a `--root` that does not exist, or with no `AGENTS.md` or `CLAUDE.md`, exits 0 with no output, also with `--ci`. A CI job with a wrong root passes silently.
- The linked-worktree test compares exit codes and gate findings, not the whole JSON of both trees.
- `trace.mjs` finds no tests for spec 1 in this repo: the queue binds no test file.
- The spec's scope section is older than the code (two gate checks named; five ship).

## Spec 11 follow-ups (cleanup reference and skill wording)

- The checks table lists 7 checks; `cleanup.mjs` emits 18 (`working-link`, `unmapped`, `orphan`, `managed-block` are named elsewhere but not in the table).
- The skill's hand-off asks for "the archive mappings"; no step produces them.
- "One agent by default" is only implied; the reference does not say how small a small set is.
- The size statement applies only above about 20,000 words; the skill says "a person", the check said "the owner".
- `setup.md` does not say that a record is an audit trail; only the reference does.
- The brief's "order of authority" has no counterpart in the reference.
- The session-end test title claims "the pass runs on a person request" but no assertion checks it.
- No test carries `[AC:payload-words-not-up]`.

## Three cuts never reviewed one by one

A per-project word baseline, a check for a nested `CLAUDE.md`, and a CI gate on rule text. Dropped under the direction "design for the usual entry file".
