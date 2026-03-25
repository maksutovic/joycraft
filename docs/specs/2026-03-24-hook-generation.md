# Generate PreToolUse Hooks from NEVER Rules — Atomic Spec

> **Parent:** docs/research/contextual-stewardship-evals.md (Phase 2)
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1-2 sessions / 4 files / ~200 lines

---

## What

Convert CLAUDE.md NEVER rules and risk interview answers into PreToolUse hooks that hard-block dangerous operations. Exit code 2 = blocked before Claude even sees the permission prompt.

## Why

CLAUDE.md boundaries are advisory — Claude reads them but can choose to ignore them. Settings.json deny rules are strong but user can approve "ask" items. PreToolUse hooks with exit code 2 are the strongest enforcement: they block BEFORE permission evaluation. For high-risk operations (production access, destructive commands), we need this level.

## Acceptance Criteria

- [ ] `/joycraft-tune` generates hook scripts in `.claude/hooks/joycraft/`
- [ ] Hook scripts are shell scripts that check Bash commands against dangerous patterns
- [ ] Patterns sourced from: CLAUDE.md NEVER section + risk interview answers
- [ ] `block-dangerous.sh` — PreToolUse hook that blocks commands matching deny patterns
- [ ] Hook registered in `.claude/settings.json` under `hooks.PreToolUse`
- [ ] Merges into existing hooks (doesn't overwrite user hooks)
- [ ] Hook outputs a clear message when blocking: "Blocked by Joycraft: [reason]"
- [ ] `/joycraft-tune` Dimension 4 assessment scores enforcement (hooks > permissions > advisory)
- [ ] Tests verify hook script generation
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/hooks/block-dangerous.sh` | Template hook script |
| Create | `src/safeguard.ts` | Generate hooks from NEVER rules + risk answers |
| Modify | `src/init.ts` | Install default hooks during init |
| Modify | `src/skills/joycraft-tune.md` | Generate/upgrade hooks during apply |

## Approach

The hook script is a shell script that receives tool name and input as args. For Bash commands, it checks against a list of blocked patterns (regexes). If matched, exits with code 2 (block) and prints the reason.

```bash
#!/bin/bash
# .claude/hooks/joycraft/block-dangerous.sh
TOOL_NAME="$1"
COMMAND="$2"
# patterns loaded from .claude/hooks/joycraft/deny-patterns.txt
while IFS= read -r pattern; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "Blocked by Joycraft: command matches deny pattern '$pattern'"
    exit 2
  fi
done < "$(dirname "$0")/deny-patterns.txt"
exit 0
```

The deny-patterns.txt is generated from NEVER rules and risk interview answers.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No NEVER rules in CLAUDE.md | Generate minimal default patterns (rm -rf, force push) |
| User has existing PreToolUse hooks | Add Joycraft hook alongside, don't replace |
| Hook blocks a legitimate command | User edits deny-patterns.txt to remove the pattern |
| Hook script doesn't exist but settings.json references it | Init/tune recreates it |
