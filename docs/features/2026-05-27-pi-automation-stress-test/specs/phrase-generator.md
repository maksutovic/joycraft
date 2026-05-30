# Phrase Generator — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file / ~20 lines

---

## What
Implement a function `generateStartupIdea(): string` that returns a random absurd startup idea in the format: `"It's like {X} for {Y}!"` where X and Y are randomly chosen from predefined word lists.

## Why
Without this, no humor-based arcade modules can exist.

## Acceptance Criteria
- [ ] Returns a string in the exact format `"It's like {X} for {Y}!"`
- [ ] X comes from a list of at least 10 tech/product analogies
- [ ] Y comes from a list of at least 10 unexpected markets/audiences
- [ ] Over many calls, different combinations appear
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Correct format | Assert result matches `/^It's like .+ for .+!$/` | unit |
| X from known list | Extract X; assert it is in the analogy list | unit |
| Y from known list | Extract Y; assert it is in the market list | unit |
| Variety | Run 50 times; assert at least 2 distinct results | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `generateStartupIdea()` matches the expected format (runs in milliseconds)

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: Use `Math.random()` to pick from both word lists independently
- MUST: Include at least 10 items in each list
- MUST: Function exported from `src/arcade/phrase-generator.ts`
- MUST NOT: Touch any production code outside `src/arcade/`
- MUST NOT: Break existing tests

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/phrase-generator.ts` | New implementation |
| Create | `src/arcade/phrase-generator.test.ts` | New tests |

## Approach
Define two const arrays (`analogies` and `markets`). Pick one from each with `Math.floor(Math.random() * arr.length)`, interpolate into template string. Rejected alternative: single combined array of full phrases — less variety with the same number of items.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `Math.random()` returns 0 | Picks first item from each list |
| `Math.random()` returns 0.999... | Picks last item from each list |
