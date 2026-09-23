#!/bin/sh
# Joycraft hook recipe: allow / ask / block exit-code gate
#
# Event:    PreToolUse
# Matcher:  Bash   (point it at any tool; the contract is the same)
#
# A skeleton for writing your own deterministic gate. Claude Code sends the
# hook payload as JSON on stdin; the exit code is the verdict:
#
#   exit 0  allow  - the tool call proceeds.
#   exit 1  warn / ask - non-blocking. The tool call still proceeds and the
#           stderr message is shown to the user. Any exit code other than
#           0 and 2 behaves this way.
#   exit 2  block  - the tool call is refused and stderr is fed back to
#           Claude as the reason, so it can change course.
#
# If you want Claude Code to stop and prompt the user instead of warning,
# use the ask() function below: it exits 0 and prints a permission decision
# as JSON on stdout.
#
# The other recipes in this folder follow this contract, and so does the
# generated .claude/hooks/joycraft/block-dangerous.sh (exit 2 = block).
#
# Wire it in by hand (this is your file, not a Joycraft-managed one):
#   cp docs/templates/hooks/exit-code-gate.sh .claude/hooks/
#   chmod +x .claude/hooks/exit-code-gate.sh
# then add to .claude/settings.json:
#   { "hooks": { "PreToolUse": [ { "matcher": "Bash", "hooks": [
#       { "type": "command", "command": ".claude/hooks/exit-code-gate.sh" } ] } ] } }
#
# Requires: jq. Without jq the gate allows everything and says so on stderr.

if ! command -v jq >/dev/null 2>&1; then
  echo "exit-code-gate: jq not found; allowing." >&2
  exit 0
fi

INPUT=$(cat)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

allow() {
  exit 0
}

warn() {
  echo "exit-code-gate: $1" >&2
  exit 1
}

block() {
  echo "exit-code-gate: blocked: $1" >&2
  exit 2
}

# Optional: a real "ask the user" prompt instead of a stderr warning.
ask() {
  jq -n --arg reason "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $reason}}'
  exit 0
}

# Replace these example rules with your own. First match wins.
[ "$TOOL" = "Bash" ] || allow

case $COMMAND in
  *"git push"*"--force"* | *"git push"*" -f"*)
    block "force-push rewrites shared history; push a new commit instead" ;;
  *"git push"*)
    warn "pushing to a remote; confirm the branch is a feature branch" ;;
esac

allow
