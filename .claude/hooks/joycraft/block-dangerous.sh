#!/bin/bash
# Joycraft Safeguard — PreToolUse hook
# Blocks dangerous Bash commands. Exit 2 = block the action.
# Edit deny-patterns.txt to customize what's blocked.
#
# Claude Code passes no arguments: the hook payload arrives as JSON on stdin
# ({"tool_name":"Bash","tool_input":{"command":"..."},...}). The reason for a
# block goes to stderr, which is what the model sees on exit 2.

INPUT=$(cat)

if command -v jq >/dev/null 2>&1; then
  TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
  COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // .command // empty' 2>/dev/null)
else
  # Fallback without jq: tolerate spaces around the colon and escaped quotes.
  TOOL_NAME=$(printf '%s' "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/^"tool_name"[[:space:]]*:[[:space:]]*"//;s/"$//')
  COMMAND=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"\([^"\\]\|\\.\)*"' | head -1 | sed 's/^"command"[[:space:]]*:[[:space:]]*"//;s/"$//;s/\\"/"/g;s/\\\\/\\/g')
fi

# Only check Bash commands (the settings matcher already limits this hook to
# Bash; a payload that names another tool is passed through untouched).
if [ -n "$TOOL_NAME" ] && [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

if [ -z "$COMMAND" ]; then
  exit 0
fi

PATTERNS_FILE="$(dirname "$0")/deny-patterns.txt"

if [ ! -f "$PATTERNS_FILE" ]; then
  exit 0
fi

while IFS= read -r pattern || [ -n "$pattern" ]; do
  # Skip empty lines and comments
  [ -z "$pattern" ] && continue
  [[ "$pattern" == \#* ]] && continue

  if printf '%s' "$COMMAND" | grep -qEi "$pattern"; then
    echo "Blocked by Joycraft Safeguard: command matches deny pattern '$pattern'" >&2
    echo "Edit .claude/hooks/joycraft/deny-patterns.txt to modify blocked patterns." >&2
    exit 2
  fi
done < "$PATTERNS_FILE"

exit 0
