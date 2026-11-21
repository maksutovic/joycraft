# Cleanup findings and recommendations

One part: `AGENTS.md` (970 words) and 8 context pages (14,451 words). No test or script pins their text. Joycraft is now 1.8.0 in this repo.

Each line below is a recommendation I apply after your answers unless you veto it in a note. Rules change only by an answer below.

## AGENTS.md (aim: about half the words)

| # | Finding | Evidence | Plan |
|---|---|---|---|
| A1 | The "Show Max every document" rule duplicates and contradicts the managed block | `entry-check.mjs`: managed-block, line 25 | Remove (update step 3); question `always-rules` |
| A2 | Date in a provenance comment | temporal, line 40 | Drop the comment; the rule stays word for word |
| A3 | "all four ran green on 2026-11-02" | temporal, line 55 | Drop the date clause |
| A4 | `pnpm test` "already runs once and exits" | `package.json` test is `vitest`; it runs once only without a TTY (agents, CI) | Keep the rule; say "runs once in an agent shell or CI" |
| A5 | Docs-sync rule explains its hook and CI check | `.claude/hooks/pr-docs-gate.mjs`, `docs-sync.yml` state it | Keep the rule; cut the enforcement clause |
| A6 | Map rows for logs say "read when" | decision-log, shipped are logs | Move to a "Records — search when you need why or when" part |
| A7 | Map row: architecture "the 0.7 migration" | Still in `src/legacy-07.ts` | Keep |
| A8 | "Keep this file lean: link out" line | Says what the managed block says | Remove |

## Pages

| # | Page | Finding | Evidence | Plan |
|---|---|---|---|---|
| P1 | institutional-knowledge | "`RELEASE_TOKEN` … push version bump commits" is false | `publish.yml` pushes no commit; `releasing.md`: "the workflow does not push version commits" | Delete |
| P2 | institutional-knowledge | "patch bump if no manual version change" is half true | `release-preparation.mjs:484`: a higher source version is kept | Rewrite to match `releasing.md` |
| P3 | institutional-knowledge | `improve-claude-md.ts` is the most dangerous code: file is gone | `src/` has 7 files, none of them it | Delete |
| P4 | institutional-knowledge | A feature folder always has a queue | testing-overhaul had none | Keep; add "a feature that ships without a queue cannot archive" |
| P5 | institutional-knowledge | Worktree setup line names `package-acceptance.test.ts` | Still true | Keep |
| P6 | dangerous-assumptions | 8 rows about removed 0.7 code; "Skills can't import" contradicts architecture gotcha 3 | `src/`, `payload/` | Delete false rows; question `old-material` for the rest |
| P7 | dangerous-assumptions | Hook row has dates and history | temporal | Keep the lesson, drop the dates |
| P8 | decision-log | Table separator row is at line 69, so lines 11–68 do not render as a table | file | Move the separator under the header |
| P9 | decision-log | Rows before 1.0.0 describe 0.7 | 1.8.0 removed 0.7 | Add one line under the heading; rows stay |
| P10 | decision-log, shipped | No `type: log` frontmatter | cleanup page kinds | Add it |
| P11 | architecture | "Moved out of AGENTS.md on 2026-11-02 … at 6c7781a" | temporal in a guide | Drop the history sentence |
| P12 | production-map | "Safe to touch: `docs/`" vs AGENTS.md stops on templates | No conflict: templates are in `payload/` | Keep |
| P13 | anchors, model profile | No current user | question `dead-pages` | Per answer |

## Not done in this pass

- `docs/features/` holds about 60 old feature folders; 18 queues have no `schemaVersion`. That is archive work, not a docs cleanup.
- The test review is offered after this pass.
