---
name: joycraft-implement-level5
description: Set up Level 5 autonomous development — autofix loop, holdout scenario testing, and scenario evolution from specs
---

# Implement Level 5 — Autonomous Development Loop

You are guiding the user through setting up Level 5: the autonomous feedback loop where specs go in, validated software comes out. This is a one-time setup that installs workflows, creates a scenarios repo, and configures the autofix loop.

## Before You Begin

Check prerequisites:

1. **Project must be initialized.** Search for `.joycraft-version`. If missing, tell the user to run `npx joycraft init` first.
2. **Project should be at Level 4.** Read `docs/joycraft-assessment.md` if it exists. If the project hasn't been assessed yet, suggest running `$joycraft-tune` first. But don't block -- the user may know they're ready.
3. **Git repo with GitHub remote.** This setup requires GitHub Actions. Check for `.git/` and a GitHub remote.

If prerequisites aren't met, explain what's needed and stop.

## Step 1: Explain What Level 5 Means

Tell the user:

> Level 5 is the autonomous loop. When you push specs, three things happen automatically:
>
> 1. **Scenario evolution** -- An AI agent reads your specs and writes holdout tests in a private scenarios repo. These tests are invisible to your coding agent.
> 2. **Autofix** -- When CI fails on a PR, the agent automatically attempts a fix (up to 3 times).
> 3. **Holdout validation** -- When CI passes, your scenarios repo runs behavioral tests against the PR. Results post as PR comments.
>
> The key insight: your coding agent never sees the scenario tests. This prevents it from gaming the test suite -- like a validation set in machine learning.

## Step 2: Gather Configuration

Ask these questions **one at a time**:

### Question 1: Scenarios repo name

> What should we call your scenarios repo? It'll be a private repo that holds your holdout tests.
>
> Default: `{current-repo-name}-scenarios`

Accept the default or the user's choice.

### Question 2: GitHub App

> Level 5 needs a GitHub App to provide a separate identity for autofix pushes (this avoids GitHub's anti-recursion protection). Creating one takes about 2 minutes:
>
> 1. Go to https://github.com/settings/apps/new
> 2. Give it a name (e.g., "My Project Autofix")
> 3. Uncheck "Webhook > Active" (not needed)
> 4. Under **Repository permissions**, set:
>    - **Contents**: Read & Write
>    - **Pull requests**: Read & Write
>    - **Actions**: Read & Write
> 5. Click **Create GitHub App**
> 6. Note the **App ID** from the settings page
> 7. Scroll to **Private keys** > click **Generate a private key** > save the `.pem` file
> 8. Click **Install App** in the left sidebar > install it on your repo
>
> What's your App ID?

## Step 3: Run init-autofix

Run the CLI command with the gathered configuration:

```bash
npx joycraft init-autofix --scenarios-repo {name} --app-id {id}
```

Review the output with the user. Confirm files were created.

## Step 4: Walk Through Secret Configuration

Guide the user step by step:

### 4a: Add Secrets to Main Repo

> You should already have the `.pem` file from when you created the app in Step 2.

> Go to your repo's Settings > Secrets and variables > Actions, and add:
> - `JOYCRAFT_APP_PRIVATE_KEY` -- paste the contents of your `.pem` file
> - `ANTHROPIC_API_KEY` -- your Anthropic API key (or the appropriate AI provider key for your setup)

### 4b: Create the Scenarios Repo

> Create the private scenarios repo:
> ```bash
> gh repo create {scenarios-repo-name} --private
> ```
>
> Then copy the scenario templates into it:
> ```bash
> cp -r docs/templates/scenarios/* ../{scenarios-repo-name}/
> cd ../{scenarios-repo-name}
> git add -A && git commit -m "init: scaffold scenarios repo from Joycraft"
> git push
> ```

### 4c: Add Secrets to Scenarios Repo

> The scenarios repo also needs the App private key:
> - `JOYCRAFT_APP_PRIVATE_KEY` -- same `.pem` file as the main repo
> - `ANTHROPIC_API_KEY` -- same key (needed for scenario generation)

## Step 5: Verify Setup

Help the user verify everything is wired correctly:

1. **Check workflow files exist:** `ls .github/workflows/autofix.yml .github/workflows/scenarios-dispatch.yml .github/workflows/spec-dispatch.yml .github/workflows/scenarios-rerun.yml`
2. **Check scenario templates were copied:** Verify the scenarios repo has `example-scenario.test.ts`, `workflows/run.yml`, `workflows/generate.yml`, `prompts/scenario-agent.md`
3. **Check the App ID is correct** in the workflow files (not still a placeholder)

## Step 6: Update AGENTS.md

If the project's AGENTS.md doesn't already have an "External Validation" section, add one:

> ## External Validation
>
> This project uses holdout scenario tests in a separate private repo.
>
> ### NEVER
> - Access, read, or reference the scenarios repo
> - Mention scenario test names or contents
> - Modify the scenarios dispatch workflow to leak test information
>
> The scenarios repo is deliberately invisible to you. This is the holdout guarantee.

## Step 7: First Test (Optional)

If the user wants to test the loop:

> Want to do a quick test? Here's how:
>
> 1. Write a simple spec in `docs/specs/` and push to main -- this triggers scenario generation
> 2. Create a PR with a small change -- when CI passes, scenarios will run
> 3. Watch for the scenario test results as a PR comment
>
> Or deliberately break something in a PR to test the autofix loop.

## Step 8: Summary

Print a summary of what was set up:

> **Level 5 is live.** Here's what's running:
>
> | Trigger | What Happens |
> |---------|-------------|
> | Push specs to `docs/specs/` | Scenario agent writes holdout tests |
> | PR fails CI | Autofix agent attempts a fix (up to 3x) |
> | PR passes CI | Holdout scenarios run against PR |
> | Scenarios update | Open PRs re-tested with latest scenarios |
>
> Your scenarios repo: `{name}`
> Your coding agent cannot see those tests. The holdout wall is intact.

Update `docs/joycraft-assessment.md` if it exists -- set the Level 5 score to reflect the new setup.
