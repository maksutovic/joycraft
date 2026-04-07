# Create Generator Script — Atomic Spec

> **Parent Design:** `docs/designs/2026-04-07-auto-generate-bundled-files.md`
> **Status:** Complete
> **Date:** 2026-04-07
> **Estimated scope:** 1 session / 2 files / ~80 lines

---

## What
Create `scripts/generate-bundled-files.mjs` — a standalone Node.js script that reads `src/claude-skills/`, `src/codex-skills/`, and `src/templates/` and writes `src/bundled-files.ts` with three `Record<string, string>` exports (`SKILLS`, `TEMPLATES`, `CODEX_SKILLS`). The generated file must be a drop-in replacement for the current hand-maintained version.

## Why
The hand-maintained `src/bundled-files.ts` requires manual sync on every skill/template edit, is error-prone (backtick escaping bugs), and is touched in nearly every PR. Automating generation eliminates this entire class of bugs and developer friction.

## Acceptance Criteria
- [ ] `scripts/generate-bundled-files.mjs` exists and runs with `node scripts/generate-bundled-files.mjs`
- [ ] Running the script produces `src/bundled-files.ts` with exports `SKILLS`, `TEMPLATES`, `CODEX_SKILLS`
- [ ] Each export is typed `Record<string, string>`
- [ ] SKILLS keys are bare filenames (e.g., `joycraft-tune.md`) matching `src/claude-skills/*.md`
- [ ] CODEX_SKILLS keys are bare filenames matching `src/codex-skills/*.md`
- [ ] TEMPLATES keys are relative paths (e.g., `context/dangerous-assumptions.md`) matching `src/templates/**/*`
- [ ] String values use `JSON.stringify()` (not template literals) to avoid escaping bugs
- [ ] The generated file's exports are import-compatible with `init.ts`, `upgrade.ts`, `init-autofix.ts`, and `upgrade.test.ts` (no consumer changes needed)
- [ ] The script uses only Node.js built-ins (`fs`, `path`) — no new dependencies
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Script produces valid TS with 3 exports | Run generator, import generated file, assert `SKILLS`, `TEMPLATES`, `CODEX_SKILLS` are objects | integration |
| SKILLS keys match `src/claude-skills/` filenames | Compare `Object.keys(SKILLS)` to `readdirSync('src/claude-skills/')` | integration |
| CODEX_SKILLS keys match `src/codex-skills/` filenames | Compare `Object.keys(CODEX_SKILLS)` to `readdirSync('src/codex-skills/')` | integration |
| TEMPLATES keys match `src/templates/` relative paths | Walk `src/templates/`, compare to `Object.keys(TEMPLATES)` | integration |
| Values match source file contents | For each entry, assert value === `readFileSync(sourcePath, 'utf-8')` | integration |
| No template literals in generated output | Assert generated file contains no unescaped backtick-delimited strings | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement the generator script until all tests pass (green)

**Smoke test:** Run `node scripts/generate-bundled-files.mjs` and check that `src/bundled-files.ts` is written without errors.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls the actual generator or reads its output — not a reimplementation
3. Identify your smoke test — it must run in seconds

## Constraints
- MUST: Use `JSON.stringify()` for string values, not template literals
- MUST: Produce identical export names and types as current `bundled-files.ts`
- MUST: Use only Node.js built-ins (fs, path) — zero new dependencies
- MUST: Script is plain `.mjs` (no TypeScript, no build step needed)
- MUST NOT: Change any consumer files (init.ts, upgrade.ts, init-autofix.ts, tests)
- MUST NOT: Add any runtime dependencies

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `scripts/generate-bundled-files.mjs` | New generator script |
| Overwrite | `src/bundled-files.ts` | Now auto-generated (content changes from template literals to JSON.stringify strings) |
| Create | `tests/generate-bundled-files.test.ts` | New test file for the generator |

## Approach
The script:
1. Reads all `.md` files from `src/claude-skills/` → builds SKILLS record (key = filename)
2. Reads all `.md` files from `src/codex-skills/` → builds CODEX_SKILLS record (key = filename)
3. Recursively walks `src/templates/` → builds TEMPLATES record (key = relative path from `src/templates/`)
4. Writes `src/bundled-files.ts` with:
   - A `// @generated` comment header
   - Three `export const` declarations, each typed `Record<string, string>`
   - Values serialized via `JSON.stringify()` for automatic escaping

**Rejected alternative:** tsup/esbuild plugin — generation must happen *before* bundling, and a standalone script is simpler, testable, and matches the project's minimal-tooling philosophy.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Source file contains backticks | `JSON.stringify()` handles automatically — no manual escaping needed |
| Source file contains `${...}` expressions | `JSON.stringify()` produces literal `${}` — no template interpolation |
| Empty source directory | Produce empty record `{}` — don't error |
| File with no extension in templates/ | Include it — key is the relative path regardless of extension |
| Newlines in source content | `JSON.stringify()` escapes to `\n` — valid TS string literal |
