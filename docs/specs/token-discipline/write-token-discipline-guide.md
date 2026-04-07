# Write Token Discipline Guide — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-token-discipline.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 2 files / ~80 lines
> **Depends on:** Specs 1 (add-clear-nudges), 2 (build-optimize-skill)

---

## What

Create a `docs/guides/token-discipline.md` guide explaining Joycraft's token discipline philosophy and practical advice. Add a section to the README that links to this guide.

## Why

Users need to understand WHY Joycraft nudges them to clear context and what the optimize skill is checking. Without documentation, the nudges feel arbitrary and the diagnostic output lacks context. The guide also positions Joycraft relative to Nate B Jones's complementary work.

## Acceptance Criteria

- [ ] `docs/guides/token-discipline.md` exists
- [ ] Guide explains why `/clear` > `/compact` in Joycraft's workflow
- [ ] Guide explains the difference between skills (lazy-loaded, zero boot cost) and plugins/hooks/MCP (potentially always-loaded)
- [ ] Guide documents what `/joycraft-optimize` checks and what the 200-line threshold means
- [ ] Guide links to Nate B Jones's resources: token optimization article, OB1 repo (Heavy File Ingestion skill, stupid button prompt kit)
- [ ] Guide covers both Claude Code and Codex (platform parity)
- [ ] README has a new section linking to the guide
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Guide file exists | Check file at expected path | manual |
| All required topics covered | Read guide, verify each topic | manual |
| README links to guide | Grep README for guide path | manual |
| External links are valid | Check URLs resolve | manual |
| Build passes | `pnpm build` | build |
| No regressions | `pnpm test --run` | unit |

**Execution order:**
1. Create `docs/guides/token-discipline.md`
2. Add README section linking to it
3. Run build and tests

**Smoke test:** `pnpm build && pnpm test --run`

## Constraints

- MUST: Keep the guide concise — under 100 lines
- MUST: Link to external resources, don't reimplement or extensively quote them
- MUST: Cover both Claude Code and Codex
- MUST: Reference `/joycraft-optimize` skill by name
- MUST NOT: Add prescriptive rules — this is educational, not enforcement
- MUST NOT: Include methodology research or assessments (per CLAUDE.md NEVER rules)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `docs/guides/token-discipline.md` | New guide file |
| Edit | `README.md` | Add section linking to guide |

## Approach

The guide follows this structure:

1. **Why token discipline matters** — brief context on cost-per-turn compounding
2. **Joycraft's advantage** — every workflow step produces a file artifact, so context is disposable
3. **`/clear` vs `/compact`** — why clearing is better than compacting in artifact-producing workflows
4. **Skills vs plugins vs hooks** — what loads at boot (costs tokens) vs what loads on demand (free until invoked)
5. **`/joycraft-optimize`** — what it checks, what the thresholds mean
6. **Further reading** — links to Nate B Jones's work

README section is a short paragraph with a link, placed after the existing feature descriptions.

**Rejected alternative:** Putting all this content directly in the README. The README is already long enough — a separate guide keeps it focused while providing depth for users who want it.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/guides/` doesn't exist | Create it |
| External links change or break | Links are references, not dependencies — guide still makes sense without them |
| User reads guide without having run `joycraft init` | Guide should still be understandable — it's educational |
