# Tuning: Risk Interview & Git Autonomy

> [Back to README](../../README.md)

When `/joycraft-tune` runs for the first time, it does two things: a risk interview and git autonomy configuration.

## Risk interview

3-5 targeted questions about what's dangerous in your project (production databases, live APIs, secrets, files that should be off-limits). From your answers, Joycraft generates:

- **NEVER rules** for CLAUDE.md (e.g., "NEVER connect to production DB")
- **Deny patterns** for `.claude/settings.json` (blocks dangerous bash commands)
- **`docs/context/production-map.md`** documenting what's real vs. safe to touch
- **`docs/context/dangerous-assumptions.md`** documenting "Agent might assume X, but actually Y"

This takes 2-3 minutes and dramatically reduces the chance of your agent doing something catastrophic.

## Git autonomy

One question: **how autonomous should git be?**

- **Cautious** (default) commits freely but asks before pushing or opening PRs. Good for learning the workflow.
- **Autonomous** commits, pushes to feature branches, and opens PRs without asking. Good for spec-driven development where you want full send.

Either way, Joycraft generates explicit git boundaries in your CLAUDE.md: commit message format (`verb: message`), specific file staging (no `git add -A`), no secrets in commits, no force-pushing.
