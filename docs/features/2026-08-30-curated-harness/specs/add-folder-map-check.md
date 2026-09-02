---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: checkpoint
---

# Add Folder Map Check — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / ~5 files / ~200 lines

---

## What

The generated architecture section becomes a **check-shaped folder map**: a pure function walks the real filesystem and emits top-level folders (plus key subfolders) with one-line descriptions; init and upgrade regenerate it; `joycraft-tune` gains an advisory drift check that re-runs the walk and diffs it against the section in the file, so a stale map fails a check instead of misleading an agent. The docs name the growth path: past multi-team scale, the root map gives way to nested per-directory instruction files via `joycraft-collaborative-setup` — never a bigger tree. Joycraft's own ~40-line AGENTS.md architecture tree is trimmed to the new map shape as the first candidate.

## Why

A hand-maintained tree is a guaranteed-drift prose copy of machine-derivable truth — the fastest-drifting, least-useful part of the current template (D6, panel unanimous).

## Acceptance Criteria

- [ ] A pure function (e.g. `generateFolderMap(dir)`) emits folders + one-line descriptions from the real filesystem, deterministic for a given tree [src: D6]
- [ ] init and upgrade write/regenerate the map section in the generated files, replacing the deep-tree habit [src: D6]
- [ ] tune gains an advisory drift check: regenerate, diff, report — never auto-edit [src: D6]
- [ ] The growth path (nested per-directory instruction files via collaborative-setup, never a bigger tree) is documented where the map is described [src: design §2 WS4]
- [ ] Joycraft's own AGENTS.md architecture tree is trimmed to the map shape in this commit [src: design §2 WS4]
- [ ] tune's net skill growth (228 lines, over budget) is paid same-commit [src: design §4]
- [ ] Generated + installed copies of tune regenerated and synced same-commit [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Deterministic map | `generateFolderMap` over a fixture tree → expected markdown, stable across runs | unit |
| Description sourcing | folders without a known description get a safe placeholder line, never invented prose | unit |
| init/upgrade wiring | scaffold into a temp dir → generated file contains the map section; re-run regenerates | integration |
| Drift check content | content test: tune contains the regenerate-and-diff instruction, advisory voice | unit |
| Own tree trimmed | assertion or manual check: AGENTS.md architecture section is the map shape | manual/unit |
| Copies in sync | bundle-regen + sync tests green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the deterministic-map unit test.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: generate the map from the real filesystem — folders + one-line descriptions only, no file-level entries, no hand-maintained tree [src: D6]
- MUST: keep the tune check advisory — report drift, never auto-edit [src: design §1 — "tune never auto-edits"]
- MUST: document the nested per-directory growth path [src: design §2 WS4]
- MUST: implement the walk as a pure function with an explicit `dir` parameter, per the detect.ts idiom [src: design §3]
- MUST NOT: emit descriptions the generator cannot know — unknown folders get a placeholder the human fills, which the drift check ignores in comparisons [src: D6]
- MUST NOT: modify existing user files outside the guarded generated section [src: design §2 WS4]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/folder-map.ts` | `generateFolderMap(dir)` pure walk + markdown emitter + diff helper |
| Modify | `src/agents-md.ts` | Architecture section emission switches to the map |
| Modify | `src/improve-claude-md.ts` | Same switch in that chain (if it emits an architecture section) |
| Modify | `src/init.ts` / `src/upgrade.ts` | Regeneration wiring at scaffold/upgrade time |
| Modify | `src/skills/joycraft-tune.md` (+ generated/installed copies) | Advisory drift-check finding + paying trims |
| Modify | `AGENTS.md` | Own tree trimmed to map shape |
| Create | `tests/folder-map.test.ts` | Tests per Test Plan |

## Approach

Walk one to two levels deep, skip ignored/dot/generated dirs (reuse gitignore knowledge where cheap), and merge human-editable one-liners: the generator preserves an existing description for a folder that still exists and only adds/removes rows — so the machine owns structure, the human owns wording, and the drift check compares structure only. tune's finding: "folder map drift: N added, M removed" inside the relevant dimension row. Rejected alternative: slim-only without the drift check — keeps the fastest-drifting artifact on the honor system (D6's rejected option).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Monorepo with 40 top-level folders | Cap rows and note the cap; recommend the nested growth path |
| Folder renamed | Old row removed, new row added with placeholder description |
| No existing architecture section | Map appended via the header-regex guard pattern |
| User deleted the map section deliberately | Guard sees no header → re-append at upgrade; tune notes it — human can pin removal via config if wanted (out of scope) |
