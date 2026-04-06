---
name: joycraft-verify
description: Spawn an independent verifier subagent to check an implementation against its spec -- read-only, no code edits, structured pass/fail verdict
---

# Verify Implementation Against Spec

The user wants independent verification of an implementation. Your job is to find the relevant spec, extract its acceptance criteria and test plan, then spawn a separate verifier subagent that checks each criterion and produces a structured verdict.

**Why a separate subagent?** Research found that agents reliably skew positive when grading their own work. Separating the agent doing the work from the agent judging it consistently outperforms self-evaluation. The verifier gets a clean context window with no implementation bias.

## Step 1: Find the Spec

If the user provided a spec path (e.g., `$joycraft-verify docs/specs/2026-03-26-add-widget.md`), use that path directly.

If no path was provided, scan `docs/specs/` for spec files. Pick the most recently modified `.md` file in that directory. If `docs/specs/` doesn't exist or is empty, tell the user:

> No specs found in `docs/specs/`. Please provide a spec path: `$joycraft-verify path/to/spec.md`

## Step 2: Read and Parse the Spec

Read the spec file and extract:

1. **Spec name** -- from the H1 title
2. **Acceptance Criteria** -- the checklist under the `## Acceptance Criteria` section
3. **Test Plan** -- the table under the `## Test Plan` section, including any test commands
4. **Constraints** -- the `## Constraints` section if present

If the spec has no Acceptance Criteria section, tell the user:

> This spec doesn't have an Acceptance Criteria section. Verification needs criteria to check against. Add acceptance criteria to the spec and try again.

If the spec has no Test Plan section, note this but proceed -- the verifier can still check criteria by reading code and running any available project tests.

## Step 3: Identify Test Commands

Look for test commands in these locations (in priority order):

1. The spec's Test Plan section (look for commands in backticks or "Type" column entries like "unit", "integration", "e2e", "build")
2. The project's CLAUDE.md or AGENTS.md (look for test/build commands in the Development Workflow section)
3. Common defaults based on the project type:
   - Node.js: `npm test` or `pnpm test --run`
   - Python: `pytest`
   - Rust: `cargo test`
   - Go: `go test ./...`

Build a list of specific commands the verifier should run.

## Step 4: Spawn the Verifier Subagent

Spawn a concurrent subagent thread with the following prompt. Replace the placeholders with the actual content extracted in Steps 2-3.

**Important:** The subagent must be given read-only constraints. It may search the codebase, read files, and run the specified test/build commands, but it must NOT edit or create any files.

```
You are a QA verifier. Your job is to independently verify an implementation against its spec. You have NO context about how the implementation was done -- you are checking it fresh.

RULES -- these are hard constraints, not suggestions:
- You may search the codebase and read any file
- You may RUN these specific test/build commands: [TEST_COMMANDS]
- You may NOT edit, create, or delete any files
- You may NOT run commands that modify state (no git commit, no npm install, no file writes)
- You may NOT install packages or access the network
- Report what you OBSERVE, not what you expect or hope

SPEC NAME: [SPEC_NAME]

ACCEPTANCE CRITERIA:
[ACCEPTANCE_CRITERIA]

TEST PLAN:
[TEST_PLAN]

CONSTRAINTS:
[CONSTRAINTS_OR_NONE]

YOUR TASK:
For each acceptance criterion, determine if it PASSES or FAILS based on evidence:

1. Run the test commands listed above. Record the output.
2. For each acceptance criterion:
   a. Check if there is a corresponding test and whether it passes
   b. If no test exists, read the relevant source files to verify the criterion is met
   c. If the criterion cannot be verified by reading code or running tests, mark it MANUAL CHECK NEEDED
3. For criteria about build/test passing, actually run the commands and report results.

OUTPUT FORMAT -- you MUST use this exact format:

VERIFICATION REPORT

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | [criterion text] | PASS/FAIL/MANUAL CHECK NEEDED | [what you observed] |
| 2 | [criterion text] | PASS/FAIL/MANUAL CHECK NEEDED | [what you observed] |
[continue for all criteria]

SUMMARY: X/Y criteria passed. [Z failures need attention. / All criteria verified.]

If any test commands fail to run (missing dependencies, wrong command, etc.), report the error as evidence for a FAIL verdict on the relevant criterion.
```

## Step 5: Format and Present the Verdict

Take the subagent's response and present it to the user in this format:

```
## Verification Report -- [Spec Name]

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | ... | PASS | ... |
| 2 | ... | FAIL | ... |

**Overall: X/Y criteria passed.**

[If all passed:]
All criteria verified. Ready to commit and open a PR.

[If any failed:]
N failures need attention. Review the evidence above and fix before proceeding.

[If any MANUAL CHECK NEEDED:]
N criteria need manual verification -- they can't be checked by reading code or running tests alone.
```

## Step 6: Suggest Next Steps

Based on the verdict:

- **All PASS:** Suggest committing and opening a PR, or running `$joycraft-session-end` to capture discoveries.
- **Some FAIL:** List the failed criteria and suggest the user fix them, then run `$joycraft-verify` again.
- **MANUAL CHECK NEEDED items:** Explain what needs human eyes and why automation couldn't verify it.

**Do NOT offer to fix failures yourself.** The verifier reports; the human (or implementation agent in a separate turn) decides what to do. This separation is the whole point.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Spec has no Test Plan | Warn that verification is weaker without a test plan, but proceed by checking criteria through code reading and any available project-level tests |
| All tests pass but a criterion is not testable | Mark as MANUAL CHECK NEEDED with explanation |
| Subagent can't run tests (missing deps) | Report the error as FAIL evidence |
| No specs found and no path given | Tell user to provide a spec path or create a spec first |
| Spec status is "Complete" | Still run verification -- "Complete" means the implementer thinks it's done, verification confirms |
