# Add Test Plan Section to Spec Template — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-26-test-first-new-feature.md`
> **Status:** Ready
> **Date:** 2026-03-26
> **Estimated scope:** 1 session / 2-3 files / ~40 lines

---

## What

Add a mandatory "Test Plan" section to the atomic spec template and update the decompose skill so every generated spec includes tests mapped 1:1 to acceptance criteria. The test plan specifies what tests to write, what they test against, and the execution order (write failing tests first, verify they fail, then implement).

## Why

Specs without test plans produce acceptance criteria that nobody verifies programmatically. The agent implements the feature, claims it works, and the user has to manually check. Every acceptance criterion needs at least one executable test — that's the contract.

## Acceptance Criteria

- [ ] `src/templates/examples/example-spec.md` includes a "Test Plan" section after "Acceptance Criteria"
- [ ] The Test Plan section maps each acceptance criterion to at least one test
- [ ] The Test Plan includes a "Test Execution Order" subsection: (1) write failing tests, (2) verify they fail, (3) implement until green
- [ ] The Test Plan includes a "Smoke Test" entry identifying which test(s) are fast enough for iteration
- [ ] The decompose skill (`src/skills/joycraft-decompose.md`) spec template includes the Test Plan section
- [ ] The decompose skill instructions mention that every acceptance criterion must have a corresponding test
- [ ] Build passes
- [ ] Tests pass

## Constraints

- MUST: Test plan is always present — never optional, even for simple specs (can be minimal but not absent)
- MUST: 1 acceptance criterion = 1+ tests (this is the floor)
- MUST: Include execution order guidance (red tests first, then green)
- MUST NOT: Prescribe a specific test framework — use generic language ("write a test that..." not "add a vitest case that...")
- MUST NOT: Change the structure of existing sections — only add the new Test Plan section

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/examples/example-spec.md` | Add "Test Plan" section with example test mappings |
| Modify | `src/skills/joycraft-decompose.md` | Add Test Plan to the spec generation template; add instruction that every AC gets a test |
| Modify | `src/bundled-files.ts` | Update if the template content is inlined here |

## Approach

Add the Test Plan section between "Acceptance Criteria" and "Constraints" in the spec template. Structure:

```markdown
## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| GET returns preferences | Call GET, assert 200 + JSON shape | unit |
| New users get defaults | Call GET for new user, assert default values | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** [identify which test is fastest for iteration feedback]
```

In the decompose skill, add a bullet under the spec generation instructions: "Every acceptance criterion must have at least one corresponding test in the Test Plan. If the user provided test strategy info from the interview, use it to choose test types and frameworks."

**Rejected alternative:** Making the Test Plan a separate document. This would break the self-contained nature of atomic specs — everything an agent needs to execute should be in one file.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Spec has only 1 acceptance criterion | Test Plan has 1 row — still present |
| Acceptance criterion is "Build passes" | No separate test needed — this is verified by the build step itself, note as such |
| User's project has no test framework | Test Plan still describes what to test; the first step in execution is setting up the framework |
