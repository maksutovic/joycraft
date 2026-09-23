#!/bin/sh
# Joycraft hook recipe: plan-sync on completion
#
# Event:    Stop   (or SubagentStop, to check each subagent's work)
# Matcher:  none   (Stop hooks take no matcher)
#
# When the session finishes, asks `claude -p` whether the plan or spec the
# session worked from still describes what was changed, and prints the answer
# as a reminder. It is advisory only.
#
#   exit 0  allow  - always. This hook never blocks the session from ending
#           (exit 2 on Stop would force Claude to keep going, a foot-gun for
#           a model-backed check).
#
# What it compares:
#   - the plan: PLAN_FILE if set, otherwise the most recently modified
#     docs/features/*/specs/*.md (README.md excluded)
#   - what changed: the files this session edited, read from the session
#     transcript named in the hook payload
#
# Cost: each run makes one `claude -p` call. Wire it in only if that is fine.
#
# Wire it in by hand (this is your file, not a Joycraft-managed one):
#   cp docs/templates/hooks/plan-sync-on-completion.sh .claude/hooks/
#   chmod +x .claude/hooks/plan-sync-on-completion.sh
# then add to .claude/settings.json:
#   { "hooks": { "Stop": [ { "hooks": [
#       { "type": "command", "command": ".claude/hooks/plan-sync-on-completion.sh", "timeout": 120 } ] } ] } }
#
# Requires: jq and the claude CLI. If either is missing or the call fails,
# the hook prints a one-line note and exits 0.

# ---- Project-owned settings: edit these.
PLAN_FILE="${PLAN_FILE-}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
# ----

# The claude -p call below starts its own session, which would fire this Stop
# hook again. This guard stops that recursion.
[ -z "${JOYCRAFT_PLAN_SYNC_RUNNING:-}" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "plan-sync: jq not found; skipping." >&2
  exit 0
fi

INPUT=$(cat)
[ "$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty')

ROOT=${CLAUDE_PROJECT_DIR:-$PWD}
cd "$ROOT" || exit 0

if [ -z "$PLAN_FILE" ]; then
  PLAN_FILE=$(ls -t docs/features/*/specs/*.md 2>/dev/null | grep -v '/README\.md$' | head -n 1)
fi
[ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ] || exit 0

CHANGED=
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  CHANGED=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | select(.name == "Edit" or .name == "Write" or .name == "MultiEdit") | .input.file_path // empty' "$TRANSCRIPT" 2>/dev/null | sort -u)
fi
[ -n "$CHANGED" ] || exit 0

if ! command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
  echo "plan-sync: $CLAUDE_BIN CLI not found; skipping." >&2
  exit 0
fi

PROMPT="You are checking plan drift. Standard input holds a plan or spec file, then the list of files one coding session edited. Answer in at most three lines. Say 'in sync' if the plan still describes the work. Otherwise name what the plan should say now."

ANSWER=$({
  echo "=== PLAN: $PLAN_FILE ==="
  cat "$PLAN_FILE"
  echo "=== FILES EDITED THIS SESSION ==="
  printf '%s\n' "$CHANGED"
} | JOYCRAFT_PLAN_SYNC_RUNNING=1 "$CLAUDE_BIN" -p "$PROMPT" 2>/dev/null) || {
  echo "plan-sync: claude -p failed; skipping." >&2
  exit 0
}

[ -n "$ANSWER" ] || exit 0
jq -n --arg msg "plan-sync ($PLAN_FILE): $ANSWER" '{systemMessage: $msg}'
exit 0
