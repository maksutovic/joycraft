---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-15
feature: harness-selection
---

# Discoveries — scaffolded templates broke a fresh project's lint/build/test

**Date:** 2026-06-15
**Spec:** none (smoke-test bug report against v0.6.15, fixed same day)

## init wasn't inert to the user's toolchain — three globbable offenders
**Expected:** `npx joycraft init` only adds harness/docs files; the project's existing `tsc`/`eslint`/`vitest` gates stay green.
**Actual:** On a create-next-app project (default `include: ["**/*.ts"]`, vitest/eslint default globs) init's scaffolding broke all three gates immediately. Root cause traced to exactly **three** `.ts`/`.test.ts` files Joycraft shipped into the project, in two tiers:
- `docs/templates/pi-extensions/joycraft-pipeline.ts` — a **redundant accident**: `pi-extensions/` lives inside `src/templates/`, so `readTreeDir(TEMPLATES_DIR)` swept it into the `TEMPLATES` record *in addition* to the real `PI_EXTENSIONS` record. The `docs/templates/` copy was never referenced by anything.
- `docs/templates/scenarios/example-scenario.test.ts` — a genuine reference file, but a real `.test.ts` that vitest runs and eslint lints in place. It's meant to be copied *out* to the holdout repo.
- `.pi/extensions/joycraft-pipeline.ts` — the **live** extension (must keep `.ts`; Pi loads it as code). Imports a Pi-only package the user's project doesn't have → breaks `tsc`. Only ships when Pi is selected.

**Impact / fixes (PR #?, follow-up to #52):**
1. Generator excludes `pi-extensions/`/`pi-scripts/`/`pi-agents/` from `TEMPLATES` (they already ship to `.pi/`). Removed 9 redundant files; nothing referenced them.
2. Scenario starter ships as `example-scenario.test.ts.template` — inert to every default glob; user renames on copy into the holdout repo.
3. `init` surgically adds `.pi` to the user's `tsconfig.json` `exclude` when Pi is selected (comment-tolerant edit, idempotent, transparent — see `src/tsconfig.ts`).

## "weakest option" was actually the strongest — the brief misjudged option 3
**Expected:** The bug report ranked "neutralize via extension rename" as the weakest fix ("fragile against the parent project's globs").
**Actual:** That critique applies to *adding ignore files inside docs/* — not to *renaming so the offending extension doesn't exist*. A `.template` suffix is immune to `**/*.ts` and `**/*.test.ts` by construction, with zero user-config edits. The brief's preferred "patch the user's config" (option 1) was only truly needed for the **one** file that must stay `.ts` (the live `.pi/` extension) — narrowing a "rewrite all configs" idea down to a single `exclude` entry for Pi users.
**Impact:** Lesson for future scaffolding: prefer making shipped non-source files un-globbable by extension (`.template`) over editing the user's toolchain config; reserve config edits for files that genuinely must keep a compilable extension.

## Comment-tolerant tsconfig editing is mandatory
**Expected:** Could `JSON.parse` the user's tsconfig to edit it.
**Actual:** create-next-app's `tsconfig.json` contains comments → `JSON.parse` throws. The editor strips comments for *analysis* only and writes via surgical text insertion, preserving the user's comments/formatting (never round-trips through `JSON.stringify`, which would delete them).
**Impact:** Any future "patch a user config file" feature must assume JSONC and edit textually, not parse-and-restringify.
