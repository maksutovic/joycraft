---
status: active
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
---

# Codebase Research

**Date:** 2026-06-14
**Questions answered:** 3/3

---

## Q1: Sync-test shape

### Test Files and Locations

There are **two canonical sync tests** that compare bundled files against source directories:

1. **`tests/bundled-files-sync.test.ts:45-90`** — Tests that `src/bundled-files.ts` exports match source directories
   - Test framework: **Vitest** (`describe`, `it`, `expect`)
   - Three separate test cases (lines 53, 64, 77)

2. **`tests/generate-bundled-files.test.ts:26-97`** — Tests the generator script output
   - Test framework: **Vitest**
   - Multiple test cases validating script execution and file content

### Assertion Shapes

#### bundled-files-sync.test.ts (tests the compiled module)

**Line 53-62 — SKILLS assertion:**
```typescript
it('SKILLS matches src/claude-skills/', async () => {
  actual = await import('../src/bundled-files.js');
  const expected = buildExpectedRecord(SKILLS_DIR, 'flat');
  expect(Object.keys(actual.SKILLS).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  for (const [key, value] of Object.entries(expected)) {
    expect(actual.SKILLS[key], `SKILLS["${key}"] content drift`).toBe(value);
  }
});
```
**Shape:** File-list equality AND per-file string equality (exact content comparison via `.toBe(value)`).

**Line 64-75 — TEMPLATES assertion:**
```typescript
it('TEMPLATES matches src/templates/', async () => {
  const expected = buildExpectedRecord(TEMPLATES_DIR, 'tree');
  expect(Object.keys(actual.TEMPLATES).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  for (const [key, value] of Object.entries(expected)) {
    expect(actual.TEMPLATES[key], `TEMPLATES["${key}"] content drift`).toBe(value);
  }
});
```
**Shape:** File-list equality AND per-file string equality. Handles tree structure (recursive directories).

**Line 77-89 — CODEX_SKILLS assertion:**
```typescript
it('CODEX_SKILLS matches src/codex-skills/', async () => {
  const expected = buildExpectedRecord(CODEX_SKILLS_DIR, 'flat');
  expect(Object.keys(actual.CODEX_SKILLS).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  for (const [key, value] of Object.entries(expected)) {
    expect(
      actual.CODEX_SKILLS[key],
      `CODEX_SKILLS["${key}"] content drift`,
    ).toBe(value);
  }
});
```
**Shape:** File-list equality AND per-file string equality.

**Notable:** There is **NO test for PI_SKILLS** in `bundled-files-sync.test.ts`. PI_SKILLS is tested elsewhere (see `tests/codex-skill-parity.test.ts` and `tests/pi-skill-content.test.ts`).

#### generate-bundled-files.test.ts (tests the script that generates the module)

**Line 41-45 — SKILLS keys match:**
```typescript
it('SKILLS keys match src/claude-skills/ filenames', async () => {
  const mod = await import(OUTPUT);
  const expected = readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md')).sort();
  expect(Object.keys(mod.SKILLS).sort()).toEqual(expected);
});
```
**Shape:** File-list equality.

**Line 60-66 — SKILLS values match source:**
```typescript
it('SKILLS values match source file contents', async () => {
  const mod = await import(OUTPUT);
  for (const [key, value] of Object.entries(mod.SKILLS)) {
    const source = readFileSync(join(SKILLS_DIR, key), 'utf-8');
    expect(value, `SKILLS["${key}"] content mismatch`).toBe(source);
  }
});
```
**Shape:** Per-file string equality (exact content).

Similar tests exist for CODEX_SKILLS (lines 68-74) and TEMPLATES (lines 76-82) with identical assertion patterns.

