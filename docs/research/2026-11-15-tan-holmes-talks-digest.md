# Two AI Engineer talks against Joycraft 1.3.0 and the enforced-gates release

**Date:** 2026-11-15 · **Baseline:** `origin/main` 1.3.0 (payload `field-18`) and
`docs/features/2026-11-12-enforced-gates/` (planned 1.4.0, `field-19`)
**Decisions for Max:** `docs/features/2026-11-15-talk-review-tan-holmes/brief.md`

## Sources and method

| | Talk A | Talk B |
|---|---|---|
| Title | "Your AI Agent Is Hiding Its Mistakes From You" | "All Code Is Slop (Except Mine)" |
| Speaker | Ben Holmes, DevX Engineering Lead, Warp | Lauren Tan ("poteto"), Principal Engineer, SpaceX (Grok Bot); earlier Cursor |
| Event | AI Engineer New York, 2026-10-14 | AI Engineer Code Summit, uploaded 2026-11-14 |
| URL | https://www.youtube.com/watch?v=pz74r-4dGfQ | https://www.youtube.com/watch?v=O_zcc6Xl12g |
| Length, stills read | 19:19, 58 of 58 | 17:31, 53 of 53 |

Each video was transcribed and read still by still with `vidctx` by one Opus 5.5
agent. Twelve candidate changes (A–L) were then put to a four-member Fable 5.2
panel: evidence auditor, pyramid purist, minimalist skeptic, cross-harness field
user. Each member read both sets of notes and the repository and cited
`file:line`. The claims this digest relies on were re-checked by hand
(see "Checked by hand").

Limits: transcripts are machine speech-to-text, corrected from the slides where
legible. Tan's step chart at 9:14 (7 → 167) has no y-axis label; do not cite it
as a lint-rule count. Holmes's score-over-time chart was drawn by hand after his
dashboard failed to load (16:14); his "50%, 60%" is illustrative. Both talks end
in a product pitch (Warp Factories, Grok Bot).

## What each talk says

**Tan (B).** Spend effort on the agent's environment in this order, cheapest
first: codebase (API design, architecture) → static analysis (lint, types,
tests, CI) → verification (runtime, formal) → prose (rules, skills, AGENTS.md) →
human review (2:03). The codebase is the agent's largest input, so agents copy
what is there: "each copy makes the next copy more likely" (4:25). Every
correction becomes a check or an API change, not a line of prose (3:12, 9:14);
a lint message should name the root-cause fix (8:54). "Nuance tends to lead to
slop — just design better APIs" (5:26). Agents use comments and markdown to
justify not doing the right thing; comments cannot be enforced (6:56–8:45).
Verification is the most important step; review becomes reading verification
artifacts (9:41–9:56). A "feature map" (what exists → how users reach it → what
proves it works) and a reusable driver CLI let the agent check its own work
(10:04–10:40). "Don't automate a bad loop" (15:11–15:50). Results: 10,926 PRs
merged in October, revert rate steady near 0.47% (13:34, 14:16). Her
performance slide also shows regressions she did not mention (memory +12%, idle
CPU +100%, startup JS/CSS +285%, 14:37).

**Holmes (A).** Agents work around stale instructions and broken config and
report success; the waste shows only in tool-call traces (7:52–8:56). His loop:
collect every conversation (transcript, tool calls, outputs) → score each with
short markdown rubrics and an LLM judge → filter to failures → a daily agent
finds what they share and proposes skill edits, each citing session IDs
(2:40–3:17, 8:57–13:38, 15:17–15:57). Demo findings on 12 sessions: skills that
exist but do not trigger; the agent said "verified" and the user then found UI
bugs in 4 sessions; pushes to the wrong branch in 3 (14:47). Scores over time
tie a merged skill change to a visible result (17:06–17:58). His team approved
13 of 51 proposals, 25% (18:00). Rubric writing is "more of an art than a
science" (10:38).

## What the talks confirm about the current plan

- Enforced-gates comes before any automation work. Tan 15:11–15:50.
- Spec 01's stderr names the command that completes the spec. That is Tan's
  lint message that names the root-cause fix (8:54).
- Spec 02 (dead references) is Holmes's failure exactly: an agent reads a
  pointer to a file that is not shipped and works around it without saying so
  (7:52–8:56, and 14:30 where his scorer judged against a removed skill).
