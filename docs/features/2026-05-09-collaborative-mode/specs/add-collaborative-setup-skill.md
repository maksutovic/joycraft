# Add Collaborative Setup Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 1 session / 4 files / ~250 lines incl. tests
> **Depends on:** `add-migration-module.md`, `update-doc-producing-skills.md`

---

## What

Create a new Claude Code skill `joycraft-collaborative-setup` that scaffolds the team-only structure for a project: `docs/areas/<area>/` directories with README.md (and optional boundaries.md), a thin team-facing CONTRIBUTING-style doc, and triggers the same migration logic from spec 4 if the project happens to still be on flat layout. Register the new skill in `src/init.ts` so `npx joycraft init` installs it alongside the existing skills (it lives in `.claude/skills/joycraft-collaborative-setup/SKILL.md` after install). The skill is interactive: it asks the user how many areas the team has, what they're called, and who owns each. It does NOT auto-detect — teams know their structure better than the tool can guess.

## Why

The brief calls this out as in-scope: a dedicated skill is the on-ramp for teams, separating team-only ceremony from solo defaults. Without it, teams have no guided way to introduce `docs/areas/` and the team-facing doc — they'd be left to manually edit the structure and CLAUDE.md. The skill is also the natural home for re-running migration on demand (e.g., a team that opted out earlier and wants to migrate later).

## Acceptance Criteria

