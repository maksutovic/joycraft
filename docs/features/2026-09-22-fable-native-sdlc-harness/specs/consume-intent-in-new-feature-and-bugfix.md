---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: batch
---

# Consume Intent in New-Feature and Bugfix — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 13 files / ~70 lines of skill prose plus regenerated variants

---

## What

The read end of the inbox. Both `joycraft-new-feature` and `joycraft-bugfix` learn to accept a path to an intent file as their argument, pre-fill from it, and link back to it.

**`joycraft-new-feature`** already has an argument convention: `src/skills/joycraft-new-feature.md:18` reads "Skip this phase if: the user provided a brief path as an argument". That clause broadens to a brief path **or** an intent path. Given an intent path, the skill reads the file and pre-fills its Phase 1 interview from the intent's sections — Problem feeds the brief's Problem framing, Proposed outcome feeds Vision and Success Criteria, Affected users and systems feeds User Stories, Constraints feeds Hard Constraints, Open questions become the interview's opening questions rather than a blank floor. The Phase 2 brief written to `docs/features/<slug>/brief.md` then carries `intent: docs/intent/<name>.md` in its frontmatter alongside the existing `status`, `owner`, `created`, and `feature` keys.

**`joycraft-bugfix`** has no argument convention today; it gains one. Given an intent path, Phase 1 triage starts from the intent's Problem and Affected users and systems instead of from a blank symptom question, and Phase 4 stamps `intent:` into the bugfix spec's frontmatter. That spec is written to `docs/bugfixes/<area>/<name>.md` — confirmed at `src/skills/joycraft-bugfix.md:107`, which also lazy-creates the area folder and maintains the area `README.md` index at line 111. Neither of those behaviors changes.

In both skills the intent file **stays in `docs/intent/`**. It is never moved, deleted, or archived. What changes is its `Status:` header, stamped to record that it was consumed and by which skill, so a later triage run does not re-surface it as untriaged.

Neither `intent:` nor `Status:` needs code. `src/frontmatter.ts` accepts arbitrary keys and has no production consumers, so both are inert metadata that a human or a later skill reads.

## Why

Without a reader, the inbox is write-only: spec 6 fills it and spec 7 sorts it, but every routed intent would still have to be re-explained by hand into whichever skill picks the work up. Pre-filling is what makes the intent worth writing, and the `intent:` backlink is what lets anyone reading a brief or a bugfix spec find the original framing. Leaving the file in place with an updated status is what keeps the inbox a record rather than a queue that erases its own history.

## Acceptance Criteria

