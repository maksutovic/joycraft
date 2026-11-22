# Spec 26 bullet 2: `--patch` end to end in a linked worktree

Revision: `6163e655888d72d9cf10c5c764092506f3881770` (branch `feature/drift-tidy`), 2026-11-21.

Steps, run in a temporary linked worktree of this repository under the session scratchpad:

1. `git worktree add --detach <scratchpad>/proof-wt HEAD`, then `pnpm install --frozen-lockfile` and `pnpm build`.
2. Saved fault `.joycraft/local/faults/gateRuns-check.diff` (gitignored, so the tree stays clean), copied here as
   `proof-patch-fault.diff` (sha256 `7b04fe7d4482aeeefcee412bc8d2a58ed1f800a4eea5b0d07f2c52692b662bec`). It replaces the
   `tests.gateRuns` check in `payload/.joycraft/runtime/config.mjs` with `requireValue(true, ...)`.
3. `git status --porcelain` before: empty.
4. `node payload/.joycraft/runtime/evidence.mjs run --receipt .joycraft/local/faults/patch-run.log --patch .joycraft/local/faults/gateRuns-check.diff -- pnpm test tests/runtime-config-tests.test.ts`
   exited 1. Result JSON: `proof-patch-result.json`. Raw receipt: `proof-patch.log`
   (sha256 `f9127bb99cf204ff8b14688ea337007f4884551c728b7ead632ab9694a71d24f`, matching the result's `receipts[0]`).
5. Result: `command.exitCode: 1`, `patch.patched: true`, `patch.restored: true`. The failing test is
   `[AC:spec-2-3] an unknown key, an empty command or a bad gateRuns names its tests setting and stops`; the other 4 pass.
6. `git status --porcelain` after: empty (0 bytes). `config.mjs` sha256 before and after:
   `dac5f409c01d593f9230fe695fa0ea29c343c1e7cb04bb09775af05dc240f62d`.
7. `git worktree remove --force <scratchpad>/proof-wt` (force for the ignored `node_modules`, `dist` and `.joycraft/local`), then `git worktree prune`.

Limit: one fault, one test file, on macOS with Node and pnpm, outside any sandbox. The Codex-sandbox worker run is deferred to the field project.
