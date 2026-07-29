---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
---

# Discoveries — gate markers are per-gate, not per-skill

**Date:** 2026-07-29
**Spec:** docs/features/2026-07-29-succinct-gates/specs/gate-contract-tests.md

## "Exactly once per skill" is wrong against the real sources
**Expected:** Each gate marker (slot template, cap sentence, `Done when:`) appears exactly once per skill, so the contract tests could assert count === 1.
**Actual:** Markers are per *gate moment*: new-feature has 2 gates (brief + handoff), research has 3 per-harness blocks (claude/codex/pi), and handoff skills carry `Done when:` twice by design (template + worked example).
**Impact:** `tests/gate-contract.test.ts` pins exact per-skill counts instead — still fails on copy-paste duplication without falsely failing correctly-authored multi-gate skills. Future gate specs should count gate moments, not skills.
