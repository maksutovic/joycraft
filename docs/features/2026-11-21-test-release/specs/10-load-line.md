---
id: 10
status: todo
---
# The session-end status prints one load line only when runs were loaded

Parent: [brief](../brief.md), section `load-guidance`. All 13 decisions are answered; they are quoted by ID.

Decision `machine-slot` = `project-owned`, with Max's note: Joycraft must explain the practice. Brief `load-guidance`: "Joycraft explains it when it happens, with a number. At queue end it prints one line, only when runs were `loaded`." No run ledger: the line reads receipts that already exist.

## acceptance

- `status.mjs` reads the `joycraft-evidence:` footer of each `.log` receipt in a feature folder and of each receipt the queue's reports cite, and when any started loaded, its output for that feature carries one `load` line: "<n> of <m> test runs started above the core count (<cores> cores). Cap workers per run with the runner's own flag; see setup." Check: a fixture feature with 3 receipts, 2 of them `loaded: true`, gives "2 of 3 test runs started above the core count".
- No loaded run, or no receipts with a footer, gives no `load` line and no other change. Check: a fixture with only `loaded: false` receipts and one with old receipts without a footer print no `load` field.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/status.mjs`, `tests/runtime-status-load.test.ts`.
- Tests: `tests/runtime-status-load.test.ts`. Tag each new test `[AC:spec-10-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Read receipts only; write nothing. Count each receipt once even when two reports cite it.
- The attended setup explanation (run less, then cap workers per run, then a slot) is spec 19.
