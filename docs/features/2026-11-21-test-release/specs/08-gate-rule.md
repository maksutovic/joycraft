---
id: 8
status: done
---
# cleanup flags an owner rule line that names the gate

Parent: [brief](../brief.md), section `owner-gate-lines`. All 13 decisions are answered; they are quoted by ID.

Brief `owner-gate-lines`: "`cleanup.mjs` flags a rule line outside the Commands table that names the gate ('every step must pass `pnpm verify`')." Done when: an AGENTS.md line "Run `pnpm verify` after every change" gives one finding, and the Commands table row does not.

## acceptance

- With `tests.gate: pnpm verify` recorded, an `AGENTS.md` or `CLAUDE.md` line outside a Markdown table that names the gate or full command gives one `gate-rule` finding with path, line and the command. Check: a fixture `AGENTS.md` with "Run `pnpm verify` after every change." gives exactly one finding.
- A table row naming the command (the Commands table) gives no finding, and a project with no recorded gate gets no `gate-rule` check. Check: the same fixture's `| Project gate | pnpm verify |` row gives no finding; the fixture without `tests:` gives none.
- `gate-rule` is listed by `cleanup.mjs --checks` as a `report` check. Check: `pnpm test tests/runtime-cleanup-checks.test.ts` passes with the new id in `checkList`.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/cleanup.mjs`, `tests/runtime-cleanup-gate-rule.test.ts`.
- Tests: `tests/runtime-cleanup-gate-rule.test.ts`, `tests/runtime-cleanup-checks.test.ts`. Tag each new test `[AC:spec-8-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Match a whole command as spec 4 does: a longer command with a file filter is not the gate.
- The rewrite offer (skill text) and the update notice are spec 16.
