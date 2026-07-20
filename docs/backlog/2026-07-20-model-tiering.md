---
status: backlog
owner: Maximilian Maksutovic
created: 2026-07-20
source: docs/features/2026-07-20-model-tiering/brief.md
target: living-harness / compound-engineering sprint
---

# Model tiering — right model, right stage, both harnesses

> **Deferred from:** the reading-fatigue sprint (dev/reading-fatigue), via the
> reject-framing escape on the feature's own decision dossier.
> **Why deferred:** Max's D1 rationale — routing should be **user-tuneable**,
> and tuneable routing is a configuration surface (state, overrides, upgrade
> behavior) that belongs to the living-harness sprint. Building inline-only now
> and rebuilding tuneable later churns ~24 synced skill files twice.

Full researched brief (tiering verified against Anthropic + OpenAI guidance,
locked tier maps, open D1–D3, assumptions manifest):
`docs/features/2026-07-20-model-tiering/brief.md`
Dossier: https://claude.ai/code/artifact/c2788be8-f425-4577-8b59-27da5e8da66f

**Carry-forward requirement:** whatever the living-harness sprint builds for
configuration must be able to express: per-stage model tiers (plan /
orchestrate / implement / verify), per-harness maps (Claude three-tier,
Codex Sol/Terra two-tier), tier-intent names alongside model IDs, and a
degradation ladder for plans without frontier access.
