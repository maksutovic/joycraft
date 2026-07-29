---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
---

# Discoveries — init never touches an existing AGENTS.md

**Date:** 2026-07-29
**Spec:** docs/features/2026-07-29-succinct-gates/specs/capture-execution-profile.md

## Execution Profile insert-if-absent belongs to upgrade/tune, not init
**Expected:** Init could insert the sentinel-delimited `## Execution Profile` section into an existing AGENTS.md that lacks one.
**Actual:** `tests/harness-selection.test.ts` enforces "multi-tool init never touches an existing AGENTS.md or CLAUDE.md" — init's contract is create-if-missing only. Insert-if-absent lives solely in `upgrade` plus tune's interactive offer (the surfaces where users opt into Joycraft editing files they own). See the skip branch in `src/init.ts`.
**Impact:** Future specs adding AGENTS.md/CLAUDE.md sections must route the existing-file path through upgrade/tune, never init.
