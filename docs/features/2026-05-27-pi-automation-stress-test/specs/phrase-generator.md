# Phrase Generator — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~25 lines

---

## What

A `generateStartupIdea(): string` function that returns a random absurd startup pitch in the format: "It's like {X} but for {Y} using {Z}!"

## Why

Fun capstone spec — tests string templating with random selection.

## Acceptance Criteria

- [ ] Returns a string matching the format pattern
- [ ] X is from a list of at least 5 tech products
- [ ] Y is from a list of at least 5 unexpected audiences
- [ ] Z is from a list of at least 5 buzzwords
- [ ] Multiple calls can produce different outputs
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Format match | matches `/It's like .+ but for .+ using .+!/` | unit |
| Valid X | first slot contains known product | unit |
| Valid Y | second slot contains known audience | unit |
| Valid Z | third slot contains known buzzword | unit |
| Variation | 20 calls produce at least 2 unique outputs | unit |

**Execution order:** Red → green

**Smoke test:** Format regex match

## Constraints

- MUST: Use these pools (add your own flair):
  - Products: "Uber", "Netflix", "Spotify", "Airbnb", "Slack"
  - Audiences: "dogs", "plants", "ghosts", "cheese", "the ocean"
  - Buzzwords: "AI", "blockchain", "quantum", "neural networks", "the cloud"

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/phrase-generator.ts` | Function + word pools |
| Create | `src/arcade/phrase-generator.test.ts` | Tests |

## Approach

Pick random element from each array. Template string interpolate.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Determinism | Each call is independent random |
