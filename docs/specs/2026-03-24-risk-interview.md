# Risk Interview in /joycraft-tune — Atomic Spec

> **Parent:** docs/research/contextual-stewardship-evals.md (Phase 2)
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1 session / 3 files / ~150 lines

---

## What

Add a 3-5 question "Risk Interview" to `/joycraft-tune` that captures what's dangerous in the project and generates enforceable artifacts (deny rules, hooks, context docs).

## Why

The Remote Labor Index shows agents fail 97.5% of real-world tasks — the gap is context, not capability. The Alexi story (1.9M rows deleted) happened because the agent didn't know it was in production. A short interview captures the critical context and encodes it into machine-enforceable guardrails.

## Acceptance Criteria

- [ ] `/joycraft-tune` asks 3-5 targeted questions after initial assessment
- [ ] Question 1: "What could this agent break that would ruin your day?"
- [ ] Question 2: "What external services are production vs. staging?"
- [ ] Question 3: "What are the unwritten rules a new developer would need months to learn?"
- [ ] Question 4: "What happened last time something went wrong?" (optional, skip if user says nothing)
- [ ] Question 5: "How autonomous should this agent be in risky areas?" (ties to git autonomy)
- [ ] Answers generate: additions to CLAUDE.md NEVER section, deny rules for settings.json, context docs
- [ ] Creates `docs/context/production-map.md` from Q2 answers
- [ ] Creates `docs/context/dangerous-assumptions.md` from Q1+Q3 answers
- [ ] Interview is SKIPPED on re-runs if context docs already exist (offer to update)
- [ ] This is the ONLY interview section — total questions asked during /tune: git autonomy (1) + risk (3-5) = max 6

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-tune.md` | Add Risk Interview as Step 2.5 |
| Create | `src/templates/context/production-map.md` | Template |
| Create | `src/templates/context/dangerous-assumptions.md` | Template |

## Approach

The Risk Interview is a skill instruction (markdown), not TypeScript code. It tells Claude to ask the questions, then use the answers to:
1. Add specific NEVER rules to CLAUDE.md (e.g., "NEVER connect to production DB `postgres://prod.example.com`")
2. Generate deny rules for settings.json (e.g., deny `Bash(*prod.example.com*)`)
3. Create context docs with the institutional knowledge

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User says "nothing is dangerous" | Skip, note that risk interview was declined |
| Context docs already exist | Ask "want to update?" — don't overwrite |
| User gives very detailed answers | Summarize into actionable rules, not dump everything |
| Project is a toy/learning project | Generate minimal deny rules, note low risk |
