---
last_updated: 2026-11-20
last_updated_by: Maximilian Maksutovic
---

# Institutional Knowledge

> Unwritten rules and context that AI agents can't derive from code.

## Team Conventions

- Commit style is `verb: concise message` — no conventional commits prefix like `feat:` or `fix:`
- A feature lives in `docs/features/<slug>/` (optionally prefixed `YYYY-MM-DD-`): `brief.md`, and a specs folder with numbered specs and `.joycraft-spec-queue.json` (the status of record; the completion and archive runtime refuse a feature without one)
- Skills are namespaced `joycraft-*` to avoid collisions with other plugins
- Discoveries are logged in `docs/discoveries/` — capture surprises, not routine work
- Editing a PR body: `gh pr edit` fails in this repo (GraphQL Projects-classic deprecation error, edit silently not applied). Use `gh api repos/<owner>/<repo>/pulls/<N> -X PATCH -F body=@<file>` and verify with `gh pr view <N> --json body`

## Organizational Constraints

- Single maintainer (Maximilian Maksutovic) — all publishing goes through npm trusted publishing via GitHub Actions
- Every merge to main that changes a product path since the last `v*` tag publishes to npm (a docs-only merge skips `pack` and ends green): the workflow keeps a higher source version, else takes the next unused patch, and pushes no commit back to main (`docs/guides/releasing.md`)
- Public open-source project — all code, issues, and PRs are visible
- Users run this via `npx` — no guarantee they have Joycraft installed globally

## People & Ownership

- Maximilian Maksutovic — sole maintainer, handles all publishing, reviews all PRs
- Praful Mathur — cofounder, primary power user, drives feature requirements from real autonomous development experience (hardware/firmware stack)
- The "craft" metaphor is intentional — Joycraft enables human contextual stewardship of AI-assisted development

## Feature Runs With Worktree Swarms

- A fresh worktree needs `pnpm install --frozen-lockfile` and `pnpm build` before `tests/package-acceptance.test.ts` passes.
