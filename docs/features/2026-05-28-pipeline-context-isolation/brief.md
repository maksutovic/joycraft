# Pipeline Context Isolation Hardening — Feature Brief

> **Date:** 2026-05-28
> **Project:** joycraft
> **Status:** Specs Ready
> **Source:** `docs/features/2026-05-27-context-isolation-test/experiment-report.md`

---

## Vision

The context isolation test (`2026-05-27-context-isolation-test`) proved that the Joycraft pipeline does **not** enforce session boundaries. Three root causes were identified:

1. The `joycraft-implement` skill accepts directory inputs and processes all specs at once.
2. The `joycraft_next_spec` tool has an optional `spec_path` parameter, so the queue is often never updated.
3. The extension silently swallows `mark-done` errors, masking queue-update failures.

This feature hardens the pipeline so each spec is implemented in isolation, the queue is the source of truth, and failures are surfaced rather than hidden.

## User Stories

- As a harness user, I want the pipeline to enforce one-spec-per-session so context cannot leak between specs.
- As a project maintainer, I want the spec queue to accurately reflect completion state so I can trust `joycraft-spec-status`.
- As a developer, I want mark-done failures to be loud, not silently swallowed.

## Hard Constraints

- MUST: The `joycraft-implement` skill must reject directories and only accept a single `.md` spec file.
- MUST: The `joycraft_next_spec` tool must require `spec_path` (not optional).
- MUST: Mark-done failures must be reported to the agent, not swallowed in a `catch` block.
- MUST NOT: Break existing `/joycraft-next-spec` command behavior (it already does `ctx.newSession`).

## Out of Scope

- NOT: Changing how `ctx.newSession` works in pi — that is outside this codebase.
- NOT: Adding new pipeline stages (e.g., review, QA).

## Test Strategy

After these fixes land, re-run the `2026-05-27-context-isolation-test` feature:
1. Implement `secret-embed.md` → call `joycraft_next_spec` with `spec_path` → verify queue shows it complete.
2. The `/joycraft-next-spec` command starts a fresh session with `secret-recall.md`.
3. In the fresh session, the agent does not remember `KIWI` → returns `UNKNOWN` → test documents context isolation.

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | strict-implement-input | Reject directories / multi-spec in joycraft-implement skill | None | S |
| 2 | stateful-next-spec | Require `spec_path` and surface mark-done errors in extension | None | S |

## Execution Strategy

- [x] Parallel (no dependencies between specs; they touch different files)
