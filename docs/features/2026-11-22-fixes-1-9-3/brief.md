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

Later, the starting session added three cheap items from a second trial project (a serial queue of 3 specs with reviewer subagents): every reviewer ran `dispatch-start.mjs --help` and was refused, then searched the script for flag names; `check-report` refused an observation for missing receipts without saying what to add; and archive refused a brief that recorded an owner decision after a spec was accepted. The reviewers here also could not see their own agent IDs, and they asked for the same `cd <worker-root> &&` form the implementer got.

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

### reviewer-start

`dispatch-start.mjs --help` prints the startup command with placeholders and exits 0. `check-report`'s refusal of an observation without receipts shows the field to add. The reviewer agent names the start command and the `cd <worker-root> &&` form, and `dispatch.md` says the coordinator sends a Claude Code child its agent ID.

### amendment-message

A brief edited after acceptance stays a requirement change: archive keeps refusing until `brief-amendments.json` names the owner decision for each later commit, as `archive.md` documents. The refusal names that record, each commit with its before and after hashes, and the reference.

### release

`package.json`, `src/joycraft-release.json` and `CHANGELOG.md` carry 1.9.3.

### followups-1-10-3

Two review follow-ups, shipped in 1.10.3. An amendment refusal for a commit whose parent has no brief prints the hash of empty content, which no record can match; it prints `null` instead, and a record with `null` for the absent side passes. `dispatch.md` gives the `cd <worker-root> &&` form with the reason the implementer agent gives; the reviewer agent's text is pinned by the reviewer benchmark and waits for its next change.

## Scope and limits

- No change to how a serial spec starts, to reviewer startup, or to explicit workspace flags.
- Codex, Pi, OMP, Copilot and OpenCode already had no native isolation path in the text; they get the same one-home rule.
- Bug 3 has no single instruction that says "repeat"; the fix is a "say it once" rule beside the stage-update instruction.
