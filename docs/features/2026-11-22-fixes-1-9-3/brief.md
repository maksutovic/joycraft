---
feature: fixes-1-9-3
decisions: []
---

# 1.9.3: parallel worker dispatch fixes

Fix the parallel worker-dispatch bugs that 1.9.2 showed in a field project, as one small patch release, 1.9.3.

## Context and authorization

A coordinator in a field project (Claude Code, Opus implementers) ran a queue with specs 1 and 2 in parallel. Three things went wrong:

1. Joycraft created worker trees with `worktrees.mjs`, then the coordinator launched the implementer subagents with the host's own worktree isolation as well. The first implementer was blocked: its sandbox could use only its own auto-created worktree, which the host then deleted because it was empty. The coordinator restarted it as a plain agent without isolation, inside the Joycraft worker tree, and that worked.
2. `dispatch-start.mjs` refused spec 1: "Parallel queue execution needs an attested workspace". The coordinator added `--coordinator`, `--parallel` and `--access` by hand.
3. The coordinator wrote the same user-facing paragraph twice, before and after the dispatch.

The session that started this work asked for the fix, a test for each bug, a 1.9.3 CHANGELOG entry and the release fields, then a PR for Max to merge. Its rule for bug 1: use the host's worktree isolation or Joycraft's worker tree, never both.

Assumption (bug 1): Joycraft's worker tree is the one home on every host, and a Joycraft worker never gets host worktree isolation. Why: it is the path that worked in the field; it keeps the coordinator's captured base revision (Claude's native base is the default branch unless `worktree.baseRef` is set), its ledger (`list`, `prune`) and a known path before launch. The other path (native isolation only) needs a user setting and gives a path the coordinator only learns after launch.

Rules for every spec:
- edit `payload/` and run `node scripts/pin-payload.mjs` (the queue is serial);
- each spec runs only its own test files; the recorded gate runs once per spec, before review;
- every-spec words do not grow (`tests/payload-guard.test.ts`: 79 spare at the base);
- no two specs edit the same source file.

## Goals

### workspace

A parallel implementer's `dispatch-start.mjs` finds its workspace without flags: `worktrees.mjs create` records the coordinator's root, and startup reads it, else the coordinator lease's root. When neither names it, the refusal prints the exact startup command with the flags added.

### one-home

The implement skill, `worktrees.md`, `dispatch.md` and the implementer agent send each parallel worker to its Joycraft worker tree and never ask the host for worktree isolation as well. The worker learns its root from the coordinator and runs its commands there.

### one-update

The implement skill says a stage update once: the coordinator does not repeat before-dispatch text after the dispatch.

### release

`package.json`, `src/joycraft-release.json` and `CHANGELOG.md` carry 1.9.3.

## Scope and limits

- No change to how a serial spec starts, to reviewer startup, or to explicit workspace flags.
- Codex, Pi, OMP, Copilot and OpenCode already had no native isolation path in the text; they get the same one-home rule.
- Bug 3 has no single instruction that says "repeat"; the fix is a "say it once" rule beside the stage-update instruction.
