# Cleanup checks

`cleanup.mjs` reports; it never edits. Each finding has `check`, `path`, often
`line`, a `detail` and a suggested `fix`. `skipped` lists checks it could not run.

| Check | Finds | Usual fix |
|---|---|---|
| `unarchived` | A feature whose specs are all `done` but is still in `paths.features` | Carry durable facts into the context home, then archive at session end |
| `status-drift` | Spec frontmatter that disagrees with the queue | `status.mjs --fix` for accepted done specs; otherwise reconcile by hand |
| `working-link` | `AGENTS.md`, `CLAUDE.md` or a context page linking into `paths.features` or `paths.archive` | Move the fact into the context home and link that |
| `broken-link` | A Markdown link to a file that does not exist | Fix or remove the link |
| `orphan` | A context page that nothing in `AGENTS.md`, `CLAUDE.md` or the context home mentions | Add a context-map row with a "read when", or merge the page |
| `impact-drift` | A page mapped in `cleanup.impact` whose code changed in commits after the page last changed | Read the change; update the page, or commit it unchanged when still true |
| `stale-after` | An OKF `stale_after` date that has passed | Recheck, then move the date or mark the page `deprecated` |
| `deprecated-link` | A link to a page marked `status: deprecated` | Link the current page |
| `frontmatter-unreadable` | Page frontmatter in YAML that cleanup cannot read, so its `status` and `stale_after` go unchecked | Use plain `key: value` lines, lists and quoted strings |
| `unknown-worktree` | A linked worktree that `worktrees.mjs` did not create | Check for unmerged work, then remove with approval |

Fenced code blocks are ignored. Inline, reference-style and `<angle>` links count.
Backticked paths such as `` `docs/context/x.md` `` count as references for
`orphan` and `working-link`; only real Markdown links are checked for existence.

The impact map lives in `joycraft.yaml`:

```yaml
cleanup:
  impact:
    - source: src/auction/**
      docs: [docs/context/auction-rules.md]
```

`*` matches within a folder and `**` across folders. A page with no commit yet is
skipped. Pages may carry OKF frontmatter (`type`, `status`, `stale_after`,
`verified`); cleanup reads `status` and `stale_after` when present. For a fuller
doc audit, such as docaudit, run it from `hooks.afterArchive`.
