---
id: 28
status: todo
---
# Polish the text from the independent reviews' follow-ups, and retire the per-spec word tests

Parent: [brief](../brief.md). Source: [review follow-ups](../review-followups.md), the items marked **fix** that change payload text outside `testing-review.md`, `joycraft-implement/SKILL.md` and `joycraft-session-end/SKILL.md` (those are spec 29, because other open specs hold those files). All 13 decisions are answered; they are quoted by ID.

Decision `sota-knowledge-home` (Max's note) and the coordinator's call on the follow-ups: the page serves Max's "flaky tests rerun over and over" note directly. Owner instruction for the word tests (Max asked for less test bloat): "retire per-spec word constants; the guard caps stay".

## acceptance

- SOTA page principles [spec 20]: `testing-page.md` still holds nine numbered decisions. Decision 1 folds today's 1, 2 and 9 into one: the focused test while working, the gate once per spec, the full suite only on the integrated revision, and each spec names its own tests, never the gate. Decision 8 is new: **Flaky means defective**, never retry a test into a pass, and run a new test file `<n>` times before it counts. Decision 9 is new: **Never special-case a test**, never special-case a test's input in the code and never edit the check that judges the change. Workers, real time, resources, time reported, assertions from the spec and extend-before-adding keep their text as decisions 2 to 7. Check: `tests/text-sota-page.test.ts` finds the numbers 1 to 9 and these nine patterns in order: `/Focused: .* Gate, once per spec: .* Full suite.*only on the integrated revision.*never names the gate/`, `/cores ÷ agents workers/`, `/No real time/`, `/temporary folder.*port.*database/`, `/Time is reported, never a gate/`, `/from the spec, before reading the code/`, `/existing test file before creating a new file/`, `/Flaky means defective.*never retry.*before it counts/`, `/special-case.*the check that judges the change/`.
- The benefit line is in the page itself: the line "fewer slow and flaky reruns, so a queue spends its time on the work" sits inside the `markdown` block that setup copies, not only in the template preamble. Check: `tests/text-sota-page.test.ts` finds "fewer slow and flaky reruns" between the opening `markdown` fence and its closing fence.
- Gate-rule offer in setup and update [spec 16]: `setup.md` gets an attended step: when `node .joycraft/runtime/entry-check.mjs` reports `gate-rule` and `node .joycraft/runtime/cleanup.mjs gate-rule --check` prints `unset`, show the findings once with the before-and-after rewrite as one question, rewrite on a yes, and record the answer with `cleanup.mjs gate-rule --record rewritten` or `--record kept`. `update.md:38` reads "When `entry-check.mjs` reports `gate-rule` and `cleanup.mjs gate-rule --check` prints `unset`, show the findings once" and records the answer with the same helper, not with hand-written JSON. Check: `tests/text-owner-gate-lines.test.ts` finds "gate-rule --record" in `setup.md` and `update.md`, the quoted `update.md` sentence, and no "keeping the other keys" in `update.md`.
- Machine load in setup [spec 19]: the `setup.md` Machine load step says the cap is "computed from the core count at run time, never this machine's number" (brief rule). Check: `tests/text-lane-cap.test.ts` finds that phrase in `setup.md`.
- Verify names the startup output [spec 14]: `joycraft-verify/SKILL.md:51` reads "Take runtime evidence once from the spec's own tests (the startup output's `commands.focused`), never the project gate". Check: `tests/text-spec-tier.test.ts` `[AC:spec-14-2]` matches that sentence.
- The second run in `testing.md` [spec 19]: `testing.md:48` reads "When N workers share the machine, give each test run at most cores ÷ N workers with the runner's own flag. After a timeout, run the same command once more with that cap; a second timeout is reported with both receipts." Check: `tests/text-lane-cap.test.ts` `[AC:spec-19-1]` finds that text.
- Delivery receipts [spec 7, spec 15 review]: `delivery.md`'s gate receipt section says a receipt must be git-ignored or in a feature folder (as `evidence.mjs` enforces), and that a receipt on an earlier revision still counts when every path changed since is under the docs root (spec 27, bullet 14); any other changed path needs the gate again. Check: `tests/text-wave-gate.test.ts` finds "git-ignored or in a feature folder" and "under the docs root" in the installed `delivery.md`.
- Retire the per-spec word-growth tests: the tests with hard-coded word constants are removed, with their now-unused helpers and constants: `[AC:spec-14-5]` (`text-spec-tier`), `[AC:spec-15-4]` (`text-wave-gate`), `[AC:spec-23-3]` (`text-worker-commands`), `[AC:spec-17-4]` (`text-test-changes`), `[AC:spec-22-4]` (`text-fewer-tests`), `[AC:spec-18-4]` (`text-fault-proof`) and `[AC:spec-19-4]` (`text-lane-cap`). The guard's two caps (`[AC:spec-1-2]`, `[AC:spec-1-3]`) stay. Check: `rg` finds none of the seven tags under `tests/`; `pnpm test tests/payload-guard.test.ts` passes and prints both counts; `pnpm typecheck` reports no unused name in the seven files.
- Words: every-spec words grow by at most 12 in this spec (the verify and `testing.md` sentences); on-demand files stay inside their cap. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 12 above the count before this spec.

## Test changes

Ledger row (one batch, class 3): seven per-spec word-growth tests retired, each with a hard-coded word constant that later legitimate growth breaks; the guard's two caps keep the same protection. Owner yes: "retire per-spec word constants; the guard caps stay" (owner instruction, relayed by the coordinator, 2026-11-21).

- `tests/text-spec-tier.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-14-5]` (ledger row above); acceptance bullet 5 also states the new verify sentence for `[AC:spec-14-2]`.
- `tests/text-wave-gate.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-15-4]` (ledger row above); acceptance bullet 7 also adds the two `delivery.md` phrases.
- `tests/text-worker-commands.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-23-3]` (ledger row above).
- `tests/text-test-changes.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-17-4]` (ledger row above).
- `tests/text-fewer-tests.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-22-4]` (ledger row above).
- `tests/text-fault-proof.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-18-4]` (ledger row above).
- `tests/text-lane-cap.test.ts` class 3: acceptance bullet 8 removes `[AC:spec-19-4]` (ledger row above); acceptance bullet 6 also states the new `testing.md` sentence for `[AC:spec-19-1]`, and bullet 4 adds the `setup.md` phrase.
- `tests/text-sota-page.test.ts` class 1: acceptance bullets 1 and 2 state the new principle patterns and the benefit-line place for `[AC:spec-20-1]`.
- `tests/text-owner-gate-lines.test.ts` class 1: acceptance bullet 3 states the new `update.md` sentence and the helper for `[AC:spec-16-2]`.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

- The new name for the project testing page, the implement skill's PR and verifier lines, and the session-end commit lines: spec 29.
- Joycraft's own `AGENTS.md` gate line: Max's call through the gate-rule offer.
- The accepted reports of specs 14, 15, 17, 18, 19, 22 and 23 keep their receipts; removing a test does not reopen them.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/references/testing-page.md`, `payload/.joycraft/references/setup.md`, `payload/.joycraft/references/update.md`, `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/.joycraft/references/testing.md`, `payload/.joycraft/references/delivery.md`, and the nine test files under Test changes.
- Tests: the nine test files under Test changes and `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-28-<n>]`.
- Do not edit `payload/.joycraft/references/testing-review.md`, `payload/.agents/skills/joycraft-implement/SKILL.md` or `payload/.agents/skills/joycraft-session-end/SKILL.md`.
- Bullet 3 names the helper that spec 27 builds; bullet 7 names spec 27's delivery rule. The page keeps naming no test runner (`[AC:spec-20-2]`).
