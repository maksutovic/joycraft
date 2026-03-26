# Add Test Questions to New Feature Interview — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-test-first-new-feature.md`
> **Status:** Ready
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 1 file / ~30 lines

---

## What

Add test-focused questions to the `/joycraft-new-feature` interview flow. After the existing interview questions about the feature itself, the skill should ask about testing: what test types the project uses, how fast tests need to run for iteration, what the test execution strategy is (file change vs. commit vs. push), and whether the user wants lockdown mode. Also ask a direct question about test expertise to calibrate how much guidance the agent should provide.

## Why

Without test questions in the interview, specs get generated with acceptance criteria but no test plan. The agent then either skips tests or writes trivially passing ones, leading to regressions and wasted time.

## Acceptance Criteria

- [ ] `/joycraft-new-feature` interview includes a "Testing" section after the existing feature questions
- [ ] Asks: "Do you have an existing test setup? What framework?" (direct question, not inferred)
- [ ] Asks: "How comfortable are you with writing tests?" to gauge expertise level
- [ ] Asks: "What types of tests does your project use?" (smoke, unit, integration, e2e, hardware, etc.)
- [ ] Asks: "How fast do your tests need to run for iteration?" (smoke test budget)
- [ ] Asks: "Would you like to constrain the execution agent to only write code and run tests?" (lockdown mode — optional, explained as useful for complex stacks)
- [ ] Test answers are captured in the Feature Brief output under a "Test Strategy" section
- [ ] The interview frames testing as the mechanism to autonomy, not as a burden
- [ ] Build passes
- [ ] Tests pass

## Constraints

- MUST: Add questions to the existing interview flow, not replace it
- MUST: Frame testing positively — "Tests are how your agent knows it succeeded" not "You must write tests"
- MUST: Gauge expertise with a direct question, not by inferring from project structure
- MUST NOT: Auto-install pre-commit hooks or assume any specific test framework
- MUST NOT: Make lockdown mode sound like a default — it's optional, presented as valuable for complex stacks

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-new-feature.md` | Add test-focused interview questions after existing Phase 1 questions; add "Test Strategy" section to the Feature Brief template output |

## Approach

Add a new subsection to the Phase 1 interview in `joycraft-new-feature.md` titled "Ask about testing." Place it after the existing "Ask about" list. The questions should flow naturally — not feel like a separate interrogation. The Feature Brief template at the end of Phase 1 should include a "Test Strategy" section that captures the answers.

**Rejected alternative:** Making testing a separate Phase 1.5. This would make the interview feel disjointed. Testing questions should be part of the same conversation flow.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User says "I don't have any tests" | Agent acknowledges and offers to help set up a test strategy as part of the spec |
| User says "I have extensive tests already" | Agent asks about the existing setup and how new tests should integrate |
| User declines lockdown mode | Agent respects the choice, no further prompting about it |
| User doesn't know what test types to use | Agent recommends based on the project stack (detected or described) |
