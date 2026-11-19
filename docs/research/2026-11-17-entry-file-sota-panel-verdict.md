# Panel verdict: keeping AGENTS.md state of the art without asking

**Date:** 2026-11-17. **Trigger:** a cleanup run on a field project's AGENTS.md (68 lines, 1,514 words, about 800 of them rules) asked the owner 9 questions and deferred 106 dead paths. Owner: this asks too much; Joycraft must always provide the state-of-the-art file, deterministically and with opinions, and know at startup when the file needs work.

**Method:** three research agents (Anthropic docs, OpenAI and cross-harness docs, measured evidence and existing linters), then a five-seat adversarial panel on a draft design, each seat tested against the field file. Brief with the open decisions: `docs/features/2026-11-17-canonical-entry-file/brief.md`.

## Root cause

Two standing policies in the shipped cleanup skill turn every finding into a question: "never move, reword or reformat a rule" and "change nothing until approved". Eight of the nine questions had a fixed right answer that `knowledge.md` or vendor guidance already states.

## What the vendors say (read 2026-11-17)

| Source | Guidance |
|---|---|
| Claude Code docs, memory | Target under 200 lines; longer files cost context and reduce adherence. Hold only facts needed in every session. Move a multi-step procedure, or guidance for one part of the code, to a skill or a path-scoped rule. Contradicting instructions are resolved arbitrarily; review periodically. |
| Claude Code docs, best practices | Leave out what Claude can find by reading the code. Plain wording; piled-on emphasis makes current models over-apply a rule. "If something has to happen every time, make it a hook, a deny rule, or a managed setting." |
| Claude Code mechanics | AGENTS.md is read natively since 2.1.277 but skipped when any CLAUDE.md exists; `@AGENTS.md` in CLAUDE.md is the documented sharing pattern. `@` imports load eagerly. Block-level HTML comments are stripped before injection. `/doctor prompt-audit` is interactive and model-driven, with no documented headless path. SessionStart hooks inject context, cannot block, and must be fast. |
| Codex docs | Root-to-cwd files are concatenated; the combined cap is 32,768 bytes and the file that crosses it is cut mid-file (warned only since 0.169.0). A short accurate file beats a long vague one; add a rule only after repeated mistakes; reference task-specific Markdown files. Use the file for what the model cannot infer from code, tests or docs. Boundary language written for older models can make the current model stop too early. |
| OpenAI harness-engineering post (2026-02-11) | AGENTS.md is about 100 lines and is "the table of contents"; `docs/` is the system of record; linters and CI check freshness, cross-links and structure; a recurring doc-gardening agent opens fix-up PRs. |
| Cross-harness | Portable: one root plain-Markdown AGENTS.md, nested AGENTS.md on the launch path, relative links and backticked paths. Not portable: `@` imports, glob-scoped rules, `AGENTS.override.md`, session-start hook config. Codex skips a new or changed project hook until the user trusts it; Pi and omp need a TypeScript extension. |

## Measured evidence

Numbers below were extracted by a research agent on 2026-11-17. Check each paper before quoting a number in public.

- **A stale file beats the code.** With a stale instruction file, 90.1% of agent choices followed the file over the code; one added sentence (follow the code, report the mismatch) moved code-following from 4.2% to 91.4% (arXiv 2610.30571).
- **Files only grow.** Instruction count rises 226% over a file's life; after a rewrite it is back to 91.5% of the old size within 10 commits. A recorded reason per rule cut excess growth from +211% to +1.4% in a synthetic test (arXiv 2608.11095). Median additions per commit are 57 words against under 15 deleted (arXiv 2511.12884).
- **Size is a cost control, not an adherence lever, on 2026 models.** 1,650 Claude Code sessions showed no detectable effect of file size or position on adherence (arXiv 2605.10039). The 2025 ceiling of 150 to 200 instructions no longer holds.
- **Generated files cost more and do not help.** LLM-generated context files: no success gain, +20 to 23% cost. Human-written files: a small gain, significantly better than generated (arXiv 2602.11988 v3). Repository overviews do not help.
- **Map rows work; orphans do not.** A pointer index in the always-loaded file reached 100% against 79% for a skill with explicit instructions (Vercel). Linked pages were read in over 90% of sessions, orphan pages in under 10% (Augment).
- **Mechanical checks beat model audits for drift.** One model audit found about half of known drift (arXiv 2610.32578). Stale references were found by regex and Git with 64% precision when matched broadly (arXiv 2606.09090), so match narrowly.
- **Existing linters** (agnix, two tools named ctxlint, agentdrift, agents-doctor, agents-lint) check dead paths, missing commands, size and dated notes deterministically. None rewrites prose.

