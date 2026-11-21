# Claude Code Permission Modes

> [Back to README](../../README.md)

You do **not** need `--dangerously-skip-permissions` to run Joycraft's workflow,
not even for a queue that runs while you are away. Claude Code has safer modes.

| Your situation | Permission mode | What it does |
|---|---|---|
| Interactive development | `acceptEdits` | Auto-approves file edits, prompts for shell commands |
| Long autonomous session or a queue while you are away | `auto` | A safety classifier reviews each action and blocks scope escalation |
| Maximum control | `dontAsk` + allowlist | Only pre-approved commands run; everything else is denied |
| Planning and exploration | `plan` | Claude can only read and propose, no edits allowed |

## When to use what

**`auto`** is the best default for most developers. A background classifier reviews
each action before it runs. It blocks things like downloading unexpected packages,
reaching unfamiliar infrastructure, or going beyond the task. It adds little
latency and catches the problems that make autonomous work risky.

**`dontAsk`** is for maximum control. You write an explicit allowlist of what the
agent can do (edit code, run your test commands) and everything else is denied. No
prompts, no surprises. Include the commands in your `AGENTS.md` command table and
`node .joycraft/runtime/*` so the agent can run its own checks.

**`--dangerously-skip-permissions`** belongs only in an isolated container or VM
with no internet access. It skips every safety check.

To have your agent suggest a mode for this project:

```text
Look at this project's AGENTS.md boundaries and commands, and tell me which Claude
Code permission mode fits a Joycraft queue that runs while I am away. If you
recommend an allowlist, show it to me and write it to .claude/settings.json only on my yes.
Do not commit, publish, or ask me for API keys.
```

Codex, Pi and the other hosts have their own approval settings; see each host's
documentation. Joycraft's own checks (the gates, independent review) work the same
in every mode. See [The gates](../../README.md#the-gates-no-spec-is-done-without-an-accepted-review).
