# Test-First New Feature Flow — Draft Brief

> **Date:** 2026-03-26
> **Status:** Decomposed
> **Origin:** /joycraft-interview session (conversation with Praful Mathur, cofounder)

---

## The Idea

During `/joycraft-new-feature`, the interview and resulting specs should include a test plan that gets executed *before* any implementation code is written. Praful spent 6-7 hours setting up test harnesses after starting implementation, leading to regressions, wasted time, and agents gaming tests. The fix: make test setup a first-class part of the feature workflow, not an afterthought.

## Problem

Today, `/joycraft-new-feature` produces specs that describe *what* to build and acceptance criteria, but don't prescribe *how to test* or *when to set up tests*. This means:

- Agents write tests that pass trivially (testing the library, not the function)
- Tests run too slowly for iteration (14-minute feedback loops kill productivity)
- No test execution strategy (when to run smoke vs. full suite)
- Agents go rogue when tests aren't constraining their behavior

## What "Done" Looks Like

1. `/joycraft-new-feature` interview includes test-focused questions:
   - What test types does your project use? (smoke, unit, integration, e2e, hardware, etc.)
   - What's your test execution strategy? (file change → X, commit → Y, push → Z)
   - How fast do your tests need to be for iteration? (smoke test budget)
   - Any special test infrastructure? (devices, channels, serial connections, etc.)

2. Generated specs include a "Test Plan" section with:
   - Failing tests to write first (with what they test against)
   - Smoke test strategy for fast iteration
   - Full suite strategy for commit/push gates
   - What's off-limits during execution (no log reading, no network calls, etc.)

3. The execution session follows a strict order:
   - Write failing tests first
   - Verify tests fail against stubbed/current code
   - Lock down tests (mark as read-only or add to NEVER-edit list)
   - Then implement until tests pass

## Praful's Three Laws of Test Harnesses

These should be baked into the guidance:

1. **Tests must actually fail first.** If your test harness doesn't have failing tests, the agent will write tests that pass trivially (e.g., using the regex library directly instead of testing your regex function). You need a suite of red tests before any green.

2. **Tests must run against your actual function.** Not a reimplementation, not a mock, not the library the function wraps. The test calls your code.

3. **Tests must detect individual changes.** You need fast smoke tests so you know if a single code change helped or hurt. If your only feedback loop is 14 minutes, you'll waste hours going the wrong direction. Smoke tests should run in seconds.

## Lockdown Mode

After tests are in place, the execution session should be constrained:
- **Allowed:** Write code, run smoke tests, run test harness, run full suite
- **Denied:** Everything else — no downloading packages, no pinging addresses, no reading logs directly, no flashing firmware, no running simulators

Logs should only surface through test assertions, not through direct agent access. As soon as the agent can read logs, it starts doing creative (destructive) things with the information.

## Constraints

- Must work within existing Joycraft skill system (markdown skills, CLAUDE.md boundaries)
- Can't assume any specific test framework — needs to work with pytest, vitest, playwright, hardware test rigs, etc.
- Test execution strategy varies wildly by project — hardware projects have channel tests over serial, web projects have browser tests, etc.

## Decisions

1. **Test prescriptiveness is user-driven.** Most developers don't write tests or know how to write good ones — they'll rely on Claude to be the expert. Experienced devs will want more control or will write tests themselves. The interview should gauge this and adapt. Not "here's your test plan" but "how involved do you want to be in test design?"

2. **Pre-commit/pre-push hooks require explicit user approval.** Many developers (including the Joycraft creator) hate pre-commit hooks. Joycraft should suggest test execution strategies but never auto-install hooks. Always ask, never assume.

3. **This is strictly for in-repo tests.** No interaction with Level 5 holdout scenarios. Holdout tests are external and invisible to the implementation agent. This brief is about the local development loop only.

4. **Lockdown mode is optional, not default.** Many devs working on smaller/less complex tasks don't need lockdown. It's most valuable for complex tech stacks or specific workflows (hardware, firmware, multi-device). Implementation: either a separate skill (`/joycraft-lockdown`) or an optional question during the `/joycraft-new-feature` interview ("Do you want to constrain the execution agent to code + tests only?"). Not forced on anyone.

## Additional Decisions

5. **Gauge test expertise with a direct question.** Don't try to infer from project structure — just ask. "How comfortable are you with writing tests?" or "Do you have an existing test setup?" Simple, respectful, no guessing.

6. **Test plan section is always present in specs.** This is ideological and intentional: good tests are the mechanism to autonomy. If Claude implements 9 atomic specs but they all fail and the user has to vibe code the fixes, we haven't fixed their development process — they might as well not use Joycraft. The interview should frame this not as a burden but as the unlock: "Tests are how your agent knows it succeeded and how you trust the output. Let's spend a few minutes figuring out what good tests look like for this feature." The test plan can be minimal for simple features, but it's never absent.

7. **Every acceptance criterion gets at least one test.** Specs already have acceptance criteria — the tests are just the executable version of those criteria. This is the floor: 1 criterion = 1+ tests. Not extra work, just making the spec enforceable. The agent writes the tests, the human reviews them, and then they become the contract for implementation.

## Open Questions

(None remaining — ready for decompose)

## Out of Scope (for now)

- Multi-agent orchestration (separate brainstorm)
- Unsupervised test generation — the agent decides *what* to test with no human input (we want the human to define what matters through the interview; the agent writes the test code)
- CI/CD integration (this is about the local development loop)

## Raw Notes

- Praful's agent downloaded OpenMD SDK, pinged random IP addresses, tried to flash firmware, and cleared out test files — all because it wasn't constrained to just writing code and running tests
- The agent will fill context with log output if allowed to read logs — logs should only feed into tests
- Don't let the agent see IP addresses, WiFi names, or device identifiers — it'll start making creative (wrong) use of them
- "Once you get the test framework done, change the settings. All tests are off limits from editing. Lock it down to just writing code."
