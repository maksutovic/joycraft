---
status: shipped
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Regenerate Bundled Files — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-21-context-layer/brief.md`
> **Status:** Complete
> **Date:** 2026-05-21
> **Estimated scope:** 1 session / regenerated `bundled-files.ts` + final green build

---

## What
The integration/finalization spec. After all content specs land (stale-path fixes, reference templates, the three new skills, the tune edits, the CLI/migration changes), regenerate the `@generated` `src/bundled-files.ts` via `node scripts/generate-bundled-files.mjs`, rebuild, and prove the whole feature is green: `pnpm test --run && pnpm typecheck`. This is the single place that owns the regenerated artifact and the final feature-wide build gate, so the `@generated` file isn't churned across parallel waves.

## Why
`src/bundled-files.ts` is `@generated` (never hand-edited) and is what `init`/`upgrade` actually copy into user projects; until it's regenerated, the new templates and skills exist in `src/` but are NOT bundled — so a user `npx joycraft init` wouldn't receive them.

## Acceptance Criteria
- [ ] `node scripts/generate-bundled-files.mjs` runs cleanly and updates `src/bundled-files.ts`.
- [ ] `bundled-files.ts` `SKILLS` record includes `joycraft-add-context`, `joycraft-gather-context`, `joycraft-setup`, and the edited `joycraft-tune` / path-fixed skills reflect their new content.
- [ ] `bundled-files.ts` `CODEX_SKILLS` record includes the Codex mirrors of all three new skills with their new content.
- [ ] `bundled-files.ts` `TEMPLATES` record includes keys `context/reference/design-system.md`, `context/reference/frontend-methodology.md`, `context/reference/backend.md`, `context/reference/testing.md`, `context/reference/reference-doc.md`.
- [ ] `src/bundled-files.ts` retains its `@generated` marker and is not hand-edited (only the script's output is committed).
- [ ] `pnpm test --run && pnpm typecheck` pass for the whole repo.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Script runs cleanly | `node scripts/generate-bundled-files.mjs` exits 0 | integration |
| New skills bundled | grep `src/bundled-files.ts` for `joycraft-add-context`, `joycraft-gather-context`, `joycraft-setup` keys in SKILLS and CODEX_SKILLS | integration (grep) |
| Reference templates bundled | grep for `context/reference/design-system.md` (+ the other four) keys in TEMPLATES | integration (grep) |
| `@generated` preserved | grep `@generated` marker present at top of file | integration (grep) |
| No hand-edits | regenerating again produces no further diff (`git diff --exit-code src/bundled-files.ts` after a clean regen) | integration |
| Whole repo green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Before regenerating, confirm the grep assertions FAIL on the current `bundled-files.ts` (new keys absent).
2. Run `node scripts/generate-bundled-files.mjs`.
3. Re-run assertions + full build — all green; a second regen yields no diff.

**Smoke test:** `node scripts/generate-bundled-files.mjs && git diff --stat src/bundled-files.ts` — shows the regen landed; fast.

**Before implementing, verify your test harness:**
1. Run the grep assertions on the current `bundled-files.ts` — they must FAIL (new skill/template keys absent) BEFORE regenerating.
2. Assertions read the real `src/bundled-files.ts` consumed by init/upgrade.
3. The regen + `git diff --stat` is the fast smoke check.

## Constraints
- MUST regenerate via `node scripts/generate-bundled-files.mjs` — NEVER hand-edit `src/bundled-files.ts` (CLAUDE.md / brief constraint).
- MUST be run only after all content specs are merged (it depends on every file the bundler reads being final).
- MUST end with `pnpm test --run && pnpm typecheck` green for the whole repo.
- MUST NOT modify the generator script's logic unless a bundling gap is found (if so, flag it — out of this spec's intended scope).

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Regenerate | `src/bundled-files.ts` | regenerated to include new skills + Codex mirrors + reference templates |
| (Verify) | repo build | `pnpm build` / `pnpm test --run` / `pnpm typecheck` all green |

## Approach
Run the generator, inspect the diff to confirm exactly the expected additions (three new Claude skills, three new Codex skills, five new template keys, plus content updates to edited skills and tune), then run the full build + tests. If the diff contains anything unexpected (e.g., a stale skill still referencing `docs/specs/`), that means an upstream content spec is incomplete — fix it there, not by hand-editing the generated file. This spec is the last wave; it depends on specs 1, 2, 3, 5, 6, 7, and 8.

Rejected alternative: regenerating `bundled-files.ts` inside each content spec — creates merge churn on the `@generated` file across parallel waves and risks committing a half-bundled state (per decomposition decision: keep one final regen spec).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| A content spec wasn't merged yet | Its key is missing from the regen; the grep assertion fails → finish that spec first |
| Regen produces an unexpected extra/changed key | Investigate the upstream `src/` file; do not paper over by editing the generated file |
| Generator script lacks recursion for `reference/` | It already reads templates recursively; if a key is missing, flag a generator bug (out of intended scope) |
| Second regen shows a diff | Indicates non-determinism or an un-saved upstream edit; resolve before committing |
