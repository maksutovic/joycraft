#!/bin/bash
# Joycraft Safeguard — PreToolUse hook
# Blocks dangerous Bash commands. Exit 2 = block the action.
# Edit deny-patterns.txt to customize what's blocked.

TOOL_NAME="$1"
# Read the full tool input from stdin
INPUT=$(cat)

# Only check Bash commands
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# Extract the command from the JSON input
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')

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

  if echo "$COMMAND" | grep -qEi "$pattern"; then
    echo "Blocked by Joycraft Safeguard: command matches deny pattern '$pattern'"
    echo "Edit .claude/hooks/joycraft/deny-patterns.txt to modify blocked patterns."
    exit 2
  fi
done < "$PATTERNS_FILE"

exit 0
