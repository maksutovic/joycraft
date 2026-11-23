---
id: 2
status: in-review
---
# Warn when a project agent type sets host worktree isolation

Parent: [brief](../brief.md), section `isolation-warning`.

## acceptance

- Warning: `worktrees.mjs create` returns `warnings` naming each `.claude/agents/*.md` of the coordinator's tree whose frontmatter has `isolation: worktree`, says a worker launched as it cannot use this tree, and names `joycraft-implementer` or `general-purpose` instead. The phrase in a file's body alone does not count; without such a file there is no `warnings` key. Check: `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-2-1]`.

## Test changes

- `tests/runtime-dispatch-parallel.test.ts` class 1: the acceptance bullet adds one test.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/worktrees.mjs` (`isolatedAgents`, `createWorktree`), `tests/runtime-dispatch-parallel.test.ts`.
- Tests: `tests/runtime-dispatch-parallel.test.ts`. Run the recorded gate once, before review.
