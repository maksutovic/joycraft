---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-23
source: docs/features/2026-09-22-fable-native-sdlc-harness/checkpoint-decide.html
---

# Operator checkpoint step for joycraft-implement-feature

When a spec queue stalls on steps only the human can take (labels, URL approvals, rulings), the driver publishes one interactive checkpoint for all the stops instead of ending with a terminal list, then reads the answers back and continues the queue.

**Why deferred (decision C1, 2026-09-23):** a hard stop inside implement-feature means the interview, brief, or design gate failed upstream. Only a catastrophe should stop the flow. Build this when a real queue shows a human-only step the upstream gates could not have caught.

**Schema sketch:** each spec that carries a human-only step declares it in frontmatter, so the page is generated from the specs and the read-back is mechanical.

```yaml
operatorStep:
  kind: labels | urls | ruling
  collection: <db collection the page writes>
  outputFile: docs/features/<slug>/reports/<name>.json
  validator: <command that accepts or rejects the answers>
```

**Read-back:** answers land in `docs/features/<slug>/reports/`, rulings stamp into the brief's `decisions:` frontmatter and `docs/context/decision-log.md`. Every option on the page must be one the validator accepts (lesson 2 in `docs/templates/reference/interactive-checkpoint.md`).

**Related:** docs/backlog/2026-09-23-checkpoint-non-claude-harnesses.md, docs/templates/CHECKPOINT_TEMPLATE.html.
