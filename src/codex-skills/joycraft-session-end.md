---
name: joycraft-session-end
description: Wrap up a session — capture discoveries, verify, prepare for PR or next session
---

# Session Wrap-Up — Feature Finisher

This is the **once-per-feature finisher** — the heavy bookend that runs **once**, when the feature's specs are done, not after every spec. It is the **only validation gate** in the loop and the single place that pushes and opens the PR.

> **Two-tier wrap-up.** The light per-spec step is `$joycraft-spec-done` (status bump `todo → in-review` + commit, no validation/push/PR — it runs after each spec). This skill is the heavy counterpart: full validation, consolidate the discovery stubs spec-done left behind, graduate every `in-review` spec to `done`, push, and open the PR. See `docs/reference/spec-status-lifecycle.md` for the `todo → in-review → done` lifecycle.

Complete these steps in order.

## 1. Consolidate Discoveries

**Why:** Discoveries are the surprises — things that weren't in the spec or that contradicted expectations. They prevent future sessions from hitting the same walls.

This is the **consolidation** pass: `$joycraft-spec-done` may have left terse 2-line discovery **stubs** during the feature (one per surprising spec). Curate and expand those stubs into proper discovery docs now, and capture anything else surprising from the feature as a whole. If any stubs exist at `docs/discoveries/`, consolidate them (merge related ones, expand each into the full format below); then create or update a discovery file at `docs/discoveries/YYYY-MM-DD-topic.md`. Create the `docs/discoveries/` directory if it doesn't exist.

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

If nothing surprising happened (no stubs, no surprises), skip the discovery file entirely. No discovery is a good sign — the spec was accurate.

## 1b. Update Context Documents

If `docs/context/` exists, quickly check whether this session revealed anything about:

- **Production risks** — did you interact with or learn about production vs staging systems? Update `docs/context/production-map.md`
- **Wrong assumptions** — did you assume something that turned out to be false? Update `docs/context/dangerous-assumptions.md`
- **Key decisions** — did you make an architectural or tooling choice? Add a row to `docs/context/decision-log.md`
- **Unwritten rules** — did you discover a convention or constraint not documented anywhere? Update `docs/context/institutional-knowledge.md`

Skip this if nothing applies. Don't force it — only update when there's genuine new context.

## 2. Run Validation — the ONLY validation gate

This is **mandatory** and it is the **only** validation gate in the loop: `$joycraft-spec-done` deliberately skips validation (it trusts implement's per-spec TDD), so this feature-level run is the single cross-spec safety net. Never skip it.

Run the project's validation commands. Check CLAUDE.md or AGENTS.md for project-specific commands. Common checks:

- Type-check (e.g., `tsc --noEmit`, `mypy`, `cargo check`)
- Tests (e.g., `npm test`, `pytest`, `cargo test`)
- Lint (e.g., `eslint`, `ruff`, `clippy`)

Fix any failures before proceeding. **If validation fails, stop — do NOT graduate specs to `done` and do NOT push.**

## 3. Graduate Specs `in-review → done`

This step graduates the feature's finished specs to their terminal state. Because session-end runs once at the end, **multiple specs may be waiting** in `in-review` (one per spec the loop completed via `$joycraft-spec-done`). Graduate **all** of them, in **both** systems (the queue JSON and the frontmatter must never disagree):

For each spec in `docs/features/<slug>/specs/` (or `docs/bugfixes/<area>/` for bugfixes — scan recursively) whose status is `in-review`:

1. **Queue JSON** — `joycraft-mark-done <spec-id> --to done <specs-dir>` (the `--to done` graduation; find `<spec-id>` by matching the entry's `file`).
2. **Frontmatter** — edit the spec file's YAML `status:` to `done`.

Rules:
- Only graduate specs that are `in-review`. A spec still at `todo` was never started — **leave it `todo` and report it as remaining** (the feature isn't fully done; see the PR gate in step 5).
- Never write `done` for work nothing has validated — this validation run (step 2) is what licenses the graduation. (Once `verify-in-loop` ships, an independent verify performs the `in-review → done` transition; until then, this step does.)
- `done` means **verified**, not **merged**. A merged PR is a git fact, never a spec status — do not invent a `merged` status or any fourth state beyond `todo`/`in-review`/`done`.

If working from a Feature Brief at `docs/features/<slug>/brief.md`, also check off completed specs in the decomposition table.

## 4. Commit

Commit all changes including the discovery file (if created) and spec status updates. The commit message should reference the spec if applicable.

## 5. Push and PR (if autonomous git is enabled)

**Check CLAUDE.md or AGENTS.md for "Git Autonomy" in the Behavioral Boundaries section.** If it says "STRICTLY ENFORCED" or the ALWAYS section includes "Push to feature branches immediately after every commit":

1. **Push immediately.** Run `git push origin <branch>` — do not ask, do not hesitate.
2. **Open a PR if the feature is complete.** The feature is complete when every spec is `done` (none left at `todo`/`in-review`). Check the queue JSON / decomposition table — if all specs are `done`, run `gh pr create` with a summary of all completed specs. Do not ask first.
3. **If specs remain (`todo`),** still push. The PR comes when the feature's last spec is graduated.

If CLAUDE.md or AGENTS.md does NOT have autonomous git rules (or has "ASK FIRST" for pushing), ask the user before pushing.

## 6. Report

```
Feature complete.
- Feature: [slug]
- Specs graduated to done: [N] (remaining at todo: [N])
- Build: [passing / failing]
- Discoveries: [N consolidated / none]
- Pushed: [yes / no — and why not]
- PR: [opened #N / not yet — N specs remaining]
- Next: [what comes after this feature]

Run /clear before your next step — your artifacts are saved to files.
```
