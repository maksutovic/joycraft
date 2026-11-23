# fixes-1-9-4 review follow-ups

Non-blocking findings from the independent reviews of 1.9.4. None blocked acceptance.

## Spec 1 (reopen)

- The fresh round count after a reopen trusts each report's own `createdAt`; a report written later with an earlier time would not count toward the limit.
- The next free report name (`review-<id>-r<n>`) is checked only in the worker root; in parallel mode a report that exists only in the coordinator tree does not move the path.
- If the accepted report file is missing or unreadable, `submit` gives no warning and `reopen` says no input changed, instead of naming the missing report.
- A `done` spec that depends on a reopened spec stays `done`; nothing flags it.

## Spec 2 (isolation warning)

- A directory under `.claude/agents/` whose name ends in `.md` makes `isolatedAgents` throw `EISDIR` after the tree and ledger entry exist; filter to files.
- Agent files in subfolders of `.claude/agents/` are not scanned.
- `[AC:spec-n-m]` tags are not tied to a feature, so a trace can count another feature's test with the same ID (seen for `tests/runtime-dispatch-parallel.test.ts` and `tests/text-wave-gate.test.ts`).

## Spec 3 (field text)

- The implement skill's discovery cut dropped "report unresolved coverage"; the rule now lives only in `architecture.md`. "A local repair needs none" is less precise than "needs no architecture review".
- The implement skill no longer says where packets go; the verify skill, `completion.md` and the `dispatch.md` example still do.
- `worktrees.md`'s dispatch plan lost "print", "deterministic" and "aggregate capacity across active runs".

## Open owner question

- The field queue's spec 1 failed a ratchet that runs only in the project gate. Did its recorded gate run before review, and does that project's `tests.gate` include the ratchet? If yes, Joycraft needs a pre-acceptance check for gate-only guards; if no, the fix is in the project or the skill text.
