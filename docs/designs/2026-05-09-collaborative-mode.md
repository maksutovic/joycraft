# Design Discussion — Collaborative Mode

> **Date:** 2026-05-09
> **Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Research:** `docs/research/2026-05-09-collaborative-mode.md`
> **Status:** All questions resolved 2026-05-09 — awaiting final approval

---

## Section 1: Current State

### Folder layout that `npx joycraft init` produces

`src/init.ts:44-48` creates a flat `docs/` tree:

```
docs/
├── briefs/         # flat — all briefs from all features
├── specs/          # per-feature subdirs already exist here (only place that does)
├── discoveries/    # flat
├── contracts/      # flat
├── decisions/      # flat
├── context/        # flat (production-map.md, decision-log.md, etc.)
└── pipit-examples/ # flat, with starter README
```

Note `docs/research/` and `docs/designs/` are **not** created by `init` — the corresponding skills create them lazily when first run.

### What artifacts each skill writes today

| Skill | Writes to | Per-feature? |
|---|---|---|
| `joycraft-interview` | `docs/briefs/YYYY-MM-DD-topic-draft.md` | No (flat) |
| `joycraft-new-feature` | `docs/briefs/YYYY-MM-DD-feature-name.md` + `docs/specs/<feature-name>/*.md` | Specs yes, brief no |
| `joycraft-research` | `docs/research/YYYY-MM-DD-feature-name.md` | No (flat) |
| `joycraft-design` | `docs/designs/YYYY-MM-DD-feature-name.md` | No (flat) |
| `joycraft-decompose` | `docs/specs/<feature-name>/*.md` | Yes |
| `joycraft-bugfix` | `docs/specs/<feature-or-area>/bugfix-name.md` | Yes (uses area name) |
| `joycraft-session-end` | `docs/discoveries/YYYY-MM-DD-topic.md` + updates `docs/context/*` and spec-status fields | No (flat) |
| `joycraft-add-fact` | Routes to `docs/context/*.md` | No (flat) |

So today: **specs are the only artifacts grouped by feature**. Briefs, research, and designs are siblings in flat folders, linked only by date-prefixed filenames sharing a slug.

### Frontmatter today

Research Q6 confirms **no skill emits YAML frontmatter**. All metadata uses markdown blockquote (`> **Date:** ...`) or bold (`**Date:** ...`). The skill files themselves have YAML frontmatter, but generated artifacts do not.

### "Recommended Next Steps" / hand-off today

Research Q5 + the explore agent's full quotes show six skills end with a "Run /clear" line, plus various flavors of next-step suggestion:

- `interview`, `new-feature`, `bugfix`: prose recommending paths through the workflow, with the artifact path mentioned somewhere upstream in the same output
- `research`: includes the artifact path in a single line, then bulleted next-step options — **no `/clear` line**
- `design`: blocks on user review, no `/clear` line, no hand-off
- `decompose`, `implement`, `session-end`: bullet summary then `/clear`
- Inconsistencies: research/design omit `/clear`; the artifact path is sometimes in the body, sometimes in the closing line, sometimes implicit

So there's a *pattern* of hand-off lines but it's not a contract.

### Version-detection bug

Research Q11 + Q14 + Q15 pinpoint two hardcoded `'0.1.0'` literals:

1. `src/init.ts:164` — `writeVersion(targetDir, '0.1.0', fileHashes)` writes 0.1.0 into `.joycraft-version` regardless of which CLI version performed the init
2. `src/upgrade.ts:238` — `getPackageVersion()` unconditionally returns `'0.1.0'`, so even `joycraft upgrade` does not refresh the stamp

`src/cli.ts:7` reads the real version from `package.json` correctly — that's the only place it works. The SessionStart hook reads `.joycraft-version` (always 0.1.0) and compares to npm-registry latest, producing the spurious nudge every session.

### Upgrade flow

