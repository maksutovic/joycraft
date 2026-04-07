# Extract README Deep Content — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-readme-and-workflow-improvements.md`
> **Status:** Ready
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / ~8 files / README from 376 → ~150 lines

---

## What

Move the deep methodology and philosophy content from README.md into dedicated files in `docs/guides/`. The README keeps a one-liner + link for each moved section. After this change, the README is ~150 lines: banner, tagline, quick start, skill list, workflow diagram, upgrade instructions, contributing, Shoulders of Giants, and license.

## Why

The README is 376 lines and front-loads philosophy before actionable content. New users scroll past 200+ lines of methodology to find the quick start. Top OSS projects (shadcn/ui, Turborepo, tRPC) put actionable content first and deep content in docs.

## Acceptance Criteria

- [ ] README.md is ~150 lines (120-180 acceptable range)
- [ ] The following sections are moved to `docs/guides/` files:
  - "The Interview: Why It Matters" → `docs/guides/interview-workflow.md`
  - "Research Isolation & Design Checkpoints" → `docs/guides/research-and-design.md`
  - "Test-First Development" → `docs/guides/test-first-development.md`
  - "Level 5: The Autonomous Loop" → `docs/guides/level-5-autonomy.md` (already exists — merge or replace)
  - "Tuning: Risk Interview & Git Autonomy" → `docs/guides/tuning.md`
  - "Claude Code Permission Modes" → `docs/guides/permission-modes.md`
  - "How It Works with AI Agents" → `docs/guides/agent-compatibility.md`
  - "Why This Exists" + "The methodology" → `docs/guides/methodology.md`
- [ ] Each moved section has a one-liner + link stub in the README (e.g., "Learn about the interview workflow → [Interview Guide](docs/guides/interview-workflow.md)")
- [ ] "Standing on the Shoulders of Giants" section stays in README (not moved)
- [ ] "Quick Start" section stays in README
- [ ] "Upgrade" section stays in README
- [ ] "Contributing" section stays in README
- [ ] No content is deleted — everything is preserved in docs/guides/
- [ ] All internal links in moved content still work (relative paths adjusted)
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| README line count | `wc -l README.md` returns 120-180 | integration |
| All guide files exist | Glob `docs/guides/*.md` returns all expected files | integration |
| No content deleted | Diff total content (README + guides) against original README — all content preserved | manual review |
| Links work | Each one-liner stub in README links to an existing file | manual review |
| Build passes | `pnpm build` succeeds | integration |

**Smoke test:** `wc -l README.md` — confirms the README is in the target range.

## Constraints

- MUST: Preserve ALL content — move, never delete
- MUST: Keep "Shoulders of Giants" in README
- MUST: Keep Quick Start, Upgrade, Contributing, License in README
- MUST: Each guide file is self-contained and readable without the README
- MUST NOT: Change the post-init flow
- MUST NOT: Modify any code files — this is a docs-only change

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `README.md` | Remove deep sections, replace with one-liner + link stubs |
| Create | `docs/guides/interview-workflow.md` | Interview content from README |
| Create | `docs/guides/research-and-design.md` | Research isolation & design checkpoints content |
| Create | `docs/guides/test-first-development.md` | Test-first development content |
| Modify | `docs/guides/level-5-autonomy.md` | Merge README Level 5 section with existing guide (existing guide takes precedence on conflicts) |
| Create | `docs/guides/tuning.md` | Tuning/risk interview/git autonomy content |
| Create | `docs/guides/permission-modes.md` | Permission modes content |
| Create | `docs/guides/agent-compatibility.md` | "How It Works with AI Agents" + team sharing content |
| Create | `docs/guides/methodology.md` | "Why This Exists" + "The methodology" content |

## Approach

1. Read the full README and identify section boundaries
2. For each section to move: copy the content verbatim into a new guide file with a title header and brief intro
3. Replace the moved section in README with a one-liner description + link
4. Adjust any relative links in moved content (e.g., image paths)
5. Verify `docs/guides/level-5-autonomy.md` already exists — merge the README's Level 5 section with it rather than overwriting

**Alternative rejected:** Creating a single `docs/guides/README-deep-dive.md` mega-file. Rejected because per-topic files are more discoverable and linkable, matching the existing `docs/guides/` pattern.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/guides/level-5-autonomy.md` already has content | Merge README content into existing file; existing guide content takes precedence on overlap |
| README has inline images | Adjust relative paths in guide files (e.g., `../joycraft-banner.png` → `../joycraft-banner.png` may need path update) |
| Mermaid diagrams in moved content | Preserve as-is in guide files — mermaid renders in GitHub markdown |
| Links between moved sections | Update to cross-reference guide files (e.g., methodology links to interview guide) |
