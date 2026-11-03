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
| `missing-path` | A backticked project path in `AGENTS.md`, `CLAUDE.md` or a context page that does not exist | Point it at the current path, or drop the line |
| `unmapped` | A context page that only other context pages mention; no entry file links or names it | Add a context-map row with a "read when", or merge the page |
| `entry-size` | `AGENTS.md` or `CLAUDE.md` over `cleanup.entryWords` words (default 1000) | Move detail into context pages; leave a map row for each |
| `impact-drift` | A page mapped in `cleanup.impact` whose code changed in commits after the page last changed | Read the change; update the page, or commit it unchanged when still true |
| `stale-after` | An OKF `stale_after` date that has passed | Recheck, then move the date or mark the page `deprecated` |
| `deprecated-link` | A link to a page marked `status: deprecated` | Link the current page |
| `frontmatter-unreadable` | Page frontmatter in YAML that cleanup cannot read, so its `status` and `stale_after` go unchecked | Use plain `key: value` lines, lists and quoted strings |
| `unknown-worktree` | A linked worktree that `worktrees.mjs` did not create | Check for unmerged work, then remove with approval |

Fenced code blocks are ignored. Inline, reference-style and `<angle>` links count.
Backticked paths such as `` `docs/context/x.md` `` count as references for
`orphan`, `unmapped` and `working-link`. `broken-link` checks Markdown links;
`missing-path` checks backticked spans that read as project paths: they contain a
`/` and end in `/`, have a file extension, or start with an existing top-level
folder. It skips spans with spaces, globs (`*`), placeholders (`<slug>`, `[slug]`,
`{x}`, `$VAR`, `...`), URLs and other `:` forms, and absolute, `~` or `../` paths.
A path in a context page may be relative to the project root or to the page.
History pages are exempt from `missing-path`, because they rightly name paths that
were later removed: a page whose frontmatter has `type: log` or `type: history`,
and any file named `decision-log.md` or `shipped*.md`. Their links are still
checked.

The impact map lives in `joycraft.yaml`:

```yaml
cleanup:
  impact:
    - source: src/auction/**
      docs: [docs/context/auction-rules.md]
```

`*` matches within a folder and `**` across folders. A page with no commit yet is
skipped. Pages may carry OKF frontmatter (`type`, `status`, `stale_after`,
`verified`); cleanup reads `status` and `stale_after` when present, and `type`
for the history exemption above.

## Doc roles

Inventory gives every in-scope doc one role:

- **entry**: `AGENTS.md` and `CLAUDE.md`, loaded every session.
- **required**: an entry doc says to read it.
- **reference**: read when a task needs it; it gets a context-map row.
- **historical**: kept for lookup, not guidance; it gets no map row.

## The six rot patterns

From doc-cleanup. Test every in-scope doc for each; a doc claim is a hypothesis
and the code is the evidence.

1. **Completed-work logs.** Finished checklists, phase logs, implementation
   narratives, post-mortems and verification transcripts presented as guidance.
2. **Executed plans.** A shipped plan still written as intent, with its
   superseded analysis and rejected options.
3. **Internal contradictions.** One fact with two values, a stale table corrected
   by a note below it, dated addenda that reverse earlier text.
4. **Stale claims.** Renamed symbols, changed constants, wrong line numbers, work
   called unmerged after it landed.
5. **Dead paths.** Missing files, old machine paths, moved repositories, removed
   tools.
6. **Authority drift.** A "source of truth" that no longer matches the code or a
   later decision.

Each phase has an end:
- **Inventory** ends when every in-scope Markdown file has a role and every entry
  pointer is resolved, dead or external.
- **Diagnose** ends when every inventoried file has an evidence-backed finding or
  is marked clean. Files `cleanup.mjs` did not flag still get read.
- **Report** ends when the user can approve, reject or amend each change without
  more investigation.
- **Execute** ends when each approved finding has a diff or a stated reason for
  none, and each retained claim was re-checked.

## Trimming an entry file

`AGENTS.md` and `CLAUDE.md` load into every session. They keep the project's
identity (a line or two on what it is), its rules, the Joycraft lines and the
context map. Propose moving the rest into context pages, each with a map row:

| In the entry file | Move to |
|---|---|
| Key-files or module tables | A codebase reference page, e.g. `docs/context/codebase.md` |
| Folder trees and architecture maps | The same page, or `docs/context/architecture.md` |
| Data-flow and code walkthroughs | The same page, beside the files they walk through |
| Setup, build, test and release workflows | `docs/context/workflow.md`; keep one test-command line in the entry if the rules need it |
| Gotchas and traps that are not rules | The project's traps page (see knowledge guidance), each as a short imperative |

Reuse a page the map already has before creating one, and create a page only
with the content it receives. Rules never move and are never reworded,
reordered or reformatted: ALWAYS / ASK FIRST / NEVER lists and any other section
that says what an agent must or must not do (release rules, holdout or
confidentiality rules). If a rule is also stale, report it as a finding for the
user to decide; do not fix it as part of the trim. After a move, the entry file
names each new page in the map, and `cleanup.mjs` reports no `unmapped` or
`orphan` page for it.

## Execution playbook

Re-check each factual claim against the code immediately before writing it.

- **Archive history worth finding again.** Put a verbatim copy, or a clearly
  bounded extract, under `paths.archive` with a source-and-date name, and record
  the source path and Git blob hash in the report. Git history alone is enough
  when nobody will look for it. A finished feature folder is archived only
  through the session-end path (`archive.md`), after its durable facts reach the
  context home.
- **Rewrite live guidance as current facts**, following
  [knowledge guidance](knowledge.md): rewrite in place, reason to the decision
  log, no addenda. Live pages never link the archive (`working-link`); record
  each archive mapping in the cleanup report and the commit message instead.
- **Point to authorities.** Name the owning schema, config or source file instead
  of copying values that change.
- **Condense completed work.** Replace a finished checklist with its outcome;
  keep open items in their original words.
- **Preserve traps.** Keep each recurring gotcha as a short imperative before
  moving the story of how it was found.
- **Banner unresolved drift.** When the code and a contract-like doc disagree and
  the repository does not show which governs, add a short banner naming the
  mismatch and the authority in force; do not rewrite the contract.
- **Repair entry docs.** Fix dead reading pointers and stale claims, apply the
  approved trim, and keep the required-reading set small.

## Verify

Every relative link in touched files resolves; archives match their sources
byte for byte (extracts match their recorded bounds); load-bearing content found
in diagnosis survives in live guidance, with rules byte-identical; the diff holds
only approved Markdown changes; no new contradiction appears across touched docs;
`cleanup.mjs` reports nothing new.
