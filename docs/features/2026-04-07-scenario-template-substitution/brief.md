# Scenario Template Substitution — Feature Brief

> **Date:** 2026-04-07
> **Project:** Joycraft
> **Status:** Draft

---

## Vision

When users run `npx joycraft init-autofix`, the CLI correctly substitutes the GitHub App ID into the main repo's workflow files (autofix, scenarios-dispatch, spec-dispatch, scenarios-rerun). But the scenario repo templates — `run.yml` and `generate.yml` in `docs/templates/scenarios/workflows/` — still contain the literal placeholder `$JOYCRAFT_APP_ID` and use `${{ github.event.client_payload.repo }}` for the `repositories` field in `actions/create-github-app-token`. Both break at runtime:

1. **`$JOYCRAFT_APP_ID`** is passed as a string to the `app-id` field, causing a `'Issuer' claim ('iss') must be an Integer` 401 error.
2. **`repositories: maksutovic/joycraft`** (from client_payload) double-prefixes the owner, producing `maksutovic/maksutovic%2Fjoycraft` in the API URL, causing a 404.

Additionally, the scenario templates are copied via `cp -r` into the scenarios repo, but the workflow files land in `workflows/` instead of `.github/workflows/` where GitHub Actions expects them. This means the `repository_dispatch` listeners never activate.

These are all first-run blockers for Level 5. Every user who follows the setup guide will hit these failures.

## User Stories

- As a user setting up Level 5, I want `init-autofix` to produce a ready-to-use scenarios repo so that the holdout loop works on first try without manual fixes
- As a user creating the scenarios repo, I want the workflow files to land in `.github/workflows/` so that GitHub Actions recognizes them immediately

## Hard Constraints

- MUST: Substitute `$JOYCRAFT_APP_ID` with the actual App ID in scenario templates during `init-autofix`
- MUST: Use just the repo name (not `owner/repo`) in the `repositories` field of `create-github-app-token`
- MUST: Scaffold scenario workflows into `.github/workflows/` path structure, not `workflows/`
- MUST: Update the setup guide in Step 4b to use `.github/workflows/` path
- MUST NOT: Change the template source-of-truth files — substitution happens at install time
- MUST NOT: Break existing `init-autofix` tests

## Out of Scope

- Automating `gh repo create` for the scenarios repo (user does this manually)
- Automating secret configuration (GitHub doesn't support this via CLI)
- Fixing the Node.js 20 deprecation warning in `actions/create-github-app-token@v1`

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | fix-scenario-template-app-id | Substitute `$JOYCRAFT_APP_ID` with actual App ID in scenario workflow templates during `init-autofix` | None | S |
| 2 | fix-scenario-template-repo-field | Hardcode repo name (not `owner/repo`) in scenario templates' `repositories` field, or extract repo name at install time | Spec 1 | S |
| 3 | fix-scenario-template-path | Change scenario template structure so workflows live under `.github/workflows/` and update setup instructions | None | S |

## Execution Strategy

- [ ] Sequential
- Specs 1 and 3 are independent, can run in parallel
- Spec 2 depends on spec 1 (same file, same substitution logic)

## Success Criteria

- [ ] `init-autofix` produces scenario templates with numeric App ID, not `$JOYCRAFT_APP_ID`
- [ ] Scenario workflow `repositories` field contains only the repo name, not `owner/repo`
- [ ] Scenario templates scaffold with `.github/workflows/` directory structure
- [ ] Step 4b instructions reference `.github/workflows/` path
- [ ] Existing `init-autofix` tests pass
- [ ] New test verifies App ID substitution in scenario templates
- [ ] New test verifies `.github/workflows/` path structure in scenario output

---

## Reference: Errors Encountered During First Level 5 Setup

| Error | Root Cause | Location |
|-------|-----------|----------|
| `'Issuer' claim ('iss') must be an Integer` (401) | `app-id: $JOYCRAFT_APP_ID` passed as string | `scenarios/workflows/run.yml:43`, `generate.yml:127` |
| `Not Found` (404) on repo installation | `repositories: maksutovic/joycraft` double-prefixes owner | `scenarios/workflows/run.yml:45`, `generate.yml:129` |
| `repository_dispatch` never fires | Workflows at `workflows/` not `.github/workflows/` | Scaffolding in `init-autofix` + setup guide Step 4b |
