# Review follow-ups to settle before the 1.9.0 PR

Collected from independent reviews; none blocked its spec. A final polish spec takes the ones marked **fix**.

## Gate matching (specs 4, 6, 8) — fix
- Prose with more words is missed: "run pnpm verify before merging", "pnpm verify — then" (queue-check.mjs namesCommand). This is Max's core case.
- Fenced code inside a bullet is missed (queue-check.mjs:215).
- Wrapper forms pass check-report: `bash -lc`, `sh -c ... sh`, `zsh -c`, `/usr/bin/env bash -c`, `env CI=1 <gate>` (completion.mjs:122).
- A broken joycraft.yaml makes the report-gate check pass silently; fail closed (completion.mjs:129).
- gate-in-spec's next-step text says "ask the user"; it should say "use the spec's own test command" (queue-check.mjs:14).

## Evidence (spec 3, 7)
- delivery.mjs keeps its own footer parser; import evidence.mjs readFooter (delivery.mjs:110). **fix**
- Tail read is capped at 256 KiB and can start mid-line (evidence.mjs:222). **fix**

## Load line (spec 10)
- "(0 cores)" for a footer without cores; mixed core counts name the largest.

## Drift-tidy carry-overs
- `GIT_DIFF_OPTS` in the environment makes tidy --verify refuse a valid fix; unset it for rawDiff. **fix**
- checks seam: accept `file:line rule` (markdownlint-cli2), make absolute paths relative, docs tell users to pick a line output format. **fix**
- start advice: wrap the entry-check import in try; fix "this branch removed" wording on main. **fix**
- age-out: names with tab/quote get the wrong skip reason; Docs/docs case mismatch message.
- Config should refuse a hidden or root-level docs root (Max, 2026-11-21). **fix**
- archive ignore: symlinked .ignore, `docs/archive/*` equivalence, run from a subfolder. **fix**

## Fault runs (spec 9) — fix
- Install the SIGINT/SIGTERM/SIGHUP handlers before `git apply`, not after the spawn (evidence.mjs:316-334); a signal in that gap leaves the fault in place (1 of 63 early-SIGTERM runs).
- After the restore, also compare `git status --porcelain` and HEAD with their values from before the run, so a command that edits another file, commits or stashes cannot end with `restored: true` (evidence.mjs:260).
- Project root in a repository subfolder: resolve patch paths against `--show-prefix` and refuse paths outside it (evidence.mjs:253).

## SOTA testing page (spec 20) — fix
- Principles 1, 2 and 9 restate one idea (focused, gate, full). Fold them into one and use the freed slots for the best-evidenced missing ones: flaky means defective (never retry into a pass; repeat a new test file before it counts) and never special-case test inputs or edit the check that judges the change. Coordinator call: this serves Max's "flaky tests rerun over and over" note directly.
- Put the benefit line into the page itself, not only the template preamble.
- Name the project page so it cannot be confused with `.joycraft/references/testing.md`.

## Env map (spec 12) — fix
- Validate names (non-empty, no `=`, no NUL in values) and name the map file in the error; compare CI/JOYCRAFT_EVIDENCE case-insensitively; refuse a map that is untracked but not ignored (`git check-ignore`).

## Owner gate lines (spec 16) — fix
- update.md:38 "When it reports `gate-rule`" should name `entry-check.mjs`.
- Setup should also offer the rewrite (a fresh install meets it only in an attended cleanup).
- A small runtime helper to record `cleanup.gateRule` in preferences.json (like `archive.mjs ignore --decline`) instead of hand-written JSON.

## Session end (spec 25) — fix
- Name the commit for every edit: the archive commit takes all archive edits (moves, relinked live docs, rewritten tests); cleanup's session-end fixes go in the records commit.
- Dirty tree: say gate messages, cleanup fixes and the lease release also wait.

## Startup commands (spec 5) — fix
- `expand()` recurses forever on a path containing the literal `{files}`; recurse only into the template text (dispatch-start.mjs:104).
- An unclosed quote in `tests.focused` should give a note, not exit 1.
- The startup evidence step appends `focused.command`; a focused command with shell syntax (`&&`) then runs under the caller's shell, not under evidence. Use the shell form for it, as delivery requires for the gate (dispatch-start.mjs:123).

## Gate receipt (spec 7) — fix
- Plain gate in shell form: refuse shell syntax (newline, `;`) in the line too, or split only on spaces/tabs (delivery.mjs:125).
- Refuse a shell path inside the project, and Windows-form paths on POSIX (delivery.mjs:113). State the symlinked-shell case beside the forged-footer limit.

## Tier text (spec 14) — fix
- joycraft-verify:51 "the packet's `commands.focused`" → "the startup output's `commands.focused`".
- gate-in-spec checks only acceptance bullets; the scope section can still name the gate (queue-check.mjs:334).
- Joycraft's own AGENTS.md "Run `pnpm test && pnpm typecheck` before committing" runs the gate on every commit: Max's call through the spec 16 gate-rule offer.
- tests/text-worker-commands.test.ts:35 hard-codes pre-spec word counts; rebase it on the guard after acceptance (spec 23 review).

