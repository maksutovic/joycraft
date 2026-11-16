# Gates

Joycraft's rule is that only an accepted review completes a spec. The gate
check makes the rule a command, so it does not depend on the agent.

## What the gate checks

`node .joycraft/runtime/gate.mjs check` exits 2 and names each problem on
stderr. Each message names its next step:

- a `done` spec with no accepted report, owner acceptance or waiver: set it
  back to `in-review`, get an independent review, then run the completing
  command that the message names;
- a spec whose queue status and frontmatter status are different: pending
  journal: run the named `recover` command, stop on a conflict; accepted: run
  `node .joycraft/runtime/status.mjs --fix`; unaccepted `done`: the step above
  first; else set the frontmatter to the queue's status and tell the user;
- a current queue or spec file that does not parse: repair it and tell the user.

A spec held at `in-review` is never a problem. Queues older than
`schemaVersion: 1` are skipped. With no problem, it exits 0 and prints nothing.
Any agent can run the check, and the session-end skill runs it. Without a hook,
that step depends on the agent.

## The Stop hook

The hook is for Claude Code only for now. When it is on, Claude Code runs the
gate check each time it is about to stop. On exit 2, Claude Code gives the
message to the agent, and the agent must do the step that the message names.
The hook is not a sandbox: a shell command can still write the queue file. The
check finds that result at the next stop.

## Turn the gates on

The user says "Turn on Joycraft's gates", or says yes to the offer in setup.

1. Run `node .joycraft/runtime/gate.mjs hook --plan`. It writes nothing.
   - `change: "none"` and a `message`: tell the user the message. On a host
     other than Claude Code, the message says that the hook is not available
     and how to run the check by hand.
   - `change: "add"`: continue.
2. Show the change to `.claude/settings.json` (`before` and `after`) on a page,
   as [showing a page](artifacts.md#showing-a-page) says. In two lines, say
   what the Stop hook does and how to turn it off.
3. On the user's yes, run `node .joycraft/runtime/gate.mjs hook --on`. Do not
   edit `.claude/settings.json` by hand.

`.claude/settings.json` is the user's file. `--on` adds one Stop hook whose
command runs `gate.mjs check`, and it changes no other byte. A second `--on`
changes nothing. If the file is not valid JSON, the command stops and writes
nothing; tell the user.

## Turn the gates off

The user says "Turn off Joycraft's gates". That request is the yes. Run
`node .joycraft/runtime/gate.mjs hook --off` and tell the user its message.
When nobody changed the file after `--on`, the file is again byte for byte as
it was before `--on`. `.joycraft/local/gate-hook.json` keeps the record for
this. Without a usable record, it removes Joycraft's Stop hook and any
`hooks.Stop` list or `hooks` object left empty, and its message names each one.
