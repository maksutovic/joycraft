---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-20-decision-dossier
---

# Discoveries — gate defer path stamped files silently

**Date:** 2026-07-20
**Spec:** docs/features/2026-07-20-decision-dossier/specs/wire-routing-and-gate.md

## Spec ACs mandated refusal messages but no defer confirmation

**Expected:** The decompose decision gate's explicit-defer branch ("backlog it") would naturally tell the user what it did.
**Actual:** In a fresh-context trial the agent followed the skill exactly: it set the decision to `backlogged`, wrote the `docs/backlog/` entry, re-evaluated the gate — and said nothing, because the spec's acceptance criteria only scripted the two refusal messages. Correct per spec, silent in practice.
**Impact:** Fixed in `.claude/skills/joycraft-decompose/SKILL.md` Step 1.5 (defer now confirms in one line what was backlogged and where — visible residue). Pattern for future specs: any branch that mutates files on a conversational shortcut ("backlog it") needs its user-facing confirmation specified in the ACs, or agents will do it silently.
