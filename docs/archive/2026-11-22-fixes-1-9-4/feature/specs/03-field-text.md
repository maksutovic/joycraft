---
id: 3
status: done
---
# Field follow-up text

Parent: [brief](../brief.md), section `field-text`.

## acceptance

- Implement skill: the parallel sentence adds "an agent type without `isolation` frontmatter"; the `checkpoint` sentence reruns the spec's focused tests after any integration edit; one sentence says to run the printed `completion.mjs reopen` when `submit` warns about a done spec. The skill stays within its 1315-word limit (`tests/text-wave-gate.test.ts`). Check: `tests/text-worker-commands.test.ts` `[AC:spec-3-1]`.
- References: `completion.md` lists the `reopen` command and says what it does; `dispatch.md` says each reviewer startup gets a new report path that wins over any project naming rule; `update.md` says to update only between specs, while no implementer or reviewer runs. Every-spec words stay under 12,201, and on-demand text keeps 600 spare. Check: `[AC:spec-3-2]` and `tests/payload-guard.test.ts` unchanged.

## Test changes

- `tests/text-worker-commands.test.ts` class 1: acceptance bullet 1 changes the 1.9.3 `[AC:spec-2-1]` expectation of the parallel sentence to the new text, which now also names the agent-type frontmatter; bullets 1 and 2 add two tests.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.agents/skills/joycraft-implement/SKILL.md`, `payload/.joycraft/references/completion.md`, `payload/.joycraft/references/dispatch.md`, `payload/.joycraft/references/worktrees.md` (word cut only), `payload/.joycraft/references/update.md`, `tests/text-worker-commands.test.ts`.
- Tests: `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`, `tests/text-wave-gate.test.ts`. Run the recorded gate once, before review.
