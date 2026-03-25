# Closing the Auto-Fix Loop — Research Synthesis

**Date:** 2026-03-24
**Status:** Research complete, specs ready for implementation
**Panel:** MVP Hacker, Biz Dev, AI Futurist, Senior Architect

---

## The Problem

External holdout scenarios detect failures, post results to PRs, but the loop doesn't close — no agent automatically fixes the code and pushes.

## Failed Attempts

1. **`issue_comment` trigger** — GitHub anti-recursion blocks same-PAT-owner comments from triggering workflows
2. **`@claude` GitHub App** — Reacted with eyes emoji but never executed
3. **`repository_dispatch` + `claude-code-action`** — 401 auth error, action expects PR context that dispatch doesn't provide

## Root Cause

GitHub Actions prevents same-identity actions from triggering new workflows. This is anti-recursion protection, not a bug. The solution is a **separate identity** for the fix agent.

## Winning Architecture: GitHub App + `workflow_run` + Claude CLI

```
Scenarios post FAIL comment on PR
    ↓
workflow_run triggers on CI completion (conclusion: failure)
    ↓
Autofix workflow:
  1. Generate GitHub App installation token (separate identity)
  2. Checkout PR branch with App token
  3. Run `claude -p` with failure context
  4. Commit + push with App token (triggers CI re-run)
  5. Loop up to 3 iterations
    ↓
CI re-runs → scenarios re-run → pass → PR is green
```

### Why This Wins

- **`workflow_run`** natively carries PR context from the triggering workflow — no manual payload
- **GitHub App** is a proper bot identity — pushes trigger CI, not blocked by anti-recursion
- **Claude CLI** (`claude -p`) gives full Claude Code capability — reads files, edits, runs tests
- **No server needed** — everything runs in GitHub Actions
- **Scales to any project** — create app once, install on any repo

### Why Not the Alternatives

| Approach | Problem |
|----------|---------|
| Second PAT / bot account | Requires creating fake GitHub accounts — not reproducible |
| `claude-code-action` | Expects PR context for auth, fails on `repository_dispatch` |
| `@claude` GitHub App | Unreliable, not configurable, no loop control |
| Vercel function | Extra infrastructure to maintain |
| Polling cron | Up to 5min delay, burns Actions minutes |

## The Managed Joycraft App Model

**For Joycraft users, we host a shared GitHub App:**

1. User installs "Joycraft Autofix" app on their repo (1 click)
2. Adds `ANTHROPIC_API_KEY` to repo secrets
3. Runs `npx joycraft init-autofix` (copies workflow templates)

**Security:** The app registration is just a permission template. No server, no webhook, no data flows to us. All execution happens inside the user's own GitHub Actions runner. We never see their code, secrets, or API keys.

```
Joycraft side:              User's side:
┌──────────────┐            ┌─────────────────────────┐
│ GitHub App   │            │ Their repo              │
│ registration │  install   │ .github/workflows/      │
│ (permission  │ ────────>  │   autofix.yml           │
│  template)   │            │ Secrets: APP_ID,        │
│ NO server    │            │   APP_KEY, ANTHROPIC_KEY│
│ NO data      │            │ All execution HERE      │
└──────────────┘            └─────────────────────────┘
```

## Loop Controls

- **Max iterations:** 3 autofix attempts per PR (counted via commit messages)
- **Cost cap:** `--max-turns 20` per Claude invocation (~$2-5 per attempt)
- **Model:** Claude Sonnet for fixes (fast, cheap, sufficient for CI failures)
- **Human escape:** After 3 attempts, posts "Autofix exhausted. Requesting human review."
- **Kill switch:** Remove `ANTHROPIC_API_KEY` or disable workflow
- **Path denylist:** Never modify `.github/workflows/`, `Dockerfile`, lock files

## Cost Estimate

Solo dev (~10 PRs/month, ~30% fail): **~$10-30/month** in Claude API usage.

## Sources

- Panel research: MVP Hacker, Biz Dev (managed products), AI Futurist, Senior Architect
- GitHub docs: workflow_run, GitHub Apps, installation tokens
- Anthropic docs: claude-code-action, Claude CLI
