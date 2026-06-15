# Spec 8 — bundled-files.ts is gitignored, so the spec's "in same commit" criterion is inert

Spec `brief-reconciliation-step` listed `src/bundled-files.ts` as one of the files to include in the regeneration commit, but `src/bundled-files.ts` is listed in `.gitignore` (line 11) — it's generated locally and never committed. The spec criterion is unreachable as written; only the 8 markdown files (2 canonical + 6 per-harness) end up in the commit. See `docs/features/2026-06-11-single-source-skills/specs/brief-reconciliation-step.md` Acceptance Criteria.
