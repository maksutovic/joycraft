# Contextual Stewardship Documents — Atomic Spec

> **Parent:** docs/research/contextual-stewardship-evals.md (Phase 3)
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1 session / 6 files / ~150 lines

---

## What

Add a `docs/context/` directory with four living documents that capture the institutional knowledge AI agents need but can't derive from code.

## Why

The memory wall: agents are measured in hours, humans in years. The Harvard study shows seniors survive AI adoption because they hold context. These documents encode that context into files the agent can read, closing the gap between "can do a task" and "can do a job."

Nate B Jones: "The decision context is the raw material that makes agents effective. Its absence is also what makes them dangerous."

## Acceptance Criteria

- [ ] `npx joycraft init` creates `docs/context/` directory
- [ ] Copies four template files:
  - `production-map.md` — what's real, what's staging, what's sensitive
  - `dangerous-assumptions.md` — things the agent might assume wrong
  - `decision-log.md` — why choices were made, what was rejected
  - `institutional-knowledge.md` — unwritten rules, org context
- [ ] Templates have clear structure with examples, not empty placeholders
- [ ] `/joycraft-tune` risk interview populates production-map and dangerous-assumptions
- [ ] `/joycraft-session-end` prompts: "Update docs/context/ if you learned something about what's dangerous or assumed wrong"
- [ ] CLAUDE.md generated section references `docs/context/` ("Read docs/context/ before making infrastructure or config changes")
- [ ] Assessment Dimension 6 (Knowledge Capture) updated to score context docs
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/context/production-map.md` | Template |
| Create | `src/templates/context/dangerous-assumptions.md` | Template |
| Create | `src/templates/context/decision-log.md` | Template |
| Create | `src/templates/context/institutional-knowledge.md` | Template |
| Modify | `src/init.ts` | Create docs/context/, copy templates |
| Modify | `src/skills/joycraft-session-end.md` | Add context doc update prompt |
| Modify | `src/skills/joycraft-tune.md` | Score context docs in Knowledge Capture |
| Modify | `src/improve-claude-md.ts` | Reference docs/context/ in generated CLAUDE.md |
| Modify | `src/bundled-files.ts` | Include context templates |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| docs/context/ already exists with user content | Skip (don't overwrite) |
| User runs init --force | Overwrite templates but warn about context docs |
| Project has no production systems | production-map.md still created with "N/A" examples |
