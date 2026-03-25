# Autofix Workflow Templates — Atomic Spec

> **Parent:** docs/research/autofix-loop-closing.md
> **Status:** Ready (updated with Pipit trial fixes 2026-03-25)
> **Date:** 2026-03-24
> **Estimated scope:** 1 session / 4 files / ~200 lines
> **Depends on:** github-app-registration (need App ID)

---

## What

Create GitHub Actions workflow templates that Joycraft copies into user projects during `init-autofix`. These templates implement the full auto-fix loop: CI failure detection → Claude fix → push → re-run.

## Why

The autofix loop requires specific workflow YAML that's non-trivial to write from scratch. Shipping tested templates means users copy-paste and configure, not design CI architecture.

## Acceptance Criteria

- [ ] `src/templates/workflows/autofix.yml` — main autofix workflow triggered by `workflow_run`
- [ ] `src/templates/workflows/scenarios-dispatch.yml` — dispatch trigger to scenarios repo (added to user's CI)
- [ ] Autofix workflow:
  - Triggers on `workflow_run` completion with `conclusion: failure`
  - Only runs if the triggering workflow was on a PR
  - Generates GitHub App installation token via `actions/create-github-app-token`
  - Checks out PR branch with App token
  - Counts previous autofix attempts (max 3)
  - Runs `claude -p` with failure context
  - Commits and pushes with App token
  - Posts summary comment on PR
  - On max iterations exceeded: posts "human review needed" comment
- [ ] Scenarios dispatch template:
  - Fires `repository_dispatch` to `{owner}/{repo}-scenarios` after CI passes
  - Passes PR number, branch, SHA in payload
- [ ] Templates are parameterized (user fills in repo name, app ID)
- [ ] Templates include comments explaining each step
- [ ] Build passes, tests pass

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/workflows/autofix.yml` | Autofix workflow template |
| Create | `src/templates/workflows/scenarios-dispatch.yml` | Scenarios trigger template |
| Modify | `src/bundled-files.ts` | Include workflow templates |

## Approach

Templates use `$JOYCRAFT_APP_ID` and `$SCENARIOS_REPO` as placeholders that `init-autofix` replaces with actual values.

The autofix workflow uses:
- `actions/create-github-app-token@v1` for App token generation
- `claude -p` (Claude Code CLI) for the fix — NOT `claude-code-action`
- Iteration counting via `git log --oneline | grep "^autofix:" | wc -l`
- `--max-turns 20` for cost control (do NOT use `--model` flag — Claude CLI has its own model resolution)

## Pipit Trial Fixes (apply to templates)

These issues were found during the live Pipit trial on 2026-03-25:

1. **No duplicate `env:` blocks** — YAML rejects two `env:` keys on the same step. Merge all env vars into a single `env:` block.
2. **Do NOT use `--model` with `claude -p`** — Claude Code CLI is not an API wrapper. It has its own model management. Passing `--model claude-sonnet-4-6-20250514` causes an error. Just omit `--model`.
3. **All workflows must be on `main` branch** — `repository_dispatch` only triggers workflows on the default branch. Templates must include a note about this.
4. **`pnpm/action-setup` + `packageManager` conflict** — If the project has `"packageManager"` in package.json, don't set explicit `version:` in the action. Pick one, not both.
5. **`repository_dispatch` trigger uses different approach than `workflow_run`** — The Pipit trial used `repository_dispatch` (scenarios repo dispatches `scenario-failed` to main repo) rather than `workflow_run`. This works and carries context via `client_payload`. The spec originally suggested `workflow_run` but `repository_dispatch` is what was validated in production.

## Validated Architecture (from Pipit trial)

```
PR → CI passes → dispatch to scenarios repo (repository_dispatch)
→ Scenarios run → FAIL → post comment + dispatch scenario-failed to main repo
→ autofix.yml triggers (repository_dispatch) → generate App token
→ checkout PR branch → claude -p with failure context → fix → push
→ Push triggers CI (different identity) → CI passes → scenarios pass
→ ~3 minutes total, zero human intervention
```

App ID for Joycraft Autofix: **3180156** (hardcode in templates)

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| CI fails for reasons unrelated to code (network, runner issues) | Claude reads the error, determines it's not a code issue, posts "infrastructure failure, not a code bug" |
| PR has merge conflicts | Checkout fails gracefully, posts "merge conflicts, please resolve manually" |
| Claude can't fix the issue in 3 attempts | Posts detailed summary of what was tried, labels PR as needs-human-review |
| Multiple PRs fail simultaneously | Each autofix runs in its own workflow, concurrency group per PR |
