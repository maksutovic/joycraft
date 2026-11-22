// Reviewer probe for test-release spec 11 (test-changes.mjs and --changes-base).
// Usage: node docs/features/2026-11-21-test-release/reviews/receipts/spec-11-probe.mjs <project-root>
// Builds throwaway git fixtures in the OS temp dir and prints observed results:
// 1. isTestPath across Node, Python, Go, Rust, Java/Kotlin, Ruby, Swift, C# names.
// 2. Rename, deletion, untracked, staged changes.
// 3. A changed submodule / directory path.
// 4. --base absent, malformed, unknown sha; reviewer startup with a wrong --changes-base.
// 5. A Test changes bullet with an unsafe backticked path.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const project = realpathSync(process.argv[2] ?? '.');
const runtime = join(project, 'payload/.joycraft/runtime');
const { isTestPath, testChanges } = await import(pathToFileURL(join(runtime, 'test-changes.mjs')).href);
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'protocol.file.allow=always', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };
const folder = 'docs/features/2026-11-21-f';
const queuePath = `${folder}/specs/.joycraft-spec-queue.json`;
const dirs = [];

function fixture(testChangesBody = 'none', files = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-r11-')));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  const spec = `${folder}/specs/01-a.md`;
  put(join(root, folder, 'brief.md'), '# Brief\n');
  put(join(root, spec), `---\nid: 1\nstatus: in-review\n---\n# A\n\n## acceptance\n\n- x\n\n## Test changes\n\n${testChangesBody}\n`);
  for (const [file, body] of Object.entries(files)) put(join(root, file), body);
  put(join(root, queuePath), JSON.stringify({ schemaVersion: 1, feature: 'f', specs: [{ id: 1, file: '01-a.md', depends_on: [], status: 'in-review', mode: 'checkpoint',
    verification: { inputs: [{ path: spec, kind: 'requirement' }], criteria: [{ id: 'spec-1-1', requirement: { path: spec, anchor: 'acceptance' }, requiredKinds: ['runtime'] }] } }] }));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'base');
  return { root, base: git(root, 'rev-parse', 'HEAD') };
}
const run = (label, fn) => { try { console.log(label, JSON.stringify(fn())); } catch (error) { console.log(label, 'THROWS:', error.message); } };

console.log('== 1. isTestPath');
const samples = {
  node: ['src/a.test.ts', 'src/a.spec.js', '__tests__/a.js', 'test/a.js', 'tests/a.mjs', 'e2e/login.e2e.ts', 'cypress/e2e/a.cy.ts'],
  python: ['tests/test_a.py', 'pkg/test_a.py', 'pkg/a_test.py', 'app/tests.py', 'conftest.py'],
  go: ['pkg/a_test.go', 'testdata/x.json'],
  rust: ['tests/integration.rs', 'src/lib.rs', 'benches/b.rs'],
  java: ['src/test/java/com/x/FooTest.java', 'app/src/androidTest/java/FooTest.kt', 'src/jvmTest/kotlin/FooTest.kt', 'lib/FooTest.java'],
  ruby: ['spec/models/user_spec.rb', 'test/models/user_test.rb', 'app/user_spec.rb'],
  swift_csharp: ['Tests/AppTests/AppTests.swift', 'App.Tests/FooTests.cs'],
  falsePositive: ['src/latest_value.ts', 'src/contest/x.ts', 'docs/spec/overview.md', 'src/test_helpers_shared.ts'],
};
for (const [stack, list] of Object.entries(samples)) console.log(stack, JSON.stringify(Object.fromEntries(list.map(p => [p, isTestPath(p)]))));

console.log('== 2. rename, deletion, untracked, staged');
{
  const { root, base } = fixture('none', { 'tests/old.test.ts': 'same body that is long enough to be detected as a rename\n'.repeat(5), 'tests/gone.test.ts': 'x\n', 'checks/verify.ts': "// [AC:spec-1-1]\n", 'tests/staged.test.ts': 'a\n' });
  renameSync(join(root, 'tests/old.test.ts'), join(root, 'tests/new.test.ts'));
  git(root, 'add', '-A', 'tests/old.test.ts', 'tests/new.test.ts');
  unlinkSync(join(root, 'tests/gone.test.ts'));
  unlinkSync(join(root, 'checks/verify.ts'));
  put(join(root, 'tests/untracked.test.ts'), 'u\n');
  put(join(root, 'tests/staged.test.ts'), 'b\n'); git(root, 'add', 'tests/staged.test.ts');
  console.log('git status --short:', JSON.stringify(git(root, 'status', '--short')));
  run('result:', () => { const r = testChanges({ root, queuePath, specId: 1, base }); return { testFiles: r.testFiles, undeclared: r.undeclared }; });
}
{
  // Committed rename after base (rename visible to git diff base).
  const { root, base } = fixture('none', { 'tests/old.test.ts': 'same body that is long enough to be detected as a rename\n'.repeat(5) });
  git(root, 'mv', 'tests/old.test.ts', 'tests/renamed.test.ts'); git(root, 'commit', '-q', '-m', 'rename');
  console.log('git diff --name-status base:', JSON.stringify(git(root, 'diff', '--name-status', base)));
  run('committed rename result:', () => testChanges({ root, queuePath, specId: 1, base }).testFiles);
}

console.log('== 3. changed submodule path');
{
  const sub = fixture('none', {}).root;
  const { root, base } = fixture('none', {});
  git(root, 'submodule', 'add', '-q', sub, 'vendor/tests-lib');
  git(root, 'commit', '-q', '-m', 'add sub');
  const base2 = git(root, 'rev-parse', 'HEAD');
  put(join(sub, 'z.txt'), 'z\n'); git(sub, 'add', '-A'); git(sub, 'commit', '-q', '-m', 'z');
  git(join(root, 'vendor/tests-lib'), 'pull', '-q', 'origin', 'main');
  console.log('git diff --name-only base2:', JSON.stringify(git(root, 'diff', '--name-only', base2)));
  run('submodule result:', () => testChanges({ root, queuePath, specId: 1, base: base2 }).testFiles);
  void base;
}

console.log('== 4. base handling (CLI)');
{
  const { root, base } = fixture('none', {});
  const cli = (...args) => { const r = spawnSync(process.execPath, [join(runtime, 'test-changes.mjs'), '--queue', queuePath, '--spec', '1', '--root', root, ...args], { encoding: 'utf8' }); return { status: r.status, stderr: r.stderr.trim(), stdoutStart: r.stdout.slice(0, 60) }; };
  console.log('no --base:', JSON.stringify(cli()));
  console.log('--base HEAD:', JSON.stringify(cli('--base', 'HEAD')));
  console.log('--base unknown sha:', JSON.stringify(cli('--base', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef')));
  console.log('--base short real sha:', JSON.stringify(cli('--base', base.slice(0, 7))));
}

console.log('== 5. unsafe backticked path in a Test changes bullet');
{
  const { root, base } = fixture('- `../outside.test.ts`, class 1: line.\n- `tests/a.test.ts`, class 2: line.', { 'tests/a.test.ts': 'a\n' });
  put(join(root, 'tests/a.test.ts'), 'b\n');
  run('result:', () => testChanges({ root, queuePath, specId: 1, base }));
}

for (const dir of dirs) rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
