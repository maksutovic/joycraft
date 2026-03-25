# Phase 4: Autofix Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Level 5 autofix loop in Joycraft — workflow templates, scenario templates, `init-autofix` CLI command, and scenario evolution system.

**Architecture:** Four specs implemented in dependency order. Each creates template files (YAML workflows, markdown prompts) that get bundled into `src/bundled-files.ts` and copied to user projects via a new `init-autofix` CLI subcommand. All cross-repo orchestration uses GitHub Actions `repository_dispatch`. Claude CLI (`claude -p`) runs in GitHub Actions for both autofix and scenario generation.

**Tech Stack:** TypeScript, GitHub Actions YAML, vitest, commander (CLI), tsup (build)

**Spec deviations (validated by Pipit trial):**
- The autofix-workflow-templates spec mentions `--model claude-sonnet-4-6` in the Approach section. Pipit trial proved this flag doesn't work with `claude -p` (it has its own model resolution). We omit `--model` everywhere.

**Key Pipit trial fixes to apply everywhere:**
- No `--model` flag with `claude -p` (overrides spec's Approach section — validated in trial)
- Single `env:` block per workflow step (no duplicates)
- `repository_dispatch` for all cross-repo communication
- GitHub App token via `actions/create-github-app-token@v1`
- App ID placeholder: `$JOYCRAFT_APP_ID`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/templates/workflows/autofix.yml` | Main autofix workflow — CI failure triggers Claude fix |
| `src/templates/workflows/scenarios-dispatch.yml` | Dispatch to scenarios repo after CI passes |
| `src/templates/workflows/spec-dispatch.yml` | Dispatch spec content to scenarios repo on spec push |
| `src/templates/workflows/scenarios-rerun.yml` | Re-run scenarios for open PRs when scenarios update |
| `src/templates/scenarios/example-scenario.test.ts` | Example holdout test |
| `src/templates/scenarios/workflows/run.yml` | Scenarios repo CI workflow |
| `src/templates/scenarios/workflows/generate.yml` | Scenario agent generation workflow |
| `src/templates/scenarios/package.json` | Scenarios repo minimal vitest setup |
| `src/templates/scenarios/README.md` | Explains the holdout pattern |
| `src/templates/scenarios/prompts/scenario-agent.md` | Scenario agent prompt template |
| `src/init-autofix.ts` | `init-autofix` CLI subcommand logic |
| `tests/init-autofix.test.ts` | Tests for init-autofix |

### Modified Files
| File | What Changes |
|------|-------------|
| `src/cli.ts` | Add `init-autofix` subcommand |
| `src/bundled-files.ts` | Add all new workflow + scenario templates |
| `src/improve-claude-md.ts` | Add External Validation section generator |

---

## Task 1: Autofix Workflow Template

**Spec:** `docs/specs/2026-03-24-autofix-workflow-templates.md`
**Files:**
- Create: `src/templates/workflows/autofix.yml`
- Create: `src/templates/workflows/scenarios-dispatch.yml`

- [ ] **Step 1: Create the autofix workflow template**

Create `src/templates/workflows/autofix.yml`. Key details:
- Triggered by `workflow_run` on CI completion with `conclusion: failure`
- Only runs if triggering workflow was on a PR
- Uses `actions/create-github-app-token@v1` with `$JOYCRAFT_APP_ID` placeholder
- Checks out PR branch with App token
- Counts previous autofix attempts via `git log --oneline | grep "autofix:" | wc -l`
- Max 3 iterations — posts "human review needed" if exceeded
- Runs `claude -p` with failure context (NO `--model` flag)
- Uses `--dangerously-skip-permissions --max-turns 20`
- Strips ANSI codes from logs: `sed 's/\x1b\[[0-9;]*m//g'`
- Uses `set +e; set -o pipefail` for exit code capture
- Concurrency group per PR number
- Single `env:` block per step (never duplicate)

- [ ] **Step 2: Create the scenarios dispatch template**

Create `src/templates/workflows/scenarios-dispatch.yml`. Key details:
- Triggered by `workflow_run` on CI completion with `conclusion: success`
- Only runs if triggering workflow was on a PR
- Fires `repository_dispatch` type `run-scenarios` to `$SCENARIOS_REPO`
- Passes `pr_number`, `branch`, `sha`, `repo` in client_payload

- [ ] **Step 3: Commit**

```bash
git add src/templates/workflows/
git commit -m "feat: add autofix and scenarios-dispatch workflow templates"
```

---

## Task 2: Scenario Templates

**Spec:** `docs/specs/2026-03-24-scenario-templates.md`
**Files:**
- Create: `src/templates/scenarios/example-scenario.test.ts`
- Create: `src/templates/scenarios/workflows/run.yml`
- Create: `src/templates/scenarios/package.json`
- Create: `src/templates/scenarios/README.md`

- [ ] **Step 1: Create example scenario test**

Create `src/templates/scenarios/example-scenario.test.ts`:
- Stack-agnostic — uses `child_process.execSync` to invoke built CLI artifact
- Tests: `--help` output contains "Usage:", `--version` returns semver
- Comments explaining the holdout pattern and how to write scenarios
- Main repo cloned to `../main-repo` in CI

- [ ] **Step 2: Create scenarios run workflow**

Create `src/templates/scenarios/workflows/run.yml`:
- Triggered by `repository_dispatch` type `run-scenarios`
- Clones main repo PR branch using App token
- Builds artifact with `npm ci && npm run build`
- Runs vitest with `set +e; set -o pipefail; NO_COLOR=1 npx vitest run 2>&1 | tee test-output.txt`
- Posts PASS/FAIL comment on PR via GitHub API
- Uses `$JOYCRAFT_APP_ID` placeholder

- [ ] **Step 3: Create scenarios package.json**

Create `src/templates/scenarios/package.json`:
- `$SCENARIOS_REPO` as name placeholder
- `private: true`, `type: module`
- Only dependency: `vitest: ^3.0.0`
- Script: `test: vitest run`

- [ ] **Step 4: Create scenarios README**

Create `src/templates/scenarios/README.md`:
- Explains holdout concept in plain language
- "Why a separate repo?" section
- How the CI pipeline works (diagram)
- "Adding scenarios" guide with rules (behavioral, end-to-end, no source imports)
- Comparison table: internal tests vs scenario tests

- [ ] **Step 5: Commit**

```bash
git add src/templates/scenarios/
git commit -m "feat: add scenario repo bootstrap templates"
```

---

## Task 3: Scenario Evolution Templates

**Spec:** `docs/specs/2026-03-25-scenario-evolution.md`
**Files:**
- Create: `src/templates/workflows/spec-dispatch.yml`
- Create: `src/templates/workflows/scenarios-rerun.yml`
- Create: `src/templates/scenarios/workflows/generate.yml`
- Create: `src/templates/scenarios/prompts/scenario-agent.md`

- [ ] **Step 1: Create spec dispatch workflow**

Create `src/templates/workflows/spec-dispatch.yml`:
- Triggered on push to main when `docs/specs/**` files change
- Uses `git diff --name-only --diff-filter=AM HEAD~1 HEAD` to find added/modified specs (ignores deletions)
- For each changed spec: fires `repository_dispatch` type `spec-pushed` to `$SCENARIOS_REPO`
- Payload schema: `{ spec_filename, spec_content, commit_sha, branch, repo }` (note: `repo` added beyond spec schema — needed by generate.yml to dispatch `scenarios-updated` back to the correct parent repo)

- [ ] **Step 2: Create scenarios-rerun workflow**

Create `src/templates/workflows/scenarios-rerun.yml`:
- Triggered by `repository_dispatch` type `scenarios-updated`
- Lists open PRs via `gh api repos/.../pulls`
- If no open PRs: exits cleanly
- For each PR: fires `repository_dispatch` type `run-scenarios` to `$SCENARIOS_REPO` with PR context

- [ ] **Step 3: Create scenario generation workflow**

Create `src/templates/scenarios/workflows/generate.yml`:
- Triggered by `repository_dispatch` type `spec-pushed`
- Saves spec to `specs/` mirror folder (filename from payload)
- Gathers context: list of existing `.test.ts` filenames, list of specs in mirror
- Installs Claude CLI
- Runs `claude -p` with prompt template + spec + context (NO `--model` flag)
- Commits any changes as "Joycraft Scenario Agent"
- Fires `repository_dispatch` type `scenarios-updated` back to parent repo if changes were committed
- **Important:** App token generation step must come BEFORE the dispatch step

- [ ] **Step 4: Create scenario agent prompt**

Create `src/templates/scenarios/prompts/scenario-agent.md`:
- Role: "You are a QA engineer. You CANNOT access source code."
- Triage decision tree: SKIP (internal) / NEW (new behavior) / UPDATE (modified behavior)
- Test rules: behavioral only, use execSync/spawn, assert on observable output
- Uses vitest (describe, it, expect)
- Main repo at `../main-repo` (already built)
- If ambiguous, err on side of writing a test

- [ ] **Step 5: Write tests for scenario evolution templates**

Create `tests/scenario-evolution.test.ts` following the pattern in `tests/init.test.ts`:
1. Verify `TEMPLATES` contains keys for all 4 new scenario evolution files (`workflows/spec-dispatch.yml`, `workflows/scenarios-rerun.yml`, `scenarios/workflows/generate.yml`, `scenarios/prompts/scenario-agent.md`)
2. Verify `spec-dispatch.yml` template contains `$JOYCRAFT_APP_ID` and `$SCENARIOS_REPO` placeholders
3. Verify `generate.yml` template contains `spec-pushed` dispatch type
4. Verify `scenarios-rerun.yml` template contains `scenarios-updated` dispatch type
5. Verify `scenario-agent.md` prompt contains key instructions (QA engineer role, cannot access source code, triage steps)
6. Verify `run.yml` template contains `run-scenarios` dispatch type

Run: `pnpm test --run tests/scenario-evolution.test.ts`
Expected: All tests pass (templates are already bundled from Task 4)

- [ ] **Step 6: Update run.yml to accept run-scenarios dispatch**

Modify `src/templates/scenarios/workflows/run.yml` (created in Task 2) to ensure it triggers on `repository_dispatch` type `run-scenarios`. If Task 2 already created it with this trigger, verify and confirm. The `run-scenarios` type must be present so the scenarios-rerun workflow can re-dispatch PRs.

- [ ] **Step 7: Commit**

```bash
git add src/templates/workflows/spec-dispatch.yml src/templates/workflows/scenarios-rerun.yml
git add src/templates/scenarios/workflows/generate.yml src/templates/scenarios/prompts/
git add tests/scenario-evolution.test.ts
git commit -m "feat: add scenario evolution templates — spec dispatch, generation, and re-run"
```

---

## Task 4: Bundle All New Templates

**Files:**
- Modify: `src/bundled-files.ts`

- [ ] **Step 1: Run bundled-files regeneration script**

The script reads all files under `src/skills/` and `src/templates/` recursively and writes them as string constants in `src/bundled-files.ts`. Template keys use relative paths (e.g., `workflows/autofix.yml`, `scenarios/example-scenario.test.ts`).

```bash
node -e "
const fs = require('fs');
const path = require('path');
const skillsDir = 'src/skills';
const skills = {};
for (const f of fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'))) {
  skills[f] = fs.readFileSync(path.join(skillsDir, f), 'utf-8');
}
function readRecursive(dir, prefix) {
  const result = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      Object.assign(result, readRecursive(path.join(dir, entry.name), relPath));
    } else {
      result[relPath] = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
    }
  }
  return result;
}
const templates = readRecursive('src/templates', '');
function esc(s) { return s.replace(/\\\\/g, '\\\\\\\\').replace(/\x60/g, '\\\\\x60').replace(/\\$/g, '\\\\$'); }
let out = '// Bundled file contents — embedded at build time\\n\\nexport const SKILLS: Record<string, string> = {\\n';
for (const [n, c] of Object.entries(skills)) { out += '  ' + JSON.stringify(n) + ': \x60' + esc(c) + '\x60,\\n\\n'; }
out += '};\\n\\nexport const TEMPLATES: Record<string, string> = {\\n';
for (const [n, c] of Object.entries(templates)) { out += '  ' + JSON.stringify(n) + ': \x60' + esc(c) + '\x60,\\n\\n'; }
out += '};\\n';
fs.writeFileSync('src/bundled-files.ts', out);
console.log('Regenerated with', Object.keys(skills).length, 'skills and', Object.keys(templates).length, 'templates');
"
```

- [ ] **Step 2: Verify new template keys are present**

Run: `grep -c "workflows/autofix.yml\|workflows/scenarios-dispatch.yml\|workflows/spec-dispatch.yml\|workflows/scenarios-rerun.yml\|scenarios/example-scenario.test.ts\|scenarios/workflows/run.yml\|scenarios/workflows/generate.yml\|scenarios/prompts/scenario-agent.md" src/bundled-files.ts`
Expected: At least 8 matches (one per new template file)

- [ ] **Step 3: Verify build passes**

Run: `pnpm build`
Expected: Clean build

- [ ] **Step 4: Verify existing tests pass**

Run: `pnpm test --run`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/bundled-files.ts
git commit -m "feat: bundle autofix workflow and scenario templates"
```

---

## Task 5: init-autofix CLI Command

**Spec:** `docs/specs/2026-03-24-init-autofix-command.md`
**Files:**
- Create: `tests/init-autofix.test.ts`
- Create: `src/init-autofix.ts`
- Modify: `src/cli.ts`
- Modify: `src/improve-claude-md.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/init-autofix.test.ts` with these test cases:
1. Fails if project not initialized (no `.joycraft-version`)
2. Creates workflow files in `.github/workflows/`
3. Replaces `$JOYCRAFT_APP_ID` and `$SCENARIOS_REPO` placeholders in templates
4. Creates scenario bootstrap files in `docs/templates/scenarios/`
5. Skips existing workflow files without `--force`
6. Overwrites with `--force`
7. Prints setup checklist mentioning secrets
8. `--dry-run` lists files without creating them

Pattern: follow `tests/init.test.ts` — use `createTmpDir()`, `cleanup()`, `beforeEach`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test --run tests/init-autofix.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write init-autofix implementation**

Create `src/init-autofix.ts`:
- Export `initAutofix(dir, opts)` async function
- Check for `.joycraft-version` — throw if missing
- Copy workflow templates from `TEMPLATES` to `.github/workflows/`, replacing placeholders
- Copy scenario templates to `docs/templates/scenarios/`
- Skip existing files unless `--force`
- `--dry-run` lists files without writing
- Print setup checklist with: App install link, secrets to add, `gh repo create` command, scenario template copy instructions
- Use `replacePlaceholders()` helper for `$JOYCRAFT_APP_ID`, `$SCENARIOS_REPO`, and `$MAIN_REPO`
- `$MAIN_REPO` is NOT replaced at init time — it stays as `${{ github.repository }}` in the workflow YAML (resolved at runtime by GitHub Actions). Only `$JOYCRAFT_APP_ID` and `$SCENARIOS_REPO` are user-specific placeholders.
- When `--scenarios-repo` is not provided: detect current repo name via `basename(dir)` and default to `{repo-name}-scenarios`. Print the default and proceed (no interactive prompt — this is a CLI tool that may run in non-interactive contexts). The spec says "Prompts for scenarios repo name" but since Joycraft is non-interactive CLI, we use a sensible default with clear output.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test --run tests/init-autofix.test.ts`
Expected: All 8 tests pass

- [ ] **Step 5: Add CLI subcommand to cli.ts**

Add `init-autofix` command to `src/cli.ts` after `upgrade`:
- Options: `--scenarios-repo <name>`, `--app-id <id>`, `--force`, `--dry-run`
- Default dir: `.`
- Dynamic import: `await import('./init-autofix.js')`

- [ ] **Step 6: Add External Validation section to improve-claude-md.ts**

Add `generateExternalValidationSection()` function:
- Returns markdown section with `## External Validation`
- NEVER rules: don't access, read, or reference scenarios repo
- Explanation of holdout guarantee

Wire into `improveCLAUDEMd()`:
```typescript
if (!hasSection(sections, /external\s*validation/i)) {
  additions.push(generateExternalValidationSection());
}
```

- [ ] **Step 7: Run full test suite**

Run: `pnpm test --run && pnpm typecheck`
Expected: All tests pass, no type errors

- [ ] **Step 8: Commit**

```bash
git add src/init-autofix.ts src/cli.ts src/improve-claude-md.ts tests/init-autofix.test.ts
git commit -m "feat: add init-autofix CLI command with workflow setup and scenario bootstrap"
```

---

## Task 6: Update README

Per feedback memory: always update README when making user-facing changes.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

- [ ] **Step 2: Add Level 5 / Autofix section**

Add section covering:
- What Level 5 means (autonomous fix loop + holdout scenarios)
- `npx joycraft init-autofix` command and what it sets up
- The scenario evolution system (specs trigger test generation)
- The holdout wall concept
- GitHub App requirement

- [ ] **Step 3: Update feature list if one exists**

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add Level 5 autofix loop documentation to README"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: Clean build

- [ ] **Step 2: Full test suite**

Run: `pnpm test --run`
Expected: All tests pass

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Local smoke test**

```bash
pnpm build
node dist/cli.js init /tmp/test-autofix-project
node dist/cli.js init-autofix /tmp/test-autofix-project --scenarios-repo test-scenarios --app-id 12345 --dry-run
```

Verify dry-run lists expected workflow and scenario files.

Then run without `--dry-run` and verify files are created with placeholders replaced.

- [ ] **Step 5: Bump version to 0.5.0**

Update `package.json` version.

- [ ] **Step 6: Final commit**

```bash
git add package.json
git commit -m "bump: v0.5.0 — Phase 4 autofix loop"
```
