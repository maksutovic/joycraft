---
id: 1
status: done
---
# Worktree create, list and prune

Brief goal `worktree-lifecycle`. Code lives in `joycraft-prototype` and is vendored.

## acceptance

- `worktrees.mjs create --queue <q> --spec <id> --session <coordinator>` makes a
  linked worktree at `.joycraft/local/worktrees/<feature>-<spec>` on branch
  `joycraft/<feature>-<spec>` from the given or current base revision, and records
  it in `.joycraft/local/worktrees.json`. Check: create on a temp repo, then
  `git worktree list` shows the tree and the ledger has one entry.
- `list` shows every linked worktree with owner spec, spec status, merged state,
  clean/dirty and size; a tree that Git knows but the ledger does not is
  `unknown-owner`. Check: an extra `git worktree add` tree shows as unknown.
- `prune` previews by default. With `--apply` it removes only ledger-owned, clean
  trees whose spec is `done` and whose branch tip is contained in the integration
  ref (default `HEAD`), deletes the merged branch safely (`git branch -d`) and drops
  the ledger entry. It keeps every other tree and prints why. Check: two done and
  merged specs are removed; an `in-review` spec, a dirty tree and an unknown tree stay
  with reasons.
- No tree is ever removed with `--force`. Check: a dirty done tree survives `--apply`.

## Not covered

Moving existing invented folders (such as `retained-worktrees`); `list` reports them
as unknown so the user decides.
