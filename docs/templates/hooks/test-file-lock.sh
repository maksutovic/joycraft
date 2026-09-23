#!/bin/sh
# Joycraft hook recipe: test-file lock during a bugfix
#
# Event:    PreToolUse
# Matcher:  Edit|Write
#
# While a bugfix is active, blocks edits to existing test files, so the agent
# cannot turn a red test green by changing the test instead of the code.
#
# How to signal "bugfix active" (either one works):
#   1. Sentinel file: create .claude/bugfix-active in the project root
#        touch .claude/bugfix-active     # lock on
#        rm .claude/bugfix-active        # lock off
#   2. Environment variable: start the session with JOYCRAFT_BUGFIX_ACTIVE=1
#        JOYCRAFT_BUGFIX_ACTIVE=1 claude
#      (0 or empty means off.)
#
# Typical flow: write the failing reproduction test, turn the lock on, fix
# the code until the test passes, turn the lock off.
#
# New test files are allowed by default (ALLOW_NEW_TEST_FILES=1) so the agent
# can still add a regression test. Set it to 0 to block those too.
#
#   exit 0  allow  - no bugfix active, or the path is not a test file.
#   exit 2  block  - bugfix active and the path is a test file.
#
# Wire it in by hand (this is your file, not a Joycraft-managed one):
#   cp docs/templates/hooks/test-file-lock.sh .claude/hooks/
#   chmod +x .claude/hooks/test-file-lock.sh
# then add to .claude/settings.json:
#   { "hooks": { "PreToolUse": [ { "matcher": "Edit|Write", "hooks": [
#       { "type": "command", "command": ".claude/hooks/test-file-lock.sh" } ] } ] } }
#
# Requires: jq. Without jq the lock allows everything and says so on stderr.

# ---- Project-owned settings: edit these.
BUGFIX_SENTINEL=".claude/bugfix-active"
ALLOW_NEW_TEST_FILES="${ALLOW_NEW_TEST_FILES-1}"
# Test-file globs, one per line, matched against the project-relative path.
TEST_FILE_PATTERNS="${TEST_FILE_PATTERNS-*.test.*
*.spec.*
*_test.*
test_*.py
*/test_*.py
tests/*
*/tests/*
test/*
*/test/*
__tests__/*
*/__tests__/*
spec/*
*/spec/*}"
# ----

ROOT=${CLAUDE_PROJECT_DIR:-$PWD}

ACTIVE=
case ${JOYCRAFT_BUGFIX_ACTIVE:-0} in
  0 | '') ;;
  *) ACTIVE=1 ;;
esac
[ -e "$ROOT/$BUGFIX_SENTINEL" ] && ACTIVE=1
[ -n "$ACTIVE" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "test-file-lock: jq not found; allowing." >&2
  exit 0
fi

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -n "$FILE" ] || exit 0

case $FILE in
  /*) ABS=$FILE ;;
  *) ABS="$ROOT/$FILE" ;;
esac
REL=$FILE
case $FILE in
  "$ROOT"/*) REL=${FILE#"$ROOT"/} ;;
esac
REL=${REL#./}

if [ "$ALLOW_NEW_TEST_FILES" = 1 ] && [ ! -e "$ABS" ]; then
  exit 0
fi

set -f
IFS='
'
for pattern in $TEST_FILE_PATTERNS; do
  [ -n "$pattern" ] || continue
  case $REL in
    $pattern)
      echo "test-file-lock: $REL is a test file and a bugfix is active." >&2
      echo "Fix the code under test, not the test. Remove $BUGFIX_SENTINEL (or unset JOYCRAFT_BUGFIX_ACTIVE) to unlock." >&2
      exit 2 ;;
  esac
done

exit 0
