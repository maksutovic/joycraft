---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Wire Session-End Telemetry — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / skill source + generated/installed copies + tests / ~15 net lines in the skill

---

## What

`joycraft-session-end` gains a short step that invokes the telemetry scan via `npx joycraft telemetry` and continues gracefully when the command is unavailable or fails — the skipped state surfaces downstream as `INACCESSIBLE` evidence in optimize, not as a session-end error. The step is a citation-weight addition: invoke, one-line result, move on. No scan logic lives in the skill.

## Why

D2 puts the scan at session-end (regular cadence, every feature) so evidence stays fresh for optimize's rare invocations; without this wiring the scanner exists but never runs.

## Acceptance Criteria

- [ ] session-end contains a step invoking `npx joycraft telemetry` at wrap-up [src: D2]
- [ ] The step degrades gracefully: npx missing, package unavailable, or command failure → note and continue, never block wrap-up [src: D3]
- [ ] The skill carries no inline scan logic — invocation and result reporting only [src: brief "Hard Constraints"]
- [ ] Net skill growth is paid for: session-end (211 lines, over the 200 budget) grows only by the lines the new behavior needs, offset by same-commit trims or citations [src: design §4]
- [ ] Generated (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`) and installed (`.claude/`, `.agents/`, `.pi/`, `.github/`) copies are regenerated and synced in the same commit [src: design §2 WS3]
- [ ] `tests/session-end-rescope.test.ts` (3-variant parity) passes, updated in the same commit if pinned regions shift [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Step present | skill content test asserts the telemetry invocation step exists in the canonical source | unit |
| Graceful-skip wording | content test asserts the skip path is stated (unavailable → note + continue) | unit |
| No inline logic | content test asserts no transcript-parsing instructions in the skill body | unit |
| Copies in sync | existing bundle-regen/sync tests green after `pnpm sync-skills` | integration |
| 3-variant parity | `tests/session-end-rescope.test.ts` green | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/session-end-rescope.test.ts`.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: invoke via `npx joycraft telemetry`; the scanner ships in the package, not as skill prose or an installed script [src: D3]
- MUST: skip gracefully when unavailable; absent telemetry is represented downstream as `INACCESSIBLE`, never a failure [src: D3]
- MUST: pay for added lines with same-commit trims or citations in the over-budget skill [src: design §4]
- MUST: edit `src/skills/joycraft-session-end.md` only (canonical source); regenerate + sync copies same-commit [src: design §1]
- MUST NOT: carry inline scan logic in any skill [src: brief "Hard Constraints"]
- MUST NOT: reference literal absolute paths in the skill text [src: design §3]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-session-end.md` | New telemetry invocation step + paying trims |
| Modify | `src/{claude,codex,pi,copilot}-skills/joycraft-session-end.md` | Regenerated |
| Modify | `.claude/.agents/.pi/.github skill trees (session-end)` | Synced via `pnpm sync-skills` |
| Modify | `tests/session-end-rescope.test.ts` | Updated pins if sliced regions shift |

## Approach

Place the invocation late in wrap-up (after discovery capture, before/with the commit step) so the scan sees the finished session state. Wording pattern: "Run `npx joycraft telemetry`. When the command is unavailable or fails, note it in one line and continue — optimize reports the gap as `INACCESSIBLE`." Pay lines by tightening existing prose in the same file. Rejected alternative: invoking the scan from optimize only — stale between rare optimize runs (D2's rejected option).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| npx resolves a stale cached joycraft without the subcommand | Command errors → skip path fires, wrap-up continues (npx-cache caveat known from 0.7.10) |
| Offline machine | npx fails fast → skip path |
| Non-Joycraft-scaffolded project | CLI notes nothing to do → skip path |
| Isolated-mode per-spec session-end | Scan runs each time; store dedupe (spec 3) keeps counts correct |
