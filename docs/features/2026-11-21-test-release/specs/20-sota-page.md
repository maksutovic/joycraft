---
id: 20
status: done
---
# Setup writes a project-owned testing page from a shipped on-demand template

Parent: [brief](../brief.md), sections `sota-page`, `load-guidance`. All 13 decisions are answered; they are quoted by ID.

Decision `sota-knowledge-home` (custom; Max's note): a new project from day one, or an existing one after the test cleanup, "would instantly gain the SOTA research", and the guidance must "be a part of the context map". Brief `sota-page`: setup, or the test review, writes a short project-owned testing page behind a narrow map row ("a test run is slow or flaky"); it carries about nine strong principles as the project's own decisions, in the project's stack; shipped playbook text is read on demand only, within `cap-raise` = `split-cap`.

## acceptance

- A new on-demand reference `.joycraft/references/testing-page.md` holds the page template and nine numbered principles, each written as a decision the project fills in for its stack: (1) record focused, gate and full commands; (2) every spec names its own tests, never the gate; (3) cap workers per run when agents share the machine, keyed on `JOYCRAFT_EVIDENCE`, never `CI`; (4) no real time or fixed waits; (5) each test owns its temporary folder, port and database; (6) time is reported, never a gate; (7) assertions come from the spec, written before reading the code; (8) extend the existing test file before adding one; (9) run the full suite only on the integrated revision. It adds the load order (run less, cap workers, then a slot) and the benefit (fewer slow and flaky reruns). Check: `tests/text-sota-page.test.ts` finds nine numbered principles and the load order.
- The page names no test runner. **Open-input rule:** check set = the runner and tool names listed in `tests/text-sota-page.test.ts` (vitest, jest, mocha, pytest, unittest, go test, cargo test, rspec, minitest, junit, gradle, maven, phpunit, playwright, cypress, xctest); the costlier error is a runner name that ships; threshold 0 matches. Check: the test finds none of them in the file, case-insensitive.
- `setup.md` writes the project's page (default `<context>/testing.md`) from the template in the attended setup, with the map row "A test run is slow or flaky"; `testing-review.md` writes it at the end of a test review when it is missing. The payload guard lists `testing-page.md` as on-demand. Check: the test finds `testing-page.md` and the row text in setup.md and testing-review.md, and `pnpm test tests/payload-guard.test.ts` passes with the new file in the on-demand list.

## Test changes

- `tests/payload-guard.test.ts` — class 1 (spec-mandated) — the third acceptance bullet: the on-demand list gains `testing-page.md`.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/testing-page.md`, `payload/.joycraft/references/setup.md`, `payload/.joycraft/references/testing-review.md`, `tests/payload-guard.test.ts`, `tests/text-sota-page.test.ts`.
- Tests: `tests/text-sota-page.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-20-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Every-spec words do not change in this spec: all its text is on demand.
- Ruling section 3 kills the always-read 12-slot page and per-runner catalogs; this page is read only by setup and the test review, and the project page it writes is reached through one narrow map row.
- Detail for the principles: the panel record's `sota-playbook.md` section 2.1 and the sota-evidence seat's nine items (outside the repository; the brief is the authority).
