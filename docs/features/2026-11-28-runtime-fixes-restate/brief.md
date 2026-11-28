---
feature: runtime-fixes-restate
decisions: []
---
# Feature intent

Max, 2026-11-28, after the Lance Martin talk panel
(https://claude.ai/artifact/Gf5eY5F4qXKzLFTrw22pVv): "oh wow these look like
really important fixes, lets do it -- regarding the in your own words -- i
think it would be nice for the agent to communicate this after a user's context
dump during entry prior to writing the brief -- it's one extra turn for the
security of clarity from the user let's add it"

"These fixes" are the six confirmed runtime bugs and the two worker token cuts
in that report. The prompt-text items A–C, the bench hygiene and the effort
sweep in the same report are not part of this feature.

## Context and authorization

- Findings come from four Fable 5.2 high panelists and two adversarial
  verifiers on origin/main e96636f (1.10.3). Each bug below was reproduced in a
  scratch repo, except the Windows spawn, which is confirmed from Node's docs.
- Authorized: fix the bugs, slim the implementer's start, add the restate step,
  and ship one release with its release fields (standing rule).
- Assumed: the release is 1.11.0, because the entry skill gains a new step.
- Assumed: the restate step is one chat turn. The user confirms or corrects in
  chat; it is a "quick yes/no or an open question with no options", which the
  entry skill already allows in plain chat. It is not a decision page.

## Goals

### linked-coordinator

Done when:
- A coordinator in a linked worktree whose HEAD is ahead of main creates a
  worker tree: the worker's `baseRevision` is the coordinator's HEAD, not main's.
  `test: tests/runtime-dispatch-parallel.test.ts`
- A queue that exists only on the coordinator's branch: `create` succeeds
  instead of failing with ENOENT. `test: same`
- `prune` from that coordinator removes a finished worker tree whose spec is
  done in the coordinator's queue and whose commits are in the coordinator's
  branch. `test: same`

### dispatch-manifest

Done when:
- An edit to an installed file that the dispatched role does not use (one
  blank line in `joycraft-session-end/SKILL.md`) does not refuse dispatch.
  `test: tests/runtime-dispatch-*.test.ts` (the spec names the file)
- A role file whose only difference is CRLF line endings does not refuse
  dispatch. `test: same`
- An edited role file still refuses dispatch with the same message. `test: same`

### windows-spawn

Done when:
- On win32, `evidence.mjs` and the small-job `close.mjs` start a command whose
  first word is a `.cmd` shim (`pnpm`, `npm`, `npx`) through `cmd.exe`, with
  each argument quoted. `test:` a unit test of the shared spawn helper with
  `process.platform` stubbed.
- On other platforms the spawn is unchanged (no shell). `test: same`

### stop-hook

Done when:
- With `stop_hook_active: true` and only failures whose step is "stop and tell
  the user", `gate.mjs` exits 0 and prints the failures for the user.
  `test: tests/runtime-gate*.test.ts`
- With `stop_hook_active: true` and a failure the agent can fix, the gate
  still blocks (exit 2), as today. `test: same`
- The gate no longer lists worktrees on each stop. `test: same` (it does not
  call the worktree listing)

### update-check-worktrees

Done when:
- `policy off`, a snooze and the fetch cache set in the main checkout hold in a
  linked worktree of the same repo. `test: tests/runtime-update-check*.test.ts`
- The implementer agent definition says to skip the update check, as the
  reviewer's does. `test:` a payload text check.

### diff-paths

Done when:
- A changed file named `src/café.ts` appears as `src/café.ts` in the
  coordinator's changed list and in a reviewer's scope, and a declared input
  with that name is not listed as `outside`. `test: tests/runtime-*.test.ts`
  (the spec names the file)

### worker-start

Done when:
- Implementer startup output includes the spec's own queue entry.
  `test: tests/runtime-dispatch-commands.test.ts`
- The implementer agent definition no longer tells the worker to follow the
  whole implement skill or `dispatch.md`; it opens another reference only when
  a command refuses or a step names it, and it does not open the queue file.
  `test:` a payload text check.

### restate

Done when:
- The entry skill says: when the user's request is a long context dump, before
  writing the brief, restate it in your own words in chat (their goals, the
  constraints, what you assumed, and open questions), ask whether it is right,
  and write the brief only after they confirm or correct it. `test:` a payload
  text check.
- A short request with nothing assumed skips the restatement. `test: same`
- The small-job path in the managed `AGENTS.md` block does not change.
  `test: same`
- The confirmed restatement, with the user's corrections in their words, goes
  into the brief's context section. `test: same`

### gate-timeouts

Added 2026-11-28 during the queue: the project gate blocks every push, and two
process-spawning tests time out at 5 s in a full parallel run on this machine.

Done when:
- Both tests carry an explicit 20 s timeout and pass in the full gate, with no
  assertion change. `test:` the two test files.

### release

Done when:
- `package.json` version, `joycraft.release`, summary, `releaseVersion` and the
  `CHANGELOG.md` heading all say 1.11.0, and the release-fields tests pass.
  `test:` the existing release tests.

## Agent work and pending choices

No open decisions. Every goal is understood and authorized.

## Scope and limits

- Not in this feature: the report's prompt-text items A (decision-artifact
  rule), B (small-job Look scope), C (dead model/effort pointers), bench
  hygiene, the reviewer effort sweep, and the low-value output trims
  (`dispatch-start` duplicates, `status` brief paths).
- `windows-spawn` cannot be run on Windows here; the unit test and the Windows
  CI leg are the checks.
