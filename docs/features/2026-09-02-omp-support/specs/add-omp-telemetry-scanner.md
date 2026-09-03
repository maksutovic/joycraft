---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-03
feature: 2026-09-02-omp-support
mode: batch
---

# Add omp Telemetry Scanner — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Status:** Ready
> **Date:** 2026-09-03
> **Estimated scope:** 1 session / 3 source files / ~40 lines

---

## What

Teach the read-telemetry scanner to read omp session transcripts. Add `defaultOmpTranscriptDir(projectDir)` to `src/telemetry.ts` resolving to `~/.omp/agent/sessions/<encoded-cwd>/`, add an `ompDir?` option to `ScanOptions`, scan that directory inside `scanTranscripts` using the **existing** `parsePiSessionLine` parser under the `omp` session namespace, and thread the same `ompDir` option through `runTelemetryScan` in `src/telemetry-store.ts` including its `nothing-to-scan` existence check.

omp writes the Pi JSONL transcript family, so this is one new default-dir function plus parser reuse — no new parser.

## Why

Without it, `joycraft telemetry` silently under-counts: an omp-driven session's reads and writes never reach the store, so optimize's retire/keep evidence treats documents that omp sessions actively read as never-read.

## External API Contract

**Package:** `@oh-my-pi/pi-coding-agent` (binary `omp`)

**Canonical sources:**
- The locally installed v18.1.5 bundled docs — the source the parent brief's discovery claims were read from.

**Key API facts (validated against v18.1.5):**
- omp writes session transcripts to `~/.omp/agent/sessions/<encoded-cwd>/*.jsonl`.
- The JSONL line shape is the Pi family — the same records `parsePiSessionLine` already handles.
- **Encoding difference from Pi:** Pi's directory is `-<encoded-cwd>--` (leading dash, trailing double dash); the brief specifies omp's as plain `<encoded-cwd>` with no affixes. Do not copy Pi's affixes.

## Acceptance Criteria

- [ ] `defaultOmpTranscriptDir(projectDir)` is exported from `src/telemetry.ts` and returns `join(HOME, '.omp', 'agent', 'sessions', encodedCwd(projectDir))` with no leading or trailing dash affixes [src: D4]
- [ ] `ScanOptions` accepts an optional `ompDir` that overrides the default [src: D4]
- [ ] `scanTranscripts` scans the omp dir with `parsePiSessionLine` and no new parser is added [src: D4]
- [ ] With `namespaceSessions: true`, omp session ids are prefixed `omp:` [src: brief "Hard Constraints"]
- [ ] `TelemetryScanOptions` in `src/telemetry-store.ts` accepts `ompDir`, and `runTelemetryScan` forwards it to `scanTranscripts` [src: D4]
- [ ] `runTelemetryScan` returns `nothing-to-scan` only when the omp dir is also absent — an omp-only project with transcripts scans successfully [src: D4]
- [ ] A session written to `~/.omp/agent/sessions/<encoded-cwd>/` is counted by `joycraft telemetry` [src: brief "Success Criteria"]
- [ ] A missing omp dir yields an empty contribution and never throws [src: brief "Hard Constraints"]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| default dir shape | `tests/telemetry.test.ts` — set `HOME` to a temp dir, assert `defaultOmpTranscriptDir('/a/b')` ends with `.omp/agent/sessions/-a-b` and contains no `--` suffix | unit |
| dir differs from Pi's affixed form | Same file — assert `defaultOmpTranscriptDir(p) !== defaultPiTranscriptDir(p)` | unit |
| ompDir override honored | `tests/telemetry.test.ts` — write a fixture JSONL to a temp dir, pass `ompDir`, assert its ops appear in `docs` | integration |
| Pi parser reuse | Same test — a Pi-shaped read record in the omp fixture produces the same `DocCounts` a Pi fixture would | integration |
| `omp:` namespace prefix | `tests/telemetry.test.ts` — with `namespaceSessions: true`, assert a returned session id starts with `omp:` | unit |
| store threads ompDir | `tests/telemetry-store.test.ts` — pass `ompDir` to `runTelemetryScan`, assert `newSessions > 0` and the store file records the `omp:`-prefixed id | integration |
| omp-only project scans | `tests/telemetry-store.test.ts` — claude/pi/codex dirs absent, omp dir present with a fixture → status `ok`, not `nothing-to-scan` | integration |
| missing dir is safe | `tests/telemetry.test.ts` — `ompDir` pointing at a nonexistent path returns empty docs, no throw | unit |

