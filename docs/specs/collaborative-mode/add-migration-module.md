# Add Migration Module — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 1 session / 2 files / ~250 lines incl. tests

---

## What

Create `src/migration.ts` — a self-contained, dependency-free filesystem-mover that walks a project's existing flat `docs/briefs/`, `docs/research/`, `docs/designs/`, and `docs/specs/<feature>/` directories, derives a per-feature slug for each related artifact set, and moves them into `docs/features/<slug>/{brief.md, research.md, design.md, specs/}`. Slug derivation matches existing filenames (e.g., `2026-03-23-stack-detection.md` → slug `2026-03-23-stack-detection`). Existing per-feature spec subdirectories (`docs/specs/<feature>/`) are matched by name to a brief slug; on match, the spec dir moves under the feature folder, on no match, it stays in `docs/specs/` (it's an area-level group like a bugfix area). The module exposes a pure plan step (returns the list of moves it would perform) and a separate apply step. No git operations — plain filesystem moves only.

## Why

Without a single migration code path, the forced migration in `npx joycraft upgrade` (spec 5) and the optional later migration via `/joycraft-collaborative-setup` (spec 7) would diverge. Centralizing this makes the migration testable in isolation, gives both callers a dry-run mode for surfacing a summary to the user, and keeps file-moving logic out of skill markdown.

## Acceptance Criteria

- [ ] `src/migration.ts` exports `planMigration(projectDir: string): MigrationPlan` — returns `{ moves: Array<{ from: string; to: string; kind: 'brief' | 'research' | 'design' | 'specs-dir' }>, slugs: string[], orphans: { specsDirs: string[] } }`. Pure function — no filesystem writes.
- [ ] Exports `applyMigration(plan: MigrationPlan): MigrationResult` — performs the moves with `renameSync` (or `cpSync` + `rmSync` if cross-device); returns counts and any per-move errors.
- [ ] Slug derivation: a brief at `docs/briefs/2026-03-23-stack-detection.md` produces slug `2026-03-23-stack-detection` and creates folder `docs/features/2026-03-23-stack-detection/`.
- [ ] Brief moves: `docs/briefs/<slug>.md` → `docs/features/<slug>/brief.md`.
- [ ] Research moves: `docs/research/<slug>.md` → `docs/features/<slug>/research.md`. If the research file's slug doesn't match any brief slug, the research file still gets a feature folder (slug derived from its own filename).
- [ ] Design moves: same pattern — `docs/designs/<slug>.md` → `docs/features/<slug>/design.md`.
- [ ] Spec dir moves: `docs/specs/<dirname>/` where `<dirname>` matches a known brief-slug (or a slug-stripped-of-date prefix) → `docs/features/<slug>/specs/`. Use both exact match and "slug minus date prefix" match (e.g., `docs/specs/stack-detection/` matches brief slug `2026-03-23-stack-detection`).
- [ ] Spec dirs that don't match any brief slug stay in `docs/specs/<dirname>/` and appear in `orphans.specsDirs` for the caller to surface.
- [ ] Spec files at the top level of `docs/specs/` (e.g., the loose `.md` files in this very repo currently) are NOT moved by this spec — they remain in `docs/specs/`. Treat them as legacy area-level specs.
- [ ] Plan returned by `planMigration` is fully serializable (plain objects, no functions) so callers can print it as a summary.
- [ ] If `docs/features/<slug>/brief.md` already exists at the destination (idempotent re-run after partial migration), the plan skips that move and records it under a `skipped` field.
- [ ] Build, typecheck, and tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| `planMigration` discovers briefs | `tests/migration.test.ts` — pre-create flat `docs/briefs/foo.md`, `docs/briefs/bar.md`, assert plan has 2 brief moves with correct from/to | unit (uses tmp dir) |
| `planMigration` matches research to briefs by slug | Same — pre-create `docs/briefs/2026-03-23-x.md` and `docs/research/2026-03-23-x.md`, assert both moves target same feature folder | unit |
| `planMigration` matches `docs/specs/<feature>/` to brief slug (date-stripped) | Same — pre-create `docs/briefs/2026-03-23-stack-detection.md` and `docs/specs/stack-detection/foo.md`, assert spec-dir move targets `docs/features/2026-03-23-stack-detection/specs/` | unit |
| Orphan spec dirs are reported, not moved | Same — pre-create `docs/specs/random-bugfix-area/foo.md` with no matching brief, assert it appears in `orphans.specsDirs` and no move is generated | unit |
| Top-level loose `.md` files in `docs/specs/` are not moved | Same — pre-create `docs/specs/loose-spec.md`, assert plan has no move for it | unit |
| `applyMigration` actually moves files | Same — call applyMigration on a plan, assert source paths gone, dest paths present | integration |
| Idempotent re-apply on partial migration | Same — apply once, then plan + apply again, assert no errors and `skipped` populated | integration |
| Cross-device fallback (renameSync EXDEV) | Mock fs to throw EXDEV; assert applyMigration falls back to cp+rm | unit |
| Empty/missing dirs handled | Run on a project with no `docs/briefs/` etc.; assert plan has 0 moves and no exception | unit |

