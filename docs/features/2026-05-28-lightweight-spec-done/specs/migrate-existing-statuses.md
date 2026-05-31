---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: batch
---

# Migrate Existing Statuses — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / data-only edits across ~17 files + 1 migration test

---

## What
A one-time migration of all on-disk spec status data to the unified three-word vocabulary defined in `define-status-vocabulary`. This rewrites the `status:` frontmatter field in every existing spec `.md`, the `status` field in every `.joycraft-spec-queue.json`, and any spec-body `Status:` lines, applying the mapping `active→todo`, `backlog→todo`, `complete→done`, `shipped→done`. After this spec, no file in the repo carries an old status word.

## Why
The new scripts and skills (specs 3–8) serve/skip based on `todo`/`in-review`/`done`. If existing data still says `active`/`complete`/`shipped`, the pipeline will silently skip real specs or mis-render status. The data must match the contract before the code that reads it ships.

## Acceptance Criteria
- [ ] Every `docs/features/*/specs/*.md` frontmatter `status:` is one of `todo`, `in-review`, `done` (no `active`/`backlog`/`complete`/`shipped` remain)
- [ ] Every `docs/features/*/specs/.joycraft-spec-queue.json` `status` value is one of `todo`, `in-review`, `done`
- [ ] Every `docs/bugfixes/**/*.md` frontmatter `status:` is migrated likewise
- [ ] Spec-body `Status:` lines that said `Complete` are reconciled (left as human-readable `Complete` is acceptable IF the test only governs frontmatter + queue JSON — see Constraints)
- [ ] The `2026-05-09-collaborative-mode` spec with a malformed dual `active`+`backlog` value is corrected to a single `todo`
- [ ] A repo-wide guard test fails if ANY old status word reappears in frontmatter or queue JSON
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| No old words in frontmatter | `tests/status-migration.test.ts`: glob all `docs/features/*/specs/*.md` + `docs/bugfixes/**/*.md`, parse YAML frontmatter, assert `status` ∈ {todo, in-review, done} for each | unit |
| No old words in queue JSON | Glob all `.joycraft-spec-queue.json`, parse, assert every spec entry `status` ∈ {todo, in-review, done} | unit |
| Guard catches regressions | Assert the test set is non-empty (at least the known files are scanned) so the guard can't pass vacuously | unit |

**Execution order:**
1. Write the guard test — it MUST FAIL initially (existing files carry `shipped`/`complete`/`active`/`backlog`)
2. Run to confirm red
3. Migrate each file until the guard is green

**Smoke test:** `pnpm vitest run tests/status-migration.test.ts`.

**Before implementing, verify your test harness:**
1. The guard test reads real on-disk files via glob — confirm it FAILS first (the agent's recon found 9 `shipped`, 2 `complete`, 1 `active`, 1 `backlog` + queue files)
2. Use the project's YAML/frontmatter parser if one exists; otherwise a minimal regex on the `status:` line is acceptable for the test
3. The single test file is the smoke test

## Constraints
- MUST: apply exactly the mapping from `define-status-vocabulary`: `active→todo`, `backlog→todo`, `complete→done`, `shipped→done`
- MUST: scan and migrate BOTH frontmatter `status:` AND queue JSON `status` for every feature — they must end identical per spec
- MUST: fix the known malformed file `docs/features/2026-05-09-collaborative-mode/specs/update-doc-producing-skills.md` (dual `active`+`backlog`) to a single `todo`
- MUST NOT: change spec *content* — only the status field/value
- MUST NOT: alter files under `docs/archive/` (out of scope; the decompose filter already ignores them)
- SHOULD: leave human-readable body `Status: Complete`/`In Progress` lines as prose if the test only governs frontmatter+JSON — but if migrating them is trivial, prefer `Status: Done`/`Status: To Do` for consistency. Pick one and be consistent.

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `docs/features/2026-05-21-context-layer/specs/*.md` (9 files) | `shipped → done` |
| Modify | `docs/features/2026-05-26-pi-support/specs/*.md` (2 + others) | `complete → done` (frontmatter) |
| Modify | `docs/features/2026-05-09-collaborative-mode/specs/update-doc-producing-skills.md` | dual `active`+`backlog` → single `todo` |
| Modify | `docs/features/*/specs/.joycraft-spec-queue.json` (4 files) | `active→todo`, `complete→done` per entry |
| Modify | `docs/bugfixes/cli/bugfix-upgrade-stale-cli.md` | `shipped → done` |
| Create | `tests/status-migration.test.ts` | The repo-wide status guard |

*(Exact file set: re-glob at implement time — `grep -rl 'status: \(active\|backlog\|complete\|shipped\)' docs/features docs/bugfixes` and the queue JSONs. Do not trust this table as exhaustive; the glob is authoritative.)*

## Approach
1. Write the guard test first (red).
2. Find every offender: `grep -rln` over `docs/features/*/specs/*.md`, `docs/bugfixes/**/*.md`, and `**/.joycraft-spec-queue.json` for the four old words.
3. Apply the mapping mechanically. Frontmatter and queue can be edited in place; verify per-feature that frontmatter and queue agree afterward.
4. Re-run the guard until green.

**Rejected alternative:** Writing a reusable migration *script* shipped in the tool. Rejected — this is a one-time internal data fix for *this repo's* docs, not a user-facing capability; a script would be dead code. (User projects start fresh on the new vocabulary via the updated decompose template in spec 4.)

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| A spec's frontmatter and queue disagreed before migration | After migration both say the mapped value; if they mapped to different states, treat the queue JSON as authoritative and reconcile frontmatter to it (note in commit) |
| A file has no `status:` field | Leave it; the guard only governs files that declare a status |
| `docs/archive/` contains old words | Untouched — out of scope |
| New status word typo introduced during edit | Guard test catches it (asserts membership in the exact set) |
