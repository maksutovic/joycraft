---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: checkpoint
---

# Add Optimize Telemetry Evidence — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / skill source + copies + 2 test files / ~25 net lines in the skill

---

## What

`joycraft-optimize` consumes `docs/.joycraft/telemetry.json` and its evidence vocabulary grows from exactly five to exactly seven labels: `NEVER_READ` (≥1 write, 0 voluntary reads) and `WRITE_HEAVY` (≥3:1 writes:voluntary reads) join the existing five. A telemetry-backed healthy row is `VERIFIED`; absent/unreadable telemetry is `INACCESSIBLE`. Reaper RETIRE recommendations cite the counts under the pre-committed thresholds recorded in design §2 WS1.

## Why

Without telemetry evidence in optimize, Reaper dispositions stay judgment-only — the whole point of the earn-your-keep workstream is defensible RETIRE recommendations.

## Acceptance Criteria

- [ ] The evidence vocabulary is exactly seven labels, no synonyms; `NEVER_READ` and `WRITE_HEAVY` carry the D4 definitions verbatim [src: D4]
- [ ] optimize reads `docs/.joycraft/telemetry.json`; a row is `VERIFIED` only when this run read the file, absent telemetry is `INACCESSIBLE` [src: design §3]
- [ ] Reaper RETIRE recommendations cite counts under the pre-committed rules: 30 sessions or 60 days with zero voluntary reads → RETIRE candidate; voluntary reads in >20% of feature-shaped sessions → survives; aggregate voluntary reads below ~1 per 10 sessions at the 30-session mark → collapse the four non-decision-log docs; 60 days unresolved → default shrink; troubleshooting-class docs get the insurance exemption [src: brief "Hard Constraints"]
- [ ] The report includes the team-scale note: past ~3 contributors, per-user counts must merge at optimize time (aggregates, never transcripts) before telemetry evidence backs RETIRE [src: design §2 WS1]
- [ ] Vocab prose and tests update in the same spec/commit [src: D4]
- [ ] Net skill growth in optimize (266 lines, over budget) is paid for with same-commit trims or citations [src: design §4]
- [ ] Generated and installed copies regenerated + synced same-commit [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Exactly seven | update `tests/add-reaper-pass.test.ts` / `tests/upgrade-optimize-v2.test.ts` label-count pins from five to seven | unit |
| Label definitions | content test asserts the `NEVER_READ` and `WRITE_HEAVY` definition strings | unit |
| VERIFIED discipline | content test asserts the telemetry-read step and the `INACCESSIBLE` fallback wording | unit |
| Threshold prose | content test asserts the 30-session / >20% / ~1-per-10 / 60-day / insurance-exemption rules are present | unit |
| Copies in sync | bundle-regen/sync tests green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/add-reaper-pass.test.ts`.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: grow the vocabulary to exactly seven with the same no-synonyms rule; `NEVER_READ` = ≥1 write and 0 voluntary reads, `WRITE_HEAVY` = ≥3:1 writes:voluntary reads [src: D4]
- MUST: count only voluntary reads toward retire/keep evidence [src: brief "Hard Constraints"]
- MUST: keep the pre-committed thresholds as recorded — they are not re-litigated at implementation time [src: brief "Hard Constraints"]
- MUST: keep evidence labels disjoint from dispositions, preserving the existing table shape `| Control | Home File | Disposition | Evidence | Reason |` [src: design §1]
- MUST: pay for added lines same-commit; the budget check itself stays advisory [src: design §4]
- MUST NOT: mark any row `VERIFIED` without having read `telemetry.json` this run [src: design §3]
- MUST NOT: introduce a separate ratio column or marker rows — one report surface, labels only [src: D4]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-optimize.md` | Evidence vocab five→seven, telemetry-read step, Reaper threshold rules, team-scale note, paying trims |
| Modify | `src/{claude,codex,pi,copilot}-skills/joycraft-optimize.md` | Regenerated |
| Modify | `.claude/.agents/.pi/.github skill trees (optimize)` | Synced |
| Modify | `tests/add-reaper-pass.test.ts` | Label pins + new definition assertions |
| Modify | `tests/upgrade-optimize-v2.test.ts` | Vocab pins updated |

## Approach

Extend the existing evidence-label block (skill lines ~48–58) in place so the exactly-N contract stays one greppable list. Put the threshold rules inside the Reaper pass section as a compact table, citing `telemetry.json` as the source. Pay lines by converting existing explanatory prose to citations of `docs/reference/knowledge-lifecycle.md` where spec 6 lands the lifecycle text. Rejected alternative: a read/write ratio column with labels unchanged — verdicts not greppable (D4's rejected option).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| telemetry.json exists but is malformed | Treat as absent → `INACCESSIBLE`, note the corruption |
| Doc created yesterday, zero reads | Not `NEVER_READ`-actionable — probation thresholds (30 sessions/60 days) gate the RETIRE citation |
| Troubleshooting doc with zero voluntary reads | Insurance exemption — healthy baseline is near-zero |
| Codex-only degraded counts | Labels still apply; report notes degraded fidelity |
| Multi-contributor repo | Team-scale note fires — no RETIRE backed by single-machine counts past ~3 contributors |
