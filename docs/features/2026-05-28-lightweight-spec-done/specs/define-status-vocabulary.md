---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: batch
---

# Define Status Vocabulary — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / 1 new doc + 0 code

---

## What
Create a single canonical reference document that defines the spec-status lifecycle `todo → in-review → done`: what each state means, who (or what) transitions a spec into it, and the explicit mapping from the old vocabulary (`active`, `backlog`, `complete`, `shipped`) to the new. Every other spec in this feature — scripts, skills, migration — cites this doc as the source of truth. This spec writes the *contract*; the others conform code and data to it.

## Why
Without one authoritative definition, the queue JSON and frontmatter drift apart again (the exact bug this feature exists to kill — see the brief's "two unreconciled status systems"). The doc is the anchor that makes "unify to three words" verifiable instead of vibes.

## Acceptance Criteria
- [ ] A doc exists at `docs/reference/spec-status-lifecycle.md`
- [ ] It defines exactly three states — `todo`, `in-review`, `done` — each with: a one-line meaning, who/what transitions *into* it, and the glyph used by `joycraft-spec-status` (`[ ]` todo, `[~]` in-review, `[✓]` done)
- [ ] It documents the canonical state machine: `todo ──[spec-done]──> in-review ──[verify / session-end]──> done`
- [ ] It includes an explicit migration mapping table: `active→todo`, `backlog→todo`, `complete→done`, `shipped→done`
- [ ] It states the two hard invariants: (a) queue JSON `status` and frontmatter `status` always use the same three words; (b) the agent never self-certifies a spec to `done`
- [ ] It notes that "merged/shipped" is a git/PR fact, NOT a tracked spec status
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Doc exists at expected path | `tests/spec-status-lifecycle.test.ts`: assert `fs.existsSync` of the doc path | unit |
| Defines all three states | Read file; assert it contains the literal tokens `todo`, `in-review`, `done` and the three glyphs `[ ]`, `[~]`, `[✓]` | unit |
| Migration mapping present | Assert the doc body contains all four mappings (`active`→`todo`, `backlog`→`todo`, `complete`→`done`, `shipped`→`done`) | unit |
| Invariants stated | Assert the doc contains the phrases for "same three words" and "never self-certif" (agent self-certification prohibition) | unit |

**Execution order:**
1. Write all tests above — they should fail against current code (no doc, no test file)
2. Run tests to confirm they fail (red)
3. Create the doc until all tests pass (green)

**Smoke test:** `pnpm vitest run tests/spec-status-lifecycle.test.ts` — runs in seconds.

**Before implementing, verify your test harness:**
1. Run the new test — it MUST FAIL (the doc does not exist yet)
2. The test reads the actual file on disk, not a fixture copy
3. The single test file IS the smoke test — sub-second feedback

## Constraints
- MUST: place the doc under `docs/reference/` (the project's long-form reference home — create the dir if absent)
- MUST: use the exact three tokens `todo`, `in-review`, `done` (hyphenated `in-review`, never `in_review` or `inreview`) — every downstream spec greps for these
- MUST: ground the choice as the canonical engineering idiom (GitHub/Jira/Linear/Kanban), not invented — a one-line rationale citing prior art
- MUST NOT: change any code, script, skill, or existing spec in this spec — this is documentation only
- MUST NOT: introduce a fourth state (`implemented`/`verified` were considered and rejected — note this briefly)

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `docs/reference/spec-status-lifecycle.md` | The canonical lifecycle reference doc |
| Create | `tests/spec-status-lifecycle.test.ts` | Tests asserting the doc's required content |

## Approach
Write the doc as a tight reference, not an essay: a state table (state · meaning · transitioned-by · glyph), the ASCII state-machine line, the migration mapping table, and an "Invariants" section. Keep it ~40–60 lines. The tests assert on *content tokens* (state names, glyphs, mappings, key phrases) rather than exact prose so the doc can be edited for clarity without breaking tests — assert the contract, not the wording.

**Rejected alternative:** Embedding the vocabulary only inside each skill's prose (no standalone doc). Rejected because there'd be no single citable source — the very fragmentation this feature removes — and migration spec #2 would have nothing authoritative to conform to.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `docs/reference/` does not yet exist | Create it as part of this spec |
| A reader looks for "shipped" as a status | Doc explicitly states shipped/merged is a git fact, not a spec status, and maps old `shipped→done` |
| Future fourth state proposed | Doc records that `implemented`/`verified` were rejected and why (no major tool uses them) |
