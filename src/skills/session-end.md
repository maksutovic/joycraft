---
name: session-end
description: Wrap up a session — capture discoveries, verify, prepare for PR or next session
---

# Session Wrap-Up

Before ending this session, complete these steps in order.

## 1. Capture Discoveries

**Why:** Discoveries are the surprises — things that weren't in the spec or that contradicted expectations. They prevent future sessions from hitting the same walls.

Check: did anything surprising happen during this session? If yes, create or update a discovery file at `docs/discoveries/YYYY-MM-DD-topic.md`. Create the `docs/discoveries/` directory if it doesn't exist.

Only capture what's NOT obvious from the code or git diff:
- "We thought X but found Y" — assumptions that were wrong
- "This API/library behaves differently than documented" — external gotchas
- "This edge case needs handling in a future spec" — deferred work with context
- "The approach in the spec didn't work because..." — spec-vs-reality gaps
- Key decisions made during implementation that aren't in the spec

**Do NOT capture:**
- Files changed (that's the diff)
- What you set out to do (that's the spec)
- Step-by-step narrative of the session (nobody re-reads these)

Use this format:

```markdown
# Discoveries — [topic]

**Date:** YYYY-MM-DD
**Spec:** [link to spec if applicable]

## [Discovery title]
**Expected:** [what we thought would happen]
**Actual:** [what actually happened]
**Impact:** [what this means for future work]
```

If nothing surprising happened, skip the discovery file entirely. No discovery is a good sign — the spec was accurate.

## 2. Run Validation

Run the project's validation commands. Check CLAUDE.md for project-specific commands. Common checks:

- Type-check (e.g., `tsc --noEmit`, `mypy`, `cargo check`)
- Tests (e.g., `npm test`, `pytest`, `cargo test`)
- Lint (e.g., `eslint`, `ruff`, `clippy`)

Fix any failures before proceeding.

## 3. Update Spec Status

If working from an atomic spec in `docs/specs/`:
- All acceptance criteria met — update status to `Complete`
- Partially done — update status to `In Progress`, note what's left

If working from a Feature Brief in `docs/briefs/`, check off completed specs in the decomposition table.

## 4. Commit

Commit all changes including the discovery file (if created) and spec status updates. The commit message should reference the spec if applicable.

## 5. Report

```
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Next: [what the next session should tackle, or "ready for PR"]
```