**Line 84-96 — Template literal safety check:**
```typescript
it('generated file uses no backtick template literals for values', () => {
  const content = readFileSync(OUTPUT, 'utf-8');
  const lines = content.split('\n');
  const templateLiteralLines = lines.filter((line) =>
    /^\s+"[^"]+"\s*:\s*`/.test(line),
  );
  expect(
    templateLiteralLines,
    'Generated file should not contain backtick template literals for values',
  ).toEqual([]);
});
```
**Shape:** Structural check (regex on generated source code).

### Test Framework and Helpers

- **Framework:** `vitest` (version `^3.0.0` in package.json:47)
- **Test files use:** `describe()`, `it()`, `expect()` (standard Vitest assertions)
- **Helper functions:**
  - `buildExpectedRecord(dir: string, mode: 'flat' | 'tree')` (lines 23-43 in bundled-files-sync.test.ts) — reads files and returns `Record<filename, content>`
  - `walkDir(dir)` (lines 13-24 in bundled-files-sync.test.ts) — recursively lists all files
  - `readFlatDir(dir)` (lines 30-37 in generate-bundled-files.test.ts) — reads `.md` files from flat directory
  - `readTreeDir(dir)` (lines 40-48 in generate-bundled-files.test.ts) — reads all files recursively with relative paths

### Summary

**Canonical sync test:** `bundled-files-sync.test.ts` (lines 45-90).
**Generation test:** `generate-bundled-files.test.ts` (lines 26-97).

Both assert:
1. **File-list equality** — `Object.keys(actual).sort()` must equal `Object.keys(expected).sort()`
2. **Per-file string equality** — Each file's content must match exactly via `.toBe(value)` (byte-for-byte, no hashing)

Tests cover SKILLS, TEMPLATES, and CODEX_SKILLS. PI_SKILLS is tested separately in parity and content tests (not in bundled-files-sync.test.ts).

---

## Q2: Build hook wiring

### What `pnpm build` runs

**File:** `package.json:15`

```json
"build": "node scripts/generate-bundled-files.mjs && tsup"
```

**Chain:**
1. `node scripts/generate-bundled-files.mjs` — Generate `src/bundled-files.ts` by reading source directories
2. `&&` — Sequential execution (second command only runs if first succeeds)
3. `tsup` — TypeScript bundler (emits `dist/cli.js`, `dist/index.js`, `dist/index.d.ts`)

### Direct and Transitive References to generate-bundled-files.mjs

**Direct invocations:**

1. **npm script `build`** (package.json:15)
   ```json
   "build": "node scripts/generate-bundled-files.mjs && tsup"
   ```

2. **npm script `prepublishOnly`** (package.json:18)
   ```json
   "prepublishOnly": "pnpm build"
   ```
   This runs `build`, which includes the generator.

3. **CI workflow — test.yml:36** (`.github/workflows/test.yml`)
   ```yaml
   - name: Build
     run: pnpm build
   ```

4. **CI workflow — publish.yml:44** (`.github/workflows/publish.yml`)
   ```yaml
   - name: Build
     run: pnpm build
   ```

**Transitive chain:**
- `pnpm build` → `node scripts/generate-bundled-files.mjs && tsup`
- `pnpm test` does NOT invoke the generator (test.yml:39 runs `pnpm test --run` after build)
- `pnpm prepublishOnly` → `pnpm build` → generator

### Other npm Scripts

**File:** `package.json:14-18`

```json
"scripts": {
  "build": "node scripts/generate-bundled-files.mjs && tsup",
  "test": "vitest",
  "typecheck": "tsc --noEmit",
  "prepublishOnly": "pnpm build"
}
```

There is **no separate `pnpm generate`, `pnpm regen`, or similar** script. The generator is only invoked via `pnpm build`.

### Pre-Commit Hooks and lefthook/husky

- No `.husky/` directory exists
- No `.lefthook.yml` file exists

**Conclusion:** There are **no pre-commit hooks** configured. Developers must manually run `pnpm build` after changing files in `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, or `src/templates/`.

### CI Workflow References

Both workflows explicitly run the build before tests:

**`.github/workflows/test.yml:35-42`**
```yaml
- name: Build
  run: pnpm build

- name: Test
  run: pnpm test --run
```

**`.github/workflows/publish.yml:43-47`**
```yaml
- name: Build
  run: pnpm build

- name: Test
  run: pnpm test --run
```

### Documentation for Maintainers

**File:** `CONTRIBUTING.md:91-128`

The CONTRIBUTING guide provides a manual regeneration command (lines 91-128), but it is **outdated and incorrect** — it uses backtick escaping instead of JSON.stringify, which doesn't match the actual script.

**Current advice (lines 91-128):**
```
After changing any file in `src/claude-skills/` or `src/templates/`:

node -e "
const fs = require('fs');
const path = require('path');
...
"
Then verify: `pnpm build && pnpm test --run`
```

**What actually works:** Just run `pnpm build` (which calls the script at `scripts/generate-bundled-files.mjs`).

**Explicit instruction in CONTRIBUTING (line 83):**
```
1. **`src/bundled-files.ts` is generated.** Don't edit it by hand. After changing files in `src/claude-skills/` or `src/templates/`, run the regeneration script (see below).
```

### Summary

