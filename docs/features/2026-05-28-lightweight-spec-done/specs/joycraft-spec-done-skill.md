---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: checkpoint
---

# Joycraft Spec-Done Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / 1 NEW skill × 3 variants + skill registration + 1 test

---

## What
Create a NEW lightweight skill, `joycraft-spec-done`, run once per spec immediately after implementation, before context clears. It does exactly four things and nothing more:
1. Bump the spec's status `todo → in-review` in **both** the queue JSON (via `joycraft-mark-done <id> --to in-review`) and the spec's frontmatter.
2. Write a **terse discovery stub** (≤2 lines) ONLY if something during implementation contradicted the spec; otherwise skip entirely.
3. Commit with message `spec: <spec-name>`.
4. Stop. **No** validation re-run (it trusts implement's TDD), **no** push, **no** PR.

Ships as all three variants (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`) + this repo's installed copies. The Pi loop (spec 8) reuses this same logic as a script step.

## Why
Running full `joycraft-session-end` after every spec (validation + 4-doc context sweep + push/PR) kills loop momentum. `spec-done` is the fast per-spec handshake that keeps atomic commits and a correct status trail without the expensive once-per-feature cognition. It's the `todo → in-review` transition in the lifecycle.

## Acceptance Criteria
- [ ] A new skill exists as a flat source file in all 3 source dirs: `src/{claude-skills,codex-skills,pi-skills}/joycraft-spec-done.md`
- [ ] The skill's frontmatter has a `name`/`description` that makes it discoverable (description mentions per-spec, lightweight, commit, status bump)
- [ ] The skill instructs: bump status to `in-review` in BOTH queue JSON (`mark-done --to in-review`) and frontmatter
- [ ] The skill instructs: discovery stub ONLY if implementation surprised the spec; else skip
- [ ] The skill instructs: commit `spec: <name>`; explicitly NO validation re-run, NO push, NO PR
- [ ] The skill is installed to this repo's `.claude/skills/joycraft-spec-done/SKILL.md`, `.agents/skills/joycraft-spec-done/SKILL.md`, `.pi/skills/joycraft-spec-done/SKILL.md` (installed layout is the `<dir>/SKILL.md` form)
- [ ] The skill source lives in the flat dirs the generator reads (`src/{claude-skills,codex-skills,pi-skills}/joycraft-spec-done.md`) so spec 9's bundle step picks it up; the generator uses `readFlatDir` over those dirs
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill exists in 3 source dirs | `tests/spec-done-skill.test.ts`: assert `existsSync` for each of the 3 flat source paths (`src/*-skills/joycraft-spec-done.md`) | unit |
| Bumps both systems to in-review | Assert skill text references `mark-done` with `--to in-review` AND updating frontmatter `status` | unit |
| Discovery-if-surprised only | Assert skill text conditions the discovery stub on a contradiction/surprise, and says to skip otherwise | unit |
| No validation/push/PR | Assert skill text explicitly states it does NOT run validation, push, or open a PR | unit |
| Commit message shape | Assert skill specifies `spec: <name>` commit convention | unit |
| 3-variant parity | Assert all three variants contain the four core steps | unit |
| Installed copies present | Assert `.claude/`, `.agents/`, `.pi/` installed copies exist and match source | unit |

**Execution order:**
1. Write tests — MUST fail (skill doesn't exist)
2. Confirm red
3. Author the 3 source variants + install copies until green

**Smoke test:** `pnpm vitest run tests/spec-done-skill.test.ts`.

**Before implementing, verify your test harness:**
1. Tests assert on the real SKILL.md files on disk
2. Prose skill ⇒ assert required tokens/steps (the contract), not exact wording
3. Single test file = smoke test

## Constraints
- MUST: create all three variants (CLAUDE.md: all 3 skill variants for any skill change)
- MUST: bump status in BOTH systems — frontmatter AND queue JSON — or they desync (the bug this feature kills)
- MUST: use the script from spec 3 (`joycraft-mark-done --to in-review`) for the queue bump, not a bespoke sed in the skill
- MUST: be genuinely lightweight — the skill body should be short; resist re-adding session-end's heavy steps
- MUST NOT: run `pnpm test`/`pnpm build`, push, or open a PR (those move to session-end; brief: "trusts implement's TDD")
- MUST NOT: graduate to `done` — only `in-review` (the agent never self-certifies; brief invariant)
- MUST NOT: regenerate bundled-files or edit `init`/`upgrade` here — spec 9 wires installation
- ASK FIRST (CLAUDE.md): new skill content — the brief authorizes it; no further ask for this decomposed spec

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-spec-done.md` | New lightweight skill (claude) — flat source |
| Create | `src/codex-skills/joycraft-spec-done.md` | New lightweight skill (codex) — flat source |
| Create | `src/pi-skills/joycraft-spec-done.md` | New lightweight skill (pi) — flat source |
| Create | `.claude/skills/joycraft-spec-done/SKILL.md` | Installed copy (dogfood) |
| Create | `.agents/skills/joycraft-spec-done/SKILL.md` | Installed copy (dogfood) |
| Create | `.pi/skills/joycraft-spec-done/SKILL.md` | Installed copy (dogfood) |
| Create | `tests/spec-done-skill.test.ts` | Skill-content + existence assertions |

## Approach
Model the skill's shape on the existing `joycraft-session-end` SKILL.md for consistency (frontmatter, step structure, the canonical Handoff block) but strip it to the four steps. The Handoff should point at: continue the loop (next spec) for checkpoint mode, or note that session-end runs once at feature end. Identify the spec id for `mark-done` by reading the queue JSON for the entry whose `file` matches the current spec.

For the **discovery stub**: a 2-line stub (what contradicted the spec + a pointer) that `session-end`'s consolidation pass later expands — do NOT write a full discovery doc here.

Variant differences are minimal: claude/codex use the Skill/slash invocation idiom; the pi variant notes the loop reuses this logic as a script step (cross-reference spec 8). Keep the four core steps identical.

**Rejected alternative:** A `--fast` flag on `joycraft-session-end` instead of a new skill. Rejected — the brief explicitly decided "New skill, not a `--fast` flag"; a flag would entangle the lightweight path with session-end's heavy code and blur the two-tier model.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Nothing surprised the implementer | Skip the discovery stub entirely — just status bump + commit |
| Spec not found in queue JSON | `mark-done` errors (spec 3 guarantees a hard error); surface it, don't silently skip the bump |
| Working tree has unrelated changes | Commit only the spec's changes + status edits; the skill notes scope discipline |
| Run in `batch` mode by mistake | Still safe — it bumps one spec to `in-review` and commits; session-end reconciles at feature end |
| Frontmatter and queue id mismatch | Bump both by matching on filename; if no queue entry, surface the error from `mark-done` |
