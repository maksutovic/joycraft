# `npx joycraft init-autofix` CLI Command — Atomic Spec

> **Parent:** docs/research/autofix-loop-closing.md
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1-2 sessions / 4 files / ~200 lines
> **Depends on:** autofix-workflow-templates, github-app-registration

---

## What

Add an `init-autofix` subcommand to the Joycraft CLI that sets up the Level 5 auto-fix loop in a project. It copies workflow templates, creates the scenarios repo structure, and guides the user through secret configuration.

## Why

Setting up the auto-fix loop requires: workflow files, secrets, a scenarios repo, and understanding of how the pieces connect. `init-autofix` automates what it can and clearly guides the rest.

## Acceptance Criteria

- [ ] `npx joycraft init-autofix` works in any initialized Joycraft project
- [ ] Checks if project is already initialized (has `.joycraft-version`)
- [ ] Copies `.github/workflows/autofix.yml` to the project (skip if exists, unless --force)
- [ ] Adds scenarios dispatch job to existing CI workflow (or creates `scenarios-dispatch.yml`)
- [ ] Prompts for scenarios repo name (default: `{current-repo}-scenarios`)
- [ ] Prints clear setup checklist:
  ```
  Autofix setup:

  1. Install the Joycraft Autofix app on your repo:
     https://github.com/apps/joycraft-autofix/installations/new

  2. Generate a private key and add these secrets to your repo:
     - JOYCRAFT_APP_ID: [pre-filled from app]
     - JOYCRAFT_APP_PRIVATE_KEY: [from the .pem file you downloaded]
     - ANTHROPIC_API_KEY: [your Anthropic API key]

  3. Create your scenarios repo:
     gh repo create {name}-scenarios --private

  4. Add this secret to your scenarios repo:
     - MAIN_REPO_TOKEN: [a PAT with repo scope]

  5. Write your first scenario test in the scenarios repo
     (see docs/templates/scenarios/ for examples)
  ```
- [ ] Adds External Validation section to CLAUDE.md (NEVER access scenarios)
- [ ] Creates `docs/templates/scenarios/` with example scenario test file
- [ ] `--dry-run` flag shows what would be created without creating it
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/init-autofix.ts` | Init-autofix logic |
| Modify | `src/cli.ts` | Add `init-autofix` subcommand |
| Create | `src/templates/scenarios/example-scenario.test.ts` | Example scenario test |
| Create | `src/templates/workflows/autofix.yml` | (from previous spec) |
| Modify | `src/improve-claude-md.ts` | Add External Validation section |
| Create | `tests/init-autofix.test.ts` | Tests |

## Approach

The command is intentionally NOT fully automated. It copies files and prints instructions because:
- Installing a GitHub App requires browser interaction (can't be scripted)
- Secret creation requires manual steps
- Creating the scenarios repo could use `gh repo create` but the user should understand what they're creating

The command automates what's safe (file copying) and guides what's manual (secrets, app installation).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No `.github/workflows/` exists | Create it |
| User already has autofix.yml | Skip unless --force |
| User hasn't run `joycraft init` yet | Error: "Run npx joycraft init first" |
| No `gh` CLI installed | Still works — just can't auto-detect repo name. Ask user. |
| User wants to self-host the GitHub App | Print "create your own" instructions instead of Joycraft app link |
