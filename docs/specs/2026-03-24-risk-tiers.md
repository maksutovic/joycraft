# Risk-Tiered Enforcement Model — Atomic Spec

> **Parent:** docs/research/contextual-stewardship-evals.md (Phase 4)
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1-2 sessions / 4 files / ~200 lines

---

## What

Classify all behavioral boundaries into four enforcement tiers and use the appropriate enforcement mechanism for each. Score enforcement strength in `/joycraft-tune`.

## Why

A single NEVER rule in CLAUDE.md has the same enforcement as an ALWAYS rule: none. The agent reads both and decides whether to follow them. Risk-tiering maps rules to enforcement mechanisms proportional to their danger.

## Acceptance Criteria

- [ ] Four tiers defined:
  - **Tier 1 (Advisory):** CLAUDE.md only — code style, patterns, preferences
  - **Tier 2 (Prompted):** settings.json `ask` rules — deps, config, push
  - **Tier 3 (Blocked):** settings.json `deny` rules — network, secrets, force-push
  - **Tier 4 (Hard-blocked):** PreToolUse hooks (exit 2) — production, destructive, infra
- [ ] `/joycraft-tune` classifies existing boundaries into tiers
- [ ] `/joycraft-tune` recommends upgrading high-risk advisory rules to enforced tiers
- [ ] Assessment now scores: "X of Y high-risk boundaries are enforced (hooks or deny)"
- [ ] CLAUDE.md generated sections annotate enforcement level: `### NEVER (enforced via hooks)` vs `### ALWAYS (advisory)`
- [ ] A `RISK_TIERS.md` template explains the system for users
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/risk-tiers.ts` | Classification logic: boundary → tier |
| Create | `src/templates/RISK_TIERS.md` | Explanation template |
| Modify | `src/skills/joycraft-tune.md` | Score enforcement, recommend tier upgrades |
| Modify | `src/improve-claude-md.ts` | Annotate enforcement level in generated sections |

## Approach

The risk classifier takes a boundary rule (string) and project context (StackInfo + risk interview answers) and returns a recommended tier. Rules mentioning production, secrets, force-push, delete, drop → Tier 3-4. Rules mentioning style, format, patterns → Tier 1. Rules mentioning deps, config, schema → Tier 2.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User has custom NEVER rules | Classify them based on keywords, offer to enforce |
| All rules are Tier 1 (advisory only) | Flag as risk: "No enforced boundaries — high risk" |
| User declines tier upgrades | Respect choice, note in assessment |