**Execution order:**
1. Write all ten tests; they fail.
2. Confirm red.
3. Implement until green.

**Smoke test:** `pnpm test --run tests/migration.test.ts` — pure unit/integration of one module, <3s.

**Before implementing, verify your test harness:**
1. Each test creates an isolated tmp dir with `mkdtempSync(os.tmpdir() + '/joycraft-migration-')`, populates fixtures, runs the real exports.
2. afterEach cleans up tmp dirs.
3. Tests fail when the module is empty.

## Constraints

- MUST: Be pure-Node — no shelling out to `mv` or `git`. Use `node:fs` only.
- MUST: `applyMigration` use `renameSync` first; on `EXDEV` (different filesystem), fall back to `cpSync({ recursive: true })` then `rmSync({ recursive: true })`.
- MUST: Never overwrite an existing file at the destination (skip + record).
- MUST: Match Pattern C from the design — never touch managed files (no `.claude/skills/` etc.). Only `docs/briefs|research|designs|specs/`.
- MUST: Slug-stripped-of-date matching uses the regex `^\d{4}-\d{2}-\d{2}-(.+)$`. Both `<full-slug>` and `<post-date>` forms match.
- MUST NOT: Touch `docs/discoveries/`, `docs/context/`, `docs/decisions/`, `docs/contracts/` — these stay flat (they're not feature-tied).
- MUST NOT: Recurse into `docs/specs/<dir>/specs/` or any nested feature-folder structure that already exists. If a project is already partially migrated (has `docs/features/`), planMigration treats only flat-side dirs as candidates.
- MUST NOT: Delete empty source directories (e.g., empty `docs/briefs/` after all briefs moved). Leave them; callers can clean up if desired.
- MUST NOT: Add new dependencies.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/migration.ts` | New module — `planMigration`, `applyMigration`, types |
| Create | `tests/migration.test.ts` | All test cases above |

## Approach

**Strategy:** Plan-then-apply. Plan is pure (just reads dir listings, returns the move list). Apply executes. This split makes the upgrade flow's "summary" trivial — print the plan; apply the plan. It also makes testing easy: assert plan shape without touching the filesystem.

**Data flow:**
```
planMigration(projectDir)
  → readdir docs/briefs/    → for each .md: derive slug, queue brief move
  → readdir docs/research/  → for each .md: derive slug, queue research move (slug may be net-new)
  → readdir docs/designs/   → same
  → readdir docs/specs/     → for each dir:
                                if dirname matches a brief slug (full or date-stripped) → queue specs-dir move
                                else → orphans.specsDirs.push(dirname)
                                ignore loose .md files at this level
  → return { moves, slugs, orphans }

applyMigration(plan)
  → for each move:
      mkdir -p destination parent
      try renameSync(from, to)
      catch EXDEV → cpSync + rmSync
      catch EEXIST → record in skipped
  → return { applied, skipped, errors }
```

**Key decisions:**
- Slug derivation tolerates both forms (`stack-detection` and `2026-03-23-stack-detection`) for spec-dir matching because the existing repo uses the date-stripped form for spec subdirectories. Future-spec-dirs can pick either.
- Orphan spec dirs surface to the caller rather than being force-moved (per user's decomposition decision: matched specs go under features; unmatched stay).
- Cross-device fallback handled here, not in callers — callers don't want to think about EXDEV.
- No `--dry-run` flag because plan/apply split achieves the same end. Callers print the plan when they want a dry-run.

**Rejected alternative:** Wrap each move in a `try/catch` and continue on error vs. fail-fast. Chose continue-and-collect — partial migration is recoverable on re-run because of the skip-existing rule, but a single-failure-aborts mode would leave the project in a worse half-state with no easy recovery surface.

**Rejected alternative:** Use `git mv` so moves preserve history. Rejected per design Q3 — some users gitignore Joycraft artifacts; `git mv` would fail. Plain filesystem moves work universally; git history can be recovered via `--follow` regardless.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Brief and research both exist, slug matches | Both move into the same feature folder. |
| Research exists but no brief with matching slug | Feature folder is created from the research's own slug; only research.md ends up there. |
| Two briefs with the same slug (shouldn't happen but) | First wins; second is reported in `errors` as a name collision. |
| `docs/specs/<dir>/` is empty | Plan still queues the move (resulting in an empty `docs/features/<slug>/specs/` dir). Acceptable. |
| `docs/specs/<dir>/foo.md` exists alongside `docs/specs/<dir>/sub/bar.md` | Whole subtree moves recursively (renameSync handles directories). |
| Brief filename has unusual chars (spaces, unicode) | Slug is the filename minus `.md` — passed through verbatim. We don't sanitize; users named their files. |
| `docs/features/` already exists with some content | planMigration still produces moves; applyMigration skips collisions. Idempotent. |
| Symlinks in source dirs | renameSync moves the symlink as a symlink. Don't follow. |
