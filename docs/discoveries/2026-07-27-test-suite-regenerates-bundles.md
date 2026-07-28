Running the test suite regenerates `src/{claude,codex,pi}-skills/` and `src/bundled-files.ts` as a side effect — `tests/regenerate-bundled-files.test.ts` shells out to `scripts/generate-bundled-files.mjs` — so a spec scoped to `src/skills/` alone still ends with dirty generated trees, and concurrent specs running the suite make the failure set shift between identical runs.

See `docs/features/2026-07-27-human-readable-output-style/specs/add-style-pointers-to-skills.md` (constraint: must not edit generated trees; spec 6 owns them).