`src/upgrade.ts:102-180` builds a list of managed files (`SKILLS`, `TEMPLATES`, `CODEX_SKILLS`) and classifies each as `new` / `updated` / `customized` via SHA256 hashes. Customized files prompt the user one-at-a-time with line-delta context. The flow has **no concept of migrating user-authored files** in `docs/` — it only manages files Joycraft itself owns. The collaborative-mode migration is a new capability, not a modification of the existing diff loop.

### Backlog

Research Q in D9: `backlog` does not exist anywhere. No `docs/backlog/`, no skill references, no template. Greenfield.

---

## Section 2: Desired End State

When this PR lands:

1. **`npx joycraft init` produces per-feature folders by default.** A new project gets `docs/features/` (created empty, scaffold-on-write) instead of (or in addition to) flat `docs/briefs|research|designs|specs/`.

2. **All doc-producing skills emit YAML frontmatter** with the 4-field schema for personal artifacts and 2-field schema for shared artifacts. Frontmatter is auto-populated from git config + skill knowledge — never asked of the user.

3. **`docs/areas/` exists as a team-only structure**, scaffolded by a new `/joycraft-collaborative-setup` skill. Solo users never see it. Areas hold README + optional boundaries; root CLAUDE.md gets pointer text directing Claude to read area files on demand.

4. **`docs/archive/YYYY-QN/` convention** exists with a helper for moving shipped features. Skills that scan docs (`research`, `new-feature`) filter out archived content and `status: shipped|deprecated|superseded`.

5. **`docs/backlog/` exists** as flat-ish folder for deferred items. One file per item, prune-friendly. Skills that elicit "out of scope" content offer to capture into backlog.

6. **Every doc-producing skill ends with a single, identical-shape "Handoff" line** containing the next slash command and the path(s) to artifacts just produced. User can copy → `/clear` → paste, with no information loss across the boundary.

7. **`npx joycraft upgrade` offers a one-time migration** for existing flat-layout projects. Opt-in. Same code path the collaborative-setup skill uses for migrating later. Old layouts continue working for at least one release cycle (skills tolerant of both).

8. **Version-detection bug is fixed** — `.joycraft-version` always carries the real CLI version that wrote it.

The shape of code-level changes:
- New module: `src/frontmatter.ts` (parse + emit YAML frontmatter)
- New module: `src/migration.ts` (flat → per-feature folder mover)
- Updated: every skill file in `src/claude-skills/` (frontmatter emission + Handoff line + status filters)
- Updated: `src/init.ts` (new directory list, version fix)
- Updated: `src/upgrade.ts` (migration prompt, version fix)
- Updated: `src/improve-claude-md.ts` (areas pointer text when `docs/areas/` exists)
- New skill: `src/claude-skills/joycraft-collaborative-setup.md`

---

## Section 3: Patterns to Follow

### Pattern A: Self-contained skill markdown (don't break this)

Skills currently have all their logic inline. From `src/claude-skills/joycraft-decompose.md` and others, skills don't import or reference shared snippets. CLAUDE.md says (line 71-79 of `templates/`-style skill conventions): "Skills must be self-contained — A skill installed to `.claude/skills/` can't import from other files."

**Apply to:** the Handoff line and frontmatter conventions must be **fully repeated in every skill that needs them**. No shared include file. Yes, this means duplication. The research (Q7) already shows existing patterns are copy-pasted across 6-8 skills — that's the convention.

### Pattern B: "Create directory if it doesn't exist" lazy scaffold

8 skills use this pattern (research Q7). Example — `src/claude-skills/joycraft-research.md:37`:

> "Write the questions to a temporary file at `docs/research/.questions-tmp.md`. Create the `docs/research/` directory if it doesn't exist."

**Apply to:** the new `docs/features/<slug>/` writes — skills create the per-feature subdirectory the first time anything is written to it. `docs/backlog/` and `docs/areas/` follow the same pattern. Don't preemptively create everything in `init.ts`.

### Pattern C: Hash-based change detection in upgrade

`src/upgrade.ts:141-168` classifies managed files as `new` / `updated` / `customized`. User-authored content (briefs, specs, designs, research) is **not** in the managed set — Joycraft never overwrites user docs.

