# Migration: Flat → Per-Feature Layout (v0.6+)

> [Back to README](../../README.md)

Starting in v0.6, Joycraft organizes feature artifacts into per-feature folders:

- `docs/briefs/<slug>.md` → `docs/features/<slug>/brief.md`
- `docs/research/<slug>.md` → `docs/features/<slug>/research.md`
- `docs/designs/<slug>.md` → `docs/features/<slug>/design.md`
- `docs/specs/<feature>/` → `docs/features/<slug>/specs/` (when `<feature>` matches a brief slug)

`npx joycraft upgrade` performs this migration automatically and forcefully on the first
post-upgrade run — no Y/N prompt. The CLI prints a summary of every move before applying it.
Spec directories under `docs/specs/` whose name doesn't match any brief slug (area-level specs
like bugfix folders) are left in place.

## What you'll see on the first post-upgrade run

```
Joycraft is migrating your docs/ to the new per-feature layout:

  2026-04-01-auth-redesign/
    docs/briefs/2026-04-01-auth-redesign.md → docs/features/2026-04-01-auth-redesign/brief.md
    docs/research/2026-04-01-auth-redesign.md → docs/features/2026-04-01-auth-redesign/research.md

  Left in place — area-level specs (e.g., bugfix areas):
    docs/specs/login-bugfix/

Migration complete. See the README section "Migration: Flat → Per-Feature Layout"
for context on what changed and why. If your project is a git repo, run
`git status` to inspect the moves before committing.
```

## Why forced (not opt-in)

All doc-producing skills (`joycraft-new-feature`, `joycraft-research`, `joycraft-design`,
`joycraft-decompose`, etc.) write to the new per-feature paths. Supporting both layouts
indefinitely would mean every skill carries dual-path branches; the forced migration keeps
the convention single and skills small.

## Recovering / customizing

Every move is a plain filesystem move (no `git mv`). If you want a different organization
after the migration, you can `git mv` files anywhere — Joycraft only depends on the
`docs/features/<slug>/` shape for skills it ships, not on every doc living there. Git
history follows files via `git log --follow`.

If a brief and its destination already exist (re-running upgrade after a partial migration),
the move is skipped and reported. The migration is idempotent.