## The panel

All five seats: adopt with amendments. The draft's rule-splitting, its unscoped "follow the code" sentence, its ledger-based verifier and its session-end trigger did not survive.

| Seat | Sharpest finding on the field file |
|---|---|
| Owner sovereignty | 7 of 12 rule bullets exceed 40 words. In the dangerous ones the short sentence is the grant and the tail is the limit, so "keep the imperative, move the procedure" keeps the permission and exiles its gates. Linked pages are not re-injected after compaction. |
| Determinism | Probe run on the file: a line budget passes at 68 lines while words are 51% over; a date check flags folder names unless code spans are masked; trigram overlap between a prose paragraph and the generated block it duplicates is 0.02; three sentence splitters give 101, 104 and 167 units. Detection is a script; disposition is not. |
| Cross-harness | Each worker tree has no local state, so eight overnight workers would each report and each "fix" the most-read file. The check must not depend on the update policy. CI is the only full-coverage trigger. |
| Minimalist | Eight of nine questions go away with standing defaults and no new code. A paragraph that duplicates the generated block also held a unique rule, so "delete duplicates" must keep unique sentences. Cut the ledger, word caps, trigram detector and migrating spec. |
| Owner's advocate | Wrote out the file after the draft's normalize: 81 lines, 1,230 words, still over budget, with four permission rules weakened. With rules pinned the floor is about 1,350 words, so a fixed 1,000-word budget would nag in every session. |

## Where the panel agrees

1. **Rules are pinned (5/5).** Joycraft never splits, moves, rewords or deletes a block that grants or denies permission. Rule words are outside any budget.
2. **Defaults replace questions (5/5).** Status and dates leave map rows; history leaves the entry file; the generated block wins over a prose copy, and sentences the block lacks stay; the agent fixes its own same-session text; every live page gets a row; history pages are archived.
3. **The checker is a script; the tidy is model-proposed and script-verified (4/5).** The script owns the list of pinned blocks and requires them byte-identical. The model only writes map rows and picks destinations.
4. **Scope the code-wins sentence (2 seats, no dissent).** Facts yield to the code; rules do not.
5. **One writer, attended (3/5, no dissent).** Workers, subagents and linked worktrees never check or edit the entry file. An unattended run fixes only Joycraft's own block and uniquely renamed paths.
6. **One recorded consent (2 seats, no dissent).** A committed setting, asked once, is the explicit confirmation Joycraft's never-overwrite rule needs.
7. **The only hard size limit is Codex's 32,768-byte chain.** Other sizes are a per-project baseline that may not grow.

## Where it split

- **Verifier.** The minimalist would use the diff and `git revert` alone. The skeptic and the prosecutor require a script check that pinned blocks are byte-identical. Resolved: keep that one check; cut the ledger and reason codes.
- **Versioned spec.** The minimalist: a migrating spec rewrites users' files on every vendor shift. The operator and the advocate: a bump may change Joycraft's own block only. Resolved: no migration of user text; guidance updates reach projects through the managed block and the checker.
- **Local stamp.** Skeptic: drop it and run the check every session. Advocate: commit it. Resolved: no stamp; the check is pure, and the size baseline is committed.

## Not automated, by agreement

Whether a sentence is a rule; shortening or splitting a rule; deleting text that is not byte-identical elsewhere; a conflict between a rule and the code; whether a hold is still in force.

## Pre-committed measurements

1. Questions per cleanup run: median at most 1, maximum 2, over 10 runs (baseline 9). Kill at median 3 or more.
2. Owner reverts of tidy commits: at most 1 in 10. Any lost or altered permission rule returns the feature to approve-first.
3. Day 30: non-rule words at or below the post-tidy baseline plus 10%; zero dead paths and unmapped pages at session start in 90% of sessions.
