---
id: 9
status: todo
---
# evidence.mjs run --patch applies a saved fault, runs, and restores the tree byte for byte

Parent: [brief](../brief.md), section `fault-proof`. All 13 decisions are answered; they are quoted by ID.

Decision `fault-run-location` = `in-place-checked`: "evidence.mjs run --patch applies a saved fault, runs the test, reverses the fault and compares file hashes. It refuses to start on a dirty tree." Done when: `--patch` restores the tree byte-for-byte after a passing run and after a timeout.

## acceptance

- `evidence.mjs run --patch <fault.diff> --receipt <r>.log -- <command>` refuses (exit 2, nothing applied) when `git status --porcelain` shows any change, when the patch does not apply, or when the patch touches a path outside the project. Check: a dirty fixture and a non-applying patch both exit 2 and leave the tree unchanged.
- On a clean tree it applies the patch to the working tree only (no index or `.git` write), runs the command, reverses the patch and compares the SHA-256 of every file the patch touched with the hashes taken before; the result adds `patch: { path, sha256, patched: true, restored: true }`. Check: a git fixture where the fault makes `node check.mjs` exit 1 gives `command.exitCode: 1`, `restored: true`, and `git status --porcelain` is empty after.
- The tree is restored after a passing run and after a timeout as well, and a failed restore is reported with `restored: false` and exit 1, never as a pass. Check: a fixture whose patched command passes, and one that sleeps past `--timeout-ms 500`, both end with an empty `git status --porcelain` and byte-equal files.
- A timeout or a start failure is not a fault kill: the result keeps `timedOut: true` and `exitCode: null`, and the receipt footer records the patch path and hash. Check: the timeout fixture's footer JSON has `patch` and `exitCode: null`.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/evidence.mjs`, `tests/runtime-evidence-patch.test.ts`.
- Tests: `tests/runtime-evidence-patch.test.ts`. Tag each new test `[AC:spec-9-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- About 40 runtime lines (ruling row 4). Use `git apply` and `git apply -R` without `--index`.
- If the runner is killed, the fault can stay; the next run refuses the dirty tree (decision tradeoff). Do not add a recovery file.
- Text that tells agents when to use `--patch` is spec 18.
