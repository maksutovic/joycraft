---
status: backlog
created: 2026-11-21
priority: later
---

# 1.9.0 review follow-ups: what is still open

Source: the 187 reviewer follow-ups that `node .joycraft/runtime/status.mjs` lists for drift-tidy (62) and test-release (125). Each was checked against the code and text on `feature/drift-tidy` at the release commit.

| Class | drift-tidy | test-release | All |
|---|---|---|---|
| fixed (a later spec or commit fixed it) | 12 | 62 | 74 |
| accepted (judged acceptable, informational or intended) | 29 | 43 | 72 |
| open (real work, still true) | 21 | 17 | 38 |
| owner (needs a decision) | 0 | 3 | 3 |

Most fixes came from test-release specs 27, 28, 29, 31 and 32. Fixed and accepted items are not listed here.

## Open

### Archive

- Only lowercase `.md` counts as Markdown, so a `.MD` or `.markdown` file with a relative link into the feature is neither rewritten nor listed. `payload/.joycraft/runtime/archive.mjs:688`. Review: drift-tidy/7/f2-md-extension. Fix: test the extension case-insensitively and add `.markdown`.
- The reference does not say that link rewrites happen only under the docs root. `payload/.joycraft/references/archive.md:197`. Review: drift-tidy/7/f4-reference-docs-root. Fix: add "under the docs root" to the rewrite sentence.
- An in-review spec whose report receipt is gone is listed, but its missing receipt is not, because only queue acceptance records are followed. `payload/.joycraft/runtime/archive.mjs:453`. Review: drift-tidy/8/f2-in-review-receipts. Fix: also check the receipts of the spec's latest report file.
- A whitespace-only `--owner-instruction` gets the generic "Invalid or duplicate argument" message. `payload/.joycraft/runtime/archive.mjs:786`. Review: drift-tidy/8/f3-whitespace-message. Fix: give the same "needs the owner's words" message as for a `--` value.

### Dispatch and evidence

- The report gate check misses runner aliases: `npx vitest run`, `pnpm exec vitest run` and `pnpm run verify` pass for the gates `vitest run` and `pnpm verify`. `payload/.joycraft/runtime/completion.mjs:129`. Review: test-release/6/f2-runner-aliases. Fix: in `ranCommand`, strip `npx`, `pnpm exec` and the `run` of `pnpm run`/`npm run` before the compare.
- A re-check of a done spec runs `refuseGateRuns` again, so a report accepted before `tests.gate` was recorded, and that ran that gate, is refused later. `payload/.joycraft/runtime/completion.mjs:268`. Review: test-release/6/f4-refinalize-after-gate-recorded. Fix: skip the gate-run check on the unchanged done path.

### Cleanup and tidy

- `new-doc` skips a backlog folder but lists a backlog file such as `docs/backlog.md`; age-out skips both. `payload/.joycraft/runtime/cleanup.mjs:533` and `:845`. Review: drift-tidy/2/f4-backlog-file. Fix: use the age-out rule (folder or `backlog*` name) in both places.
- Age-out gives the wrong skip reason for a doc name with a tab or a double quote: `git log --name-only` quotes such names, so no commit is found. `payload/.joycraft/runtime/cleanup.mjs:852`. Review: drift-tidy/9/r3-f1-quoted-names-misreason. Fix: read the log with `-z`.
- A `Docs/` config over a tracked `docs/` folder on a case-insensitive disk says "Git tracks no file under Docs" without naming the case mismatch. `payload/.joycraft/runtime/cleanup.mjs:836`. Review: drift-tidy/9/r3-f2-case-mismatch-config. Fix: when the folder exists on disk, say the configured case differs from Git's.
- A `checks:` command whose missing tool sits in a pipeline (`missing-tool | cat`) exits 0, so the missing tool is silent. `payload/.joycraft/runtime/cleanup.mjs:592`. Review: drift-tidy/10/f5-pipeline-not-found. Fix: also skip with "Command not found" when stderr has a shell "command not found" line.
- `cleanup.mjs tidy` run from a subfolder reads no `joycraft.yaml`, runs no checks and says nothing. `payload/.joycraft/runtime/cleanup.mjs:924`. Review: drift-tidy/10/f6-subdir-cwd. Fix: find the root the way `archive.mjs` `projectRoot` does, or say that no config was found.
- This repo's installed `.joycraft/` copies (`cleanup.mjs`, `archive.mjs`, `wiring.mjs`, `entry-check.mjs`, `queue-check.mjs`, `completion.mjs`, `config.mjs`, `dispatch-start.mjs`, `cleanup.md`, `archive.md`, `settings.md`) and `.agents/skills/joycraft-entry/SKILL.md` still differ from `payload/`, so this repo's own sessions run the old runtime. `.joycraft/runtime/cleanup.mjs:1`. Reviews: drift-tidy/1/f2, 2/f5, 3/f4, 4/f6, 5/f-installed-copy, 6/f4, 7/f5, 8/f4, 10/f9, 11/f3; test-release/4/f5, 6/f5. Fix: run the Joycraft update in this repo after 1.9.0 is on npm.

