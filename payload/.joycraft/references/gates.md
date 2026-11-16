# Gates

Joycraft's rule is that only an accepted review completes a spec. The gate
check makes the rule a command, so it does not depend on the agent.

## What the gate checks

`node .joycraft/runtime/gate.mjs check` exits 2 and names each problem on
stderr. Each message names its next step:

- a `done` spec with no accepted report, owner acceptance or waiver: at once,
  without asking the user, set it back to `in-review`, get an independent
  review, then run the completing command that the message names;
- a spec whose queue status and frontmatter status are different: pending
  journal: run the named `recover` command, stop on a conflict; accepted: run
  `node .joycraft/runtime/status.mjs --fix`; unaccepted `done`: the step above
  first; else set the frontmatter to the queue's status and tell the user;
- a current queue or spec file that does not parse: repair it and tell the user;
- a legacy acceptance whose decision file is missing or changed: restore it
  from git, else stop and tell the user.

A spec held at `in-review` is never a problem. Queues older than
`schemaVersion: 1` are skipped. With no problem, it exits 0 and prints nothing.

## The Stop hook

The hook is for Claude Code only for now. When it is on, Claude Code runs the
gate check each time it is about to stop. On exit 2, the agent gets the
message and must do the step it names. The hook is not a sandbox: a shell
command can still write the queue file.

## Turn the gates on

The user says "Turn on Joycraft's gates", or says yes to the offer in setup.

1. Run `node .joycraft/runtime/gate.mjs hook --plan`. It writes nothing.
   - `change: "none"`: tell the user the `message`.
   - `problems`: The user is here, so ask one question that names each spec
     marked `done` with no review on record: accept them as they are, or send
     them back for review? On "accept", per queue write one decision file
     whose `statement` quotes the user verbatim and whose `reason`
     records what the user says, and run one
     [`accept-owner --legacy`](completion.md#legacy-acceptance) call; on
     "review", set them back to `in-review`. Never accept without the user's
     words. Run the command a drift message names. Tell the user what you
     changed, then plan again. Stop and ask about a file that does not parse.
   - else: continue.
2. Show the change to `.claude/settings.json` (`before` and `after`) on a page,
   as [showing a page](artifacts.md#showing-a-page) says. In two lines, say
   what the Stop hook does and how to turn it off.
3. On the user's yes, run `node .joycraft/runtime/gate.mjs hook --on`. Do not
   edit `.claude/settings.json` by hand.

`--on` adds one Stop hook and changes no other byte of the user's file. If the
file is not valid JSON, it writes nothing; tell the user.

## Turn the gates off

The user says "Turn off Joycraft's gates". That request is the yes. Run
`node .joycraft/runtime/gate.mjs hook --off` and tell the user its message.
