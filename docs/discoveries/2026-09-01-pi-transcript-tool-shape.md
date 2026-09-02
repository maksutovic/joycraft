---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
---

# Discoveries — harness transcript shapes for the telemetry scanner

**Date:** 2026-09-01
**Spec:** docs/features/2026-08-30-curated-harness/specs/add-telemetry-scanner-core.md (+ add-codex-telemetry-parser)

## Pi transcripts don't share Claude's tool_use shape
**Expected:** Both harnesses record file ops as `tool_use` blocks with `input.file_path` (what the spec implied).
**Actual:** Pi emits typed `toolCall` blocks with `arguments.path` and lowercase tool names (`read`/`write`/`edit`), plus a `batch_read` tool whose `arguments.o[].p` entries each mean one read — one line can fan out into several FileOps.
**Impact:** Any future per-harness parser must be written from a real transcript, not by analogy with Claude's; the scanner fans `batch_read` out rather than counting it once.

## Codex sessions are global, not per-project
**Expected:** A per-project Codex transcript directory analogous to Claude's `~/.claude/projects/<encoded-cwd>/`.
**Actual:** Codex rollouts live date-nested under `~/.codex/sessions/YYYY/MM/DD/` across ALL projects; `arguments` on `function_call` payloads is a JSON *string* (not an object) carrying `cmd`.
**Impact:** The default Codex scan must walk recursively and gate each file on its `session_meta.cwd` matching the project — without the guard, relative paths from other projects' commands would pollute the counts. Tests must always inject a `codexDir` fixture or they read the real (large) session tree.
