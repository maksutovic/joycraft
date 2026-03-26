# Decision Log

> Why choices were made, not just what was chosen.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
| 2026-03-23 | Commander for CLI arg parsing | Minimal, stable, zero transitive deps — fits "keep it minimal" principle | yargs (heavier), meow (less maintained), raw process.argv (too manual) | If we need subcommand plugins or complex arg validation |
| 2026-03-23 | Copy skills as files, not symlinks | Skills must work after `npx joycraft init` without Joycraft installed | Symlinks (breaks without Joycraft), npm postinstall (fragile) | If skill updates become a major pain point (upgrade command mitigates this) |
| 2026-03-23 | Section-level CLAUDE.md merging over full replacement | Users customize their CLAUDE.md — overwriting destroys their work | Full replacement (loses user content), manual merge (users won't do it) | If merge logic becomes too complex to maintain reliably |
| 2026-03-24 | Namespace skills as `joycraft-*` | Avoids collisions with other Claude Code plugins (superpowers, vercel, etc.) | Bare names like `tune`, `decompose` (collided immediately) | Never — namespacing is the right pattern |
| 2026-03-25 | GitHub App token for autofix CI | Shows as distinct identity in PRs, cleaner than PAT | PAT (shows as repo owner, confusing), GITHUB_TOKEN (can't trigger workflows) | If GitHub changes App token permissions model |

## Principles

- Prefer zero/minimal dependencies — this is a CLI tool users run via npx
- Templates and skills are the product — treat changes to them like API changes
- Append over modify when touching user files — never destroy existing content
- Eat your own dogfood — Joycraft's own repo uses Joycraft's harness
