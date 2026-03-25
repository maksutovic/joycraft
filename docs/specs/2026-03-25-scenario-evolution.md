# Scenario Evolution — Atomic Spec

> **Parent:** docs/research/level-5-holdout-scenarios.md
> **Status:** Ready
> **Date:** 2026-03-25
> **Estimated scope:** 1-2 sessions / 6 files / ~300 lines
> **Depends on:** autofix-workflow-templates, scenario-templates, init-autofix-command (strict ordering — init-autofix-command must be implemented first since this spec modifies `src/init-autofix.ts` and `src/bundled-files.ts` that it creates)

---

## What

Add an automated scenario evolution system to the Level 5 loop. When specs are committed to the parent repo, a separate "scenario agent" (Claude CLI running in the scenarios repo CI) triages the new specs and writes or updates holdout tests — without ever seeing the parent repo's source code. A re-run mechanism handles the race condition where the implementation PR opens before the scenario agent finishes.

## Why

Without this, holdout scenarios go stale. Every new feature ships without scenario coverage until a human manually writes tests in the scenarios repo. The gap between "feature implemented" and "scenarios exist for it" is where regressions hide. Automating scenario generation closes this gap while preserving the holdout wall.

## Design

### The Holdout Wall

| Agent | Can see | Cannot see |
|-------|---------|------------|
| Implementation agent (parent repo) | Source code, internal tests, specs | Scenario tests |
| Scenario agent (scenarios repo) | Specs (via dispatch), scenario tests | Source code |

Specs are the shared interface between the two agents. The implementation agent writes them. The scenario agent reads them. Neither crosses the wall.

### The Flow

```
1. /joycraft-decompose writes specs to docs/specs/
2. /joycraft-session-end commits + pushes specs to main
3. Push triggers repository_dispatch to scenarios repo (spec content in payload)
4. Scenario agent (Claude CLI in scenarios CI):
   a. Saves spec to local specs/ mirror folder
   b. Reads existing scenario tests for context
   c. Triages: skip (internal-only change) / new tests / update existing tests
   d. Writes + commits tests to scenarios main
   e. Fires repository_dispatch back to parent repo: type "scenarios-updated"
5. Meanwhile, implementation agent works on the spec, opens PR, CI runs
6. CI passes -> dispatches to scenarios repo to run tests against PR branch
7. Scenario tests execute:
   - If new tests are already on main (~80% of cases): they run. Happy path.
   - If scenario agent hasn't finished yet: existing tests run. PR proceeds.
8. When scenario agent finishes (step 4e), parent repo receives "scenarios-updated":
   - Checks for open PRs not yet tested with latest scenarios
   - Re-dispatches those PRs to scenarios repo for a fresh run
```

### Race Condition Handling

The scenario agent and implementation agent work in parallel. ~80% of the time, scenarios finish first (writing tests is faster than implementing features). For the ~20% where implementation finishes first:

1. The PR's first scenario run uses whatever tests exist (still catches regressions on existing features)
2. When the scenario agent finishes, it fires `repository_dispatch` back to the parent repo
3. The parent repo's "scenarios-updated" workflow re-triggers scenario runs for any open PRs
4. Worst case: PR merges before re-run completes. New scenarios protect the very next PR — never more than one cycle behind.

### Triage Logic

The scenario agent prompt instructs it to:

1. Read the spec's **What** and **Acceptance Criteria** sections
2. Determine if the change is user-facing:
   - Internal refactor, dev tooling, CI changes -> skip, commit a note: "No scenario changes needed"
   - New user-facing behavior -> write new scenario test file
   - Modified existing behavior -> update existing scenario tests
   - Breaking change -> flag and update affected scenarios
3. Write only behavioral/integration tests (invoke the built artifact, assert on outputs)
4. Never attempt to import, read, or reference source code from the parent repo

### The Specs Mirror

The scenarios repo maintains a `specs/` folder that mirrors specs from the parent repo. Every dispatched spec gets saved there. This gives the scenario agent historical context: "what features already exist and have test coverage?" without needing access to the parent repo's codebase.

## Acceptance Criteria

- [ ] `src/templates/workflows/spec-dispatch.yml` — parent repo workflow, triggers on push to `docs/specs/*.md`
- [ ] `src/templates/scenarios/workflows/generate.yml` — scenarios repo workflow, receives spec dispatch, runs scenario agent
- [ ] `src/templates/workflows/scenarios-rerun.yml` — parent repo workflow, receives "scenarios-updated" dispatch, re-runs scenarios for open PRs
- [ ] `src/templates/scenarios/prompts/scenario-agent.md` — the scenario agent prompt template
- [ ] Spec dispatch workflow:
  - Triggers on push to main when `docs/specs/**` files change
  - Filters to added/modified files only (ignores deletions)
  - Extracts changed spec file content
  - Fires `repository_dispatch` to `{owner}/{repo}-scenarios` with spec content + metadata in payload
  - Payload schema: `{ spec_filename: string, spec_content: string, commit_sha: string, branch: string }`
