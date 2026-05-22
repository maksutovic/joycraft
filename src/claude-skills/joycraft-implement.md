---
name: joycraft-implement
description: Execute atomic specs with TDD — read spec, write failing tests, implement until green, hand off to session-end
instructions: 28
---

# Implement Atomic Spec

You have one or more atomic spec paths to execute. Your job is to implement each spec using strict TDD — tests first, confirm they fail, then implement until green.

## Step 1: Parse Arguments

The user should provide one or more spec paths (e.g., `docs/features/<slug>/specs/add-widget.md`).

If no spec path was provided, tell the user:

> No spec path provided. Check `docs/features/<slug>/specs/` for available specs, or provide a path like:
> `/joycraft-implement docs/features/<slug>/specs/spec-name.md`

## Step 2: Read the Sibling README.md FIRST (if present)

Before reading the spec itself, check for a sibling `README.md` in the same folder as the spec — i.e., `<spec-path>/../README.md`. This file is the wave-plan + spec-table that `/joycraft-decompose` writes per feature.

- **If present:** Read the README first. It tells you the spec's position in the wave plan, its dependencies, and which sibling specs (in the same folder) need to be done before this one.
- **If absent:** That's fine — proceed normally. The convention is forward-only and many legacy spec folders pre-date it.

### Warn on Unmet Dependencies

If the README shows that this spec depends on other specs in the same folder, check whether those dependencies are complete. A spec is complete when its frontmatter `status:` is `shipped` (or its body says `Status: Complete`).

If any dependency is **not** complete, tell the user:

> "This spec lists unmet dependencies in the sibling README.md: [list]. Proceed anyway, or stop?"

Wait for confirmation before continuing. The user might be deliberately running out of order (a hotfix, an exploration, etc.) — your job is to surface the warning, not to gate.

## Step 3: Read and Understand the Spec

For each spec path:

1. **Read the spec file.** The spec is your execution contract — the Acceptance Criteria and Test Plan define "done."
2. **Check the spec's Status field.** If it says "Complete," warn the user and ask if they want to re-implement or skip.
3. **Read the Acceptance Criteria** — these are your success conditions.
4. **Read the Test Plan** — this tells you exactly what tests to write and in what order.
5. **Read the Constraints** — these are hard boundaries you must not violate.

### Finding Additional Context

Specs are designed to be self-contained, but if you need more context:

- **Parent brief:** Linked in the spec's body (`> **Parent Brief:**` line). The new convention is `docs/features/<slug>/brief.md`. Read it for broader feature context.
- **Related specs:** Live in the same directory (typically `docs/features/<slug>/specs/`). The sibling `README.md` (read in Step 2 above) is the index.
- **Affected Files:** The spec's Affected Files table tells you which files to create or modify.

## Step 4: Execute the TDD Cycle

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

## Step 5: Handle Edge Cases

Check the spec's Edge Cases table. For each scenario:

- Verify the expected behavior is handled.
- If the spec says "warn the user" or "prompt," make sure that path works.

## Step 6: Multi-Spec Handling

If the user provided multiple specs:

1. Execute specs in dependency order (check each spec's frontmatter for dependencies).
2. After completing each spec, run the full test suite to ensure no regressions.
3. **Between specs:** Tell the user:

```
Spec [name] complete. [N] specs remaining.
```

**Tip:** Run `/clear` before starting the next spec. Your artifacts are saved to files — this conversation context is disposable.

## Step 7: Hand Off

When all specs are implemented and passing, end with the canonical Handoff block:

## Recommended Next Steps

Next:
```bash
/joycraft-session-end
```
Run /clear first.
