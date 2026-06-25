---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-15
feature: init-upgrade-legibility
---

# Discoveries — backlog scaffolding reframed the "solo-first lazy-create" rule

**Date:** 2026-06-15
**Spec:** none (implemented directly from `docs/features/2026-06-15-init-upgrade-legibility/brief.md`, Task #4)

## The "dangling pointer" premise was weaker than the brief stated
**Expected:** Per the brief, the generated `CLAUDE.md`/`AGENTS.md` reference `docs/backlog/` but init never creates it, so the pointer dangles — a pure papercut fix.
**Actual:** The generated harness files did **not** reference `docs/backlog/` at all. Only the CONTRIBUTING template and the skills (`/joycraft-interview`, `/joycraft-new-feature`, `/joycraft-design`) mentioned it — and those skills lazy-create the dir on confirmed use (`docs/backlog/YYYY-MM-DD-*.md`). `init.ts` was deliberately solo-first: it created only `docs/context/` up front, with `tests/init.test.ts` asserting `docs/` contains exactly `['context','templates']` and that `docs/backlog` does NOT exist. So "scaffold backlog" directly contradicted an intentional, tested design decision rather than fixing a bug.
**Impact:** This was a fork, not a one-liner — surfaced to the user rather than silently overriding the test. User's call: the generated harness files **should** point at `docs/backlog/` (capturing deferred work mid-sprint is core to Joycraft), so the fix became two-sided — add the pointer to both generators AND scaffold the dir (with a README stub). `docs/backlog/` is now the **second always-created** docs subdir by design; the solo-first test was updated to expect it. Future work that touches init's scaffolding should treat `context/` + `backlog/` as the up-front pair, not `context/` alone.
