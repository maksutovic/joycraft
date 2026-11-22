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