**Apply to:** migration logic must `git mv` user files, never overwrite them. The collaborative-setup migration is *separate* from the managed-file diff loop — different mental model, distinct code path, but reuses `askUser()` for prompts.

### Pattern D: Date-prefixed slug filenames as the linking primitive

Today, the only thing tying `docs/briefs/2026-05-09-foo.md` to `docs/research/2026-05-09-foo.md` to `docs/specs/foo/*` is filename convention.

**Apply to:** keep this — the per-feature folder name uses the same slug. `docs/features/2026-05-09-foo/{brief.md, research.md, design.md, specs/}`. Slug is derived once, in the `joycraft-new-feature` (or `joycraft-interview`) skill, and reused thereafter.

### Pattern E: Markdown blockquote metadata is being replaced, not augmented

Research Q6: today metadata lives as `> **Date:** ...` blockquotes in artifact bodies. The brief proposes YAML frontmatter (`---` blocks).

**Apply to:** new artifacts emit YAML frontmatter at the top *and* keep human-readable metadata visible in the prose body where it naturally belongs (date in the title block, etc.). Don't try to remove the prose metadata — readers expect it. Frontmatter is for skills/grep; prose is for humans. Two audiences, two locations.

### Pattern F: Skill output ends with `Run /clear` (mostly)

6 of 8 skills end with: `Run /clear before your next step — your artifacts are saved to files.` Two skills (`research`, `design`) don't, for different reasons (research hands off lightly; design *blocks*).

**Apply to:** standardize the closing across all hand-off skills. The new "Handoff" line *replaces* the freeform "Run /clear" line — it carries the same message plus the next-command and artifact paths.

### Pattern G: `interview` already handles "draft" naming

`docs/briefs/YYYY-MM-DD-topic-draft.md` filename pattern. Frontmatter `status: active` or `status: draft` should align with this — drafts have a distinct lifecycle.

---

## Section 4: Resolved Design Decisions

