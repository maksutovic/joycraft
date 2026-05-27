# Add Pi Pipeline Runtime — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 8 new files / ~180 lines

---

## What

The Pi pipeline runtime assets are created: four bash scripts forming the tool belt, a README for progressive disclosure, a single TypeScript extension that registers the `joycraft_next_spec` tool, and two subagent definition files for the researcher and verifier agents. These files are designed as templates to be written into a Pi project by `joycraft init`.

## Why

Without the pipeline runtime, there is no mechanism for the autonomous spec-to-spec handoff — the human remains the orchestrator between `/joycraft-implement` sessions. The bash scripts handle spec queue operations, the extension ties them into Pi's session lifecycle, and the subagent definitions enable the adapted research/verify skills to function.

## Acceptance Criteria

- [ ] Four bash scripts exist: `joycraft-spec-status`, `joycraft-mark-done`, `joycraft-next-spec`, `joycraft-session-end`
- [ ] `joycraft-spec-status` reads `.joycraft-spec-queue.json` and prints a formatted status table
- [ ] `joycraft-mark-done` updates a spec's `status` from `"active"` to `"complete"` in the JSON manifest
- [ ] `joycraft-next-spec` finds the next uncompleted spec respecting dependency order and prints its file path
- [ ] `joycraft-session-end` captures discoveries, runs validation, and stages changes
- [ ] A `README.md` documents all scripts and their usage for progressive disclosure
- [ ] The extension registers a `joycraft_next_spec` tool that orchestrates: mark-done → session-end → newSession → kickoff
- [ ] Extension uses Pi's extension API (`ctx.newSession()`, `ctx.sendUserMessage()`)
- [ ] Researcher subagent definition allows `read`, `grep`, `find`, `ls`, `bash` tools
- [ ] Verifier subagent definition allows `read`, `grep`, `find`, `ls`, `bash` tools and enforces read-only constraint
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Four bash scripts exist | Assert all 4 files exist and are non-empty | unit |
| `joycraft-spec-status` output format | Run against sample manifest, check output contains spec names and statuses | integration |
| `joycraft-mark-done` updates manifest | Run on sample manifest, read JSON back, assert status changed to `"complete"` | integration |
| `joycraft-next-spec` respects deps | Create manifest with spec B depending on incomplete spec A — assert spec A is returned (not B) | integration |
| `joycraft-next-spec` returns nothing when all done | All specs `"complete"` — assert empty output or "pipeline complete" message | integration |
| Extension file is valid TypeScript | Parse extension with TypeScript compiler, assert no errors | unit |
| Extension registers `joycraft_next_spec` tool | Assert `pi.registerTool` called with name `joycraft_next_spec` | unit |
| Subagent definitions exist | Assert both `.md` files exist with required frontmatter fields | unit |
| Subagent tools are correct | Assert researcher has `read, grep, find, ls, bash`; verifier has same + read-only constraint | unit |

**Execution order:**
1. Write tests against expected file outputs and script behavior on sample manifests
2. Run tests to confirm they fail (red) — no scripts exist yet
3. Implement bash scripts, extension, subagent defs
4. Run tests — all green

**Smoke test:** `joycraft-spec-status` on a sample manifest — fastest script, immediate pass/fail.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Bash scripts are POSIX-compatible — shebang `#!/usr/bin/env bash`, no bash-specific v4+ features unless essential
- MUST: Bash scripts parse JSON using `grep` + `sed` (no `jq` dependency — not guaranteed on all systems)
- MUST: The extension is a single `.ts` file at `.pi/extensions/joycraft-pipeline.ts` — no directory, no `package.json`
- MUST: The extension uses TypeBox for tool parameter schema (standard Pi extension pattern)
- MUST: Subagent definitions use YAML frontmatter with `name`, `description`, `tools` fields
- MUST: Error recovery: if `joycraft-next-spec` finds a spec it can't resolve (broken manifest), exit non-zero and print error
- MUST NOT: Require any npm dependencies for the bash scripts
- MUST NOT: Use Pi's session API for subagents — subagents use Pi's subprocess-based subagent pattern (separate `pi` process)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| CREATE | `src/templates/pi-scripts/joycraft-spec-status` | Read manifest, print formatted status table |
| CREATE | `src/templates/pi-scripts/joycraft-mark-done` | Update spec status to `"complete"` in JSON |
| CREATE | `src/templates/pi-scripts/joycraft-next-spec` | Find next uncompleted spec respecting deps |
| CREATE | `src/templates/pi-scripts/joycraft-session-end` | Capture discoveries, validate, stage |
| CREATE | `src/templates/pi-scripts/README.md` | Progressive disclosure documentation |
| CREATE | `src/templates/pi-extensions/joycraft-pipeline.ts` | Extension registering `joycraft_next_spec` tool |
| CREATE | `src/templates/pi-agents/joycraft-researcher.md` | Subagent definition for research |
| CREATE | `src/templates/pi-agents/joycraft-verifier.md` | Subagent definition for verification |

## Approach

### Bash scripts strategy

All four scripts parse `.joycraft-spec-queue.json` from the spec directory. They find the manifest by scanning `docs/features/*/specs/.joycraft-spec-queue.json` (most recent feature, or the one with active specs).

- **`joycraft-spec-status`**: Read manifest, print table with `[✓]` / `[ ]` prefixes based on status.
- **`joycraft-mark-done <spec-id>`**: Update `"status": "complete"` for the given id. Use `sed` in-place.
- **`joycraft-next-spec`**: Filter to `status: "active"` specs, topo-sort by `depends_on`, return first whose deps are all complete.
- **`joycraft-session-end`**: Run `pnpm test && pnpm build`, capture output, append to `docs/discoveries/`, commit with message.

### Extension strategy

```typescript
// Single tool: joycraft_next_spec
// Execute: run bash scripts → session-end → newSession → sendUserMessage
```

The tool's execute function:
1. Runs `joycraft-mark-done <current-spec-id>` (current spec ID passed as tool argument)
2. Runs `joycraft-session-end` (captures discoveries, commits)
3. Runs `joycraft-next-spec` (finds next spec)
4. If next spec exists: `ctx.newSession()` with kickoff message `/skill:joycraft-implement <next-spec-path>`
5. If no next spec: report "Pipeline complete" to the current session

### Subagent definitions strategy

Simple markdown files with YAML frontmatter:
```yaml
---
name: joycraft-researcher
description: Independent research agent — sees only questions, never the brief
tools: read, grep, find, ls, bash
---
```

**Rejected alternative:** Multiple extension-registered tools (`mark_done`, `session_end`, `next_spec`). Would require the LLM to sequence them correctly and handle errors between steps. Single tool = single atomic operation.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Manifest not found | Scripts exit with error code 1 and clear message |
| Manifest is malformed JSON | Scripts exit with error code 2 and "invalid manifest" message |
| No active specs remain | `joycraft-next-spec` prints "Pipeline complete" and exits 0 |
| Spec has unmet dependency | `joycraft-next-spec` skips it, returns next eligible spec |
| All remaining specs blocked on incomplete deps | `joycraft-next-spec` prints "All remaining specs blocked" |
| Session-end script fails (tests fail) | Pipeline pauses — extension does not call `newSession` |
| `joycraft-mark-done` called on already-complete spec | No-op, exit 0 |
| Pi is not installed on the system (bash scripts only) | Scripts still work — they're pure bash + file I/O |
