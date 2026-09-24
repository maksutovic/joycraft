---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-24
source: docs/features/2026-09-23-opus-5-5-prompting/brief.md
---

# Unattended runs: bounded continuation when the standing instruction is not enough

The Opus 5.5 prompting guide pairs its standing instruction with a harness fix. When a one-shot or queue run ends a turn on text while checklist items are still open and no blocker is stated, the harness sends one short continuation message that names the open items. It stops after two or three continuations, so a stuck run ends and can be reviewed. The guide's example message: "Your task list still has open items: <items>. Continue with them. If one is blocked, say what is blocking it."

**Why deferred:** decision D2 of the parent feature ships the standing instruction alone. Later models already follow the spec queue well, so the human tests the instruction first.

**Start point, if testing shows early stops:**

- Pi loop: run implement with `pi --session-id <id>`, check that the spec reached a verified state before spec-done, and resume the same session with the continuation message, at most twice.
- Autofix: resume with `claude -p --resume` when the test suite still fails and no blocker was stated.
- Interactive implement-feature: a `Stop` hook recipe that reads `.joycraft-spec-queue.json`, blocks the stop with the continuation message while `todo` specs remain and no fail-fast was reported, and counts its own continuations.

The spec queue JSON is already the checklist the guide asks for.
