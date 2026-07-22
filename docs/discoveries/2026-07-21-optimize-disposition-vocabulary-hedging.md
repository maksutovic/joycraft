---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
---

# Discoveries — optimize disposition vocabulary hedging

**Date:** 2026-07-21
**Spec:** `docs/features/2026-07-21-living-harness/specs/run-gate-evals.md` (Gate 3)

## Fresh subagents hedge Disposition values despite "exactly six, no synonyms"

**Expected:** `joycraft-optimize`'s disposition table would use only the six bare vocabulary words per the spec's "no synonyms" rule.
**Actual:** 2 of 3 first-attempt runs independently wrote hedged variants (`RETIRE-candidate (unconfirmed)`, `KEEP (note)`) and reused Evidence-vocabulary words (`NOT_APPLICABLE`, `INACCESSIBLE`) directly as Dispositions — the skill forbade synonyms but never forbade suffixed/qualified variants or cross-vocabulary reuse. Fixed with an explicit anti-pattern line in `.claude/skills/joycraft-optimize/SKILL.md`; 3/3 clean on re-run.