- [ ] Scenario generation workflow:
  - Triggered by `repository_dispatch` type: `spec-pushed`
  - Saves incoming spec to `specs/` mirror folder (creates folder if missing, filename matches source: `specs/{original-filename}`)
  - Installs Claude CLI
  - Passes to `claude -p`: the scenario agent prompt, the new spec content, a listing of existing test filenames (not file contents — bounded context), and the `specs/` folder contents for historical context
  - Commits any new/changed test files
  - Fires `repository_dispatch` back to parent repo type: `scenarios-updated`
- [ ] `run.yml` updated to accept `repository_dispatch` type `run-scenarios` as an additional trigger (alongside existing triggers), using the same test execution logic
- [ ] Scenarios re-run workflow:
  - Triggered by `repository_dispatch` type: `scenarios-updated`
  - Lists open PRs via GitHub API
  - If no open PRs exist: exits cleanly (no-op)
  - For each open PR: fires `repository_dispatch` to scenarios repo type: `run-scenarios` with PR context
- [ ] Scenario agent prompt:
  - Instructs: "You are a QA engineer. You cannot access source code."
  - Provides: the new spec, list of existing scenario files, existing specs mirror
  - Outputs: new test files, updated test files, or "no changes needed" with reasoning
  - Tests must be behavioral: build artifact, invoke it, assert on output
- [ ] Templates are parameterized ($SCENARIOS_REPO, $MAIN_REPO, $JOYCRAFT_APP_ID)
- [ ] `init-autofix` copies all new templates during setup
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/workflows/spec-dispatch.yml` | Spec push dispatch workflow |
| Create | `src/templates/scenarios/workflows/generate.yml` | Scenario generation workflow |
| Create | `src/templates/workflows/scenarios-rerun.yml` | Re-run workflow for open PRs |
| Create | `src/templates/scenarios/prompts/scenario-agent.md` | Scenario agent prompt template |
| Modify | `src/templates/scenarios/workflows/run.yml` | Ensure it handles re-run dispatch |
| Modify | `src/init-autofix.ts` | Copy new templates during setup |
| Modify | `src/bundled-files.ts` | Bundle new templates |
| Create | `tests/scenario-evolution.test.ts` | Tests for new templates and bundling |

## Approach

All orchestration uses GitHub Actions `repository_dispatch` — no custom servers, no webhooks, no external services. This matches the existing Level 5 architecture validated in the Pipit trial.

The scenario agent runs via `claude -p` (Claude Code CLI) in GitHub Actions, same as the autofix agent. Key differences:
- Autofix agent reads CI failure output and fixes code
- Scenario agent reads specs and writes/updates tests

The prompt template is the critical piece. It must clearly establish:
- The agent's role (QA engineer, not developer)
- What it can see (specs, existing tests)
- What it cannot do (access source code, import modules from parent repo)
- The triage decision tree (skip / new / update)
- Output format (test files using the project's test framework)

### Pipit Trial Fixes (carried forward)

- No `--model` flag with `claude -p`
- Single `env:` block per workflow step (no duplicates)
- `repository_dispatch` for all cross-repo communication
- GitHub App token via `actions/create-github-app-token@v1`

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Spec is purely internal (refactor, CI fix) | Scenario agent triages as "no changes needed", commits a skip note |
| Multiple specs pushed in one commit | Each spec processed individually in sequence |
| Scenario agent fails (API error, timeout) | Workflow posts failure comment, existing scenarios still protect PRs |
| Race condition: PR opens before scenarios ready | Existing tests run first; re-run fires when scenarios complete |
| Race condition: PR merges before re-run | New scenarios protect the next PR — max one cycle behind |
| Spec updates an existing feature | Scenario agent identifies overlapping tests, updates them |
| Scenarios repo has no existing tests yet | Agent creates the first test file, no triage against existing tests needed |
| Spec file is deleted (not added/modified) | Spec dispatch workflow filters to added/modified only — deletions are ignored. Existing scenario tests remain. |
| No open PRs when scenarios-updated fires | Re-run workflow exits cleanly as a no-op |
| Scenario agent writes a flaky test | Out of scope — handled by the existing autofix loop on subsequent PRs |
