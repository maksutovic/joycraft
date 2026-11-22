---
id: 7
status: done
---
# The payload guard pins the 12 every-spec paths

Parent: [brief](../brief.md), section `tests`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), section Tests (test-release/28/f3).

## acceptance

- Pinned list [test-release/28/f3]: the `[AC:spec-1-1]` test in the payload guard asserts that `Object.keys(EVERY_SPEC_FILES)`, sorted, equals a literal list of the 12 paths in the test (`.agents/skills/joycraft-implement/SKILL.md`, `.agents/skills/joycraft-verify/SKILL.md`, `.agents/skills/joycraft-decompose/SKILL.md`, `.agents/skills/joycraft-testing/SKILL.md`, `.claude/agents/joycraft-implementer.md`, `.claude/agents/joycraft-reviewer.md`, `.joycraft/references/testing.md`, `.joycraft/references/workflow.md`, `.joycraft/references/dispatch.md`, `.joycraft/references/completion.md`, `.joycraft/references/gates.md`, `.joycraft/references/worktrees.md`), so dropping or adding one fails the guard instead of moving its words to the on-demand budget. Check: `tests/payload-guard.test.ts` `[AC:spec-7-1]` (the same test also carries `[AC:spec-1-1]`) passes; with one path removed from `EVERY_SPEC_FILES` in a scratch edit, it fails (state the run in the report, then restore).
- Nothing else in the guard changes: the caps and the other tests pass unchanged, and the printed every-spec and on-demand counts equal the counts before this spec. Check: `tests/payload-guard.test.ts` `[AC:spec-7-2]` (tag the `[AC:spec-1-2]` test too) passes with the same printed counts.

## Test changes

- `tests/payload-guard.test.ts` class 1: acceptance bullet 1 adds the literal 12-path assertion and the `[AC:spec-7-1]` tag to the `[AC:spec-1-1]` test; acceptance bullet 2 adds the `[AC:spec-7-2]` tag to the `[AC:spec-1-2]` test title, with no assertion change.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- The caps and the split rule do not change.

## Implementation and verification scope

- Test-only spec: no product file changes. Run the recorded gate once, before review.
- Files: `tests/payload-guard.test.ts`.
- Tests: `tests/payload-guard.test.ts`. It is shared test tooling, so the spec runs in the serial lane.
