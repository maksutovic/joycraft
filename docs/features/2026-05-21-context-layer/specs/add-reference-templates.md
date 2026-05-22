---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Add Reference Templates — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / 5 new files / ~150 lines total

---

## What
Add five long-form reference-doc templates under `src/templates/context/reference/`: `design-system.md`, `frontend-methodology.md`, `backend.md`, `testing.md`, and a generic `reference-doc.md` fallback. Each is a starting skeleton an author fills in — H1 title, a `>` blockquote stating the doc's purpose, and a section skeleton with *deletable* italic example prose (matching the established fact-doc template shape in `src/templates/context/production-map.md`). These are the long-form counterpart to the five flat operational fact-docs; they live in a `reference/` subdirectory because they differ by *shape* (long prose vs. short append-tables), not purpose.

## Why
There is no home or starting skeleton today for long-form reference docs (design system, methodology, backend/testing conventions); without templates, `/joycraft-add-context` and `/joycraft-gather-context` have nothing to scaffold from.

## Acceptance Criteria
- [ ] Five files exist under `src/templates/context/reference/`: `design-system.md`, `frontend-methodology.md`, `backend.md`, `testing.md`, `reference-doc.md`.
- [ ] Each file has an H1 title, a `>` blockquote purpose line, and at least one section with deletable italic example prose the author replaces.
- [ ] `reference-doc.md` is topic-agnostic (a generic skeleton usable for any reference doc not covered by the four named templates).
- [ ] Templates use project-relative paths only — no absolute paths, no Joycraft-repo paths (CLAUDE.md gotcha: templates are copied into user projects).
- [ ] `node scripts/generate-bundled-files.mjs` would pick these up as keys `context/reference/<name>.md` (recursive read) — verified structurally, regeneration itself happens in the `regenerate-bundled-files` spec.
- [ ] `pnpm test --run && pnpm typecheck` pass (no test should break from adding files).

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Five files exist | `ls src/templates/context/reference/` lists exactly the five names | integration (fs assertion) |
| Shape: H1 + blockquote + section | grep each file for `^# `, `^> `, and `^## ` | integration (grep assertion) |
| No absolute / repo paths | `grep -rn "/Users/\|joycraft/src" src/templates/context/reference/` returns nothing | integration (grep assertion) |
| Auto-bundle key shape | a vitest reading `readTreeDir` (or asserting path → key mapping) yields `context/reference/design-system.md` etc. | unit |
| Build green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Write the fs/grep assertions — they FAIL (directory does not exist yet).
2. Confirm red.
3. Author the five templates until assertions pass (green).

**Smoke test:** `ls src/templates/context/reference/ && grep -L "^# " src/templates/context/reference/*.md` — sub-second; flags any file missing an H1.

**Before implementing, verify your test harness:**
1. Run the fs/grep assertions — they must FAIL (the `reference/` dir doesn't exist).
2. Assertions read the real `src/templates/context/reference/` path used by the bundler, not a fixture copy.
3. The `ls`/`grep` smoke test runs in well under a second.

## Constraints
- MUST place templates under `src/templates/context/reference/` (the **bundled** templates dir), NOT the repo-root `templates/` (development-reference only, not bundled).
- MUST match the existing context-template shape (`src/templates/context/production-map.md`): H1 + `>` purpose blockquote + deletable italic examples.
- MUST NOT use absolute paths or Joycraft-internal paths anywhere in template content.
- MUST NOT hand-edit `src/bundled-files.ts` (that is `@generated`; regeneration is a separate spec).

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/context/reference/design-system.md` | Skeleton: tokens, color/type scale, components, usage rules |
| Create | `src/templates/context/reference/frontend-methodology.md` | Skeleton: architecture, state mgmt, folder conventions, patterns |
| Create | `src/templates/context/reference/backend.md` | Skeleton: service boundaries, API conventions, data model, error handling |
| Create | `src/templates/context/reference/testing.md` | Skeleton: test pyramid, frameworks, fixtures, CI gates |
| Create | `src/templates/context/reference/reference-doc.md` | Generic skeleton: purpose, sections, "delete the examples" guidance |

## Approach
Open `src/templates/context/production-map.md` first and match its tone and shape exactly (purpose blockquote, italic example rows the user deletes). Keep each template short — a skeleton, not a finished doc; the author's prose fills it in. The four named templates carry topic-specific section headers; `reference-doc.md` is deliberately generic with a one-line note telling the author to rename sections to fit. No CLI code changes here.

Rejected alternative: one mega-template with conditional sections — harder for a skill to scaffold specifically and less useful as a starting skeleton (per design Section 4).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Author's topic matches none of the four named templates | They use `reference-doc.md` generic fallback |
| Template accidentally references a Joycraft path | Fails the no-absolute-path grep; rewrite project-relative |
| Empty section with no example | Allowed, but prefer one deletable italic example so the author sees the intended shape |
