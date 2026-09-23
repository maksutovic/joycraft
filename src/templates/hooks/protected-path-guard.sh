#!/bin/sh
# Joycraft hook recipe: protected-path guard
#
# Event:    PreToolUse
# Matcher:  Edit|Write
#
# Blocks an Edit or Write whose target path matches one of the protected
# patterns below. Patterns are shell globs, one per line, matched against the
# path relative to the project root. A pattern without a "/" also matches the
# file name in any folder (".env" blocks "services/api/.env").
#
#   exit 0  allow  - no pattern matched (an empty list matches nothing).
#   exit 2  block  - a pattern matched; stderr tells Claude which one.
#
# Wire it in by hand (this is your file, not a Joycraft-managed one):
#   cp docs/templates/hooks/protected-path-guard.sh .claude/hooks/
#   chmod +x .claude/hooks/protected-path-guard.sh
# then add to .claude/settings.json:
#   { "hooks": { "PreToolUse": [ { "matcher": "Edit|Write", "hooks": [
#       { "type": "command", "command": ".claude/hooks/protected-path-guard.sh" } ] } ] } }
#
# Requires: jq. Without jq the guard allows everything and says so on stderr.

# ---- Project-owned list: edit this. One glob per line; # lines are skipped.
# Setting PROTECTED_PATTERNS in the environment overrides this list.
PROTECTED_PATTERNS="${PROTECTED_PATTERNS-.env
.env.*
*.pem
*.key
.github/workflows/*
.claude/settings.json}"
# ----

if ! command -v jq >/dev/null 2>&1; then
  echo "protected-path-guard: jq not found; allowing." >&2
  exit 0
fi

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -n "$FILE" ] || exit 0

ROOT=${CLAUDE_PROJECT_DIR:-$PWD}
REL=$FILE
case $FILE in
  "$ROOT"/*) REL=${FILE#"$ROOT"/} ;;
esac
REL=${REL#./}
BASE=${REL##*/}

set -f
IFS='
'
for pattern in $PROTECTED_PATTERNS; do
  case $pattern in
    '' | \#*) continue ;;
  esac
  hit=
  case $REL in
    $pattern) hit=1 ;;
  esac
  case $pattern in
    */*) ;;
    *) case $BASE in $pattern) hit=1 ;; esac ;;
  esac
  if [ -n "$hit" ]; then
    echo "protected-path-guard: $REL is protected (pattern '$pattern')." >&2
    echo "Ask the user to make this change, or edit the pattern list in the hook." >&2
    exit 2
  fi
done

exit 0
