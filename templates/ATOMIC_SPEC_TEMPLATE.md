# [Verb + Object] — Atomic Spec

> **Parent Brief:** `docs/briefs/YYYY-MM-DD-feature-name.md` (or "standalone")
> **Status:** Draft | Ready | In Progress | Complete
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / 2-3 files / ~N lines]

---

## What

One paragraph. What changes when this spec is done? A developer with no context should understand the change in 15 seconds.

## Why

One sentence. What breaks, hurts, or is missing without this? Links to the parent brief if part of a larger feature.

## Acceptance Criteria

- [ ] [Observable behavior — what a human would see/verify]
- [ ] [Another observable behavior]
- [ ] [Regression: existing behavior X still works]
- [ ] Build passes
- [ ] Tests pass

> These are your "done" checkboxes. If Claude says "done" and these aren't all green, it's not done.

## Constraints

- MUST: [hard requirement]
- MUST NOT: [hard prohibition]
- SHOULD: [strong preference, with rationale]

> Use RFC 2119 language. 2-5 constraints is typical. Zero is a red flag — every change has boundaries.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `path/to/file.ts` | [brief description] |
| Modify | `path/to/file.ts` | [what specifically changes] |

## Approach

How this will be implemented. Not pseudo-code — describe the strategy, data flow, and key decisions. Name one rejected alternative and why it was rejected.

_Scale to complexity: 3 sentences for a bug fix, 1 page max for a feature. If you need more than a page, this spec is too big — decompose further._

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| [what could go wrong] | [what should happen] |

> Skip for trivial changes. Required for anything touching user input, data, or external APIs.

---

## Template Usage Notes

**What makes a good atomic spec:**
- Fits entirely in Claude's working memory without competing with other specs
- Can be executed in a single session (1-3 hours of Claude work)
- Produces an independently committable, independently testable change
- Doesn't require reading other specs to understand

**Size test:** If the Affected Files table has more than 8 rows, consider splitting. If the Acceptance Criteria has more than 8 items, consider splitting.

**Naming convention:** `docs/specs/<feature-name>/verb-object.md` (e.g., `docs/specs/terminal-detection/add-tests.md`). The feature-name is derived from the parent brief filename (strip the date prefix and `.md`). Spec filenames use `verb-object.md` format — no date prefix (the brief and git history provide dating).

**Relationship to Feature Brief:** A Feature Brief decomposes into N atomic specs. Each atomic spec is self-contained — it includes enough context that Claude can execute it without reading the brief. The brief is for humans; the specs are for Claude.

**Relationship to Implementation Plan:** For simple specs (1-3 files), the spec IS the plan — no separate plan needed. For complex specs (4+ files, multiple steps), create an implementation plan from the spec using IMPLEMENTATION_PLAN_TEMPLATE.md.

**After execution:** Record any surprises/gotchas in a DISCOVERIES.md that travels with the PR.
