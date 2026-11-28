---
id: 6
status: in-review
---
# The isolation warning reads all of .claude/agents and skips directories

Parent: [brief](../brief.md), section `followups-1-10-3`. Review follow-ups: spec 2 `f1`, `f2`.

## acceptance

- Directory entry: with a directory named `team.md` under `.claude/agents`, `isolatedAgents` does not throw and `worktrees.mjs create` succeeds; an `isolation: worktree` agent file beside it is still named in `warnings`. Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-6-1]`.
- Subfolders: Claude Code scans `.claude/agents/` recursively, so an `isolation: worktree` file in a subfolder, such as `.claude/agents/team/reviewer.md`, is named in `warnings` by that project-relative path. Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-6-1]`.

## Test changes

- `tests/runtime-dispatch-parallel.test.ts` class 1: the acceptance bullets add one test.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/worktrees.mjs` (`isolatedAgents`), `tests/runtime-dispatch-parallel.test.ts`.
- Tests: `tests/runtime-dispatch-parallel.test.ts`. Run the recorded gate once, before review.
