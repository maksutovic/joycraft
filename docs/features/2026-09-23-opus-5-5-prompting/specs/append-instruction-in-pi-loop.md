---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Append the Unattended Instruction in the Pi Loop — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / 3 files / ~80 lines

---

## What

`src/templates/pi-scripts/joycraft-implement-loop` reads the standing instruction from the installed profile once, before the loop, and passes it to both `pi` calls with `--append-system-prompt`.

- Source: `docs/templates/reference/model-profile-claude.md`, relative to the current directory (the scripts run from the project root, per `src/templates/pi-scripts/README.md`).
- Extraction: the text between the first and second fence lines (lines that start with three backticks) after the line `## Keep Working in Unattended Runs`, stopping at the next `## ` heading. POSIX `awk` or `sed` only; no `jq`, no new dependency.
- Call shape: `"$PI_BIN" --append-system-prompt "$UNATTENDED" -p "/skill:joycraft-implement $NEXT"`, and the same flag on the spec-done call. The flag goes before `-p`.
- Doc missing or extraction empty: print exactly one line to stderr, `joycraft-implement-loop: docs/templates/reference/model-profile-claude.md not found or has no unattended instruction; running without it.`, and call `pi` without the flag. Never fail the loop for this.
- Update the script's header comment and one line in `src/templates/pi-scripts/README.md` to say the loop appends the unattended instruction.

## Why

`pi -p` ends on a text-only turn, and the loop then runs spec-done, which commits the spec as `in-review` with no validation. Decision D2 ships the standing instruction alone, with no continuation logic.

## Acceptance Criteria

- [ ] With the doc present, both recorded `pi` invocations carry `--append-system-prompt` followed by the extracted text, and the text equals the fenced block's content.
- [ ] With the doc absent, the loop prints the warning once, calls `pi` without the flag, and exits 0 when the queue completes.
- [ ] The loop's existing behavior is unchanged: fail-fast on a non-zero `pi` exit, session-end once at the end.
- [ ] README mentions the appended instruction.
- [ ] Build passes; tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Flag and text on both calls | New `tests/pi-implement-loop-instruction.test.ts`: temp dir as cwd with `docs/templates/reference/model-profile-claude.md` copied from `src/templates/reference/`; a `bin/` on `PATH` holding stub `joycraft-next-spec` (prints a spec path on the first call, `Pipeline complete` on the second, using a counter file) and stub `joycraft-session-end`; `PI_BIN` points at a stub that appends its argv (NUL- or newline-separated with a record marker) to a log. Run `src/templates/pi-scripts/joycraft-implement-loop <specs-dir>` with `execFileSync`. Assert two records, each with `--append-system-prompt` then the extracted text, then `-p`. | integration |
| Extracted text is the fenced block | In the same test, compute the fenced content from the doc in TypeScript and compare | integration |
| Missing doc | Same harness without the doc: stderr contains the warning exactly once, no record carries the flag, exit code 0 | integration |
| Fail-fast unchanged | Stub `pi` exits 1: loop exits non-zero, session-end stub never runs | integration |
| README line | Extend `tests/wire-and-bundle.test.ts` README case with a check for `--append-system-prompt` | unit |

**Execution order:**
1. Write the tests — red.
2. Confirm.
3. Edit the script and README until green.

**Smoke test:** `pnpm vitest run tests/pi-implement-loop-instruction.test.ts`

**Before implementing, verify your test harness:**
1. The flag assertions must FAIL against today's script
2. The test runs the real script, not a copy
3. Seconds to run

## Constraints

- MUST: keep `set -euo pipefail` semantics; the extraction must not abort the script when the doc is missing.
- MUST: quote the extracted text as one argument.
- MUST: keep the script POSIX-tool only (bash, awk/sed, grep).
- MUST NOT: add continuation, retries, completion checks, or `--session-id` handling (D2).
- MUST NOT: copy the instruction text into the script; the profile doc is its only home.
- MUST NOT: edit `.pi/scripts/joycraft/` in this repo by hand; spec 9's updater run installs it.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/pi-scripts/joycraft-implement-loop` | Extraction, flag on both calls, header comment |
| Modify | `src/templates/pi-scripts/README.md` | One line |
| Create | `tests/pi-implement-loop-instruction.test.ts` | Stub-driven tests |
| Modify | `tests/wire-and-bundle.test.ts` | README assertion |
| Regenerate | `src/bundled-files.ts` | `pnpm sync-skills` |

## Approach

One `extract_unattended` shell function run once before the `while` loop; store the result in `UNATTENDED`. Build the `pi` argument list with a bash array so an empty value adds no flag. `pi --help` (checked 2026-09-23) lists `--append-system-prompt <text>`.

Rejected alternative: pass the whole profile doc with `--append-system-prompt <file>`. That appends every block, including Fable-only ones, to every run.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Doc exists but the heading is missing | Treated as missing: one warning, no flag |
| Fenced block holds quotes, dollar signs, or backticks | Passed through intact as one argument |
| Pi runs a non-Claude model (e.g. this repo's kimi-k3 row) | The flag is still passed; the instruction is model-neutral in content |
| Script run from a subdirectory | Doc not found; warning; loop continues (the README already requires the project root) |
