# Collaborative Mode — Draft Brief

> **Date:** 2026-05-09
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea

Joycraft was designed assuming a single developer with a single mental model of the project. After 3 months of solo use across multiple projects, a client wants to adopt joycraft for a 4-dev team in one shared repo. The harness needs to handle a multiplayer scenario without breaking the solo experience.

The core insight from the interview: this isn't a "docs folder will get too big" problem (markdown is tiny, git handles it fine). It's a **coordination + discoverability** problem. Multiple devs writing briefs/specs/research into a flat folder produces an unnavigable filing cabinet. A team has no shared mental model, so the docs structure has to *be* the shared mental model.

Surprise discovery during the interview: the changes needed to support teams are essentially zero-cost for solo users. Per-feature folders, frontmatter, and archival conventions are strictly better for solo dev too — they were just changes I'd been deferring. The "team migration" moment is real friction that we can sidestep entirely by making the defaults team-compatible from day one.

## Problem

When 4+ devs use joycraft on a single repo:

1. **Flat `docs/specs/` and `docs/briefs/` become write-only.** Naming collisions, duplicate work, no obvious owner per artifact.
2. **Stale artifacts accumulate.** A brief from 3 months ago for a shipped feature looks identical to today's active work. New devs can't tell what's load-bearing vs archaeological.
3. **Skills weren't designed for haystacks.** `/joycraft-research` doesn't check for prior research. `/joycraft-new-feature` doesn't know about other in-flight features. Skills assume the docs/ folder is small.
4. **CLAUDE.md is single-curator.** No mechanism for area-level conventions ("auth team rules") without bloating the root file.
5. **No ownership signal.** Nobody dares delete a doc because they don't know who wrote it or whether it's still relevant.
6. **Existing solo users hit a migration cliff** if they ever add a teammate.

## What "Done" Looks Like

For solo users (no behavioral change required):
- `npx joycraft init` produces per-feature folders with frontmatter automatically.
- Existing skills work the same; users don't notice frontmatter exists.
- Existing solo projects get a one-time forced migration on `npx joycraft upgrade` with a printed summary explaining the restructure.

For collaborative teams:
- `/joycraft-collaborative-setup` skill scaffolds `docs/areas/<area>/` with owner conventions and a CONTRIBUTING-style doc explaining the harness to new devs.
- Same skill handles migrating existing flat docs into per-feature folders interactively.
- Frontmatter `owner` and `status` fields make ownership and lifecycle visible.
- Archive convention (`docs/archive/YYYY-QN/`) keeps shipped work out of skills' way.
- One PR per feature/issue is the assumed convention; joycraft skills align with it.

For Claude (the agent):
- Skills filter by `status: active` so shipped/archived work doesn't pollute context.
- Root CLAUDE.md stays nimble — points to area-specific docs instead of nesting.
- `feature:` frontmatter field enables `grep`-based discovery of related work.

## Constraints

- **Backward compatibility.** Existing joycraft projects must upgrade smoothly. The restructure is forced on `npx joycraft upgrade` (see Resolved Decisions); "no silent breakage" means a clear printed summary + README note, not opt-out.
- **Solo-first defaults.** Solo users see no extra ceremony. Frontmatter is auto-generated; team-only pieces (`docs/areas/`) only appear when `/joycraft-collaborative-setup` runs.
- **No reliance on Claude Code's nested CLAUDE.md auto-load.** Use explicit pointers + on-demand reads instead. More reliable, less magic.
- **Keep CLAUDE.md nimble.** Boundaries that apply project-wide stay in root; area-specific rules live in `docs/areas/<area>/`.
- **Minimal frontmatter.** 4 fields max: `status`, `owner`, `created`, `feature`. More than that = noise.
- **No coordination tooling.** Cross-session collision detection (two devs editing similar specs) is out of scope — that's a standup problem, not a tooling problem.

## Proposed Structure

```
docs/
  areas/                         # team-only — slice ownership
    auth/
      README.md                  # what this area is, owner, key files
      boundaries.md              # area-specific NEVER/ASK FIRST (optional)
    api/
      ...
  features/                      # all feature work, flat
    2026-05-auth-redesign/
      brief.md
      research.md
      design.md
      specs/
        login-flow.md
        token-refresh.md
    2026-05-rate-limiting/       # cross-cutting — no taxonomy fight
      ...
  archive/                       # shipped/abandoned features
    2026-Q1/
      old-feature-slug/
        ...
  discoveries/                   # flat, append-only (with author frontmatter)
  decision-log.md                # shared, last-edited frontmatter
  production-map.md              # shared, last-edited frontmatter
```

