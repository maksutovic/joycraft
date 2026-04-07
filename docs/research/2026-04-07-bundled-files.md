# Codebase Research: bundled-files.ts

**Date:** 2026-04-07
**Questions answered:** 10/10

---

## Q1: What is the complete structure of `src/bundled-files.ts`?

`src/bundled-files.ts` is a 4,840-line file with three named exports, all `Record<string, string>`:

1. **`SKILLS`** (lines 3–1779): 14 entries mapping skill filenames to markdown content from `src/claude-skills/*.md`
2. **`TEMPLATES`** (lines 1781–3158): 31 entries mapping template paths to content from `src/templates/**/*`
3. **`CODEX_SKILLS`** (lines 3160–4840): 14 entries mapping Codex skill filenames to markdown content from `src/codex-skills/*.md`

Each value is a backtick-delimited template string containing the full file content. The file opens with the comment `// Bundled file contents — embedded at build time`.

---

## Q2: What files import from `bundled-files.ts`?

Four files import from it:

1. **`src/init.ts`** — imports `{ SKILLS, TEMPLATES, CODEX_SKILLS }`. Iterates `Object.entries()` on each to write files to `.claude/skills/`, `.agents/skills/`, and `docs/templates/`. Also hashes content for `.joycraft-version`.
2. **`src/upgrade.ts`** — imports `{ SKILLS, TEMPLATES, CODEX_SKILLS }`. Builds a managed files map via `getManagedFiles()`, compares hashes to detect user customizations, auto-updates unmodified files.
3. **`src/init-autofix.ts`** — imports `{ TEMPLATES }`. Accesses workflow templates for GitHub Actions autofix setup.
4. **`tests/upgrade.test.ts`** — imports `{ SKILLS, TEMPLATES, CODEX_SKILLS }`. Uses in assertions (e.g., `expect(updated).toBe(SKILLS['joycraft-tune.md'])`).

---

## Q3: Is there a generation script that produces `bundled-files.ts`?

**No.** No generation script exists anywhere in the project. `package.json` build is just `"build": "tsup"`. No `scripts/` directory exists. No pre-build or post-build hooks. The file is manually maintained — every skill or template change requires hand-editing the template literal strings.

---

## Q4: Source-of-truth files vs. copies

**Source-of-truth (canonical):**
- `src/claude-skills/` — 14 `.md` files → embedded in `SKILLS`
- `src/codex-skills/` — 14 `.md` files → embedded in `CODEX_SKILLS`
- `src/templates/` — 31 files across `context/`, `examples/`, `workflows/`, `scenarios/` → embedded in `TEMPLATES`

**Not embedded:**
- `templates/` (root) — internal tooling templates (CLAUDE_MD_TEMPLATE.md, etc.), not distributed to users, not in bundled-files

**`bundled-files.ts` is a copy of the source files**, not the other way around. However, since init/upgrade read from the bundled exports (not disk), the bundled copy is what actually gets deployed.

---

## Q5: How does init use bundled files?

Init reads exclusively from bundled-files exports, not from disk:

1. `Object.entries(SKILLS)` → writes each to `.claude/skills/<skillName>/SKILL.md`
2. `Object.entries(CODEX_SKILLS)` → writes each to `.agents/skills/<skillName>/SKILL.md`
3. `Object.entries(TEMPLATES)` → writes each to `docs/templates/<path>`
4. Hashes all content strings → writes to `.joycraft-version` for upgrade detection

---

## Q6: How does upgrade use bundled files?

1. `getManagedFiles()` builds a `Record<string, string>` from all three exports
2. For each managed file, reads the on-disk version and computes its hash
3. Compares current hash against stored hash from `.joycraft-version`
4. If hash matches stored → auto-update (user hasn't customized)
5. If hash differs → prompt user (file was customized)
6. Writes new content from bundled exports, recomputes all hashes

---

## Q7: Categories and sizes

| Category | Export | Entries | ~Lines |
|----------|--------|---------|--------|
| Claude skills | `SKILLS` | 14 | 1,802 |
| Codex skills | `CODEX_SKILLS` | 14 | 1,706 |
| Context templates | `TEMPLATES` | 5 | 500 |
| Example templates | `TEMPLATES` | 2 | 150 |
| Workflow templates | `TEMPLATES` | 4 | 400 |
| Scenario templates | `TEMPLATES` | 20 | 400 |
| **Total** | | **59** | **~4,958** |

---

## Q8: Tests validating sync between sources and bundled-files

**No test validates that bundled-files.ts matches source files.** Two related tests exist:

- `tests/upgrade.test.ts` — tests upgrade logic using bundled content, but assumes it's correct
- `tests/codex-skill-parity.test.ts` — validates Codex vs. Claude skill differences by reading from `src/` directories directly, not from bundled-files

**Gap:** The bundled file can drift from sources with no automated detection.

---

## Q9: Build script details

```json
"build": "tsup"
```

`tsup.config.ts` defines two entry points: `src/cli.ts` → `dist/cli.js` and `src/index.ts` → `dist/index.js`. ESM format, sourcemaps, dts types. No pre-build, post-build, or prepare hooks. tsup treats `bundled-files.ts` as a regular import — it does not generate or regenerate it.

---

## Q10: Git history frequency

**22 commits** have touched `bundled-files.ts` across the project's lifetime. Pattern:
- Modified when skills are added/refactored or templates are added
- Not touched for bugfixes, docs, or test-only changes
- Roughly every 2–5 feature commits
- Every "feat: add /joycraft-*" commit includes a bundled-files update
