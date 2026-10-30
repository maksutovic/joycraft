# Optional delivery guard

`runtime/delivery.mjs` is an optional, local last-mile helper for a repository
whose author has already chosen a remote and branch. It only pushes an existing
commit and never fetches, merges, commits, forces, or infers a destination.

```sh
node .joycraft/runtime/delivery.mjs check --root . --base <reviewed-base>
node .joycraft/runtime/delivery.mjs push --root . --base <reviewed-base> --remote origin --branch feature/example -- ./verify.sh
```

The base is immediately resolved to a commit SHA and must be an ancestor of the
captured `HEAD` (the same commit is valid). The check observes the
committed `base..HEAD` range, rejects newly added conflict-marker lines, and parses
only changed, nondeleted `.json` and `.jsonl` files from `HEAD`. It also rejects
an unresolved index or active merge/cherry-pick/rebase state. Output is one JSON
receipt with paths and SHAs; successful push receipts also contain verifier exit
status and byte-count/digest metadata. Verifier output itself is drained without
being retained or printed.

For `push`, the helper holds a cooperative lock keyed by the chosen remote and
branch in Git's common directory. An existing lock is refused for manual
diagnosis; it is never broken automatically. It requires a clean tracked/index
state, captures `HEAD`, the semantic index tree and tracked-file hashes, runs
the explicit verifier argv without a shell, and rejects a nonzero result. It
then proves those captured sources are unchanged before pushing the captured SHA
with ordinary Git non-force semantics. A harmless Git index cache refresh, such
as one caused by `git status`, does not change the semantic index binding.

An exit-zero verifier is only an observed command result, not an independent
PASS or review. This helper is not a sandbox and cannot guarantee that external
writers cooperate. It does not implement private-school pnpm/CI/storage policy.
