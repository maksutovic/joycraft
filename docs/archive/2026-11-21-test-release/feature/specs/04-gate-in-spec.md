---
id: 4
status: done
---
# queue-check reports a spec whose acceptance names the gate

Parent: [brief](../brief.md), section `spec-tier`. All 13 decisions are answered; they are quoted by ID.

Brief `spec-tier`: "`queue-check.mjs` reports the gap `gate-in-spec` (exit 2) when a spec names the recorded gate or full command (Max: yes)." Done when: a spec whose acceptance names `pnpm verify` fails with `gate-in-spec`, and a spec naming `pnpm test tests/x.test.ts` passes.

## acceptance

- With `tests.gate: pnpm verify` recorded, an unfinished spec whose acceptance section names `pnpm verify` (in text or a code span) gives one `gate-in-spec` gap naming the spec, the line and the command, and queue-check exits 2. Check: a fixture queue in `tests/runtime-queue-check-gate.test.ts`.
- A command with more arguments than the gate is not the gate: with `tests.gate: "pnpm test && pnpm typecheck"`, an acceptance bullet naming `pnpm test tests/x.test.ts` gives no gap. The recorded `full` command is matched the same way. Check: two fixtures, one per command, give 0 gaps and 1 gap.
- Only the acceptance section counts: a gate named under "Implementation and verification scope" gives no gap, and a project with no `tests.gate` or `tests.full` gets no `gate-in-spec` check. A `done` spec is not checked. Check: three fixtures give 0 gaps.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/queue-check.mjs`, `tests/runtime-queue-check-gate.test.ts`.
- Tests: `tests/runtime-queue-check-gate.test.ts`. Tag each new test `[AC:spec-4-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Reuse `acceptanceBullets` for the section and compare whitespace-normalized command text; a match is the whole command, ended by the end of a code span, the end of the bullet text or punctuation, not by more arguments.
- Read `tests` through `readConfig` from spec 2; a broken `joycraft.yaml` is config.mjs's report, not a gap.
