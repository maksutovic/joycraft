#!/bin/sh
# Harness eval runner.
#
# Usage (from the project root):
#   sh docs/templates/evals/check.sh [task-dir]
#
# Reads every *.json recorded task in task-dir (default: the directory this
# script lives in), runs each task's prompt through `claude -p` inside a fresh
# copy of the task's fixture, checks the task's assertions, and prints a pass
# rate. Exits 1 when any task's observed pass rate is below that task's
# declared pass_gate. Exits 2 when a required tool is missing or the claude
# CLI itself fails (for example, when it is not authenticated).
#
# Needs only POSIX sh, standard shell utilities, jq, and the claude CLI.
# Extra flags for claude come from EVAL_CLAUDE_ARGS
# (default: --permission-mode acceptEdits).

set -u

if ! command -v jq >/dev/null 2>&1; then
  echo "check.sh: jq required but not found on PATH" >&2
  exit 2
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "check.sh: claude CLI required but not found on PATH" >&2
  exit 2
fi

TASK_DIR=${1:-$(dirname "$0")}
PROJECT_ROOT=$(pwd)
CLAUDE_ARGS=${EVAL_CLAUDE_ARGS:---permission-mode acceptEdits}
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT INT TERM

total_runs=0
total_passed=0
task_count=0
failed_tasks=""

# check_assertions <workdir> <output-file> <task-file>
# Returns 0 when every assertion holds, 1 when one fails, 3 when malformed.
check_assertions() {
  workdir=$1
  output=$2
  task_file=$3
  count=$(jq -e '.assertions | if type == "array" and length > 0 then length else error("no assertions") end' "$task_file" 2>/dev/null) || return 3
  i=0
  while [ "$i" -lt "$count" ]; do
    kind=$(jq -er ".assertions[$i].type" "$task_file" 2>/dev/null) || return 3
    value=$(jq -er ".assertions[$i].value" "$task_file" 2>/dev/null) || return 3
    case $kind in
      output_contains)
        grep -F -q -- "$value" "$output" || return 1 ;;
      output_not_contains)
        if grep -F -q -- "$value" "$output"; then return 1; fi ;;
      output_matches)
        grep -E -q -- "$value" "$output" || return 1 ;;
      file_exists)
        [ -e "$workdir/$value" ] || return 1 ;;
      command)
        (cd "$workdir" && sh -c "$value") >/dev/null 2>&1 || return 1 ;;
      *)
        return 3 ;;
    esac
    i=$((i + 1))
  done
  return 0
}

for task_file in "$TASK_DIR"/*.json; do
  [ -e "$task_file" ] || continue
  task_count=$((task_count + 1))

  id=$(jq -er '.id' "$task_file" 2>/dev/null) || id=$(basename "$task_file")
  prompt=$(jq -er '.prompt' "$task_file" 2>/dev/null)
  prompt_ok=$?
  fixture=$(jq -er '.fixture // "."' "$task_file" 2>/dev/null) || fixture="."
  runs=$(jq -er '.runs // 1' "$task_file" 2>/dev/null) || runs=1
  gate=$(jq -er '.pass_gate // 1' "$task_file" 2>/dev/null) || gate=1

  if [ "$prompt_ok" -ne 0 ] || [ ! -d "$PROJECT_ROOT/$fixture" ]; then
    echo "FAIL $id: malformed task (missing prompt or fixture directory '$fixture')"
    total_runs=$((total_runs + runs))
    failed_tasks="$failed_tasks $id"
    continue
  fi

  passed=0
  n=0
  while [ "$n" -lt "$runs" ]; do
    n=$((n + 1))
    work="$SCRATCH/$task_count-$n"
    mkdir -p "$work"
    cp -R "$PROJECT_ROOT/$fixture/." "$work/"
    # shellcheck disable=SC2086 # EVAL_CLAUDE_ARGS is split into flags on purpose
    if ! (cd "$work" && claude -p "$prompt" $CLAUDE_ARGS) >"$work.out" 2>"$work.err"; then
      echo "ERROR $id: claude -p failed" >&2
      cat "$work.err" >&2
      echo "check.sh: stopping. Check that the claude CLI is authenticated (see docs/templates/evals/README.md)." >&2
      exit 2
    fi
    check_assertions "$work" "$work.out" "$task_file"
    result=$?
    if [ "$result" -eq 3 ]; then
      echo "FAIL $id: malformed assertions"
      break
    fi
    [ "$result" -eq 0 ] && passed=$((passed + 1))
  done

  total_runs=$((total_runs + runs))
  total_passed=$((total_passed + passed))
  if jq -en --argjson p "$passed" --argjson r "$runs" --argjson g "$gate" '$p / $r >= $g' >/dev/null; then
    echo "PASS $id: $passed/$runs runs (gate $gate)"
  else
    echo "FAIL $id: $passed/$runs runs (gate $gate)"
    failed_tasks="$failed_tasks $id"
  fi
done

if [ "$task_count" -eq 0 ]; then
  echo "0 tasks found in $TASK_DIR. Pass rate: n/a"
  exit 0
fi

rate=$(jq -n --argjson p "$total_passed" --argjson r "$total_runs" '($p * 1000 / $r | floor) / 10')
echo "Pass rate: $rate% ($total_passed/$total_runs runs across $task_count tasks)"

if [ -n "$failed_tasks" ]; then
  echo "Below gate:$failed_tasks"
  exit 1
fi
exit 0
