---
status: in-review
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 5
phase: 1
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Add Data-Loss Labels and the Escape Script — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready
> **Date:** 2026-10-29
> **Estimated scope:** Small–medium; 3 files
> **Phase:** 1 — Gate fixes
> **Where:** `joycraft-field`

## What

Make G2 and G8 computable. (a) `bin/label.py` lists data-loss candidates (for example a reverted commit, a deleted file restored by hand, or a `git reset` in a transcript) and appends Max's answer to `~/.joycraft-field/labels.jsonl`, including an explicit "reviewed, none" record. (b) `bin/escapes.py` finds main-branch commits within 7 days of a spec's done time whose blamed lines fall in that spec's changed range, then asks Max to label each one real or not.

## Why

With no labels file and no escape script, missing data fails G2 and G8 by the frozen rule.

## Acceptance Criteria

- [ ] **AC1:** `label.py` writes valid records (`ts`, `alias`, `kind`, `ref`, `verdict`), and a "reviewed, none" record makes G2 computable with 0 losses.
- [ ] **AC2:** `escapes.py` lists the candidate commits for each done spec with the overlapping lines, and stores Max's verdicts.
- [ ] **AC3:** The ingest computes G2 and G8 from these files, and the digest shows them.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Fixture candidates → labels file content. | Unit, Python |
| AC2 | Fixture repo with a spec range and a later overlapping commit → one candidate. | Integration, Python |
| AC3 | Ingest a fixture labels file → G2/G8 values. | Unit, Python |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT label anything on Max's behalf.
- MUST NOT change gate definitions.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `bin/label.py` | Candidates + labels |
| Add | `bin/escapes.py` | Escape candidates |
| Modify | `bin/ingest.py` | G2/G8 |

## Approach

Read the candidates from the ledger and git. Use an interactive prompt with a `--list` mode for review in chat.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Spec with no recorded range | Report it as unmeasured, not as clean. |
