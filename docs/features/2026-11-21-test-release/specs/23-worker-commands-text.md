---
id: 23
status: done
---
# Agent files name the forbidden shell forms and point to the printed commands

Parent: [brief](../brief.md), section `worker-commands`. All 13 decisions are answered; they are quoted by ID.

Brief `worker-commands`: isolation refusals come from Claude Code's guard; the guard stays; "the agent files name heredoc, `source` and `cd` out as forbidden forms"; startup prints the worker's commands (spec 5); a project-owned environment map (spec 12).

## acceptance

- `joycraft-implementer.md:15-18` and `joycraft-reviewer.md:51-53` add heredoc, `source` and `cd` out of the root to the forms they never use, and say to paste the startup output's `commands`. `dispatch.md:77-81` says the same once. Check: `tests/text-worker-commands.test.ts` finds "heredoc", `source` and `commands` in the three files.
- `setup.md` (attended) says the machine-local `.joycraft/local/evidence-env.json` is where a runner's worker variable goes when the runner config cannot hold a cap, never a tracked file. Check: the test finds `evidence-env.json` in setup.md.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 6 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 6 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.claude/agents/joycraft-implementer.md`, `payload/.claude/agents/joycraft-reviewer.md`, `payload/.joycraft/references/dispatch.md`, `payload/.joycraft/references/setup.md`, `tests/text-worker-commands.test.ts`.
- Tests: `tests/text-worker-commands.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-23-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
