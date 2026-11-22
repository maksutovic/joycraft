---
id: 15
status: todo
---
# The coordinator runs the gate at gate points, and CI is read once on the PR

Parent: [brief](../brief.md), sections `wave-gate`, `ci-once`. All 13 decisions are answered; they are quoted by ID.

Brief `wave-gate` (with `wave-gate-default` = `per-wave-if-slow`) and brief `ci-once`: "`joycraft-implement` changes 'read CI after each push' to 'read CI once, on the PR, after session end's push'." Decision `session-end-push-order` = `commit-then-push`: one push, one CI run.

## acceptance

- `joycraft-implement/SKILL.md:116-123` says: workers run focused tests only; the coordinator runs the recorded gate alone at each point `coordinator.mjs gate-plan` prints, through `evidence.mjs`; no push without a green gate receipt (`delivery.mjs push --gate-receipt`); on red, `coordinator.mjs gate-owner` picks the spec that gets the fix round, else bisect only the failing file newest commit first; a second red holds the push. Check: `tests/text-wave-gate.test.ts` finds `gate-plan`, `gate-owner` and `--gate-receipt` in the skill.
- The same paragraph replaces "read CI after each push" with: read CI once, on the PR, after session end's push; after a second red CI run, stop and report. Check: the test finds no "read CI after each push" and finds "once, on the PR".
- In wave mode the reviewer verdict states "gate not run; due at wave end" (`joycraft-verify`), and `testing.md`'s project-gate tier names `tests.gateRuns`. Check: the test finds the quoted phrase in the verify skill and `gateRuns` in testing.md.
- The implement skill does not grow, and every-spec words grow by at most 10 in this spec. Check: `pnpm test tests/payload-guard.test.ts` passes; the implement skill's `wc -w` is not above its count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.agents/skills/joycraft-implement/SKILL.md`, `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/.joycraft/references/testing.md`, `payload/.joycraft/references/delivery.md`, `tests/text-wave-gate.test.ts`.
- Tests: `tests/text-wave-gate.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-15-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- The default stays per spec (`gateRuns: spec`): a solo user with one fast gate keeps knowing which spec broke it (the design-99 dissent behind `per-wave-if-slow`).
- A project's own `AGENTS.md` push rule still wins ("Unless `AGENTS.md` says otherwise").
