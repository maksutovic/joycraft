# Test suite regenerates bundles, so "installed copies stay stale until spec 6" is false

`tests/regenerate-bundled-files.test.ts` executes `scripts/generate-bundled-files.mjs` in a `beforeAll`, so any edit to `src/skills/` regenerates `src/*-skills/` on the next `pnpm test` and turns `installed-skills-sync` + `decompose-modes` red (24 failures) until `pnpm sync-skills` runs — spec 6 (`regen-and-sync.md`) assumes a green suite as its precondition, so deferring the sync would have made that precondition unsatisfiable.

Spec: `docs/features/2026-07-29-succinct-gates/specs/inline-gate-slot-contracts.md` (Constraints: "MUST NOT: regenerate bundles or sync installed copies"); the upside is the windowed suites in `tests/retrieval-pass-skill.test.ts` and `tests/confidence-scoring-skill.test.ts` verified slot-template placement against fresh installed copies now rather than at spec 6.
