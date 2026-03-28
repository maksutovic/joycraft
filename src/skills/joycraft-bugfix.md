---
name: joycraft-bugfix
description: Structured bug fix workflow — triage, diagnose, discuss with user, write a focused spec, hand off for implementation
---

# Bug Fix Workflow

You are fixing a bug. Follow this process in order. Do not skip steps.

**Guard clause:** If the user's request is clearly a new feature — not a bug, error, or unexpected behavior — say:
"This sounds like a new feature rather than a bug fix. Try `/joycraft-new-feature` for a guided feature workflow."
Then stop.

---

## Phase 1: Triage

Establish what's broken. Your goal is to reproduce the bug or at minimum understand the symptom clearly.

**Ask / gather:**
- What is the symptom? (error message, unexpected behavior, crash, wrong output)
- What are the steps to reproduce?
- What is the expected behavior vs. actual behavior?
- When did it start? (recent change, always been this way, intermittent)
- Any relevant logs, screenshots, or error output?

**Actions:**
- If the user provides an error message or stack trace, read the referenced files immediately
- If steps to reproduce are provided, try to reproduce the bug (run the failing command, test, or request)
- If the bug is intermittent or hard to reproduce, gather more context: environment, OS, versions, config

**Done when:** You can describe the symptom in one sentence and have either reproduced it or have enough context to diagnose without reproduction.

---

## Phase 2: Diagnose

Find the root cause. Read code, trace the execution path, identify what's wrong and why.

**Actions:**
- Start from the error site (stack trace, failing test, broken UI) and trace backward
- Read the relevant source files — don't guess based on file names alone
- Identify the specific line(s), condition, or logic error causing the bug
- Check git blame or recent commits if the bug was introduced by a recent change
- Look for related bugs — is this a symptom of a deeper issue?

**Done when:** You can explain the root cause in 2-3 sentences: what's wrong, why it's wrong, and where in the code it happens.

---

## Phase 3: Discuss

Present your findings to the user. Do NOT start writing code or a spec yet.

**Present:**
1. **Symptom:** What the user sees (confirm your understanding matches theirs)
2. **Root cause:** What's actually wrong in the code and why
3. **Proposed fix:** What you think the fix is — be specific (which files, what changes)
4. **Risk assessment:** What could go wrong with this fix? Any side effects?
5. **Scope check:** Is this a simple fix or does it touch multiple systems?

**Ask:**
- "Does this match what you're seeing?"
- "Are you comfortable with this approach, or do you want to explore alternatives?"
- If the fix is large or risky: "Should we decompose this into smaller specs?"

**Done when:** The user agrees with the diagnosis and proposed fix direction.

---

## Phase 4: Spec the Fix

Write a bug fix spec to `docs/specs/YYYY-MM-DD-bugfix-name.md`. Create the `docs/specs/` directory if it doesn't exist.

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
Bug fix spec is ready: docs/specs/YYYY-MM-DD-bugfix-name.md

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
