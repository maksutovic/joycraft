// Round-2 reviewer probe for test-release spec 11 (fix 9dbe887).
// Usage: node docs/features/2026-11-21-test-release/reviews/receipts/spec-11-r2-probe.mjs <project-root>
// Builds throwaway git fixtures in the OS temp dir and prints observed results:
// 1. isTestPath on real-looking non-test app code and on test layouts.
// 2. Declarations under a renamed test's old path and a deleted test's path.
// 3. The AC tag rule: work folders, .joycraft, data/prose and code files; deleted tag-only files.
// 4. A deleted submodule (gitlink base content).
// 5. archive.mjs namedFiles test flag through a preview.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
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
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jc-r11b-')));
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
const appCode = ['src/testing/index.ts', 'src/contest.py', 'lib/attestation.rb', 'TestFlight.swift', 'Sources/App/TestFlight.swift', 'Sources/App/TestFlightManager.swift',
  'src/test.ts', 'src/latest.ts', 'pkg/testing/testing.go', 'src/protest/rally.ts', 'src/inspect_test_mode.ts', 'lib/testimonial.rb', 'src/test_data.py', 'src/test_utils.ts',
  'docs/tests/plan.txt', 'tests/README.md', 'CHANGELOG.md',
  // Possible look-alikes the new rules may catch:
  'src/main/kotlin/com/x/abTest/Flags.kt', 'src/main/kotlin/ProductSpec.kt', 'src/main/java/SplitTest.java', 'src/spec/openapi.ts', 'src/main/java/LoadTest.java'];
const testLayouts = ['tests/a.test.ts', 'Tests/AppTests/AppTests.swift', 'app/src/androidTest/java/Foo.kt', 'src/jvmTest/kotlin/FooTest.kt', 'App.Tests/FooTests.cs', 'lib/FooTest.java',
  'app/models/user_spec.rb', 'app/tests.py', 'conftest.py', 'pkg/test_a.py', 'e2e/login.e2e.ts', 'cypress/a.cy.ts', 'pkg/a_test.go', 'test/test_helper.rb', 'tests/fixtures/data.json'];
console.log('app code ->', JSON.stringify(Object.fromEntries(appCode.map(p => [p, isTestPath(p)]))));
console.log('test layouts ->', JSON.stringify(Object.fromEntries(testLayouts.map(p => [p, isTestPath(p)]))));

console.log('== 2. declarations under a renamed old path and a deleted path');
{
  const body = 'same body that is long enough to be detected as a rename\n'.repeat(5);
  const { root, base } = fixture('- `tests/old.test.ts`, class 2: renamed, same claim.\n- `tests/gone.test.ts`, class 3: deleted with an owner yes.',
    { 'tests/old.test.ts': body, 'tests/gone.test.ts': 'x\n' });
  git(root, 'mv', 'tests/old.test.ts', 'tests/new.test.ts'); git(root, 'rm', '-q', 'tests/gone.test.ts'); git(root, 'commit', '-q', '-m', 'rename and delete');
  run('result:', () => { const r = testChanges({ root, queuePath, specId: 1, base }); return { testFiles: r.testFiles, declared: r.declared, undeclared: r.undeclared, skipped: r.skipped }; });
}

console.log('== 3. AC tag rule');
{
  const tagged = '// [AC:spec-1-1]\n';
  const { root, base } = fixture('none', { 'src/old_check.py': '# [AC:spec-1-1]\n', [`${folder}/old.mjs`]: tagged, '.joycraft/runtime/old.mjs': tagged, 'payload/.joycraft/runtime/x.mjs': 'x\n' });
  for (const file of ['src/check.py', 'src/data.json', 'src/notes.txt', 'config/app.yaml', 'scripts/verify.sh', `${folder}/reviews/receipts/p.mjs`, 'payload/.joycraft/runtime/x.mjs', 'docs/guide.md', 'src/not-tagged.ts'])
    put(join(root, file), file === 'src/not-tagged.ts' ? 'AC: plain words, [AC: but no id]\n' : tagged.replace('//', file.endsWith('.py') || file.endsWith('.sh') ? '#' : '//'));
  unlinkSync(join(root, 'src/old_check.py')); unlinkSync(join(root, `${folder}/old.mjs`)); unlinkSync(join(root, '.joycraft/runtime/old.mjs'));
  run('testFiles:', () => testChanges({ root, queuePath, specId: 1, base }).testFiles);
}

console.log('== 4. deleted submodule');
{
  const sub = fixture('none', {}).root;
  const { root } = fixture('none', {});
  git(root, 'submodule', 'add', '-q', sub, 'tests/vendor-lib');
  git(root, 'commit', '-q', '-m', 'add sub');
  const base = git(root, 'rev-parse', 'HEAD');
  git(root, 'rm', '-q', 'tests/vendor-lib'); git(root, 'commit', '-q', '-m', 'drop sub');
  run('result:', () => { const r = testChanges({ root, queuePath, specId: 1, base }); return { testFiles: r.testFiles, skipped: r.skipped }; });
}

console.log('== 5. archive namedFiles test flag');
{
  const { previewArchiveFeature } = await import(pathToFileURL(join(runtime, 'archive.mjs')).href);
  const { root } = fixture('none', { 'tests/a.test.ts': `read('${folder}/brief.md')\n`, 'tests/fixtures/expected.txt': `${folder}/brief.md\n`, 'scripts/x.mjs': `'${folder}'\n`, 'src/contest.py': `p = '${folder}'\n` });
  run('namedFiles:', () => { try { return previewArchiveFeature({ root, feature: '2026-11-21-f' }).namedFiles; } catch (error) { return { previewThrows: error.message }; } });
}

for (const dir of dirs) rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
