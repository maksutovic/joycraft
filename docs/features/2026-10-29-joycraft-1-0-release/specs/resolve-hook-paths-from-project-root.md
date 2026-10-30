---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 1
phase: 1
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Resolve Hook Paths From the Project Root — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready
> **Date:** 2026-10-29
> **Estimated scope:** Small; 3–5 files
> **Phase:** 1 — Gate fixes
> **Where:** `joycraft-prototype` `field/1.0`

## What

Make every hook command that Joycraft registers resolve from the project root, not the shell's current directory. Since `field-1`, all 25 G4 hook errors are `.claude/hooks/joycraft/block-dangerous.sh` exiting 127 (command not found). That is the result when the command is a relative path and the agent's working directory is a worktree or a subdirectory.

## Why

Hook errors count as G4 harness failures, and a safeguard hook that does not run gives no protection.

## Acceptance Criteria

- [ ] **AC1:** Every hook command that the exporter and field sync write for Claude Code uses `"$CLAUDE_PROJECT_DIR"/…` (quoted) or an absolute path that the exporter computes at install time. No relative hook command remains.
- [ ] **AC2:** The same rule holds for each host's hook file that the exporter writes (Codex hooks, `.github/hooks/joycraft.json`, Pi/OMP extension paths). Each one is checked against that host's documented variable or resolution rule.
- [ ] **AC3:** Field sync rewrites existing relative entries in `.claude/settings.json` in place, keeps user hook entries unchanged, and makes a backup.
- [ ] **AC4:** A hook invoked from a nested working directory and from a linked worktree runs and exits 0 or 2. It never exits 127.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Export into a fixture; parse `.claude/settings.json`; assert every Joycraft hook command starts with `"$CLAUDE_PROJECT_DIR"` or is absolute. | Unit |
| AC2 | For each host fixture, assert its hook file references resolve, based on that host's rule. | Unit |
| AC3 | Fixture settings with one relative Joycraft entry and one user entry: run sync; the Joycraft entry is rewritten, the user entry is byte-identical, and a backup exists. | Integration |
| AC4 | Run the registered command with cwd = `<fixture>/src/deep` and cwd = a `git worktree`; the exit code is in {0, 2}. | Integration |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT change user-authored hook entries.
- MUST keep `deny-patterns.txt` user-owned.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `scripts/install-hooks.mjs` | Absolute or project-dir hook commands |
| Modify | `scripts/field-sync.mjs` | Rewrite relative entries on sync |
| Modify | `scripts/legacy-hooks.mjs` | Same rule for legacy safeguard hooks |
| Add | `tests/hook-paths.test.mjs` | AC1–AC4 |

## Approach

Find every place that writes a hook `command`. Centralize the command in one helper that takes a host and a relative script path and returns the resolved command string.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Project path with spaces | The command is quoted and runs. |
| Host with no project-dir variable | Write the absolute path at install time; field sync refreshes it when the project moves. |
