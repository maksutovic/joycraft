---
id: 25
status: todo
---
# Session end rides the PR: clean tree, records, tidy commit, prune, archive, one push

Parent: [brief](../brief.md), section `session-end-pr`. All 13 decisions are answered; they are quoted by ID.

Decision `session-end-push-order` = `commit-then-push`: "Records, one tidy commit, prune, archive last, then one push that opens the PR." Brief `session-end-pr`: it starts with a clean-tree check; on a dirty tree it reports and commits nothing of the user's; after merge, only a read-only "deployed and working" check at the next session start; no post-merge phase, no merged-PR detector, no `sessionEnd.commits` setting. This settles drift-tidy spec 12 and decision `tidy-dirty-tree`.

## acceptance

- `joycraft-session-end/SKILL.md` opens with the clean-tree check (`git status --porcelain`): on output it reports the findings, fixes nothing and commits nothing of the user's. Check: `tests/text-session-end-pr.test.ts` finds `git status --porcelain` before the first runtime command in the skill.
- The skill's steps run in this order: records (status, gate check, knowledge), the one tidy commit, worktree prune, archive last, then one push that opens the PR. Check: the test finds `status.mjs`, `tidy --verify`, `worktrees.mjs prune`, `archive.mjs archive` and "one push" in that order.
- After merge, the skill does nothing but say that the next session start checks, read-only, that the change deployed and works; the skill names no post-merge phase, merged-PR detector or `sessionEnd.commits`. Check: the test finds "read-only" and none of the three names; `pnpm test tests/drift-tidy-text.test.ts` still passes.
- Every-spec words do not grow in this spec (the reorder rewrites existing text). Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is not above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.agents/skills/joycraft-session-end/SKILL.md`, `tests/text-session-end-pr.test.ts`.
- Tests: `tests/text-session-end-pr.test.ts`, `tests/drift-tidy-text.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-25-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Keep the hold sentence "Never archive a feature whose question the user asked to wait" (asserted by `tests/drift-tidy-text.test.ts`). If the reorder must change that test, declare it under Test changes as class 1 first.
