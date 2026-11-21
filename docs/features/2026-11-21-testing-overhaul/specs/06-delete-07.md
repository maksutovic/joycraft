---
id: 6
status: in-review
---
# Outcome

No trace of 0.7 remains in this repo (decision `self-install`: "zero trace", reinstall latest). Dead `src/*.ts`, the 0.7 skill and template trees, the generators, the installed 0.7 copies, the `main` exports (decision `main-exports`: delete) and their tests are gone. This repo runs the current Joycraft install. The migration inventory and v07 fixtures that 1.x needs to migrate users stay.

## acceptance

- `dist/cli.js` and `payload/` bytes are equal before and after the deletion (`main` change aside).
- `pnpm test && pnpm typecheck` pass; suite wall time under 15 s.
- `AGENTS.md` has no `sync-skills` rule and no 0.7 path.
