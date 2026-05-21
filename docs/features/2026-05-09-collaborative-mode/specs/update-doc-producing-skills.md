# Update Doc-Producing Skills — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 2 sessions / ~13 files / ~600 lines diff (mostly markdown)
> **Depends on:** `add-frontmatter-module.md`, `update-init-layout.md`

---

## What

Update the eight doc-producing skill markdown files (`joycraft-interview`, `joycraft-new-feature`, `joycraft-research`, `joycraft-design`, `joycraft-decompose`, `joycraft-bugfix`, `joycraft-session-end`, `joycraft-add-fact`) plus `joycraft-implement` AND `src/improve-claude-md.ts` to enforce five conventions established by the design: (1) write under `docs/features/<slug>/` with the canonical filenames `brief.md` / `research.md` / `design.md` / `specs/*.md`, (2) emit YAML frontmatter (4-field personal or 2-field shared schema), (3) end every output with a standardized fenced-bash Handoff block followed by `Run /clear first.`, (4) filter out `status: shipped|deprecated|superseded` when scanning docs, (5) **feature-folder README convention** — `joycraft-decompose` writes a `README.md` to the spec folder containing the feature summary, spec table with dependencies, and execution waves; `joycraft-implement` reads sibling `README.md` first when given a spec path so it understands the spec's position in the wave plan. This spec also folds in the backlog convention (lazy-create `docs/backlog/`, backlog frontmatter schema, "offer don't auto-write" prompt in skills that elicit deferred items) and the `docs/areas/` discoverability pointer that `improve-claude-md.ts` injects when an `areas/` folder is present.

## Why

Without this spec, skills still write to flat `docs/briefs/` etc., still use markdown blockquote metadata, and have inconsistent hand-off endings. Spec 4's migration moves files into the new layout but skills would re-create the flat dirs on next write — undoing migration. Skill-level enforcement is the only durable fix per the design's Pattern A (skills are self-contained; no shared include).

## Acceptance Criteria

### Folder + filename rules

