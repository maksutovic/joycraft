---
name: decompose
description: Break a feature brief into atomic specs — small, testable, independently executable units
---

# Decompose Feature into Atomic Specs

You have a Feature Brief (or the user has described a feature). Your job is to decompose it into atomic specs that Claude can execute independently.

## Step 1: Verify the Brief Exists

Look for a Feature Brief in `docs/briefs/`. If one doesn't exist yet, tell the user:
"No feature brief found. Run `/new-feature` first to interview and create one, or describe the feature and I'll create the brief now."

If the user describes the feature inline, create the brief first using FEATURE_BRIEF_TEMPLATE.md before decomposing.

## Step 2: Identify Natural Boundaries

Read the brief and identify natural split points:

- **Data layer changes** (schemas, types, migrations) — always a separate spec
- **Pure functions / business logic** — separate from I/O
- **UI components** — separate from data fetching
- **API endpoints / route handlers** — separate from business logic
- **Test infrastructure** (mocks, fixtures, helpers) — can be its own spec if substantial
- **Configuration / environment** — separate from code changes

Ask yourself: "Can this piece be committed and tested without the other pieces existing?" If yes, it's a good boundary.

## Step 3: Build the Decomposition Table

For each atomic spec, define:

| # | Spec Name | Description | Dependencies | Size |
|---|-----------|-------------|--------------|------|

**Rules:**
- Each spec name is `verb-object` format (e.g., `add-terminal-detection`, `extract-prompt-module`)
- Each description is ONE sentence — if you need two, the spec is too big
- Dependencies reference other spec numbers — keep the dependency graph shallow
- More than 2 dependencies on a single spec = it's too big, split further
- Aim for 3-7 specs per feature. Fewer than 3 = probably not decomposed enough. More than 10 = the feature brief is too big

## Step 4: Present and Iterate

Show the decomposition table to the user. Ask:
1. "Does this breakdown match how you think about this feature?"
2. "Are there any specs that feel too big or too small?"
3. "Should any of these run in parallel (separate worktrees)?"

Iterate until the user approves.

## Step 5: Generate Atomic Specs

For each approved row in the decomposition table:
1. Create `docs/specs/<feature-name>/spec-name.md` using ATOMIC_SPEC_TEMPLATE.md (derive feature-name from the brief filename, stripped of date prefix)
2. Fill in all sections — each spec must be self-contained (no "see the brief for context")
3. Copy relevant constraints from the Feature Brief into each spec
4. Write acceptance criteria specific to THIS spec, not the whole feature

## Step 6: Recommend Execution Strategy

Based on the dependency graph:
- **Independent specs** → "These can run in parallel worktrees"
- **Sequential specs** → "Execute these in order: 1 → 2 → 4"
- **Mixed** → "Start specs 1 and 3 in parallel. After 1 completes, start 2."

Update the Feature Brief's Execution Strategy section with the plan.

## Step 7: Hand Off

Tell the user:
```
Decomposition complete:
- [N] atomic specs created in docs/specs/
- [N] can run in parallel, [N] are sequential
- Estimated total: [N] sessions

To execute:
- Sequential: Open a session, point Claude at each spec in order
- Parallel: Use worktrees — one spec per worktree, merge when done
- Each spec will produce a DISCOVERIES.md with any surprises

Ready to start execution?
```

**Tip:** Run `/clear` before starting the next step. Your artifacts are saved to files — this conversation context is disposable.