- One citation does not hold: Tan's static-analysis layer includes CI (2:03),
  and the enforced-gates brief itself says "CI is the only gate that covers all
  six harnesses". The talk argues for the backlogged CI check, not for `ci:
  none`. That decision was made on 2026-11-12 and is not reopened here.

## Panel result on the twelve candidates

Verdicts: S = ship in the next release, R = reshape, B = backlog, C = cut.
Order of members: auditor / purist / minimalist / field user.

| | Candidate | Verdicts | Outcome |
|---|---|---|---|
| A | Remedy ladder: API change → project check → verification → prose → human, in retro, recurring-failures and the Trap row | R / R / R / B | Backlog as a net-zero edit: order the existing table at `references/retro.md:67-76` and rewrite the Trap row at `references/knowledge.md:39` in place. No new paragraph. Note the conflict: `references/recurring-failures.md:20-22` forbids a lesson that adds a blocker or runtime. |
| B | Enforcement ledger; first conversion is the three-review cap | S / S / R / S | **Decision `review-cap`.** Ship the cap only, no ledger document. The minimalist dissents: delete the number instead. |
| C | Reviewer flags a comment or new markdown that justifies not making the right fix | B / R / B / B | Backlog. As reviewer prose it sits on rung 4 of Tan's own pyramid. A diff scan needs a base revision, which is opt-in. |
| D | Feature map context home | B / R / C / R | Backlog, generated only. An agent-written map would reverse Curated-harness D6 ("a hand-maintained tree is a guaranteed-drift prose copy"). The deterministic form: `trace.mjs` over archived queues fails when an accepted criterion's `[AC:id]` test is gone. |
| E | Project driver script as the evidence command | C / C / C / S | Cut. Already supported: `review-tools.mjs record --command <package>=<command>` (`references/setup.md:205-215`). |
| F | NEW vs PRE-EXISTING label on findings | C / R / C / B | Folds into structured findings (below). The rule exists in prose (`joycraft-verify/SKILL.md:68-74`); the report has no field to carry it. Tan's source is a release-fuzz report, not a review technique. |
| G | Deterministic feature scorecard with a history file | B / R / C / R | Backlog, derived on demand from queues, reports and the archive. No history file: `references/recurring-failures.md:5-6` says "not a new state store", and stored derived data decays. A solo developer has too few points for a trend. |
| H | Escape rate: accepted PASS specs that later needed a repair | B / B / B / R | Backlog, first in line. The only candidate that measures whether a PASS was true. Needs a repair-to-spec link in the brief; n is small per project. |
| I | "Worked around:" line in worker final messages | C / R / C / R | Cut. Holmes's point is that agents do not self-report. Replaced by friction counts (below). |
| J | Retro across sessions with LLM scorers | C / C / C / C | Cut, 4 of 4. Do not build. Warp's `/skill-doctor` reads Claude Code and Codex sessions only. Claude Code's own `/skill-doctor` (v2.1.252+) is a different thing: per-skill context cost and invocation counts, no quality score. A crawl of `~/.claude` would also break `joycraft-retro/SKILL.md:22-23` (explicit sources only). |
| K | State table for state-heavy specs | B / B / C / B | Backlog. Tan calls formal work "still experimenting" (10:51); "one criterion per transition" is not in the talk. |
| L | No change; cite as validation | R / S / S / R | Ship as scoped, with the two reshapes that became decisions `dead-reference-scope` and `gate-on-all-harnesses`. |

## What the panel found that the candidates missed

1. **Seven dead paths, not four** (auditor, minimalist). Spec 02 names four
   missing reference files. The payload also names three runtime files that are
   not shipped: `runtime/hooks/judge.mjs` (`references/context.md:70`),
   `runtime/hooks/metrics.mjs` (`references/retro.md:54`) and
   `runtime/hooks/cli.mjs` (`references/dispatch.md:182`). No
   `payload/.joycraft/runtime/hooks/` directory exists. Spec 02's criterion says
   the link test "lists the four files"; a correct test lists seven. The payload
   also describes parts it does not ship: Jev scoring
   (`references/context.md:46-83`; the ranker `rank-model.mjs` is not
   installed), a Claude `SessionEnd` hook (`joycraft-session-end/SKILL.md:11-14`).
2. **The gate reaches one harness of six** (field user). The Stop hook is Claude
   Code only. The session-end skill still runs only `status.mjs`; no spec makes
   it run `gate.mjs check`.
3. **The payload has its own nuance-heavy APIs** (purist). Three places where
   the agent does by hand what a command could do:
   - `joycraft-implement/SKILL.md:61`: update the queue entry and the spec
     frontmatter to `in-review` "together", by two hand edits. `status.mjs`
     exists to find the drift this causes, and spec 01 adds a second detector.
     Redesign: `completion.mjs submit --queue --spec`, reusing the journaled
     two-file write.
   - `joycraft-verify/SKILL.md:68-74` asks the reviewer to sort findings into
     blocking, decision needed, follow-up and repeat. The contract has only
     `unresolved: string[]` (`contracts/types.d.ts:146`) and
     `completion.mjs:76` rejects a PASS with any entry. A non-blocking finding
     has no place in the report. Redesign: `findings[]` with `class` and
     `origin`; only `blocking` rejects a PASS.
   - The test-run rule (`CI=1`, single run, 300000 ms) is copied in six files
     and receipts are assembled by hand. Redesign: `evidence.mjs run --receipt
     <path> -- <argv>` wraps the project's own command and writes the receipt.
4. **The weakest link is the evidence, not the gate** (field user). A PASS is the
   reviewer's self-report: `evidence.mjs` checks that evidence is declared, not
   that it is true; `visual.inspected` is a boolean the reviewer sets; a runtime
   criterion passes on the implementer's own `[AC:id]` test. The enforced-gates
   release checks that a record exists. Proposed: where a criterion's only
   runtime evidence is the implementer's test, the reviewer breaks the behavior
   in a temporary copy and confirms the test fails. `references/testing.md:15-19`
   permits this and leaves it optional. Sources: B 12:05, 12:25 (mutation).
5. **Deterministic friction counts** (auditor, purist). `retro.mjs prepare`
   already records `isError`, `exitCode` and `durationMs` per tool call but has
   no failed-call or repeated-call tally. That is Holmes's efficiency signal
   with no judge and no provider call.
6. **Delete on convert** (purist, minimalist). Each new runtime check removes
   the sentence it replaces. "Only guarded completion makes `done`" is stated
   in four skills; after `gate.mjs` lands one statement is enough.
   `cleanup.mjs` enforces a word budget on the user's entry files; nothing does
   so for Joycraft's own skills.
7. **Spec check as a command** (purist). `joycraft-decompose/SKILL.md:57-62`
   lists pre-queue checks ("every acceptance bullet has a `Check:`", "cited
   evidence files exist"). No runtime file parses `Check:`.

## Recommendation

**In the next release (enforced-gates, 1.4.0):**
1. Widen spec 02 to all seven dead paths and the text about unshipped parts.
   The release then removes more payload lines than it adds.
2. Enforce the three-review cap in reviewer `dispatch-start`, counting distinct
   code revisions, as a small spec 05.
3. Make the session-end skill run `gate.mjs check`, so the check runs on every
   harness.

**Next feature:** the runtime takes over the three hand-done steps (submit,
structured findings, evidence run), each deleting the prose it replaces. This is
Tan's first pyramid layer applied to Joycraft itself.

**Backlog, in order:** repair-to-spec link for escape rate (H); test-sensitivity
check; friction counts in `retro.mjs`; net-zero remedy order (A); scorecard
derived on demand (G); generated regression map (D); state table (K);
workaround-justification finding (C); CI gate (decided `none` on 2026-11-12).

**Cut:** E, I, J, and F as a standalone change.

## Checked by hand

- `payload/.joycraft/runtime/hooks/` does not exist; the three paths above are
  named at the cited lines.
- `contracts/types.d.ts:146` is `unresolved: string[]`; `completion.mjs:76`
  requires it empty for a PASS.
- No file in `payload/.joycraft/runtime/` counts review rounds;
  `visibleReports` is at `completion.mjs:359`.
- `300000` appears in six shipped files (three skills, two agents,
  `references/testing.md`).
- `context/index.mjs:3-17` falls back to "ranker-not-installed".
- The session-end skill runs `status.mjs` and no gate check.

Not checked by hand: the count of places that state "only guarded completion
makes `done`"; the line ranges the panel gave for `retro.md:67-76` and
`knowledge.md:39`; the purist's proposed runtime designs were read against the
code, not run.
