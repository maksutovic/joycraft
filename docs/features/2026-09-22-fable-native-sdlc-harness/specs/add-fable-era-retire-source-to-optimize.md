---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Add Fable-Era Retire Source To Optimize — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 2 skill sources + generated variants + 2 test files / ~60 lines of prose

---

## What

`src/skills/joycraft-optimize.md` gains a **model-profile evidence step** that compares a project's boundary rules against the profile doc from spec 1 and flags legacy anti-formatting and hand-holding rules as `RETIRE` or `PROBATION` candidates. The finding is carried by **one new evidence label**, growing optimize's evidence vocabulary from seven to eight. `src/skills/joycraft-tune.md`'s Step 6 roadmap gains one line telling a user with a pre-Fable memory file to run optimize.

**The new label is `MODEL_SUPERSEDED`.** It reads: the rule was written for an older model and the installed model profile now states the opposite or renders it moot. It is one greppable word, uses no synonym of an existing label, and stays disjoint from the six dispositions — the no-synonyms, exactly-N contract that curated-harness D4 (decision-log, 2026-09-01) established precisely because greppability is the point.

The disposition list does **not** grow. It stays at exactly six. A flagged rule takes `RETIRE` when the profile doc states the opposite of the rule, and `PROBATION` when the rule is merely unverified under the current model — `PROBATION`'s existing definition already names "a rule hardened into a machine check under a model that has since changed", so the new step reuses it rather than minting a seventh disposition.

**The tests that hard-code the counts, verified:**

- `tests/add-reaper-pass.test.ts` — `describe('add-optimize-telemetry-evidence: exactly seven evidence labels')`. Holds a seven-element `LABELS` array; asserts the heading text matches `/Evidence label vocabulary \(exactly seven, no synonyms\)/`; asserts the vocabulary table has exactly seven rows matching `/^\|\s*`[A-Z_]+`\s*\|/`; asserts the labels stay disjoint from the six dispositions.
- `tests/upgrade-optimize-v2.test.ts` — line 35-36 list `NEVER_READ` and `WRITE_HEAVY` in its own label array; line 54-55 assert the "exactly seven" heading; line 58-59 assert the "exactly six" disposition heading.

Both files change from seven to eight for the evidence vocabulary. The "exactly six, no synonyms" disposition assertions stay untouched.

The advisory contract is absolute (D5): optimize proposes, it never applies, and it never edits a user's CLAUDE.md. The new rows land in the existing disposition table and Recommendations block, alongside every other row.

## Why

A user carrying a years-old CLAUDE.md gets worse output from Fable 5.1 than from defaults, and today nothing in tune or optimize tells them. Optimize already walks every boundary rule and assigns a disposition, so the profile doc gives it the one thing it lacked: an objective reference to measure a legacy rule against, rather than a judgment call the audit cannot defend.

## Acceptance Criteria

