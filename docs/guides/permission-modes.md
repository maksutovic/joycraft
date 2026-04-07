# Claude Code Permission Modes

> [Back to README](../../README.md)

You do **not** need `--dangerously-skip-permissions` for autonomous development. Claude Code offers safer alternatives that Joycraft recommends based on your use case.

| Your situation | Permission mode | What it does |
|---|---|---|
| Interactive development | `acceptEdits` | Auto-approves file edits, prompts for shell commands |
| Long autonomous session | `auto` | Safety classifier reviews each action, blocks scope escalation |
| Autonomous spec execution | `dontAsk` + allowlist | Only pre-approved commands run, everything else denied |
| Planning and exploration | `plan` | Claude can only read and propose, no edits allowed |

## When to use what

**`--permission-mode auto`** is the best default for most developers. A background classifier (Sonnet) reviews each action before execution, blocking things like: downloading unexpected packages, accessing unfamiliar infrastructure, or escalating beyond the task scope. It adds minimal latency and catches the exact problems that make autonomous development scary.

**`--permission-mode dontAsk`** is for maximum control. You define an explicit allowlist of what the agent can do (write code, run specific test commands) and everything else is silently denied. No prompts, no surprises. This is what Joycraft's `/joycraft-lockdown` skill helps you configure.

**`--dangerously-skip-permissions`** should only be used in isolated containers or VMs with no internet access. It bypasses all safety checks and cannot be overridden by subagents.

Both `/joycraft-lockdown` and `/joycraft-tune` now recommend the appropriate permission mode based on your project's risk profile.
