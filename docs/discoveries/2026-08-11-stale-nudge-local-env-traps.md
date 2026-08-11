---
status: todo
owner: Maximilian Maksutovic
created: 2026-08-11
feature: bugfix-stale-nudge-after-reexec
---

# Two local-env traps found while fixing the stale update nudge

**Local `main` lags origin.** Releases land on `origin/main` via CI (`release: vX [skip ci]`), so a local `main` that is not pulled can be several versions behind. Branching off local `main` produced 13 test failures that had nothing to do with the change. Branch off `origin/main`, not local `main`.

**Local dogfood state fails version-sync.** `docs/.joycraft/state.json` is a gitignored, untracked artifact from running joycraft on itself. After every npm release it goes stale (test compares it to `package.json`), so `tests/version-sync.test.ts` fails locally until the repo dogfoods `upgrade` again. CI never sees the file, so CI stays green. Do not chase this failure inside an unrelated branch.
