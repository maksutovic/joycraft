# Scenario Test Templates — Atomic Spec

> **Parent:** docs/research/autofix-loop-closing.md
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1 session / 4 files / ~150 lines

---

## What

Create template files that ship with Joycraft for bootstrapping a scenarios repo: example test file, GitHub Actions workflow, and vitest config.

## Why

Users need a starting point for their scenarios repo. A blank private repo with no guidance means nobody writes scenarios. Templates with realistic examples + a working CI workflow get users from zero to running in 30 minutes.

## Acceptance Criteria

- [ ] `src/templates/scenarios/example-scenario.test.ts` — realistic example scenario testing a CLI artifact
- [ ] `src/templates/scenarios/workflows/run.yml` — GitHub Actions workflow for the scenarios repo
- [ ] `src/templates/scenarios/package.json` — minimal vitest setup
- [ ] `src/templates/scenarios/README.md` — explains what this repo is, how to add scenarios, relationship to main repo
- [ ] Example scenario demonstrates: build artifact, invoke it, assert on output
- [ ] Workflow template handles: clone main repo branch, build, run tests, post results to PR
- [ ] README explains the holdout concept in plain language
- [ ] Templates are bundled and copied by `init-autofix`
- [ ] Build passes

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/scenarios/example-scenario.test.ts` | Example holdout test |
| Create | `src/templates/scenarios/workflows/run.yml` | Scenarios CI workflow |
| Create | `src/templates/scenarios/package.json` | Vitest config |
| Create | `src/templates/scenarios/README.md` | Explains the holdout pattern |
| Modify | `src/bundled-files.ts` | Include scenario templates |

## Approach

The example scenario test should be stack-agnostic (tests a built CLI artifact) since Joycraft supports many stacks. The workflow template uses parameterized values (`$MAIN_REPO`) that `init-autofix` fills in.

The README is crucial — it's the first thing a user sees in the scenarios repo. It should explain:
- Why scenarios are separate from the main repo
- Why the coding agent can't see them
- How to add new scenarios
- How the CI pipeline works
- Link back to Joycraft docs for the full explanation

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User's project is Python, not Node | Example scenario uses generic subprocess calls, not Node-specific patterns |
| User wants macOS runner for Mac app testing | Workflow template has commented-out macOS job they can uncomment |
| Scenarios repo already exists with user content | `init-autofix` copies templates to a subdirectory, doesn't overwrite |
