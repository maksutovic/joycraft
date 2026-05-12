---
name: joycraft-session-end
description: Wrap up a session — capture discoveries, verify, prepare for PR or next session
instructions: 22
---

# Session Wrap-Up

Before ending this session, complete these steps in order.

## 1. Capture Discoveries

**Why:** Discoveries are the surprises — things that weren't in the spec or that contradicted expectations. They prevent future sessions from hitting the same walls.

Check: did anything surprising happen during this session? If yes, create or update a discovery file at `docs/discoveries/YYYY-MM-DD-topic.md`. Lazy-create the `docs/discoveries/` directory if it doesn't exist.

(Discoveries stay flat at `docs/discoveries/` rather than per-feature, since they often span features and are read serendipitously rather than via a known path.)

The discovery file MUST start with YAML frontmatter — the 4-field personal schema:

```yaml
---
status: active
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug-of-related-feature>   # omit if not feature-tied
---
```

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist.

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

When you UPDATE a context doc, also bump (or add) its YAML frontmatter — the 2-field shared schema:

```yaml
---
last_updated: YYYY-MM-DD
last_updated_by: <resolved name>
---
```

If the file already has the frontmatter, update the `last_updated` and `last_updated_by` fields in place. If it doesn't, prepend a fresh block. Context docs are *shared* artifacts (no single owner) — the shared schema reflects that.

Skip this if nothing applies. Don't force it — only update when there's genuine new context.

## 2. Run Validation

Run the project's validation commands. Check CLAUDE.md for project-specific commands. Common checks:

- Type-check (e.g., `tsc --noEmit`, `mypy`, `cargo check`)
- Tests (e.g., `npm test`, `pytest`, `cargo test`)
- Lint (e.g., `eslint`, `ruff`, `clippy`)

Fix any failures before proceeding.

## 3. Update Spec Status

If working from an atomic spec in `docs/features/<slug>/specs/` (or the legacy `docs/specs/<area>/` for bugfixes — scan recursively):
- All acceptance criteria met — update the spec's frontmatter `status:` to reflect completion (e.g., `shipped`) and the body's Status field to `Complete`
- Partially done — leave `status: active` and update the body's Status field to `In Progress`, note what's left

If working from a Feature Brief at `docs/features/<slug>/brief.md`, check off completed specs in the decomposition table.

## 4. Commit

Commit all changes including the discovery file (if created) and spec status updates. The commit message should reference the spec if applicable.

## 5. Push and PR (if autonomous git is enabled)

**Check CLAUDE.md for "Git Autonomy" in the Behavioral Boundaries section.** If it says "STRICTLY ENFORCED" or the ALWAYS section includes "Push to feature branches immediately after every commit":

1. **Push immediately.** Run `git push origin <branch>` — do not ask, do not hesitate.
2. **Open a PR if the feature is complete.** Check the parent Feature Brief's decomposition table — if all specs are done, run `gh pr create` with a summary of all completed specs. Do not ask first.
3. **If not all specs are done,** still push. The PR comes when the last spec is complete.

If CLAUDE.md does NOT have autonomous git rules (or has "ASK FIRST" for pushing), ask the user before pushing.

## 6. Report and Hand Off

```
Session complete.
- Spec: [spec name] — [Complete / In Progress]
- Build: [passing / failing]
- Discoveries: [N items / none]
- Pushed: [yes / no — and why not]
- PR: [opened #N / not yet — N specs remaining]
- Next: [what the next session should tackle]
```

End with the canonical Handoff block. Include any discovery and updated-context paths produced.

## Recommended Next Steps

Next:
```bash
/joycraft-implement docs/features/<slug>/specs/<next-spec>.md
```
Run /clear first.

If all specs in the feature are complete, hand off to a feature-level wrap-up instead (PR review, etc.) — the Handoff block is just the slash command for whatever the next move is.
