---
name: release-docs-sync
description: Joycraft maintainers only — before opening a PR, check whether this branch's changes need CHANGELOG.md, AGENTS.md, or README.md updates, and write the ones that do. Run at PR time, not merge time.
---

# Release Docs Sync (Joycraft Maintainers)

**This is a repo-local skill.** It is not part of the Joycraft product and does not ship to npm. It is committed by hand in `.claude/skills/release-docs-sync/` and `.agents/skills/release-docs-sync/`; keep the two copies identical. Do not reference it from anything under `payload/`.

Joycraft releases automatically after merges to `main`. That pipeline does not write explanatory prose, so docs drift silently unless the PR that changes behaviour also changes the docs.

Run this **before opening a PR**, while you still know what changed and why. After merge the version is already cut and the context is gone. `scripts/check-docs-sync.mjs` (a PreToolUse hook and the Docs Sync CI check) blocks a PR that changes `src/`, `scripts/` or `payload/` without a CHANGELOG.md change or a `Docs: none — <reason>` line in its body.

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

The file states its own rule: it records the releases that changed how Joycraft *works*, not every published version.

Add an entry when the branch changes what a user experiences:

- A new or removed skill, or a materially different workflow through an existing one
- A new host, or a change to what `init` or `update` writes into a project
- A changed default, a migration, or anything that alters an existing install on update
- A fix for behaviour users could have observed and built around

Skip when the change is internal: refactors, test-only work, CI, or docs.

Match the existing format — `## <version> — <Title>`, newest first, written as before → now → side effects. Prose, not a bullet dump of commits. If the version is not cut yet, use an Unreleased entry; do not invent a version for the feature PR.

### AGENTS.md

This is the shared agent-instruction file (`CLAUDE.md` imports it). Update it when the branch changes something it describes:

- **Behavioral Boundaries** — a new ALWAYS / ASK FIRST / NEVER rule the branch establishes, or one it makes false
- **Commands** — a changed build, test or typecheck command
- **Context Map** — a page that moved, or a new page an agent must read for a kind of task

When the branch moves or adds a top-level folder, update `docs/context/architecture.md` too.

### README.md

User-facing entry point. Update it when the branch changes:

- Supported hosts, or what lands where in a user's project
- CLI commands, flags, or their behaviour
- The skill list, or the workflow the README walks through

## Step 3: Write the Updates

Write them directly — do not summarize what you would write and stop.

Match each file's established voice. The CHANGELOG is narrative prose explaining *why* a change matters. `AGENTS.md` is terse and directive. The README is instructional. Read the surrounding lines before adding to any of them.

## Step 4: Report

State plainly which files you updated and which you deliberately skipped, with the reason:

```
CHANGELOG.md  — added an Unreleased entry (update now writes a new file)
AGENTS.md     — no change needed (no new rule or command)
README.md     — no change needed (no user-facing CLI or workflow change)
```

If you updated nothing, say that and why. A branch that genuinely needs no doc changes is the common case, not a failure.
