---
id: 3
status: todo
---
# Outcome

A user says "Turn on Joycraft's gates" and Claude Code then runs the gate check
at every session end. Brief: [gate-hooks](../brief.md#gate-hooks). Rulings:
`activation` "on-request"; `hook-set` "stop-only"; `harnesses` "claude-first".

## acceptance

- On is a plan, then a write. Check: in a fixture project with an existing
  user Stop hook, `node .joycraft/runtime/gate.mjs hook --plan` prints the
  `.claude/settings.json` change and writes nothing; `hook --on` adds one Stop
  hook whose command runs `gate.mjs check`, marked as Joycraft's; the user's
  hook keeps its bytes; a second `--on` changes nothing
  (`tests/runtime/gate-hook.test.mjs`, `[AC:gates-on-plan-then-write]`).
- The hook blocks a bad stop. Check: feed the hook command a Stop event on
  stdin in the spec 1 fixture (unaccepted `done`); exit code 2 and stderr names
  the spec. With the spec set back to `in-review`, exit code 0. With
  `stop_hook_active: true` and the same finding it still exits 2
  (`[AC:gates-block-stop]`).
- Off removes only Joycraft's lines. Check: `hook --off` after `--on` leaves
  `.claude/settings.json` byte-equal to the file before `--on`
  (`[AC:gates-off-clean]`).
- Other hosts get a plain answer. Check: with no `claude` host in
  `.joycraft/installation.json`, `hook --on` writes nothing, exits 0 and says
  the hook is Claude Code only for now and the check can be run by hand
  (`[AC:gates-other-hosts]`).
- Session end runs the check on every harness. Check:
  `joycraft-session-end/SKILL.md` runs `node .joycraft/runtime/gate.mjs check`
  where it ran `status.mjs`, keeps the `status.mjs --fix` repair for lagging
  frontmatter of accepted specs, and tells the agent to run the completing
  command the check names before it closes the session. The skill does not
  name a harness in that step, and its word count does not grow. Ruling
  `gate-on-all-harnesses` (2026-11-15,
  [talk review](../../2026-11-15-talk-review-tan-holmes/brief.md)):
  "session-end-runs-gate". This is a structural check of the skill text; the
  link test of spec 2 resolves the `gate.mjs` path
  (`[AC:session-end-runs-gate]`).

## Not covered

TaskCompleted and PreToolUse hooks, Codex and Copilot hooks, CI, install-time
registration. A live Claude Code session is not a criterion; see below.

## Implementation and verification scope

Implemented in joycraft-prototype: `.joycraft/runtime/gate.mjs` (`hook`
subcommand), new `.joycraft/references/gates.md` (what the gate checks, the
on/off flow, show the change on a page before writing), one paragraph in
`joycraft-entry/SKILL.md` routing "turn on/off Joycraft's gates" to that
reference, one line in `.joycraft/references/setup.md` offering the gates once
at setup, the status step of `.agents/skills/joycraft-session-end/SKILL.md`,
`tests/runtime/gate-hook.test.mjs`. On the five harnesses with no hook the
session-end step is prompt-level: the agent can skip it. The settings file is the user's:
write on the user's yes only. The boundary crossed is Joycraft runtime to
Claude Code hook contract; the discriminating scenario is the stdin Stop event
with exit 2 on stderr, because exit 1 or stdout would let the session end.

## Deferred until deploy

In a real Claude Code session with the gates on, hand-edit a spec to `done`
and try to finish: the session is sent back with the spec named. Max checks
this once after the release.
