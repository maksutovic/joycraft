---
status: active
owner: Maximilian Maksutovic
created: 2026-05-21
feature: 2026-05-21-context-layer
---

# Discoveries — Context Layer implementation

**Date:** 2026-05-21
**Spec:** `docs/features/2026-05-21-context-layer/specs/` (all 9)

## `src/bundled-files.ts` is gitignored — never commit it; the build regenerates it

**Expected:** The `regenerate-bundled-files` spec (spec 9) said to regenerate `src/bundled-files.ts` and "commit the script's output."

**Actual:** `src/bundled-files.ts` is in `.gitignore` (line 10) and untracked. It is regenerated deterministically by `node scripts/generate-bundled-files.mjs`, which runs as the first half of `pnpm build` (`build` = generate + tsup) and via `prepublishOnly`. So npm consumers always get a fresh bundle from the final `src/` files. Tests' `beforeAll` also regenerate it, which causes harmless cross-file test-ordering nondeterminism (a test importing the on-disk file before the regenerating test's `beforeAll` runs sees a stale copy; a full run is green).

**Impact:** Spec 9's "commit the artifact" instruction is wrong for this repo — committing a generated, gitignored file is the anti-pattern. The spec's *real* intent (the bundle regenerates cleanly and the whole feature builds green) is satisfied by a verification test (`tests/regenerate-bundled-files.test.ts`) instead. This supersedes the 2026-03-30 "manual sync" discovery — the auto-generate prebuild now exists, so editing `src/{claude,codex}-skills/*.md` and `src/templates/**` is sufficient; no manual sync step.

## `docs/specs/` staleness lived in two templates the feature specs didn't cover

**Expected:** Spec 1 ("remove all `docs/specs/` from shipped skills") + spec 4 (migrate dirs) would make `docs/specs/` fully dead.

**Actual:** Spec 1 was scoped to `src/claude-skills/` + `src/codex-skills/` only. Two *templates* still referenced the retired path and were in no spec's Affected Files: `src/templates/workflows/spec-dispatch.yml` watched `docs/specs/**` (so the Level-5 scenario-dispatch workflow would never fire on real specs, which now live at `docs/features/<slug>/specs/`), and `CONTRIBUTING-joycraft-template.md` told teams to put bugfix specs under `docs/specs/<area>/`.

**Impact:** A "remove legacy path X" feature needs a repo-wide grep gate, not a per-surface one — decomposing by surface (skills) left templates behind. Fixed both, and the bundle regen test now asserts `docs/specs/` is absent bundle-wide (skills AND templates) so it can't silently regress. When retiring a path/convention in future, add the global grep assertion first.
