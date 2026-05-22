---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Add Context Map Section — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / ~3 files + tests / ~80 changed lines

---

## What
Three discoverability surfaces, all owned here because they touch the same two files (`improve-claude-md.ts`, `init.ts`) and serve one goal — a first-timer sees `/joycraft-setup` and a `## Context Map`:

1. **`## Context Map` stub.** A single `generateContextMapSection()` helper produces a stub: an H2 header carrying a lean-CLAUDE.md teaching line ("Keep this file lean — link out, don't inline"), a one-line description of the section's purpose, and an empty `| Document | Read it when… |` table skeleton (header row + separator, no fake/dangling pointer rows). Emitted in BOTH paths: fresh `init` CLAUDE.md generation and the `improve-claude-md.ts` merge path, guarded idempotently by `hasSection(sections, /context\s*map/i)` so it is created-or-skipped, never duplicated.
2. **Getting-Started table leads with `/joycraft-setup`.** The generated "Getting Started with Joycraft" table in `improve-claude-md.ts` (currently leads `/joycraft-tune` then `/joycraft-new-feature`) leads with `/joycraft-setup` as the one obvious first-run door.
3. **`init.ts` next-steps lead with `/joycraft-setup`.** The printed next-steps (currently lead with `/joycraft-new-feature` at ~`init.ts:296`) lead with `/joycraft-setup`.

## Why
CLAUDE.md has no home for "what to read on demand," and a no-harness newcomer is currently pointed at `/joycraft-new-feature` (a feature-building command) instead of the setup door — undercutting the feature's onboarding thesis.

## Acceptance Criteria
- [ ] A `generateContextMapSection()` helper exists and returns a stub: H2 `## Context Map`, the lean-docs teaching line, and an empty `Document | Read it when…` table skeleton with no data rows.
- [ ] Fresh `init` CLAUDE.md generation includes the `## Context Map` section.
- [ ] `improve-claude-md.ts` merge path adds `## Context Map` only when absent (`hasSection(/context\s*map/i)`), and re-running on a file that already has one does not duplicate it (idempotent).
- [ ] The generated Getting-Started table's first row is `/joycraft-setup`.
- [ ] `init.ts` printed next-steps first actionable command is `/joycraft-setup`.
- [ ] Both code paths call the SAME `generateContextMapSection()` helper (no copy-paste divergence).
- [ ] `pnpm test --run && pnpm typecheck` pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Helper returns stub shape | unit: `generateContextMapSection()` output contains `## Context Map`, teaching line, `Read it when`, and zero data rows | unit |
| Fresh init includes section | run init scaffold into a temp dir, read generated CLAUDE.md, assert `## Context Map` present | integration |
| Merge adds when absent | feed a CLAUDE.md with no Context Map to `improveClaudeMd`, assert section appended | unit (existing improve-claude-md.test.ts pattern) |
| Merge idempotent | feed a CLAUDE.md that already has `## Context Map`, assert exactly one occurrence after merge | unit |
| Getting-Started leads with setup | assert generated Getting-Started table's first command row references `/joycraft-setup` | unit |
| init next-steps lead with setup | capture init's printed next-steps, assert first command is `/joycraft-setup` | integration |
| Build green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Write the unit + integration tests above against `generateContextMapSection`, `improveClaudeMd`, and init scaffolding — they FAIL (helper/section don't exist; tables/next-steps lead with old commands).
2. Confirm red.
3. Implement the helper, wire both paths, update tables/next-steps until green.

**Smoke test:** the `generateContextMapSection()` unit test — runs in milliseconds, fastest feedback on the stub shape and idempotency string.

**Before implementing, verify your test harness:**
1. Run the new tests — they must FAIL (no helper, old table order).
2. Tests call the actual `generateContextMapSection`/`improveClaudeMd` exports and the real init scaffold, not a reimplementation.
3. The helper unit test is the seconds-scale smoke test.

## Constraints
- MUST reuse one `generateContextMapSection()` helper across both init and merge paths (Decision 9 — keep them in sync).
- MUST keep the stub honest: header + teaching line + empty table skeleton only; NO fabricated/dangling pointer rows (design Section 4).
- MUST keep the merge idempotent via `hasSection(sections, /context\s*map/i)` following the existing `generate…Section()` + push pattern (`improve-claude-md.ts:173-227`).
- MUST NOT auto-populate rows for the 5 fact-docs (they may not exist yet).
- MUST NOT remove existing Getting-Started entries — only reorder so `/joycraft-setup` leads.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/improve-claude-md.ts` | add `generateContextMapSection()`; push it when `!hasSection(/context\s*map/i)`; reorder Getting-Started table to lead with `/joycraft-setup` |
| Edit | `src/init.ts` | include `## Context Map` in fresh CLAUDE.md generation (via the shared helper); next-steps lead with `/joycraft-setup` |
| Edit | `tests/upgrade.test.ts` or `tests/init.test.ts` (whichever covers improve-claude-md) | add the unit/integration assertions above |

## Approach
Add `generateContextMapSection()` next to the other `generate…Section()` helpers in `improve-claude-md.ts` and export it (or place it where both `init.ts` and the merge path can import it without a cycle — if init.ts already imports from improve-claude-md.ts, reuse that edge). Mirror the existing self-contained stub-section style. For the Getting-Started table, this is a row reorder + one new `/joycraft-setup` row, not a rewrite. For init next-steps, swap the lead line. The `/joycraft-setup` skill itself is created in a separate spec (`add-setup-alias-skill`); this spec only references it in generated text — referencing a not-yet-shipped skill name in generated docs is fine and decouples the waves.

Rejected alternative: pre-populating Context Map rows for the 5 fact-docs at init — produces dangling pointers to files that may not exist (design Section 4, rejected).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| CLAUDE.md already has a user-authored `## Context Map` | `hasSection` matches → skip; never duplicate or clobber user rows |
| Header casing differs (`## context map`) | `/context\s*map/i` is case-insensitive → matches, skipped |
| Fresh project with no docs/context yet | Stub renders with empty table; rows added later by add-context/gather-context |
| improve runs twice in a row | Second run is a no-op for the section (idempotent) |
