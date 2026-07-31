---
status: done
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Support Custom Output Templates — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / 5–6 canonical skills + init scaffolding / ~100 lines

---

## What

Users can drop their own output template (e.g. their company's PRD format) into `docs/templates/output/`, and the document-producing gate skills (interview, new-feature, design, bugfix) check that directory before falling back to the bundled structures: a matching custom template shapes the markdown artifact's section structure, and the HTML render carries the same custom sections inside the locked gate skeleton's generic slot regions. `init`/`upgrade` scaffold an empty `docs/templates/output/` with a short README explaining the convention. Absent a custom template, bundled defaults apply byte-for-byte unchanged.

## Why

Teams with an existing PRD/doc template can't feed it to Joycraft — the output shape is fixed, so Praful reformats generated docs by hand before they can enter his team's Notion process.

## Acceptance Criteria

- [ ] Document-producing gate skills instruct: check `docs/templates/output/` for a matching template before using the bundled structure, and follow the custom template's section structure for the md artifact when one exists `[src: D3]`
- [ ] The HTML render carries the custom sections inside the existing skeleton's slot regions — skeleton, classes, and CSS byte-identical `[src: brief "Hard Constraints"]`
- [ ] With `docs/templates/output/` absent or empty, gate output is unchanged from today `[src: brief "What \"Done\" Looks Like"]`
- [ ] `init` scaffolds `docs/templates/output/` with a README documenting the convention (name-matching + what a template may contain); `upgrade` adds it to existing projects `[src: D3]`
- [ ] `pnpm sync-skills` run; regenerated + installed copies committed in the same commit `[src: brief "Hard Constraints"]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skills reference the output dir | `tests/gate-contract.test.ts`: assert `docs/templates/output/` appears in each document-producing claude-variant skill | unit |
| init scaffolds the dir + README | extend `tests/init.test.ts`: run init into a temp dir, assert `docs/templates/output/README.md` exists | integration |
| upgrade adds the dir to existing projects | extend `tests/upgrade.test.ts` fixture flow | integration |
| Defaults unchanged without custom template | assert the bundled template files are byte-identical before/after (no incidental edits) | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/gate-contract.test.ts` — seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep template rendering agent-hand-filled — no md→HTML library, no new runtime dependency `[src: brief "Hard Constraints"]`
- MUST: keep the gate HTML skeleton locked — custom templates shape content inside slots, never the skeleton `[src: brief "Hard Constraints"]`
- MUST: keep all paths project-relative (`docs/templates/output/`, never repo or absolute paths) `[src: brief "Hard Constraints"]`
- MUST: run `pnpm sync-skills` and commit regenerated + installed copies in this spec's own commit `[src: brief "Hard Constraints"]`
- MUST NOT: overwrite anything a user placed in `docs/templates/output/` — init/upgrade only create what's missing `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md`, `joycraft-new-feature.md`, `joycraft-design.md`, `joycraft-bugfix.md` | custom-template lookup step before output rendering |
| Modify | `src/init.ts` | scaffold `docs/templates/output/` + README |
| Modify | `src/upgrade.ts` | add the dir on upgrade if missing |
| Add | `src/templates/output-README.md` (bundled) | convention doc copied into user projects |
| Modify | `tests/init.test.ts`, `tests/upgrade.test.ts`, `tests/gate-contract.test.ts` | coverage |
| Modify | generated trees + installed copies | regenerated via `pnpm sync-skills` |

## Approach

Convention over configuration: a file in `docs/templates/output/` whose name matches the artifact kind (e.g. `brief.md`, `prd.md`, `design.md`) is the template for that gate's output; the skill reads it, mirrors its section structure in the generated md, and maps sections into the gate skeleton's generic slot blocks for HTML. Matching is by filename, documented in the scaffolded README. Rejected alternative: a template registry in `state.json` mapping gates→templates — more machinery than the one-directory convention buys, and it makes the mapping invisible to the person browsing the repo.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Custom template omits sections Joycraft needs (frontmatter, decisions) | Skill appends the required machine sections after the custom structure; frontmatter always present |
| Multiple templates match ambiguously | Exact filename match only; no fuzzy matching — unmatched files are ignored |
| Custom template contains absolute paths or scripts | Content is treated as structure to mirror, never executed; paths copied verbatim are the user's responsibility |
| Template added mid-feature (brief exists, specs don't) | Next gate run uses it; existing artifacts untouched |
