---
name: joycraft-implement
description: Execute atomic specs with TDD — read spec, write failing tests, implement until green, hand off to session-end
instructions: 28
---

# Implement Atomic Spec

You have one or more atomic spec paths to execute. Your job is to implement each spec using strict TDD — tests first, confirm they fail, then implement until green.

## Step 1: Parse Arguments

The user should provide one or more spec paths (e.g., `docs/specs/my-feature/add-widget.md`).

If no spec path was provided, tell the user:

> No spec path provided. Check `docs/specs/` for available specs, or provide a path like:
> `/joycraft-implement docs/specs/feature-name/spec-name.md`

## Step 2: Read and Understand the Spec

For each spec path:

1. **Read the spec file.** The spec is your execution contract — the Acceptance Criteria and Test Plan define "done."
2. **Check the spec's Status field.** If it says "Complete," warn the user and ask if they want to re-implement or skip.
3. **Read the Acceptance Criteria** — these are your success conditions.
4. **Read the Test Plan** — this tells you exactly what tests to write and in what order.
5. **Read the Constraints** — these are hard boundaries you must not violate.

### Finding Additional Context

Specs are designed to be self-contained, but if you need more context:

- **Parent brief:** Linked in the spec's frontmatter (`> **Parent Brief:**` line). Read it for broader feature context.
- **Related specs:** Live in the same directory. The spec directory convention is `docs/specs/<feature-name>/` where the feature name is derived from the brief filename (strip the date prefix and `.md` — e.g., `2026-04-06-token-discipline.md` → `token-discipline`).
- **Affected Files:** The spec's Affected Files table tells you which files to create or modify.

## Step 3: Execute the TDD Cycle

**This is not optional. Write tests FIRST.**

### 3a. Write Tests (Red Phase)

Using the spec's Test Plan:

1. Write ALL tests listed in the Test Plan. Each Acceptance Criterion must have at least one test.
2. Tests should call the actual function/endpoint — not a reimplementation or mock of the underlying library.
3. Run the tests. **They MUST fail.** If any test passes immediately:
   - Flag it — either the test isn't testing the right thing, or the code already exists.
   - Investigate before proceeding. A test that passes before implementation is a test that proves nothing.

### 3b. Implement (Green Phase)

1. Follow the spec's Approach section for implementation strategy.
2. Implement the minimum code needed to make tests pass.
3. Run tests after each meaningful change — use the spec's Smoke Test for fast feedback.
4. Continue until ALL tests pass.

### 3c. Verify Acceptance Criteria

Walk through every Acceptance Criterion in the spec:

- [ ] Is each one met?
- [ ] Does the build pass?
- [ ] Do all tests pass?

If any criterion is not met, keep implementing. Do not move on until all criteria are green.

## Step 4: Handle Edge Cases

Check the spec's Edge Cases table. For each scenario:

- Verify the expected behavior is handled.
- If the spec says "warn the user" or "prompt," make sure that path works.

## Step 5: Multi-Spec Handling

If the user provided multiple specs:

1. Execute specs in dependency order (check each spec's frontmatter for dependencies).
2. After completing each spec, run the full test suite to ensure no regressions.
3. **Between specs:** Tell the user:

```
Spec [name] complete. [N] specs remaining.
```

**Tip:** Run `/clear` before starting the next spec. Your artifacts are saved to files — this conversation context is disposable.

## Step 6: Hand Off

When all specs are implemented and passing:

```
Implementation complete:
- Spec(s): [list spec names] — all Acceptance Criteria met
- Tests: [N] written, all passing
- Build: passing

Next steps:
- Run /joycraft-session-end to capture discoveries and wrap up
```

**Tip:** Run `/clear` before starting the next step. Your artifacts are saved to files — this conversation context is disposable.
