# Decompose Review — Opus 5.5 prompting fit

> **Gate:** decompose · **Feature:** `2026-09-23-opus-5-5-prompting` · **Date:** 2026-09-24 · rev 1
> **Render:** `decompose.html` (this file is canonical) · **Answers:** `checkpoint-decompose.html` (hosted, db-backed)

Seven questions block the queue. D9 already approved the nine specs. This pass
audited them, added `[src: …]` cites to every Constraint and Acceptance
Criterion, and planned the waves. Three blockers came out of the audit.

## Prior knowledge reused

Retrieval terms: model profile, Context Map, autofix, implement-loop /
append-system-prompt, bundled-files, parallel-safe. Capped at 5 reads.

| Source | What it gives this decomposition |
|--------|----------------------------------|
| `docs/context/decision-log.md` 2026-09-22, Fable-native D1 | One profile doc. Skills cite path + heading. Brief D1 keeps one doc. No conflict. |
| `docs/context/decision-log.md` 2026-09-22, Fable-native D16 | A memory file with no Context Map gets the section + row. Spec 3 keeps that path. |
| `docs/context/decision-log.md` 2026-07-20, implement-feature row | Parallel-safe waves run as concurrent subagents in one tree. Drives the wave marks below. |
| `docs/discoveries/2026-07-29-test-suite-regenerates-bundles.md` | Each spec regenerates and syncs in its own commit. Checked 9/9: no spec defers sync. |
| `docs/discoveries/2026-09-22-fable-native-sdlc-harness.md`, "Existing tests cap skill file length" | Grep the caps when a skill is in scope. Found two caps that no spec names (D10, D11). |

No retrieved decision contradicts the brief. Brief D1 already approves the one
narrow change to Fable-native D14.

## Decomposition

| # | Spec | Description | Depends on | Size | Mode (proposed, M1) | Wave |
|---|------|-------------|-----------|------|---------------------|------|
| 1 | `retarget-profile-to-claude-doc` | Rename the profile to `model-profile-claude.md`, tag every block, add the Scope fallback rule, and move every path reference in one green commit. | — | L | isolated | 1 |
| 2 | `add-opus-5-5-blocks` | Add the four Opus 5.5 blocks: Calibrate Effort, Keep Working in Unattended Runs, Drop Thinking Instructions, Mark Untrusted Text. | 1 | M | checkpoint | 2 |
| 3 | `swap-profile-row-on-update` | The updater replaces the exact old Fable 5.1 Context Map row with the new row, in place and idempotent. | 1 | M | checkpoint | 2 |
| 4 | `cite-unattended-block-in-queue-loops` | implement-feature and implement cite Keep Working in Unattended Runs in their queue steps. Gate skills never do. | 2 | S | checkpoint | 3 |
| 5 | `append-instruction-in-pi-loop` | The Pi loop extracts the fenced instruction from the installed profile and passes it with `--append-system-prompt`. | 2 | S | checkpoint | 3 |
| 6 | `harden-autofix-prompt` | `autofix.yml` reads the CI log from a file outside the checkout, appends the instruction, and states the end state. | 2 | M | checkpoint | 3 |
| 7 | `add-untrusted-text-rule-to-intent-readme` | The intent README tells external writers to wrap third-party text in `pasted_content` tags. | 2 | S | checkpoint | 3 |
| 8 | `flag-thinking-rules-in-optimize` | Optimize Step 2c flags think-harder rules: RETIRE when every reader runs a covered model, else PROBATION. | 1, 2 | M | checkpoint | 3 |
| 9 | `dogfood-on-joycraft` | Run the built updater on this repo, set claude effort to medium, run Step 2c on AGENTS.md, and update CHANGELOG. | 1–8 | M | checkpoint | 4 |

Spec 9 has eight dependencies. It is the terminal dogfood gate that D9
approved, so it stays one spec.

## Execution waves

| Wave | Specs | Parallel-safe | Reason |
|------|-------|---------------|--------|
| 1 | 1 | — | One spec |
| 2 | 2, 3 | NO | Their files are disjoint. But both run `pnpm test` in one tree, the suite regenerates `src/bundled-files.ts`, and spec 3's update test installs the profile doc that spec 2 edits. |
| 3 | 4, 5, 6, 7, 8 | NO | Overlap: `src/bundled-files.ts` in all five |
| 4 | 9 | — | One spec |

The queue runs in order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

## Audit results

Nine Opus 5.5 auditors at medium effort each checked one spec against the brief and the tree at origin/main.

| Check | Result |
|-------|--------|
| Cites added | 109 across 9 specs. 14 are `[src: INVENTED]` (I1: 3, I2: 10, D12: 1). |
| Factual fixes applied in place | 8 (listed below) |
| Specs that defer sync | 0 |
| Blockers | 3: profile line cap (D10), optimize line cap (D11, found by the lead), this repo's intent README (D12) |

Factual fixes already in the spec files:

