---
status: done
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Add Codex Telemetry Parser — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / 2 files / ~150 lines

---

## What

A best-effort Codex transcript parser added behind the same scanner interface built in `add-telemetry-scanner-core`. Codex transcripts (`~/.codex/sessions/.../rollout-*.jsonl`) record file operations only as `exec_command` shell strings, so this parser extracts knowledge-layer reads/writes by parsing command text (`cat`, `sed -n`, `head`, `grep` targets, redirects) and labels its output degraded fidelity.

## Why

Without it, codex-only installs get zero telemetry evidence; pretending structured parity instead would produce false RETIRE evidence.

## Acceptance Criteria

- [ ] The Codex parser plugs into the same `scanTranscripts` interface and result shape as Claude/Pi [src: design §4]
- [ ] Scan results from Codex sessions carry a `fidelity: "degraded"` marker distinguishable by consumers [src: design §4]
- [ ] Common read commands (`cat`, `head`, `tail`, `sed -n`, `grep` with a knowledge-layer path argument) are detected as reads; output redirects to knowledge-layer paths are detected as writes [src: design §1]
- [ ] Unparseable command strings are skipped, never thrown [src: design §3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Same interface | `scanTranscripts` with a `codexDir` fixture returns the shared result shape | unit |
| Degraded marker | Codex-sourced counts carry `fidelity: "degraded"` | unit |
| Command detection | fixture `exec_command` strings (cat/sed/grep/redirect) → correct read/write ops | unit |
| Unparseable commands | pipeline soup and quoting edge cases → skipped without error | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the command-detection test (`pnpm test tests/telemetry.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: ship behind the same scanner interface as Claude/Pi, clearly labeled degraded [src: design §4]
- MUST: keep Claude + Pi as the v1 fidelity targets — Codex detection is best-effort, no parity claim [src: design §4]
- MUST: follow the `parseSessionLine(line): FileOp | null` per-harness idiom established by spec 1 [src: design §3]
- MUST NOT: block or gate any other telemetry behavior on Codex parse quality [src: design §4]
- MUST NOT: tag Codex reads `voluntary` when skill attribution cannot be established from shell strings — default to `mandated` (the conservative direction established in spec 1's classifier) [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/telemetry.ts` | Codex line parser + `codexDir` option on the entry point + `fidelity` field |
| Modify | `tests/telemetry.test.ts` | Codex parsing cases + fixture `rollout-*.jsonl` under `tests/fixtures/transcripts/` |

## Approach

Add `parseCodexLine(line): FileOp | null`: JSON-parse the rollout event, extract the `exec_command` string, tokenize conservatively, and match knowledge-layer path arguments against the shared filter. Only high-confidence patterns count (single command with an explicit path argument); anything piped/compound beyond recognition is dropped rather than guessed. Rejected alternative: a full shell grammar parser — unbounded effort for evidence that is advisory anyway.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `cat docs/context/decision-log.md \| head -50` | Counted as one read of the doc |
| `echo foo > docs/context/notes.md` | Counted as a write |
| `grep -r term docs/` | Dropped — directory target, not a doc-level op |
| Quoted paths with spaces | Handled by the tokenizer or dropped, never miscounted |
| Codex dir absent | Empty result for Codex, no error |
