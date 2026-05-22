# Update Init Layout — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 1 session / 2 files / ~50 lines diff
> **Depends on:** `fix-version-detection.md` (this spec uses `getPackageVersion()` introduced there)

---

## What

Update `src/init.ts` to scaffold the per-feature folder layout that `npx joycraft init` will produce going forward: drop the preemptive creation of `docs/briefs/`, `docs/specs/`, `docs/discoveries/`, `docs/contracts/`, `docs/decisions/` (skills will lazy-create these on first write), keep `docs/context/` (used by `add-fact` skill) and `docs/templates/` (bundled), and stop scaffolding `docs/pipit-examples/` preemptively. No new directories are forcibly created either — `docs/features/` and `docs/backlog/` will be lazy-scaffolded by the skills that write to them. The version-stamping fix from spec 1 is the only behavioral change beyond directory list trimming.

## Why

The brief constrains solo users to "no extra ceremony" and the design's Pattern B says skills already use a "create directory if it doesn't exist" pattern (8 occurrences across skills). Preemptively scaffolding empty directories that the user may never use is exactly the ceremony to remove. Skills that need their target dir will create it on first write — this is already the convention.

## Acceptance Criteria

- [ ] After `node dist/cli.js init /tmp/test-fresh`, the only directories under `/tmp/test-fresh/docs/` are `context/` and `templates/`.
- [ ] `docs/context/` still exists and still gets the bundled context-template files copied into it (or at least its parent template structure under `docs/templates/context/` — preserve current behavior except for the trimmed empty-dirs).
- [ ] `docs/templates/` still gets all bundled templates copied (existing behavior preserved).
- [ ] No `docs/briefs/`, `docs/specs/`, `docs/discoveries/`, `docs/contracts/`, `docs/decisions/`, `docs/pipit-examples/` directory exists in a freshly initialized project.
- [ ] No `docs/features/`, `docs/backlog/`, `docs/areas/`, `docs/archive/` directory exists in a freshly initialized project either (these are all lazy or team-only).
- [ ] Existing `tests/init.test.ts` assertions on directory creation are updated to match the new layout — tests that asserted `docs/briefs` exists must now assert it does NOT exist after init.
- [ ] The init summary that's printed to the user mentions where artifacts will be written when skills run (e.g., "feature work goes to `docs/features/<slug>/` once you start a feature"). Brief but informative.
- [ ] Build, typecheck, tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Fresh init creates only `docs/context/` and `docs/templates/` | `tests/init.test.ts` — run init in tmp dir, assert directory listing of `docs/` matches exactly `['context', 'templates']` (sorted) | integration |
| None of the dropped dirs are created | Same test — for each of `briefs|specs|discoveries|contracts|decisions|pipit-examples|features|backlog|areas|archive`, assert `existsSync` is false | integration |
| `docs/templates/` contents intact | Same test — assert at least one known template file path exists under `docs/templates/` | integration |
| Init summary mentions per-feature path | Same test — capture stdout, assert it contains `docs/features/` substring | integration |
| Version stamp uses real CLI version (regression-guard for spec 1) | Same test — assert `.joycraft-version` `version` matches the CLI's `package.json` version | integration |

**Execution order:**
1. Modify `tests/init.test.ts` to assert the NEW layout — these assertions fail against current code.
2. Run tests to confirm red.
3. Edit `src/init.ts` until all assertions green.

**Smoke test:** `pnpm test --run tests/init.test.ts` — single integration test file; usually <5s.

**Before implementing, verify your test harness:**
1. Run tests — they must FAIL (current init creates the dropped dirs).
2. Tests run the real `init` export, not a stub.
3. The test file should clean up its tmp dirs in `afterEach` to avoid leakage.

## Constraints

- MUST: Not break the existing CLAUDE.md generation in `src/improve-claude-md.ts` (it doesn't reference the dropped dirs by absolute path — verify with grep).
- MUST: Not break `src/upgrade.ts` — upgrade-path projects may already have these dirs, and this spec only changes fresh-init behavior.
- MUST: Keep `docs/context/` creation since `joycraft-add-fact` writes there and assumes existence (research Q5).
- MUST NOT: Add a "are you a solo user or team user?" prompt in init. Solo-by-default is the design decision; teams run `/joycraft-collaborative-setup` later.
- MUST NOT: Create `docs/areas/` — it's team-only (design decision) and only appears via `/joycraft-collaborative-setup`.
- MUST NOT: Touch any files outside `src/init.ts` and `tests/init.test.ts` for this spec.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/init.ts` | Lines 44-48 — replace the directory list passed to `mkdirSync` calls. Keep `docs/templates/` copying logic. Update the printed summary to mention `docs/features/<slug>/` for feature work. Use `getPackageVersion()` (from spec 1). Drop the pipit-examples README write at lines 51-70. |
| Modify | `tests/init.test.ts` | Update directory-existence assertions to match new layout. |

## Approach

**Strategy:** Trim, don't add. The brief's "Solo-first defaults" + the design's Pattern B (lazy scaffolding) align: don't pre-create folders the user might not need. The only structurally new convention (`docs/features/`) is also lazy; no init-time mkdir.

**Data flow:**
```
init.ts
  → mkdir docs/context/   (kept — add-fact assumes)
  → copy bundled templates → docs/templates/   (kept)
  → drop everything else
  → write CLAUDE.md (unchanged logic)
  → write .joycraft-version with real CLI version
  → print summary mentioning docs/features/<slug>/ as feature destination
```

**Key decisions:**
- Drop `docs/pipit-examples/` and its README. Pipit examples are an optional Level 5 feature; users who reach that level can lazy-create when they need it. Removing reduces clutter for the 80% who never use Pipit.
- Preserve `docs/templates/` copying — users who want to read FEATURE_BRIEF_TEMPLATE.md or ATOMIC_SPEC_TEMPLATE.md still benefit, and this is bundled content (not lazy).
- Init prints a "where things go" hint instead of pre-creating folders. Discoverability without ceremony.

**Rejected alternative:** Keep `docs/briefs/` and `docs/specs/` for backward compatibility. Rejected because the design (Q6) chose forced migration — old layouts get migrated by `npx joycraft upgrade`, and fresh inits should establish the new convention immediately. Keeping the old dirs would muddy the "what does init produce?" test.

**Rejected alternative:** Pre-create `docs/features/.gitkeep` to make the convention visible. Rejected — the printed summary serves the same discoverability purpose without polluting git history with empty-folder placeholders.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/` already exists with content from a prior init | Existing behavior preserved — init is idempotent on existing dirs and only creates what's missing. |
| User runs `init` over a non-Joycraft project that has `docs/briefs/` | Don't touch it. We never delete user content; we just don't create that dir going forward. The migration spec handles legacy projects on `upgrade`. |
| `docs/templates/` already exists with user customizations | Existing logic must continue (init.ts at lines 122-127); customized files behavior is governed by upgrade.ts, not init.ts. |
| Bundled `TEMPLATES` object is empty (e.g., during dev with broken build) | Fall through gracefully — `docs/templates/` is created empty rather than crashing. |
