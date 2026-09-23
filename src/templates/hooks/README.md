# Governance Hook Recipes

Four Claude Code hook scripts you can copy into your project. Skills are
advisory. Hooks are deterministic: the harness runs them on every matching
event, whatever the model decides.

**Joycraft never registers these recipes.** They are reference material. No
Joycraft install or update adds them to `.claude/settings.json`. Wiring one in
is a deliberate choice you make by hand, and the copy you wire in is your own
file.

Joycraft generates and manages two hooks of its own. Leave these alone:

- `.claude/hooks/joycraft/block-dangerous.sh` blocks dangerous Bash commands.
- `.claude/hooks/joycraft-version-check.mjs` runs the session-start update check.

Do not copy recipes into `.claude/hooks/joycraft/`. Joycraft manages that folder.

## The recipes

| Recipe | Event | Matcher | What it does |
|--------|-------|---------|--------------|
| `plan-sync-on-completion.sh` | `Stop` | none | Asks `claude -p` if the plan or spec still matches the files the session edited. Prints a reminder. Never blocks. |
| `protected-path-guard.sh` | `PreToolUse` | `Edit\|Write` | Blocks writes to paths on a project-owned protected list. |
| `test-file-lock.sh` | `PreToolUse` | `Edit\|Write` | Blocks edits to existing test files while a bugfix is active. |
| `exit-code-gate.sh` | `PreToolUse` | `Bash` | A skeleton for your own gate. Shows allow, warn, and block. |

Each script starts with a comment block. It states the event, the matcher, the
exit codes, and the wiring. You can copy a single script without this README.

Each script uses only POSIX `sh`, standard shell utilities, `jq`, and (for
plan-sync) the `claude` CLI. If `jq` is missing, a recipe allows the action and
prints a one-line note. A missing tool never blocks your work.

## The exit-code contract

Claude Code sends the hook payload as JSON on stdin. The exit code is the verdict.

| Exit | Verdict | Effect |
|------|---------|--------|
| `exit 0` | allow | The tool call proceeds. |
| `exit 1` | warn / ask | Non-blocking. The tool call proceeds, and stderr is shown to the user. Any code other than 0 and 2 acts this way. |
| `exit 2` | block | The tool call is refused. Stderr goes back to Claude as the reason. |

For a real "ask the user" prompt, exit 0 and print a permission decision on
stdout. `exit-code-gate.sh` has an `ask()` function that shows how.

On a `Stop` hook, exit 2 forces Claude to keep working. The plan-sync recipe
always exits 0 for this reason.

## Wiring a recipe in

1. Copy the script out of `docs/templates/hooks/` and make it executable:

   ```sh
   mkdir -p .claude/hooks
   cp docs/templates/hooks/protected-path-guard.sh .claude/hooks/
   chmod +x .claude/hooks/protected-path-guard.sh
   ```

   The copies in `docs/templates/hooks/` are reference files. Joycraft may
   refresh them on update, and they may lack the executable bit. Always wire
   in your own copy.

2. Edit the project-owned settings at the top of your copy, such as the
   protected-path list or the test-file globs.

3. Merge the matching fragment below into `.claude/settings.json`. If the file
   already has a `hooks` key, merge by hand. Keep the Joycraft entries that are
   already there.

**plan-sync-on-completion.sh** belongs on `Stop`. Each run makes one
`claude -p` call, so it has a longer timeout:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": ".claude/hooks/plan-sync-on-completion.sh", "timeout": 120 }
        ]
      }
    ]
  }
}
```

To check each subagent's work too, add the same entry under `"SubagentStop"`.

**protected-path-guard.sh** belongs on `PreToolUse` with the `Edit|Write` matcher:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/protected-path-guard.sh" }
        ]
      }
    ]
  }
}
```

**test-file-lock.sh** belongs on `PreToolUse` with the `Edit|Write` matcher.
Turn the lock on with `touch .claude/bugfix-active` or by starting the session
with `JOYCRAFT_BUGFIX_ACTIVE=1`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/test-file-lock.sh" }
        ]
      }
    ]
  }
}
```

**exit-code-gate.sh** belongs on `PreToolUse`. Its example rules check Bash
commands:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/exit-code-gate.sh" }
        ]
      }
    ]
  }
}
```

To use both `Edit|Write` recipes, put both commands in one `hooks` list under
one matcher. Every hook that matches a tool call runs, and one `exit 2` blocks
the call.
