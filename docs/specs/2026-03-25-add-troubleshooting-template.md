# Add Troubleshooting Template — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-25-incremental-knowledge-capture.md`
> **Status:** Ready
> **Date:** 2026-03-25
> **Estimated scope:** 1 session / 4 files / ~80 lines

---

## What

Add a `troubleshooting.md` context document template with a "When X → Do Y" structure for diagnostic knowledge. This is where environment-specific gotchas live: what to do when hardware disconnects, when tests fail for non-code reasons, when Claude should wait instead of acting. The template gets copied to `docs/context/troubleshooting.md` during `joycraft init`.

## Why

Claude spirals when it encounters environmental failures (Wi-Fi down, wrong serial device, flaky dependencies) because it has no project-specific diagnostic playbook. The existing context docs cover *what's dangerous* and *what's assumed wrong*, but not *what to do when stuck*.

## Acceptance Criteria

- [ ] `src/templates/context/troubleshooting.md` exists with clear structure and examples
- [ ] Template has a "When X → Do Y" table as primary structure
- [ ] Template has sections for: Common Failures, Environment Issues, Diagnostic Steps, "Don't Do This" warnings
- [ ] `joycraft init` copies troubleshooting.md to `docs/context/` (alongside the other 4 context docs)
- [ ] `src/bundled-files.ts` includes the troubleshooting template
- [ ] Existing tests still pass
- [ ] Init test covers troubleshooting.md creation
- [ ] Build passes

## Constraints

- MUST follow the same pattern as existing context doc templates (header, description, example rows)
- MUST NOT overwrite if `docs/context/troubleshooting.md` already exists (unless `--force`)
- MUST be useful for any stack, not just embedded/IoT (examples should be generic)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/context/troubleshooting.md` | New template file |
| Modify | `src/bundled-files.ts` | Add troubleshooting template to TEMPLATES object |
| Modify | `src/init.ts` | Ensure troubleshooting.md is copied with other context docs |
| Modify | `tests/init.test.ts` | Add test for troubleshooting.md creation |

## Approach

Follow the exact pattern of existing context doc templates (`production-map.md`, `dangerous-assumptions.md`, etc.):
1. Create the template in `src/templates/context/`
2. Add it to the `TEMPLATES` object in `bundled-files.ts`
3. Init already copies all templates — verify troubleshooting.md is included in the copy loop
4. Add a test assertion

Rejected alternative: Making troubleshooting a section in `dangerous-assumptions.md` — that doc is about what the agent assumes wrong, not what to do about it. Separate concerns.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/context/troubleshooting.md` already exists | Skip (don't overwrite) |
| User runs `init --force` | Overwrite template |
| Project has no environmental dependencies | Template still useful — examples cover generic scenarios (network, permissions, build cache) |
