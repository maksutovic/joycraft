---
last_updated: 2026-05-21
last_updated_by: Maximilian Maksutovic
---

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
| 2026-03-26 | Auto-publish on every merge to main | Eliminates manual version bumps and npm publish — every merge ships | Manual `npm publish` (easy to forget), separate release branch (overkill for solo/small team) | If we need release candidates or staging |
| 2026-03-26 | Fine-grained PAT via checkout `token` param for publish push | Bypasses branch protection for version bump commits; checkout action handles auth via HTTP headers | Embedding PAT in remote URL (breaks with fine-grained PATs), GitHub App (more setup for same result) | If GitHub deprecates PATs or adds native bypass for Actions |
| 2026-05-21 | Lean CLAUDE.md + `## Context Map` pointer table; long-form refs in `docs/context/reference/` | Keep the always-loaded harness file small; link out to on-demand reference docs instead of inlining. tune flags CLAUDE.md >~200 lines (advisory) | One mega CLAUDE.md (bloats every session), one mega reference template (harder to scaffold specifically) | If pointer indirection proves more friction than inlining for small projects |
| 2026-05-21 | `/joycraft-setup` is a thin alias routing to `/joycraft-tune`, not a rename | Newcomer-facing door ("set up / get started") without breaking existing users' `tune` muscle memory or doc/memory references | Renaming tune→setup (breaks references), setup reimplementing detect+route (duplicates tune, drifts) | Never — alias is additive |

## Principles

- Prefer zero/minimal dependencies — this is a CLI tool users run via npx
- Templates and skills are the product — treat changes to them like API changes
- Append over modify when touching user files — never destroy existing content
- Eat your own dogfood — Joycraft's own repo uses Joycraft's harness
