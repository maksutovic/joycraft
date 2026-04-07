---
name: joycraft-bugfix
description: Structured bug fix workflow — triage, diagnose, discuss with user, write a focused spec, hand off for implementation
---

# Bug Fix Workflow

You are fixing a bug. Follow this process in order. Do not skip steps.

**Guard clause:** If this is clearly a new feature, redirect to `$joycraft-new-feature` and stop.

---

## Phase 1: Triage

Establish what's broken. Gather: symptom, steps to reproduce, expected vs actual behavior, when it started, relevant logs/errors. If an error message or stack trace is provided, read the referenced files immediately. Try to reproduce if steps are given.

**Done when:** You can describe the symptom in one sentence.

---

## Phase 2: Diagnose

Find the root cause. Start from the error site and trace backward. Search the codebase and read files — don't guess. Identify the specific line(s) and logic error. Check git blame if it's a recent regression.

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

Use this structure:

```markdown
# [Bug Name] — Bug Fix Spec

> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## Bug
One sentence — what's broken?

## Root Cause
What's actually wrong, in which file(s) and line(s)?

## Fix
What changes, where?

## Acceptance Criteria
- [ ] [Observable behavior that proves the fix works]
- [ ] No regressions — existing tests still pass
- [ ] Build passes

## Test Plan
1. Write a reproduction test that fails before the fix
2. Apply the fix
3. Reproduction test passes
4. Full test suite passes

## Constraints
- MUST: [hard requirement]
- MUST NOT: [hard prohibition]

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
```

**For large bugs that span multiple files/systems:** Consider whether this should be decomposed into multiple specs. If so, create a brief first using `$joycraft-new-feature`, then decompose.

---

## Phase 5: Hand Off

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
5. Run $joycraft-session-end to capture discoveries
6. Commit and PR

Ready to start?
```
