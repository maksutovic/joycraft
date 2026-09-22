---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-22
source: docs/features/2026-09-22-fable-native-sdlc-harness/brief.md
---

# Maintenance loop: alert to self-generated intent

A deterministic detection script (rolling mean and sigma, no model) watches a metric. A `bands.yaml` sets tiers: one sigma logs, two sigma has Claude diagnose read-only, three sigma lets Claude propose a fix via PR or a pre-approved runbook. The diagnosis is written as an intent file in the standard shape, so it lands in the inbox and a human triages instead of initiates. Each shipped fix adds a permanent eval.

**Why deferred:** needs the intent inbox, triage, and evals-in-CI from the parent feature as prerequisites. This is the entry point of the headless north star; see docs/vision/headless-joycraft.md.

**Source:** Anthropic AI-native SDLC playbook, "Closing the loop on metrics" lesson.
