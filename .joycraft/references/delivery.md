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

For `push`, a cooperative lock keyed by remote and branch sits in Git's common
directory. It records PID and host, and takes a held lock only when that PID
is not running on this host. It requires a clean tracked/index
state, captures `HEAD`, the semantic index tree and tracked-file hashes, runs
the explicit verifier argv without a shell, and rejects a nonzero result. It
then proves those captured sources are unchanged before pushing the captured SHA
with ordinary Git non-force semantics. A harmless Git index cache refresh, such
as one caused by `git status`, does not change the semantic index binding.

An exit-zero verifier is only an observed command result, not an independent
PASS or review. This helper is not a sandbox and cannot guarantee that external
writers cooperate.

## Gate points and the gate receipt

`joycraft-implement` follows this section on every push. Workers and reviewers
run focused tests only; the coordinator runs the project gate (`tests.gate`).

- **When:** `node .joycraft/runtime/coordinator.mjs gate-plan --queue <queue>`
  prints the gate points. `tests.gateRuns: spec` (the default) gives one point
  per spec, so a solo user with one fast gate still knows which spec broke it;
  `wave` gives one per integrated wave, for a slow gate.
- **How:** run the gate alone on the integrated revision, through
  `node .joycraft/runtime/evidence.mjs run --receipt <path>.log -- <gate>`. A
  gate with shell syntax counts only as `<shell> -c "<gate>"` (see
  `delivery.mjs` usage); evidence.mjs runs no shell.
- **Clean tree:** `delivery.mjs` rejects a receipt whose footer says
  `dirty: true` as stale (`gate-receipt-stale`), and it needs the receipt
  inside the project. Write the receipt to a git-ignored path, or commit
  pending files first, so the run sees a clean tree at `HEAD`. A receipt must
  be git-ignored or in a feature folder, as `evidence.mjs` enforces. A
  receipt on an earlier revision still counts when every path changed since
  is under the docs root: a Markdown or JSON file there, or a record in a
  feature or archive folder. Any other changed path needs the gate again.
- **Push:** `delivery.mjs push ... --gate-receipt <path>.log` refuses without a
  green receipt for `HEAD`. A failed verifier stops delivery. Neither replaces
  independent review on the final integrated revision or authorizes a push.
- **On red:** `node .joycraft/runtime/coordinator.mjs gate-owner --queue <queue> --file <failing file>...`
  names the spec whose inputs hold the failing file; that spec gets the fix
  round. With no owner, bisect only the failing file, newest commit first. A
  second red holds the push and is reported.
- **CI:** read it once, on the PR, after session end's push (commit, then one
  push). After a second red CI run, stop and report. A project's own
  `AGENTS.md` push rule wins.
