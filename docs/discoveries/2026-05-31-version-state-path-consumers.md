The relocate-version-state spec's Affected Files table missed three *readers* of the old root path that the move silently breaks: `src/init-autofix.ts` + `src/cli.ts` (both use it as the "is-initialized" signal / version source) and the `init`-generated `joycraft-version-check.mjs` hook. Caught via the spec's own "re-grep is authoritative" note — updated all three (new path + legacy fallback).

See `docs/features/2026-05-31-relocate-version-state/specs/relocate-version-state.md` and `src/version.ts` (`STATE_PATH`/`LEGACY_VERSION_FILE`).
