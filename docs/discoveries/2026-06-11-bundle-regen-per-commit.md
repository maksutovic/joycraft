---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-11
feature: 2026-06-11-frictionless-implement
---

# Bundle regeneration cannot be deferred to a final wire-up spec

The frictionless-implement plan put `generate-bundled-files.mjs` + count bumps in a final `wire-and-bundle` spec, assuming skill-source edits could land unbundled in earlier commits. In practice `tests/bundled-files-sync.test.ts` and the installed-copy parity tests (e.g. `tests/spec-done-skill.test.ts`) fail the moment a source skill diverges from `src/bundled-files.ts` or from the repo's own `.claude/.agents/.pi` installed copies — so every spec that touches a skill must regenerate the bundle, sync the installed copies, and (when adding a skill) bump the count assertions *in the same commit* to keep the per-commit test gate green.

Implication for future decompositions: don't create a standalone "regenerate the bundle" spec; fold regeneration into each skill-editing spec and let the wire-up spec carry only docs/counts that aren't test-enforced.
