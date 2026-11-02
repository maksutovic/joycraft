---
id: 3
status: done
---
# Status drift check

Brief goal `stale-status`.

## acceptance

- `status.mjs` reads every `docs/features/*/specs/.joycraft-spec-queue.json` and
  prints, per feature, each spec's queue status and frontmatter status. Check: a
  two-feature fixture prints both.
- A spec whose queue and frontmatter disagree is listed under `drift`. Check:
  queue `done`, frontmatter `todo` → listed.
- `--fix` updates the spec frontmatter only when the queue says `done` and carries
  `acceptedReport` or `ownerAcceptance`; every other drift is reported, not changed.
  A pending completion journal blocks `--fix` and points to `completion.mjs recover`.
  Check: one fixable and one unfixable drift; only the first changes.
- A feature whose specs are all `done` is listed under `readyToArchive`, with any
  still-`open` brief decisions. Check: fixture feature appears there.
- `status` also counts ledger-owned, prunable and unknown worktrees. Check: counts
  match `worktrees.mjs list`.
