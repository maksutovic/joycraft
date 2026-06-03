---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-03
---

# Discoveries — upgrade + version-sync tests already failing on main (v0.6.8)

**Date:** 2026-06-03
**Context:** session-end validation gate on the `fix/pi-harness` branch

## 20 test failures pre-exist on the v0.6.8 release commit, unrelated to the Pi-harness work
**Expected:** A clean `pnpm test --run` baseline; the only known-failing test was `version-sync` (stale `0.6.7` in `.claude/.joycraft/state.json`).
**Actual:** 20 failures across `tests/upgrade.test.ts` (18), `tests/migrate-bugfix-dirs.test.ts` (1), and `tests/version-sync.test.ts` (1). Bisected by checking out the release commit `04ec210` (v0.6.8) and running those suites directly — **identical 20 failures with zero of this session's changes applied.** They are a pre-existing condition on `main`, not a regression from the skill edits.
**Impact:**
- The Pi-harness PR (#47) is clean — its own tests (skill sync, decompose handoff, implement-loop) pass; do not let the red upgrade suite block reviewing/merging it.
- **Before relying on `npx joycraft upgrade` in another project off this code, the upgrade machinery needs its own bugfix pass** — 18 upgrade tests failing means the upgrade path itself is suspect, not just its tests. The failures look like the upgrade no longer detects/applies changes (`expected false to be true`, `expected 'old bundled content' to be '<new skill>'`), plus the version-state relocation/migration cases. Triage whether it's the tests drifting from new behavior or the `upgrade.ts` logic actually broken.
- Likely related to the recent `2026-05-31-relocate-version-state` feature (version state moved to `.claude/.joycraft/state.json`); the `version-sync` failure is the stale-state symptom of the same area.

## Gotcha: checking out an old commit regenerates `.joycraft-version` and can spawn a phantom stash conflict
**Expected:** `git checkout <old-commit>` for a quick test, then `git checkout <branch>` back, leaves the tree clean.
**Actual:** Building at the old commit regenerated a root `.joycraft-version` (since-relocated file), and a `git stash pop` of an unrelated auto-applied change produced a conflict in `.pi/skills/joycraft-decompose/SKILL.md`. Resolved non-destructively via `git checkout <my-commit> -- <file>` + `rm` the phantom file (avoid `git reset --hard` — it's an ASK-FIRST op here).
**Impact:** When bisecting across the version-state relocation, expect the root `.joycraft-version` to reappear; clean it explicitly rather than trusting the tree to be pristine.
