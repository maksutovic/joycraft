# Level 5: External Holdout Scenario Testing — Research & Implementation Guide

**Date:** 2026-03-24
**Status:** Research complete, Pipit trial pending
**Sources:** StrongDM Software Factory, Palisade Research, SWE-bench, METR study, Boris Cherny patterns

---

## The Problem

AI coding agents actively game visible test suites. Palisade Research proved that reasoning models (o1, DeepSeek R1) optimize to pass tests they can see — not to build correct software. This is the ML overfitting problem applied to code generation.

The solution: **holdout scenarios** — tests that live outside the codebase, invisible to the coding agent during development. Like a validation set in ML, they catch what internal tests miss.

## The Two Kinds of Tests at Level 5

| | Internal Tests | External Scenarios |
|---|---|---|
| **Where** | Same repo, visible to agent | Separate private repo, invisible to agent |
| **Who writes** | Agent (guided by specs) | Human (or separate agent) |
| **Purpose** | Verify implementation correctness | Verify user-facing behavior |
| **Analogy** | Training data | Holdout/validation set |
| **Example** | `expect(findCLI('/usr/local/bin')).toBe(true)` | "Install the app, verify it finds the CLI" |

The agent SHOULD have internal tests. External scenarios are the additional layer that catches integration failures, installation bugs, and UX issues that unit tests miss.

## The Full Automated Loop

```
Agent implements spec → pushes branch → opens PR
    ↓
Main repo CI runs internal tests
    ↓ (if pass)
repository_dispatch → triggers private scenarios repo
    ↓
Scenarios repo: clones PR branch, builds artifact, runs holdout tests
    ↓
Posts results as PR comment (GitHub API)
    ↓ (if fail)
claude-code-action reads failure comment, fixes code, pushes to branch
    ↓
Loop repeats until scenarios pass
    ↓ (if pass)
PR ready for human review
```

### Key Infrastructure

| Piece | Where | What |
|-------|-------|------|
| Your local Claude Code | Your machine | Implements specs, pushes PRs |
| Main repo CI | GitHub Actions | Runs internal tests, dispatches to scenarios |
| Scenarios repo CI | GitHub Actions | Runs holdout tests, posts results to PR |
| `claude-code-action` | GitHub Actions (main repo) | Reads failure comments, fixes code |

No custom servers. No services. Just GitHub Actions workflows + GitHub API.

### Cross-Repo Communication

```
Main repo CI  →  repository_dispatch  →  Scenarios repo CI
                                              ↓
Main repo PR  ←  GitHub API comment   ←  Scenarios repo CI
     ↓
claude-code-action (triggered by the comment, runs in main repo)
```

## Authentication Requirements

| Secret | Where to add | Purpose |
|--------|-------------|---------|
| `SCENARIO_DISPATCH_TOKEN` | Main repo secrets | PAT with `repo` scope to trigger scenarios repo |
| `MAIN_REPO_TOKEN` | Scenarios repo secrets | PAT with `repo` scope to comment on main repo PRs |
| `ANTHROPIC_API_KEY` | Main repo secrets | For claude-code-action auto-fix |

**Best practice:** Use a GitHub App installed on both repos instead of PATs. Avoids long-lived tokens.

## GitHub Actions Workflow Templates

### Main Repo: `.github/workflows/ci.yml`

```yaml
name: CI + Scenarios

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm test --run
      - run: pnpm typecheck

  trigger-scenarios:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch to scenarios repo
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.SCENARIO_DISPATCH_TOKEN }}" \
            "https://api.github.com/repos/${{ github.repository_owner }}/${{ github.event.repository.name }}-scenarios/dispatches" \
            -d '{
              "event_type": "run-scenarios",
              "client_payload": {
                "pr_number": "${{ github.event.pull_request.number }}",
                "head_sha": "${{ github.event.pull_request.head.sha }}",
                "head_ref": "${{ github.event.pull_request.head.ref }}",
                "repo": "${{ github.repository }}"
              }
            }'
```

### Main Repo: `.github/workflows/autofix.yml`

```yaml
name: Auto-Fix Scenario Failures

on:
  issue_comment:
    types: [created]

concurrency:
  group: autofix-${{ github.event.issue.number }}
  cancel-in-progress: false

jobs:
  fix:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, 'Scenario Tests: FAILED')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/head

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            A holdout scenario test failed. Read the failure below and fix the code.
            Do NOT try to find or read the scenario tests — they are in a separate
            repo you don't have access to. Fix the bug based on the error message.

            ${{ github.event.comment.body }}
          claude_args: "--max-turns 15"
```

### Scenarios Repo: `.github/workflows/run.yml`

