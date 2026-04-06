---
name: joycraft-session-end
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

## 1b. Update Context Documents

If `docs/context/` exists, quickly check whether this session revealed anything about:

- **Production risks** — did you interact with or learn about production vs staging systems? → Update `docs/context/production-map.md`
- **Wrong assumptions** — did the agent (or you) assume something that turned out to be false? → Update `docs/context/dangerous-assumptions.md`
- **Key decisions** — did you make an architectural or tooling choice? → Add a row to `docs/context/decision-log.md`
- **Unwritten rules** — did you discover a convention or constraint not documented anywhere? → Update `docs/context/institutional-knowledge.md`

Skip this if nothing applies. Don't force it — only update when there's genuine new context.

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

## 5. Push and PR (if autonomous git is enabled)

**Check CLAUDE.md for "Git Autonomy" in the Behavioral Boundaries section.** If it says "STRICTLY ENFORCED" or the ALWAYS section includes "Push to feature branches immediately after every commit":

1. **Push immediately.** Run `git push origin <branch>` — do not ask, do not hesitate.
2. **Open a PR if the feature is complete.** Check the parent Feature Brief's decomposition table — if all specs are done, run `gh pr create` with a summary of all completed specs. Do not ask first.
3. **If not all specs are done,** still push. The PR comes when the last spec is complete.

If CLAUDE.md does NOT have autonomous git rules (or has "ASK FIRST" for pushing), ask the user before pushing.

## 6. Report

```
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Pushed: [yes / no — and why not]
- PR: [opened #N / not yet — N specs remaining]
- Next: [what the next session should tackle]
```
