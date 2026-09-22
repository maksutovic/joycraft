---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-22
source: docs/features/2026-09-22-fable-native-sdlc-harness/brief.md
---

# PR-review agent and REVIEW.md

A separate Claude Code instance reviews every PR against a root `REVIEW.md` contract (review passes for bugs, security, and compliance against the spec and plan; what "Important" means; a nit cap; do-not-report) and answers its own review comments. Findings flagged twice go into CLAUDE.md, matching add-fact's "mistake twice" rule.

**Why deferred:** REVIEW.md has value only when a reader exists; verify already checks against the spec. Both ship together, after the parent feature's hooks and evals land.

**Source:** Anthropic AI-native SDLC playbook, "AI in the PR review loop" lesson.
