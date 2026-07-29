# Init must not insert the Execution Profile into an existing AGENTS.md

The spec implied init could insert the sentinel section into an AGENTS.md that lacks one, but `tests/harness-selection.test.ts` enforces "multi-tool init never touches an existing AGENTS.md or CLAUDE.md" — init is create-if-missing only, so insert-if-absent belongs to `upgrade` (and tune's offer).

See `docs/features/2026-07-29-succinct-gates/specs/capture-execution-profile.md` and the skip branch in `src/init.ts`.
