# Add Scenario-Based Quick Start — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
> **Status:** Ready
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 1 file / ~30 lines added

---

## What

Add a scenario-based "When you have X, use Y" table to the README's quick start area, after the skill list. This maps common developer situations to the right Joycraft skill, solving the "magic words" problem where users don't know which skill name to invoke.

## Why

New users don't know the vocabulary that triggers skill matching. They don't know "decompose" is a thing. A scenario table teaches them the mapping between their situation and the right skill — it's both a README improvement and a way to teach the vocabulary for natural language invocation.

## Acceptance Criteria

- [ ] README contains a scenario table mapping situations to skills
- [ ] Table covers at least these scenarios: brainstorming an idea, starting a new feature, understanding existing code before building, aligning on approach before coding, breaking a feature into tasks, fixing a bug, running autonomously, verifying implementation
- [ ] Each row has: situation description, recommended skill, one-line explanation
- [ ] Table uses natural language for situations (not jargon)
- [ ] Table is positioned after the skill list and before the workflow diagram
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Scenario table exists | Read README, verify table with situation→skill mapping present | manual review |
| Covers required scenarios | Count rows — at least 8 scenarios covered | manual review |
| Natural language | Read situation descriptions — no jargon like "decompose" or "atomic spec" in the situation column | manual review |
| Position correct | Verify table appears after skill list, before workflow diagram | manual review |
| Build passes | `pnpm build` succeeds | integration |

**Smoke test:** `pnpm build`

## Constraints

- MUST: Use natural language in situation descriptions (the user column)
- MUST: Reference exact skill names in the skill column (e.g., `/joycraft-interview`)
- MUST: Fit within the ~150-line README target (this spec adds ~30 lines)
- MUST NOT: Duplicate information already in the skill list above

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `README.md` | Add scenario table after skill list section |

## Approach

Create a markdown table with three columns: "You want to..." | "Use" | "What it does". Write each situation in first person, natural language that a developer would actually think. For example:

| You want to... | Use | What happens |
|---|---|---|
| Brainstorm an idea before committing to building it | `/joycraft-interview` | Free-form conversation → structured draft brief |
| Build a new feature from scratch | `/joycraft-new-feature` | Guided interview → Feature Brief → Atomic Specs |
| Understand existing code before building on it | `/joycraft-research` | Objective codebase research — facts, no opinions |
| ...etc | | |

**Alternative rejected:** A flowchart/decision tree instead of a table. Rejected because tables are scannable in 5 seconds; flowcharts require reading and following paths, which is slower for the "which skill do I use?" question.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User's situation doesn't match any row | The table is illustrative, not exhaustive — the skill list above has all skills |
| Codex users see the README | Table uses `/joycraft-*` format; Codex users know to substitute `$joycraft-*` from the platform support section |
