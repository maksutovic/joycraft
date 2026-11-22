---
id: 3
status: in-review
---
# Cleanup skips backlog files in new-doc, ages quoted names, names a case mismatch, catches a piped missing tool, and finds the root from a subfolder

Parent: [brief](../brief.md), section `cleanup`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), section Cleanup and tidy (drift-tidy/2/f4, 9/r3-f1, 9/r3-f2, 10/f5, 10/f6).

## acceptance

- Backlog file [drift-tidy/2/f4]: `new-doc` skips an added Markdown file under the docs root when a folder on its path is `backlog` or its name starts with `backlog` (any case), the same rule as age-out's `working`. One helper serves both. A new `docs/backlog.md` and `docs/Backlog-2026.md` give no `new-doc` finding; a new `docs/guides/x.md` still does. Check: `tests/runtime-cleanup-tidy.test.ts` `[AC:spec-3-1]`.
- Quoted names [drift-tidy/9/r3-f1]: age-out reads `git log` with `-z`, so a doc whose name holds a tab or a double quote, last committed 20 days ago, is listed with `days: 20`, not skipped with "Git shows no commit for it". Check: `tests/runtime-cleanup-age-out.test.ts` `[AC:spec-3-2]` with `--days 14` (skip the tab case on Windows, where the name is not valid).
- Case mismatch [drift-tidy/9/r3-f2]: when Git tracks no file under the configured docs root but that folder exists on disk (a `Docs` config over a tracked `docs/` on a case-insensitive disk), the skipped entry says the configured name's case differs from the one Git tracks, and names both. With no folder on disk, the message stays "Git tracks no file under <docs>". Check: `tests/runtime-cleanup-age-out.test.ts` `[AC:spec-3-3]` (the mismatch case runs only where the temp disk is case-insensitive, detected in the test; the no-folder case runs everywhere).
- Piped missing tool [drift-tidy/10/f5]: a `checks:` command that exits 0 but whose stderr has a shell "command not found" line (`sh: 1: x: not found`, `bash: x: command not found`, `zsh: command not found: x`) and that gives no finding is skipped with `Command not found: <run>`, as for exit 127. Check: `tests/runtime-cleanup-checks-seam.test.ts` `[AC:spec-3-4]`: `run: missing-tool-xyz | cat` gives one skipped entry and no finding; a check that prints a `path:line: message` finding is unchanged.
- Root from a subfolder [drift-tidy/10/f6]: with no `--root`, every `cleanup.mjs` command starts from the nearest folder up from the working directory that holds `.joycraft/`, else the working directory, so `cleanup.mjs tidy` run from `<project>/docs/guides` reads the project's `joycraft.yaml` and runs its `checks:`. `cleanup.mjs` exports this as `projectRoot` (the rule `archive.mjs` uses today), for spec 1. Check: `tests/runtime-cleanup-tidy.test.ts` `[AC:spec-3-5]`: tidy from a subfolder gives the same findings and `checks:` run as from the root.

## Test changes

- `tests/runtime-cleanup-tidy.test.ts` class 1: acceptance bullets 1 and 5 add the backlog-file and subfolder cases.
- `tests/runtime-cleanup-age-out.test.ts` class 1: acceptance bullets 2 and 3 add the quoted-name and case cases.
- `tests/runtime-cleanup-checks-seam.test.ts` class 1: acceptance bullet 4 adds the pipeline case.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- A missing tool whose shell prints no "not found" line (a custom wrapper that swallows stderr) stays silent.
- The `cleanup.md` wording fix is spec 6.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/cleanup.mjs` (`rangeFindings`, `ageOut`, `customChecks`, `main`, a new exported `projectRoot`), and the three test files above.
- Tests: `tests/runtime-cleanup-tidy.test.ts`, `tests/runtime-cleanup-age-out.test.ts`, `tests/runtime-cleanup-checks-seam.test.ts`. Tag each new test `[AC:spec-3-<n>]`.
- `archive.mjs` and `delivery.mjs` import `docsRoot` from `cleanup.mjs`; keep its export and behavior unchanged.
