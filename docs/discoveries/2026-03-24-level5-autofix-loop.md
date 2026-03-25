# Discoveries — Level 5 Auto-Fix Loop Implementation

**Date:** 2026-03-24
**Spec:** Level 5 holdout scenarios + autofix loop
**Status:** Infrastructure complete, ready for live test

---

## Discovery 1: GitHub Anti-Recursion Is the Core Problem

**Expected:** Posting a "FAILED" comment on a PR would trigger an `issue_comment` workflow to auto-fix.
**Actual:** GitHub blocks `issue_comment` triggers when the comment is posted by the same identity (PAT owner) that owns the repo. This is anti-recursion protection, not a bug.
**Impact:** All same-identity approaches fail. The solution MUST involve a separate identity.

## Discovery 2: `claude-code-action` Requires PR Context

**Expected:** `claude-code-action@v1` would work when triggered by `repository_dispatch`.
**Actual:** The action tries to resolve PR context for GitHub App auth. `repository_dispatch` doesn't carry PR context natively, causing a 401 "Bad credentials" error.
**Impact:** Cannot use `claude-code-action` with `repository_dispatch`. Must use Claude CLI directly.

## Discovery 3: `@claude` GitHub App Saw But Didn't Act

**Expected:** Mentioning `@claude` in a PR comment would trigger the Claude GitHub App to fix code.
**Actual:** The bot reacted with "eyes" emoji (acknowledged the mention) but never ran or responded, even after 5+ minutes.
**Impact:** Cannot rely on the `@claude` bot for automated loops. May work for interactive use but not CI-triggered.

## Discovery 4: GitHub App Token Is the Identity Solution

**Expected:** Would need a second GitHub account or complex infrastructure.
**Actual:** A GitHub App registered once provides a permanent separate identity. `actions/create-github-app-token@v1` generates short-lived installation tokens inside the user's own workflow. Pushes with this token DO trigger subsequent CI runs.
**Impact:** This is the clean, scalable solution. One app registration serves all Joycraft users.

## Discovery 5: Claude CLI (`claude -p`) Works in GitHub Actions

**Expected:** Would need `claude-code-action` wrapper for CI execution.
**Actual:** `npm install -g @anthropic-ai/claude-code` + `claude -p "prompt" --dangerously-skip-permissions` works directly in a GitHub Actions runner. Full Claude Code capability — file reading, editing, test running, iteration.
**Impact:** Simpler than the action wrapper, more control over prompts and behavior, works with any trigger type.

## Discovery 6: `continue-on-error` and `tee` Mask Exit Codes

**Expected:** `continue-on-error: true` on a test step would let us capture the exit code.
**Actual:** `continue-on-error: true` makes the step ALWAYS report success. And `tee` in a pipeline masks the failing command's exit code.
**Fix:** Use `set +e; set -o pipefail; pnpm test 2>&1 | tee output.txt; EXIT_CODE=$?` instead.

## Discovery 7: ANSI Escape Codes Break PR Comments

**Expected:** CI output would paste cleanly into PR comments.
**Actual:** ANSI color codes from test runners make PR comments unreadable.
**Fix:** `NO_COLOR=1` environment variable + `sed 's/\x1b\[[0-9;]*m//g'` to strip remaining codes.

## Discovery 8: The Managed GitHub App Model Is Safe

**Expected:** Hosting a shared GitHub App might expose user code to us.
**Actual:** A GitHub App with no webhook URL and no server runs entirely in the user's own GitHub Actions. We register the permission template; all execution happens in their environment. We never see their code, secrets, or API responses.
**Impact:** We can ship a shared "Joycraft Autofix" app that any user installs in 1 click. No privacy concerns.

## Discovery 9: Cost Is Manageable

**Expected:** Autonomous fix loops could run up large API bills.
**Actual:** With Claude Sonnet 4.6 + `--max-turns 20` + max 3 iterations per PR, worst case is ~$15 per PR. A solo dev with ~10 PRs/month that fail: ~$10-30/month. The iteration guard and model choice make this practical.

---

## Current State

| Component | Status |
|-----------|--------|
| 18 holdout scenarios in pipit-scenarios | WORKING |
| Cross-repo dispatch (pipit CI → scenarios) | WORKING |
| Scenario execution + failure detection | WORKING |
| PR comment posting (PASS/FAIL) | WORKING |
| Joycraft Autofix GitHub App registered | DONE (App ID: 3180156) |
| App installed on maksutovic repos | DONE |
| Secrets configured (APP_ID, APP_KEY, ANTHROPIC_KEY) | DONE |
| New autofix.yml (App token + Claude CLI) | PUSHED TO PIPIT MAIN |
| Live test of full loop | READY — needs a PR with failing scenarios |

## What's Next

1. Create a test PR on pipit with the intentional break (`version("BROKEN")`)
2. Verify: CI passes → scenarios fail → dispatch fires → autofix runs → Claude fixes → push → CI re-runs → scenarios pass
3. If successful: revert the intentional break, document the pattern
4. Port the workflow templates into Joycraft's `init-autofix` command
5. Write the setup guide for other Joycraft users

## Architecture (Final)

```
Developer pushes PR
    ↓
pipit CI: internal tests (75 TypeScript tests)
    ↓ pass
repository_dispatch → pipit-scenarios (private repo)
    ↓
18 holdout scenarios run against built CLI artifact
    ↓ fail
Post FAIL comment on PR + dispatch scenario-failed to pipit
    ↓
autofix.yml triggers (repository_dispatch)
    ↓
Generate GitHub App token (Joycraft Autofix identity)
    ↓
Check iteration count (max 3)
    ↓
Checkout PR branch with App token
    ↓
claude -p "fix the failure" --dangerously-skip-permissions --max-turns 20 --model sonnet
    ↓
Commit + push with App token (triggers CI as different identity)
    ↓
Loop repeats until scenarios pass or 3 attempts exhausted
    ↓
Human reviews clean PR
```
