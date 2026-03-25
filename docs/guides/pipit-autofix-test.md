# Pipit: Test the Level 5 Auto-Fix Loop

**Context:** The full Level 5 infrastructure is in place. This document is for the Pipit Claude Code session to execute the live test.

---

## What's Been Done

1. **Joycraft Autofix GitHub App** registered (App ID: 3180156), installed on all maksutovic repos
2. **Secrets configured** on pipit repo: `JOYCRAFT_APP_ID`, `JOYCRAFT_APP_PRIVATE_KEY`, `ANTHROPIC_API_KEY`
3. **New `autofix.yml`** pushed to pipit main — uses GitHub App token + `claude -p` (not `claude-code-action`)
4. **18 holdout scenarios** in pipit-scenarios repo — all passing against a clean build
5. **Intentional break** may still be in place: `src/cli.ts` line 31 has `.version("BROKEN")`

## The Test Plan

### Step 1: Verify the intentional break exists

Check `src/cli.ts` — if `.version("BROKEN")` is still there, use it. If it was reverted, introduce a new break:
```typescript
// Change the version to something that fails the scenario
.version("BROKEN")
```

### Step 2: Create a test PR

```bash
git checkout -b test/autofix-loop
# Make sure the break is in place
git add -A && git commit -m "test: intentional break to test autofix loop"
git push -u origin test/autofix-loop
gh pr create --title "test: autofix loop validation" --body "Testing the Level 5 auto-fix loop. This PR has an intentional break that scenario tests will catch."
```

### Step 3: Watch the loop

The expected sequence:

```
1. PR created → pipit CI runs
   - Internal tests should PASS (the version string doesn't affect unit tests)
   - CI dispatches to pipit-scenarios

2. pipit-scenarios runs 18 holdout tests
   - "responds to --version" scenario FAILS (expects semver, gets "BROKEN")
   - Posts "Scenario Tests: FAILED" comment on the PR
   - Dispatches "scenario-failed" event to pipit

3. pipit autofix.yml triggers
   - Generates Joycraft Autofix GitHub App token
   - Checks iteration count (should be 0, under limit of 3)
   - Checks out the PR branch with App token
   - Runs claude -p with the failure context
   - Claude reads the failure, finds .version("BROKEN"), fixes it
   - Commits and pushes with App token identity

4. Push triggers CI again (because App token is a different identity)
   - Internal tests pass
   - Dispatches to pipit-scenarios again

5. Scenarios re-run
   - All 18 pass (version is now valid semver)
   - Posts "Scenario Tests: PASSED" comment

6. PR is green — loop complete!
```

### Step 4: Monitor and troubleshoot

**If CI doesn't dispatch to scenarios:** Check pipit's CI workflow — does it have the `trigger-scenarios` job?

**If scenarios don't post results:** Check pipit-scenarios Actions tab — did the workflow run? Check `MAIN_REPO_TOKEN` secret.

**If autofix doesn't trigger:** Check pipit's Actions tab for the "Auto-Fix Scenario Failures" workflow. `repository_dispatch` only triggers workflows on the default branch (main).

**If Claude can't fix it:** Check the workflow logs for Claude's output. The `--verbose` flag should show what Claude tried.

**If the push doesn't trigger CI re-run:** The GitHub App token should be a different identity. Check that the commit shows as "joycraft-autofix[bot]" not the repo owner.

### Step 5: Clean up

After the loop succeeds:
```bash
# Close the test PR
gh pr close test/autofix-loop --delete-branch
```

### Step 6: Document results

Capture what happened:
- Did the loop complete autonomously?
- How many iterations did it take?
- How long was the total cycle time?
- Any issues encountered?

Write discoveries to `docs/discoveries/` using `/joycraft-session-end`.

---

## Key Files

| File | Repo | Purpose |
|------|------|---------|
| `.github/workflows/autofix.yml` | pipit | Auto-fix trigger (App token + Claude CLI) |
| `.github/workflows/ci.yml` | pipit | Internal CI + scenarios dispatch |
| `.github/workflows/run.yml` | pipit-scenarios | Holdout test runner + PR comment + dispatch |
| `scenarios/cli-smoke.test.ts` | pipit-scenarios | 18 holdout scenarios |

## Secrets

| Secret | Repo | What |
|--------|------|------|
| `JOYCRAFT_APP_ID` | pipit | 3180156 |
| `JOYCRAFT_APP_PRIVATE_KEY` | pipit | .pem file contents |
| `ANTHROPIC_API_KEY` | pipit | For Claude CLI in autofix |
| `SCENARIO_DISPATCH_TOKEN` | pipit | PAT for dispatching to scenarios repo |
| `MAIN_REPO_TOKEN` | pipit-scenarios | PAT for cloning pipit + posting PR comments |
