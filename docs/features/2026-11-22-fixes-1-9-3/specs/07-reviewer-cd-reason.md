---
id: 7
status: todo
---
# The reviewer agent and dispatch.md give the reason for the cd form

Parent: [brief](../brief.md), section `followups-1-10-3`. Review follow-ups: spec 2 `f2`, spec 4 `f1`.

## acceptance

- Reason given: `payload/.claude/agents/joycraft-reviewer.md` follows `cd <worker-root> && <one command>` with the implementer agent's reason: no worktree isolation is active, so this is the one allowed compound form. `payload/.joycraft/references/dispatch.md`'s plain-command paragraph names the same form, for a worker whose task names another root, with the same reason. The every-spec word guard in `tests/payload-guard.test.ts` still passes. Check: `tests/text-worker-commands.test.ts` `[AC:spec-7-1]`.

## Test changes

- `tests/text-worker-commands.test.ts` class 1: the acceptance bullet adds one test.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one. The other harnesses' agent files.

## Implementation and verification scope

- Files: `payload/.claude/agents/joycraft-reviewer.md`, `payload/.joycraft/references/dispatch.md`, `tests/text-worker-commands.test.ts`.
- Tests: `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`. Run the recorded gate once, before review.
