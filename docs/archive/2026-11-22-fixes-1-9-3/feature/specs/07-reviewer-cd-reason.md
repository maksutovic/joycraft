---
id: 7
status: done
---
# dispatch.md gives the cd form with its reason

Parent: [brief](../brief.md), section `followups-1-10-3`. Review follow-ups: spec 2 `f2`.

## acceptance

- Reason given: `payload/.joycraft/references/dispatch.md`'s plain-command paragraph names `cd <worker-root> && <one command>`, for a worker whose task names a root that is not its shell's folder, with the implementer agent's reason: no worktree isolation is active, so this is the one allowed compound form. The every-spec word guard in `tests/payload-guard.test.ts` still passes. Check: `tests/text-worker-commands.test.ts` `[AC:spec-7-1]`.

## Test changes

- `tests/text-worker-commands.test.ts` class 1: the acceptance bullet adds one test.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one. The reviewer agent file: its text is pinned by the reviewer benchmark record (`[AC:sl3-07-bench-current]`), so it gets the reason the next time its text changes for a reason that justifies a benchmark run.

## Implementation and verification scope

- Files: `payload/.joycraft/references/dispatch.md`, `tests/text-worker-commands.test.ts`.
- Tests: `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`. Run the recorded gate once, before review.
