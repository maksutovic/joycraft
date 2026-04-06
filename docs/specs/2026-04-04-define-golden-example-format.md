# Define Golden Example Format — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-04-pipit-golden-examples.md`
> **Status:** Complete
> **Date:** 2026-04-04
> **Estimated scope:** 1 session / 1 file / ~40 lines

---

## What

Create a golden example Markdown template that defines the format for capture-to-classification pairs. The template lives in `templates/` (Joycraft's source of truth) and gets copied to user projects via init. Session-end will use this format when generating examples.

## Why

Without a defined format, golden examples would be ad-hoc and inconsistent. A template ensures every example has the fields Pipit needs for few-shot prompting: capture text, classification, decomposition summary, and rationale.

## Acceptance Criteria

- [ ] `templates/GOLDEN_EXAMPLE_TEMPLATE.md` exists with YAML frontmatter and Markdown body
- [ ] Template includes fields: capture (original user text), classification (action level), decomposition_summary (spec table), rationale (2-3 sentences)
- [ ] Template includes usage notes explaining how Pipit consumes these
- [ ] `npx joycraft init` copies the template to `docs/templates/GOLDEN_EXAMPLE_TEMPLATE.md` in user projects
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Template exists | Assert file exists in `templates/` | unit |
| Template has required fields | Read template, assert contains `capture`, `classification`, `decomposition_summary`, `rationale` | unit |
| Init copies template | Call `init()`, assert `docs/templates/GOLDEN_EXAMPLE_TEMPLATE.md` exists | unit |

**Execution order:**
1. Write the template file
2. Verify the bundled-files system picks it up (it auto-scans `templates/`)
3. Run existing init tests to confirm it's copied

**Smoke test:** Check the template file exists after init.

## Constraints

- MUST: Use Markdown with YAML frontmatter (consistent with all other Joycraft templates)
- MUST: Include all four fields: capture, classification, decomposition_summary, rationale
- MUST: Be self-documenting — a reader should understand the format without external context
- MUST NOT: Include Pipit-specific code or imports (Joycraft is write-only, Pipit reads these)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `templates/GOLDEN_EXAMPLE_TEMPLATE.md` | New template file |
| None | `src/bundled-files.ts` | Auto-scans templates/ — no change needed if it glob-reads the dir |

## Approach

Create a Markdown file with YAML frontmatter containing placeholder fields. The body has sections for each field with guidance on what to include. The `bundled-files.ts` system already auto-scans `templates/` at build time, so no code changes are needed to make init copy it.

Rejected alternative: JSON format. Markdown with frontmatter is consistent with every other Joycraft artifact, is more readable for humans reviewing examples, and is optimal for LLM context windows.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Template already exists in user project | `writeFile` skips unless `--force` |
