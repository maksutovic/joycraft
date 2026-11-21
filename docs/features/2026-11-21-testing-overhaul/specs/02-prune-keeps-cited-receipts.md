---
id: 2
status: in-review
---
# Outcome

`worktrees.mjs` prune never deletes a receipt that an accepted report cites and that exists only in that worktree (field report R7).

## acceptance

- A worktree whose accepted review report cites a receipt path that is ignored and exists only in that worktree is kept, with a reason that names the file. Test with a real Git fixture.
- A worktree with no such file is pruned as before.
