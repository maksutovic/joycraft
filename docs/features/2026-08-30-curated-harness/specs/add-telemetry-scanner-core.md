---
status: done
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: isolated
---

# Add Telemetry Scanner Core — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / ~3 files / ~400 lines

---

## What

A new pure TypeScript module `src/telemetry.ts` that reads AI-harness session transcripts and produces per-document read/write counts for the knowledge layer. It parses Claude Code transcripts (`~/.claude/projects/<cwd-dash-encoded>/*.jsonl`, structured `input.file_path` on Read/Write/Edit `tool_use` blocks) and Pi transcripts (`~/.pi/agent/sessions/--<cwd-dash-encoded>--/*.jsonl`, typed events). Every read is tagged `mandated` (the active skill's own text opens the doc) or `voluntary` (the agent followed a pointer mid-task). The scan covers only knowledge-layer paths: `docs/context/**`, `docs/discoveries/**`, `AGENTS.md`, `CLAUDE.md`, `docs/reference/**`. This spec is the scanner library only — no CLI, no persistence (spec 3), no Codex (spec 2).

## Why

Without the scanner there is no empirical read/write evidence; optimize's RETIRE recommendations stay judgment-only and the whole earn-your-keep workstream has no data source.

## Acceptance Criteria

- [ ] `scanTranscripts(projectDir, opts)` returns per-doc counts keyed by repo-relative path, with `writes`, `mandatedReads`, `voluntaryReads`, and per-session attribution [src: design §2 WS1]
- [ ] Every read is tagged `mandated` or `voluntary`; the result never reports an untagged read [src: D3]
- [ ] Claude Code JSONL parsing extracts `input.file_path` from Read/Write/Edit `tool_use` blocks [src: design §1]
- [ ] Pi typed-JSONL parsing extracts file operations from session events [src: design §1]
- [ ] Only knowledge-layer paths (`docs/context/**`, `docs/discoveries/**`, `AGENTS.md`, `CLAUDE.md`, `docs/reference/**`) appear in results [src: design §2 WS1]
- [ ] Transcript directories are injectable parameters; defaults are derived from `$HOME` + dash-encoded cwd at runtime [src: design §3]
- [ ] Malformed lines and unreadable files are skipped, never thrown [src: design §3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Per-doc counts shape | `scanTranscripts` over a fixture dir returns expected `{path → counts}` map | unit |
| mandated/voluntary tagging | fixture where session-end Step 1b opens decision-log (mandated) vs a mid-task Read of a context doc (voluntary) → tagged correctly | unit |
| Claude parsing | fixture `.jsonl` with Read/Write/Edit tool_use blocks → correct ops | unit |
| Pi parsing | fixture Pi-format `.jsonl` → correct ops | unit |
| Knowledge-layer filter | fixture containing `src/foo.ts` reads → excluded from results | unit |
| Injectable paths | pass explicit `transcriptDir` pointing at `tests/fixtures/transcripts/` → no `$HOME` access | unit |
| Malformed input | truncated/garbage lines interleaved → parse continues, counts correct | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the per-doc counts shape test (`pnpm test tests/telemetry.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: be a pure module of small per-source functions (`parseSessionLine(line): FileOp | null` per harness) composed by one exported entry point taking its roots as parameters — the `src/detect.ts` idiom [src: design §3]
- MUST: tag every read `mandated` or `voluntary`; only voluntary reads feed retire/keep evidence downstream [src: brief "Hard Constraints"]
- MUST: treat mandated reads as those a skill's own text opens — session-end Step 1b, add-fact Step 2b, optimize's Reaper pass [src: design §2 WS1]
- MUST: derive default transcript paths at runtime from `$HOME` + encoded cwd, per `src/frontmatter.ts` `defaultMemoryDir()` [src: design §3]
- MUST: target Claude + Pi structured parsing as v1 fidelity [src: design §4]
- MUST NOT: read transcript content into any output — results carry paths and counters only [src: design §4]
- MUST NOT: perform network access or write any file — the module is read-only [src: brief "1. Read-telemetry"]
- MUST NOT: ship literal absolute paths in any text destined for skills/templates [src: design §3]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/telemetry.ts` | Types (`FileOp`, `DocCounts`, `ScanResult`), Claude parser, Pi parser, knowledge-layer filter, mandated/voluntary classifier, `scanTranscripts` entry point |
| Create | `tests/telemetry.test.ts` | Unit tests per Test Plan |
| Create | `tests/fixtures/transcripts/` | Minimal Claude + Pi JSONL fixtures (real-world-shaped, per AGENTS.md gotcha 4) |

## Approach

Mirror `detectStack(dir)`: one exported `scanTranscripts(projectDir: string, opts?: { claudeDir?: string; piDir?: string })` composing per-harness line parsers that return `FileOp | null`. Classification of mandated vs voluntary: track active-skill state per session by scanning for skill-invocation markers in the transcript (Claude: `Skill` tool_use blocks / skill content injection turns); a read of a knowledge-layer doc while a skill whose text mandates that doc is active (session-end → context docs in Step 1b, add-fact → overlap-grep targets, optimize → Reaper inputs) is `mandated`; every other read is `voluntary`. When attribution is ambiguous (no skill markers parseable), default the read to `mandated` — under-counting voluntary reads biases against false RETIRE evidence, the safe direction. Each session file's result carries its session id so spec 3 can dedupe. Rejected alternative: a single regex-over-raw-text scanner (no per-harness structure, breaks on Pi's typed events, untestable classification).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Transcript dir missing (harness not installed) | Return empty result for that harness, no error |
| Doc renamed mid-history | Counts keyed by path as-written; no rename tracking in v1 |
| Read of a knowledge-layer doc via absolute path | Normalize to repo-relative before keying |
| Session file still being written (partial last line) | Skip the partial line, keep the rest |
| Same doc read twice in one session | Both reads counted; session id recorded once |
