---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: batch
---

# Gate Contract Tests — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 1 file created / ~120 lines

---

## What

Create `tests/gate-contract.test.ts` asserting, against the canonical
`src/skills/` sources, that the succinct-gates contract holds:

1. **Slot template presence** — each of the seven gate skills
   (new-feature, design, decompose, research, decide, tune, optimize)
   contains the inline chat template marker (`Ten lines maximum`) exactly
   once, anchored under a report/present heading (nearest preceding heading
   idiom, matching `tests/output-style-pointer.test.ts`).
2. **Render step presence** — each of the six render-step skills (all but
   decide) cites `REVIEW_GATE_TEMPLATE.html` and carries the headless no-op
   phrase (`print the absolute path and continue`) and the D4 canonical-md
   marker (the word `canonical` within the render step block).
3. **Decide pre-presentation rule** — each of the five question-bearing
   skills (new-feature, design, decompose, research, bugfix) contains
   `before presenting`.
4. **Handoff briefing presence** — each handoff-emitting skill (new-feature,
   interview, decompose, design, research, decide, bugfix, session-end)
   contains the briefing marker (`Done when:`) inside a fenced block near its
   handoff heading (spec 7).
5. **Execution-profile injection** — decompose, new-feature, and
   implement-feature reference the `joycraft:execution-profile` sentinel
   (spec 9), and implement-feature states the model/effort spawn-param
   mapping.
6. **Negative control** — `joycraft-setup` contains none of the markers
   (same exclusion logic as the pointer test).

Also fold the spec-1 template static-shape assertions here if they were
authored as a separate file, or leave them in
`tests/review-gate-template.test.ts` — one home, no duplication.

## Why

The 0.7.3 incident shipped twelve stale skills because nothing mechanical
guarded the contract. Prose instructions regress silently; a string assertion
does not.

## Acceptance Criteria

- [ ] All six assertion groups implemented against `src/skills/` sources.
- [ ] Tests FAIL if any gate skill loses its template, render step, or decide
  rule (verified by mutation: temporarily delete one marker, observe red).
- [ ] Tests are position-tolerant — they assert presence + heading anchoring,
  never character offsets (no new fragile windows).
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Assertion groups 1–6 | the new test file itself | unit |
| Red on mutation | delete a marker in a scratch copy, run suite, confirm failure, restore | manual |
| No new fragility | assertions use heading-anchored search, mirrored from `output-style-pointer.test.ts` | review |

**Execution order:**
1. Write the test file — it must PASS against specs 2–4, 7, and 9's
   completed edits (this spec depends on them) and FAIL against a mutated
   copy
2. Run the mutation check (red), restore (green)
3. Wire into the default `pnpm test` run (vitest picks up `tests/*.test.ts`
   automatically)

**Smoke test:** `pnpm test -- gate-contract` — sub-second string assertions.

**Before implementing, verify your test harness:**
1. Run the mutation check — if deleting a marker doesn't fail, you're testing
   the wrong tree (installed copies instead of `src/skills/`)
2. Tests read `src/skills/*.md` directly — not `.claude/skills/`
3. Smoke test above runs in seconds

## Constraints

- MUST: read canonical `src/skills/` sources — the byte-match parity tests
  already guard generated/installed trees.
- MUST: mirror the heading-anchor helper from
  `tests/output-style-pointer.test.ts` rather than inventing a second idiom.
- MUST NOT: assert prose quality, tone, or length of skill text (RF-KILL-2).
- MUST NOT: create character-offset windows.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `tests/gate-contract.test.ts` | the four assertion groups |

## Approach

Table-driven: one array of `{skill, markers[]}` rows per assertion group,
one `it` per row for readable failures. Reuse the existing file-read and
heading-anchor helpers.

Rejected alternative: asserting the full template text byte-for-byte in each
skill — rejected because gates legitimately adapt the nouns; the invariant is
the cap sentence and the slots, not the exact prose.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A future eighth gate skill is added without markers | not caught here — the test is allowlist-driven; the README notes the list must grow with new gates |
| Marker appears twice in one skill (copy-paste) | "exactly once" assertion fails — duplication is drift |
