---
status: done
owner: Maximilian Maksutovic
created: 2026-08-11
feature: 2026-08-11-ste-human-output
mode: checkpoint
---

# Vendor STE Linter Script — Atomic Spec

> **Parent Brief:** `docs/features/2026-08-11-ste-human-output/brief.md`
> **Status:** Ready
> **Date:** 2026-08-11
> **Estimated scope:** 1 session / 2 files / ~150 lines

---

## What

Vendor the upstream `ste_lint.py` from the SimpleEnglish project into this repo at `scripts/ste-lint.py`. The script is copied, not depended on: 132 lines, Python stdlib only, with a `--self-test` flag. It counts ten mechanical STE violation classes (sentence over limit, contractions, banned modals, perfect tense, "-ing" clauses, semicolons, Latin abbreviations, slop words, trailing conditions, synonym rotation) and self-describes its scores as comparative, not a compliance verdict. The file gains an attribution header — SPDX license identifier, upstream URL, upstream version, retrieval date — and CHANGELOG.md gains a line noting the vendoring. This sets the repo's first vendored-code precedent. The script is maintainer tooling only: `scripts/` is not in the npm `files` allowlist and nothing here reaches user projects.

## Why

Spec 3's CI test needs a deterministic local linter, and the repo's NEVER boundary on unnecessary runtime dependencies rules out fetching one.

## External API Contract

**Package:** none — vendored file, no dependency added

**Canonical sources:**
- https://github.com/AminBlg/SimpleEnglish (upstream repo, skill v1.2.0, MIT — license verified 2026-08-11)
- Upstream file path: `evals/ste_lint.py`

**Key API facts (validated against v1.2.0):**
- 132 lines, Python stdlib only — no pip installs
- `--self-test` flag runs its built-in checks and exits nonzero on failure
- Counts 10 mechanical violation classes; output is comparative scoring, not a compliance verdict (the script says so itself)
- MIT license permits copying with attribution

## Acceptance Criteria

- [ ] `scripts/ste-lint.py` exists and matches upstream v1.2.0 behavior, with only the attribution header added [src: D2]
- [ ] The file header carries the SPDX identifier (MIT), upstream URL, upstream version, and retrieval date [src: D5]
- [ ] `CHANGELOG.md` notes the vendoring in the repo's before/now/side-effects entry format [src: D5]
- [ ] `python3 scripts/ste-lint.py --self-test` exits 0 [src: design §2.2]
- [ ] `package.json` `files` remains `["dist"]` — the script cannot reach npm consumers [src: D2]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Self-test passes | run `python3 scripts/ste-lint.py --self-test`, expect exit 0 | integration (manual this spec; spec 3 automates it) |
| Header present | inspect first lines for SPDX + URL + version + date | manual |
| Not published | `npm pack --dry-run` output contains no `scripts/` entry | manual |
| Suite unaffected | `pnpm test` and `pnpm typecheck` stay green | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code (the self-test fails because the file does not exist yet)
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `python3 scripts/ste-lint.py --self-test`

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST vendor (copy) the file at `scripts/ste-lint.py` — repo-side only [src: D2]
- MUST carry SPDX + upstream URL + upstream version + retrieval date in the file header [src: D5]
- MUST add a CHANGELOG line for the vendoring [src: D5]
- MUST preserve upstream behavior — attribution header is the only edit; fixes go upstream, not into the copy [src: design §4]
- MUST NOT place the file under `src/templates/` or anywhere users receive it [src: D2]
- MUST NOT add a runtime or dev dependency for it [src: design §4]
- MUST NOT add a README acknowledgment — the file is repo-internal [src: D5]
- MUST NOT create any user-facing script obligation [src: D2]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `scripts/ste-lint.py` | Vendored upstream `evals/ste_lint.py` (v1.2.0) + attribution header |
| Modify | `CHANGELOG.md` | One vendoring line in the newest entry, before/now/side-effects format |

## Approach

Fetch the file from the upstream repo at the v1.2.0 tag (or the commit the skill v1.2.0 references) — no copy exists in this repo yet. Prepend the header: `# SPDX-License-Identifier: MIT`, upstream URL, upstream version, retrieval date. Rename follows D2's stamped path (`ste-lint.py`, hyphenated, matching this repo's script naming). Verify `--self-test` locally. Add the CHANGELOG line. Rejected alternative: instructing users to install the SimpleEnglish plugin — it puts a third-party install step inside Joycraft's default path and couples gate behavior to an external repo's evolution.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Upstream tag v1.2.0 unreachable or file moved | Stop and report — do not vendor from an unverified ref; the header's version claim must be true |
| Upstream file differs from the brief's described 132 lines / 10 classes | Vendor what upstream v1.2.0 actually ships and note the delta in the commit message; the brief described, the upstream defines |
| Local machine lacks python3 | Self-test is deferred to CI (ubuntu-latest ships python3); note it in the commit message rather than skipping silently |
| `pnpm test` regenerates bundles as a side effect | Verify the script did not leak into `src/bundled-files.ts` by content, not by `git status` (discovery 2026-07-27) |
