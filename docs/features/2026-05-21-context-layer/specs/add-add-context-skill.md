---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Add add-context Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / 2 new files / ~120 lines each

---

## What
A new `/joycraft-add-context` skill (Claude `src/claude-skills/joycraft-add-context.md` + Codex mirror `src/codex-skills/joycraft-add-context.md`) that scaffolds ONE long-form reference doc and wires its pointer into CLAUDE.md. Flow:

1. Determine the doc's topic and pick the matching bundled template (`design-system`, `frontend-methodology`, `backend`, `testing`, or the generic `reference-doc` fallback) from `docs/templates/context/reference/` in the user project.
2. Scaffold it to `docs/context/reference/<slug>.md` — **lazy-create `docs/context/reference/`** on first write (no preemptive dir).
3. Write the doc content **immediately, per-doc** (this is the single-doc primitive; write-as-you-go is correct here).
4. Create-or-update the `## Context Map` pointer row in CLAUDE.md **idempotently**: a row `| docs/context/reference/<slug>.md | <when to read it> |`. If the row already exists, update it in place; if `## Context Map` doesn't exist, create the section first. Never duplicate a row.

The skill is separate from `add-fact` (not an extension) because invocation depends on distinct vocabulary, the cognitive task differs (scaffold-and-fill a structured doc vs. classify-and-append a one-liner), and folding it into `add-fact` would bloat that skill past reliable invocation.

## Why
Long-form reference docs (design system, methodology, conventions) have no authoring path today; without `add-context`, the `reference/` templates and the `## Context Map` pointer model have no skill that produces real docs.

## Acceptance Criteria
- [ ] `src/claude-skills/joycraft-add-context.md` exists with frontmatter (`name`, `description`, `instructions: N`); the `description` carries authoring vocabulary distinct from `add-fact`'s operational signal-words (e.g., "design system / methodology / conventions / long-form reference doc").
- [ ] The skill body scaffolds a doc into `docs/context/reference/<slug>.md` from a `docs/templates/context/reference/*.md` template, lazy-creating `docs/context/reference/`.
- [ ] The skill writes the doc immediately (per-doc, not batched).
- [ ] The skill creates-or-updates a `## Context Map` pointer row idempotently (creates the section if absent; updates the row in place if present; never duplicates).
- [ ] `src/codex-skills/joycraft-add-context.md` is a content-identical Codex mirror: `$joycraft-…` sigil, `.agents/` instead of `.claude/`, "deny patterns configuration" instead of `.claude/settings.json`, no `instructions:` frontmatter field.
- [ ] The skill is self-contained — no instruction to import another skill's logic (gotcha #3).
- [ ] Both files use project-relative paths only.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Claude skill exists + frontmatter | grep for `name:`, `description:`, `instructions:` in the Claude file | integration (grep assertion) |
| Distinct invocation vocabulary | assert the `description` contains reference/authoring words and does NOT duplicate `add-fact`'s exact signal-word phrasing | integration (content assertion) |
| Scaffolds to reference/ from template | assert body references `docs/context/reference/<slug>.md` and `docs/templates/context/reference/` | integration (grep assertion) |
| Idempotent Context Map row | assert body describes create-or-update + "do not duplicate" for the `## Context Map` row | integration (content assertion) |
| Codex mirror parity | diff Claude vs Codex body; only platform lines differ; Codex has `$joycraft-`, no `/joycraft-`, no `instructions:` field | integration (grep + diff assertion) |
| Project-relative paths | `grep -n "/Users/\|joycraft/src" <both files>` returns nothing | integration (grep assertion) |

**Execution order:**
1. Write the grep/content assertions (a vitest that reads the two skill files) — they FAIL (files don't exist).
2. Confirm red.
3. Author both skills until assertions pass (green).

**Smoke test:** the grep assertion that both files exist and the Codex one has no `/joycraft-` — sub-second.

**Before implementing, verify your test harness:**
1. Run the assertions — they must FAIL (skill files absent).
2. Assertions read the real `src/claude-skills/` / `src/codex-skills/` files that get bundled, not drafts.
3. The existence+sigil grep is the seconds-scale smoke test.

## Constraints
- MUST be a standalone skill, not an extension of `add-fact`.
- MUST be self-contained (gotcha #3) — inline whatever routing/scaffolding guidance it needs; do not instruct it to call into `add-fact`.
- MUST write immediately per-doc (Decision 12, option A) — NOT batched.
- MUST lazy-create `docs/context/reference/` (Decision 13) — the skill creates it on first write.
- MUST maintain the `## Context Map` row idempotently (create section if absent, update row in place, no duplicates).
- Codex mirror MUST be content-identical with only the documented platform swaps; `$` sigil; no `instructions:` field.
- MUST use project-relative paths only.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-add-context.md` | New skill: scaffold reference doc + idempotent Context Map row |
| Create | `src/codex-skills/joycraft-add-context.md` | Codex mirror (content-identical, `$` sigil, `.agents/`, no `instructions:`) |

## Approach
Model the skill structure on an existing scaffolding skill (`new-feature` is closer in shape than `add-fact`, per the brief). Steps: (1) ask/derive topic + slug, (2) pick template, (3) lazy-create `docs/context/reference/` and copy/fill the template to `<slug>.md`, (4) edit CLAUDE.md to add-or-update the `## Context Map` row — describe the idempotent string-edit explicitly (find existing row by path → update; else append a row; if no `## Context Map` section, create it with the stub header). Write the Claude file first, then derive the Codex mirror by applying only the documented platform swaps. Do NOT regenerate `bundled-files.ts` here (the `regenerate-bundled-files` spec owns that).

Depends on `add-reference-templates` because the skill names and scaffolds from those templates; written after they exist so the skill's template references are real.

Rejected alternative: extending `add-fact` with a 6th long-form branch — bloats it past reliable invocation and muddies both triggers (brief Part B rationale).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `## Context Map` section doesn't exist yet | Skill creates it (stub header + the new row) before adding the pointer |
| The pointer row for this doc already exists | Update it in place; do not add a duplicate |
| `docs/context/reference/` doesn't exist | Lazy-create it on first write |
| Topic matches none of the four named templates | Use the generic `reference-doc.md` template |
| User runs add-context twice for same slug | Second run updates the existing doc/row, no duplication |
