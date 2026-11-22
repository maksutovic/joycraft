---
id: 3
status: in-review
---
# Every evidence run sets JOYCRAFT_EVIDENCE and records its run facts

Parent: [brief](../brief.md), section `evidence-marker`. All 13 decisions are answered; they are quoted by ID.

Brief `evidence-marker`: keep `CI=1` (`evidence.mjs:236`) and add `JOYCRAFT_EVIDENCE=1`; each result carries wall time, 1-minute load at start and end, the core count, `loaded: true` when load is above the core count, and the failing tail of the output when the exit code is not 0. "These facts go in one receipt footer line, written before the hash."

## acceptance

- The child sees both `CI=1` and `JOYCRAFT_EVIDENCE=1`. Check: a fixture command `node -e "console.log(process.env.CI, process.env.JOYCRAFT_EVIDENCE)"` run through `evidence.mjs run` writes `1 1` to the receipt.
- The printed result adds `facts`: `wallMs`, `load: [start, end]` (1-minute load average), `cores`, and `loaded` (true when the start load is above `cores`). Check: the fixture run's JSON has all five, with `cores` equal to `os.availableParallelism()` in the test.
- The receipt ends with one footer line `joycraft-evidence: <JSON>` holding the same facts plus `argv`, `exitCode` and the `revision` commit and `dirty` flag, appended after the child exits and before the hash, so the printed `sha256` covers it. Check: the last line of the receipt parses as that JSON and the printed `sha256` equals the hash of the whole file.
- When the exit code is not 0 (or the run timed out), the printed result adds `tail`: the last 40 lines of the receipt before the footer. A passing run has no `tail`. Check: a fixture that prints 100 lines and exits 3 gives a 40-line `tail` ending with its last output line; the passing fixture has none.
- Nothing else changes: no new file per run, exit codes 0/1/2 as before, the existing `[AC:vendored-open-issues]` test still passes. Check: `pnpm test tests/payload-guard.test.ts tests/runtime-evidence-receipt.test.ts` passes and the fixture project holds only the one receipt.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/evidence.mjs`, `tests/runtime-evidence-facts.test.ts`.
- Tests: `tests/runtime-evidence-facts.test.ts`, `tests/runtime-evidence-receipt.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-3-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Load comes from `os.loadavg()[0]`; on Windows it is `[0, 0, 0]`, so report `load: null` and `loaded: null` there rather than a false number.
- Time is a fact, never a gate: no field may fail a run.
- The `testing.md:38` marker sentence is text and belongs to spec 19.
