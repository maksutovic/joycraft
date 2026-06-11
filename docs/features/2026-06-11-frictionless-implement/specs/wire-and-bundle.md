---
status: done
owner: Maximilian Maksutovic
created: 2026-06-11
feature: 2026-06-11-frictionless-implement
mode: batch
---

# Wire and Bundle — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-frictionless-implement/brief.md`
> **Status:** Ready
> **Date:** 2026-06-11
> **Estimated scope:** 1 session / 4 files / ~20 lines

---

## What

Regenerate `src/bundled-files.ts` from the edited/new skill sources so init/upgrade actually install them; update the skill count from 19 to 20 everywhere it is asserted or documented (README, `tests/init.test.ts`, `tests/codex-skill-parity.test.ts`); add the driver to the README's "Which skill do I need?" table; full validation.

## Why

Editing skill sources alone does nothing — `src/bundled-files.ts` is the artifact init/upgrade read (see `docs/features/2026-05-28-lightweight-spec-done/brief.md` Constraints), and three tests hard-assert the skill count.

## Acceptance Criteria

- [ ] `node scripts/generate-bundled-files.mjs` run; `src/bundled-files.ts` contains `joycraft-implement-feature` in SKILLS, CODEX_SKILLS, PI_SKILLS
- [ ] `tests/init.test.ts` and `tests/codex-skill-parity.test.ts` count assertions updated to 20 and green
- [ ] README: "**19 skills**" → "**20 skills**"; driver row added to the skill table
- [ ] `pnpm test --run && pnpm typecheck` — no new failures vs the branch baseline
- [ ] Build passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Bundle contains new skill | existing parity tests (updated counts) | unit |
| Init installs it | existing init dir-count test (updated to 20) | unit |

**Smoke test:** `pnpm vitest run tests/init.test.ts tests/codex-skill-parity.test.ts`

## Constraints

- MUST NOT hand-edit `src/bundled-files.ts` (generated)
- MUST keep the known pre-existing upgrade/migrate/version-sync failures out of scope (documented separately)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Regenerate | `src/bundled-files.ts` | via script |
| Modify | `tests/init.test.ts` | 19 → 20 |
| Modify | `tests/codex-skill-parity.test.ts` | 19 → 20 (and parity list if explicit) |
| Modify | `README.md` | count + skill table row |

## Approach

Pure wiring. Rejected alternative: deriving the count assertions from `Object.keys(SKILLS).length` — the hard-coded number is a deliberate tripwire so adding/removing a skill is always a conscious act.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Parity test asserts an explicit skill-name list | Add `joycraft-implement-feature` to the list |
