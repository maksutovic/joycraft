---
name: joycraft-collaborative-setup
description: Set up Joycraft for a team — scaffold per-area folders, owner conventions, and a team-facing CONTRIBUTING doc. Run once when adopting Joycraft on a multi-dev project.
---

# Collaborative Setup

You are setting up Joycraft for a team. Solo defaults stay solo; this skill adds the team-only ceremony — `docs/areas/` folders, area README/boundaries, and a thin team-facing CONTRIBUTING-joycraft doc.

This skill is **interactive** — ask the user, don't auto-detect.

## When to run

Run once when a team is adopting Joycraft on a multi-dev project. Solo users do **not** need this skill — solo defaults are fine without it.

## Step 1: Confirm Team Context

Ask the user:

> "Setting up Joycraft for a team? (vs. solo work) If you're unsure, you can skip — solo defaults work fine and you can run this later."

If the user says "actually solo," bail before any writes:

> "No problem. The solo workflow needs no extra setup. Run `/skill:joycraft-new-feature` when you want to start a feature."

## Step 2: Check for Flat Layout — Bail if Present

Before scaffolding team structure, check the project's docs/ for per-feature artifacts. Look for any of:

- `docs/features/<slug>/brief.md`
- `docs/features/<slug>/research.md`
- `docs/features/<slug>/design.md`
- Loose spec subdirectories that predate the per-feature layout (specs not under `docs/features/<slug>/specs/` or `docs/bugfixes/<area>/`)

If any **flat layout** artifacts exist, tell the user:

> "I see flat-layout artifacts in your docs/ (briefs/research/designs). Run `npx joycraft upgrade` first — it will migrate them into `docs/features/<slug>/` automatically. Then re-run this skill."

Then stop. Skills don't reliably shell out, so the CLI does the migration.

## Step 3: Gather Areas + Owners (Interactive)

Ask the user:

> "How many areas does your team work in? (e.g., `auth`, `api`, `frontend`, `infra`) — pick names that match how your team thinks about ownership. You can also skip and just create the team CONTRIBUTING doc."

For each area name the user provides:
1. Confirm the name (kebab-case).
2. Ask: "Who owns this area? (a name, an email, or a team handle — used in the area README's frontmatter)"
3. Ask (optional): "Are there NEVER or ASK FIRST rules specific to this area? If yes, list them; if no, skip."

If the user provides duplicate names, ask them to pick a different one. Track the area list in your working memory before writing anything.

If the user provides 0 areas, skip Step 4 and go straight to Step 5 (CONTRIBUTING doc only). Useful path for "we just want the team doc, no areas yet."

## Step 4: Scaffold Each Area

For each confirmed area, lazy-create `docs/areas/<area-name>/` and write a `README.md` with the **shared frontmatter schema** (areas are shared docs, not personal):

```yaml
---
last_updated: YYYY-MM-DD
last_updated_by: <owner from step 3>
---
```

**Owner resolution for `last_updated_by`:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist. Use the user-provided owner from Step 3 if they specified one for this area.

Body of `README.md`:

```markdown
# <area-name>

> **Owner:** <name from Step 3>
> **Status:** active

## What this area covers

(Filled in by the area owner)

## Conventions

(Area-specific patterns or constraints)

## Onboarding

When a new dev joins this area, they should:
1. Read this README
2. Read `boundaries.md` (if present)
3. Read the codebase under <area-relevant paths>
```

If the user provided NEVER / ASK FIRST rules for the area, also write `docs/areas/<area-name>/boundaries.md` with the shared frontmatter and those rules. If they didn't, skip the boundaries file — the root CLAUDE.md boundaries already cover the project-wide cases.

**Idempotency:** if `docs/areas/<area-name>/README.md` already exists, ASK before overwriting (default: skip + inform).

## Step 5: Write the Team CONTRIBUTING Doc

Lazy-create `docs/CONTRIBUTING-joycraft.md` (NOT the project's main `CONTRIBUTING.md` — keep them separate so neither stomps on the other).

If `docs/templates/CONTRIBUTING-joycraft-template.md` exists in the project (it should — bundled by `npx joycraft init`), use it as the starting point. If not, fall back to the inline template below.

The doc starts with shared frontmatter:

```yaml
---
last_updated: YYYY-MM-DD
last_updated_by: <resolved owner>
---
```

Body (inline fallback template — short by design):

```markdown
# Joycraft on this project

We use [Joycraft](https://www.npmjs.com/package/joycraft) for AI-assisted development.

## How our team uses it

(Filled in during /skill:joycraft-collaborative-setup — fill this in with your team's specific conventions.)

## Conventions

- Per-feature work goes under `docs/features/<slug>/`
- Area-level work and ownership: see `docs/areas/`
- For "what is Joycraft?", see the package README

## Onboarding

When a new dev joins:
1. Run `npx joycraft init` (idempotent on already-set-up projects)
2. Read `docs/areas/<your-area>/README.md` for context
```

If `docs/CONTRIBUTING-joycraft.md` already exists, ASK before overwriting — offer overwrite / append / skip; default to skip.

## Step 6: Trigger CLAUDE.md Update

Now that `docs/areas/` exists, the next `npx joycraft upgrade` (or any future `npx joycraft init`) will pick it up and add the **Areas pointer** to CLAUDE.md automatically — that pointer tells Claude "when working on the X area, read docs/areas/X/README.md first."

Tell the user:

> "Run `npx joycraft upgrade` to refresh CLAUDE.md with the Areas pointer (or `npx joycraft init` if you haven't initialized yet)."

Don't try to shell out from inside the skill — let the user run the CLI deliberately.

## Step 7: Hand Off

Summarize what you wrote (paths to area READMEs, the CONTRIBUTING doc, any boundaries files), then emit the canonical Handoff block.

## Recommended Next Steps

Next:
```bash
/skill:joycraft-new-feature
```
Run /clear first.

Include the path to `docs/CONTRIBUTING-joycraft.md` and any newly-created area READMEs in the summary above the Handoff block.

## Notes

- This skill does NOT migrate flat-layout artifacts on its own. That's `npx joycraft upgrade`'s job — Step 2 directs the user to run it first.
- Area names are user-provided. Don't auto-detect from `src/auth/`, `src/api/`, etc. — many projects have monorepo or non-conventional layouts and auto-detection produces noise.
- If the user stops mid-way (Ctrl-C, abandons), whatever's been written stays. Re-running the skill is the recovery path; it's idempotent on existing area folders (asks before overwriting).
