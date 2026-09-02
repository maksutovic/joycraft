---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: checkpoint
---

# Add Telemetry CLI and Store — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / ~4 files / ~250 lines

---

## What

A `joycraft telemetry` CLI subcommand that runs the scanner (spec 1) over the current project and accumulates results into `docs/.joycraft/telemetry.json` — machine-local, gitignored, keyed by repo-relative doc path, storing only counters plus a scanned-session id list so each session file is parsed once. Subsequent runs are incremental: sessions already in the scanned list are skipped.

## Why

D2/D3 require session-end to trigger the scan via a CLI entry point with accumulated evidence for optimize to consume; without persistence every scan would re-parse all transcripts and evidence would vanish between invocations.

## Acceptance Criteria

- [ ] `joycraft telemetry` (via `dist/cli.js telemetry`) scans and writes/updates `docs/.joycraft/telemetry.json` [src: D3]
- [ ] The store holds only repo-relative paths, counters, and scanned-session ids — never transcript content [src: design §4]
- [ ] A second run skips sessions already in the scanned-session list (incremental) [src: design §2 WS1]
- [ ] `telemetry.json` is gitignored: the init/upgrade scaffolding that manages `docs/.joycraft/` ignores covers it, and this repo's `.gitignore` covers it [src: design §4]
- [ ] The command exits 0 with a one-line summary on success and exits 0 with a "nothing to scan" note when no transcript dirs exist [src: D3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Store write | run the store function against fixture transcripts in a temp dir → expected JSON on disk | integration |
| Content discipline | written JSON contains no transcript text fields (shape assertion) | unit |
| Incremental dedupe | run twice over the same fixtures → counts unchanged, sessions listed once | integration |
| Gitignore coverage | scaffolded project's ignore rules match `docs/.joycraft/telemetry.json` | unit |
| Graceful empty | no transcript dirs → exit 0, no store corruption | integration |
| Malformed existing store | pre-write garbage `telemetry.json` → rebuilt or skipped with warning, never crash | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the incremental-dedupe test (`pnpm test tests/telemetry-store.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: expose the scan as a `joycraft telemetry` CLI subcommand in `src/cli.ts` [src: D3]
- MUST: store machine-local and gitignored at `docs/.joycraft/telemetry.json`, beside `state.json`, honoring the machine-owned vs shared split of `docs/.joycraft/` [src: design §4]
- MUST: keep a scanned-session list so each session file is parsed once [src: design §2 WS1]
- MUST: keep the accumulation logic in a pure testable module with injectable paths, not inline in `cli.ts` [src: design §3]
- MUST NOT: store transcript content, command strings, or per-user identity — paths + counters + session ids only [src: design §4]
- MUST NOT: commit `telemetry.json` anywhere, this repo included [src: design §4]
- MUST NOT: add runtime dependencies [src: brief "1. Read-telemetry" — "No telemetry infra, no network"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/telemetry-store.ts` | Load/merge/save of `telemetry.json`, scanned-session dedupe, malformed-store guard |
| Modify | `src/cli.ts` | `telemetry` subcommand wiring + one-line summary output |
| Modify | `src/init.ts` (or the module owning `docs/.joycraft` gitignore rules) | Ensure the ignore rule covers `telemetry.json` in scaffolded projects |
| Modify | `.gitignore` | Cover `docs/.joycraft/telemetry.json` in this repo if the existing state.json rule does not already |
| Create | `tests/telemetry-store.test.ts` | Tests per Test Plan |

## Approach

`telemetry-store.ts` exports `runTelemetryScan(projectDir, opts)`: load existing store (tolerating absence/corruption), call `scanTranscripts` with the store's scanned-session list as an exclusion set, merge new per-doc counters, save atomically (write temp + rename). The CLI subcommand is a thin argument-parsing wrapper, matching how `init`/`upgrade` are wired. Store schema carries a `version` field for future migration. Rejected alternative: committed telemetry file — merge conflicts and publishes individual work patterns (the team-install privacy concern, design §4).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/.joycraft/` missing (not a Joycraft project) | Create the dir or exit with a clear note — never scatter files elsewhere |
| Two harnesses report the same session-shaped id | Ids namespaced per harness (`claude:<id>`, `pi:<id>`) |
| Store grows large over months | Counters only — size stays bounded by doc count, not session count |
| Concurrent session-end runs | Atomic write means last-writer-wins, no torn JSON |
| Codex fixtures present | Counts merge with `fidelity: "degraded"` preserved per-source |