```yaml
name: Run Scenarios

on:
  repository_dispatch:
    types: [run-scenarios]

jobs:
  scenarios:
    runs-on: ubuntu-latest  # or macos-latest for Mac app testing
    steps:
      - name: Checkout scenarios
        uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Clone and build artifact under test
        run: |
          git clone --depth 1 --branch "${{ github.event.client_payload.head_ref }}" \
            "https://x-access-token:${{ secrets.MAIN_REPO_TOKEN }}@github.com/${{ github.event.client_payload.repo }}.git" \
            /tmp/main-repo
          cd /tmp/main-repo
          pnpm install && pnpm build

      - name: Run scenarios
        id: scenarios
        continue-on-error: true
        run: pnpm test --run 2>&1 | tee /tmp/output.txt

      - name: Post results to PR
        if: always()
        run: |
          OUTPUT=$(cat /tmp/output.txt | head -c 60000)
          if [ "${{ steps.scenarios.outcome }}" = "success" ]; then
            BODY="## Scenario Tests: PASSED

          All holdout scenarios satisfied. PR is ready for human review."
          else
            BODY="## Scenario Tests: FAILED

          \`\`\`
          ${OUTPUT}
          \`\`\`"
          fi

          gh api \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            "/repos/${{ github.event.client_payload.repo }}/issues/${{ github.event.client_payload.pr_number }}/comments" \
            -f body="$BODY"
        env:
          GH_TOKEN: ${{ secrets.MAIN_REPO_TOKEN }}
```

## The Graduated Path

### Level 4.5: Shell Script Smoke Tests (2 hours)

Separate private repo with 3-5 shell scripts that build the artifact and test it:

```bash
#!/bin/bash
set -e
cd /tmp && git clone "$REPO_URL" app && cd app
pnpm install && pnpm build

# Scenario 1: CLI binary works
node dist/cli.js --help | grep -q "Usage" || (echo "FAIL: CLI help broken" && exit 1)

# Scenario 2: Init creates expected files
mkdir /tmp/test-project && cd /tmp/test-project
node /tmp/app/dist/cli.js init .
test -f CLAUDE.md || (echo "FAIL: CLAUDE.md not created" && exit 1)
test -d .claude/skills/tune || (echo "FAIL: tune skill not installed" && exit 1)

echo "ALL SCENARIOS PASSED"
```

### Level 4.75: YAML Scenarios + LLM-as-Judge (1 day)

Structured scenario files with natural language satisfaction criteria:

```yaml
id: cli-discovery
description: >
  The app must find and invoke the CLI binary regardless of
  how it was installed (global npm, local build, Homebrew).
trajectories:
  - name: global-install
    steps:
      - install cli globally
      - launch app
      - verify: "app shows Connected status"
  - name: no-cli
    steps:
      - ensure no cli binary exists
      - launch app
      - verify: "app shows helpful install instructions, not a crash"
satisfaction_criteria: >
  The app must discover the CLI in standard locations and show
  a clear, actionable error when it can't find it.
```

A judge script sends captured output + scenario to an LLM that scores satisfaction (0-1).

**LLM-as-judge costs:** ~$0.01-0.05 per scenario evaluation. 50 scenarios x 3 runs = ~$7.50/cycle.

### Level 5.0: Full Autonomous Loop (weeks)

- Digital twins of external services
- Hundreds of scenarios
- Auto-fix via claude-code-action
- Spec queue that agents pull from autonomously
- Satisfaction dashboard tracking quality over time

## "Invisible to Agent" Enforcement

**The only reliable isolation is a separate private repo.** The agent has no credentials to access it.

| Approach | Isolation Strength | Practical? |
|----------|-------------------|------------|
| Separate private repo | Strong | Yes (recommended) |
| Same repo, GPG-encrypted | Moderate | Awkward DX |
| Same repo, separate branch | Weak | Agent can `git checkout` |
| CLAUDE.md "never read" boundary | None | Reasoning models ignore 37% of constraints |

**The agent WILL see failure messages in PR comments.** This is fine and necessary — it sees WHAT failed, not the test source code. Like a user filing a bug report.

**Format failure output carefully:**
- Good: "When running init on a Node.js project with existing CLAUDE.md, the content was overwritten"
- Bad: `assert(existsSync(join(tmpDir, 'CLAUDE.md'))) // line 47 of test-init.ts`

## Safety Rails for the Auto-Fix Loop

1. **Max iterations:** Tag commits `[fix-attempt-1/5]`, stop after 5 attempts
2. **Concurrency groups:** Only one autofix job per PR at a time
3. **Bot allowlist:** Only react to comments from your specific bot account
4. **Timeout:** `timeout-minutes: 30` on the autofix job
5. **Cost cap:** `--max-turns 15` limits Claude API usage per attempt
6. **Human escape hatch:** If 5 attempts fail, post "Auto-fix exhausted. Human review needed."

## What Joycraft Should Ship (Future)

1. **Scenario template** — YAML format for writing holdout scenarios
2. **Setup guide** — step-by-step with copy-pasteable GitHub Actions YAML
3. **`/scenarios` skill** — generates scenario files from your specs (outputs for you to copy to separate repo)
4. **Assessment dimension** — score external validation as part of `/tune`
5. **Level 5 roadmap** — already in `/tune`, references this document

## Key Sources

- [StrongDM Software Factory](https://factory.strongdm.ai/)
- [StrongDM Attractor](https://github.com/strongdm/attractor)
- [Palisade Research: Specification Gaming](https://palisaderesearch.org/blog/specification-gaming)
- [SWE-bench](https://github.com/SWE-bench/SWE-bench)
- [Anthropic: claude-code-action](https://github.com/anthropics/claude-code-action)
- [Dan Shapiro: Five Levels](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/)
- [Boris Cherny: Claude Code Patterns](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)
- [Addy Osmani: Good Specs for AI](https://addyosmani.com/blog/good-spec/)
- [LLM-as-Judge Research](https://www.arxiv.org/pdf/2512.01232)
