---
name: joycraft-bugfix
description: Structured bug fix workflow — triage, diagnose, discuss with user, write a focused spec, hand off for implementation
instructions: 32
---

# Bug Fix Workflow

You are fixing a bug. Follow this process in order. Do not skip steps.

**Guard clause:** If this is clearly a new feature, redirect to `/joycraft-new-feature` and stop.

---

## Phase 1: Triage

Establish what's broken. Gather: symptom, steps to reproduce, expected vs actual behavior, when it started, relevant logs/errors. If an error message or stack trace is provided, read the referenced files immediately. Try to reproduce if steps are given.

**Done when:** You can describe the symptom in one sentence.

---

## Phase 2: Diagnose

Find the root cause. Start from the error site and trace backward. Read source files — don't guess. Identify the specific line(s) and logic error. Check git blame if it's a recent regression.

**Done when:** You can explain what's wrong, why, and where in 2-3 sentences.

---

## Phase 3: Discuss

Present findings to the user BEFORE writing any code or spec:
1. **Symptom** — confirm it matches what they see
2. **Root cause** — specific file(s) and line(s)
3. **Proposed fix** — what changes, where
4. **Risk** — side effects? scope?

Ask: "Does this match? Comfortable with this approach?" If large/risky, suggest decomposing into multiple specs.

**Done when:** User agrees with the diagnosis and fix direction.

---

## Phase 4: Spec the Fix

Write a bug fix spec to `docs/specs/<feature-or-area>/bugfix-name.md`. Use the relevant feature name or area as the subdirectory (e.g., `auth`, `cli`, `parser`). Create the `docs/specs/<feature-or-area>/` directory if it doesn't exist.

**Why:** Even bug fixes deserve a spec. It forces clarity on what "fixed" means, ensures test-first discipline, and creates a traceable record of the fix.

Use this template:

```markdown
# Fix [Bug Description] — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** [error message, issue link, or symptom description]
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## Bug

What is broken? Describe the symptom the user experiences.

## Root Cause

What is wrong in the code and why? Name the specific file(s) and line(s).

## Fix

What changes will fix this? Be specific — describe the code change, not just "fix the bug."

## Acceptance Criteria

- [ ] [The bug no longer occurs — describe the correct behavior]
- [ ] [No regressions in related functionality]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| [Bug no longer occurs] | [Test that reproduces the bug, then verifies the fix] | [unit/integration/e2e] |
| [No regressions] | [Existing tests still pass, or new regression test] | [unit/integration] |

**Execution order:**
1. Write a test that reproduces the bug — it should FAIL (red)
2. Run the test to confirm it fails
3. Apply the fix
4. Run the test to confirm it passes (green)
5. Run the full test suite to check for regressions

**Smoke test:** [The bug reproduction test — fastest way to verify the fix works]

**Before implementing, verify your test harness:**
1. Run the reproduction test — it must FAIL (if it passes, you're not testing the actual bug)
2. The test must exercise your actual code — not a reimplementation or mock
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: [any hard requirements for the fix]
- MUST NOT: [any prohibitions — e.g., don't change the public API]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
```

**For trivial bugs:** The spec will be short. That's fine — the structure is the point, not the length.

**For large bugs that span multiple files/systems:** Consider whether this should be decomposed into multiple specs. If so, create a brief first using `/joycraft-new-feature`, then decompose. A bug fix spec should be implementable in a single session.

---

## Phase 5: Hand Off

Tell the user:

```
Bug fix spec is ready: docs/specs/<feature-or-area>/bugfix-name.md

Summary:
- Bug: [one sentence]
- Root cause: [one sentence]
- Fix: [one sentence]
- Estimated: 1 session

To execute: Start a fresh session and:
1. Read the spec
2. Write the reproduction test (must fail)
3. Apply the fix (test must pass)
4. Run full test suite
5. Run /joycraft-session-end to capture discoveries
6. Commit and PR

Ready to start?
```

**Why:** A fresh session for implementation produces better results. This diagnostic session has context noise from exploration — a clean session with just the spec is more focused.
