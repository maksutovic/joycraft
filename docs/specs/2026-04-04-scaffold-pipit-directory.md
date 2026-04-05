# Scaffold Pipit Directory — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-04-pipit-golden-examples.md`
> **Status:** Complete
> **Date:** 2026-04-04
> **Estimated scope:** 1 session / 2 files / ~20 lines

---

## What

Add `docs/pipit-examples/` to Joycraft's init scaffolding. The directory is created alongside existing docs subdirectories (briefs, specs, discoveries, etc.) and contains a README explaining what Pipit is and that the directory is optional.

## Why

Golden examples need a predictable storage location. Without the directory, the session-end generation step would need to create it on first use, which is messy and inconsistent with how Joycraft scaffolds everything else upfront.

## Acceptance Criteria

- [ ] `npx joycraft init` creates `docs/pipit-examples/` in the target directory
- [ ] `docs/pipit-examples/README.md` exists with a brief explanation of Pipit and golden examples
- [ ] README explains this directory is optional and can be safely deleted
- [ ] Existing init behavior is unchanged (all other dirs, skills, templates still created)
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Init creates pipit-examples dir | Call `init()`, assert `docs/pipit-examples/` exists | unit |
| README exists with content | Call `init()`, read README, assert it contains "Pipit" and "optional" | unit |
| Existing behavior unchanged | Existing init tests still pass | regression |

**Execution order:**
1. Write tests — they should fail against current code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** The "init creates pipit-examples dir" test.

## Constraints

- MUST: Add `pipit-examples` to the existing `docsDirs` array in `init.ts` (line 45)
- MUST: Write README via the existing `writeFile` helper (respects `--force` flag)
- MUST NOT: Change any existing directory names or scaffolding behavior

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/init.ts` | Add `pipit-examples` to `docsDirs`, write README after dir creation |
| Modify | `tests/init.test.ts` | Add tests for pipit-examples dir and README |

## Approach

Add `'pipit-examples'` to the `docsDirs` array on line 45 of `init.ts`. After the dir creation loop, write a static README.md into `docs/pipit-examples/`. The README is a hardcoded string (not a template) since it's a one-off explainer, not something users customize.

Rejected alternative: Making the README a template in `templates/`. Overkill — the README is static context about Pipit, not a user-fillable template.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/pipit-examples/` already exists | `ensureDir` is a no-op, README follows `writeFile` skip-if-exists logic |
| `--force` flag | README is overwritten |