- [ ] `src/skills/joycraft-optimize.md` gains a model-profile evidence step that reads `docs/templates/reference/model-profile-claude-fable-5-1.md` and compares the project's boundary rules against it [src: D5]
- [ ] The step cites the profile doc by path and by block name, copying no block prose [src: D1]
- [ ] The step names the anti-formatting pattern explicitly, so a CLAUDE.md line such as "never use markdown" yields a candidate row [src: brief "Success Criteria"]
- [ ] The step names the hand-holding pattern — rules that tell the model to stop and check in, narrate every step, or avoid acting autonomously — as the second flag class [src: brief "Problem"]
- [ ] Evidence label `MODEL_SUPERSEDED` is added: one word, no synonym of an existing label, disjoint from the six dispositions [src: D5]
- [ ] The evidence vocabulary heading in `src/skills/joycraft-optimize.md` reads "Evidence label vocabulary (exactly eight, no synonyms)" and the table has exactly eight label rows [src: brief "Decomposition"]
- [ ] The disposition vocabulary remains exactly six, heading and table unchanged [src: D5]
- [ ] A flagged rule takes `RETIRE` when the profile doc states the opposite, and `PROBATION` when the rule is unverified under the current model [src: D5]
- [ ] Rows produced by the step are advisory only — the step states that optimize never edits the user's CLAUDE.md and applies nothing [src: D5]
- [ ] `tests/add-reaper-pass.test.ts` is updated: eight-element `LABELS`, "exactly eight" heading assertion, eight table rows, disjointness still asserted against the six dispositions [src: brief "Test Strategy"]
- [ ] `tests/upgrade-optimize-v2.test.ts` is updated: its label list and "exactly seven" assertion become eight; its "exactly six" disposition assertion is unchanged [src: brief "Test Strategy"]
- [ ] `src/skills/joycraft-tune.md` Step 6 "Show the Harness Maturity Roadmap" gains one line telling a user whose memory file predates the model profile to run optimize [src: brief "Decomposition"]
- [ ] Generated variants are regenerated and the installed skill trees synced in this same commit [src: brief "Hard Constraints"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Step exists | `src/skills/joycraft-optimize.md` matches a model-profile step heading and the profile doc path | unit |
| Cites by block name | the step names at least one `## ` block that exists in the profile doc | unit |
| Anti-formatting flag class | the step's text matches an anti-formatting phrasing including a markdown example | unit |
| Hand-holding flag class | the step's text names the hand-holding class | unit |
| Eight labels | `LABELS` array of eight in `tests/add-reaper-pass.test.ts`; heading matches `/exactly eight, no synonyms/`; table has eight `|\`LABEL\`|` rows | unit |
| New label is one word, no synonym | `MODEL_SUPERSEDED` matches `/^[A-Z_]+$/`, is absent from the prior seven, and appears in exactly one table row | unit |
| Six dispositions unchanged | heading still matches `/Disposition vocabulary \(exactly six, no synonyms\)/` and the table still has six rows | unit |
| Disjointness | none of the eight labels equals any of the six dispositions | unit |
| Advisory only | the step's text asserts optimize applies nothing and never edits the user's CLAUDE.md | unit |
| Missing profile doc | the step's text names `INACCESSIBLE` as the evidence for an absent profile doc | unit |
| Tune roadmap line | `src/skills/joycraft-tune.md`'s Step 6 region matches an optimize-referral line mentioning the model profile | unit |
| Generated variants | the step is present in `src/claude-skills/joycraft-optimize.md` after regeneration | unit |
| Installed sync green | existing `tests/installed-skills-sync*.test.ts` suites pass | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the eight-label vocabulary test (`pnpm test tests/add-reaper-pass.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep the new evidence label one greppable word with no synonym of an existing label, per the exactly-N, no-synonyms contract [src: D5]
- MUST: keep the disposition vocabulary at exactly six — a flagged rule reuses `RETIRE` or `PROBATION`, whose definition already names a model that has since changed [src: D5]
- MUST: update every hard-coded count in `tests/add-reaper-pass.test.ts` and `tests/upgrade-optimize-v2.test.ts` in the same commit as the skill edit [src: brief "Test Strategy"]
- MUST: cite the profile doc by installed path and block name, copying no block prose [src: brief "Hard Constraints"]
- MUST: regenerate bundled variants and run `pnpm sync-skills` in the same commit as the skill edits [src: brief "Hard Constraints"]
- MUST: keep every model-profile row advisory — proposed in the disposition table and Recommendations, never applied [src: D5]
- MUST NOT: auto-edit a user's CLAUDE.md, AGENTS.md, or any boundary file from optimize [src: D5]
- MUST NOT: add a seventh disposition, or reuse an evidence-label word as a disposition [src: D5]
- MUST NOT: edit `src/templates/reference/model-profile-claude-fable-5-1.md` — spec 1 owns it and spec 4 cites the same headings [src: brief "Decomposition"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: touch the holdout scenarios repo or its dispatch workflow [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-optimize.md` | New model-profile evidence step; evidence vocabulary heading and table grow to eight; `MODEL_SUPERSEDED` row; disposition-table legend and Recommendations gain the new label; Edge Cases gains an absent-profile-doc row |
| Modify | `src/skills/joycraft-tune.md` | One line in Step 6's roadmap referring a pre-Fable memory file to optimize |
| Modify | `tests/add-reaper-pass.test.ts` | Seven to eight labels, heading assertion, table-row count |
| Modify | `tests/upgrade-optimize-v2.test.ts` | Label list and "exactly seven" assertion become eight |
| Modify | `src/claude-skills/*.md`, `src/codex-skills/*.md`, `src/pi-skills/*.md`, `src/copilot-skills/*.md`, `src/omp-skills/*.md` | Generated — regenerated from the two edited sources |
| Modify | `.claude/skills/`, `.agents/skills/`, `.pi/skills/`, `.github/skills/`, `.omp/skills/` | Installed copies synced by `pnpm sync-skills` |
| Modify | `src/bundled-files.ts` | Generated — skill bodies change |

## Approach

Add the new step immediately after Step 2b (Read Telemetry), so both evidence-producing protocol steps sit together before the duplication pass. It reads the installed profile doc, walks the boundary rules already inventoried in Step 2, and emits a disposition row per rule that contradicts a named block. The step states its two flag classes concretely — anti-formatting rules that ban markdown or structure outright, and hand-holding rules that tell the model to stop, check in, or narrate rather than act — because a vague "legacy rule" instruction produces judgment rows no user can act on.

Model-profile rows never reach the Reaper's delete path. The Reaper (Step 10) acts only on feature folders under `docs/features/<slug>/`, never on the controls audited in Steps 1 through 9, so a `RETIRE` row from this step is a recommendation in the report and nothing more.

Grow the evidence table to eight rows and change the heading number. Then update both count-asserting tests. Run the two test files first to watch them fail on the count, which is the fastest confirmation the harness is wired to the real skill text rather than a copy.

Tune's line goes at the end of Step 6's roadmap bullets, beside the existing harden and optimize tips, phrased as a conditional: if the memory file predates the installed model profile, run optimize.

**Rejected alternative:** a seventh disposition named `MODEL_SUPERSEDED` instead of an eighth evidence label. It reads more directly, but it breaks the disjointness invariant that the disposition and evidence vocabularies are two separate closed sets, and it would force every existing consumer of the six-disposition contract to learn a new terminal verdict when `RETIRE` and `PROBATION` already carry the right meanings.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Profile doc absent from the project | Every model-profile row takes evidence `INACCESSIBLE`; the step notes the gap and continues, never errors |
| Project has no CLAUDE.md or AGENTS.md | No rules to walk; the step reports `NOT_APPLICABLE` and continues |
| A rule contradicts the profile but the user wrote it deliberately | Advisory row only — `PROBATION` with the reason naming the contradiction; optimize applies nothing |
| A rule is merely old, with no profile block contradicting it | No row. Age alone is not evidence; the step flags contradiction, not vintage |
| The same legacy rule lives in two homes | Step 3's duplication pass already assigns `ONE_HOME`; the model-profile step adds its own row for the canonical home only |
| Codex-only project | The profile doc never installs for Codex, so rows take `INACCESSIBLE` — correct, not a failure |
| Spec 1 renames a block heading after this lands | The block-name test goes red, which is the intended coupling |
