# Update Mermaid Workflow Diagram — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
> **Status:** Ready
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 1 file / ~20 lines changed

---

## What

Update the mermaid workflow diagram in README.md to show both the fast path (brief → decompose) and the full path (brief → research → design → decompose). The diagram should make it clear that research and design are recommended for complex features, with the fast path available for simple/clear-scope work.

## Why

The current diagram shows a single linear flow that includes research and design but labels them as "(optional)". This doesn't communicate when to use them. The updated diagram should show two clear paths so users understand the decision point.

## Acceptance Criteria

- [ ] Mermaid diagram shows two paths diverging after the Feature Brief
- [ ] Fast path: Brief → Decompose → Specs → Execute → Session End
- [ ] Full path: Brief → Research → Design → Decompose → Specs → Execute → Session End
- [ ] Diagram includes a decision node or annotation indicating when to use which path (e.g., "complex feature?" or annotation text)
- [ ] Interview still feeds into Brief as the starting point
- [ ] Diagram renders correctly on GitHub (valid mermaid syntax)
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid mermaid syntax | Paste diagram into mermaid.live — renders without errors | manual review |
| Two paths visible | Visual inspection — both fast and full paths are distinguishable | manual review |
| Decision point clear | Annotation or node explains when to use each path | manual review |
| Build passes | `pnpm build` succeeds | integration |

**Smoke test:** Paste mermaid block into https://mermaid.live — visual verification.

## Constraints

- MUST: Keep the diagram readable (not too many nodes or crossing lines)
- MUST: Show interview as the entry point
- MUST: Show session-end as the exit point
- MUST NOT: Remove any existing nodes — only add paths and annotations
- MUST NOT: Exceed ~20 lines of mermaid code (keep it scannable)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `README.md` | Replace existing mermaid diagram with updated two-path version |

## Approach

Use a mermaid flowchart with a decision diamond after "Feature Brief" that branches into:
- "Simple/clear scope" → Decompose
- "Complex/unfamiliar" → Research → Design → Decompose

Both paths converge at Decompose → Specs → Execute → Session End. Use styling to visually distinguish the two paths (e.g., different colors for the research/design nodes as in the current diagram).

**Alternative rejected:** Two separate diagrams (one for simple, one for complex). Rejected because a single diagram with branching is more informative — it shows the relationship between the paths and makes the decision point explicit.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| GitHub dark mode | Mermaid styling uses named colors that work in both light and dark themes |
| Very small screen | Diagram is simple enough (~10 nodes) to render on mobile GitHub |