### Text and skills

- The cleanup reference says `--checks` shows whether a check is a gate, but it also prints the kind (report or mechanical). `payload/.joycraft/references/cleanup.md:6`. Review: drift-tidy/1/f3-kind-wording. Fix: "its kind, and whether it is a gate".
- Setup offers knip for `checks:`, but no knip reporter prints `path:line:`, so it gives only the fallback finding. `payload/.joycraft/references/setup.md:319`. Review: drift-tidy/10/f2-knip-needs-wrapper. Fix: say knip needs a wrapper that prints `path:line: message`, or drop knip from the example.
- gate-in-spec checks only acceptance bullets; a spec's scope section can still name the gate, and the template does not forbid it. `payload/.joycraft/runtime/queue-check.mjs:378`. Review: test-release/14/f3-scope-section-gate. Fix: extend the check, or the decompose sentence, to the scope section.
- The fault-proof reviewer compares old-run and new-run patch sha256 with each other, not with the list committed before the test edit, and does not check one fault per removed assertion. `payload/.joycraft/references/testing-review.md:149`. Review: test-release/18/r2-f1-reviewer-checks-pinned-list. Fix: check each receipt sha256 against the committed list, one per removed or changed assertion, and aim the reviewer's fault at a removed assertion with no replacement.
- Decision 8 says to repeat a new test file before it counts; the playbook says new and changed test files. `payload/.joycraft/references/testing-page.md:42`. Review: test-release/28/f5-text-nits. Fix: "Run a new or changed test file `<n>` times".
- Chained gates are missed: "pnpm verify && pnpm lint pass.", "pnpm verify | tee gate.log" and "pnpm verify 2>&1 | tee log" (probed: all false). `payload/.joycraft/runtime/queue-check.mjs:267`. Review: test-release/31/f1-chained-gate-missed. Fix: let `&&`, `||`, `|` and `2>&1` followed by whitespace end the command.
- The `namesCommand` doc comment still says a next word holding `-` makes a different command, but an inner hyphen between letters now reads as prose. `payload/.joycraft/runtime/queue-check.mjs:231`. Review: test-release/31/f2-number-and-hyphen-words-read-as-prose. Fix: say a word that starts with `-` is an argument and `re-runs` is prose.
- `delivery.md` does not list the record extensions, and no reviewer guidance says to save probe scripts as `.mjs.txt`, so a feature folder with probe `.mjs` receipts needs another gate run at archive. `payload/.joycraft/references/delivery.md:53`. Review: test-release/31/f3-probe-receipts-need-gate-at-archive. Fix: list `.md .json .log .txt .diff .patch .yaml .yml` there, and tell reviewers to save probes with a `.txt` suffix.

### Tests

- The guard does not pin the 12 every-spec paths, so dropping a file from `EVERY_SPEC_FILES` moves its words to the on-demand budget and still passes. `tests/payload-guard.test.ts:335`. Review: test-release/28/f3-every-spec-list-unpinned. Fix: assert the 12 paths in `[AC:spec-1-1]`.
- No test asserts that the SOTA page keys the worker cap on `JOYCRAFT_EVIDENCE`, never `CI`, or that it says never a fixed delay. `tests/text-sota-page.test.ts:22`. Review: test-release/28/f4-sota-patterns-shorter. Fix: add those two patterns.
- Release proof deferred until deploy, in a real project: run one test through `evidence.mjs` before and after its runner-cap change under `JOYCRAFT_EVIDENCE`; replay the fault proof with the three saved faults; run `--patch` in a worker worktree under the Codex sandbox; check archive preview `namedFiles` at the named revisions; and read gate runs per spec and run facts across a parallel queue in the next field report. `docs/features/2026-11-21-test-release/specs/26-release-proof.md`. Reviews: test-release/26/deferred-1 to deferred-5. Fix: run them after 1.9.0 is on npm and record the receipts.

## Owner decisions

- Gate rule in this repo (test-release/14/f4-entry-rule, `AGENTS.md:15`): should "Run `pnpm test && pnpm typecheck` before committing" become the once-per-spec gate rule, or stay as it is? (`cleanup.mjs gate-rule --check` prints `unset`.)
- Archive list kill criterion (test-release/24/f6-kill-criterion): do you adopt "drop the list from the session-end text if two archives in a row list only files nobody should edit"?
- Docs-root manifests (test-release/27/f13-docs-json-and-markdown-inputs, `payload/.joycraft/runtime/delivery.mjs:142`): should `package.json` and `tsconfig*.json` under the docs root stop counting as records, so a change to them needs the gate again?