> **Decision:** Use YAML frontmatter (`---` block) for the new metadata, keep existing markdown-blockquote metadata in the body.
> **Rationale:** YAML frontmatter is greppable and parseable (matches the brief's "skills filter by `status: active`" goal). The blockquote prose is what humans read in GitHub/editor preview; ripping it out reduces readability for a tiny perf win that nobody asked for. Two audiences justifies two locations.
> **Alternative rejected:** Replace blockquote metadata entirely with frontmatter. Rejected because it makes artifacts harder to read at a glance and migration becomes a content-rewrite rather than a content-addition.

> **Decision:** Per-feature folder uses the slug `<YYYY-MM-DD>-<feature-name>`, identical to current brief filename.
> **Rationale:** Continuity with existing convention; existing users already think in terms of dated slugs; migration becomes `mkdir docs/features/<slug>/ && git mv`.
> **Alternative rejected:** Drop the date prefix and use only the feature name (e.g., `docs/features/auth-redesign/`). Rejected because date is the only natural sort key and removes ambiguity when a slug gets reused (e.g., "auth-redesign" round 2 next year).

> **Decision:** Folder is `docs/features/<slug>/` (matches the brief). Brief = `brief.md`, research = `research.md`, design = `design.md`, specs = `specs/*.md` inside the feature folder.
> **Rationale:** Brief author already wrote this in the proposal and it matches how teams talk ("the auth feature folder"). Avoids a 4-deep nesting.
> **Alternative rejected:** Keep `docs/briefs/`, `docs/research/`, `docs/designs/` as flat folders with frontmatter linking via `feature:` field. Rejected because the navigation problem is the *primary* motivation for the work — frontmatter alone keeps it write-only.

> **Decision:** Bugfix specs continue going to `docs/specs/<feature-or-area>/bugfix-name.md` for now, NOT into per-feature folders.
> **Rationale:** Bugfixes are often cross-cutting and don't naturally belong to a feature folder. The brief's brief itself frames bugs as area-level, not feature-level. Forcing them into `docs/features/<slug>/specs/` would require inventing a fake feature for every bug.
> **Alternative rejected:** Move bugfixes into `docs/features/<slug>/specs/` like everything else. Rejected because the area-level grouping in `docs/specs/` is already working and bugfixes have shorter lifecycles than features. Specs folder coexists with `docs/features/` post-migration; we just stop adding *feature* specs there.

> **Decision:** The Handoff line is a fenced code block with a single command on one line, paths space-separated, no surrounding prose.
> **Rationale:** Mechanical copy-paste compatibility. Free-form prose is what we have today and it's slightly inconsistent across skills — explore agent shows artifact mentions live in different places per skill.
> **Alternative rejected:** Free-form prose (current state). Rejected: research Q showed inconsistency.
> **Alternative rejected:** Structured "Handoff" YAML block. Rejected: too foreign for a copy-paste UX; users want to paste a slash command, not parse YAML.

> **Decision:** Solo-by-default. `npx joycraft init` does NOT create `docs/areas/`. That folder appears only when `/joycraft-collaborative-setup` runs.
> **Rationale:** Brief constraint: "team-only pieces only appear when /joycraft-collaborative-setup runs." Solo users get zero ceremony.
> **Alternative rejected:** Always scaffold an empty `docs/areas/`. Rejected: violates the explicit constraint.

> **Decision:** Migration is opt-in via `npx joycraft upgrade` prompt. Old layout (flat `docs/briefs/`, `docs/research/`, etc.) keeps working for at least one release cycle — skills detect both layouts.
> **Rationale:** Brief constraint: "No silent breakage." User can decline migration.
> **Alternative rejected:** Force migration on upgrade. Rejected: violates explicit constraint.

> **Decision:** Fix `src/init.ts:164` and `src/upgrade.ts:238` to read the real CLI version from `package.json` (same pattern as `src/cli.ts:7`).
> **Rationale:** Direct fix of identified bug. Pattern already exists in cli.ts.
> **Alternative rejected:** Continue hardcoding. Rejected: explicit scope of the PR.

> **Decision:** Backlog uses its own minimal frontmatter schema, not the standard 4-field. Specifically `{ created, owner, source?, status: backlog|promoted|pruned }`.
> **Rationale:** Backlog has a different lifecycle (pruning is fine, no audit history). `feature:` doesn't apply since backlog items aren't tied to features. `source:` lets us keep a pointer back to the originating brief without forcing it. `status` here is backlog-specific (different vocabulary than the personal-artifact statuses).
> **Alternative rejected:** Reuse the 4-field schema with `status: backlog`. Rejected: muddies the schema; `feature:` becomes meaningless; pruning a "real" status is uncomfortable but pruning a backlog entry is fine.

> **Decision (Q1):** Handoff line is a fenced bash code block with a one-line label above ("Next:") and a follow-up "Run /clear first." line below. No artifact → emit only the next-command suggestion (no path).
> **Rationale:** Mechanical copy-paste compatibility. Visually distinct. Degrades gracefully when no artifact.
> **Alternative rejected:** Inline backtick or structured YAML — see Section 5 Q1 history.

> **Decision (Q2):** Backlog is opt-in but agents may proactively offer to capture deferred items. "Open Questions" in briefs/designs stay as-is (they are human-must-answer prompts, not deferred work). "Out of Scope" sections in briefs stay as-is (they catch misunderstandings between agent and human). Skills MAY ask "this looks deferrable — want to capture to backlog?" but NEVER auto-write to `docs/backlog/` without explicit user confirmation. Treat any write to `docs/` as a conscious user-initiated action — proactive proposal is fine, silent action is not.
> **Rationale:** Open Questions and Out of Scope serve different purposes than backlog (debate prompts and misunderstanding-catchers vs deferred work). Conflating them loses both. The proactive offer pattern keeps discoverability without sacrificing the "human consciously asked for this doc" invariant.
> **Alternative rejected:** Backlog replaces Out of Scope sections (Section 5 Q2 Option B). Rejected: collapses two distinct functions into one location.
> **Alternative rejected:** Skills never offer; backlog is purely manual. Rejected: discoverability suffers and most users won't know the feature exists.

> **Decision (Q3):** No prescribed promotion mechanism. User moves files however they want — `mv`, `git mv`, drag in editor, ask the agent to do it. Skills and docs do not assume git tracking. (Some users gitignore joycraft artifacts; `git mv` would fail for them.)
> **Rationale:** Filesystem-level operations are universal; git-tracked-ness varies per user. No new code needed; promotion is rare enough that prescribing UX is over-investment.
> **Alternative rejected:** Dedicated `/joycraft-promote-backlog` skill. Rejected: same operation, more code, doesn't help gitignored users.
> **Alternative rejected:** Mandate `git mv`. Rejected: breaks for users who gitignore joycraft artifacts.

> **Decision (Q4):** Single Y/N migration prompt at `npx joycraft upgrade` is replaced by the Q6 forced-migration decision. Not applicable.

> **Decision (Q5):** Move version-reading into a shared `src/package-version.ts` module. Both `init.ts` and `upgrade.ts` import it. Pattern matches the working code at `src/cli.ts:7`.
> **Rationale:** Single source of truth. cli.ts proves the pattern works.
> **Alternative rejected:** Inline duplication or build-time injection — see Section 5 Q5.

> **Decision (Q6):** Forced migration. `npx joycraft upgrade` runs the flat → per-feature migration unconditionally with a printed summary. No Y/N prompt. No old-layout fallback in skills. README documents what's happening so users aren't surprised.
> **Rationale:** Joycraft user base is small; ripping the bandaid is acceptable and dramatically simplifies skill code (no dual-layout conditionals across 8+ skills). README acts as the announcement channel.
> **Alternative rejected:** Opt-in migration with stateless layout detection (Section 5 Q6 Option A). Rejected: doubles the conditional logic in every skill for a user-base-of-N benefit.
> **Implication:** Brief constraint "User can decline and stay on flat structure" is overridden by this decision. Brief should be updated to reflect.

> **Decision (Q7):** When git `user.name` is missing, the skill asks the user "what name should I use as owner?", writes the answer to the agent's auto-memory system (`/Users/<user>/.claude/projects/<project>/memory/`, NOT a project-local config), and prints a nudge: "tip: set `git config --global user.name` so this doesn't ask again." Subsequent runs read from memory if git config is still empty.
> **Rationale:** Never blocks workflow. Memory persists across sessions for that user. The git-config nudge is a one-time gentle suggestion, not a hard requirement.
> **Alternative rejected:** Fall back to `process.env.USER || 'unknown'` (Section 5 Q7 Option A). Rejected: "unknown" pollutes frontmatter forever; the ask-once pattern is lightweight.
> **Alternative rejected:** Block until git config is set. Rejected: hostile to CI environments and fresh installs.

> **Decision (Q8):** Design skill ALWAYS ends post-approval with a Handoff line pointing at `/joycraft-decompose` (with the brief, research, and design paths). The pre-approval review-blocking message stays — design still acts as a human checkpoint. The Handoff line appears AFTER the human approves the design, not before.
> **Rationale:** Human-review checkpoint is preserved (the value of the skill). Post-approval Handoff line keeps muscle-memory contract consistent across all hand-off skills. Two ending modes is fine; the skill markdown can clearly delineate them.
> **Alternative rejected:** Design never emits Handoff line (current behavior). Rejected: breaks the contract every other skill follows.

---

## Section 5: Open Questions

All Q1–Q8 questions resolved during human review on 2026-05-09. See Section 4 for resolved decisions.

**Note on Q6 (forced migration):** This decision overrides the brief's earlier resolved decision that migration must be opt-in. The brief should be updated to reflect this before decomposition. README needs a corresponding note explaining the migration so existing users aren't surprised.

---

## Recommended Next Steps

After human review of Section 5:

```bash
/joycraft-decompose docs/briefs/2026-05-09-collaborative-mode-draft.md docs/research/2026-05-09-collaborative-mode.md docs/designs/2026-05-09-collaborative-mode.md
```

Run `/clear` first.
