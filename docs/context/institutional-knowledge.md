---
last_updated: 2026-09-22
last_updated_by: Maximilian Maksutovic
---

# Institutional Knowledge

> Unwritten rules and context that AI agents can't derive from code.

## Team Conventions

- Commit style is `verb: concise message` — no conventional commits prefix like `feat:` or `fix:`
- A feature lives in `docs/features/<date>-<slug>/`: `brief.md`, and a specs folder with numbered specs and `.joycraft-spec-queue.json` (the status of record)
- Skills are namespaced `joycraft-*` to avoid collisions with other plugins
- Discoveries are logged in `docs/discoveries/` — capture surprises, not routine work
- Editing a PR body: `gh pr edit` fails in this repo (GraphQL Projects-classic deprecation error, edit silently not applied). Use `gh api repos/<owner>/<repo>/pulls/<N> -X PATCH -F body=@<file>` and verify with `gh pr view <N> --json body`

## Organizational Constraints

- Single maintainer (Maximilian Maksutovic) — all publishing goes through npm trusted publishing via GitHub Actions
- Every merge to main auto-publishes to npm (patch bump if no manual version change) — no manual releases needed
- The `RELEASE_TOKEN` secret (fine-grained PAT) is required for the publish workflow to push version bump commits to protected main
- Public open-source project — all code, issues, and PRs are visible
- Users run this via `npx` — no guarantee they have Joycraft installed globally

## Historical Context

- The project was originally called "Joysmith" (repo name) but the package is "Joycraft" — both names appear in various places
- Skill namespacing was added after bare skill names (`tune`, `decompose`) collided with other Claude Code plugins in the wild
- The CLAUDE.md merge logic (`improve-claude-md.ts`) is the most complex and dangerous code — it parses user files and must never destroy content

## People & Ownership

- Maximilian Maksutovic — sole maintainer, handles all publishing, reviews all PRs
- Praful Mathur — cofounder, primary power user, drives feature requirements from real autonomous development experience (hardware/firmware stack)
- The "craft" metaphor is intentional — Joycraft enables human contextual stewardship of AI-assisted development

## Feature Runs With Worktree Swarms

- A fresh worktree needs `pnpm install --frozen-lockfile` and `pnpm build` before `tests/package-acceptance.test.ts` passes.
- Worktree agents cherry-pick cleanly when the queue JSON edits are on non-adjacent lines; the driver owns the merge back.
