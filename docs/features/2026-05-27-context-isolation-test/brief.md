# Context Isolation Test — Feature Brief

> **Date:** 2026-05-27
> **Project:** joycraft
> **Status:** Specs Ready
> **Purpose:** Determine whether `/joycraft-next-spec` clears conversation context between specs

---

## Vision

The pi automation pipeline is supposed to start a **fresh session** for each spec. But we don't actually know if that's happening. This feature is a controlled experiment: two tiny specs where Spec A embeds a secret, and Spec B must recall it from memory (without reading files). If Spec B knows the secret, context leaked.

## User Stories

- As a pi developer, I want to know whether my automation loop isolates sessions so I can trust it for real features
- As a harness maintainer, I want a reproducible test for context isolation that anyone can run

## Hard Constraints

- MUST: Spec B must NOT read files from Spec A
- MUST: Spec B's test must assert the secret was recalled correctly
- MUST: Both specs use the real `/joycraft-next-spec` pipeline

## Out of Scope

- NOT: Fixing the pipeline (that's a separate feature)
- NOT: Any production code changes

## Test Strategy

- **Pass:** Spec B returns `"KIWI"` from memory → context leaked (pipeline NOT isolating)
- **Fail:** Spec B returns wrong/unknown → context cleared (pipeline IS isolating)
- Either outcome is valid data — the test is about *learning*, not passing

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | secret-embed | Return a hard-coded secret string | None | XS |
| 2 | secret-recall | Return the secret from memory (no file reads) | secret-embed | XS |

## Execution Strategy

- [x] Sequential (spec 2 depends on spec 1)

## Success Criteria

- [ ] Both specs execute through the real pipeline
- [ ] Outcome is recorded (context leaked vs. cleared)
