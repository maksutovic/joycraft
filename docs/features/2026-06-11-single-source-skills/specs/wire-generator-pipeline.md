---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: checkpoint
---

# Wire Generator Pipeline — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / 2 files / ~100 lines changed

---

## What

Update `scripts/generate-bundled-files.mjs` so it reads canonical skills from `src/skills/`, applies `applyTemplate` (from `scripts/lib/skill-template.mjs`) for each of `claude`, `codex`, `pi`, writes the transformed output to `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, then re-reads those dirs from disk and emits `src/bundled-files.ts` exactly as today. Extend `tests/generate-bundled-files.test.ts` with residue assertions: every emitted file under each `src/*-skills/` dir contains no `{{` and no unclosed `<!-- harness:` block.

This spec lands the pipeline machinery without migrating any skills yet. The generator must remain a no-op when `src/skills/` is empty (or contains only a single proof-of-concept file) — the three `src/*-skills/` dirs continue to be the source for `bundled-files.ts` for any skill not yet present in `src/skills/`. **Migration of actual skill content happens in specs 3 and 4.**

## Why

`applyTemplate` is useless without a runner. Wiring it into the generator before any migration means specs 3 and 4 can move skills one at a time and immediately verify byte-for-byte parity against the existing committed variants.

## Acceptance Criteria

- [ ] `scripts/generate-bundled-files.mjs` imports `applyTemplate` from `./lib/skill-template.mjs`.
- [ ] Generator reads `src/skills/` (creates the dir if absent — no error on empty).
- [ ] For each canonical file in `src/skills/`, generator writes three outputs (one per harness) to `src/<harness>-skills/<same-filename>`.
- [ ] Generator then re-reads `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` from disk and emits `src/bundled-files.ts` with the same record names and JSON.stringify-encoded values as today (no semantic change to `bundled-files.ts`).
- [ ] When `src/skills/` is empty, generator runs successfully and produces `bundled-files.ts` identical to current `main`.
- [ ] `tests/generate-bundled-files.test.ts` gains a "no `{{` residue" test that scans every `.md` file in `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` after generation and asserts none contains `{{` (use a precise regex, e.g. `/\{\{[a-z_]+\}\}/`).
- [ ] Same test file gains an "no unclosed `<!-- harness:` block" test asserting every opening delimiter has a matching `<!-- /harness -->` in every emitted file.
- [ ] `pnpm build && pnpm test --run && pnpm typecheck` all pass with `src/skills/` empty (existing sync tests must remain green).
- [ ] Build hook (`package.json:15`) still runs `node scripts/generate-bundled-files.mjs && tsup` — no change to script wiring.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Generator runs with empty `src/skills/` | Add a test that runs the script when `src/skills/` is empty and asserts `bundled-files.ts` matches `main`'s contents (snapshot from current sync tests) | integration |
| Generator writes per-harness files when canonical exists | Place a fixture canonical (or use the spec-3 POC) and assert all three `src/<harness>-skills/<file>` exist with expected transformed content | integration |
| No `{{` residue in any emitted skill file | Read all `.md` under `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`; regex-assert no `\{\{[a-z_]+\}\}` | unit (post-generate) |
| No unclosed `<!-- harness:` block | Same scan; for each `<!-- harness:NAME -->` count matching `<!-- /harness -->` close tags; assert equal | unit (post-generate) |
| Existing sync tests stay green | `tests/bundled-files-sync.test.ts`, `tests/codex-skill-parity.test.ts`, `tests/pi-skill-content.test.ts` pass unchanged | integration |
| Unknown variable surfaces at build time | Place a fixture canonical with `{{nope}}`, run script, assert exit code ≠ 0 and stderr contains `unknown template variable: {{nope}}` | integration |

**Execution order:**
1. Write the new tests; they should fail (generator hasn't been updated yet).
2. Confirm failure (red).
3. Implement the pipeline changes in `scripts/generate-bundled-files.mjs` (green).
4. Re-run all existing sync tests to confirm no regression.

**Smoke test:** `pnpm test --run tests/generate-bundled-files.test.ts` — must remain in the existing budget.

**Before implementing, verify your test harness:**
1. Run all tests — new ones must FAIL initially.
2. Tests scan real disk output, not a mocked in-memory record.
3. Smoke test runs in the existing per-file budget.

## Constraints

- MUST: re-read `src/<harness>-skills/` from disk after writing, before emitting `bundled-files.ts` (preserves the "disk is source of truth for bundled-files" invariant — design.md Section 4).
- MUST: keep `JSON.stringify`-encoded values in `bundled-files.ts` (no template literals — existing `no backticks` test must keep passing).
- MUST: fail the build (non-zero exit) if `applyTemplate` throws on unknown variable.
- MUST: tolerate empty `src/skills/` — generator is a no-op for skills not yet migrated.
- MUST NOT: change the public shape of `bundled-files.ts` (record names, key/value types) — downstream code reads it.
- MUST NOT: delete or skip the per-harness dirs. They remain on disk and committed.
- MUST NOT: introduce any runtime dependency.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `scripts/generate-bundled-files.mjs` | Add `src/skills/` read loop; per-harness apply + write; keep existing `readFlatDir` + `formatRecord` flow afterwards. |
| Modify | `tests/generate-bundled-files.test.ts` | Add residue assertions and empty-`src/skills/` no-op test. |

## Approach

**New pipeline shape:**
```
mkdirSync('src/skills', { recursive: true })  // tolerate absent
const canonical = readFlatDir('src/skills')
for (const harness of ['claude', 'codex', 'pi']) {
  for (const [file, source] of Object.entries(canonical)) {
    const out = applyTemplate(source, harness, file)
    writeFileSync(join(`src/${harness}-skills`, file), out)
  }
}
// existing readFlatDir + formatRecord unchanged from here ↓
```

**Test scan helper** (in `tests/generate-bundled-files.test.ts`):
```js
function residue(dir) {
  return readdirSync(dir).filter(f => f.endsWith('.md'))
    .flatMap(f => {
      const content = readFileSync(join(dir, f), 'utf-8')
      const vars = content.match(/\{\{[a-z_]+\}\}/g) ?? []
      return vars.map(v => `${f}: ${v}`)
    })
}
expect(['src/claude-skills', 'src/codex-skills', 'src/pi-skills']
  .flatMap(residue)).toEqual([])
```

**Rejected alternative:** generate `bundled-files.ts` directly from in-memory transform output. Smaller, but breaks the disk-as-source-of-truth invariant the existing sync tests rely on (design.md Section 4).

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `src/skills/` does not exist on disk | Generator creates it (mkdir recursive); runs as no-op; emits `bundled-files.ts` identical to current. |
| `src/skills/` contains a file already present in `src/claude-skills/` (during spec 3 migration) | Generator overwrites the per-harness file with the transformed canonical output. Sync tests then compare against the new content; if a clean migration mismatches, the diff is intentional and reviewed. |
| Canonical file has unknown `{{x}}` | Generator throws, exits non-zero, build fails locally — fast feedback. |
| `src/skills/` contains a non-`.md` file | Skipped (existing `readFlatDir` already filters to `.md`). |
| File present in `src/skills/` but missing from `src/codex-skills/` because the per-harness dir was deleted | Generator writes it fresh — directory entry now exists. |
