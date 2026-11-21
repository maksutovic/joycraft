---
id: 1
status: todo
---
# Cleanup lists its own checks and checks ignores in one batch

Parent: [brief](../brief.md), sections `check-listing`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `node payload/.joycraft/runtime/cleanup.mjs --checks` prints one line per check: id, what it finds, `report` or `mechanical`. Check: a test compares the printed ids with every `check:` id that `cleanupReport` can emit (read from the source); they are equal.
- `payload/.joycraft/references/cleanup.md` has no check table; one sentence names `cleanup.mjs --checks`. Check: the test reads the file and finds no table row naming a check id, and finds the command; payload words go down.
- missing-path filters ignored paths with one `git check-ignore --stdin` call. Check: a fixture page with 200 backticked missing paths, 100 of them git-ignored, reports exactly the 100 others, and the run spawns one check-ignore process (count spawns by wrapping execFileSync or by timing a 500-path fixture under 2 s).
- The impact-drift fix text asks for a doable action: update the page, or add a `verified: <date>` line to it. Check: the finding's `fix` string contains `verified:` and no longer says to commit the page unchanged.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/cleanup.mjs`, `payload/.joycraft/references/cleanup.md`.
- Test: `tests/runtime-cleanup-checks.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-1-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.
