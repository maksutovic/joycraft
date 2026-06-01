---
status: done
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Add gather-context Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / 2 new files / ~150 lines each

---

## What
A new `/joycraft-gather-context` skill (Claude `src/claude-skills/joycraft-gather-context.md` + Codex mirror) that owns the first-run **read-then-offer** onboarding pass — the lowest-intervention way to populate the context layer. It composes the two single-doc primitives (`add-fact` routing for operational facts, `add-context` scaffolding for long-form reference) but is itself the guided multi-doc pass. Flow:

1. **Read what exists first.** Scan README(s), `docs/**` (existing design/architecture/style docs), `docs/context/*`, and current CLAUDE.md content. Summarize for the user what context already exists and what's covered. (Scan breadth is README + `docs/` + CLAUDE.md only — NOT a code-inference scan; offer a deeper "full review" ONLY if the user explicitly asks, with a clear note that it costs more tokens.)
2. **Offer, don't force.** Identify gaps (no design-system doc? no production map? no decision log?) and offer an *optional, gap-only* interview. The user can decline any or all. Never re-interview for a doc that already has real content (per-doc skip guard, not all-or-nothing).
3. **Route by shape (inline test).** "Could this be one row in a table?" → operational fact → one of the 5 flat `docs/context/*.md` fact-docs (inline `add-fact`'s routing). "Does explaining it take paragraphs?" → reference → `docs/context/reference/<slug>.md` from a template (inline `add-context`'s scaffolding). The skill MUST inline this minimal routing — it cannot import another skill (gotcha #3).
4. **Batch-write + one confirm.** Collect ALL gap answers, then write everything (fact rows + reference docs) AND the `## Context Map` rows in ONE batch with a final confirm ("do it in one go"). One clean reviewable diff at the end.

## Why
A first-timer has no guided way to populate the context layer; `tune`'s current Step-5 interview is narrow (risk only), gated behind an existing harness, and skips entirely if `docs/context/` has any content — it never reads existing docs or gathers reference context.

## Acceptance Criteria
- [ ] `src/claude-skills/joycraft-gather-context.md` exists with frontmatter; the `description` carries onboarding vocabulary distinct from `add-fact`'s operational signal-words so they don't cross-trigger.
- [ ] The body scans README + `docs/` + CLAUDE.md, summarizes coverage, and does NOT auto-run a code-inference scan (offers a deeper review only on explicit user request, with a cost note).
- [ ] The body offers a gap-only optional interview and explicitly skips any doc that already has real content (per-doc, not all-or-nothing).
- [ ] The body inlines the shape-routing test (one-row→fact bucket; paragraphs→reference doc) — self-contained, no instruction to import `add-fact`/`add-context`.
- [ ] The body collects all answers, then writes all docs + Context Map rows in ONE batch with a final confirm.
- [ ] `src/codex-skills/joycraft-gather-context.md` is a content-identical Codex mirror (`$` sigil, `.agents/`, "deny patterns configuration", no `instructions:` field).
- [ ] Both files use project-relative paths only.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Claude skill exists + frontmatter | grep `name:`/`description:`/`instructions:` in the Claude file | integration (grep) |
| Onboarding vocab, no cross-trigger | assert `description` contains onboarding/first-run words, distinct from `add-fact`'s phrasing | integration (content) |
| Scan breadth limited | body mentions README + `docs/` + CLAUDE.md scan and gates code-inference behind explicit ask + cost note | integration (content) |
| Gap-only, per-doc skip | body states it skips docs that already have real content (per-doc) | integration (content) |
| Inline shape routing | body contains the "one row → fact / paragraphs → reference" test and does NOT say "call add-fact" as a dependency | integration (content) |
| Batch write + final confirm | body states answers are collected then written in one batch with a final confirm | integration (content) |
| Codex mirror parity | diff Claude vs Codex; only platform lines differ; Codex `$joycraft-`, no `/joycraft-`, no `instructions:` | integration (grep + diff) |
| Project-relative paths | grep for absolute/repo paths returns nothing | integration (grep) |

**Execution order:**
1. Write the grep/content assertions reading the two files — they FAIL (files absent).
2. Confirm red.
3. Author both skills until green.

**Smoke test:** the existence + Codex-sigil grep — sub-second.

**Before implementing, verify your test harness:**
1. Run the assertions — they must FAIL (skill files absent).
2. Assertions read the real bundled skill files, not drafts.
3. The existence+sigil grep is the seconds-scale smoke test.

## Constraints
- MUST be self-contained (gotcha #3) — inline the minimal shape-routing test; do NOT instruct it to import `add-fact`/`add-context`. (`add-fact` and `add-context` remain the standalone single-doc primitives.)
- MUST batch-write: collect all gap answers, then write all docs + Context Map rows in ONE batch with a final confirm (Decision 12, option B) — NOT per-answer writes.
- MUST limit the default scan to README + `docs/` + CLAUDE.md; code-inference only on explicit user request with a cost note (Decision 8 / design Section 4).
- MUST never re-interview a doc that already has real content (per-doc skip).
- MUST carry onboarding vocabulary in `description`, distinct from `add-fact`'s signal-words.
- Codex mirror MUST be content-identical with only documented platform swaps; `$` sigil; no `instructions:`.
- MUST use project-relative paths only.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-gather-context.md` | New onboarding pass: read → offer → route → batch-write |
| Create | `src/codex-skills/joycraft-gather-context.md` | Codex mirror (content-identical, platform swaps) |

## Approach
Structure: Step 1 read+summarize, Step 2 gap detection + optional interview (per-doc skip), Step 3 inline shape routing (copy the minimal fact-vs-reference test from the brief Decision 6 wording), Step 4 batch write + final confirm. Borrow the "skip-if-content" guard idea from tune's Step 5 but make it per-doc. Reuse `add-context`'s reference-doc scaffolding *as inlined guidance* (not an import) since this spec is written after `add-add-context-skill`. Write the Claude file, then derive the Codex mirror with documented swaps only. Do NOT regenerate `bundled-files.ts` here.

Depends on `add-add-context-skill` so the inlined reference-scaffolding guidance matches the real `add-context` behavior and the `docs/context/reference/` + `## Context Map` conventions are already pinned down.

Rejected alternative: inlining this whole flow into `tune` — bloats tune's lean instruction budget and makes the gather pass non-reusable outside first-run (brief Part C rationale).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `docs/context/` already fully populated | Summarize coverage; offer nothing to fill (or only genuine gaps); no re-interview |
| Some docs have content, others don't | Per-doc skip — interview only the empty/missing ones |
| User declines all gaps | Write nothing beyond what already exists; pass ends gracefully |
| User explicitly asks for a deep/code-inference review | Offer it with a clear cost note; still not the default |
| A gathered item is ambiguous (fact vs reference) | Apply the inline test; one-row → fact bucket, paragraphs → reference doc |
| User aborts at the final confirm | Nothing is written (batch model — no partial writes) |