**Execution order:**
1. Write all tests above — they should fail against current code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/telemetry.test.ts` — seconds, and covers the dir shape plus parser reuse.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: resolve the omp transcript dir to `~/.omp/agent/sessions/<encoded-cwd>/` [src: D4]
- MUST: reuse `parsePiSessionLine` — omp writes the Pi JSONL family [src: D4]
- MUST: thread `ompDir` through both `ScanOptions` and `TelemetryScanOptions`, including the `nothing-to-scan` existence check [src: D4]
- MUST: namespace omp session ids as `omp:<id>` when `namespaceSessions` is set [src: brief "Hard Constraints"]
- MUST NOT: add a new line parser [src: D4]
- MUST NOT: copy Pi's `-…--` directory affixes onto the omp path [src: D4]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: edit `src/harness.ts`, `src/init.ts`, `src/upgrade.ts`, or any skill file — this spec is telemetry-only and runs in parallel with spec 1 [src: brief "Execution Strategy"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/telemetry.ts` | `defaultOmpTranscriptDir` export; `ompDir?` on `ScanOptions`; omp scan loop in `scanTranscripts` using `parsePiSessionLine` with `prefix('omp')`; header comment's transcript-path list gains the omp row |
| Modify | `src/telemetry-store.ts` | `ompDir?` on `TelemetryScanOptions`; resolve + forward it; include it in the four-dir existence check |
| Modify | `tests/telemetry.test.ts` | omp dir shape, override, parser reuse, namespace, missing-dir cases |
| Modify | `tests/telemetry-store.test.ts` | omp threading + omp-only scan cases |

## Approach

The scanner is already shaped for this: `scanTranscripts` resolves each harness dir with `opts.<h>Dir ?? default<H>TranscriptDir(...)` and calls `scanFile` per file with a parser and an options bag. Adding omp is one more resolve-and-loop stanza placed after the Pi stanza, passing `parsePiSessionLine` and `prefix('omp')`. No `forceMandated`, no `requireCwdMatch`, no `fidelity` override — omp transcripts are per-project and full-fidelity, exactly like Pi's.

In `telemetry-store.ts` the only subtlety is the existence guard. It currently reads `![claudeDir, piDir, codexDir].some(existsSync)`; omp must join that array or an omp-only project short-circuits to `nothing-to-scan` before the scan runs. That is the one line where an omission produces a silent wrong answer rather than a type error, so its test (omp-only project scans successfully) is the load-bearing one.

Watch the encoding: `encodedCwd` replaces `/` with `-`, so `/a/b` becomes `-a-b` and the omp dir is `~/.omp/agent/sessions/-a-b`. Pi wraps that in extra affixes (`-<encoded>--`); omp does not. Reusing `defaultPiTranscriptDir`'s template string is the obvious mistake here, which is why a test asserts the two functions disagree.

**Rejected alternative:** a generic `TranscriptSource[]` array that `scanTranscripts` iterates, replacing the four hand-written stanzas. Genuinely cleaner, but the stanzas differ in parser, fidelity, cwd-matching, and file-listing function (`listSessionFiles` vs `listRolloutFiles`), so the config object would need five fields to express four call sites — and this spec runs in parallel with spec 1, so a refactor of shared scanner internals raises the merge-conflict surface for no behavioral gain. Add the stanza; leave the refactor to a future cleanup with the whole file to itself.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `HOME` unset | `process.env.HOME ?? ''` yields a relative path; `existsSync` fails; empty contribution, no throw (matches the other three defaults) |
| omp dir exists but is empty | Zero files listed; empty contribution; `nothing-to-scan` only if the other three are also absent |
| Malformed JSONL line in an omp transcript | Skipped by `parseJson`'s null return, as for Pi |
| Same session id appears under both Pi and omp | Namespacing keeps them distinct (`pi:x` vs `omp:x`); without `namespaceSessions` they would collide — matching existing cross-harness behavior, not a new problem |
| A session already in `scannedSessions` | Excluded via `excludeSessions`, so re-scans stay incremental |
| Project path containing a literal `-` | `encodedCwd` is lossy for such paths (pre-existing for all harnesses); do not attempt to fix here |
| omp dir present, unreadable (permissions) | File listing/read errors are swallowed by the existing guards; empty contribution |
