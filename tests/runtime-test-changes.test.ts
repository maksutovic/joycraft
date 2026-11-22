import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyInstall, planInstall } from '../src/install-v1.js';

const runtime = join(__dirname, '..', 'payload', '.joycraft', 'runtime');
const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'protocol.file.allow=always', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
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
  it('[AC:spec-11-1] lists a renamed test under both paths and a deleted tag-only test from its base', () => {
    const { root } = fixture();
    put(join(root, 'tests/old.test.ts'), 'a body long enough to be detected as a rename\n'.repeat(5));
    put(join(root, 'checks/verify.ts'), '// [AC:spec-1-1]\n');
    git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'more');
    const second = git(root, 'rev-parse', 'HEAD');
    git(root, 'mv', 'tests/old.test.ts', 'tests/renamed.test.ts'); git(root, 'commit', '-q', '-m', 'rename');
    unlinkSync(join(root, 'checks/verify.ts'));
    expect(changes(root, second).testFiles).toEqual(['checks/verify.ts', 'tests/old.test.ts', 'tests/renamed.test.ts']);
  });

  it('[AC:spec-11-1] applies the AC tag rule only to code files outside the work folders', () => {
    const { root, base } = fixture();
    const tagged = '// [AC:spec-1-1]\n';
    for (const file of ['src/check.ts', 'notes/plan.md', 'logs/run.log', 'data/report.json', `${folder}/reviews/receipts/probe.mjs`, `${folder}/specs/review-1.report.json`, '.joycraft/runtime/x.mjs'])
      put(join(root, file), tagged);
    expect(changes(root, base).testFiles).toEqual(['src/check.ts']);
  });

  it('[AC:spec-11-1] matches test layouts across stacks and leaves look-alikes out', async () => {
    const { isTestPath } = await import(join(runtime, 'test-changes.mjs'));
    const tests = ['Tests/AppTests/AppTests.swift', 'app/src/androidTest/java/Foo.kt', 'lib/FooTest.java', 'src/main/BarTest.kt', 'App.Tests/FooTests.cs',
      'app/models/user_spec.rb', 'app/tests.py', 'conftest.py', 'pkg/test_a.py', 'e2e/login.e2e.ts', 'cypress/a.cy.ts', 'src/a.test.ts', 'pkg/a_test.go'];
    const others = ['docs/spec/overview.md', 'tests/README.md', 'src/test_helpers_shared.ts', 'src/latest_value.ts', 'src/contest/x.ts', 'src/lib.rs'];
    expect(tests.filter(file => !isTestPath(file))).toEqual([]);
    expect(others.filter(file => isTestPath(file))).toEqual([]);
  });

  it('[AC:spec-11-2] skips a submodule path and a refused declared path without losing the result', () => {
    const sub = fixture();
    const project = fixture({ testChanges: '- `../outside.test.ts`, class 1: line.\n- `tests/a.test.ts`, class 2: line.' });
    git(project.root, 'submodule', 'add', '-q', sub.root, 'vendor/tests-lib');
    git(project.root, 'commit', '-q', '-m', 'add sub');
    const base = git(project.root, 'rev-parse', 'HEAD');
    put(join(sub.root, 'z.txt'), 'z\n'); git(sub.root, 'add', '-A'); git(sub.root, 'commit', '-q', '-m', 'z');
    git(join(project.root, 'vendor/tests-lib'), 'pull', '-q', 'origin', 'main');
    put(join(project.root, 'tests/a.test.ts'), 'after\n');
    const result = changes(project.root, base);
    expect(result).toMatchObject({ testFiles: ['tests/a.test.ts'], declared: [{ path: 'tests/a.test.ts', class: 2 }], undeclared: [] });
    expect(result.skipped.map((item: { path: string }) => item.path).sort()).toEqual(['../outside.test.ts', 'vendor/tests-lib']);
  });

  it('[AC:spec-11-4] reviewer startup with an unknown --changes-base says so plainly and stays ready', () => {
    const project = fixture({ install: true });
    const result = reviewerStart(project, ['--changes-base', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef']);
    expect(result.ready).toBe(true);
    expect(result.warnings).toEqual([expect.stringMatching(/^No changed-test list: Base deadbeef\w* is not a commit/)]);
    expect(result.testChanges.error).toMatch(/not a commit/);
    expect(reviewerStart(project, ['--changes-base', project.base])).not.toHaveProperty('warnings');
  });
});