- [ ] `joycraft-new-feature` accepts an intent path as its argument, in addition to the brief path it already accepts [src: brief "Decomposition"]
- [ ] Given an intent path, `joycraft-new-feature` pre-fills its interview from the intent's Problem, Proposed outcome, Affected users and systems, Constraints, and Open questions sections rather than opening a blank floor [src: brief "Decomposition"]
- [ ] The brief `joycraft-new-feature` writes carries `intent: <the intent path>` in its frontmatter alongside `status`, `owner`, `created`, and `feature` [src: brief "Success Criteria"]
- [ ] `joycraft-bugfix` accepts an intent path as its argument [src: brief "Decomposition"]
- [ ] Given an intent path, `joycraft-bugfix` pre-fills Phase 1 triage from the intent's Problem and Affected users and systems sections [src: brief "Decomposition"]
- [ ] The bugfix spec `joycraft-bugfix` writes to `docs/bugfixes/<area>/<name>.md` carries `intent: <the intent path>` in its frontmatter alongside `status`, `owner`, `created`, and `area` [src: brief "Success Criteria"]
- [ ] Both skills leave the intent file in `docs/intent/`, neither moving, deleting, nor archiving it [src: brief "Success Criteria"]
- [ ] Both skills update the intent file's `Status:` header to record that it was consumed and by which skill [src: brief "Success Criteria"]
- [ ] Invoked with no argument, or with a brief path, both skills behave exactly as they do today [src: brief "Success Criteria"]
- [ ] `joycraft-bugfix` still writes to `docs/bugfixes/<area>/<name>.md`, still lazy-creates the area folder, and still appends a row to the area `README.md` index [src: brief "Raw Notes"]
- [ ] The bugfix spec's `status:` still uses the spec vocabulary `todo | in-review | done`, so `tests/status-migration.test.ts` keeps passing [src: brief "Success Criteria"]
- [ ] Bundled variants are regenerated (`scripts/generate-bundled-files.mjs`) and installed copies synced (`pnpm sync-skills`) in the same commit as the `src/skills/` edits [src: brief "Hard Constraints"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Argument accepted | `tests/intent-consumers.test.ts` asserts both `src/skills/joycraft-new-feature.md` and `src/skills/joycraft-bugfix.md` contain `docs/intent/` and name an intent path as an accepted argument | unit |
| Pre-fill named | Same file asserts each skill names at least three intent section headings it pre-fills from (`Problem`, `Proposed outcome` / `Affected users and systems`, `Constraints`) | unit |
| `intent:` in brief frontmatter | Same file asserts `joycraft-new-feature`'s frontmatter block region contains an `intent:` line | unit |
| `intent:` in bugfix frontmatter | Same file asserts `joycraft-bugfix`'s frontmatter block region contains an `intent:` line | unit |
| File retained | Same file asserts each skill states the intent file stays in place and is not deleted or moved | unit |
| Status updated | Same file asserts each skill states the intent's `Status:` is updated | unit |
| Bugfix path unchanged | `tests/stale-skill-paths.test.ts` unchanged and green — codex bugfix still references `docs/bugfixes/`, `area:`, and `README` | regression |
| Spec vocabulary unchanged | `tests/status-migration.test.ts` unchanged and green | regression |
| Gate contracts unchanged | `tests/gate-contract.test.ts`, `tests/decide-pre-presentation.test.ts`, and `tests/artifact-render-steps.test.ts` unchanged and green | regression |
| Generated parity | `tests/intent-consumers.test.ts` repeats the argument and `intent:` assertions against `src/claude-skills/` and `src/codex-skills/` copies of both skills | unit |
| Installed copies fresh | `tests/installed-skills-sync*.test.ts` and `tests/bundled-files-sync.test.ts` green after `pnpm sync-skills` | regression |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the argument-accepted test (`pnpm test tests/intent-consumers.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: pause for human approval before the first write to any file under `src/skills/`, because skill content is an ask-first boundary [src: brief "Execution Strategy"]
- MUST: regenerate bundled variants with `scripts/generate-bundled-files.mjs` and run `pnpm sync-skills` in the same commit as the skill edits; `tests/regenerate-bundled-files.test.ts` runs the generator in a `beforeAll`, so deferring the sync commits a red suite [src: brief "Hard Constraints"]
- MUST: edit only `src/skills/joycraft-new-feature.md` and `src/skills/joycraft-bugfix.md` — the per-harness trees are generated and never hand-edited [src: brief "Hard Constraints"]
- MUST: keep the intent section list in `docs/templates/INTENT_TEMPLATE.md` and cite it by path rather than restating it in either skill [src: brief "Hard Constraints"]
- MUST: keep every path inside both skills project-relative [src: brief "Hard Constraints"]
- MUST NOT: move, delete, or archive an intent file [src: brief "Success Criteria"]
- MUST NOT: add a frontmatter validator or any code that parses `intent:` or `Status:` [src: brief "Out of Scope"]
- MUST NOT: change the bugfix output path away from `docs/bugfixes/<area>/<name>.md`, or drop the area `README.md` index row [src: brief "Raw Notes"]
- MUST NOT: rename brief, design, or specs, or introduce the playbook's `spec.md` and `plan.md` filenames [src: brief "Out of Scope"]
- MUST NOT: add the triage listing to either skill — triage lives in `joycraft-interview` only [src: brief "Out of Scope"]
- MUST NOT: add runtime dependencies [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-new-feature.md` | Phase 0 skip clause broadened to brief-or-intent path; intent pre-fill block; `intent:` added to the Phase 2 frontmatter block; intent-retention and `Status:` stamp instruction |
| Modify | `src/skills/joycraft-bugfix.md` | New intent-path argument clause ahead of Phase 1; Phase 1 pre-fill from the intent; `intent:` added to the Phase 4 frontmatter block; intent-retention and `Status:` stamp instruction |
| Modify | `src/claude-skills/joycraft-new-feature.md` | Regenerated |
| Modify | `src/claude-skills/joycraft-bugfix.md` | Regenerated |
| Modify | `src/codex-skills/joycraft-new-feature.md` | Regenerated |
| Modify | `src/codex-skills/joycraft-bugfix.md` | Regenerated |
| Modify | `src/pi-skills/joycraft-new-feature.md` | Regenerated |
| Modify | `src/pi-skills/joycraft-bugfix.md` | Regenerated |
| Modify | `src/copilot-skills/joycraft-new-feature.md` | Regenerated |
| Modify | `src/copilot-skills/joycraft-bugfix.md` | Regenerated |
| Modify | `src/omp-skills/joycraft-new-feature.md` | Regenerated |
| Modify | `src/omp-skills/joycraft-bugfix.md` | Regenerated |
| Modify | `src/bundled-files.ts` | Regenerated `SKILLS` and per-harness records |
| Modify | `.claude/skills/joycraft-new-feature/SKILL.md` | Synced installed copy |
| Modify | `.claude/skills/joycraft-bugfix/SKILL.md` | Synced installed copy |
| Modify | `.agents/skills/joycraft-new-feature/SKILL.md` | Synced installed copy |
| Modify | `.agents/skills/joycraft-bugfix/SKILL.md` | Synced installed copy |
| Modify | `.pi/skills/joycraft-new-feature/SKILL.md` | Synced installed copy |
| Modify | `.pi/skills/joycraft-bugfix/SKILL.md` | Synced installed copy |
| Modify | `.github/skills/joycraft-new-feature/SKILL.md` | Synced installed copy |
| Modify | `.github/skills/joycraft-bugfix/SKILL.md` | Synced installed copy |
| Modify | `.omp/skills/joycraft-new-feature/SKILL.md` | Synced installed copy |
| Modify | `.omp/skills/joycraft-bugfix/SKILL.md` | Synced installed copy |
| Create | `tests/intent-consumers.test.ts` | Argument, pre-fill, `intent:`, retention, and generated-parity assertions for both skills |

## Approach

Treat the intent path as a variant of an argument each skill either already handles or can handle in one clause, rather than as a new phase. In `joycraft-new-feature`, broaden the existing Phase 0 skip clause and add a short pre-fill paragraph immediately after it, so the Phase 0 listing logic and the Phase 1 question directive stay untouched. In `joycraft-bugfix`, add the argument clause next to the existing guard clause at the top of the body, where a reader already looks for entry conditions.

Add `intent:` to each skill's frontmatter code block as an optional key, documented as written only when the skill was given an intent path. Both frontmatter blocks are prose examples inside the skill body, so this is a two-line edit in each file with no parser to update.

Keep the `Status:` stamp wording symmetrical across the two skills and consistent with spec 7's stamp, so a triage run after a consumption run reads one vocabulary rather than two.

Rejected alternative: a shared "read an intent" block written once and cited from both skills. That is the better shape on paper for one home per fact, but skills must be self-contained — an installed `SKILL.md` cannot import from another file — so the cited block would have to be a template under `docs/templates/`, adding an install-time dependency and a third file to the two-skill edit for prose that is four sentences long.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No argument given | Unchanged behavior: new-feature runs Phase 0 draft discovery, bugfix runs Phase 1 triage from scratch |
| A brief path given to new-feature | Unchanged behavior: Phase 0 skipped, brief formalized as today |
| An intent path that does not exist | Say so in one line and fall back to the no-argument flow; never a crash, never a silent blank start |
| An intent file missing sections the skill pre-fills from | Pre-fill what is present, ask about the rest through the existing question directive |
| An intent already stamped as consumed | Proceed anyway on explicit human instruction, and say the file was already consumed and by which skill |
| An intent routed to `bugfix` but handed to new-feature | Proceed; the route is advice from triage, not a lock. The `intent:` backlink records what actually happened |
| Same intent consumed by both skills | Both stamps recorded; the later `Status:` value names the most recent consumer |
| Bugfix area cannot be derived from the intent | Ask for the area through the existing question directive, exactly as a bugfix with no intent does |
| Intent path is absolute | Normalize to project-relative before writing it into `intent:`, since the brief and the bugfix spec are read inside the project |