## Changed-test list (spec 11) — fix
- A declaration of either path of a git rename covers both (test-changes.mjs:123); needed before spec 17's reviewers block on undeclared changes.
- Limit `*Test`/`*Spec`/camelCase `*Test` folder rules to known test source sets (abTest/, ProductSpec.kt, LoadTest.java count today).
- A removed gitlink under a tests folder is listed as a test; check the base object is a blob.

## Word guard — fix
- `[AC:spec-1-3]` adds 600 words to testing-review.md and expects a pass; on-demand spare is ~665 and falling. Make it add `min(600, spare)` so later legitimate growth cannot fail it.
- Per-spec word-growth tests with hard-coded constants (specs 14, 15, 17, 23) will break on later legitimate growth; retire them once the feature is accepted, leaving the guard's two caps.

## Gate receipt vs session end (spec 15 review) — fix, important
- Session end's records, tidy and archive commits come after the last green gate, so delivery refuses the push as stale. testing.md already says records-only commits need no test run: delivery should accept a receipt whose revision is an ancestor of HEAD when every path changed since is under the docs root (paths.features/archive/context common parent); any other path (an archive `--rewrite` of a test) needs the gate again.
- Two places open the PR: implement ("open one PR when no spec can start") and session end ("one push that opens the PR"). Implement should leave PR opening to session end.
- Without `tests.gate`, delivery needs `-- <verifier>`; implement text should say so. delivery.md should say receipts must be git-ignored or in a feature folder.

## Declarations (spec 17) — fix
- test-changes.mjs: require the base to be an ancestor of HEAD (`git merge-base --is-ancestor`).
- Flag a base declaration whose requiring text was rewritten after the base.

## Load guidance (spec 19) — fix
- setup.md Machine load: the cap is "computed from the core count at run time, never this machine's number" (brief rule).
- status.mjs load line: add a few words on why (overload makes slow, flaky runs that agents rerun) per Max's note.
- testing.md:48: say where the second run comes from now that "rerun once, alone" is gone.

## Fault proof (spec 18 r2) — fix
- The reviewer checks each receipt's patch sha256 against the list committed before the test edit, checks the list has one fault per removed or changed assertion, and aims its own fault at a removed assertion with no replacement (testing-review.md:104-106).

## After spec 28 — for spec 29
- Pin the 12 EVERY_SPEC_FILES paths in the guard so moving a file to on-demand fails a test (spec 28 review f3).
- text-sota-page: assert the cap keys on JOYCRAFT_EVIDENCE never CI and "never a fixed delay" (f4); decision 8 says "new and changed" test files (f5).

## After spec 31 — for spec 29
- Chained gates are missed: "pnpm verify && pnpm lint", "pnpm verify | tee log" (queue-check.mjs:262); let `&&`, `||`, `|`, `2>&1` end the command.
- Update the doc comment at queue-check.mjs:231 (hyphen rule changed).
- Reviewer guidance: save probe scripts with a `.txt` suffix (e.g. `.mjs.txt`) so archiving a feature after the gate does not need another gate run; delivery.md names the record extensions.

## Spec 30 review (PASS, round 1)
- f2: archive.mjs namesFolder misses `../docs/features/<dated>/`, `${root}/docs/features/<dated>/` and `features/<dated>/` spellings. Allow a match after `}/` or `../` (keep `packages/app/...` out). Moved to spec 32.
- f6: movedMeanwhile message (archive.mjs ~557) blames "another archive --apply" even when the folder was deleted by hand. Reword. Moved to spec 32.
- f1/f5: spec Test changes should name the two kept-test edits; test file `let output = null` could be `: any`.

## Spec 24 review (PASS, round 1)
- f3: archive.md:204 lacks ruling §4 steps: a listed test needing more than a path change → do not archive that feature, write one line; paired non-test fixture repoint (§4.3); listed non-test non-migration files have no instruction.
- f4: archive.md:206 has no fallback when no gate is recorded (ruling: run the tests it changed).
- f5: tests/text-archive-tests.test.ts:49 redundant split/join.
- f6 (owner): kill criterion — drop the list if two archives in a row list only files nobody should edit.

## Spec 29 review (PASS, round 1)
- f1: archive.mjs docsRoot stops one folder short of cleanup.mjs's rule (context: docs → '.'). Moved to spec 32 bullet 5.
- f2: spec 29 Test changes should have listed the [review-9-r2-1] and [AC:spec-27-14] edits.
- f3: docs root '.' branches in cleanup.mjs (:533, :822) and delivery.mjs unsafe('.') are now unreachable guards.
- f4: shell-form detection misses lone `&`, `FOO=1` prefix, `$HOME`, `#`, and `$(`/backtick inside double quotes; a quoted `{files}` in a shell template double-quotes. Rare; left.
- f5: implement skill dropped "when available" in one sentence.
