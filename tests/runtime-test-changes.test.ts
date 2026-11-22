import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file: string, body: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); });

/** A git project with one in-review spec; `testChanges` is its `## Test changes` body. Returns the base commit. */
function fixture({ testChanges = 'none', install = false }: { testChanges?: string; install?: boolean } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-test-changes-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  let manifest = '';
  if (install) {
    const pinned = realpathSync(mkdtempSync(join(tmpdir(), 'jc-test-changes-pin-')));
    dirs.push(pinned);
    applyInstall(planInstall(root, ['claude']));
    manifest = join(pinned, 'installation.json');
    copyFileSync(join(root, '.joycraft/installation.json'), manifest);
  }
  put(join(root, '.gitignore'), '.joycraft/local/\n');
  put(join(root, folder, 'brief.md'), '# Brief\n\n## Goal\n\nText.\n');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, spec), `---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- It works. Check: the tests pass.\n\n## Test changes\n\n${testChanges}\n`);
  for (const file of ['tests/a.test.ts', 'tests/b.test.ts', 'src/b_test.go', 'src/c.ts']) put(join(root, file), 'before\n');
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: `${folder}/brief.md`, kind: 'requirement' }, { path: spec, kind: 'requirement' }, { path: 'src/c.ts', kind: 'code' }, { path: 'tests/a.test.ts', kind: 'check' }],
      criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }, null, 2));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'base');
  return { root, base: git(root, 'rev-parse', 'HEAD'), manifest };
}

function changes(root: string, base: string) {
  const result = spawnSync(process.execPath, [join(runtime, 'test-changes.mjs'), '--queue', queuePath, '--spec', '1', '--base', base, '--root', root], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

function reviewerStart({ root, manifest }: { root: string; manifest: string }, extra: string[]) {
  const result = spawnSync(process.execPath, [join(root, '.joycraft/runtime/dispatch-start.mjs'), '--worker-root', root, '--expected-manifest', manifest,
    '--queue', queuePath, '--spec', '1', '--role', 'reviewer', '--implementer-session', 'impl-1', '--out', `.joycraft/local/packets/review-${Date.now()}-${extra.length}.json`,
    '--capabilities', 'filesystem:read,filesystem:write-report,agent:separate-context', '--native-session', 'review-1', ...extra], { cwd: root, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe('test-changes', () => {
  it('[AC:spec-11-1] lists changed test files by convention and exports isTestPath', async () => {
    const { root, base } = fixture();
    for (const file of ['tests/a.test.ts', 'src/b_test.go', 'src/c.ts']) put(join(root, file), 'after\n');
    expect(changes(root, base).testFiles).toEqual(['src/b_test.go', 'tests/a.test.ts']);
    const { isTestPath } = await import(join(runtime, 'test-changes.mjs'));
    expect(['__tests__/x.js', 'spec/x.rb', 'pkg/test_x.py', 'a.spec.ts'].every(isTestPath)).toBe(true);
    expect(isTestPath('src/c.ts')).toBe(false);
  });

  it('[AC:spec-11-2] splits the changed test files by the spec\'s Test changes section', () => {
    const { root, base } = fixture({ testChanges: '- `tests/a.test.ts`, class 1: acceptance bullet 1 states the new value.' });
    for (const file of ['tests/a.test.ts', 'tests/b.test.ts']) put(join(root, file), 'after\n');
    const result = changes(root, base);
    expect(result.declared).toEqual([{ path: 'tests/a.test.ts', class: 1 }]);
    expect(result.undeclared).toEqual(['tests/b.test.ts']);
    const none = fixture();
    put(join(none.root, 'tests/a.test.ts'), 'after\n');
    expect(changes(none.root, none.base)).toMatchObject({ declared: [], undeclared: ['tests/a.test.ts'] });
  });

  it('[AC:spec-11-3] lists each changed test line that names a path under the features folder', () => {
    const { root, base } = fixture();
    put(join(root, 'tests/b.test.ts'), "import { readFileSync } from 'node:fs';\nconst brief = readFileSync('docs/features/x/brief.md', 'utf8');\n");
    expect(changes(root, base).featurePaths).toEqual([{ path: 'tests/b.test.ts', line: 2, text: "const brief = readFileSync('docs/features/x/brief.md', 'utf8');" }]);
  });

  it('[AC:spec-11-4] reviewer startup adds testChanges with --changes-base, and nothing without it', () => {
    const project = fixture({ install: true });
    put(join(project.root, 'tests/b.test.ts'), 'after\n');
    const withBase = reviewerStart(project, ['--changes-base', project.base]);
    expect(withBase.testChanges.undeclared).toEqual(['tests/b.test.ts']);
    const without = reviewerStart(project, []);
    expect(without).not.toHaveProperty('testChanges');
  });
});
