# Optional delivery guard

`runtime/delivery.mjs` is an optional, local last-mile helper for a repository
whose author has already chosen a remote and branch. It only pushes an existing
commit and never fetches, merges, commits, forces, or infers a destination.

```sh
node .joycraft/runtime/delivery.mjs check --root . --base <reviewed-base>
node .joycraft/runtime/delivery.mjs push --root . --base <reviewed-base> --remote origin --branch feature/example -- ./verify.sh
```

The base resolves to a commit SHA that must be an ancestor of, or equal to,
the captured `HEAD`. The check observes the
committed `base..HEAD` range, rejects new conflict-marker lines, and parses
only changed, nondeleted `.json` and `.jsonl` files from `HEAD`. It also rejects
an unresolved index or active merge/cherry-pick/rebase state. Output is one JSON
receipt with paths and SHAs; a successful push receipt adds the verifier's exit
status, byte count and digest. Verifier output is drained, never kept or printed.

For `push`, a cooperative lock per remote and branch in Git's common directory
records PID and host; a held lock is taken only when that PID is not running
here. It requires a clean tracked/index
state, captures `HEAD`, the semantic index tree and tracked-file hashes, runs
the verifier argv without a shell, and rejects a nonzero result. It
then proves those captured sources are unchanged before pushing the captured SHA
without force. An index cache refresh (from `git status`,
say) does not change the semantic index tree.

An exit-zero verifier is an observed result, not an independent
PASS or review. This helper is no sandbox and cannot make external writers
cooperate.

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
  `dirty: true` as stale (`gate-receipt-stale`). Write the receipt to a
  git-ignored path, or commit pending files first, so the run sees a clean
  tree at `HEAD`. A receipt must be inside the project, git-ignored or in a
  feature folder, as `evidence.mjs` enforces. A receipt on an earlier
  revision still counts when every path changed since is under the docs
  root: a Markdown or JSON file there, or a record
  (`.md .json .log .txt .diff .patch .yaml .yml`) in a feature or archive
  folder, never `package.json`, `tsconfig*.json` or a lockfile. Save a probe
  script kept as a receipt with a `.txt` suffix (`probe.mjs.txt`) so it
  stays a record. Any other
  changed path needs the gate again.
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