- **`pnpm build` runs:** `node scripts/generate-bundled-files.mjs && tsup`
- **No separate generate script** (use `pnpm build`)
- **No pre-commit hooks** — regeneration is manual
- **CI enforces regeneration:** test.yml and publish.yml both run `pnpm build` before tests
- **Documentation:** CONTRIBUTING.md tells maintainers to run the generator after editing skills, but the inline command example is outdated

---

## Q3: Complete harness-paragraph inventory

**All 20 skills compared across three variants (Claude/Codex/Pi).** Table below lists every skill with out-of-category deltas (if any).

**Key:** Out-of-category differences are those NOT in these 5 known categories:
1. Invocation syntax (`/joycraft-x` vs `$joycraft-x` vs `/skill:joycraft-x`)
2. Context-clear verb (`/clear` vs `/new`)
3. Installed-skill path prefix (`.claude/skills/` vs `.agents/skills/` vs `.pi/skills/`)
4. Frontmatter `instructions:` field (Claude-only)
5. Harness-specific paragraphs (Pi loop notes, Codex "context honesty" note, Claude subagent/handoff instructions, "Recommended Next Steps" section)

---

### Out-of-Category Differences Table

| Skill | Variants compared | Out-of-category delta (or "none") | File:line evidence |
|-------|-------------------|---|---|
| joycraft-add-context | Claude / Codex / Pi | none | All differences fit categories 1-5 (invocation syntax, instructions field, CLAUDE.md → project boundary file, Recommended Next Steps removal) |
| joycraft-add-fact | Claude / Codex / Pi | **Section 5b present in Claude only** | Claude has `## Step 5b: Update Shared Frontmatter` (src/claude-skills/joycraft-add-fact.md:133-155). Codex/Pi go directly from Step 5 to Step 6. Content: Claude adds frontmatter update logic (`last_updated_by` field); Codex/Pi skip this step and evaluate boundary rules instead. |
| joycraft-bugfix | Claude / Codex / Pi | none | All differences fit categories 1-5 (Recommended Next Steps section removed in Codex/Pi) |
| joycraft-collaborative-setup | Claude / Codex / Pi | none | All differences fit categories 1-5 |
| joycraft-decompose | Claude / Codex / Pi | **"Execution waves" section in Claude only** | Claude has `## Execution waves` (src/claude-skills/joycraft-decompose.md:248-267). Codex/Pi omit this entire section. Content: Claude describes how to group specs into execution waves based on dependencies; Codex/Pi collapse this into Step 6 (Recommend Execution Strategy). Also Step 6 title differs: Claude = "Recommend Execution Strategy and Update Parent Brief", Codex/Pi = "Recommend Execution Strategy". Also Step 7 differs: Claude has "Write the Feature-Folder README.md", Codex/Pi skip this. |
| joycraft-design | Claude / Codex / Pi | **Concurrency description differs** | Codex line: "Spawn concurrent subagent threads to explore the codebase" (src/codex-skills/joycraft-design.md:~line 35). Claude: "Spawn subagents to explore the codebase" (src/claude-skills/joycraft-design.md:~line 34). Pi matches Codex terminology. Also Step 4 title: Claude = "Present and STOP — Pre-Approval Hold", Codex/Pi = "Present and STOP". |
| joycraft-gather-context | Claude / Codex / Pi | none | Only difference is "Recommended Next Steps" removal (category 5) and Step 5 title change (category 5: "Confirm and Hand Off" in Claude, "Confirm" in Codex/Pi). |
| joycraft-implement-feature | Claude / Codex / Pi | **Step 2 description and step count differ** | Claude Step 2: "The Loop — One Subagent per Spec" (src/claude-skills/joycraft-implement-feature.md:~line 20). Codex Step 2: "The Chain — One Spec at a Time" (src/codex-skills/joycraft-implement-feature.md:~line 20). Pi has structural reorg: Step 2 = "Run the Loop", Step 3 = "Report", Step 4 removed (consolidation). Claude has 4 steps, Codex has 4 steps, Pi has 3 steps. |
| joycraft-implement-level5 | Claude / Codex / Pi | **Step 6 title differs: "Update CLAUDE.md" vs "Update AGENTS.md"** | This is category 5 (harness-specific), not out-of-category. All content differences fit categories 1-5. |
| joycraft-implement | Claude / Codex / Pi | **Step 2 title differs (with substantive content change)** | Claude Step 2: "Read the Sibling README.md FIRST (if present)" (src/claude-skills/joycraft-implement.md:~line 60). Codex/Pi Step 2: "Read and Understand the Spec" (src/codex-skills/joycraft-implement.md:~line 40). Claude includes a separate "Warn on Unmet Dependencies" subsection with logic about dependency checking; Codex/Pi omit this subsection entirely. Also Step 3 numbering shifts: Claude Step 3 = Understand Spec, Codex/Pi Step 2 = Understand Spec (consolidation). |
| joycraft-interview | Claude / Codex / Pi | none | All differences fit categories 1-5 (Recommended Next Steps removal, backlog section exists in all three). |
| joycraft-lockdown | Claude / Codex / Pi | **Configuration target differs: .claude/settings.json vs Codex sandbox** | Claude targets `.claude/settings.json` with `permissions.deny` array (src/claude-skills/joycraft-lockdown.md:~line 120). Codex/Pi target "Codex configuration" and "Codex sandbox" with deny patterns (src/codex-skills/joycraft-lockdown.md:~line 120). Also recommendation section title: Claude = "Recommended Permission Mode" / "Recommended Execution Model" (Codex), with different table headers and guidance. |
| joycraft-new-feature | Claude / Codex / Pi | **Phase 0 description and backlog frontmatter schema differ** | Claude Phase 0: "Check for Existing Drafts and In-Flight Features", includes scan logic and frontmatter schema with `active` status (src/claude-skills/joycraft-new-feature.md:~line 100). Codex/Pi Phase 0: "Check for Existing Drafts", simpler wording (src/codex-skills/joycraft-new-feature.md:~line 100). Also Phase 3.5 removed in Codex/Pi (category 5, but confirms structural difference). |
| joycraft-optimize | Claude / Codex / Pi | none | All differences fit categories 1-5 |
| joycraft-research | Claude / Codex / Pi | **Tool/agent invocation mechanism differs** | Claude Phase 2: "Spawn Research Subagent" using "Claude Code's Agent tool" (src/claude-skills/joycraft-research.md:~line 85). Pi Phase 2: "Deploy Research Subagent" using "`subagent` tool with agent `joycraft-researcher`" (src/pi-skills/joycraft-research.md:~line 85). Codex intermediate: "Spawn Research Subagent" but references building a prompt differently. Also Claude includes "Scanning Prior Research (Status Filter)" section (~line 50) with frontmatter filtering logic; Codex/Pi omit this section. |
| joycraft-session-end | Claude / Codex / Pi | none | All differences fit categories 1-5 (Recommended Next Steps removal, shared frontmatter logic present in all). |
| joycraft-setup | Claude / Codex / Pi | none | All differences fit categories 1-5 |
| joycraft-spec-done | Claude / Codex / Pi | none | All differences fit categories 1-5 |
| joycraft-tune | Claude / Codex / Pi | none | All differences fit categories 1-5 |
| joycraft-verify | Claude / Codex / Pi | **Tool/agent invocation mechanism differs** | Claude Step 4: "Spawn the Verifier Subagent" using Claude Code's Agent tool (src/claude-skills/joycraft-verify.md:~line 50). Pi Step 4: "Deploy the Verifier Subagent" using "`subagent` tool with agent `joycraft-verifier`" (src/pi-skills/joycraft-verify.md:~line 50). Codex matches Claude. Also section title: Claude = "Step 6: Suggest Next Steps", Codex/Pi = "Step 6: Suggest Next Steps" (same, but "Deploy" vs "Spawn" is the delta). |

