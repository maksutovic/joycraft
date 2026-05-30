---
status: done
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Add setup Alias Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / 2 new files / ~25 lines each

---

## What
A new one-screen `/joycraft-setup` alias skill (Claude `src/claude-skills/joycraft-setup.md` + Codex mirror) that is the obvious first-run door. It carries newcomer vocabulary in its `description` (the field that drives auto-invocation — "set up / get started / first time / configure my project") and its body does NO work of its own: it routes to `/joycraft-tune`, which does the actual assessment (including invoking `gather-context` on first run). The whole value of this skill is the `description` existing in newcomer words; the body must not fork or duplicate tune's logic.

## Why
A newcomer asking "where do I begin?" has no obviously-named door — `tune` reads as a recurring re-assessment, not a starting point — and renaming `tune` would break existing users' muscle memory and every doc/memory reference.

## Acceptance Criteria
- [ ] `src/claude-skills/joycraft-setup.md` exists with frontmatter (`name`, `description`, `instructions: N`); the `description` carries newcomer vocabulary ("set up", "get started", "first time", "configure my project").
- [ ] The body is a thin router: it routes to `/joycraft-tune` and contains no duplicated assessment/scoring/routing logic of its own.
- [ ] `src/codex-skills/joycraft-setup.md` is a content-identical Codex mirror whose body routes to `$joycraft-tune` (not `/joycraft-tune`), with `.agents/`, "deny patterns configuration", and no `instructions:` frontmatter field.
- [ ] Both files use project-relative paths only.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Claude skill exists + frontmatter | grep `name:`/`description:`/`instructions:` in the Claude file | integration (grep) |
| Newcomer vocabulary in description | assert `description` contains setup/get-started/first-time words | integration (content) |
| Thin router, no dup logic | assert body references `/joycraft-tune` and does NOT contain tune's 7-dimension/scoring text | integration (content) |
| Codex routes to `$joycraft-tune` | assert Codex body contains `$joycraft-tune`, contains no `/joycraft-`, has no `instructions:` field | integration (grep) |
| Project-relative paths | grep for absolute/repo paths returns nothing | integration (grep) |

**Execution order:**
1. Write the grep/content assertions reading the two files — they FAIL (files absent).
2. Confirm red.
3. Author both files until green.

**Smoke test:** the existence + "body references tune" grep — sub-second.

**Before implementing, verify your test harness:**
1. Run the assertions — they must FAIL (files absent).
2. Assertions read the real bundled skill files, not drafts.
3. The existence grep is the seconds-scale smoke test.

## Constraints
- MUST be a thin router with zero duplication of tune's logic (Decision / design Section 4) — the body is essentially "this is the first-run door; run `/joycraft-tune`."
- MUST carry newcomer vocabulary in `description` — that field IS the point of the alias.
- Codex mirror MUST route to `$joycraft-tune` (Decision 11), with documented platform swaps and no `instructions:` field.
- MUST NOT rename or alter `joycraft-tune` (alias, not rename — preserves existing users' references).
- MUST use project-relative paths only.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-setup.md` | New thin alias routing to `/joycraft-tune` |
| Create | `src/codex-skills/joycraft-setup.md` | Codex mirror routing to `$joycraft-tune` |

## Approach
Write the shortest honest skill: frontmatter with a description packed with newcomer search vocabulary, then a one-screen body that explains this is the first-run entry point and instructs running `/joycraft-tune`. Do not restate what tune does. Derive the Codex mirror by swapping `/joycraft-tune` → `$joycraft-tune`, `.claude/` → `.agents/`, dropping `instructions:`. No CLI changes here; the surfaces that *point* at `/joycraft-setup` (init next-steps, Getting-Started table) are owned by `add-context-map-section`. Do NOT regenerate `bundled-files.ts` here.

This spec is independent (no dependency on other specs) — it references `/joycraft-tune`, which already exists.

Rejected alternative: `setup` reimplementing detect+route — duplicates tune and drifts over time (design Section 4, rejected). Also rejected: renaming `tune` to `setup` — breaks published muscle memory for zero newcomer benefit (brief Part D).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| User runs `/joycraft-setup` on an already-tuned project | Routes to tune, which re-assesses (tune is idempotent/recurring by design) |
| User types `/joycraft-tune` directly | Unchanged — tune still works as before; the alias is additive |
| Codex user invokes the mirror | Routes to `$joycraft-tune` |