Frontmatter convention (auto-generated by skills, rarely human-edited):

```yaml
---
status: active        # active | shipped | deprecated | superseded
owner: max            # from git config user.name, override in .joycraft/config.json
created: 2026-05-09
feature: auth-redesign  # links to docs/features/<slug>/ — when applicable
---
```

## Scope of THIS PR

In:
- Per-feature folder structure as the new default for `npx joycraft init`
- Frontmatter convention (4 fields) auto-generated by all doc-producing skills
- Archive convention + helper for moving features to archive
- Update existing skills (`/joycraft-new-feature`, `/joycraft-research`, `/joycraft-design`, `/joycraft-decompose`, `/joycraft-implement`, `/joycraft-session-end`) to honor the new structure and write frontmatter
- New skill: `/joycraft-collaborative-setup` — scaffolds `docs/areas/`, CONTRIBUTING-style doc, migrates existing flat docs interactively
- Forced migration path for existing joycraft projects via `npx joycraft upgrade` (reuses the same migration code path as `/joycraft-collaborative-setup`). Includes a README update explaining the restructure to existing users.
- Fix the version-detection bug (currently defaults to 0.1.0 even on latest)
- **Backlog convention:** new `docs/backlog/` folder, one file per deferred item. Both skill-driven (interview/new-feature/design detect "defer to later" and offer to capture) and manual (drop a file in directly). Different lifecycle from rest of `docs/`: prune-friendly, not audit history. Promote to a formal brief by moving the file into `docs/features/<slug>/brief.md`.
- **Handoff lines in "Recommended Next Steps":** every doc-producing skill must include the path(s) to the artifact(s) it just produced inline with the recommended next slash command — not in a separate "Files written" footer. Goal: a user can copy one line, run `/clear`, and paste it as the first message of the next session without losing context. Applies to `/joycraft-new-feature`, `/joycraft-research`, `/joycraft-design`, `/joycraft-decompose`, `/joycraft-bugfix`, `/joycraft-interview`, `/joycraft-session-end`. Shape: `/joycraft-design docs/briefs/X.md docs/research/X.md` (skill + space-separated artifact paths). Backlog entries produced as a side effect (per the backlog convention above) also belong on the handoff line so the next session knows what was deferred.

Out:
- Cross-session collision detection ("is another joycraft session editing this?")
- Slice-level CLAUDE.md auto-loading (use pointers instead)
- Search/index infrastructure (ripgrep is fine)
- Renaming `/tune` → `/setup` (defer; current name signals "ongoing" which is correct)

## Resolved Decisions (from interview round 2 — and design round, 2026-05-09)

- **Migration UX**: **FORCED** migration on `npx joycraft upgrade` (Decision Q6, design 2026-05-09). No Y/N prompt, no opt-out, no old-layout fallback in skills. A printed summary explains what was migrated. README documents the restructure so existing users aren't blindsided. Justified by the small joycraft user base — the cost of dual-layout conditionals across 8+ skills outweighs the benefit of optional migration. **This supersedes the brief's earlier "opt-in" wording in the Constraints section.**
- **CONTRIBUTING-style doc minimalism**: scaffold thin. Defer to package README for "what is joycraft." The team-facing doc just says (1) we use joycraft, (2) here's how our team uses it, (3) link to package README. Don't re-explain joycraft in every project.
- **Frontmatter on shared artifacts**: shared artifacts (decision-log, production-map) use `last_updated` + `last_updated_by`. Personal artifacts (briefs, specs, research, design) use `owner` + `created`. Two schemas, kept simple.
- **Implementer vs owner on specs**: just `owner`. Revisit only if real teams ask for it.
- **Version detection bug**: investigate during `/joycraft-research`. Fix scope confirmed for this PR.

## Open Questions (for /joycraft-research to resolve)

