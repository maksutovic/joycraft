---
status: todo
owner: Maximilian Maksutovic
created: 2026-11-02
feature: 2026-11-02-install-entry-files
---

# Discoveries — building the context map release

**Date:** 2026-11-02
**Spec:** ../features/2026-11-02-install-entry-files/brief.md

## Install never touched the entry files after 1.0

**Expected:** an existing project's agent learns about the skills and the map after install.

**Actual:** `init --yes` wrote 83 files and changed neither AGENTS.md nor CLAUDE.md. The 1.x CLI calls only `install-v1`, `legacy-07`, `rollback` and `payload`; the 0.7 writers are unreachable. Only `setup.md` asked the agent, and nothing made it run.

**Impact:** the wiring check now runs in four places (init/update, doctor, the entry skill, a request by hand).

## Skill-text baselines often do not discriminate

**Expected:** a live run with the old skill text fails where the new text passes.

**Actual:** for map growth and for adding or removing context, the field-10 text passed the same simple fixtures. The doc-audit trim, the meeting-notes case, routing and the CLAUDE.md import position did discriminate.

**Impact:** a live check of skill text needs a fixture that holds the failure (a stale dated addendum, a long AGENTS.md, a messy note), and a baseline run, before it counts as evidence.

## A nested headless run inherits the desktop entry point

**Expected:** `CLAUDE_CODE_ENTRYPOINT` tells a headless run from the desktop app.

**Actual:** `claude -p` started from inside a desktop session reported `CLAUDE_CODE_ENTRYPOINT=claude-desktop` and `CLAUDE_CODE_SESSION_ATTENDED=0`. A review agent following "open it" ran `open` and Safari appeared on Max's screen.

**Impact:** `artifacts.md` "Showing a page" uses the attended signal (`CLAUDE_CODE_SESSION_ATTENDED`, `CODEX_CI`, `CI`) first.

## `release-consumer-process.test.ts` times out locally

**Expected:** the suite passes locally as in CI.

**Actual:** its subprocess tests hit the 30 s limit on this machine, alone and under load, on `main` as well as this branch.

**Impact:** not caused by this work; check CI timing before raising the limit.
