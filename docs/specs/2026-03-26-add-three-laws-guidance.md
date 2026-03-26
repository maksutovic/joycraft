# Add Three Laws of Test Harnesses Guidance — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-test-first-new-feature.md`
> **Status:** Complete
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 1-2 files / ~20 lines

---

## What

Embed Praful's three laws of test harnesses as explicit guidance in the spec template and decompose skill. These laws prevent the three most common ways agents game or break test setups: writing trivially passing tests, testing against the wrong thing, and having feedback loops too slow for iteration.

## Why

Without these guardrails, agents write tests that pass by testing the library instead of the function, or they create test suites that take 14 minutes to give feedback, making iteration impossible. These three laws are hard-won lessons from real autonomous development.

## Acceptance Criteria

- [ ] The spec template's Test Plan section includes a "Test Harness Rules" or similar subsection with the three laws
- [ ] Law 1: "Tests must fail first" — agent must write tests, run them, and confirm they fail before implementing
- [ ] Law 2: "Tests must run against your actual function" — not a reimplementation, mock, or the wrapped library
- [ ] Law 3: "Tests must detect individual changes" — identify a smoke test that runs in seconds, not minutes
- [ ] The decompose skill references the three laws when generating specs
- [ ] Language is instructive, not preachy — tells the agent what to do, not why testing philosophy matters
- [ ] Build passes
- [ ] Tests pass

## Constraints

- MUST: Keep the three laws concise — 1-2 sentences each, actionable
- MUST: Place them where the agent will see them during execution (in the spec itself, not just the template comments)
- MUST NOT: Add lengthy philosophy about testing — just the rules and what to do
- DEPENDS ON: Spec 2 (add-test-plan-to-spec-template) — the Test Plan section must exist first

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/examples/example-spec.md` | Add three laws as guidance within the Test Plan section |
| Modify | `src/skills/joycraft-decompose.md` | Reference the three laws in spec generation instructions |

## Approach

Add a short block inside the Test Plan section of the spec template:

```markdown
**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change
```

In the decompose skill, add to the spec generation instructions: "Include the test harness verification rules in every Test Plan."

**Rejected alternative:** Making this a separate document or CLAUDE.md section. The guidance needs to be in the spec itself because execution happens in a fresh session that may not read other files.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| All tests pass on first run | Agent should flag this — it likely means tests aren't testing the right thing |
| No fast smoke test is possible (e.g., hardware tests) | Agent notes the limitation and suggests the fastest available option |
| User already has a working test harness | Laws still appear in the spec as a verification checklist — quick to scan, no harm |