1. Spec 1: test-file count 8 → 7. `tests/dogfood-update.test.ts` keeps the old path until spec 9.
2. Spec 2: scope header 3 → 4 files.
3. Spec 5: scope header 3 → 5 files.
4. Spec 7: new Affected Files row for `src/update-inventory.ts`. Its `INTENT_README` constant must match the template (`tests/intent-template.test.ts`).
5. Spec 8: the citation test row moves to `tests/upgrade-optimize-v2.test.ts`. `tests/model-profile-citations.test.ts` does not cover optimize.
6. Spec 8: exact regenerated paths replace the generic row.
7. Spec 9: new row for `docs/templates/intent/README.md`, a manifest-tracked copy.
8. Spec 9: new Regenerate row for `src/bundled-files.ts` and the skill trees.

## Consistency fixes the lead applies after your answers

These trace to the brief or to a stamped decision. They add no new premise.

1. Spec 3: replace every exact legacy row in one pass, so that one run is idempotent (brief "Hard Constraints": a second run is a no-op).
2. Spec 3, when I1 approves rule 4: emit the diagnostic before the no-change early return in `contextMapPointerPatch` (`src/update-inventory.ts:584`). The swap runs on every `insertModelProfilePointer` caller. The diagnostic is update-only.
3. Spec 4: the codex|copilot|omp Step 4 has no citation today, so that region gets the Step 2 sentence only. The test also asserts the execution-mode pause wording.
4. Spec 5: keep `--append-system-prompt` on both Pi calls, because D2 names the whole loop. Add a success-path row: session-end runs once and the loop exits 0.
5. Spec 6: the "YAML still parses" AC gets a test that needs no new dependency (`ruby -ryaml` or python3 `yaml` when present, else skip).
6. Spec 7: the rule stays complete without the profile citation, because Codex-only installs have no profile doc. The test asserts the random-id wording.
7. Spec 8: paraphrase and cite Drop Thinking Instructions. The "copies no block prose" test fails on any repeated line over 60 characters.
8. Spec 9: when the plan marks `model-profile-claude.md` as a conflict, re-copy it from `src/templates/reference/` and rerun.
9. Spec 1: widen the "no old path in src" walk to the generated `src/*-skills/` trees. Add test rows for the doc comment and the process ACs.

## Questions for the human

| Id | Question | Recommendation |
|----|----------|----------------|
| D10 | How does the profile doc fit its 200-line test budget? It is at 183 lines. Spec 1 adds about 15 lines and spec 2 adds about 100. | Spec 1 raises the cap in `tests/model-profile-template.test.ts` to 320, with a reason comment |
| D11 | Optimize is at 283 of its 285-line cap (`tests/discovery-staleness.test.ts:107`). Spec 8 adds a rule class. | Spec 8 raises the cap by the lines it adds, at most +10, with a reason comment (precedent: 282 → 285) |
| D12 | This repo's `docs/intent/README.md` is create-once, so the updater never refreshes it. How does it get spec 7's section? | Spec 7 copies the section in by hand. Spec 9 asserts it. |
| D13 | When does a Claude Code project count as "covered" by the Opus 5.5-only Drop Thinking Instructions block? | Only when the running model or the Execution Profile row is Opus 5.5. Otherwise PROBATION. |
| M1 | Execution modes | Spec 1 isolated, specs 2–9 checkpoint |
| I1 | Three behaviors beyond the brief's rows (spec 3 rule-4 diagnostic, spec 5 README line, spec 6 missing-doc warning) | Approve all three |
| I2 | Ten guard-rail lines with no brief source (scope guards, test hygiene, the spec 9 plan review) | Approve all ten |

### INVENTED items, by spec

| Spec | Section | Line | Card |
|------|---------|------|------|
| 2 | Constraints | Write the new prose in the doc's plain style: short sentences, one idea each, no em-dashes. | I2 |
| 3 | Acceptance Criteria | Rule 4: a hand-edited line that still names the Fable path gets exactly one diagnostic and no write. | I1 |
| 3 | Constraints | Read the manifest-entry shape from `src/install-manifest.ts`. Do not hand-roll hashes. | I2 |
| 5 | Acceptance Criteria | The pi-scripts README mentions the appended instruction. | I1 |
| 6 | Acceptance Criteria | A missing doc produces one `::warning::` line and the call still runs. | I1 |
| 6 | Constraints | Keep `--dangerously-skip-permissions`, `--max-turns 20`, the exit-code capture, and every other step unchanged. | I2 |
| 6 | Constraints | Keep the placeholder tokens that `src/init-autofix.ts` substitutes. | I2 |
| 7 | Constraints | Keep the section under 15 lines, in the README's plain style. | I2 |
| 7 | Constraints | Do not change `src/templates/INTENT_TEMPLATE.md` or any skill. | I2 |
| 7 | Constraints | Do not hand-edit `docs/intent/README.md`, because spec 9's updater installs it. This is factually wrong: the updater never refreshes that file. | D12 |
| 8 | Constraints | Keep six dispositions and the existing evidence labels. | I2 |
| 8 | Acceptance Criteria | Evidence label and disposition counts are unchanged (same claim as the line above). | I2 |
| 9 | Constraints | Review the updater's plan before you apply it. Stop when it plans anything outside the named files. | I2 |
| 9 | Constraints | Run `/release-docs-sync` before opening the PR (AGENTS.md rule). | I2 |

## Review questions

1. Does this breakdown match how you think about this feature? D9 approved the nine rows. This pass changes no row.
2. Are any specs too big or too small? Spec 1 is L, and spec 9 depends on all eight others.
3. Do any specs need to run in parallel? The lead says no. See the wave table.
