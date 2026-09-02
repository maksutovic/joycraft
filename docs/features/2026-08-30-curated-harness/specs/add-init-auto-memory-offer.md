---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Add Init Auto-Memory Offer — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / 2 files / ~80 lines

---

## What

`joycraft init` gains an interactive offer to write `"autoMemoryEnabled": false` into the **project's** `.claude/settings.json`, with a one-line explanation of why (one home for facts: the in-repo curated layer supersedes hidden per-machine auto-memory). The write follows init's existing guarded settings pattern: only set when absent (never clobber an explicit user value), skip on malformed JSON, default answer is no-change.

## Why

A Joycraft project and Claude Code auto-memory are two homes for the same class of fact — the ONE_HOME condition optimize exists to flag; approved in principle (per-project disable, Max, 2026-08-30).

## Acceptance Criteria

- [ ] init interactively offers the disable with a one-line rationale; declining (and the default) changes nothing [src: design §4]
- [ ] Accepting writes `"autoMemoryEnabled": false` to the project's `.claude/settings.json` only — never the user's global settings [src: design §4]
- [ ] An existing explicit `autoMemoryEnabled` value (true or false) is never clobbered — the offer is skipped or a no-op [src: design §4]
- [ ] Malformed `.claude/settings.json` → skip with a note, never corrupt [src: design §1]
- [ ] The ask uses the one-readline-per-prompt idiom with a pure, tested answer parser [src: design §1]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Accept path | temp project, simulated "yes" → settings.json contains the key, other keys preserved | integration |
| Decline/default path | simulated "no"/empty → file untouched | integration |
| Never clobber | pre-existing `autoMemoryEnabled: true` → unchanged, no prompt or prompt no-ops | unit |
| Malformed guard | garbage settings.json → skipped, file byte-identical, note printed | unit |
| Parser purity | answer parser unit-tested standalone (yes/no/empty/garbage) | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the never-clobber unit test (`pnpm test tests/init.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: write project scope only (`./.claude/settings.json`); never touch `~/.claude/settings.json` [src: design §4]
- MUST: be an interactive ask defaulting to no-change — never a silent write [src: design §4]
- MUST: copy the existing idempotent guarded pattern at `src/init.ts:369-440` (only-set-when-absent + malformed-JSON skip) [src: design §3]
- MUST: use the one-readline-per-prompt idiom with a pure parser (`src/harness.ts:73-96` pattern) [src: design §1]
- MUST NOT: delete or modify any existing memory directory — this spec is the settings offer only; cleanup guidance is spec `add-tune-auto-memory-finding` [src: design §2 WS6]
- MUST NOT: overwrite user files without confirmation [src: brief "6. Recommend disabling" — "ask-first, it touches user config"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/init.ts` | Offer prompt + guarded settings write, alongside the existing settings.json writers |
| Modify | `tests/init.test.ts` | Cases per Test Plan |

## Approach

Slot the offer into init's existing interactive sequence (after harness selection, with the other `.claude/settings.json` writes so the file is opened/merged once). Rationale line in the prompt: the project's curated layer (AGENTS.md, decision log, discoveries + Reaper) is the one home; per-project disable leaves the user's other projects untouched. In non-interactive contexts (no TTY), skip the offer entirely — no default write. Rejected alternative: global recommendation (overreach into other projects) and silent write (violates the never-overwrite boundary) — both named in design §4.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No `.claude/` dir yet | Created as part of the accepted write, per existing init behavior |
| `settings.local.json` sets the key | Out of scope — project settings write proceeds; local file wins per Claude Code precedence, note nothing |
| Re-running init (upgrade path) | Key already present → skipped, honoring selection persistence |
| CI/non-TTY | Offer skipped silently |
