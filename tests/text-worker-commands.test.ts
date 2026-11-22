import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-test-release/specs/23-worker-commands-text.md
const root = join(__dirname, '..');
const raw = (...parts: string[]) => readFileSync(join(root, 'payload', ...parts), 'utf8');
const read = (...parts: string[]) => raw(...parts).replace(/\s+/g, ' ');
const agents = {
  implementer: read('.claude', 'agents', 'joycraft-implementer.md'),
  reviewer: read('.claude', 'agents', 'joycraft-reviewer.md'),
};
const dispatch = read('.joycraft', 'references', 'dispatch.md');
const setup = read('.joycraft', 'references', 'setup.md');
const evidence = join(root, 'payload', '.joycraft', 'runtime', 'evidence.mjs');

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A Git project that ignores .joycraft/local/ and keeps a worker variable in the machine-local env map. */
function fixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'jc-worker-commands-')));
  dirs.push(dir);
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, '.gitignore'), '.joycraft/local/\n');
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  mkdirSync(join(dir, '.joycraft', 'local'), { recursive: true });
  writeFileSync(join(dir, '.joycraft', 'local', 'evidence-env.json'), '{"RUNNER_MAX_WORKERS": "3"}\n');
  return dir;
}

// Every-spec word counts of the three every-spec files this spec edits, at the commit before it (58f2c69).
// Spec 18 (fault-proof) later added a test-only pointer to the implementer (5) and the reviewer (5): a class-1 change.
const before = { implementer: 314 + 5, reviewer: 334 + 5, dispatch: 1668 };
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe('worker commands text', () => {
  it('[AC:spec-23-1] both agent files and dispatch.md name heredoc, source and cd out as forbidden and point to the printed commands', () => {
    for (const text of Object.values(agents)) {
      expect(text).toContain("never `&&`, `;`, `|`, `$(git …)`, a heredoc, `source` or `cd` out of the root, which worktree isolation refuses. Paste the startup output's `commands`.");
    }
    expect(dispatch).toContain("or use `$(git …)`, a heredoc, `source` or `cd` out of the root; a worktree-isolated host refuses these. Paste the startup output's `commands`.");
  });

  it('[AC:spec-23-2] attended setup sends a runner worker variable to the machine-local evidence-env.json, which evidence applies', () => {
    expect(setup).toContain("When the runner config cannot hold a worker cap, put the runner's worker variable in the machine-local `.joycraft/local/evidence-env.json`, which `evidence.mjs` applies to every run, never in a tracked file.");
    const dir = fixture();
    const receipt = '.joycraft/local/receipt.log';
    const run = spawnSync(process.execPath, [evidence, 'run', '--receipt', receipt, '--', process.execPath, '-e', 'console.log("workers=" + process.env.RUNNER_MAX_WORKERS)'], { cwd: dir, encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(readFileSync(join(dir, receipt), 'utf8')).toContain('workers=3');
  });

  it('[AC:spec-23-3] the every-spec files this spec edits grow by at most 6 words in all', () => {
    const now = {
      implementer: words(raw('.claude', 'agents', 'joycraft-implementer.md')),
      reviewer: words(raw('.claude', 'agents', 'joycraft-reviewer.md')),
      dispatch: words(raw('.joycraft', 'references', 'dispatch.md')),
    };
    const growth = Object.values(now).reduce((a, b) => a + b, 0) - Object.values(before).reduce((a, b) => a + b, 0);
    expect(growth).toBeLessThanOrEqual(6);
    // setup.md is on-demand: the guard's EVERY_SPEC_FILES does not list it.
    const guard = readFileSync(join(root, 'tests', 'payload-guard.test.ts'), 'utf8');
    const block = guard.slice(guard.indexOf('export const EVERY_SPEC_FILES'), guard.indexOf('export const EVERY_SPEC_CAP'));
    expect(block).not.toContain('references/setup.md');
  });
});
