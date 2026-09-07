# Migration: Flat → Per-Feature Layout (v0.6+)

> [Back to README](../../README.md)

Starting in v0.6, Joycraft organizes feature artifacts into per-feature folders:

- `docs/briefs/<slug>.md` → `docs/features/<slug>/brief.md`
- `docs/research/<slug>.md` → `docs/features/<slug>/research.md`
- `docs/designs/<slug>.md` → `docs/features/<slug>/design.md`
- `docs/specs/<feature>/` → `docs/features/<slug>/specs/` (when `<feature>` matches a brief slug)

Routine `update`/`upgrade` runs do not move project documents. Preview this
migration explicitly, then apply the reviewed plan:

```bash
npx joycraft@latest migrate
npx joycraft@latest migrate --apply
```

The preview lists every move. Existing destinations are preserved as
collisions; use `--replace-collision <paths...>` only for destinations you
reviewed. Spec directories under `docs/specs/` whose name doesn't match any
brief slug (area-level specs like bugfix folders) stay preserved unless you
explicitly select them with `--include-unknown <paths...>`.

## What you'll see in the migration preview

```
Joycraft migration plan:
  docs/briefs/2026-04-01-auth-redesign.md → docs/features/2026-04-01-auth-redesign/brief.md
  docs/research/2026-04-01-auth-redesign.md → docs/features/2026-04-01-auth-redesign/research.md
  Preserve unowned document: docs/specs/login-bugfix/ (candidate: docs/bugfixes/login-bugfix/)
```

The preview is read-only. After reviewing it, add `--apply`; inspect
`git status` before committing the moves.

## Why it is explicit

All doc-producing skills (`joycraft-new-feature`, `joycraft-research`, `joycraft-design`,
`joycraft-decompose`, etc.) write to the new per-feature paths. Keeping document
migration separate from routine updates makes file moves reviewable and avoids
silently changing project content during a bundle refresh.

## Recovering / customizing

Every move is a plain filesystem move (no `git mv`). If you want a different organization
after the migration, you can `git mv` files anywhere — Joycraft only depends on the
`docs/features/<slug>/` shape for skills it ships, not on every doc living there. Git
history follows files via `git log --follow`.

If a brief and its destination already exist, the destination is skipped and
reported. Use `--replace-collision` for a deliberate replacement. The migration
is idempotent when collisions are left preserved.
