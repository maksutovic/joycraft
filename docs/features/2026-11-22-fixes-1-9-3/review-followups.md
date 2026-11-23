# fixes-1-9-3 review follow-ups

Non-blocking findings from the independent reviews of 1.9.3. None blocked acceptance.

## Spec 1 (parallel workspace)

- `tests/runtime-dispatch-parallel.test.ts` `[AC:spec-1-3]` splits the printed command on spaces to rerun it, so the rerun works only for temp paths without spaces. The code quotes such paths correctly.
- Review round count: the reviewer overwrote `review-1.report.json` at the same path in rounds 2 and 3, and startup then printed `reviewRound: 1`. Rounds are counted from visible reports, so an overwritten report drops out of the count. Consider writing each round to its own report path, or refusing an overwrite.

## Spec 2 (one worker home)

- The implementer edited the spec's `## Test changes` after the base, to declare a title tag. It was a tag only, so the reviewer accepted it.

## Spec 4 (reviewer start)

- `joycraft-reviewer.md` says "never `&&` … or `cd` out of the root", then gives the `cd <worker-root> &&` form two lines later without the reason the implementer agent gives (no worktree isolation is active). Add the reason when the word budget allows.
- This repository's own installed copies (`.claude/agents/`, `.joycraft/runtime/`) are 1.9.2 until the repository is updated to 1.9.3.

## Spec 5 (amendment message)

- If the brief did not exist at `commit^`, the refusal prints the hash of empty content for `fromSha256`, and a record that copies it is refused.
- The test covers one later commit; the `; `-joined list for several commits is checked only by reading the code.

## Process (this run)

- A Claude Code reviewer child cannot see its own agent ID. The coordinator sent each one the ID from the launch result before its startup; `dispatch.md` now says so. Without it, `check-report` refuses with "An independent reviewer must have a distinct native actor".
- The `joycraft-reviewer` agent type was not loadable because the coordinating session started in the parent folder. The reviewers ran as general agents that read the agent file first.
- The machine was under heavy load from an unrelated job, so two untouched heavy tests hit the 5 s vitest timeout. A machine-local `.joycraft/local/evidence-env.json` (`VITEST_MAX_FORKS=4`) made the gate green without changing any test.
