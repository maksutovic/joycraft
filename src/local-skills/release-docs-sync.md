---
name: release-docs-sync
description: Joycraft maintainers only — before opening a PR, check whether this branch's changes need CHANGELOG.md, AGENTS.md, or README.md updates, and write the ones that do. Run at PR time, not merge time.
---

# Release Docs Sync (Joycraft Maintainers)

**This is a repo-local skill.** It is not part of the Joycraft product and does not ship to npm — it lives in `src/local-skills/` and exists only to maintain Joycraft's own documentation. Do not reference it from any skill under `src/skills/`.

Joycraft auto-publishes on every merge to `main`, patch-bumping when the version wasn't set manually. Nothing in that pipeline touches prose. Docs therefore drift silently: by 0.7.4 the CHANGELOG still stopped at 0.7.1, and `{{boundary_file}}`'s architecture map never learned that `src/copilot-skills/` existed.

Run this **before opening a PR**, while you still know what changed and why. After merge the version is already cut and the context is gone.

## Step 1: Read the Branch

Get the actual diff against `main` — never guess from memory:

```
git diff main...HEAD --stat
git log main..HEAD --oneline
```

Read the diff for anything you are unsure about. What matters is not how many files moved but whether the *contract with users* changed.

## Step 2: Decide What Each Doc Needs

Judge each independently. Most PRs need none of them, and saying so is a valid outcome — inventing an entry to look thorough is worse than skipping one.

### CHANGELOG.md

The file states its own rule: it records "the releases that changed how Joycraft *works*," not every published version. Many patch versions exist between entries by design.

Add an entry when the branch changes what a user experiences:

- A new or removed skill, or a materially different workflow through an existing one
- A new harness, or a change to what `init`/`upgrade` writes into a project
- A changed default, a migration, or anything that alters an existing install on upgrade
- A fix for behavior users could have observed and built around

Skip when the change is internal: refactors, test-only work, generated-file regeneration, CI, or docs.

Match the existing format — `## <version> — <Title> (<date>)`, newest first, written as before → now → side-effects. Prose, not a bullet dump of commits. If the version isn't cut yet (it won't be — publish bumps on merge), use the version this PR will produce and say so in the PR body.

### {{boundary_file}}

This is the shared agent-instruction file. Update when the branch changes something it describes:

- **Architecture map** — a new or removed directory under `src/`, `scripts/`, or `docs/`
- **Key Files table** — a file whose role changed, or a new load-bearing one
- **Behavioral Boundaries** — a new ALWAYS/ASK FIRST/NEVER rule the branch establishes
- **Spec Status table** — specs that moved phase or status

The architecture map is the row most often missed, because adding a directory rarely feels like a documentation change. It is.

### README.md

User-facing entry point. Update when the branch changes:

- Installed harnesses, or what lands where in a user's project
- CLI commands, flags, or their behavior
- The skill list, or the workflow the README walks through

## Step 3: Write the Updates

Write them directly — do not summarize what you would write and stop.

Match each file's established voice. The CHANGELOG is narrative prose explaining *why* a change matters. `{{boundary_file}}` is terse and directive. The README is instructional. Read the surrounding lines before adding to any of them.

Follow the repo's style contract in `docs/templates/reference/output-style.md`.

## Step 4: Report

State plainly which files you updated and which you deliberately skipped, with the reason:

```
CHANGELOG.md  — added 0.7.5 entry (new harness changes what init writes)
{{boundary_file}}     — added src/local-skills/ to architecture map
README.md     — no change needed (no user-facing CLI or workflow change)
```

If you updated nothing, say that and why. A branch that genuinely needs no doc changes is the common case, not a failure.
