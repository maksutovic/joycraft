---
feature: fixes-1-9-4
decisions: []
---

# 1.9.4: field follow-ups for queue runs

Fix the gaps a field project's queue report showed after 1.9.3, as one patch release, 1.9.4.

## Context and authorization

A field project ran a four-spec queue on 1.9.2 (specs 1 and 2 in parallel, then 3 and 4 serially; Claude Code; checkpoint mode). Its report listed seven items. 1.9.3 already fixes two (parallel startup flags; reviewer agent ID) and part of a third (one worker home). Max, 2026-11-22, accepted this scope with "make it so":

- the project's own implementer agent type set `isolation: worktree` in its frontmatter, so a worker launched as it could not use the Joycraft tree;
- the reviewer's report path came from the runtime while the project asked for another, and a re-review overwrote the earlier report at the same path (seen in 1.9.3's own run: the round count fell back to 1);
- a later spec edited a done spec's accepted test and code; there was no warning, no way to reopen the done spec, and `finalize-review` refuses to replace an accepted report;
- a coordinator's integration edit broke a test that a rerun of the focused tests would have caught;
- the update guide did not say when an update is safe during a queue.

Not in scope: queue writes for one spec do not stale another spec's subject already (the binding drops completion metadata), so that ask needs no change. The ask about gate-only checks (a ratchet) waits on the field team's answer about whether their gate ran.

Rules for every spec: edit `payload/` and run `node scripts/pin-payload.mjs`; each spec runs only its own test files, and the recorded gate runs once per spec before review; every-spec words stay under their caps (`tests/payload-guard.test.ts`), and on-demand text keeps 600 words spare.

## Goals

### reopen

`completion.mjs reopen --queue --spec --reason` moves a done spec, accepted by a PASS review, whose accepted code, check or fixture input changed, back to `in-review`. It keeps the old accepted report in a `reopened` record, and the next reviews count their rounds afresh. `finalize-review` then accepts a new PASS as usual. `submit` warns about each other done spec whose accepted input changed and prints its `reopen` command. Each reviewer startup gets a new report path, so a re-review never overwrites an earlier report.

### isolation-warning

`worktrees.mjs create` warns when a project agent file under `.claude/agents/` sets `isolation: worktree`, and names an agent type to use instead.

### field-text

The implement skill names the agent-type frontmatter, reruns the focused tests after any integration edit, and points to `reopen`. `completion.md`, `dispatch.md` and `update.md` describe reopen, the report path rule, and updating only between specs.

### release

`package.json`, `src/joycraft-release.json` and `CHANGELOG.md` carry 1.9.4.

### followups-1-10-3

Three review follow-ups, shipped in 1.10.3. `reopen` and `submit` say when a done spec's accepted report is missing, instead of "no input changed". Reviewer startup in a worker tree also skips a report path that exists in the coordinator's tree. `worktrees.mjs create` does not fail on a directory under `.claude/agents` whose name ends in `.md`, and it also warns about agent files in subfolders, which Claude Code loads.

## Scope and limits

- No change to an owner-accepted or waived spec: `reopen` applies only to a PASS acceptance.
- Requirement inputs (brief, spec, queue) are left out of the changed-input check; archive and review already own them.