- [ ] `joycraft-new-feature` writes briefs to `docs/features/<slug>/brief.md` (not `docs/briefs/YYYY-MM-DD-X.md`). Slug is `YYYY-MM-DD-<feature-name>`.
- [ ] `joycraft-interview` writes drafts to `docs/features/<slug>/brief.md` with frontmatter `status: draft`. Slug uses `YYYY-MM-DD-<topic>` (no `-draft` suffix in folder name; status field carries draft semantics).
- [ ] `joycraft-research` writes to `docs/features/<slug>/research.md` and `.questions-tmp.md` to `docs/features/<slug>/.questions-tmp.md`.
- [ ] `joycraft-design` writes to `docs/features/<slug>/design.md`.
- [ ] `joycraft-decompose` writes specs to `docs/features/<slug>/specs/<spec-name>.md`.
- [ ] `joycraft-bugfix` continues writing to `docs/specs/<feature-or-area>/bugfix-name.md` (per design decision — bugfixes stay area-level).
- [ ] `joycraft-session-end` writes discoveries to `docs/discoveries/YYYY-MM-DD-topic.md` (still flat — discoveries aren't feature-tied per design).
- [ ] All eight skills lazy-create their target directory (existing Pattern B preserved).

### Frontmatter rules

- [ ] Every artifact-writing skill's instructions include emission of YAML frontmatter at the top of the file (`---\n...\n---\n`) using the 4-field personal schema: `status`, `owner`, `created`, `feature` (when applicable).
- [ ] `joycraft-add-fact` updates to `docs/context/decision-log.md`, `production-map.md`, etc., emit/update the 2-field shared schema (`last_updated`, `last_updated_by`). New shared docs get a frontmatter block on first write; existing ones get their `last_updated` field bumped.
- [ ] Skills get the owner via the `resolveOwner()` pattern documented in `src/frontmatter.ts` (skill markdown describes the resolution chain inline so it remains self-contained — Pattern A).
- [ ] Frontmatter-emission instructions include explicit YAML examples in each skill (copy-paste from a single canonical block in this spec).

### Handoff line rules

- [ ] Every skill that hands off ends with a fenced bash code block + a one-line label above + `Run /clear first.` line below. The shape:

  ```
  Next:
  ```bash
  /joycraft-<next-skill> <path1> <path2>
  ```
  Run /clear first.
  ```

- [ ] When a skill produces no artifact (`joycraft-implement` mostly edits source — but is out of scope here; relevant to interview/new-feature when no recommended next step), the Handoff block degrades: just the slash command with no paths.
- [ ] `joycraft-design` emits its Handoff block ONLY after human approval of the design (per design decision Q8). Pre-approval, the existing review-blocking message stays.
- [ ] `joycraft-research` and the other skills that previously omitted `/clear` lines now emit the Handoff block consistently.
- [ ] Skills also include backlog paths in the Handoff block when a backlog entry was produced as a side effect (matches brief language about side-effect handoff).

### Status-filter rules

- [ ] Skills that scan existing docs (`joycraft-research`'s prior-research check, `joycraft-new-feature`'s in-flight feature check, `joycraft-decompose` when reading neighbor specs) instruct Claude to filter by `status: active` — i.e., skip files whose frontmatter has `status: shipped|deprecated|superseded`.
- [ ] Scanning instructions in the skill markdown explicitly tell Claude how to ignore archived files (`docs/archive/`) — they're never relevant.

### Feature-folder README rules

- [ ] `joycraft-decompose` skill instructions, after generating the per-spec files, ALSO write a `README.md` to the spec folder (`docs/features/<slug>/specs/README.md` for feature work, or `docs/specs/<feature-name>/README.md` for the legacy bugfix-area path).
- [ ] The README.md content includes: parent-brief / design / research links in a metadata block at top, a one-paragraph "what this feature does" summary, a markdown table of all specs in the folder with their dependencies, and the execution waves recommendation.
- [ ] `joycraft-implement` skill instructions, when given a spec path, instruct Claude to first check for a sibling `README.md` in the same folder (`<spec-path>/../README.md`); if present, read it before reading the spec itself. The README provides wave-plan context that the spec alone doesn't carry.
- [ ] If sibling specs in the same folder have unmet dependencies (per the README's table), `joycraft-implement` warns the user and asks whether to proceed (the user might be deliberately running out of order, e.g., a hotfix).
- [ ] If no `README.md` exists (legacy spec folders pre-dating this convention), `joycraft-implement` proceeds normally without warning — the convention is forward-only, never retroactive.
- [ ] `joycraft-decompose` also instructs Claude to update the parent brief's "Execution Strategy" section with the same wave-plan info, so the brief stays a useful one-stop reference (the README is the single source of truth for *implementers*; the brief is the single source for *feature reviewers*).

### Backlog convention

- [ ] `joycraft-interview`, `joycraft-new-feature`, `joycraft-design` skill markdown gain a section instructing the agent to ASK (not auto-write) when a deferrable item surfaces: "this looks like deferred work — want me to capture it to `docs/backlog/`?" Only on user confirmation, the agent writes a backlog entry.
- [ ] Backlog entries live at `docs/backlog/<slug>.md`. Slug is `YYYY-MM-DD-<short-name>`.
- [ ] Backlog frontmatter uses the 4-field backlog schema (per design): `status: backlog`, `owner`, `created`, optional `source: docs/features/<slug>/brief.md`.
- [ ] FEATURE_BRIEF_TEMPLATE.md and DESIGN_SPEC_TEMPLATE.md gain a one-line note pointing at backlog as the place for deferred work; the existing `## Out of Scope` and `## Open Questions` sections are NOT removed (per design Q2 — they serve different functions).
- [ ] No skill silently auto-writes to `docs/backlog/`. Any write to docs is user-confirmed.

### CLAUDE.md areas pointer

- [ ] `src/improve-claude-md.ts` detects whether `docs/areas/` exists in the project. When it does, it includes a section in the generated CLAUDE.md pointing Claude at area-level docs. Pointer phrasing: `"When working on the <area-name> area, read \`docs/areas/<area-name>/README.md\` first. Each area may have its own boundaries — check \`docs/areas/<area-name>/boundaries.md\` if it exists."`
- [ ] When `docs/areas/` does NOT exist, the pointer section is omitted entirely from CLAUDE.md (solo-mode default).
- [ ] The pointer section is idempotent — re-running improve-claude-md on a CLAUDE.md that already contains it doesn't duplicate.

### Build / tests

- [ ] `pnpm build` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test --run` passes.
- [ ] Skill-evals (if present) for each updated skill pass — running each skill produces frontmatter and a Handoff block.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Each skill's markdown contains YAML-frontmatter emission instructions | `tests/skill-frontmatter.test.ts` — read each of the 8 skill files, assert the markdown contains the literal string `---` (delimiter) and references to `status:`, `owner:`, `created:` | unit (string check on skill content) |
| Each skill's markdown contains a Handoff block | `tests/skill-handoff.test.ts` — read each skill, assert markdown contains `Next:` followed by a fenced ` ```bash ` block and `Run /clear first.` | unit |
| `joycraft-design` Handoff block instructions are post-approval-only | Same — assert the design skill markdown explicitly says the Handoff block emits AFTER human approval | unit |
| Skill markdown references the new feature-folder paths | Same — assert each skill mentions `docs/features/<slug>/` (or for bugfix, `docs/specs/<feature-or-area>/`) | unit |
| Status-filter instructions present in scanning skills | `tests/skill-status-filter.test.ts` — for `research`, `new-feature`, `decompose`, assert markdown mentions filtering by `status: active` | unit |
| Skills prompt-but-don't-auto-write for backlog | `tests/skill-backlog.test.ts` — for `interview`, `new-feature`, `design`, assert markdown contains "want me to capture" or equivalent confirmation language and explicitly instructs not to write without confirmation | unit |
| `joycraft-decompose` writes a feature-folder README.md | `tests/skill-feature-readme.test.ts` — read decompose skill markdown, assert it instructs Claude to write `README.md` with brief/design links, spec table, and wave plan | unit |
| `joycraft-implement` reads sibling README.md first | Same — read implement skill markdown, assert it instructs Claude to check for and read a sibling `README.md` before the spec, and warn on unmet deps | unit |
| `improve-claude-md.ts` emits areas pointer when `docs/areas/` exists | `tests/improve-claude-md.test.ts` — pre-create `docs/areas/auth/`, run improve, assert generated CLAUDE.md contains the pointer | integration |
| `improve-claude-md.ts` omits areas pointer when no `docs/areas/` | Same — fresh project, run improve, assert pointer absent | integration |
| Areas pointer is idempotent | Same — run improve twice, assert pointer appears once not twice | integration |
| FEATURE_BRIEF_TEMPLATE.md mentions backlog | `tests/templates.test.ts` — read FEATURE_BRIEF_TEMPLATE.md, assert it contains a reference to `docs/backlog/` |  unit |
| DESIGN_SPEC_TEMPLATE.md mentions backlog | Same — assert DESIGN_SPEC_TEMPLATE.md references `docs/backlog/` | unit |

**Execution order:**
1. Write all eleven test files (some new); they fail.
2. Confirm red.
3. Edit each of the 8 skill files + improve-claude-md.ts + 2 templates.
4. Tests go green.
5. Run actual `dist/cli.js init` against a tmp dir and inspect a generated CLAUDE.md to spot-check the areas pointer when `docs/areas/` is pre-created (manual smoke).

**Smoke test:** `pnpm test --run tests/skill-handoff.test.ts` — fastest signal because it just reads markdown and greps. Use this for fast feedback during iteration.

**Before implementing, verify your test harness:**
1. Each test reads the actual skill files (under `src/claude-skills/`), not stubs.
2. Tests fail when skill markdown is unmodified.
3. Smoke test runs in <1s — pure file reads + string assertions.

## Constraints

- MUST: Keep skills self-contained (Pattern A) — frontmatter-emission and Handoff-block instructions are duplicated in each skill, NOT factored into a shared include. The cost is markdown duplication; the benefit is skill-installation simplicity.
- MUST: Preserve the existing user-facing behavior of each skill (interview is still an interview, design still blocks for review). Only the artifacts they produce change shape.
- MUST: Follow the canonical Handoff-block shape exactly across all skills — inconsistency defeats the muscle-memory goal (per brief).
- MUST: When a skill writes a brief or any feature artifact, also include the slug derivation logic explicitly in the markdown (so Claude derives slug → folder uniformly). Slug = `YYYY-MM-DD-<feature-name>` where date is today and feature-name is kebab-case from the topic.
- MUST: Update `src/cli-skills/index.ts` (or wherever `SKILLS` is enumerated by `src/init.ts:152`) to include the same set of files — no skill renames in this spec, just content updates.
- MUST: Run skill content through the bundle process — research Q8 noted templates are bundled via `bundled-files.ts`; same applies to `SKILLS`. Don't break the bundle.
- MUST NOT: Rename any skill files (out of scope per brief — `/tune` rename is explicitly deferred).
- MUST: Touch `joycraft-implement.md` to add the sibling-README-reading instruction (NEW — added per feature-folder README convention). Implement still doesn't write artifacts; the README read is purely an input-context expansion. A Handoff block at the end of implement (handing off to session-end) is also added in this spec since the convention applies uniformly.
- MUST NOT: Auto-write to `docs/backlog/` from any skill — every backlog write is user-confirmed.
- MUST NOT: Remove existing `## Out of Scope` or `## Open Questions` sections from briefs/designs (per design Q2).
- MUST NOT: Reference the `joycraft-scenarios` repo (CLAUDE.md NEVER rule).

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-interview.md` | New folder path, frontmatter emission, Handoff block, backlog prompt instructions |
| Modify | `src/claude-skills/joycraft-new-feature.md` | Same as interview + status-filter when listing in-flight features |
| Modify | `src/claude-skills/joycraft-research.md` | New folder path, frontmatter emission, Handoff block (was missing /clear), status-filter when scanning prior research |
| Modify | `src/claude-skills/joycraft-design.md` | New folder path, frontmatter, Handoff block (post-approval only), backlog prompt |
| Modify | `src/claude-skills/joycraft-decompose.md` | New folder path for parent feature folder + specs subdir, frontmatter on each spec, Handoff block, status filter when reading neighbor specs |
| Modify | `src/claude-skills/joycraft-bugfix.md` | Frontmatter on bugfix spec, Handoff block (path-aware) |
| Modify | `src/claude-skills/joycraft-session-end.md` | Frontmatter on discoveries, shared-frontmatter update on context docs, Handoff block |
| Modify | `src/claude-skills/joycraft-add-fact.md` | Shared-frontmatter (`last_updated`, `last_updated_by`) on context docs |
| Modify | `src/claude-skills/joycraft-implement.md` | Read sibling `README.md` before the spec; warn on unmet deps; add Handoff block to session-end |
| Modify | `src/claude-skills/joycraft-decompose.md` (additionally) | Write `README.md` to spec folder summarizing feature + spec table + wave plan |
| Modify | `src/improve-claude-md.ts` | Detect `docs/areas/`; emit areas-pointer section when present; idempotent |
| Modify | `templates/FEATURE_BRIEF_TEMPLATE.md` | One-line note pointing at `docs/backlog/` for deferred items |
| Modify | `templates/DESIGN_SPEC_TEMPLATE.md` | Same one-line note |
| Create | `tests/skill-frontmatter.test.ts` | String-check tests across all 8 skills |
| Create | `tests/skill-handoff.test.ts` | Same |
| Create | `tests/skill-status-filter.test.ts` | Same |
| Create | `tests/skill-backlog.test.ts` | Same |
| Create | `tests/skill-feature-readme.test.ts` | decompose writes README + implement reads it |
| Modify | `tests/improve-claude-md.test.ts` | Add areas-pointer assertions (or create file if it doesn't exist yet) |
| Create | `tests/templates.test.ts` | Backlog references in templates |

## Approach

**Strategy:** This is the largest spec because it touches every doc-producing skill. The work is mostly mechanical markdown editing with tight templates. To keep diffs reviewable, treat the four convention rules as orthogonal: do them in waves rather than file-at-a-time.

**Execution waves (within the spec session):**

1. **Wave A — Folder paths.** Update each of the 8 skills' file-write instructions to use `docs/features/<slug>/<artifact>.md`. Update slug-derivation language. Run skill-folder-path tests.
2. **Wave B — Frontmatter.** Add the YAML-emission instructions to each skill (with copy-pasted YAML example block per skill). Update `add-fact` for shared-frontmatter on context docs. Run skill-frontmatter tests.
3. **Wave C — Handoff blocks.** Replace each skill's closing prose / `Run /clear` line with the canonical fenced-bash Handoff block. Run skill-handoff tests.
4. **Wave D — Status filters and backlog prompts.** Add status-filter language to scanning skills. Add backlog-prompt language to `interview`/`new-feature`/`design`. Run remaining tests.
5. **Wave E — improve-claude-md areas pointer + template notes.** Update `src/improve-claude-md.ts` and the two templates. Run improve-claude-md and templates tests.

**Canonical Handoff block (copy verbatim into each skill, with skill-specific paths):**

```
## Recommended Next Steps

Next:
```bash
/joycraft-<next> <path1> <path2>
```
Run /clear first.
```

**Canonical personal-frontmatter block (each artifact-writing skill quotes this in its instructions):**

```yaml
---
status: active
owner: <resolved name>
created: 2026-05-09
feature: <feature-slug>   # omit when not applicable
---
```

**Canonical shared-frontmatter block (used by add-fact + session-end on context docs):**

```yaml
---
last_updated: 2026-05-09
last_updated_by: <resolved name>
---
```

**Canonical backlog-frontmatter block:**

```yaml
---
status: backlog
owner: <resolved name>
created: 2026-05-09
source: docs/features/<slug>/brief.md   # optional
---
```

**Canonical feature-folder README.md template (decompose skill emits, implement skill reads):**

```markdown
# <Feature Name> — Feature Specs

> **Parent Brief:** docs/features/<slug>/brief.md (or legacy path)
> **Design:** docs/features/<slug>/design.md (when present)
> **Research:** docs/features/<slug>/research.md (when present)
> **Status:** Decomposed YYYY-MM-DD, ready for implementation

## What this feature does

<one paragraph summary, derived from the brief>

## Specs

| # | Spec | Depends On | Notes |
|---|------|-----------|-------|
| 1 | [spec-name.md](spec-name.md) | — | <one-line description> |
...

## Execution waves

- Wave 1 (parallel): specs ...
- Wave 2: specs ...

## How to use this file

If you're running `/joycraft-implement <spec-path>`, the implement skill reads this README first so it understands the spec's position in the wave plan. Each spec is self-contained for the actual implementation; this README provides ordering context only.
```

**Areas-pointer section template (added to CLAUDE.md by improve-claude-md.ts when `docs/areas/` exists):**

```markdown
## Areas

This project organizes some work by area. When working on a specific area, read its README first; check for area-specific boundaries.

- For each area: see `docs/areas/<area-name>/README.md`
- Area-level boundaries (when present): `docs/areas/<area-name>/boundaries.md`
```

**Key decisions:**
- Slug shape stays `YYYY-MM-DD-<name>` (matches design Pattern D — date-prefixed slug as linking primitive).
- Drafts use `status: draft`, not a `-draft` suffix in folder name. One slug per topic — frontmatter handles the lifecycle distinction.
- `joycraft-bugfix` keeps writing under `docs/specs/<area>/` because bugfixes are area-level (design decision). Bugfix specs DO get frontmatter and Handoff blocks, just not the folder path change.
- The areas-pointer block in CLAUDE.md is added unconditionally by `improve-claude-md.ts` once `docs/areas/` exists — but only ever emitted when invoked (idempotently). It does NOT pre-create `docs/areas/`.

**Rejected alternative:** Factor the YAML/Handoff-block instructions into a shared template skill file that all skills include via reference. Rejected by Pattern A — skills must be self-contained when installed to `.claude/skills/`. Duplication is the cost of the convention.

**Rejected alternative:** Put backlog auto-capture into skills (the agent silently saves deferred items). Rejected by design Q2 — every doc write is user-initiated; skills propose, don't act.

**Rejected alternative:** Remove `## Out of Scope` from FEATURE_BRIEF_TEMPLATE.md, replacing with backlog references only. Rejected — Out of Scope and backlog serve different purposes (catching misunderstanding vs. deferred work).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Slug already exists at `docs/features/<slug>/` | The skill checks before creating — if folder has a `brief.md`, the skill asks: "this slug already exists; append to it or pick a new one?" rather than overwriting. |
| User runs `joycraft-research` against a feature that has no brief yet | Research still produces a feature folder; brief gets added later when `joycraft-new-feature` runs against the same slug. |
| `docs/areas/auth/` exists but is empty (no README.md) | Areas pointer in CLAUDE.md still includes it — the pointer is generic to "the area-name folder," not predicated on README.md existence. |
| `improve-claude-md.ts` runs on a CLAUDE.md that already has the areas section but `docs/areas/` was just deleted | Pointer section gets removed (idempotent in both directions). |
| User has frontmatter-bearing artifacts written by an older Joycraft (no frontmatter) | Status-filter instructions tell Claude to treat absent-frontmatter as `status: active` (default). Existing artifacts continue working. |
| Two skills write to the same path in close succession (e.g., interview produces brief.md, then new-feature wants to overwrite it) | new-feature reads existing brief.md, parses frontmatter, updates `status: active` (was `draft`), appends or rewrites body — but never silently overwrites without parsing. |
| `joycraft-bugfix` writes a spec with frontmatter `feature: <area>` even though the area isn't a real feature | OK — `feature:` field is informational; semantics are "what folder is this related to," not strict feature-tied. |
| User customized a skill (Joycraft hash-tracks managed files) | upgrade.ts will prompt about the customization, separate from this spec. |
