# Eight Ball — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-27-pi-automation-stress-test/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 2 files / ~30 lines

---

## What

A `shakeEightBall(): string` function that returns one of 20 classic Magic 8-Ball responses.

## Why

Tests the harness can handle specs with lookup tables / data arrays.

## Acceptance Criteria

- [ ] Returns a string from the canonical 20 responses
- [ ] Over many calls, distribution includes multiple different responses
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid response | returned string is in canonical list | unit |
| Randomness | 50 calls produce at least 3 unique responses | unit |

**Execution order:** Write tests → fail → implement → green

**Smoke test:** Single call returns valid response

## Constraints

- MUST: Use exactly these 20 responses (classic Magic 8-Ball):
  "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/arcade/eight-ball.ts` | Function + response array |
| Create | `src/arcade/eight-ball.test.ts` | Tests |

## Approach

Store responses in a readonly array. Pick with `Math.floor(Math.random() * 20)`.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Repeated calls | Independent random selection each time |
