---
id: 7
status: todo
---
# Delivery needs a green gate receipt, and the coordinator plans gate runs and finds the owning spec

Parent: [brief](../brief.md), section `wave-gate`. All 13 decisions are answered; they are quoted by ID.

Brief `wave-gate`: the coordinator runs the gate alone on the integrated revision, and `delivery.mjs` refuses a push without a green gate receipt. On red, the spec whose inputs hold the failing file gets the fix round; otherwise bisect only the failing file, newest commit first; a second red holds the push. Decision `wave-gate-default` = `per-wave-if-slow`. Done when: a two-wave fixture queue runs the gate twice in total, and a red gate that names a file in spec 3's inputs reopens spec 3 only.

## acceptance

- When `tests.gate` is recorded, `delivery.mjs push` needs `--gate-receipt <receipt.log>` and refuses the push (exit 1, nothing pushed) unless the receipt footer (spec 3) shows the recorded gate command, `exitCode: 0`, `dirty: false` and a `revision` equal to the HEAD being pushed. Each refusal has its own code: `gate-receipt-required`, `gate-receipt-not-gate`, `gate-receipt-red`, `gate-receipt-stale`. Check: four fixtures against a bare local remote; the remote ref does not move.
- A green gate receipt on HEAD pushes without running a second verifier; a project with no `tests.gate` keeps today's `-- <verifier>` behavior. Check: one fixture pushes and the remote ref equals HEAD; the existing delivery tests still pass.
- `coordinator.mjs gate-plan --queue <q>` prints the waves of unfinished specs (dependency levels) and the gate points: one per wave when `tests.gateRuns` is `wave`, one per spec when it is `spec`. Check: a two-wave fixture queue gives 2 gate points with `wave` and 3 with `spec` (a queue of 3 specs).
- `coordinator.mjs gate-owner --queue <q> --file <path>` (repeatable) prints the specs whose verification inputs hold each failing file, or `bisect` with the file when none does. Check: a fixture where `tests/c.test.ts` is a check input of spec 3 only prints `[3]`; an unlisted file prints `bisect`.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/delivery.mjs`, `payload/.joycraft/runtime/coordinator.mjs`, `tests/runtime-wave-gate.test.ts`.
- Tests: `tests/runtime-wave-gate.test.ts`, `tests/runtime-delivery-lock.test.ts`. Tag each new test `[AC:spec-7-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Reading the receipt footer: parse the last line of the file as `joycraft-evidence: <JSON>`; a receipt without one is `gate-receipt-not-gate`.
- The coordinator text that uses these (run the gate alone at each gate point, the red-gate flow, the reviewer verdict line) is spec 15.
