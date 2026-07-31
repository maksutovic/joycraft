---
status: done
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Restructure Public Docs — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / README.md + SECURITY.md + linked docs / ~200 lines moved, ~40 new

---

## What

The public README is restructured to lead with what Joycraft is (2–3 sentences), the install command, and a table of contents; the long exposition (methodology, level model, architecture detail) moves to linked docs under `docs/`, including a clearer setup walkthrough section (the setup-steps confusion from the 2026-07-31 feedback). A thin `SECURITY.md` is added at the repo root answering the enterprise "how do I keep this from going rogue" question: what Joycraft does and doesn't execute, the boundary/deny-pattern model, and pointers to Claude Code's own safety documentation.

## Why

Enterprise evaluators bounce off a README that buries `npx joycraft init` below long exposition, and there is no SECURITY.md to answer the first question security reviewers ask.

## Acceptance Criteria

- [ ] README's first screen contains: what-it-is (2–3 sentences), the install/quick-start command, and a TOC `[src: D7]`
- [ ] Moved exposition lives in linked docs under `docs/`; no content is deleted, only relocated and linked `[src: D7]`
- [ ] README includes or links a clearer setup walkthrough (the steps a new user actually runs, in order) `[src: brief "Raw Notes" — setup-steps feedback]`
- [ ] `SECURITY.md` exists at the repo root: thin, states Joycraft's execution model (scaffolds files, never runs user code at runtime), the boundaries/deny-pattern mechanism, and links to Claude Code's safety docs `[src: D7]`
- [ ] All intra-repo links in README and SECURITY.md resolve `[src: D7]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Install command on first screen | script check: `npx joycraft init` appears within the first 40 lines of README.md | unit |
| SECURITY.md exists with required sections | file-presence + heading assertions | unit |
| Links resolve | link-check over README.md + SECURITY.md relative links (test-local, no new dependency) | unit |
| No regression | `pnpm test && pnpm typecheck` stay green (docs-only change) | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the README first-40-lines assertion — instant.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: relocate, don't delete — every moved section gets a link from the README TOC or body `[src: D7]`
- MUST: keep SECURITY.md thin — a page, pointing outward, not a policy document `[src: D7]`
- MUST NOT: add dependencies for link-checking or TOC generation — plain test code only `[src: brief "Hard Constraints"]`
- MUST NOT: include methodology research, project assessments, or personal notes in the public docs `[src: brief "Hard Constraints"]`
- MUST NOT: touch `src/skills/` — this spec is docs-only, no sync-skills needed `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `README.md` | install-first restructure + TOC |
| Add | `SECURITY.md` | thin security posture doc |
| Add | `docs/` pages (e.g. `docs/reference/methodology.md`, `docs/reference/setup-walkthrough.md`) | relocated exposition |
| Add | test file for the docs assertions | coverage |

## Approach

Restructure top-down: first screen = value proposition + `npx joycraft init` + TOC; each subsequent README section either stays (if short and universally needed) or becomes a one-line TOC entry linking to a `docs/` page. SECURITY.md follows the common thin pattern: supported versions n/a, what the tool executes, the harness boundary model, reporting contact, links to Claude Code safety docs. Rejected alternative: a docs site generator — dependency and hosting surface this project explicitly avoids.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| npm README rendering (no relative-link base) | Use paths that resolve on both GitHub and npmjs.com, or absolute GitHub URLs for npm-critical links |
| Existing deep links into README anchors from external sources | Keep the old section names as headings in the linked docs so anchors remain findable |
| Claude Code safety-doc URLs change | SECURITY.md links to the stable docs root, not deep pages |