- [ ] `src/claude-skills/joycraft-collaborative-setup.md` exists with skill frontmatter (`name`, `description`, etc.) matching the existing skills' format.
- [ ] Skill description: "Set up Joycraft for a team — scaffold per-area folders, owner conventions, and a team-facing CONTRIBUTING doc. Run once when adopting Joycraft on a multi-dev project."
- [ ] Skill instructions, in order:
  1. Confirm with the user this is a team setup (not solo) — if they're unsure, recommend they skip.
  2. Run `planMigration` (described inline — instruct Claude to use `src/migration.ts` if running locally, otherwise rely on `npx joycraft upgrade` having run first); if any flat-layout artifacts exist, recommend running `npx joycraft upgrade` first and bail.
  3. Ask the user for area names and owners (team areas like `auth`, `api`, `frontend`, etc.).
  4. For each area: lazy-create `docs/areas/<area-name>/`, write a README.md (with frontmatter using the shared schema), optionally write a `boundaries.md` if the user provides area-specific NEVER/ASK FIRST rules.
  5. Write a thin team-facing CONTRIBUTING-style doc to `docs/CONTRIBUTING-joycraft.md` (NOT the project's main CONTRIBUTING.md — separate file). Doc is short: (a) "we use joycraft", (b) "here's how our team uses it" (filled in by user), (c) link to the joycraft package README.
  6. Re-run `improve-claude-md.ts` logic OR instruct the user to do so (depending on whether the skill can shell out — likely the skill instructs the user, since skills are markdown). The areas-pointer (added in spec 6) appears once `docs/areas/` exists.
  7. End with the canonical Handoff block pointing the user back to normal workflow (`/joycraft-new-feature` or whatever they want next), with a path to the CONTRIBUTING doc and any newly-created area READMEs.
- [ ] `src/init.ts` is updated to include the new skill in the `SKILLS` set, so `npx joycraft init` installs it alongside other skills (and `npx joycraft upgrade` distributes it to existing projects via the managed-file flow).
- [ ] Skill is registered in `bundled-files.ts` (or wherever `SKILLS` is enumerated).
- [ ] Skill is also wired into the "available skills" list that the harness exposes (consistent with how the existing 14+ skills are listed — research Q5 enumerates).
- [ ] CONTRIBUTING-joycraft.md template is bundled in `src/templates/` and gets copied to `docs/templates/CONTRIBUTING-joycraft-template.md` on init (so projects have it available even before running the skill).
- [ ] Build, typecheck, tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill markdown file exists with valid frontmatter | `tests/collaborative-setup-skill.test.ts` — read file, parse YAML frontmatter, assert required fields present | unit |
| Skill is registered in SKILLS bundle | Same — assert `joycraft-collaborative-setup.md` appears in the SKILLS export | unit |
| Skill instructions reference `docs/areas/` and CONTRIBUTING-joycraft.md | Same — string-grep skill body for both paths | unit |
| Skill instructions tell user to run `npx joycraft upgrade` first if flat layout detected | Same — assert markdown contains both "flat layout" and "joycraft upgrade" tokens | unit |
| Skill ends with canonical Handoff block | Same — assert pattern (per spec 6's canonical shape) | unit |
| `init` installs the skill | `tests/init.test.ts` — extend existing test, run init, assert `.claude/skills/joycraft-collaborative-setup/SKILL.md` exists in target | integration |
| `init` copies the CONTRIBUTING-joycraft template | Same — assert `docs/templates/CONTRIBUTING-joycraft-template.md` exists | integration |
| Bundled-files SKILLS set includes the new skill | `tests/bundled-files.test.ts` (new) — import SKILLS, assert key presence | unit |

**Execution order:**
1. Write all eight tests; they fail.
2. Confirm red.
3. Author the skill markdown, the template, register both, until green.

**Smoke test:** `pnpm test --run tests/collaborative-setup-skill.test.ts` — pure file reads + string assertions.

**Before implementing, verify your test harness:**
1. Tests read actual files post-build OR pre-build via the source paths in `src/claude-skills/` and `src/templates/`.
2. Tests fail when the skill file is missing.
3. Smoke test runs in <1s.

## Constraints

- MUST: Be self-contained per Pattern A — all instructions inline in the skill markdown. Do NOT reference shared utility files that won't exist post-install.
- MUST: Use the same skill-frontmatter format as existing skills (look at `src/claude-skills/joycraft-new-feature.md` for the canonical shape).
- MUST: Be conservative about file-writing — only write `docs/areas/<area>/README.md` after explicit user confirmation of area names. The skill is interactive, not auto-discovering.
- MUST: Include the canonical Handoff block at the end (same shape as defined in spec 6).
- MUST: Use the shared frontmatter schema (last_updated, last_updated_by) on `docs/areas/<area>/README.md` since that's a shared doc.
- MUST: Update `src/init.ts:152-164` (the section that enumerates SKILLS for hash-tracking) so the new skill participates in upgrade-tracking.
- MUST NOT: Run migration internally — the skill instructs the user to run `npx joycraft upgrade` if flat layout is detected. Skills can't reliably shell out; CLI tooling does that.
- MUST NOT: Auto-fill area names from project structure (e.g., guessing from `src/auth/`, `src/api/`). Areas are a team-level concept; auto-detection produces noise.
- MUST NOT: Touch the project's main CONTRIBUTING.md if one exists. Always write to a separate `docs/CONTRIBUTING-joycraft.md`.
- MUST NOT: Create `docs/areas/` if the user opts out partway through (e.g., decides this isn't the right tool). Don't leave half-state.
- MUST NOT: Reference the `joycraft-scenarios` repo (CLAUDE.md NEVER rule).

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/claude-skills/joycraft-collaborative-setup.md` | New skill markdown |
| Create | `src/templates/CONTRIBUTING-joycraft-template.md` | Template file (copied to user's `docs/templates/` on init) |
| Modify | `src/init.ts` | Register skill in SKILLS bundle; copy CONTRIBUTING template |
| Modify | `src/bundled-files.ts` (or wherever SKILLS/TEMPLATES are exported) | Add skill markdown + template |
| Create | `tests/collaborative-setup-skill.test.ts` | Skill content tests |
| Create | `tests/bundled-files.test.ts` | Bundle export tests |
| Modify | `tests/init.test.ts` | Assert new skill installed + template copied |

## Approach

**Strategy:** Write the skill markdown as the primary deliverable. Everything else is plumbing to ensure the skill ships and is recognized. The skill's content is the product.

**Skill markdown structure (in this order):**

1. YAML frontmatter (`name`, `description`, etc.) matching existing skills.
2. **What this skill does** — short prose paragraph.
3. **When to run** — guidance ("run once when adopting joycraft on a team project").
4. **Step 1: Confirm team context** — ask the user, bail if solo.
5. **Step 2: Check for flat layout** — instructions for spotting `docs/briefs/`, `docs/research/`, `docs/designs/`, `docs/specs/<feature>/` and recommending `npx joycraft upgrade` first.
6. **Step 3: Gather areas + owners** — interactive prompt structure.
7. **Step 4: Scaffold each area** — lazy-create folder, README with shared frontmatter, optional boundaries.md.
8. **Step 5: Write CONTRIBUTING-joycraft.md** — using the bundled template as starting point.
9. **Step 6: Trigger CLAUDE.md update** — instruct the user to run `npx joycraft upgrade` again or simulate the improve step (areas-pointer will pop in once `docs/areas/` exists; spec 6 handles this).
10. **Recommended Next Steps** — Handoff block.

**Data flow during skill execution (instructions tell Claude to do this):**

```
Step 1: confirm("Setting up for a team?")
Step 2: check(docs/briefs/, docs/research/, docs/designs/, docs/specs/)
        if any flat dirs → bail with: "run `npx joycraft upgrade` first"
Step 3: for each area (loop user input):
          name, owner, optional boundaries
        store in working memory
Step 4: for each area:
          mkdir docs/areas/<name>/
          write README.md with shared frontmatter
          if boundaries: write boundaries.md
Step 5: write docs/CONTRIBUTING-joycraft.md (templated)
Step 6: print: "now run `npx joycraft upgrade` to refresh CLAUDE.md with the areas pointer"
End:    Handoff block
```

**CONTRIBUTING-joycraft template (rough shape):**

```markdown
# Joycraft on this project

We use [Joycraft](https://www.npmjs.com/package/joycraft) for AI-assisted development.

## How our team uses it

(Filled in during /joycraft-collaborative-setup)

## Conventions

- Per-feature work goes under `docs/features/<slug>/`
- Area-level work and ownership: see `docs/areas/`
- For "what is Joycraft?", see the package README

## Onboarding

When a new dev joins:
1. Run `npx joycraft init` (idempotent on already-set-up projects)
2. Read `docs/areas/<your-area>/README.md` for context
```

**Key decisions:**
- Skill instructs user to re-run `npx joycraft upgrade` rather than embedding migration logic itself. Reason: skills can't reliably do filesystem operations at scale; CLI does.
- CONTRIBUTING-joycraft.md is intentionally short and links to the package README. Brief constraint: "Defer to package README for what is joycraft."
- Areas can have `boundaries.md` but it's optional — solo-style boundaries already in root CLAUDE.md often suffice.
- The skill does NOT register itself as auto-invocable (no slash-prefix triggering). It's a deliberate, one-time setup action; users invoke it explicitly via `/joycraft-collaborative-setup`.

**Rejected alternative:** Have the skill auto-invoke `npx joycraft migrate` via Bash. Rejected — adds shell-out complexity for a one-time action; the user can run `npx joycraft upgrade` themselves more reliably.

**Rejected alternative:** Auto-detect areas from src/ subfolder names. Rejected per the constraint above (also: many projects have monorepo or non-conventional layouts).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User runs the skill on a solo project | Step 1 asks for confirmation; if they say "actually solo," skill bails before any writes. |
| Project already has `docs/areas/` from a previous run | Skill is idempotent — for each area name the user gives, if `docs/areas/<name>/README.md` exists, ask before overwriting (prefer to skip and inform). |
| User provides 0 areas | Skill writes the CONTRIBUTING doc and skips area creation. Useful path for "we just want the team doc, no areas yet." |
| User provides duplicate area names | Skill warns and asks them to pick a different one. |
| `docs/CONTRIBUTING-joycraft.md` already exists | Skill asks: "overwrite, append, or skip?" Default to skip. |
| Project's main `CONTRIBUTING.md` already exists | Skill writes to `docs/CONTRIBUTING-joycraft.md` (separate file) — no conflict. |
| User stops the skill mid-way (Ctrl-C, abandons partway) | Whatever's been written stays; the skill doesn't roll back. Idempotent re-run is the recovery path. |
| User runs the skill again later, after areas already set up, to add a new area | Skill asks for names; existing areas are unchanged; new ones added. Good UX. |
| `docs/templates/CONTRIBUTING-joycraft-template.md` was deleted by user | Skill falls back to the inline template content embedded in the skill markdown. |
