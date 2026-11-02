---
id: 4
status: done
---
# Say what in docs/ is authoritative

Brief goal `docs-explanation`, plus skill wiring for specs 1–3.

## acceptance

- README (joycraft repo) and `references/context.md` state: `docs/context/` is the
  curated project knowledge; `docs/features/` is working material that can be stale
  until archived; Joycraft ships no wiki and works with one you bring; skills need
  not be called by name. Check: read the README section.
- `joycraft-implement` uses `worktrees.mjs create` for parallel specs and claims the
  coordinator lease before dispatch; `joycraft-session-end` runs `status.mjs`, then
  `worktrees.mjs prune`, and releases the lease. `references/worktrees.md` documents
  the commands. Check: skill validator passes; prose names the commands.
- CHANGELOG has a 1.0.1 entry.