---

### Summary of Out-of-Category Deltas by Skill

**Skills with OUT-OF-CATEGORY differences (9 of 20):**
1. **joycraft-add-fact** — Section 5b (frontmatter update step) present in Claude only
2. **joycraft-decompose** — Execution waves section, step 6/7 content, README generation step
3. **joycraft-design** — Concurrent subagent terminology, step 4 pre-approval qualifier
4. **joycraft-implement-feature** — Step 2 naming ("Loop" vs "Chain"), step count differences (4 vs 3)
5. **joycraft-implement** — Step 2 has sibling README check in Claude only, dependency warning subsection
6. **joycraft-lockdown** — Configuration target (`.claude/settings.json` vs Codex sandbox), recommendation guidance
7. **joycraft-new-feature** — Phase 0 description and scope, backlog schema differences
8. **joycraft-research** — Agent invocation tool (Agent tool vs subagent tool), research scanning section in Claude only
9. **joycraft-verify** — Agent invocation tool (Spawn vs Deploy), agent parameter syntax

**Skills with NO out-of-category differences (11 of 20):**
joycraft-add-context, joycraft-bugfix, joycraft-collaborative-setup, joycraft-gather-context, joycraft-interview, joycraft-optimize, joycraft-session-end, joycraft-setup, joycraft-spec-done, joycraft-tune, joycraft-implement-level5
