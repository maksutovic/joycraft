---
status: done
owner: Maximilian Maksutovic
created: 2026-08-11
feature: 2026-08-11-ste-human-output
mode: checkpoint
---

# Add STE Lint CI Test — Atomic Spec

> **Parent Brief:** `docs/features/2026-08-11-ste-human-output/brief.md`
> **Status:** Ready
> **Date:** 2026-08-11
> **Estimated scope:** 1 session / 2-4 files / ~120 lines

---

## What

Add `tests/ste-lint.test.ts`, a vitest file that shells to `python3 scripts/ste-lint.py`. It does two things: (a) runs the linter's `--self-test` and asserts exit 0, and (b) lints this repo's shipped human-facing template prose — the normative sections of `src/templates/reference/output-style.md` and the slot-guidance prose of `src/templates/REVIEW_GATE_TEMPLATE.html` — and asserts zero violations in the fix-to-zero classes (contractions, semicolons, banned modals, Latin abbreviations, slop words). Advisory classes (sentence length, synonym rotation) are reported, never failed on. When `python3` is absent, the test skips with a legible message instead of dying on a spawn error. If the shipped prose trips a fix-to-zero class, this spec fixes the prose — and therefore regenerates the bundle and syncs the installed copy in its own commit.

## Why

Without the machine check, the STE contract is prose-only — the exact under-delivery the 2026-07-27 escalation clause fired on; this test is the deterministic half of the feature.

## Acceptance Criteria

- [ ] `tests/ste-lint.test.ts` runs `python3 scripts/ste-lint.py --self-test` and asserts exit 0 [src: design §2.4]
- [ ] The test lints the shipped human-facing template prose (output-style.md normative prose, gate template slot guidance) [src: design §2.4]
- [ ] Zero violations in the fix-to-zero classes fail the test; advisory classes never fail it [src: D3]
- [ ] Shipped template prose passes with 0 fix-to-zero violations [src: brief "Success criteria"]
- [ ] When python3 is absent, the test skips with a legible message [src: design §2.4]
- [ ] Any prose fixes ship with bundle regen + installed-copy sync in the same commit [src: design §3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Self-test wired | `ste-lint.test.ts` asserts `--self-test` exit 0 | integration |
| Prose linted to zero | assert fix-to-zero violation count === 0 for each governed template file | integration |
| Advisory never fails | advisory counts logged/ignored; force a long sentence in a fixture string and assert no failure | unit |
| python3-absent skip | mock/spawn-miss path returns a skip (use vitest `it.skipIf` on a python3 probe) | unit |
| Suite + build green | `pnpm test` and `pnpm typecheck` | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/ste-lint.test.ts`

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST shell to the vendored `scripts/ste-lint.py` — no reimplementation of the rules in TypeScript [src: D2]
- MUST split classes exactly per D3: fail on contractions, semicolons, banned modals, Latin abbreviations, slop words; advise on sentence length and synonym rotation [src: D3]
- MUST lint only shipped human-facing template prose — agent-facing docs and skill bodies stay out of scope [src: D2]
- MUST skip legibly when python3 is absent — never an opaque spawn error [src: design §2.4]
- MUST regenerate the bundle and sync the installed copy in the same commit as any template prose fix [src: design §3]
- MUST NOT wire the linter into user-facing paths, hooks, or harden surfaces [src: D2]
- MUST NOT treat the Worked Example's "before" sample as governed prose — it demonstrates failure on purpose [src: brief "What ships"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `tests/ste-lint.test.ts` | Self-test + prose lint assertions, python3 probe/skip, class split |
| Maybe modify | `src/templates/reference/output-style.md` | Only if its prose trips a fix-to-zero class |
| Maybe modify | `src/templates/REVIEW_GATE_TEMPLATE.html` | Only if slot-guidance prose trips a fix-to-zero class |
| Maybe regenerate | `src/bundled-files.ts` + `docs/templates/**` installed copies | Only when template prose changed |

## Approach

Follow the `execFileSync` + result-wrapping `run()` pattern from `tests/status-scripts.test.ts:26-37`. Probe for python3 once (`execFileSync('python3', ['--version'])` in a try/catch) and gate the suite with `describe.skipIf` plus a message naming the missing binary. Extract governed prose before linting: for the HTML template, lint only the slot-comment guidance text; for the style doc, exclude the Worked Example's before-sample. Parse the linter's per-class counts and assert the fix-to-zero subset is zero. Rejected alternative: a TypeScript port of the regex rules — it forks the vendored source and the two copies drift.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| python3 present but wrong version for the script | Self-test assertion fails with the script's own error output attached — actionable, not opaque |
| Linter output format differs from expected parse shape | Test fails loudly on parse, with raw output in the message; do not silently pass on unparseable output |
| Governed prose legitimately needs a banned word (quoted example of what NOT to write) | Carve the quote out of the linted text the same way the before-sample is carved out; the carve-out list lives in the test, visible |
| CI image drops python3 in the future | The skip path keeps the suite green and prints the skip reason; the lint guarantee silently narrows — acceptable per the skip decision (design §2.4) |