- **`docs/areas/` discovery from CLAUDE.md**: what's the exact pointer format that reliably gets Claude to read the area doc on demand? Needs a small experiment — try a few phrasings and see which actually triggers reads in practice.
- **Existing skill internals**: where exactly does each doc-producing skill write files? Need a map before designing where frontmatter generation lands.
- **Version detection bug root cause**: why does the version check default to 0.1.0 on upgraded installs? Find the source before designing the fix.
- **Backlog vs brief deferral sections**: how do existing briefs/designs in this repo handle "defer to later"? What phrasings surface ("Out of Scope", "Open Questions", "later sprint", "future work")? Frequency? This informs whether backlog supplements or replaces those sections — design-phase decision needs data.

## Open Questions (for /joycraft-design to resolve)

- **Backlog ↔ brief integration**: should backlog entries supplement existing "Open Questions" / "Out of Scope" sections in briefs (duplication, but briefs stay readable standalone), or replace them with links into `docs/backlog/` (single source of truth, but breaks brief readability)?
- **Backlog frontmatter schema**: backlog entries have different lifecycle (prune-friendly, no audit history). Should they share the standard 4-field frontmatter, or have their own schema (`source:` link to originating brief/design, no `feature:` field, optional `pruned_at:`)?
- **Promotion mechanism**: when a backlog entry graduates to a real feature, is it `git mv docs/backlog/X.md docs/features/X/brief.md` (manual + simple), or does a skill offer to convert it (more guidance, more code)?
- **Handoff line format**: how prescriptive should the format be? Options: (a) free-form prose with paths inline ("Run `/joycraft-design docs/briefs/X.md docs/research/X.md`"); (b) fenced code block per skill so it's visually copy-paste-friendly; (c) a structured "Handoff" section at the end of every skill output. Need to decide once so all skills emit the same shape — inconsistency here defeats the muscle-memory goal. Also: when a skill produces *no* artifact (e.g., `/joycraft-implement` mostly edits source), what does its handoff line look like — does it still emit one, or skip?

## Out of Scope (for now)

- Coordination tooling (collision detection, "in-flight feature" warnings) — team standups handle this
- Nested CLAUDE.md auto-loading — use explicit pointers
- Multi-repo joycraft (4 devs across 3 related repos)
- Renaming `/tune` to `/setup`
- Any kind of search index or doc database

## Raw Notes / Key Quotes

- User: "would these necessary updates for multiplayer experience actually impact solo devs? ... it almost seems inconsequential to solo devs?" → confirmed defaults change for everyone (option A), no team-mode flag needed
- User: "collaborative i think is in line with my poetic style" → naming locked to "collaborative" not "team"
- User: "PR per feature/github issue is how we are doing it with this client and honestly most clients follow the same convention" → joycraft can assume this
- User on collision detection: "this is a skill issue on the teams part and perhaps is not the responsibility of joycraft" → out of scope
- User on per-area vs per-feature: settled on hybrid (`docs/areas/` for slice ownership, `docs/features/` flat for actual work) with `feature:` frontmatter linking them
- Bug to address alongside: version check defaults to 0.1.0 on upgraded installs, causing spurious "upgrade available" nudges

---

## Execution Strategy (post-decompose, 2026-05-09)

Decomposed into 7 atomic specs in `docs/specs/collaborative-mode/`:

| # | Spec | Depends On |
|---|------|-----------|
| 1 | `fix-version-detection.md` | — |
| 2 | `add-frontmatter-module.md` | — |
| 3 | `update-init-layout.md` | 1 |
| 4 | `add-migration-module.md` | — |
| 5 | `wire-forced-migration-in-upgrade.md` | 4 |
| 6 | `update-doc-producing-skills.md` | 2, 3 |
| 7 | `add-collaborative-setup-skill.md` | 4, 6 |

**Recommended waves:**
- **Wave 1 (parallel — separate worktrees):** specs 1, 2, 4 — independent foundations.
- **Wave 2 (parallel after wave 1):** specs 3 (after 1) and 5 (after 4).
- **Wave 3 (single worktree, large):** spec 6 — touches 8 skills + `improve-claude-md.ts` + 2 templates.
- **Wave 4 (parallel after wave 3):** spec 7.

**Estimated total:** 7 sessions; with parallelism, ~3-4 wall-clock units.

---

## Recommended Next Steps

This is **medium-to-complex** — touches every existing skill, introduces a new skill, requires migration logic, and has architectural decisions (folder structure, frontmatter schema) that affect every future joycraft user.

Decomposition complete. Specs are in `docs/specs/collaborative-mode/`.

Next:
```bash
/joycraft-implement docs/specs/collaborative-mode/fix-version-detection.md
```
Run `/clear` first.
