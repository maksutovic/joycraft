---
id: 2
status: in-review
---
# One worker home, one stage update

Parent: [brief](../brief.md), sections `one-home` and `one-update`.

## acceptance

- One home: `joycraft-implement` says every parallel mutator gets a `worktrees.mjs create` tree on every host, launched without the host's worktree isolation (in Claude Code, no `isolation` on the Agent call), with its `workerRoot` in the task. `worktrees.md` replaces the Claude native-isolation recipe (`isolation: "worktree"`, `worktree.baseRef`) with the same rule and says why in one line; `.worktreeinclude` and hook notes go with it. `dispatch.md` no longer describes an auto-created worktree whose path is unknown until launch. Check: `tests/text-worker-commands.test.ts` `[AC:spec-2-1]`.
- Worker root: the implementer agent says that when the task names a worker root that is not its shell's folder, it runs each command there as `cd <worker-root> && <one command>`, the one allowed compound form, because no worktree isolation is active; the existing forbidden-forms sentence stays. Check: `[AC:spec-2-2]`.
- One update: the implement skill's stage-update line says to give each update once and not to repeat before-dispatch text after the dispatch. Check: `[AC:spec-2-3]`.
- Words: every-spec words do not grow. Check: `tests/payload-guard.test.ts` passes, with only the change below `[AC:spec-2-4]`.

## Test changes

- `tests/text-worker-commands.test.ts` class 1: acceptance bullets 1 to 3 add text checks.
- `tests/payload-guard.test.ts` class 1: acceptance bullet 1 removes the `WorktreeCreate` hook note from `worktrees.md`, so `[AC:spec-1-4]` now expects `worktrees.md` not to name `WorktreeCreate` (it expected the note before).

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.agents/skills/joycraft-implement/SKILL.md`, `payload/.joycraft/references/worktrees.md`, `payload/.joycraft/references/dispatch.md`, `payload/.claude/agents/joycraft-implementer.md`, `payload/.joycraft/references/setup.md` (its native `.worktreeinclude` mention only), `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`.
- Tests: `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`. Run the recorded gate once, before review.
