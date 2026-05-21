# Design: Auto-Generate bundled-files.ts

**Date:** 2026-04-07
**Research:** `docs/research/2026-04-07-bundled-files.md`
**Discoveries:** `docs/discoveries/2026-03-30-bundled-files-sync-fragility.md`, `docs/discoveries/2026-04-06-bundled-files-escaping.md`

---

## Section 1: Current State

`src/bundled-files.ts` is a 4,840-line hand-maintained file that embeds 59 files as template literal strings into three `Record<string, string>` exports:

- **`SKILLS`** (14 entries, ~1,800 lines) — content from `src/claude-skills/*.md`
- **`TEMPLATES`** (31 entries, ~1,400 lines) — content from `src/templates/**/*`
- **`CODEX_SKILLS`** (14 entries, ~1,700 lines) — content from `src/codex-skills/*.md`

**How it's consumed:**

| File | Imports | Usage |
|------|---------|-------|
| `src/init.ts:8` | `SKILLS, TEMPLATES, CODEX_SKILLS` | `Object.entries()` → write to target project dirs |
| `src/upgrade.ts:5` | `SKILLS, TEMPLATES, CODEX_SKILLS` | `getManagedFiles()` → hash comparison → update |
| `src/init-autofix.ts:3` | `TEMPLATES` | Filter by key prefix (`workflows/`, `scenarios/`) → write with placeholder replacement |
| `tests/upgrade.test.ts:8` | `SKILLS, TEMPLATES, CODEX_SKILLS` | Assertions against expected content |

**Source-of-truth directories:**
- `src/claude-skills/` — 14 `.md` files
- `src/codex-skills/` — 14 `.md` files
- `src/templates/` — 31 files across `context/`, `examples/`, `workflows/`, `scenarios/`

**Why it exists:** The npm package ships as compiled JS via tsup. Markdown and YAML source files wouldn't be available at runtime unless they're either (a) included in the package `files` array and read from disk at runtime, or (b) embedded as string literals so tsup bundles them into the JS output. The project chose (b).

**Pain points (documented):**
1. Every skill/template edit requires manually syncing the template literal in bundled-files.ts
2. Backtick escaping inside template literals is error-prone (discovery 2026-04-06)
3. No test catches drift between sources and bundled content (research Q8)
4. The file is touched in 22 of the project's commits — nearly every feature PR

**Build tooling:**
- `"build": "tsup"` — no prebuild, postbuild, or prepare hooks
- `tsup.config.ts` — two entry points (`src/cli.ts`, `src/index.ts`), ESM format, no plugins
- Only production dependency: `commander@^13.1.0`

---

## Section 2: Desired End State

After this change:

1. **`src/bundled-files.ts` is auto-generated** from the source directories before each build. Developers never edit it by hand.
2. **A generation script** reads `src/claude-skills/`, `src/codex-skills/`, and `src/templates/`, and writes `src/bundled-files.ts` with the same three exports and same `Record<string, string>` type signature.
3. **The build pipeline** runs the generator before tsup, so the bundled file is always fresh.
4. **A sync test** validates that the current `bundled-files.ts` matches what the generator would produce, catching CI drift.
5. **The consumer API is unchanged** — `init.ts`, `upgrade.ts`, `init-autofix.ts`, and `upgrade.test.ts` continue importing `{ SKILLS, TEMPLATES, CODEX_SKILLS }` exactly as before.
6. **`bundled-files.ts` is gitignored** (or kept in git but verified by CI) — either way, the source `.md` files are the single source of truth with no manual sync step.

---

## Section 3: Patterns to Follow

**Package.json script chaining pattern:**
The project already uses `prepublishOnly` to chain build steps (`package.json:11`):
```json
"prepublishOnly": "pnpm build"
```
A `prebuild` or modified `build` script follows this same convention.

**File writing pattern in init.ts (lines 91-96):**
```typescript
for (const [filename, content] of Object.entries(SKILLS)) {
  const skillName = filename.replace(/\.md$/, '');
  ...
}
```
The generator must produce keys that match exactly: bare filenames for skills (`joycraft-tune.md`), relative paths for templates (`context/dangerous-assumptions.md`).

**Template literal escaping convention (bundled-files.ts):**
Current file uses backtick-delimited strings with `\`` for escaped backticks inside content. The generator must handle this automatically.

**Test pattern (tests/codex-skill-parity.test.ts):**
Already scans `src/claude-skills/` and `src/codex-skills/` directories directly using `readdirSync`. The sync test should follow the same pattern — read source dirs, generate expected output, compare.

**Minimal dependency philosophy:**
Only one production dependency (`commander`). The generator script should use Node.js built-ins only (`fs`, `path`), no new dependencies.

---

## Section 4: Resolved Design Decisions

> **Decision:** The generator is a standalone TypeScript/JS script, not a tsup plugin.
> **Rationale:** tsup plugins operate on already-resolved modules. We need to generate the source file *before* tsup runs. A standalone script is simpler, testable, and matches the project's minimal-tooling philosophy.
> **Alternative rejected:** tsup plugin or esbuild plugin — more complex, harder to test independently, and the generation step is logically separate from bundling.

> **Decision:** The generator uses `JSON.stringify()` for string values rather than template literals.
> **Rationale:** Template literals require manual backtick escaping (`\``) which was the source of the 2026-04-06 escaping bug. `JSON.stringify()` handles all escaping automatically and produces valid TypeScript string literals. The generated file will use `"content"` instead of `` `content` ``.
> **Alternative rejected:** Template literals with automated escaping — still fragile, and `JSON.stringify` is a well-tested standard library function.

> **Decision:** Consumer imports remain unchanged (`import { SKILLS, TEMPLATES, CODEX_SKILLS } from './bundled-files.js'`).
> **Rationale:** Zero consumer changes means zero risk of breaking init/upgrade/autofix/test logic. The generated file is a drop-in replacement.
> **Alternative rejected:** Changing to dynamic `fs.readFileSync` at runtime — would require shipping raw files in the npm package and resolving paths relative to the package installation, which is fragile across package managers and install modes.

> **Decision:** Gitignore `bundled-files.ts` (was Open Q1, Option A chosen).
> **Rationale:** The file is purely an internal build artifact — it never reaches the user's machine. Users get the compiled `dist/` JS files, which unpack individual `.md`/`.yml` files at `npx joycraft init` time. No reason to review 5K-line diffs in PRs when the source `.md` files are the real review surface.
> **Alternative rejected:** Keeping in git (Options B/C) — adds noise to PRs and git history for no user-facing benefit.

> **Decision:** Generator is a plain JavaScript file at `scripts/generate-bundled-files.mjs` (was Open Q2, Option C chosen).
> **Rationale:** Convention in well-maintained npm packages (tsup, vite, unbuild) — codegen scripts are plain JS in `scripts/`. Zero build dependency for the generator itself, runs instantly with `node`. Type safety is unnecessary for a ~50-line file-reading utility.
> **Alternative rejected:** TypeScript script (Option A) — requires tsx/ts-node to run, adding build-time complexity for no benefit. `src/` location (Option B) — mixes build tooling with runtime source.

> **Decision:** Build wiring via chained command: `"build": "node scripts/generate-bundled-files.mjs && tsup"` (was Open Q3, Option A chosen).
> **Rationale:** Simple, obvious, one command does everything. No reliance on non-standard npm lifecycle hooks.
> **Alternative rejected:** `prebuild` lifecycle hook (Option B) — not a guaranteed npm lifecycle script. Named script (Option C) — more verbose for no clear benefit.

---

## Section 5: Open Questions

None — all questions resolved.
