# Pipit: External Holdout Scenario Setup Guide

**Purpose:** Set up external holdout scenario testing for Pipit to trial the Level 5 pattern before integrating it into Joycraft.

**What you're building:** A private `pipit-scenarios` repo that tests the built Pipit artifact (CLI + Mac app) from the outside, catching integration bugs that internal unit tests miss — like the `cliNotFound` bug.

---

## Step 1: Create the Scenarios Repo

```bash
gh repo create pipit-scenarios --private --description "External holdout scenarios for Pipit — invisible to the coding agent"
cd /tmp && git clone https://github.com/maksutovic/pipit-scenarios.git && cd pipit-scenarios
```

Initialize it as a Node.js project (we'll use vitest for scenario tests):

```bash
pnpm init
pnpm add -D vitest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

## Step 2: Write the First Scenarios

Create `scenarios/cli-smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = process.env.PIPIT_CLI_PATH || '/tmp/pipit/dist/cli.js';

function runCli(args: string[]): string {
  return execFileSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  }).trim();
}

function tmpDir(): string {
  const dir = join(tmpdir(), `pipit-scenario-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('CLI Binary', () => {
  it('exists after build', () => {
    expect(existsSync(CLI_PATH)).toBe(true);
  });

  it('responds to --help', () => {
    const output = runCli(['--help']);
    expect(output).toContain('pipit');
  });

  it('responds to --version', () => {
    const output = runCli(['--version']);
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });
});

describe('CLI go command', () => {
  it('--dry-run produces valid output without launching terminal', () => {
    const tmp = tmpDir();
    try {
      const testFile = join(tmp, 'test-input.txt');
      execFileSync('sh', ['-c', `echo "test content" > "${testFile}"`]);

      // Dry run should produce output without crashing
      let output: string;
      try {
        output = runCli(['go', testFile, '--dry-run', '--json']);
      } catch (e: any) {
        output = e.stdout || e.stderr || '';
      }
      // Should NOT contain unhandled exception traces
      expect(output).not.toContain('TypeError');
      expect(output).not.toContain('ReferenceError');
      expect(output).not.toContain('FATAL');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('Integration: CLI finds required dependencies', () => {
  it('does not crash when invoked from a directory without package.json', () => {
    const tmp = tmpDir();
    try {
      let output: string;
      try {
        output = execFileSync('node', [CLI_PATH, '--help'], {
          encoding: 'utf-8',
          timeout: 10000,
          cwd: tmp,
        }).trim();
      } catch (e: any) {
        output = e.stdout || e.stderr || '';
      }
      expect(output).not.toContain('Cannot find module');
      expect(output).not.toContain('ENOENT');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
```

Create `scenarios/mac-app-integration.test.ts` (for macOS runner):

```typescript
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const isMacOS = process.platform === 'darwin';
const CLI_PATH = process.env.PIPIT_CLI_PATH || '/tmp/pipit/dist/cli.js';

describe.skipIf(!isMacOS)('Mac App + CLI Integration', () => {
  it('CLI binary is discoverable from standard paths', () => {
    // In CI, we install globally so at least one path should work
    let globalInstalled = false;
    try {
      const which = execFileSync('which', ['pipit'], { encoding: 'utf-8' }).trim();
      globalInstalled = which.length > 0;
    } catch {
      globalInstalled = false;
    }
    expect(globalInstalled || existsSync(CLI_PATH)).toBe(true);
  });

  it('CLI responds correctly when invoked as the Mac app would', () => {
    // The Mac app invokes: pipit go <input> --project <name> --input-type <type> --json
    try {
      const output = execFileSync('node', [
        CLI_PATH, 'go', '/dev/null',
        '--project', 'TestProject',
        '--input-type', 'text',
        '--json', '--dry-run',
      ], { encoding: 'utf-8', timeout: 10000 });
      expect(output).not.toContain('Unknown option');
    } catch (e: any) {
      // Exit code non-zero is fine (no project configured), but should be structured
      const stderr = e.stderr || e.stdout || '';
      expect(stderr).not.toContain('TypeError');
      expect(stderr).not.toContain('SyntaxError');
    }
  });
});
```

## Step 3: Add GitHub Actions to Scenarios Repo

Create `.github/workflows/run.yml`:

```yaml
name: Run Holdout Scenarios

on:
  repository_dispatch:
    types: [run-scenarios]
  workflow_dispatch:

jobs:
  cli-scenarios:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout scenarios
        uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install scenario dependencies
        run: pnpm install

      - name: Clone and build Pipit CLI
        run: |
          BRANCH="${{ github.event.client_payload.head_ref || 'main' }}"
          REPO="${{ github.event.client_payload.repo || 'maksutovic/pipit' }}"
          git clone --depth 1 --branch "$BRANCH" \
            "https://x-access-token:${{ secrets.MAIN_REPO_TOKEN }}@github.com/${REPO}.git" \
            /tmp/pipit
          cd /tmp/pipit
          pnpm install && pnpm build

      - name: Run CLI scenarios
        id: scenarios
        continue-on-error: true
        env:
          PIPIT_CLI_PATH: /tmp/pipit/dist/cli.js
        run: pnpm test --run 2>&1 | tee /tmp/output.txt

      - name: Post results to PR
        if: github.event.client_payload.pr_number
        run: |
          OUTPUT=$(cat /tmp/output.txt | head -c 60000)
          if [ "${{ steps.scenarios.outcome }}" = "success" ]; then
            BODY="## Scenario Tests: PASSED

          All holdout scenarios satisfied."
          else
            BODY="## Scenario Tests: FAILED

          \`\`\`
          ${OUTPUT}
          \`\`\`"
          fi

          gh api \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            "/repos/${{ github.event.client_payload.repo }}/issues/${{ github.event.client_payload.pr_number }}/comments" \
            -f body="$BODY"
        env:
          GH_TOKEN: ${{ secrets.MAIN_REPO_TOKEN }}
```

## Step 4: Add Dispatch Trigger to Pipit Main Repo

In `pipit/.github/workflows/ci.yml`, add after your test job:

```yaml
  trigger-scenarios:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Trigger holdout scenarios
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.SCENARIO_DISPATCH_TOKEN }}" \
            "https://api.github.com/repos/maksutovic/pipit-scenarios/dispatches" \
            -d '{
              "event_type": "run-scenarios",
              "client_payload": {
                "pr_number": "${{ github.event.pull_request.number }}",
                "head_sha": "${{ github.event.pull_request.head.sha }}",
                "head_ref": "${{ github.event.pull_request.head.ref }}",
                "repo": "${{ github.repository }}"
              }
            }'
```

## Step 5: Add Auto-Fix Workflow to Pipit Main Repo

Create `pipit/.github/workflows/autofix.yml`:

```yaml
name: Auto-Fix Scenario Failures

on:
  issue_comment:
    types: [created]

concurrency:
  group: autofix-${{ github.event.issue.number }}
  cancel-in-progress: false

jobs:
  fix:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, 'Scenario Tests: FAILED')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/head

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            A holdout scenario test failed on this PR. Read the failure
            output below and fix the code. Do NOT try to find or read the
            scenario tests — they are in a separate repo you don't have
            access to. Fix the bug based on the error description.

            ${{ github.event.comment.body }}

            After fixing, run the internal tests to verify nothing is broken.
          claude_args: "--max-turns 15"
```

## Step 6: Set Up Secrets

**In Pipit main repo** (Settings > Secrets > Actions):
- `SCENARIO_DISPATCH_TOKEN` — GitHub PAT with `repo` scope
- `ANTHROPIC_API_KEY` — for claude-code-action auto-fix

**In pipit-scenarios repo** (Settings > Secrets > Actions):
- `MAIN_REPO_TOKEN` — same PAT (needs repo scope to comment on Pipit PRs and clone)

## Step 7: Test the Pipeline

1. Push scenarios repo with workflows and test files
2. Manual trigger first: `gh workflow run run.yml --repo maksutovic/pipit-scenarios`
3. Verify CLI scenarios pass against Pipit main branch
4. Open a test PR in Pipit, verify dispatch triggers
5. Intentionally break something, verify scenarios catch it

## Step 8: Add to CLAUDE.md in Pipit

```markdown
## External Validation

External holdout scenarios exist in a separate private repository.

### NEVER
- Attempt to read, access, or infer the contents of external scenarios
- Mention or reference the scenarios repository in code or commits

### How It Works
- Internal tests verify implementation correctness (you write these)
- External scenarios verify user-facing behavior (invisible to you)
- If scenarios fail after PR, you'll see failure descriptions in a PR comment
- Fix the bug based on the failure description, not by reading the test
```

---

## What the cliNotFound Bug Would Have Looked Like

With this setup, when the agent implemented PipitLauncher with hardcoded paths:

1. Agent pushes PR with PipitLauncher code
2. Internal tests pass (they test functions in isolation)
3. CI dispatches to pipit-scenarios
4. Scenario "CLI binary is discoverable" FAILS:
   ```
   Scenario Tests: FAILED

   FAIL scenarios/mac-app-integration.test.ts
   Expected at least one standard path to contain pipit binary, but none found.
   The Mac app needs to search additional paths or auto-install the CLI.
   ```
5. claude-code-action reads this, adds more search paths + auto-install, pushes fix
6. Scenarios re-run and pass
7. Bug never reaches the user
